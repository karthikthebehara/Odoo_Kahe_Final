const { pool } = require('./config/db');

async function fixDB() {
    try {
        await pool.query("ALTER TABLE order_items ADD COLUMN kds_status ENUM('pending', 'preparing', 'completed') DEFAULT 'pending';");
        console.log('Added kds_status to order_items');
    } catch (e) {
        console.log(e.message);
    }

    try {
        await pool.query("ALTER TABLE order_items ADD COLUMN is_item_completed TINYINT(1) DEFAULT 0;");
        console.log('Added is_item_completed to order_items');
    } catch (e) {
        console.log(e.message);
    }

    process.exit(0);
}

fixDB();
