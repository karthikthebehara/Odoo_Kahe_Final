/**
 * orderController.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Transactional business logic for the Odoo Cafe POS ordering pipeline.
 *
 * Covers:
 *  - createOrder          : Full SQL transaction with promotion engine
 *  - updateKdsStatus      : Advance an order through KDS states
 *  - updateItemCompletion : Toggle individual item completion flag
 *  - getKdsSync           : Lightweight KDS polling payload
 *  - getCustomerSync      : Lightweight customer-display polling payload
 *
 * JSON envelope standard:
 *   Success  → { success: true,  data: <payload> }
 *   Failure  → { success: false, error: "<message>" }
 */

'use strict';

const { pool } = require('../config/db');

// ─── Constants ────────────────────────────────────────────────────────────────

const TAX_RATE = 0.05; // 5 % GST

/** Ordered KDS state machine */
const KDS_STATES = ['To Cook', 'Preparing', 'Completed'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Round a numeric value to two decimal places.
 * Uses the standard "round half away from zero" strategy.
 * @param {number} val
 * @returns {number}
 */
const round2 = (val) => Math.round((val + Number.EPSILON) * 100) / 100;

// ─── createOrder ─────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 *
 * Body:
 *   {
 *     table_id       : number   (required),
 *     customer_name  : string   (optional),
 *     customer_phone : string   (optional),
 *     items          : [{ product_id: number, quantity: number }, …]  (min 1)
 *   }
 *
 * Flow:
 *  1. Validate inputs.
 *  2. Acquire a dedicated MySQL connection and BEGIN a transaction.
 *  3. Fetch product prices in a single IN-query; compute per-line subtotals.
 *  4. Query active PRODUCT-level promotions: if an item's quantity ≥ promotion
 *     min_quantity, apply the configured discount_value (treated as a percentage)
 *     to that line's subtotal.
 *  5. Sum all lines into cart_total.
 *  6. Query active ORDER-level promotions: if cart_total ≥ promotion
 *     min_order_amount, apply the configured discount_value (percentage) to the
 *     cart_total.
 *  7. Compute tax, final_total, and persist rows in `orders` and `order_items`.
 *  8. COMMIT and return the hydrated order payload.
 */
const createOrder = async (req, res) => {
  const { table_id, customer_name = null, customer_phone = null, items } = req.body;

  // ── Input Validation ──────────────────────────────────────────────────────
  if (!table_id) {
    return res.status(400).json({ success: false, error: 'table_id is required.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ success: false, error: 'items array must contain at least one entry.' });
  }
  for (const [idx, item] of items.entries()) {
    if (!item.product_id || !item.quantity || item.quantity < 1) {
      return res
        .status(400)
        .json({ success: false, error: `Item at index ${idx} must have a valid product_id and quantity ≥ 1.` });
    }
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ── Step 1: Resolve product prices ───────────────────────────────────────
    const productIds = items.map((i) => i.product_id);
    const placeholders = productIds.map(() => '?').join(', ');

    const [productRows] = await connection.execute(
      `SELECT id, name, price, is_available
         FROM products
        WHERE id IN (${placeholders})`,
      productIds
    );

    // Build a lookup map and validate all requested products exist & are available
    const productMap = {};
    for (const row of productRows) {
      productMap[row.id] = row;
    }

    for (const item of items) {
      if (!productMap[item.product_id]) {
        await connection.rollback();
        return res
          .status(404)
          .json({ success: false, error: `Product with id ${item.product_id} not found.` });
      }
      if (!productMap[item.product_id].is_available) {
        await connection.rollback();
        return res
          .status(409)
          .json({ success: false, error: `Product "${productMap[item.product_id].name}" is currently unavailable.` });
      }
    }

    // ── Step 2: Compute line items with PRODUCT-level promotions ─────────────
    /**
     * Fetch all active product promotions in one query.
     * Schema assumption:
     *   promotions (id, type ENUM('product','order'), product_id,
     *               min_quantity, min_order_amount, discount_value,
     *               is_active, start_date, end_date)
     */
    const [productPromos] = await connection.execute(
      `SELECT p.product_id,
              p.min_quantity,
              p.discount_value
         FROM promotions p
        WHERE p.type       = 'product'
          AND p.is_active  = 1
          AND p.product_id IN (${placeholders})
          AND (p.start_date IS NULL OR p.start_date <= NOW())
          AND (p.end_date   IS NULL OR p.end_date   >= NOW())
        ORDER BY p.discount_value DESC`,
      productIds
    );

    // Map product_id → best applicable promo (highest discount_value)
    const productPromoMap = {};
    for (const promo of productPromos) {
      if (!productPromoMap[promo.product_id]) {
        productPromoMap[promo.product_id] = promo;
      }
    }

    let cartSubtotal = 0;
    let totalProductDiscount = 0;

    const lineItems = items.map((item) => {
      const product = productMap[item.product_id];
      const unitPrice = parseFloat(product.price);
      const lineGross = round2(unitPrice * item.quantity);

      // Apply product promo if quantity threshold is met
      let lineDiscount = 0;
      const promo = productPromoMap[item.product_id];
      if (promo && item.quantity >= promo.min_quantity) {
        lineDiscount = round2(lineGross * (parseFloat(promo.discount_value) / 100));
      }

      const lineNet = round2(lineGross - lineDiscount);
      cartSubtotal = round2(cartSubtotal + lineNet);
      totalProductDiscount = round2(totalProductDiscount + lineDiscount);

      return {
        product_id:    item.product_id,
        product_name:  product.name,
        quantity:      item.quantity,
        unit_price:    unitPrice,
        line_gross:    lineGross,
        line_discount: lineDiscount,
        line_net:      lineNet,
      };
    });

    // ── Step 3: Apply ORDER-level promotions ──────────────────────────────────
    const [orderPromos] = await connection.execute(
      `SELECT min_order_amount, discount_value
         FROM promotions
        WHERE type            = 'order'
          AND is_active       = 1
          AND min_order_amount <= ?
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date   IS NULL OR end_date   >= NOW())
        ORDER BY discount_value DESC
        LIMIT 1`,
      [cartSubtotal]
    );

    let orderDiscount = 0;
    let appliedOrderPromo = null;
    if (orderPromos.length > 0) {
      appliedOrderPromo = orderPromos[0];
      orderDiscount = round2(cartSubtotal * (parseFloat(appliedOrderPromo.discount_value) / 100));
    }

    const discountedSubtotal = round2(cartSubtotal - orderDiscount);
    const taxAmount = round2(discountedSubtotal * TAX_RATE);
    const finalTotal = round2(discountedSubtotal + taxAmount);
    const totalDiscount = round2(totalProductDiscount + orderDiscount);

    // ── Step 4: Insert the order header ──────────────────────────────────────
    const [orderResult] = await connection.execute(
      `INSERT INTO orders
         (table_id, customer_name, customer_phone,
          subtotal, discount_amount, tax_amount, total_amount,
          kds_status, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'To Cook', 'open', NOW())`,
      [
        table_id,
        customer_name,
        customer_phone,
        discountedSubtotal,
        totalDiscount,
        taxAmount,
        finalTotal,
      ]
    );

    const orderId = orderResult.insertId;

    // ── Step 5: Insert all order_items rows ───────────────────────────────────
    for (const line of lineItems) {
      await connection.execute(
        `INSERT INTO order_items
           (order_id, product_id, product_name, quantity, unit_price,
            subtotal, discount_amount, kds_status, is_item_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'To Cook', 0)`,
        [
          orderId,
          line.product_id,
          line.product_name,
          line.quantity,
          line.unit_price,
          line.line_net,
          line.line_discount,
        ]
      );
    }

    await connection.commit();

    // ── Step 6: Return the full hydrated payload ──────────────────────────────
    return res.status(201).json({
      success: true,
      data: {
        order: {
          id:              orderId,
          table_id,
          customer_name,
          customer_phone,
          subtotal:        discountedSubtotal,
          discount_amount: totalDiscount,
          tax_amount:      taxAmount,
          total_amount:    finalTotal,
          kds_status:      'To Cook',
          status:          'open',
        },
        items: lineItems,
        promotions_applied: {
          product_discount: totalProductDiscount,
          order_discount:   orderDiscount,
          order_promo:      appliedOrderPromo
            ? { min_order_amount: appliedOrderPromo.min_order_amount, discount_value: appliedOrderPromo.discount_value }
            : null,
        },
      },
    });
  } catch (err) {
    await connection.rollback();
    console.error('[createOrder] Transaction error:', err);
    return res.status(500).json({ success: false, error: 'Failed to create order. Please try again.' });
  } finally {
    connection.release();
  }
};

// ─── updateKdsStatus ──────────────────────────────────────────────────────────

/**
 * PUT /api/orders/:id/kds
 *
 * Advances the order's kds_status through the KDS state machine:
 *   'To Cook' → 'Preparing' → 'Completed'
 *
 * Body (optional): { kds_status: "Preparing" }
 *   If provided, the supplied status is validated and applied directly.
 *   If omitted, the current status is fetched and advanced one step.
 */
const updateKdsStatus = async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({ success: false, error: 'Invalid order id.' });
  }

  try {
    // Fetch current order status
    const [rows] = await pool.execute(
      'SELECT id, kds_status FROM orders WHERE id = ?',
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: `Order ${orderId} not found.` });
    }

    const order = rows[0];
    let newStatus;

    if (req.body && req.body.kds_status) {
      // Explicit status supplied
      newStatus = req.body.kds_status;
      if (!KDS_STATES.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          error: `Invalid kds_status. Allowed values: ${KDS_STATES.join(', ')}.`,
        });
      }
    } else {
      // Auto-advance
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
      data: {
        order_id:           orderId,
        previous_kds_status: order.kds_status,
        kds_status:          newStatus,
      },
    });
  } catch (err) {
    console.error('[updateKdsStatus] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update KDS status.' });
  }
};

