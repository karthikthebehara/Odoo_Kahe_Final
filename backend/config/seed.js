const { pool } = require('./db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

/**
 * Initialize the database by running the schema.sql script
 * and seeding baseline data.
 */
const initDB = async () => {
    try {
        // Ensure settings table exists (required for self-ordering)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS settings (
                \`key\` VARCHAR(100) PRIMARY KEY,
                \`value\` LONGTEXT NOT NULL
            ) ENGINE=InnoDB;
        `);

        // Seed settings if empty
        const [settingsRows] = await pool.query("SELECT COUNT(*) AS count FROM settings");
        if (settingsRows[0].count === 0) {
            await pool.query("INSERT INTO settings (\`key\`, \`value\`) VALUES ('self_ordering_enabled', 'false')");
            await pool.query("INSERT INTO settings (\`key\`, \`value\`) VALUES ('self_ordering_mode', 'online')");
            await pool.query("INSERT INTO settings (\`key\`, \`value\`) VALUES ('self_ordering_bg_color', '#0f172a')");
            await pool.query("INSERT INTO settings (\`key\`, \`value\`) VALUES ('self_ordering_bg_images', '[]')");
            console.log('✅ Default settings seeded.');
        }

        // Check if database is already initialized by checking for users table
        const [tables] = await pool.query("SHOW TABLES LIKE 'users'");
        if (tables.length > 0) {
            console.log('ℹ️  Database already initialized. Skipping schema/seed.');
            return;
        }

        console.log('🔄 Initializing database structure...');
        
        // 1. Read and execute schema.sql
        const schemaPath = path.join(__dirname, '../models/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by ';' but be careful with formatted SQL. 
        const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (let statement of statements) {
            await pool.query(statement);
        }
        console.log('✅ Database schema applied.');

        // 2. Seed Users
        const adminPassword = await bcrypt.hash('admin123', 10);
        const employeePassword = await bcrypt.hash('emp123', 10);
        const customerPassword = await bcrypt.hash('cust123', 10);

        await pool.query(`
            INSERT INTO users (name, email, password, role)
            SELECT * FROM (SELECT 'Admin User' AS n, 'admin@odoocafe.com' AS e, ? AS p, 'admin' AS r) AS tmp
            WHERE NOT EXISTS (SELECT email FROM users WHERE email = 'admin@odoocafe.com') LIMIT 1;
        `, [adminPassword]);

        await pool.query(`
            INSERT INTO users (name, email, password, role)
            SELECT * FROM (SELECT 'Employee One' AS n, 'employee@odoocafe.com' AS e, ? AS p, 'employee' AS r) AS tmp
            WHERE NOT EXISTS (SELECT email FROM users WHERE email = 'employee@odoocafe.com') LIMIT 1;
        `, [employeePassword]);

        await pool.query(`
            INSERT INTO users (name, email, password, role)
            SELECT * FROM (SELECT 'Demo Customer' AS n, 'customer@odoocafe.com' AS e, ? AS p, 'customer' AS r) AS tmp
            WHERE NOT EXISTS (SELECT email FROM users WHERE email = 'customer@odoocafe.com') LIMIT 1;
        `, [customerPassword]);

        // 3. Seed Categories
        const categories = [
            ['Beverages', '#3498db'],
            ['Bakery', '#e67e22'],
            ['Desserts', '#9b59b6']
        ];

        for (const [name, color] of categories) {
            await pool.query(`
                INSERT INTO categories (name, color)
                SELECT * FROM (SELECT ? AS n, ? AS c) AS tmp
                WHERE NOT EXISTS (SELECT name FROM categories WHERE name = ?) LIMIT 1;
            `, [name, color, name]);
        }

        // 4. Seed Products
        // Get category IDs first
        const [categoryRows] = await pool.query('SELECT id, name FROM categories');
        const categoryMap = {};
        categoryRows.forEach(row => categoryMap[row.name] = row.id);

        const products = [
            ['Cappuccino', categoryMap['Beverages'], 4.50, 'unit', 5.00, 'Classic espresso with steamed milk foam'],
            ['Iced Latte', categoryMap['Beverages'], 5.00, 'unit', 5.00, 'Chilled espresso with fresh milk over ice'],
            ['Butter Croissant', categoryMap['Bakery'], 3.50, 'unit', 2.00, 'Flaky, buttery French pastry'],
            ['Chocolate Muffin', categoryMap['Bakery'], 4.00, 'unit', 2.00, 'Rich chocolate muffin with chips'],
            ['Cheese Cake', categoryMap['Desserts'], 6.50, 'slice', 8.00, 'Creamy New York style cheesecake']
        ];

        for (const [name, catId, price, uom, tax, desc] of products) {
            await pool.query(`
                INSERT INTO products (name, category_id, price, uom, tax, description)
                SELECT * FROM (SELECT ? AS n, ? AS c, ? AS p, ? AS u, ? AS t, ? AS d) AS tmp
                WHERE NOT EXISTS (SELECT name FROM products WHERE name = ?) LIMIT 1;
            `, [name, catId, price, uom, tax, desc, name]);
        }

        // 5. Seed Floors
        const floors = ['Ground Floor', 'Rooftop'];
        for (const floorName of floors) {
            await pool.query(`
                INSERT INTO floors (name)
                SELECT * FROM (SELECT ? AS n) AS tmp
                WHERE NOT EXISTS (SELECT name FROM floors WHERE name = ?) LIMIT 1;
            `, [floorName, floorName]);
        }

        // 6. Seed Tables
        const [floorRows] = await pool.query('SELECT id, name FROM floors');
        for (const floor of floorRows) {
            for (let i = 1; i <= 3; i++) {
                const tableNum = `${floor.name.charAt(0)}${i}`;
                const qrToken = `token-${floor.name.replace(/\s+/g, '-').toLowerCase()}-${tableNum.toLowerCase()}`;
                await pool.query(`
                    INSERT INTO tables (floor_id, table_number, seats, qr_token)
                    SELECT * FROM (SELECT ? AS f, ? AS t, ? AS s, ? AS q) AS tmp
                    WHERE NOT EXISTS (SELECT id FROM tables WHERE floor_id = ? AND table_number = ?) LIMIT 1;
                `, [floor.id, tableNum, i * 2, qrToken, floor.id, tableNum]);
            }
        }

        // 7. Seed Promotions (Three-tier engine demo data)
        // Fetch product IDs for product-level promos
        const [productRows] = await pool.query('SELECT id, name FROM products');
        const productMap2 = {};
        productRows.forEach(row => productMap2[row.name] = row.id);

        const promotions = [
            // ── Manual Coupon ──────────────────────────────────────────────
            // 10% off the whole order when customer presents code WELCOME10
            {
                name: 'Welcome 10% Off',
                type: 'coupon',
                discount_type: 'percentage',
                value: 10.00,
                coupon_code: 'WELCOME10',
                product_id: null,
                min_quantity: null,
                min_order_amount: null,
            },
            // Flat ₹50 off with code FLAT50
            {
                name: 'Flat 50 Off',
                type: 'coupon',
                discount_type: 'fixed_amount',
                value: 50.00,
                coupon_code: 'FLAT50',
                product_id: null,
                min_quantity: null,
                min_order_amount: null,
            },

            // ── Automated Product Promo ────────────────────────────────────
            // Buy 3+ Cappuccinos → 15% off that line
            {
                name: 'Cappuccino Bulk Deal',
                type: 'automated_product',
                discount_type: 'percentage',
                value: 15.00,
                coupon_code: null,
                product_id: productMap2['Cappuccino'],
                min_quantity: 3,
                min_order_amount: null,
            },
            // Buy 2+ Cheese Cakes → ₹2 flat off that line
            {
                name: 'Cheesecake Pair Deal',
                type: 'automated_product',
                discount_type: 'fixed_amount',
                value: 2.00,
                coupon_code: null,
                product_id: productMap2['Cheese Cake'],
                min_quantity: 2,
                min_order_amount: null,
            },

            // ── Automated Order Promo ──────────────────────────────────────
            // Cart ≥ ₹25 → 5% off the whole order
            {
                name: 'Spend 25 Save 5%',
                type: 'automated_order',
                discount_type: 'percentage',
                value: 5.00,
                coupon_code: null,
                product_id: null,
                min_quantity: null,
                min_order_amount: 25.00,
            },
        ];

        for (const promo of promotions) {
            await pool.query(`
                INSERT INTO promotions
                    (name, type, discount_type, value, coupon_code, product_id, min_quantity, min_order_amount)
                SELECT ?, ?, ?, ?, ?, ?, ?, ?
                FROM DUAL
                WHERE NOT EXISTS (SELECT id FROM promotions WHERE name = ?)
                LIMIT 1;
            `, [
                promo.name, promo.type, promo.discount_type, promo.value,
                promo.coupon_code, promo.product_id, promo.min_quantity,
                promo.min_order_amount, promo.name,
            ]);
        }

        // 8. Seed Payment Methods
        const paymentMethods = [
            { name: 'Cash', type: 'cash', is_enabled: true, upi_id: null },
            { name: 'Credit/Debit Card', type: 'card', is_enabled: true, upi_id: null },
            { name: 'UPI QR Code', type: 'upi', is_enabled: true, upi_id: 'cafe@upi' }
        ];
        for (const pm of paymentMethods) {
            await pool.query(`
                INSERT INTO payment_methods (name, type, is_enabled, upi_id)
                SELECT * FROM (SELECT ? AS n, ? AS t, ? AS e, ? AS u) AS tmp
                WHERE NOT EXISTS (SELECT name FROM payment_methods WHERE name = ?) LIMIT 1;
            `, [pm.name, pm.type, pm.is_enabled, pm.upi_id, pm.name]);
        }

        // 9. Seed Customers
        const customersSeed = [
            { name: 'Walk-in Customer', email: 'walkin@odoocafe.com', phone: '0000000000' },
            { name: 'John Doe', email: 'john@example.com', phone: '1234567890' },
            { name: 'Jane Smith', email: 'jane@example.com', phone: '9876543210' },
            { name: 'Demo Customer', email: 'customer@odoocafe.com', phone: '1234567890' }
        ];
        for (const cust of customersSeed) {
            await pool.query(`
                INSERT INTO customers (name, email, phone)
                SELECT * FROM (SELECT ? AS n, ? AS e, ? AS p) AS tmp
                WHERE NOT EXISTS (SELECT email FROM customers WHERE email = ?) LIMIT 1;
            `, [cust.name, cust.email, cust.phone, cust.email]);
        }

        console.log('✅ Database seeding completed successfully.');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};

if (require.main === module) {
    initDB().then(() => {
        process.exit(0);
    }).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { initDB };
