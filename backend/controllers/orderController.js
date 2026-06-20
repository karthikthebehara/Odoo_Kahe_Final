/**
 * controllers/orderController.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Transactional business logic for the Odoo Cafe POS ordering pipeline.
 *
 * Three-Tier Promotion Engine
 * ───────────────────────────
 *   Tier 1  – Manual Coupon        (type = 'coupon')
 *             Validated via coupon_code from req.body. Deducts percentage or
 *             fixed_amount from the whole-order subtotal.
 *
 *   Tier 2  – Automated Product    (type = 'automated_product')
 *             Auto-fires when a line item's quantity ≥ min_quantity.
 *             Deducts percentage or fixed_amount from that line only.
 *
 *   Tier 3  – Automated Order      (type = 'automated_order')
 *             Auto-fires when the running cart total ≥ min_order_amount.
 *             Deducts percentage or fixed_amount from the cart-wide subtotal.
 *
 * Discount Application Order
 * ──────────────────────────
 *   1. Product-level discounts are applied first (per-line).
 *   2. Order-level automated promo is applied to the post-product subtotal.
 *   3. Manual coupon is applied last, on top of any automated discounts.
 *   4. Tax is computed on the fully discounted subtotal (per-line rates).
 *   5. Final total = discounted subtotal + tax.
 *
 * JSON envelope standard (team convention):
 *   Success  → { success: true,  data: <payload> }
 *   Failure  → { success: false, error: "<message>" }
 *
 * Schema reference: backend/models/schema.sql
 */

'use strict';

const { pool } = require('../config/db');

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Ordered KDS state machine for kitchen display transitions.
 * Maps to `orders.kds_status`: 'To Cook' → 'Preparing' → 'Completed'
 */
