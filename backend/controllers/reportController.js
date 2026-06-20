const { pool } = require('../config/db');

/**
 * Controller for Administrative Reporting Dashboard.
 */
const reportController = {
    /**
     * Fetch aggregated dashboard metrics and datasets based on filters.
     * GET /api/reports/dashboard
     */
    getDashboardMetrics: async (req, res) => {
        try {
            const { period, startDate, endDate, user_id, session_id, product_id } = req.query;

            // 1. Build Base Where Clause for Filtering
            let whereClauses = ['1=1'];
            let params = [];

            // Period Filter
            if (period === 'today') {
                whereClauses.push('DATE(o.created_at) = CURDATE()');
            } else if (period === 'this_week') {
                whereClauses.push('YEARWEEK(o.created_at, 1) = YEARWEEK(CURDATE(), 1)');
            } else if (period === 'this_month') {
                whereClauses.push('MONTH(o.created_at) = MONTH(CURDATE()) AND YEAR(o.created_at) = YEAR(CURDATE())');
            } else if (period === 'custom' && startDate && endDate) {
                whereClauses.push('o.created_at BETWEEN ? AND ?');
                params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
            }

            // Other Filters
            if (user_id) {
                whereClauses.push('s.user_id = ?');
                params.push(user_id);
            }
            if (session_id) {
                whereClauses.push('o.session_id = ?');
                params.push(session_id);
            }
            if (product_id) {
                // For product specific metrics, we join with order_items
                whereClauses.push('EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.product_id = ?)');
                params.push(product_id);
            }

            const whereSql = whereClauses.join(' AND ');

            // 2. Query Summary Metrics
            const summaryQuery = `
                SELECT 
                    COUNT(o.id) AS total_orders,
                    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
                    COALESCE(AVG(o.total_amount), 0) AS average_order_value
                FROM orders o
                LEFT JOIN sessions s ON o.session_id = s.id
                WHERE ${whereSql} AND o.status = 'paid'
            `;
            const [[summary]] = await pool.query(summaryQuery, params);

            // 3. Query Sales Trend (By Day for longer periods, By Hour for today)
            let trendFormat = '%Y-%m-%d';
            if (period === 'today') trendFormat = '%H:00';
            
            const trendQuery = `
                SELECT 
                    DATE_FORMAT(o.created_at, '${trendFormat}') AS segment,
                    COALESCE(SUM(o.total_amount), 0) AS revenue,
                    COUNT(o.id) AS count
                FROM orders o
                LEFT JOIN sessions s ON o.session_id = s.id
                WHERE ${whereSql} AND o.status = 'paid'
                GROUP BY segment
                ORDER BY segment ASC
            `;
            const [salesTrend] = await pool.query(trendQuery, params);

            // 4. Query Top Categories
            const categoriesQuery = `
                SELECT 
                    c.name AS category_name,
                    COUNT(oi.id) AS total_items,
                    COALESCE(SUM(oi.subtotal), 0) AS revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                JOIN categories c ON p.category_id = c.id
                LEFT JOIN sessions s ON o.session_id = s.id
                WHERE ${whereSql} AND o.status = 'paid'
                GROUP BY c.id
                ORDER BY revenue DESC
            `;
            const [topCategories] = await pool.query(categoriesQuery, params);

            // 5. Query Top Products
            const productsQuery = `
                SELECT 
                    p.name AS product_name,
                    SUM(oi.quantity) AS total_quantity,
                    COALESCE(SUM(oi.subtotal), 0) AS revenue
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                JOIN products p ON oi.product_id = p.id
                LEFT JOIN sessions s ON o.session_id = s.id
                WHERE ${whereSql} AND o.status = 'paid'
                GROUP BY p.id
                ORDER BY revenue DESC
                LIMIT 10
            `;
            const [topProducts] = await pool.query(productsQuery, params);

            // Response
            return res.status(200).json({
                success: true,
                data: {
                    summary: {
                        total_orders: summary.total_orders,
                        total_revenue: parseFloat(summary.total_revenue).toFixed(2),
                        average_order_value: parseFloat(summary.average_order_value).toFixed(2)
                    },
                    charts: {
                        sales_trend: salesTrend,
                        top_categories: topCategories,
                        top_products: topProducts
                    }
                }
            });

        } catch (error) {
            console.error('Report Dashboard Error:', error);
            return res.status(500).json({
                success: false,
                error: "Failed to generate dashboard metrics"
            });
        }
    }
};

module.exports = reportController;
