const { pool } = require('./config/db');

async function checkDB() {
    try {
        await pool.query("ALTER TABLE orders ADD COLUMN kds_status ENUM('To Cook', 'Preparing', 'Completed') DEFAULT 'To Cook';");
        console.log('Added kds_status to orders');
    } catch (e) {
        console.log('orders.kds_status:', e.message);
    }
    process.exit(0);
}

checkDB();