const KDS_STATES = ['To Cook', 'Preparing', 'Completed'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round a numeric value to two decimal places.
 * Uses "round half away from zero" to match financial rounding expectations.
 */
const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

// ─── createOrder ─────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 *
 * Creates a new draft order inside a single ACID database transaction.
 *
 * Request body:
 *   {
 *     session_id   : number   (required) – active POS session
 *     table_id     : number   (optional) – omit for take-away
 *     coupon_code  : string   (optional) – manual coupon to validate
 *     items        : [{ product_id: number, quantity: number }]  (min 1)
 *   }
 *
 * Response:
 *   201 { success: true, data: { orderId, total, ... } }
 */
const createOrder = async (req, res) => {
  const {
    session_id,
    table_id     = null,
    coupon_code  = null,
    customer_id  = null,
    items,
  } = req.body;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'session_id is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'items array must contain at least one entry.' });
  }
  for (const [idx, item] of items.entries()) {
    if (!item.product_id || !item.quantity || Number(item.quantity) < 1) {
      return res.status(400).json({
        success: false,
        error: `Item at index ${idx} must have a valid product_id and quantity >= 1.`,
      });
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ── STEP 1: Resolve product prices in a single query ────────────────────
    //    Schema columns: products.price, products.tax (%), products.is_available
    const productIds   = items.map((i) => i.product_id);
    const placeholders = productIds.map(() => '?').join(', ');

    const [productRows] = await connection.execute(
      `SELECT id, name, price, tax, is_available
         FROM products
        WHERE id IN (${placeholders})`,
      productIds
    );

    // Build lookup map and validate existence + availability
    const productMap = {};
    for (const row of productRows) {
      productMap[row.id] = row;
    }

    for (const item of items) {
      const product = productMap[item.product_id];
      if (!product) {
        await connection.rollback();
        return res.status(404).json({
          success: false,
          error: `Product with id ${item.product_id} not found.`,
        });
      }
      if (!product.is_available) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: `Product "${product.name}" is not currently available.`,
        });
      }
    }

    // ── STEP 2: Compute per-line gross totals ───────────────────────────────
    let cartGross = 0;

    const lineItems = items.map((item) => {
      const product   = productMap[item.product_id];
      const unitPrice = parseFloat(product.price);
      const taxPct    = parseFloat(product.tax);    // e.g. 5.00 = 5%
      const quantity  = Number(item.quantity);
      const lineGross = round2(unitPrice * quantity);

      cartGross = round2(cartGross + lineGross);

      return {
        product_id:     item.product_id,
        product_name:   product.name,
        quantity,
        unit_price:     unitPrice,
        tax_pct:        taxPct,
        line_gross:     lineGross,      // price × qty (no discounts yet)
        line_discount:  0,              // populated by product promos
        line_subtotal:  lineGross,      // updated after discount
      };
    });

    // ── STEP 3: TIER 2 – Automated Product Promotions ───────────────────────
    //    type = 'automated_product', keyed on product_id + min_quantity
    const [productPromos] = await connection.execute(
      `SELECT id, name, product_id, min_quantity, discount_type, value
         FROM promotions
        WHERE type       = 'automated_product'
          AND is_active  = 1
          AND (start_date IS NULL OR start_date <= CURDATE())
          AND (end_date   IS NULL OR end_date   >= CURDATE())
          AND product_id IN (${placeholders})
        ORDER BY value DESC`,
      productIds
    );

    // Best promo per product (already sorted DESC by value, first match wins)
    const productPromoMap = {};
    for (const promo of productPromos) {
      if (!productPromoMap[promo.product_id]) {
        productPromoMap[promo.product_id] = promo;
      }
    }

    let totalProductDiscount = 0;
    let cartSubtotal = 0;  // subtotal after product-level discounts

    for (const line of lineItems) {
      const promo = productPromoMap[line.product_id];

      if (promo && line.quantity >= promo.min_quantity) {
        let disc = 0;
        if (promo.discount_type === 'percentage') {
          disc = round2(line.line_gross * (parseFloat(promo.value) / 100));
        } else {
          // fixed_amount — cap at the line total so we never go negative
          disc = Math.min(parseFloat(promo.value), line.line_gross);
          disc = round2(disc);
        }
        line.line_discount = disc;
        line.line_subtotal = round2(line.line_gross - disc);
        line._applied_product_promo = promo.name;
      }

      totalProductDiscount = round2(totalProductDiscount + line.line_discount);
      cartSubtotal         = round2(cartSubtotal         + line.line_subtotal);
    }

    // ── STEP 4: TIER 3 – Automated Order Promotion ─────────────────────────
    //    type = 'automated_order', fires when cartSubtotal >= min_order_amount
    const [orderPromos] = await connection.execute(
      `SELECT id, name, min_order_amount, discount_type, value
         FROM promotions
        WHERE type              = 'automated_order'
          AND is_active         = 1
          AND (start_date IS NULL OR start_date <= CURDATE())
          AND (end_date   IS NULL OR end_date   >= CURDATE())
          AND (min_order_amount IS NULL OR min_order_amount <= ?)
        ORDER BY value DESC
        LIMIT 1`,
      [cartSubtotal]
    );

    let autoOrderDiscount    = 0;
    let appliedAutoOrderPromo = null;

    if (orderPromos.length > 0) {
      appliedAutoOrderPromo = orderPromos[0];
      const dv = parseFloat(appliedAutoOrderPromo.value);

      if (appliedAutoOrderPromo.discount_type === 'percentage') {
        autoOrderDiscount = round2(cartSubtotal * (dv / 100));
      } else {
        autoOrderDiscount = round2(Math.min(dv, cartSubtotal));
      }
    }

    let runningSubtotal = round2(cartSubtotal - autoOrderDiscount);

    // ── STEP 5: TIER 1 – Manual Coupon Validation ──────────────────────────
    //    type = 'coupon', matched by coupon_code from the request body
    let couponDiscount    = 0;
    let appliedCoupon     = null;

    if (coupon_code) {
      const [couponRows] = await connection.execute(
        `SELECT id, name, discount_type, value
           FROM promotions
          WHERE type        = 'coupon'
            AND is_active   = 1
            AND coupon_code = ?
            AND (start_date IS NULL OR start_date <= CURDATE())
            AND (end_date   IS NULL OR end_date   >= CURDATE())
          LIMIT 1`,
        [coupon_code.trim().toUpperCase()]
      );

      if (couponRows.length === 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          error: `Coupon code "${coupon_code}" is invalid or expired.`,
        });
      }

      appliedCoupon = couponRows[0];
      const cv = parseFloat(appliedCoupon.value);

      if (appliedCoupon.discount_type === 'percentage') {
        couponDiscount = round2(runningSubtotal * (cv / 100));
      } else {
        couponDiscount = round2(Math.min(cv, runningSubtotal));
      }

      runningSubtotal = round2(runningSubtotal - couponDiscount);
    }

    // ── STEP 6: Math Integrity – compute final totals ──────────────────────
    //    discountedSubtotal = cartGross − all discounts
    const totalDiscount      = round2(totalProductDiscount + autoOrderDiscount + couponDiscount);
    const discountedSubtotal = round2(cartGross - totalDiscount);

    // Tax is computed per-line at each product's own rate, then summed.
    // The discount is proportionally distributed across lines for tax calc.
    let totalTax = 0;
    for (const line of lineItems) {
      // Proportional share of order-wide discounts applied to this line
      const lineShareRatio = cartSubtotal > 0
        ? (line.line_subtotal / cartSubtotal)
        : 0;
      const lineOrderDisc   = round2((autoOrderDiscount + couponDiscount) * lineShareRatio);
      const lineTaxableBase = round2(line.line_subtotal - lineOrderDisc);
      const lineTax         = round2(Math.max(0, lineTaxableBase) * (line.tax_pct / 100));
      line.line_tax = lineTax;
      totalTax = round2(totalTax + lineTax);
    }

    const finalTotal = round2(discountedSubtotal + totalTax);

    // Generate consecutive order number: ORD-00001, etc.
    const [[{ maxId }]] = await connection.execute(
      'SELECT COALESCE(MAX(id), 0) AS maxId FROM orders'
    );
    const nextSeq = parseInt(maxId, 10) + 1;
    const orderNumber = `ORD-${String(nextSeq).padStart(5, '0')}`;

    // ── STEP 7: INSERT order header ────────────────────────────────────────
    //    Schema: orders(order_number, session_id, table_id, customer_id, subtotal,
    //            discount_amount, tax_amount, total_amount, status)
    const [orderResult] = await connection.execute(
      `INSERT INTO orders
         (order_number, session_id, table_id, customer_id, subtotal, discount_amount, tax_amount,
          total_amount, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', NOW())`,
      [
        orderNumber,
        session_id,
        table_id,
        customer_id || null,
        cartGross,           // pre-discount line sum
        totalDiscount,       // all three tiers combined
        totalTax,
        finalTotal,
      ]
    );

    const orderId = orderResult.insertId;

    // ── STEP 8: Batch-INSERT order_items ────────────────────────────────────
    //    Schema: order_items(order_id, product_id, quantity, price,
    //            discount_amount, subtotal)
    for (const line of lineItems) {
      await connection.execute(
        `INSERT INTO order_items
           (order_id, product_id, quantity, price, discount_amount, subtotal,
            created_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          orderId,
          line.product_id,
          line.quantity,
          line.unit_price,       // price at time of order
          line.line_discount,    // product-level discount only
          line.line_subtotal,    // (price × qty) − product discount
        ]
      );
    }

    await connection.commit();

    // ── STEP 9: Respond with the team-standard JSON envelope ───────────────
    return res.status(201).json({
      success: true,
      data: {
        orderId: orderId,
        total:   finalTotal,
        order: {
          id:              orderId,
          order_number:    orderNumber,
          session_id,
          table_id,
          customer_id,
          status:          'draft',
          subtotal:        cartGross,
          discount_amount: totalDiscount,
          tax_amount:      totalTax,
          total_amount:    finalTotal,
        },
        items: lineItems.map((l) => ({
          product_id:      l.product_id,
          product_name:    l.product_name,
          quantity:        l.quantity,
          unit_price:      l.unit_price,
          tax_pct:         l.tax_pct,
          discount_amount: l.line_discount,
          subtotal:        l.line_subtotal,
          applied_promo:   l._applied_product_promo || null,
        })),
        promotions_applied: {
          product_promos: lineItems
            .filter((l) => l._applied_product_promo)
            .map((l) => ({
              product_id:   l.product_id,
              product_name: l.product_name,
              promo_name:   l._applied_product_promo,
              discount:     l.line_discount,
            })),
          automated_order_promo: appliedAutoOrderPromo
            ? {
                promo_name:       appliedAutoOrderPromo.name,
                min_order_amount: appliedAutoOrderPromo.min_order_amount,
                discount_type:    appliedAutoOrderPromo.discount_type,
                discount_value:   appliedAutoOrderPromo.value,
                discount_applied: autoOrderDiscount,
              }
            : null,
          coupon: appliedCoupon
            ? {
                coupon_code:      coupon_code,
                promo_name:       appliedCoupon.name,
                discount_type:    appliedCoupon.discount_type,
                discount_value:   appliedCoupon.value,
                discount_applied: couponDiscount,
              }
            : null,
          total_discount: totalDiscount,
        },
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error('[createOrder] Transaction error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
};

// ─── updateOrderStatus ────────────────────────────────────────────────────────

const ORDER_STATES = ['draft', 'pending', 'paid'];

/**
 * PUT /api/orders/:id/status
 * Advances POS status.
 */
const updateOrderStatus = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ success: false, error: 'Invalid order id.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, status FROM orders WHERE id = ?',
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found.` });
    }

    const order = rows[0];
    let newStatus;

    if (req.body && req.body.status) {
      newStatus = req.body.status;
      if (!ORDER_STATES.includes(newStatus) && newStatus !== 'cancelled') {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed values: ${ORDER_STATES.join(', ')}, cancelled.`,
        });
      }
    } else {
      const currentIdx = ORDER_STATES.indexOf(order.status);
      if (currentIdx === -1) {
        return res.status(422).json({
          success: false,
          error: `Order has an unrecognised status: "${order.status}".`,
        });
      }
      if (currentIdx === ORDER_STATES.length - 1) {
        return res.status(409).json({
          success: false,
          error: 'Order is already in the terminal state.',
        });
      }
      newStatus = ORDER_STATES[currentIdx + 1];
    }

    await pool.execute(
      'UPDATE orders SET status = ? WHERE id = ?',
      [newStatus, orderId]
    );

    return res.status(200).json({
      success: true,
      data: {
        order_id:        orderId,
        previous_status: order.status,
        status:          newStatus,
      },
    });
  } catch (err) {
    console.error('[updateOrderStatus] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── updateKdsStatus ──────────────────────────────────────────────────────────

/**
 * PUT /api/orders/:id/kds
 * Advances KDS kitchen status.
 */
const updateKdsStatus = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ success: false, error: 'Invalid order id.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, kds_status FROM orders WHERE id = ?',
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found.` });
    }

    const order = rows[0];
    let newStatus;

    if (req.body && req.body.status) {
      newStatus = req.body.status;
      if (!KDS_STATES.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid status. Allowed values: ${KDS_STATES.join(', ')}.`,
        });
      }
    } else {
      const currentIdx = KDS_STATES.indexOf(order.kds_status);
      if (currentIdx === -1) {
        return res.status(422).json({
          success: false,
          error: `Order has an unrecognised kds_status: "${order.kds_status}".`,
        });
      }
      if (currentIdx === KDS_STATES.length - 1) {
        return res.status(409).json({
          success: false,
          error: 'Order is already in the terminal state: Completed.',
        });
      }
      newStatus = KDS_STATES[currentIdx + 1];
    }

    await pool.execute(
      'UPDATE orders SET kds_status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, orderId]
    );

    return res.status(200).json({
      success: true,
      data: { updated: true },
    });
  } catch (err) {
    console.error('[updateKdsStatus] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update KDS status.' });
  }
};

// ─── updateItemCompletion ─────────────────────────────────────────────────────

/**
 * PUT /api/orders/:orderId/items/:itemId/complete
 * Toggles line-item completion.
 */
const updateItemCompletion = async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const itemId  = parseInt(req.params.itemId,  10);

  if (isNaN(orderId) || isNaN(itemId)) {
    return res.status(400).json({ success: false, error: 'Invalid orderId or itemId.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, is_item_completed FROM order_items WHERE id = ? AND order_id = ?',
      [itemId, orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Item ${itemId} not found under order ${orderId}.`,
      });
    }

    const item = rows[0];
    let newFlag;

    if (req.body && typeof req.body.is_item_completed === 'boolean') {
      newFlag = req.body.is_item_completed ? 1 : 0;
    } else {
      newFlag = item.is_item_completed ? 0 : 1;
    }

    await pool.execute(
      'UPDATE order_items SET is_item_completed = ?, updated_at = NOW() WHERE id = ?',
      [newFlag, itemId]
    );

    return res.status(200).json({
      success: true,
      data: { updated: true },
    });
  } catch (err) {
    console.error('[updateItemCompletion] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update item completion status.' });
  }
};

