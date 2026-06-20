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
 *   POST   /api/orders                                    → createOrder
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
  updateKdsStatus,
  updateItemCompletion,
  getKdsSync,
  getCustomerSync,
} = require('../controllers/orderController');

const {
  getDashboardMetrics
} = require('../controllers/reportController');

// ─── Order Routes ─────────────────────────────────────────────────────────────

/**
 * POST /api/orders
 * Create a new order with full promotion calculation inside a DB transaction.
 *
 * Body: { table_id, customer_name?, customer_phone?, items: [{ product_id, quantity }] }
 */
router.post('/orders', createOrder);

/**
 * PUT /api/orders/:id/kds
 * Advance (or explicitly set) the KDS status of an order.
 *
 * Params: id        – order id
 * Body (optional):  { kds_status: "Preparing" | "Completed" }
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
 * Lightweight KDS polling payload — all non-completed open orders with items.
 * Designed for sub-5 s short-polling intervals from the kitchen display.
 */
router.get('/sync/kds', getKdsSync);

/**
 * GET /api/sync/customer-display/:tableId
 * Lightweight customer-display polling payload for a specific table.
 * Returns 200 + order payload when an active order exists, or 204 when idle.
 */
router.get('/sync/customer-display/:tableId', getCustomerSync);

// ─── Reporting Routes ─────────────────────────────────────────────────────────

/**
 * GET /api/reports/dashboard
 * Multi-filter admin reporting dashboard metrics.
 */
router.get('/reports/dashboard', getDashboardMetrics);

module.exports = router;
