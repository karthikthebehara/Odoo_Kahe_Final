const { pool } = require('../config/db');

/**
 * Controller for Self-Ordering QR infrastructure.
 */
const selfOrderController = {
    /**
     * Verifies a table token and returns table details.
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

            // Query the database for the matching table
            const [rows] = await pool.query(
                'SELECT id AS table_id, table_number FROM tables WHERE qr_token = ? AND is_active = TRUE',
                [token]
            );

            if (rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: "Invalid token"
                });
            }

            const table = rows[0];

            // Strict output format as per team standard
            return res.status(200).json({
                success: true,
                data: {
                    table_id: table.table_id,
                    table_number: table.table_number
                }
            });

        } catch (error) {
            console.error('Error verifying table token:', error);
            return res.status(500).json({
                success: false,
                error: "Internal server error"
            });
        }
    }
};

module.exports = selfOrderController;
