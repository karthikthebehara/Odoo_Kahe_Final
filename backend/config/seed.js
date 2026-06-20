/**
 * backend/config/seed.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds the Odoo Cafe POS database with:
 *   • Default admin user
 *   • Product categories  (with distinct colors)
 *   • Products            (across all categories)
 *   • Payment methods     (cash, card, UPI)
 *   • Floors & Tables
 *   • Sample coupons
 *   • Sample promotions
 *   • Self-ordering config (disabled by default)
 *   • Customer-facing display seed row
 *
 * Usage:
 *   node backend/config/seed.js          (from project root)
 *   node config/seed.js                  (from backend/ directory)
 *
 * The script is idempotent — running it twice won't create duplicates.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// ─── DB config (same as pool, but single connection for seed) ────────────────
const dbConfig = {
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'odoo_cafe_pos',
  multipleStatements: true,
};

// ─── Helpers ────────────────────────────────────────────────────────────────
const log  = (msg) => console.log(`  ✅ ${msg}`);
const warn = (msg) => console.warn(`  ⚠️  ${msg}`);
const hr   = ()    => console.log('─'.repeat(60));

/**
 * Upsert helper: INSERT IGNORE to avoid duplicates on re-run.
 * Returns the insert ID (or 0 if the row already existed).
 */
async function insertIgnore(conn, table, data) {
  const cols = Object.keys(data).join(', ');
  const placeholders = Object.keys(data).map(() => '?').join(', ');
  const values = Object.values(data);
  const [result] = await conn.execute(
    `INSERT IGNORE INTO ${table} (${cols}) VALUES (${placeholders})`,
    values
  );
  return result.insertId;
}

// ─── Seed data ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Coffee & Hot Drinks', color: '#a05c34' },
  { name: 'Cold Beverages',      color: '#3b82f6' },
  { name: 'Snacks & Starters',   color: '#f59e0b' },
  { name: 'Main Course',         color: '#ef4444' },
  { name: 'Desserts',            color: '#ec4899' },
  { name: 'Breads & Bakery',     color: '#84cc16' },
];