// ─── updateItemCompletion ─────────────────────────────────────────────────────

/**
 * PUT /api/orders/:orderId/items/:itemId/complete
 *
 * Toggles the `is_item_completed` boolean flag on a single order_item row.
 * Useful for granular kitchen tracking (each item ticked off as it's plated).
 *
 * Body (optional): { is_item_completed: true | false }
 *   If omitted, the flag is toggled from its current value.
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
      // Toggle
      newFlag = item.is_item_completed ? 0 : 1;
    }

    await pool.execute(
      'UPDATE order_items SET is_item_completed = ?, updated_at = NOW() WHERE id = ?',
      [newFlag, itemId]
    );

    return res.status(200).json({
      success: true,
      data: {
        item_id:              itemId,
        order_id:             orderId,
        is_item_completed:    !!newFlag,
      },
    });
  } catch (err) {
    console.error('[updateItemCompletion] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to update item completion status.' });
  }
};

// ─── getKdsSync ───────────────────────────────────────────────────────────────

/**
 * GET /api/sync/kds
 *
 * Lightweight polling endpoint for the Kitchen Display System.
 * Returns all non-completed orders along with their line items,
 * ordered by creation time (oldest first).
 *
 * Optimised for high-frequency short-polling (sub-5 s intervals).
 * No pagination — only active orders are returned.
 */
