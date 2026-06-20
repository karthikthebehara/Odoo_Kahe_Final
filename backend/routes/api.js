const express = require('express');
const jwt = require('jsonwebtoken');
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

    const token = authHeader.split(' ')[1];
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
router.post('/login', login);

// ─── Protected Inventory Routes ──────────────────────────────────────────────
// All routes below require a valid JWT
router.use(verifyToken);

// Categories
router.get('/categories', getAllCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

// Products
router.get('/products', getAllProducts);
router.get('/products/:id', getProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

module.exports = router;
