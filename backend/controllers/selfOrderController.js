const { pool } = require('../config/db');

/**
 * Controller for Self-Ordering QR infrastructure.
 */
const selfOrderController = {
    /**
     * Verifies a table token and returns table details including floor.
     * GET /api/self-order/verify/:token
     */
    verifyTableToken: async (req, res) => {
        try {
            const { token } = req.params;

            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid token"
                });
            }

            // Query the database for the matching table and floor details
            const [rows] = await pool.query(
                `SELECT t.id AS table_id, t.table_number, t.status, f.name AS floor_name 
                 FROM tables t 
                 LEFT JOIN floors f ON t.floor_id = f.id 
                 WHERE t.qr_token = ? AND t.is_active = TRUE`,
                [token]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Invalid token"
                });
            }

            const table = rows[0];

            return res.status(200).json({
                success: true,
                data: {
                    table_id: table.table_id,
                    table_number: table.table_number,
                    floor_name: table.floor_name || 'Ground Floor',
                    status: table.status
                }
            });

        } catch (error) {
            console.error('Error verifying table token:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    },

    /**
     * Retrieves the self-ordering system configurations from settings table.
     * GET /api/self-order/config
     */
    getConfig: async (req, res) => {
        try {
            const keys = [
                'self_ordering_enabled',
                'self_ordering_mode',
                'self_ordering_bg_color',
                'self_ordering_bg_images',
                'upi_payment_qr_image'
            ];
            const [rows] = await pool.query(
                'SELECT `key`, `value` FROM settings WHERE `key` IN (?)',
                [keys]
            );

            // Also fetch the active UPI payment method for its UPI ID
            const [upiRows] = await pool.query(
                "SELECT upi_id FROM payment_methods WHERE type = 'upi' AND is_enabled = 1 LIMIT 1"
            );

            const config = {
                enabled: false,
                mode: 'online',
                bgColor: '#0f172a',
                bgImages: [],
                upiQrImage: null,
                upiId: upiRows[0]?.upi_id || null
            };

            rows.forEach(row => {
                if (row.key === 'self_ordering_enabled') {
                    config.enabled = row.value === 'true';
                } else if (row.key === 'self_ordering_mode') {
                    config.mode = row.value; // 'online' or 'qr'
                } else if (row.key === 'self_ordering_bg_color') {
                    config.bgColor = row.value;
                } else if (row.key === 'self_ordering_bg_images') {
                    try {
                        config.bgImages = JSON.parse(row.value);
                    } catch (e) {
                        config.bgImages = [];
                    }
                } else if (row.key === 'upi_payment_qr_image') {
                    config.upiQrImage = row.value || null;
                }
            });

            return res.status(200).json({
                success: true,
                data: config
            });
        } catch (error) {
            console.error('Error getting self order config:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    },

    /**
     * Updates the self-ordering configuration in settings table (Admin/Cashier protected).
     * POST /api/self-order/config
     */
    updateConfig: async (req, res) => {
        try {
            const { enabled, mode, bgColor, bgImages, upiQrImage } = req.body;

            const settings = [
                { key: 'self_ordering_enabled', value: String(enabled) },
                { key: 'self_ordering_mode', value: mode || 'online' },
                { key: 'self_ordering_bg_color', value: bgColor || '#0f172a' },
                { key: 'self_ordering_bg_images', value: JSON.stringify(bgImages || []) }
            ];

            // Only save UPI QR image if provided
            if (upiQrImage !== undefined) {
                settings.push({ key: 'upi_payment_qr_image', value: upiQrImage || '' });
            }

            for (const setting of settings) {
                await pool.query(
                    'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
                    [setting.key, setting.value, setting.value]
                );
            }

            return res.status(200).json({
                success: true,
                message: "Configurations saved successfully"
            });
        } catch (error) {
            console.error('Error updating self order config:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    },

    /**
     * Public guest ordering checkout.
     * POST /api/self-order/order
     */
    createSelfOrder: async (req, res) => {
        try {
            const { token, coupon_code, items, payment_method, status } = req.body;

            // 1. Verify Self-Ordering enabled status & mode
            const [enabledRows] = await pool.query("SELECT value FROM settings WHERE `key` = 'self_ordering_enabled'");
            const enabled = enabledRows[0]?.value === 'true';
            if (!enabled) {
                return res.status(400).json({
                    success: false,
                    error: "Self-Ordering is currently disabled by admin."
                });
            }

            const [modeRows] = await pool.query("SELECT value FROM settings WHERE `key` = 'self_ordering_mode'");
            const mode = modeRows[0]?.value || 'online';
            if (mode !== 'online') {
                return res.status(400).json({
                    success: false,
                    error: "Self-Ordering checkout is disabled (Digital Menu Mode only)."
                });
            }

            // 2. Validate table token
            if (!token) {
                return res.status(400).json({
                    success: false,
                    error: "Table QR token is required."
                });
            }
            const [tableRows] = await pool.query(
                'SELECT id, table_number FROM tables WHERE qr_token = ? AND is_active = TRUE',
                [token]
            );
            if (tableRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Invalid table token."
                });
            }
            const table = tableRows[0];

            // 3. Populate req.body parameters for delegate execution to createOrder
            req.body.table_id = table.id;
            req.body.coupon_code = coupon_code || null;
            req.body.items = items;
            // Forward payment info so order is marked paid immediately
            req.body.payment_method = payment_method || 'cash';
            req.body.status = status || 'paid';
            // Clear req.user since self-ordering is a public guest customer checkout
            req.user = undefined; 

            // 4. Import and execute order creation inside orderController
            const { createOrder } = require('./orderController');
            return createOrder(req, res);

        } catch (error) {
            console.error('Error creating self order:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    },

    /**
     * Retrieves the current tracking status and item lines of a self-ordered item.
     * GET /api/self-order/order/:orderId
     */
    getSelfOrderStatus: async (req, res) => {
        try {
            const { orderId } = req.params;
            const id = parseInt(orderId, 10);
            if (isNaN(id)) {
                return res.status(400).json({
                    success: false,
                    error: "Invalid order ID format."
                });
            }

            // Get order header details
            const [orderRows] = await pool.query(
                `SELECT o.id, o.order_number, o.status, o.kds_status, o.total_amount, t.table_number 
                 FROM orders o 
                 LEFT JOIN tables t ON o.table_id = t.id 
                 WHERE o.id = ?`,
                [id]
            );

            if (orderRows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Order not found."
                });
            }

            const order = orderRows[0];

            // Get order items
            const [itemRows] = await pool.query(
                `SELECT oi.id, oi.product_id, p.name AS product_name, oi.quantity, oi.price, oi.subtotal, oi.kds_status
                 FROM order_items oi
                 LEFT JOIN products p ON oi.product_id = p.id
                 WHERE oi.order_id = ?`,
                [id]
            );

            return res.status(200).json({
                success: true,
                data: {
                    id: order.id,
                    order_number: order.order_number,
                    status: order.status,
                    kds_status: order.kds_status,
                    total_amount: order.total_amount,
                    table_number: order.table_number,
                    items: itemRows
                }
            });

        } catch (error) {
            console.error('Error fetching self order status:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    }
};

module.exports = selfOrderController;
