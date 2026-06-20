/**
 * routes/api.js
 * ──────────────────────────────────────────────────────────────────────────────
 * Central API router for the Odoo Cafe POS backend.
 *
 * Mount this file in server.js with:
 *   app.use('/api', require('./routes/api'));
 *
 * Registered endpoints
 * ────────────────────
 * Orders
 *   POST   /api/orders                                    → createOrder  (with 3-tier promo engine)
 *   GET    /api/orders                                    → getOrders    (active orders + items)
 *   GET    /api/orders/:id                                → getOrderById (single order + items)
 *   PUT    /api/orders/:id/status                         → updateOrderStatus
 *   PUT    /api/orders/:id/kds                            → updateKdsStatus
 *   PUT    /api/orders/:orderId/items/:itemId/complete    → updateItemCompletion
 *
 * Sync / Polling
 *   GET    /api/sync/kds                                  → getKdsSync
 *   GET    /api/sync/customer-display/:tableId            → getCustomerSync
 */

'use strict';

const express = require('express');
const router  = express.Router();

// ─── Controller Imports ───────────────────────────────────────────────────────

const {
  createOrder,
  updateOrderStatus,
  updateKdsStatus,
  updateItemCompletion,
  getOrders,
  getOrderById,
  getKdsSync,
  getCustomerSync,
} = require('../controllers/orderController');

const {
  getDashboardMetrics
} = require('../controllers/reportController');

// ─── Order Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 * Create a new order with full three-tier promotion engine inside a DB transaction.
 *
 * Body: {
 *   session_id: number,
 *   table_id?: number,
 *   coupon_code?: string,
 *   items: [{ product_id: number, quantity: number }]
 * }
 */
router.post('/orders', createOrder);

/**
 * GET /api/orders
 * List all active (draft/pending) orders with their line items.
 */
router.get('/orders', getOrders);

/**
 * GET /api/orders/:id
 * Fetch a single order by ID with its line items.
 */
router.get('/orders/:id', getOrderById);

/**
 * PUT /api/orders/:id/status
 * Advance (or explicitly set) the status of an order.
 *
 * Body (optional): { status: "pending" | "paid" | "cancelled" }
 * If body is omitted, the status is auto-advanced one step forward.
 */
router.put('/orders/:id/status', updateOrderStatus);

/**
 * PUT /api/orders/:id/kds
 * Advance (or explicitly set) the KDS status of an order.
 *
 * Params: id        – order id
 * Body (optional):  { status: "Preparing" | "Completed" }
 * If body is omitted, the status is auto-advanced one step forward.
 */
router.put('/orders/:id/kds', updateKdsStatus);

/**
 * PUT /api/orders/:orderId/items/:itemId/complete
 * Toggle or explicitly set the is_item_completed flag on a single order item.
 *
 * Params: orderId, itemId
 * Body (optional): { is_item_completed: true | false }
 */
router.put('/orders/:orderId/items/:itemId/complete', updateItemCompletion);

// ─── Sync / Polling Routes ────────────────────────────────────────────────────

/**
 * GET /api/sync/kds
 * Lightweight KDS polling payload — active orders with items.
 */
router.get('/sync/kds', getKdsSync);

/**
 * GET /api/sync/customer-display/:tableId
 * Lightweight customer-display polling payload for a specific table.
 */
router.get('/sync/customer-display/:tableId', getCustomerSync);

// ─── Reporting Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/reports/dashboard
 * Multi-filter admin reporting dashboard metrics.
 */
router.get('/reports/dashboard', getDashboardMetrics);

module.exports = router;
