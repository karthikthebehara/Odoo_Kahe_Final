const express = require('express');
const router = express.Router();
const selfOrderController = require('../controllers/selfOrderController');

/**
 * Routes for Self-Ordering QR infrastructure.
 * Base path: /api/self-order
 */

// GET /api/self-order/verify/:token
router.get('/verify/:token', selfOrderController.verifyTableToken);

module.exports = router;