// ─── getOrders ────────────────────────────────────────────────────────────────

/**
 * GET /api/orders
 * Returns active orders with line items.
 */
const getOrders = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT id, order_number, session_id, table_id, customer_id,
              subtotal, discount_amount, tax_amount, total_amount,
              status, kds_status, payment_method, payment_ref, created_at
         FROM orders
        WHERE status IN ('draft', 'pending')
        ORDER BY created_at ASC`
    );

    if (orders.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const orderIds         = orders.map((o) => o.id);
    const itemPlaceholders = orderIds.map(() => '?').join(', ');

    const [items] = await pool.execute(
      `SELECT oi.id, oi.order_id, oi.product_id, p.name AS product_name,
              oi.quantity, oi.price, oi.discount_amount, oi.subtotal AS line_total,
              oi.kds_status, oi.is_item_completed
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id IN (${itemPlaceholders})
        ORDER BY oi.id ASC`,
      orderIds
    );

    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push(item);
    }

    const payload = orders.map((order) => ({
      ...order,
      items: itemsByOrder[order.id] || [],
    }));

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    console.error('[getOrders] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── getOrderById ─────────────────────────────────────────────────────────────

/**
 * GET /api/orders/:id
 * Returns a single order with items.
 */
const getOrderById = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ success: false, error: 'Invalid order id.' });
  }

  try {
    const [orderRows] = await pool.execute(
      `SELECT id, order_number, session_id, table_id, customer_id,
              subtotal, discount_amount, tax_amount, total_amount,
              status, kds_status, payment_method, payment_ref, created_at
         FROM orders
        WHERE id = ?`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found.` });
    }

    const order = orderRows[0];

    const [items] = await pool.execute(
      `SELECT oi.id, oi.product_id, p.name AS product_name,
              oi.quantity, oi.price, oi.discount_amount, oi.subtotal AS line_total,
              oi.kds_status, oi.is_item_completed
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC`,
      [orderId]
    );

    return res.status(200).json({
      success: true,
      data: { order, items },
    });
  } catch (err) {
    console.error('[getOrderById] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

<<<<<<< HEAD
// ─── getKdsSync ───────────────────────────────────────────────────────────────

/**
 * GET /api/sync/kds
 * Lightweight KDS polling endpoint.
 */
const getKdsSync = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT id, order_number, table_id, status, kds_status,
              subtotal, discount_amount, tax_amount, total_amount,
              created_at, updated_at
         FROM orders
        WHERE kds_status IN ('To Cook', 'Preparing')
        ORDER BY created_at ASC`
    );

    if (orders.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const orderIds         = orders.map((o) => o.id);
    const itemPlaceholders = orderIds.map(() => '?').join(', ');

    const [items] = await pool.execute(
      `SELECT oi.id, oi.order_id, oi.product_id, p.name AS product_name,
              oi.quantity, oi.price, oi.discount_amount, oi.subtotal AS line_total,
              oi.kds_status, oi.is_item_completed
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id IN (${itemPlaceholders})
        ORDER BY oi.id ASC`,
      orderIds
    );

    const itemsByOrder = {};
    for (const item of items) {
      if (!itemsByOrder[item.order_id]) {
        itemsByOrder[item.order_id] = [];
      }
      itemsByOrder[item.order_id].push(item);
    }

    const payload = orders.map((order) => ({
      ...order,
      items: itemsByOrder[order.id] || [],
    }));

    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    console.error('[getKdsSync] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── getCustomerSync ──────────────────────────────────────────────────────────

/**
 * GET /api/sync/customer-display/:tableId
 * Customer display polling endpoint.
 */
const getCustomerSync = async (req, res) => {
  const tableId = parseInt(req.params.tableId, 10);
  if (isNaN(tableId)) {
    return res.status(400).json({ success: false, error: 'Invalid tableId.' });
  }

  try {
    const [orderRows] = await pool.execute(
      `SELECT id, order_number, table_id,
              subtotal, discount_amount, tax_amount, total_amount,
              status, kds_status, created_at, updated_at
         FROM orders
        WHERE table_id = ?
          AND status IN ('draft', 'pending')
        ORDER BY created_at DESC
        LIMIT 1`,
      [tableId]
    );

    if (orderRows.length === 0) {
      return res.status(204).send();
    }

    const order = orderRows[0];

    const [items] = await pool.execute(
      `SELECT oi.id, oi.product_id, p.name AS product_name,
              oi.quantity, oi.price, oi.discount_amount, oi.subtotal AS line_total,
              oi.kds_status, oi.is_item_completed
         FROM order_items oi
         LEFT JOIN products p ON p.id = oi.product_id
        WHERE oi.order_id = ?
        ORDER BY oi.id ASC`,
      [order.id]
    );

    return res.status(200).json({
      success: true,
      data: { order, items },
    });
  } catch (err) {
    console.error('[getCustomerSync] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── payOrder ───────────────────────────────────────────────────────────────

/**
 * POST /api/orders/:id/pay
 *
 * Marks an order as paid, records the payment details, and releases the table.
 */
const payOrder = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ success: false, error: 'Invalid order id.' });
  }

  const { payment_method, payment_ref = null, customer_id = null } = req.body;
  if (!payment_method) {
    return res.status(400).json({ success: false, error: 'payment_method is required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.execute(
      'SELECT id, table_id, status FROM orders WHERE id = ?',
      [orderId]
    );

    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: `Order ${orderId} not found.` });
    }

    const order = orders[0];
    if (order.status === 'paid') {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Order is already paid.' });
    }

    await connection.execute(
      `UPDATE orders 
       SET status = 'paid', payment_method = ?, payment_ref = ?, customer_id = COALESCE(?, customer_id)
       WHERE id = ?`,
      [payment_method, payment_ref, customer_id, orderId]
    );

    if (order.table_id) {
      await connection.execute(
        `UPDATE tables SET status = 'available' WHERE id = ?`,
        [order.table_id]
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      data: {
        order_id: orderId,
        status: 'paid',
        payment_method,
        payment_ref,
      }
    });
  } catch (err) {
    await connection.rollback();
    console.error('[payOrder] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  } finally {
    connection.release();
  }
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createOrder,
  updateOrderStatus,
  updateKdsStatus,
  updateItemCompletion,
  getOrders,
  getOrderById,
  getKdsSync,
  getCustomerSync,
  payOrder,
};

