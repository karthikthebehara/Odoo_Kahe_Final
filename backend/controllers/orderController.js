/**
 * controllers/orderController.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Transactional business logic for the Odoo Cafe POS ordering pipeline.
 *
 * Covers:
 *  - createOrder          : Full ACID SQL transaction with promotion engine
 *  - updateKdsStatus      : Advance an order's status through the pipeline
 *  - updateItemCompletion : Toggle individual item kds_status flag
 *  - getKdsSync           : Lightweight KDS polling payload
 *  - getCustomerSync      : Lightweight customer-display polling payload
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
 * Ordered KDS state machine for order-level status transitions.
 * Maps to `orders.status` ENUM: 'draft' → 'sent_to_kitchen' → 'paid' | 'cancelled'
 */
const KDS_STATES = ['draft', 'sent_to_kitchen', 'paid'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round a numeric value to two decimal places.
 * Uses "round half away from zero" to match financial rounding expectations.
 * @param {number} val
 * @returns {number}
 */
const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

/**
 * Generate a zero-padded order number: ORD-00001, ORD-00002, etc.
 * Uses the MAX(id) of the orders table inside the current transaction so
 * the number is assigned safely before the row is committed.
 * @param {import('mysql2/promise').PoolConnection} conn
 * @returns {Promise<string>}
 */
const generateOrderNumber = async (conn) => {
  const [[{ maxId }]] = await conn.execute(
    'SELECT COALESCE(MAX(id), 0) AS maxId FROM orders'
  );
  const nextSeq = parseInt(maxId, 10) + 1;
  return `ORD-${String(nextSeq).padStart(5, '0')}`;
};

// ─── createOrder ─────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 *
 * Creates a new draft order inside a single ACID database transaction.
 *
 * Request body:
 *   {
 *     session_id     : number   (required) – active POS session
 *     cashier_id     : number   (required) – staff member placing the order
 *     table_id       : number   (optional) – omit for take-away
 *     customer_name  : string   (optional) – stored in `customers` if new
 *     customer_phone : string   (optional)
 *     items          : [{ product_id: number, quantity: number }]  (min 1)
 *   }
 *
 * Transaction flow:
 *   1. Validate inputs.
 *   2. BEGIN transaction on a dedicated connection.
 *   3. Upsert customer row if name/phone provided; obtain customer_id.
 *   4. Fetch product prices & tax_percent via single IN-query; validate
 *      each product exists and is_active = 1.
 *   5. Compute per-line subtotals and cumulative baseline totals.
 *   6. Apply PRODUCT-level promotions (apply_to = 'product'):
 *        - percent → lineGross × (discount_value / 100)
 *        - fixed   → min(discount_value, lineGross)     [capped at line total]
 *   7. Apply best ORDER-level promotion (apply_to = 'order') if cart qualifies.
 *   8. Compute tax on discounted subtotal, derive final_total.
 *   9. INSERT orders row (status = 'draft').
 *  10. Batch-INSERT order_items rows linked to the new order id.
 *  11. COMMIT and return the full hydrated payload.
 *  12. On any error: ROLLBACK and return { success: false, error }.
 *
 * Response:
 *   201 { success: true, data: { orderId, total } }
 */
const createOrder = async (req, res) => {
  const {
    session_id,
    cashier_id,
    table_id     = null,
    customer_name  = null,
    customer_phone = null,
    items,
  } = req.body;

  // ── Input validation ────────────────────────────────────────────────────────
  if (!session_id) {
    return res.status(400).json({ success: false, error: 'session_id is required.' });
  }
  if (!cashier_id) {
    return res.status(400).json({ success: false, error: 'cashier_id is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'items array must contain at least one entry.' });
  }
  for (const [idx, item] of items.entries()) {
    if (!item.product_id || !item.quantity || Number(item.quantity) < 1) {
      return res.status(400).json({
        success: false,
        error: `Item at index ${idx} must have a valid product_id and quantity ≥ 1.`,
      });
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ── Step 1: Upsert customer row ─────────────────────────────────────────
    let customerId = null;
    if (customer_name) {
      // Try to find by phone first (most reliable unique identifier at a café)
      if (customer_phone) {
        const [existing] = await connection.execute(
          'SELECT id FROM customers WHERE phone = ? LIMIT 1',
          [customer_phone]
        );
        if (existing.length > 0) {
          customerId = existing[0].id;
        }
      }

      if (!customerId) {
        // Create a new customer record
        const [insertResult] = await connection.execute(
          'INSERT INTO customers (name, phone) VALUES (?, ?)',
          [customer_name, customer_phone || null]
        );
        customerId = insertResult.insertId;
      }
    }

    // ── Step 2: Resolve product prices in a single query ────────────────────
    const productIds   = items.map((i) => i.product_id);
    const placeholders = productIds.map(() => '?').join(', ');

    const [productRows] = await connection.execute(
      `SELECT id, name, price, tax_percent, is_active
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
      if (!product.is_active) {
        await connection.rollback();
        return res.status(409).json({
          success: false,
          error: `Product "${product.name}" is not currently available.`,
        });
      }
    }

    // ── Step 3: Compute per-line gross totals ───────────────────────────────
    let cartGross = 0;

    const lineItems = items.map((item) => {
      const product   = productMap[item.product_id];
      const unitPrice = parseFloat(product.price);
      const taxPct    = parseFloat(product.tax_percent); // e.g. 5.00 = 5%
      const quantity  = Number(item.quantity);
      const lineGross = round2(unitPrice * quantity);

      cartGross = round2(cartGross + lineGross);

      return {
        product_id:   item.product_id,
        product_name: product.name,
        quantity,
        unit_price:   unitPrice,
        tax_percent:  taxPct,
        line_gross:   lineGross,
        line_discount: 0,      // populated in Step 4
        line_total:   lineGross, // updated after discount in Step 4
      };
    });

    // ── Step 4: Apply PRODUCT-level promotions ──────────────────────────────
    const [productPromos] = await connection.execute(
      `SELECT product_id, min_quantity, discount_type, discount_value
         FROM promotions
        WHERE apply_to   = 'product'
          AND is_active  = 1
          AND product_id IN (${placeholders})
        ORDER BY discount_value DESC`,
      productIds
    );

    // Best promo per product (already sorted DESC by value, first wins)
    const productPromoMap = {};
    for (const promo of productPromos) {
      if (!productPromoMap[promo.product_id]) {
        productPromoMap[promo.product_id] = promo;
      }
    }

    let totalProductDiscount = 0;
    let cartSubtotal = 0; // subtotal after product-level discounts

    for (const line of lineItems) {
      const promo = productPromoMap[line.product_id];

      if (promo && line.quantity >= promo.min_quantity) {
        let disc = 0;
        if (promo.discount_type === 'percent') {
          disc = round2(line.line_gross * (parseFloat(promo.discount_value) / 100));
        } else {
          // fixed — cap at the line total so we never go negative
          disc = Math.min(parseFloat(promo.discount_value), line.line_gross);
          disc = round2(disc);
        }
        line.line_discount = disc;
        line.line_total    = round2(line.line_gross - disc);
      }

      totalProductDiscount = round2(totalProductDiscount + line.line_discount);
      cartSubtotal         = round2(cartSubtotal         + line.line_total);
    }

    // ── Step 5: Apply ORDER-level promotion ─────────────────────────────────
    const [orderPromos] = await connection.execute(
      `SELECT min_order_amount, discount_type, discount_value
         FROM promotions
        WHERE apply_to        = 'order'
          AND is_active       = 1
          AND (min_order_amount IS NULL OR min_order_amount <= ?)
        ORDER BY discount_value DESC
        LIMIT 1`,
      [cartSubtotal]
    );

    let orderDiscount    = 0;
    let appliedOrderPromo = null;

    if (orderPromos.length > 0) {
      appliedOrderPromo = orderPromos[0];
      const dv = parseFloat(appliedOrderPromo.discount_value);

      if (appliedOrderPromo.discount_type === 'percent') {
        orderDiscount = round2(cartSubtotal * (dv / 100));
      } else {
        orderDiscount = Math.min(dv, cartSubtotal);
        orderDiscount = round2(orderDiscount);
      }
    }

    const discountedSubtotal = round2(cartSubtotal - orderDiscount);
    const totalDiscount      = round2(totalProductDiscount + orderDiscount);

    // ── Step 6: Compute per-line tax and cumulative tax ─────────────────────
    // Tax is applied per line at its own rate, then summed (avoids rounding drift)
    let totalTax = 0;
    for (const line of lineItems) {
      const lineTax = round2(line.line_total * (line.tax_percent / 100));
      line.line_tax = lineTax;
      totalTax      = round2(totalTax + lineTax);
    }

    const finalTotal = round2(discountedSubtotal + totalTax);

    // ── Step 7: Generate order number and INSERT order header ───────────────
    const orderNumber = await generateOrderNumber(connection);

    const [orderResult] = await connection.execute(
      `INSERT INTO orders
         (order_number, session_id, table_id, customer_id, cashier_id,
          status, subtotal, tax_amount, discount_amount, total_amount,
          source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, 'pos', NOW(), NOW())`,
      [
        orderNumber,
        session_id,
        table_id,
        customerId,
        cashier_id,
        discountedSubtotal,
        totalTax,
        totalDiscount,
        finalTotal,
      ]
    );

    const orderId = orderResult.insertId;

    // ── Step 8: Batch-INSERT order_items ────────────────────────────────────
    for (const line of lineItems) {
      await connection.execute(
        `INSERT INTO order_items
           (order_id, product_id, product_name, unit_price, quantity,
            tax_percent, discount_amount, line_total, kds_status,
            created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [
          orderId,
          line.product_id,
          line.product_name,
          line.unit_price,
          line.quantity,
          line.tax_percent,
          line.line_discount,
          line.line_total,
        ]
      );
    }

    await connection.commit();

    // ── Step 9: Respond with the team-standard envelope ─────────────────────
    return res.status(201).json({
      success: true,
      data: {
        orderId:  orderId,
        total:    finalTotal,
        // Extended fields — useful for receipt rendering
        order: {
          id:              orderId,
          order_number:    orderNumber,
          session_id,
          table_id,
          customer_id:     customerId,
          cashier_id,
          status:          'draft',
          subtotal:        discountedSubtotal,
          discount_amount: totalDiscount,
          tax_amount:      totalTax,
          total_amount:    finalTotal,
        },
        items: lineItems.map((l) => ({
          product_id:      l.product_id,
          product_name:    l.product_name,
          quantity:        l.quantity,
          unit_price:      l.unit_price,
          tax_percent:     l.tax_percent,
          discount_amount: l.line_discount,
          line_total:      l.line_total,
        })),
        promotions_applied: {
          product_discount: totalProductDiscount,
          order_discount:   orderDiscount,
          order_promo:      appliedOrderPromo
            ? {
                min_order_amount: appliedOrderPromo.min_order_amount,
                discount_type:    appliedOrderPromo.discount_type,
                discount_value:   appliedOrderPromo.discount_value,
              }
            : null,
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

// ─── updateKdsStatus ──────────────────────────────────────────────────────────

/**
 * PUT /api/orders/:id/kds
 *
 * Advances the order's status through the POS pipeline:
 *   draft → sent_to_kitchen → paid
 *
 * Body (optional): { kds_status: "sent_to_kitchen" }
 *   If provided, the supplied status is validated against KDS_STATES and
 *   applied directly.  If omitted, the current status is auto-advanced by
 *   one step.
 */
const updateKdsStatus = async (req, res) => {
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

    if (req.body && req.body.kds_status) {
      newStatus = req.body.kds_status;
      if (!KDS_STATES.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid kds_status. Allowed values: ${KDS_STATES.join(', ')}.`,
        });
      }
    } else {
      const currentIdx = KDS_STATES.indexOf(order.status);
      if (currentIdx === -1) {
        return res.status(422).json({
          success: false,
          error: `Order has an unrecognised status: "${order.status}".`,
        });
      }
      if (currentIdx === KDS_STATES.length - 1) {
        return res.status(409).json({
          success: false,
          error: `Order is already in the terminal state: ${order.status}.`,
        });
      }
      newStatus = KDS_STATES[currentIdx + 1];
    }

    // Also stamp kds_sent_at when transitioning into the kitchen
    const kdsExtra =
      newStatus === 'sent_to_kitchen'
        ? ', kds_sent_at = NOW()'
        : '';

    await pool.execute(
      `UPDATE orders SET status = ?, updated_at = NOW()${kdsExtra} WHERE id = ?`,
      [newStatus, orderId]
    );

    return res.status(200).json({
      success: true,
      data: {
        order_id:            orderId,
        previous_kds_status: order.status,
        kds_status:          newStatus,
      },
    });
  } catch (err) {
    console.error('[updateKdsStatus] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── updateItemCompletion ─────────────────────────────────────────────────────

/**
 * PUT /api/orders/:orderId/items/:itemId/complete
 *
 * Advances (or explicitly sets) the `kds_status` on a single order_item row.
 * Valid values: 'pending' → 'preparing' → 'completed'
 *
 * Body (optional): { kds_status: "completed" }
 *   If omitted, the item's status is auto-advanced one step.
 */
const ITEM_KDS_STATES = ['pending', 'preparing', 'completed'];

const updateItemCompletion = async (req, res) => {
  const orderId = parseInt(req.params.orderId, 10);
  const itemId  = parseInt(req.params.itemId,  10);

  if (isNaN(orderId) || isNaN(itemId)) {
    return res.status(400).json({ success: false, error: 'Invalid orderId or itemId.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT id, kds_status FROM order_items WHERE id = ? AND order_id = ?',
      [itemId, orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Item ${itemId} not found under order ${orderId}.`,
      });
    }

    const item = rows[0];
    let newStatus;

    if (req.body && req.body.kds_status) {
      newStatus = req.body.kds_status;
      if (!ITEM_KDS_STATES.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid kds_status. Allowed values: ${ITEM_KDS_STATES.join(', ')}.`,
        });
      }
    } else {
      const currentIdx = ITEM_KDS_STATES.indexOf(item.kds_status);
      if (currentIdx === -1) {
        return res.status(422).json({
          success: false,
          error: `Item has an unrecognised kds_status: "${item.kds_status}".`,
        });
      }
      if (currentIdx === ITEM_KDS_STATES.length - 1) {
        return res.status(409).json({
          success: false,
          error: 'Item is already completed.',
        });
      }
      newStatus = ITEM_KDS_STATES[currentIdx + 1];
    }

    await pool.execute(
      'UPDATE order_items SET kds_status = ?, updated_at = NOW() WHERE id = ?',
      [newStatus, itemId]
    );

    return res.status(200).json({
      success: true,
      data: {
        item_id:              itemId,
        order_id:             orderId,
        previous_kds_status: item.kds_status,
        kds_status:          newStatus,
      },
    });
  } catch (err) {
    console.error('[updateItemCompletion] Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ─── getKdsSync ───────────────────────────────────────────────────────────────

/**
 * GET /api/sync/kds
 *
 * Lightweight polling endpoint for the Kitchen Display System.
 * Returns all non-completed orders (status = 'draft' or 'sent_to_kitchen')
 * with their line items, ordered oldest-first.
 *
 * Designed for sub-5 s short-polling intervals.
 */
const getKdsSync = async (req, res) => {
  try {
    const [orders] = await pool.execute(
      `SELECT id, order_number, table_id, customer_id, status,
              subtotal, tax_amount, discount_amount, total_amount,
              created_at, updated_at
         FROM orders
        WHERE status IN ('draft', 'sent_to_kitchen')
        ORDER BY created_at ASC`
    );

    if (orders.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const orderIds         = orders.map((o) => o.id);
    const itemPlaceholders = orderIds.map(() => '?').join(', ');

    const [items] = await pool.execute(
      `SELECT id, order_id, product_name, quantity, unit_price,
              tax_percent, discount_amount, line_total, kds_status
         FROM order_items
        WHERE order_id IN (${itemPlaceholders})
        ORDER BY id ASC`,
      orderIds
    );

    // Group items by order_id
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
 *
 * Lightweight polling endpoint for a customer-facing display tied to a table.
 * Returns the most recent active order for the given table.
 * Returns HTTP 204 when no active order exists (display should show idle).
 */
const getCustomerSync = async (req, res) => {
  const tableId = parseInt(req.params.tableId, 10);
  if (isNaN(tableId)) {
    return res.status(400).json({ success: false, error: 'Invalid tableId.' });
  }

  try {
    const [orderRows] = await pool.execute(
      `SELECT id, order_number, table_id, customer_id,
              subtotal, discount_amount, tax_amount, total_amount,
              status, created_at, updated_at
         FROM orders
        WHERE table_id = ?
          AND status IN ('draft', 'sent_to_kitchen')
        ORDER BY created_at DESC
        LIMIT 1`,
      [tableId]
    );

    if (orderRows.length === 0) {
      return res.status(204).send();
    }

    const order = orderRows[0];

    const [items] = await pool.execute(
      `SELECT id, product_name, quantity, unit_price,
              tax_percent, discount_amount, line_total, kds_status
         FROM order_items
        WHERE order_id = ?
        ORDER BY id ASC`,
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

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createOrder,
  updateKdsStatus,
  updateItemCompletion,
  getKdsSync,
  getCustomerSync,
};
