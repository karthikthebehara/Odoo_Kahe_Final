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
        console.log('🔄 Initializing database structure...');
        
        // 1. Read and execute schema.sql
        const schemaPath = path.join(__dirname, '../models/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        
        // Split by ';' but be careful with formatted SQL. 
        // For simplicity with mysql2, we can't run multiple statements in one query by default unless enabled,
        // but it's better to split them or use a connection that allows it.
        // The pool doesn't have multipleStatements: true by default.
        // Let's execute the raw SQL individually.
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

        await pool.query(`
            INSERT INTO users (name, email, password, role)
            SELECT * FROM (SELECT 'Admin User', 'admin@odoocafe.com', ?, 'admin') AS tmp
            WHERE NOT EXISTS (SELECT email FROM users WHERE email = 'admin@odoocafe.com') LIMIT 1;
        `, [adminPassword]);

        await pool.query(`
            INSERT INTO users (name, email, password, role)
            SELECT * FROM (SELECT 'Employee One', 'employee@odoocafe.com', ?, 'employee') AS tmp
            WHERE NOT EXISTS (SELECT email FROM users WHERE email = 'employee@odoocafe.com') LIMIT 1;
        `, [employeePassword]);

        // 3. Seed Categories
        const categories = [
            ['Beverages', '#3498db'],
            ['Bakery', '#e67e22'],
            ['Desserts', '#9b59b6']
        ];

        for (const [name, color] of categories) {
            await pool.query(`
                INSERT INTO categories (name, color)
                SELECT * FROM (SELECT ?, ?) AS tmp
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
                SELECT * FROM (SELECT ?, ?, ?, ?, ?, ?) AS tmp
                WHERE NOT EXISTS (SELECT name FROM products WHERE name = ?) LIMIT 1;
            `, [name, catId, price, uom, tax, desc, name]);
        }

        // 5. Seed Floors
        const floors = ['Ground Floor', 'Rooftop'];
        for (const floorName of floors) {
            await pool.query(`
                INSERT INTO floors (name)
                SELECT * FROM (SELECT ?) AS tmp
                WHERE NOT EXISTS (SELECT name FROM floors WHERE name = ?) LIMIT 1;
            `, [floorName, floorName]);
        }

        // 6. Seed Tables
        const [floorRows] = await pool.query('SELECT id, name FROM floors');
        for (const floor of floorRows) {
            for (let i = 1; i <= 3; i++) {
                const tableNum = `${floor.name.charAt(0)}${i}`;
                await pool.query(`
                    INSERT INTO tables (floor_id, table_number, seats)
                    SELECT * FROM (SELECT ?, ?, ?) AS tmp
                    WHERE NOT EXISTS (SELECT id FROM tables WHERE floor_id = ? AND table_number = ?) LIMIT 1;
                `, [floor.id, tableNum, i * 2, floor.id, tableNum]);
            }
        }

        console.log('✅ Database seeding completed successfully.');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
};

module.exports = { initDB };
