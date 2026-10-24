-- ============================================================================
-- International Body Building Club — Gym Management & E-Commerce
-- PostgreSQL Schema
-- ============================================================================
-- Run:  psql -U postgres -d gym_management -f database/schema.sql
-- ============================================================================

-- Clean slate (safe re-runs during development) -----------------------------
DROP TABLE IF EXISTS order_items      CASCADE;
DROP TABLE IF EXISTS orders           CASCADE;
DROP TABLE IF EXISTS appointments     CASCADE;
DROP TABLE IF EXISTS payments         CASCADE;
DROP TABLE IF EXISTS memberships      CASCADE;
DROP TABLE IF EXISTS reviews          CASCADE;
DROP TABLE IF EXISTS enquiries        CASCADE;
DROP TABLE IF EXISTS gallery_images   CASCADE;
DROP TABLE IF EXISTS banners          CASCADE;
DROP TABLE IF EXISTS site_content     CASCADE;
DROP TABLE IF EXISTS products         CASCADE;
DROP TABLE IF EXISTS product_categories CASCADE;
DROP TABLE IF EXISTS services         CASCADE;
DROP TABLE IF EXISTS facilities       CASCADE;
DROP TABLE IF EXISTS trainers         CASCADE;
DROP TABLE IF EXISTS membership_plans CASCADE;
DROP TABLE IF EXISTS members          CASCADE;
DROP TABLE IF EXISTS users            CASCADE;

-- Shared trigger to keep updated_at fresh ------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- USERS  (auth identities: admin + member)
-- ============================================================================
CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  email         VARCHAR(160)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'member'
                CHECK (role IN ('admin', 'member')),
  is_active     BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- MEMBERS  (customer profile, optionally linked to a login user)
