const express = require('express');
const router = express.Router();
const selfOrderController = require('../controllers/selfOrderController');
const { verifyToken, isAdmin } = require('../middleware/auth');

// GET /api/self-order/config (public)
router.get('/config', selfOrderController.getConfig);

// POST /api/self-order/config (protected for admin only)
router.post('/config', verifyToken, isAdmin, selfOrderController.updateConfig);

// GET /api/self-order/verify/:token (public)
router.get('/verify/:token', selfOrderController.verifyTableToken);

// POST /api/self-order/order (public)
router.post('/order', selfOrderController.createSelfOrder);

// GET /api/self-order/order/:orderId (public)
router.get('/order/:orderId', selfOrderController.getSelfOrderStatus);

module.exports = router;

