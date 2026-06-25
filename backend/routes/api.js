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
 *   POST   /api/orders/preview                           → previewOrderDiscounts (calculate discounts, no save)
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
  previewOrderDiscounts,
  updateOrderStatus,
  updateKdsStatus,
  updateItemCompletion,
  getOrders,
  getOrderById,
  getKdsSync,
  getCustomerSync,
  payOrder,
} = require('../controllers/orderController');

const {
  getDashboardMetrics
} = require('../controllers/reportController');

const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require('../controllers/categoryController');

const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');

const {
  login,
  signup
} = require('../controllers/authController');

const {
  getAllFloors,
  createFloor,
  deleteFloor,
  getAllTables,
  createTable,
  updateTable,
  deleteTable,
  freeTable,
  verifyTableToken,
} = require('../controllers/tableController');

const {
  getAllPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
} = require('../controllers/paymentController');

const {
  getAllCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');

const {
  getAllPromotions,
  createPromotion,
  updatePromotion,
  deletePromotion,
  validateCoupon,
} = require('../controllers/couponController');

const {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} = require('../controllers/employeeController');

const {
  getActiveSession,
  openSession,
  closeSession,
  getSessionSummary,
} = require('../controllers/sessionController');

const { verifyToken } = require('../middleware/auth');

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
router.post('/orders', verifyToken, createOrder);

/**
 * POST /api/orders/preview
 * Preview all automatic & manual discounts WITHOUT creating the order.
 * Used by frontend to show real-time discount applications in the cart.
 *
 * Body: {
 *   items: [{ product_id: number, quantity: number }]
 *   coupon_code?: string
 * }
 *
 * Response: {
 *   success: true,
 *   data: {
 *     subtotal: number,
 *     product_discounts: [{ product_id, product_name, promo_name, discount }],
 *     order_discount: { promo_name, discount }?,
 *     coupon_discount: { coupon_code, promo_name, discount }?,
 *     total_discount: number,
 *     tax: number,
 *     total: number
 *   }
 * }
 */
router.post('/orders/preview', previewOrderDiscounts);

/**
 * GET /api/orders
 * List all active (draft/pending) orders with their line items.
 */
router.get('/orders', verifyToken, getOrders);

/**
 * GET /api/orders/:id
 * Fetch a single order by ID with its line items.
 */
router.get('/orders/:id', verifyToken, getOrderById);

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

/**
 * POST /api/orders/:id/pay
 * Register payment for an order and free up the table.
 */
router.post('/orders/:id/pay', verifyToken, payOrder);

// ─── Sync / Polling Routes ───────────────────────────────────────────────────────────────

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

// ─── Category Routes ──────────────────────────────────────────────────────────
router.get('/categories', getAllCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// ─── Product Routes ───────────────────────────────────────────────────────────
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

// ─── Floor & Table Routes ─────────────────────────────────────────────────────
router.get('/floors', getAllFloors);
router.post('/floors', createFloor);
router.delete('/floors/:id', deleteFloor);

router.get('/tables', getAllTables);
router.get('/tables/verify-token/:token', verifyTableToken);
router.post('/tables', createTable);
router.put('/tables/:id', updateTable);
router.put('/tables/:id/free', verifyToken, freeTable);
router.delete('/tables/:id', deleteTable);

// ─── Payment Methods Routes ───────────────────────────────────────────────────
router.get('/payment-methods', getAllPaymentMethods);
router.post('/payment-methods', createPaymentMethod);
router.put('/payment-methods/:id', updatePaymentMethod);
router.delete('/payment-methods/:id', deletePaymentMethod);

// support /payments for utility APIs too
router.get('/payments', getAllPaymentMethods);
router.post('/payments', createPaymentMethod);
router.put('/payments/:id', updatePaymentMethod);
router.delete('/payments/:id', deletePaymentMethod);

// ─── Customer Routes ──────────────────────────────────────────────────────────
router.get('/customers', getAllCustomers);
router.post('/customers', createCustomer);
router.put('/customers/:id', updateCustomer);
router.delete('/customers/:id', deleteCustomer);

// ─── Coupons & Promotions Routes ──────────────────────────────────────────────
router.get('/coupons', getAllPromotions);
router.post('/coupons', createPromotion);
router.put('/coupons/:id', updatePromotion);
router.delete('/coupons/:id', deletePromotion);
router.post('/coupons/validate', validateCoupon);

router.get('/promotions', getAllPromotions);
router.post('/promotions', createPromotion);
router.put('/promotions/:id', updatePromotion);
router.delete('/promotions/:id', deletePromotion);

// ─── Employee Management Routes ───────────────────────────────────────────────
router.get('/employees', getAllEmployees);
router.post('/employees', createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// ─── Session Management Routes ────────────────────────────────────────────────
router.get('/sessions/active', verifyToken, getActiveSession);
router.post('/sessions', verifyToken, openSession);
router.get('/sessions', verifyToken, require('../controllers/sessionController').getAllSessions);
router.put('/sessions/:id/close', verifyToken, closeSession);
router.get('/sessions/:id/summary', verifyToken, getSessionSummary);

// ─── Auth Routes ──────────────────────────────────────────────────────────────
router.post('/auth/login', login);
router.post('/auth/signup', signup);

// Check token status and details
router.get('/auth/me', verifyToken, (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

module.exports = router;
