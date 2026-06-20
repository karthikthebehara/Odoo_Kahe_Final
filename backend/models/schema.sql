-- =============================================================================
-- Odoo Cafe POS — Full Relational Database Schema
-- Engine: MySQL 8.0+
-- Charset: utf8mb4 (full Unicode + emoji support)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS odoo_cafe_pos
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE odoo_cafe_pos;

SET FOREIGN_KEY_CHECKS = 0;

-- =============================================================================
-- 1. USERS (Admins & Employees)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100)    NOT NULL,
  email         VARCHAR(150)    NOT NULL,
  password_hash VARCHAR(255)    NOT NULL,
  role          ENUM('admin','cashier') NOT NULL DEFAULT 'cashier',
  is_active     TINYINT(1)      NOT NULL DEFAULT 1,   -- 0 = archived
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_role (role),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 2. PRODUCT CATEGORIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)   NOT NULL,
  color      VARCHAR(20)   NOT NULL DEFAULT '#6366f1',  -- hex or CSS color
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categories_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 3. PRODUCTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS products (
  id              INT UNSIGNED      NOT NULL AUTO_INCREMENT,
  category_id     INT UNSIGNED      NOT NULL,
  name            VARCHAR(120)      NOT NULL,
  description     TEXT,
  price           DECIMAL(10,2)     NOT NULL DEFAULT 0.00,
  unit_of_measure ENUM('piece','kg','litre','gram','ml','dozen','plate','cup')
                                    NOT NULL DEFAULT 'piece',
  tax_percent     DECIMAL(5,2)      NOT NULL DEFAULT 0.00,  -- e.g. 5.00 = 5%
  is_active       TINYINT(1)        NOT NULL DEFAULT 1,
  show_in_kds     TINYINT(1)        NOT NULL DEFAULT 1,     -- appears on Kitchen Display
  image_url       VARCHAR(500),
  created_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_active (is_active),
  CONSTRAINT fk_products_category
    FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 4. PAYMENT METHODS
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  method     ENUM('cash','card','upi') NOT NULL,
  is_enabled TINYINT(1)    NOT NULL DEFAULT 1,
  upi_id     VARCHAR(100),           -- only used when method = 'upi'
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_payment_methods_method (method)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 5. FLOORS
-- =============================================================================
CREATE TABLE IF NOT EXISTS floors (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name       VARCHAR(80)   NOT NULL,
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order SMALLINT      NOT NULL DEFAULT 0,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_floors_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 6. TABLES (Restaurant Tables)
-- =============================================================================
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  floor_id     INT UNSIGNED  NOT NULL,
  table_number VARCHAR(20)   NOT NULL,
  seats        TINYINT UNSIGNED NOT NULL DEFAULT 4,
  is_active    TINYINT(1)    NOT NULL DEFAULT 1,
  qr_token     VARCHAR(64)   UNIQUE,      -- unique token for self-ordering QR
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_table_floor (floor_id, table_number),
  INDEX idx_tables_floor (floor_id),
  CONSTRAINT fk_tables_floor
    FOREIGN KEY (floor_id) REFERENCES floors (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 7. CUSTOMERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name       VARCHAR(100)  NOT NULL,
  email      VARCHAR(150),
  phone      VARCHAR(20),
  is_active  TINYINT(1)    NOT NULL DEFAULT 1,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_customers_email (email),
  INDEX idx_customers_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 8. COUPONS (Manual Code Entry)
-- =============================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  code            VARCHAR(50)   NOT NULL,
  discount_type   ENUM('percent','fixed') NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  min_order_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,  -- optional min order
  is_active       TINYINT(1)    NOT NULL DEFAULT 1,
  usage_limit     INT UNSIGNED,          -- NULL = unlimited
  used_count      INT UNSIGNED  NOT NULL DEFAULT 0,
  expires_at      DATETIME,              -- NULL = never expires
  created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_coupons_code (code),
  INDEX idx_coupons_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 9. PROMOTIONS (Automated — no code required)
-- =============================================================================
CREATE TABLE IF NOT EXISTS promotions (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  name            VARCHAR(100)  NOT NULL,
  apply_to        ENUM('product','order') NOT NULL,
  product_id      INT UNSIGNED,            -- NULL if apply_to = 'order'
  min_quantity    INT UNSIGNED,            -- used when apply_to = 'product'
  min_order_amount DECIMAL(10,2),          -- used when apply_to = 'order'
  discount_type   ENUM('percent','fixed')  NOT NULL,
  discount_value  DECIMAL(10,2)            NOT NULL DEFAULT 0.00,
  is_active       TINYINT(1)               NOT NULL DEFAULT 1,
  created_at      DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME                 NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_promotions_active (is_active),
  INDEX idx_promotions_product (product_id),
  CONSTRAINT fk_promotions_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 10. POS SESSIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS pos_sessions (
  id               INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  opened_by        INT UNSIGNED   NOT NULL,  -- user who opened
  closed_by        INT UNSIGNED,             -- user who closed
  opened_at        DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at        DATETIME,
  closing_sale_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status           ENUM('open','closed') NOT NULL DEFAULT 'open',
  created_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_sessions_status (status),
  INDEX idx_sessions_opened_by (opened_by),
  CONSTRAINT fk_sessions_opened_by
    FOREIGN KEY (opened_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_sessions_closed_by
    FOREIGN KEY (closed_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 11. ORDERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id               INT UNSIGNED         NOT NULL AUTO_INCREMENT,
  order_number     VARCHAR(20)          NOT NULL,        -- e.g. ORD-00001
  session_id       INT UNSIGNED         NOT NULL,
  table_id         INT UNSIGNED,                         -- NULL = take-away
  customer_id      INT UNSIGNED,
  cashier_id       INT UNSIGNED         NOT NULL,
  status           ENUM('draft','sent_to_kitchen','paid','cancelled')
                                        NOT NULL DEFAULT 'draft',
  payment_method   ENUM('cash','card','upi'),
  payment_ref      VARCHAR(100),                         -- card txn ref or UPI ref
  coupon_id        INT UNSIGNED,                         -- applied coupon
  promotion_id     INT UNSIGNED,                         -- applied auto-promotion
  subtotal         DECIMAL(12,2)        NOT NULL DEFAULT 0.00,
  tax_amount       DECIMAL(12,2)        NOT NULL DEFAULT 0.00,
  discount_amount  DECIMAL(12,2)        NOT NULL DEFAULT 0.00,
  total_amount     DECIMAL(12,2)        NOT NULL DEFAULT 0.00,
  cash_tendered    DECIMAL(12,2),                        -- for cash payments
  change_due       DECIMAL(12,2),
  notes            TEXT,
  source           ENUM('pos','self_order') NOT NULL DEFAULT 'pos',
  kds_sent_at      DATETIME,                             -- when sent to kitchen
  paid_at          DATETIME,
  created_at       DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME             NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_orders_number (order_number),
  INDEX idx_orders_session (session_id),
  INDEX idx_orders_table (table_id),
  INDEX idx_orders_customer (customer_id),
  INDEX idx_orders_cashier (cashier_id),
  INDEX idx_orders_status (status),
  INDEX idx_orders_created (created_at),
  CONSTRAINT fk_orders_session
    FOREIGN KEY (session_id) REFERENCES pos_sessions (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_table
    FOREIGN KEY (table_id) REFERENCES restaurant_tables (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_cashier
    FOREIGN KEY (cashier_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_orders_coupon
    FOREIGN KEY (coupon_id) REFERENCES coupons (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_orders_promotion
    FOREIGN KEY (promotion_id) REFERENCES promotions (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 12. ORDER ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS order_items (
  id              INT UNSIGNED   NOT NULL AUTO_INCREMENT,
  order_id        INT UNSIGNED   NOT NULL,
  product_id      INT UNSIGNED   NOT NULL,
  product_name    VARCHAR(120)   NOT NULL,   -- snapshot at time of order
  unit_price      DECIMAL(10,2)  NOT NULL,
  quantity        DECIMAL(10,3)  NOT NULL DEFAULT 1.000,
  tax_percent     DECIMAL(5,2)   NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(10,2)  NOT NULL DEFAULT 0.00,  -- product-level promo
  line_total      DECIMAL(12,2)  NOT NULL,
  kds_status      ENUM('pending','preparing','completed') NOT NULL DEFAULT 'pending',
  notes           TEXT,
  created_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_order_items_order (order_id),
  INDEX idx_order_items_product (product_id),
  INDEX idx_order_items_kds (kds_status),
  CONSTRAINT fk_order_items_order
    FOREIGN KEY (order_id) REFERENCES orders (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product
    FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 13. SELF-ORDERING CONFIGURATION
-- =============================================================================
CREATE TABLE IF NOT EXISTS self_ordering_config (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  is_enabled       TINYINT(1)    NOT NULL DEFAULT 0,
  mode             ENUM('online_ordering','qr_menu') NOT NULL DEFAULT 'online_ordering',
  bg_color         VARCHAR(20)   NOT NULL DEFAULT '#ffffff',
  bg_image_url     VARCHAR(500),
  created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 14. CUSTOMER-FACING DISPLAY STATE
--     Single-row table updated in real-time by POS actions
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_display_state (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  order_id    INT UNSIGNED,
  view        ENUM('idle','order','payment','thankyou') NOT NULL DEFAULT 'idle',
  payload     JSON,         -- serialised order snapshot / payment data
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- 15. BOOKINGS (optional reservation system referenced in nav)
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  customer_id  INT UNSIGNED,
  table_id     INT UNSIGNED,
  party_size   TINYINT UNSIGNED NOT NULL DEFAULT 1,
  booked_at    DATETIME      NOT NULL,
  notes        TEXT,
  status       ENUM('pending','confirmed','cancelled','completed')
                             NOT NULL DEFAULT 'pending',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_bookings_table (table_id),
  INDEX idx_bookings_customer (customer_id),
  INDEX idx_bookings_status (status),
  CONSTRAINT fk_bookings_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_bookings_table
    FOREIGN KEY (table_id) REFERENCES restaurant_tables (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
-- =============================================================================
-- End of Schema
-- =============================================================================
