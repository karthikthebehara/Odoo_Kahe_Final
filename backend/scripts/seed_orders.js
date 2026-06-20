const { pool } = require('../config/db');

/**
 * Script to seed sample orders and transactions for reporting dashboard testing.
 */
async function seedSampleOrders() {
    try {
        console.log('🧪 Seeding sample transaction data...');

        // 1. Get existing data
        const [users] = await pool.query('SELECT id FROM users LIMIT 2');
        const [products] = await pool.query('SELECT id, price FROM products');
        const [tables] = await pool.query('SELECT id FROM tables');

        if (users.length === 0 || products.length === 0 || tables.length === 0) {
            console.error('❌ Missing prerequisite data (users, products, or tables). Run seed.js first.');
            return;
        }

        const adminId = users[0].id;

        // 2. Clear existing orders/sessions if any (optional for clean demo)
        // await pool.query('SET FOREIGN_KEY_CHECKS = 0; TRUNCATE order_items; TRUNCATE orders; TRUNCATE sessions; SET FOREIGN_KEY_CHECKS = 1;');

        // 3. Create Sample Sessions
        const sessionCount = 3;
        for (let i = 0; i < sessionCount; i++) {
            const [sessionResult] = await pool.query(
                "INSERT INTO sessions (user_id, status) VALUES (?, 'open')",
                [adminId]
            );
            const sessionId = sessionResult.insertId;

            // 4. Create 5-10 Orders per session
            const orderCount = 8;
            for (let j = 0; j < orderCount; j++) {
                const table = tables[Math.floor(Math.random() * tables.length)];
                
                // Random date in the last 7 days
                const dateOffset = Math.floor(Math.random() * 7);
                const hourOffset = Math.floor(Math.random() * 24);
                const orderDate = new Date();
                orderDate.setDate(orderDate.getDate() - dateOffset);
                orderDate.setHours(hourOffset, 0, 0, 0);
                const formattedDate = orderDate.toISOString().slice(0, 19).replace('T', ' ');

                const [orderResult] = await pool.query(
                    "INSERT INTO orders (session_id, table_id, status, created_at) VALUES (?, ?, 'paid', ?)",
                    [sessionId, table.id, formattedDate]
                );
                const orderId = orderResult.insertId;

                // 5. Add 2-4 items per order
                let totalAmount = 0;
                const itemCount = Math.floor(Math.random() * 3) + 2;
                for (let k = 0; k < itemCount; k++) {
                    const product = products[Math.floor(Math.random() * products.length)];
                    const qty = Math.floor(Math.random() * 2) + 1;
                    const subtotal = product.price * qty;
                    totalAmount += subtotal;

                    await pool.query(
                        "INSERT INTO order_items (order_id, product_id, quantity, price, subtotal, created_at) VALUES (?, ?, ?, ?, ?, ?)",
                        [orderId, product.id, qty, product.price, subtotal, formattedDate]
                    );
                }

                // Update order total
                await pool.query("UPDATE orders SET total_amount = ? WHERE id = ?", [totalAmount, orderId]);
            }
        }

        console.log('✅ Sample transaction data seeded successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error seeding sample orders:', error);
        process.exit(1);
    }
}

seedSampleOrders();