// products[category_name] = [...product records]
const PRODUCTS_BY_CATEGORY = {
  'Coffee & Hot Drinks': [
    { name: 'Espresso',        price: 80,  unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Rich double-shot espresso.' },
    { name: 'Cappuccino',      price: 120, unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Espresso with steamed milk foam.' },
    { name: 'Latte',           price: 130, unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Smooth espresso with warm milk.' },
    { name: 'Masala Chai',     price: 60,  unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Spiced Indian tea.' },
    { name: 'Hot Chocolate',   price: 110, unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Rich creamy hot chocolate.' },
  ],
  'Cold Beverages': [
    { name: 'Cold Coffee',     price: 140, unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Chilled blended coffee with ice cream.' },
    { name: 'Mango Smoothie',  price: 120, unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Fresh mango blended smoothie.' },
    { name: 'Fresh Lime Soda', price: 80,  unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Refreshing lime soda.' },
    { name: 'Iced Tea',        price: 90,  unit_of_measure: 'cup',   tax_percent: 5.00, description: 'Lemon-infused chilled tea.' },
  ],
  'Snacks & Starters': [
    { name: 'Veg Sandwich',    price: 100, unit_of_measure: 'piece', tax_percent: 5.00, description: 'Grilled vegetable sandwich.' },
    { name: 'Paneer Tikka',    price: 180, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Tandoor-style spiced paneer.' },
    { name: 'French Fries',    price: 90,  unit_of_measure: 'plate', tax_percent: 5.00, description: 'Crispy salted fries.' },
    { name: 'Spring Rolls',    price: 120, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Crispy vegetable spring rolls (4 pcs).' },
    { name: 'Bruschetta',      price: 130, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Toasted bread with tomato & basil.' },
  ],
  'Main Course': [
    { name: 'Dal Makhani',     price: 200, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Slow-cooked black lentils in rich gravy.' },
    { name: 'Paneer Butter Masala', price: 220, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Paneer in buttery tomato sauce.' },
    { name: 'Veg Biryani',     price: 180, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Fragrant basmati rice with vegetables.' },
    { name: 'Pasta Arrabbiata', price: 200, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Penne in spicy tomato sauce.' },
    { name: 'Mushroom Risotto', price: 240, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Creamy Italian risotto with mushrooms.' },
  ],
  'Desserts': [
    { name: 'Chocolate Brownie', price: 110, unit_of_measure: 'piece', tax_percent: 5.00, description: 'Warm fudgy brownie with vanilla ice cream.' },
    { name: 'Gulab Jamun',      price: 80,  unit_of_measure: 'plate', tax_percent: 5.00, description: 'Soft milk-solid dumplings in sugar syrup.' },
    { name: 'Cheesecake',       price: 150, unit_of_measure: 'piece', tax_percent: 5.00, description: 'New York style baked cheesecake.' },
    { name: 'Ice Cream Scoop',  price: 70,  unit_of_measure: 'piece', tax_percent: 5.00, description: 'Choice of vanilla, chocolate, or strawberry.' },
  ],
  'Breads & Bakery': [
    { name: 'Butter Croissant', price: 80,  unit_of_measure: 'piece', tax_percent: 5.00, description: 'Flaky, buttery French croissant.' },
    { name: 'Garlic Bread',     price: 90,  unit_of_measure: 'plate', tax_percent: 5.00, description: 'Toasted garlic butter bread (4 slices).' },
    { name: 'Banana Muffin',    price: 70,  unit_of_measure: 'piece', tax_percent: 5.00, description: 'Moist banana walnut muffin.' },
    { name: 'Whole Wheat Toast', price: 60, unit_of_measure: 'plate', tax_percent: 5.00, description: 'Toasted whole wheat with jam & butter.' },
  ],
};

const PAYMENT_METHODS = [
  { method: 'cash',  is_enabled: 1, upi_id: null },
  { method: 'card',  is_enabled: 1, upi_id: null },
  { method: 'upi',   is_enabled: 1, upi_id: 'cafe@ybl' },
];

const FLOORS = [
  { name: 'Ground Floor', sort_order: 1 },
  { name: 'First Floor',  sort_order: 2 },
  { name: 'Terrace',      sort_order: 3 },
];

// tables_per_floor[floor_name] = [{ table_number, seats }, ...]
const TABLES_PER_FLOOR = {
  'Ground Floor': [
    { table_number: 'T1', seats: 2 },
    { table_number: 'T2', seats: 4 },
    { table_number: 'T3', seats: 4 },
    { table_number: 'T4', seats: 6 },
    { table_number: 'T5', seats: 2 },
  ],
  'First Floor': [
    { table_number: 'T6',  seats: 4 },
    { table_number: 'T7',  seats: 4 },
    { table_number: 'T8',  seats: 6 },
    { table_number: 'T9',  seats: 8 },
    { table_number: 'T10', seats: 2 },
  ],
  'Terrace': [
    { table_number: 'T11', seats: 4 },
    { table_number: 'T12', seats: 4 },
    { table_number: 'T13', seats: 6 },
  ],
};

const COUPONS = [
  { code: 'WELCOME10', discount_type: 'percent', discount_value: 10.00, min_order_amount: 0,   usage_limit: null },
  { code: 'FLAT50',    discount_type: 'fixed',   discount_value: 50.00, min_order_amount: 200, usage_limit: null },
  { code: 'SAVE20',    discount_type: 'percent', discount_value: 20.00, min_order_amount: 300, usage_limit: 100 },
];

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);
    console.log('\n🌱 Odoo Cafe POS — Database Seeder');
    hr();

    // ── 1. Admin user ──────────────────────────────────────────────────────
    console.log('\n📌 Seeding Users...');
    const adminHash = await bcrypt.hash('admin123', 12);
    const cashierHash = await bcrypt.hash('cashier123', 12);

    await insertIgnore(conn, 'users', {
      name: 'Admin User', email: 'admin@cafe.com',
      password_hash: adminHash, role: 'admin',
    });
    log('Admin user: admin@cafe.com / admin123');

    await insertIgnore(conn, 'users', {
      name: 'John Cashier', email: 'john@cafe.com',
      password_hash: cashierHash, role: 'cashier',
    });
    log('Cashier user: john@cafe.com / cashier123');

    // ── 2. Categories ──────────────────────────────────────────────────────
    console.log('\n📌 Seeding Categories...');
    const categoryMap = {}; // name → id
    for (const cat of CATEGORIES) {
      const id = await insertIgnore(conn, 'categories', cat);
      if (id > 0) {
        categoryMap[cat.name] = id;
        log(`Category "${cat.name}" (${cat.color})`);
      } else {
        // Already exists — fetch the id
        const [[row]] = await conn.execute(
          'SELECT id FROM categories WHERE name = ?', [cat.name]
        );
        categoryMap[cat.name] = row.id;
        warn(`Category "${cat.name}" already exists (id=${row.id})`);
      }
    }

    // ── 3. Products ────────────────────────────────────────────────────────
    console.log('\n📌 Seeding Products...');
    for (const [catName, products] of Object.entries(PRODUCTS_BY_CATEGORY)) {
      const catId = categoryMap[catName];
      if (!catId) { warn(`Unknown category: ${catName}`); continue; }
      for (const p of products) {
        const id = await insertIgnore(conn, 'products', {
          category_id: catId,
          name: p.name,
          description: p.description,
          price: p.price,
          unit_of_measure: p.unit_of_measure,
          tax_percent: p.tax_percent,
          show_in_kds: 1,
        });
        if (id > 0) log(`Product "${p.name}" — ₹${p.price}`);
        else warn(`Product "${p.name}" already exists`);
      }
    }

    // ── 4. Payment Methods ─────────────────────────────────────────────────
    console.log('\n📌 Seeding Payment Methods...');
    for (const pm of PAYMENT_METHODS) {
      const id = await insertIgnore(conn, 'payment_methods', pm);
      if (id > 0) log(`Payment method: ${pm.method}${pm.upi_id ? ` (${pm.upi_id})` : ''}`);
      else warn(`Payment method "${pm.method}" already exists`);
    }

    // ── 5. Floors & Tables ─────────────────────────────────────────────────
    console.log('\n📌 Seeding Floors & Tables...');
    for (const floor of FLOORS) {
      const floorId = await insertIgnore(conn, 'floors', floor);
      let resolvedFloorId = floorId;

      if (floorId === 0) {
        warn(`Floor "${floor.name}" already exists`);
        const [[row]] = await conn.execute(
          'SELECT id FROM floors WHERE name = ?', [floor.name]
        );
        resolvedFloorId = row.id;
      } else {
        log(`Floor "${floor.name}"`);
      }

      const tables = TABLES_PER_FLOOR[floor.name] || [];
      for (const t of tables) {
        const token = crypto.randomBytes(24).toString('hex');
        const tableId = await insertIgnore(conn, 'restaurant_tables', {
          floor_id:     resolvedFloorId,
          table_number: t.table_number,
          seats:        t.seats,
          qr_token:     token,
        });
        if (tableId > 0) log(`  Table ${t.table_number} (${t.seats} seats) — token: ${token.slice(0, 8)}…`);
        else warn(`  Table ${t.table_number} already exists`);
      }
    }

    // ── 6. Coupons ─────────────────────────────────────────────────────────
    console.log('\n📌 Seeding Coupons...');
    for (const c of COUPONS) {
      const id = await insertIgnore(conn, 'coupons', c);
      if (id > 0) log(`Coupon "${c.code}" — ${c.discount_type} ${c.discount_value}`);
      else warn(`Coupon "${c.code}" already exists`);
    }

    // ── 7. Promotions ──────────────────────────────────────────────────────
    console.log('\n📌 Seeding Promotions...');

    // Order-level auto-promotion: 15% off orders above ₹500
    await insertIgnore(conn, 'promotions', {
      name:             'Happy Hour — 15% Off Orders Above ₹500',
      apply_to:         'order',
      min_order_amount: 500.00,
      discount_type:    'percent',
      discount_value:   15.00,
    });
    log('Promo: Happy Hour 15% off (order ≥ ₹500)');

    // Product-level auto-promotion: ₹30 off when ordering 3+ Cold Coffees
    const [[coldCoffeeRow]] = await conn.execute(
      'SELECT id FROM products WHERE name = ? LIMIT 1', ['Cold Coffee']
    );
    if (coldCoffeeRow) {
      await insertIgnore(conn, 'promotions', {
        name:          'Cold Coffee Deal — ₹30 Off (3+ pcs)',
        apply_to:      'product',
        product_id:    coldCoffeeRow.id,
        min_quantity:  3,
        discount_type: 'fixed',
        discount_value: 30.00,
      });
      log('Promo: Cold Coffee Deal ₹30 off (qty ≥ 3)');
    }

    // ── 8. Self-Ordering Config ────────────────────────────────────────────
    console.log('\n📌 Seeding Self-Ordering Config...');
    const [[soExisting]] = await conn.execute(
      'SELECT id FROM self_ordering_config LIMIT 1'
    );
    if (!soExisting) {
      await conn.execute(
        `INSERT INTO self_ordering_config (is_enabled, mode, bg_color) VALUES (0, 'online_ordering', '#f9f5f0')`
      );
      log('Self-ordering config row created (disabled by default)');
    } else {
      warn('Self-ordering config already exists');
    }

    // ── 9. Customer-Facing Display seed row ───────────────────────────────
    console.log('\n📌 Seeding Customer Display State...');
    const [[cdExisting]] = await conn.execute(
      'SELECT id FROM customer_display_state LIMIT 1'
    );
    if (!cdExisting) {
      await conn.execute(
        `INSERT INTO customer_display_state (view) VALUES ('idle')`
      );
      log('Customer display state row created');
    } else {
      warn('Customer display state already exists');
    }

    hr();
    console.log('\n🎉 Seed complete! You can now start the backend.\n');
    console.log('  Default Credentials:');
    console.log('    Admin:   admin@cafe.com   / admin123');
    console.log('    Cashier: john@cafe.com    / cashier123\n');

  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

seed();
