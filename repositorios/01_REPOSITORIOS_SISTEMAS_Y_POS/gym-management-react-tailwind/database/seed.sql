-- ============================================================================
-- Seed data — CLEAN start (no demo/sample records)
-- Run AFTER schema.sql:  psql "$DATABASE_URL" -f database/seed.sql
-- ----------------------------------------------------------------------------
-- Only the admin account and default website content are inserted so you can
-- log in and add your real plans, products, trainers, etc. from the admin panel.
--
-- Admin login ->  admin@ibbclub.com  /  Admin@123
--
-- Want sample data to explore the features? Load the demo seed instead:
--   psql "$DATABASE_URL" -f database/seed.demo.sql
-- ============================================================================

TRUNCATE order_items, orders, appointments, payments, memberships, reviews,
         enquiries, gallery_images, banners, site_content, products,
         product_categories, services, facilities, trainers, membership_plans,
         members, carts, users RESTART IDENTITY CASCADE;

-- ADMIN USER (password: Admin@123) --------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
('Administrator', 'admin@ibbclub.com', '$2b$10$dEH7/wZMvnt1sMAc265.kOQ3m6gvYbcIKxjwD0vVcC5AchcUCH1WW', 'admin');

-- DEFAULT WEBSITE CONTENT -----------------------------------------------------
INSERT INTO site_content (key, value) VALUES
('hero_eyebrow',    'Welcome to IBBC'),
('hero_title',      ''),  -- empty = show the default "Build Your Best Body"
('hero_subtitle',   'Premium training, expert coaches, and a community built to help you transform.'),
('hero_image',      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80'),
('about_title',     'We Help You To Build Your Better Body'),
('about_content',   'International Body Building Club is a premium fitness destination with modern equipment, certified trainers, and tailored programs for every level.'),
('about_image',     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600'),
('mission',         'To make premium, results-driven fitness accessible to everyone in Karachi.'),
('vision',          'To become the most trusted body building and fitness community in Pakistan.'),
('contact_phone',   ''),
('contact_email',   ''),
('contact_address', ''),
('opening_hours',   'Mon - Sun: 6:00 AM - 11:00 PM'),
('social_facebook', ''),
('social_instagram',''),
('social_youtube',  ''),
('footer_tagline',  'Build your best body with International Body Building Club.');