const getKdsSync = async (req, res) => {
  try {
    // Fetch active order headers
    const [orders] = await pool.execute(
      `SELECT id, table_id, customer_name, kds_status, status, created_at, updated_at
         FROM orders
        WHERE kds_status != 'Completed'
          AND status      = 'open'
        ORDER BY created_at ASC`
    );

    if (orders.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Batch-fetch all relevant line items in a single query
    const orderIds   = orders.map((o) => o.id);
    const itemPlaceholders = orderIds.map(() => '?').join(', ');

    const [items] = await pool.execute(
      `SELECT id, order_id, product_name, quantity, unit_price,
              kds_status, is_item_completed
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
    return res.status(500).json({ success: false, error: 'Failed to fetch KDS sync data.' });
  }
};

// ─── getCustomerSync ──────────────────────────────────────────────────────────

/**
 * GET /api/sync/customer-display/:tableId
 *
 * Lightweight polling endpoint for a customer-facing display tied to a table.
 * Returns the most recent open order for the given table, including:
 *  - Order header (totals, discount, tax)
 *  - All line items
 *  - KDS status (so the customer can see when their order is being prepared)
 *
 * Returns 204 No Content if no active order exists for the table.
 */
const getCustomerSync = async (req, res) => {
  const tableId = parseInt(req.params.tableId, 10);
  if (isNaN(tableId)) {
    return res.status(400).json({ success: false, error: 'Invalid tableId.' });
  }

  try {
    // Fetch the most recent open order for this table
    const [orderRows] = await pool.execute(
      `SELECT id, table_id, customer_name, customer_phone,
              subtotal, discount_amount, tax_amount, total_amount,
              kds_status, status, created_at, updated_at
         FROM orders
        WHERE table_id = ?
          AND status   = 'open'
        ORDER BY created_at DESC
        LIMIT 1`,
      [tableId]
    );

    if (orderRows.length === 0) {
      // No active order — customer display should show idle state
      return res.status(204).send();
    }

    const order = orderRows[0];

    // Fetch line items for this order
    const [items] = await pool.execute(
      `SELECT id, product_name, quantity, unit_price, subtotal,
              discount_amount, is_item_completed
         FROM order_items
        WHERE order_id = ?
        ORDER BY id ASC`,
      [order.id]
    );

    return res.status(200).json({
      success: true,
      data: {
        order,
        items,
      },
    });
  } catch (err) {
    console.error('[getCustomerSync] Error:', err);
    return res.status(500).json({ success: false, error: 'Failed to fetch customer display data.' });
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