-- ============================================================================
CREATE TABLE members (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  member_code       VARCHAR(20) UNIQUE,               -- e.g. IBC1001
  full_name         VARCHAR(120) NOT NULL,
  email             VARCHAR(160) NOT NULL,
  phone             VARCHAR(40),
  date_of_birth     DATE,
  gender            VARCHAR(20) CHECK (gender IN ('male','female','other')),
  address           TEXT,
  emergency_contact VARCHAR(80),
  photo_url         TEXT,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('active','expired','pending','cancelled')),
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_members_status ON members (status);
CREATE INDEX idx_members_email  ON members (email);
CREATE INDEX idx_members_user   ON members (user_id);
CREATE TRIGGER trg_members_updated BEFORE UPDATE ON members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- MEMBERSHIP PLANS
-- ============================================================================
CREATE TABLE membership_plans (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(80)  NOT NULL,
  description    TEXT,
  price          NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  duration_months INTEGER      NOT NULL CHECK (duration_months > 0),
  features       JSONB        NOT NULL DEFAULT '[]',
  is_featured    BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_plans_active ON membership_plans (is_active);
CREATE TRIGGER trg_plans_updated BEFORE UPDATE ON membership_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- MEMBERSHIPS  (a member subscribing to a plan for a period)
-- ============================================================================
CREATE TABLE memberships (
  id          SERIAL PRIMARY KEY,
  member_id   INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  plan_id     INTEGER REFERENCES membership_plans(id) ON DELETE SET NULL,
  plan_name   VARCHAR(80),                 -- snapshot so history survives plan deletes
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  start_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date    DATE NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'pending'
              CHECK (status IN ('active','expired','pending','cancelled')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_memberships_member ON memberships (member_id);
CREATE INDEX idx_memberships_status ON memberships (status);
CREATE INDEX idx_memberships_end    ON memberships (end_date);
CREATE TRIGGER trg_memberships_updated BEFORE UPDATE ON memberships
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- PAYMENTS
-- ============================================================================
CREATE TABLE payments (
  id             SERIAL PRIMARY KEY,
  member_id      INTEGER REFERENCES members(id) ON DELETE SET NULL,
  membership_id  INTEGER REFERENCES memberships(id) ON DELETE SET NULL,
  amount         NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  method         VARCHAR(30) NOT NULL DEFAULT 'cash'
                 CHECK (method IN ('cash','card','bank_transfer','easypaisa','jazzcash','other')),
  reference      VARCHAR(120),
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','paid','failed','refunded')),
  paid_at        DATE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payments_member ON payments (member_id);
CREATE INDEX idx_payments_status ON payments (status);
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- TRAINERS
-- ============================================================================
CREATE TABLE trainers (
  id             SERIAL PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  role           VARCHAR(80),
  specialization VARCHAR(120),
  experience_years INTEGER DEFAULT 0,
  bio            TEXT,
  certifications TEXT,
  photo_url      TEXT,
  facebook_url   TEXT,
  instagram_url  TEXT,
  availability   VARCHAR(120),
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_trainers_active ON trainers (is_active);
CREATE TRIGGER trg_trainers_updated BEFORE UPDATE ON trainers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SERVICES & FACILITIES
-- ============================================================================
CREATE TABLE services (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  description TEXT,
  icon        VARCHAR(60),          -- lucide icon name
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_services_updated BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE facilities (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(120) NOT NULL,
  description TEXT,
  icon        VARCHAR(60),
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_facilities_updated BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- APPOINTMENTS / BOOKINGS
-- ============================================================================
CREATE TABLE appointments (
  id             SERIAL PRIMARY KEY,
  member_id      INTEGER REFERENCES members(id) ON DELETE SET NULL,
  trainer_id     INTEGER REFERENCES trainers(id) ON DELETE SET NULL,
  service_id     INTEGER REFERENCES services(id) ON DELETE SET NULL,
  customer_name  VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  phone          VARCHAR(40),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  notes          TEXT,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appointments_date   ON appointments (appointment_date);
CREATE INDEX idx_appointments_status ON appointments (status);
CREATE INDEX idx_appointments_trainer ON appointments (trainer_id);
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- PRODUCTS / SUPPLEMENTS STORE
-- ============================================================================
CREATE TABLE product_categories (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(80) NOT NULL UNIQUE,
  slug       VARCHAR(90) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON product_categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE products (
  id           SERIAL PRIMARY KEY,
  category_id  INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
  name         VARCHAR(140) NOT NULL,
  brand        VARCHAR(80),
  sku          VARCHAR(60) UNIQUE,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  sale_price   NUMERIC(10,2) CHECK (sale_price >= 0),
  stock        INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url    TEXT,
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_active   ON products (is_active);
CREATE INDEX idx_products_featured ON products (is_featured);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- ORDERS + ORDER ITEMS
-- ============================================================================
CREATE TABLE orders (
  id             SERIAL PRIMARY KEY,
  order_code     VARCHAR(24) UNIQUE,
  member_id      INTEGER REFERENCES members(id) ON DELETE SET NULL,
  customer_name  VARCHAR(120) NOT NULL,
  email          VARCHAR(160) NOT NULL,
  phone          VARCHAR(40),
  address        TEXT,
  total_amount   NUMERIC(10,2) NOT NULL DEFAULT 0,
  status         VARCHAR(20) NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','confirmed','processing','completed','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_member ON orders (member_id);
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id  INTEGER REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(140) NOT NULL,       -- snapshot
  unit_price  NUMERIC(10,2) NOT NULL,
  quantity    INTEGER NOT NULL CHECK (quantity > 0),
  line_total  NUMERIC(10,2) NOT NULL
);
CREATE INDEX idx_order_items_order ON order_items (order_id);

-- ============================================================================
-- REVIEWS / TESTIMONIALS
-- ============================================================================
CREATE TABLE reviews (
  id            SERIAL PRIMARY KEY,
  member_id     INTEGER REFERENCES members(id) ON DELETE SET NULL,
  customer_name VARCHAR(120) NOT NULL,
  role_label    VARCHAR(80),               -- "Gold Member" etc.
  rating        INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  message       TEXT NOT NULL,
  is_approved   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_approved ON reviews (is_approved);
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- GALLERY
-- ============================================================================
CREATE TABLE gallery_images (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(120),
  category   VARCHAR(60),
  image_url  TEXT NOT NULL,
  member_id  INTEGER REFERENCES members(id) ON DELETE SET NULL,  -- set when a member uploads
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,                       -- member uploads start FALSE (pending approval)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_gallery_updated BEFORE UPDATE ON gallery_images
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- ENQUIRIES (contact form)
-- ============================================================================
CREATE TABLE enquiries (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(120) NOT NULL,
  email      VARCHAR(160) NOT NULL,
  phone      VARCHAR(40),
  subject    VARCHAR(160),
  message    TEXT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'new'
             CHECK (status IN ('new','in_progress','replied','closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_enquiries_status ON enquiries (status);
CREATE TRIGGER trg_enquiries_updated BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- SITE CONTENT (key/value CMS) + BANNERS
-- ============================================================================
CREATE TABLE site_content (
  id         SERIAL PRIMARY KEY,
  key        VARCHAR(80) NOT NULL UNIQUE,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_content_updated BEFORE UPDATE ON site_content
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE banners (
  id         SERIAL PRIMARY KEY,
  title      VARCHAR(140),
  subtitle   VARCHAR(200),
  image_url  TEXT,
  link_url   TEXT,
  position   VARCHAR(40) DEFAULT 'home',
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_banners_updated BEFORE UPDATE ON banners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- CARTS — persistent shopping cart per logged-in user (accessible anywhere)
-- ============================================================================
CREATE TABLE carts (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data       JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
