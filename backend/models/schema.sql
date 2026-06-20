-- Odoo Cafe POS - Database Schema
-- MySQL (mysql2/promise compatible)

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Users Table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'employee', 'customer') DEFAULT 'employee',
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Categories Table
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3498db',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Products Table
DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category_id INT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    uom VARCHAR(20) DEFAULT 'unit', -- Unit of Measure
    tax DECIMAL(5, 2) DEFAULT 0.00, -- Tax percentage
    tax_percent DECIMAL(5, 2) GENERATED ALWAYS AS (tax) STORED, -- Alias for orderController
    description TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN GENERATED ALWAYS AS (is_available) STORED, -- Alias for orderController
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 4. Floors Table
DROP TABLE IF EXISTS floors;
CREATE TABLE floors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 5. Tables Table
DROP TABLE IF EXISTS tables;
CREATE TABLE tables (
    id INT AUTO_INCREMENT PRIMARY KEY,
    floor_id INT,
    table_number VARCHAR(10) NOT NULL,
    seats INT DEFAULT 2,
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('available', 'occupied', 'reserved') DEFAULT 'available',
    qr_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (floor_id) REFERENCES floors(id) ON DELETE CASCADE,
    UNIQUE KEY unique_table_per_floor (floor_id, table_number)
) ENGINE=InnoDB;

-- 6. Promotions Table (Three-tier promotion engine)
DROP TABLE IF EXISTS promotions;
CREATE TABLE promotions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('coupon', 'automated_product', 'automated_order') NOT NULL,
    discount_type ENUM('percentage', 'fixed_amount') NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    coupon_code VARCHAR(50) DEFAULT NULL UNIQUE,
    product_id INT DEFAULT NULL,
    min_quantity INT DEFAULT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. Sessions Table (for Shift Management)
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP NULL,
    status ENUM('open', 'closed') DEFAULT 'open',
    opening_balance DECIMAL(10,2) DEFAULT 0.00,
    closing_balance DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 8. Customers Table
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. Payment Methods Table
DROP TABLE IF EXISTS payment_methods;
CREATE TABLE payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    type ENUM('cash', 'card', 'upi') NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    upi_id VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 10. Orders Table
DROP TABLE IF EXISTS orders;
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(20) DEFAULT NULL,
    session_id INT,
    table_id INT,
    customer_id INT DEFAULT NULL,
    subtotal DECIMAL(10, 2) DEFAULT 0.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    tax_amount DECIMAL(10, 2) DEFAULT 0.00,
    total_amount DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('draft', 'pending', 'paid', 'cancelled') DEFAULT 'draft',
    kds_status ENUM('To Cook', 'Preparing', 'Completed') DEFAULT 'To Cook',
    payment_method VARCHAR(50) DEFAULT NULL,
    payment_ref VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE SET NULL,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. Order Items Table
DROP TABLE IF EXISTS order_items;
CREATE TABLE order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,              -- Unit price at time of order
    discount_amount DECIMAL(10, 2) DEFAULT 0.00, -- Per-line discount applied
    subtotal DECIMAL(10, 2) NOT NULL,            -- (price * qty) - discount
    kds_status ENUM('pending', 'preparing', 'completed') DEFAULT 'pending',
    is_item_completed TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

