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
 * Auth (public)
 *   POST   /api/signup                                     → signup
 *   POST   /api/login                                      → login
 *
 * Categories (protected)
 *   GET    /api/categories                                 → getAllCategories
 *   GET    /api/categories/:id                             → getCategoryById
 *   POST   /api/categories                                 → createCategory
 *   PUT    /api/categories/:id                             → updateCategory
 *   DELETE /api/categories/:id                             → deleteCategory
 *
 * Products (protected)
 *   GET    /api/products                                   → getAllProducts
 *   GET    /api/products/:id                               → getProductById
 *   POST   /api/products                                   → createProduct
 *   PUT    /api/products/:id                               → updateProduct
 *   DELETE /api/products/:id                               → deleteProduct
 *
 * Orders (protected)
 *   POST   /api/orders                                     → createOrder
 *   PUT    /api/orders/:id/kds                             → updateKdsStatus
 *   PUT    /api/orders/:orderId/items/:itemId/complete     → updateItemCompletion
 *
 * Sync / Polling (protected)
 *   GET    /api/sync/kds                                   → getKdsSync
 *   GET    /api/sync/customer-display/:tableId             → getCustomerSync
 */

'use strict';

const express = require('express');
const jwt     = require('jsonwebtoken');

const { signup, login } = require('../controllers/authController');
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
  createOrder,
  updateKdsStatus,
  updateItemCompletion,
  getKdsSync,
  getCustomerSync,
} = require('../controllers/orderController');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'odoo_cafe_pos_secret_key';

// ─── JWT Verification Middleware ─────────────────────────────────────────────
/**
 * Lightweight middleware that extracts and verifies the JWT from the
 * Authorization header (Bearer <token>). On success, attaches the decoded
 * payload to `req.user`.
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
    }

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = decoded; // { id, name, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
};

// ─── Public Auth Routes ──────────────────────────────────────────────────────
router.post('/signup', signup);
router.post('/login',  login);

// ─── Protected Routes (JWT required for everything below) ────────────────────
router.use(verifyToken);

// Categories
router.get('/categories',     getAllCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories',    createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Products
router.get('/products',     getAllProducts);
router.get('/products/:id', getProductById);
router.post('/products',    createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

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

module.exports = router;
