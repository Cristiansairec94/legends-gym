-- ============================================================================
-- Seed data — realistic demo content
-- Run AFTER schema.sql:  psql -U postgres -d gym_management -f database/seed.sql
-- ----------------------------------------------------------------------------
-- Demo credentials (see README):
--   Admin  -> admin@ibbclub.com  / Admin@123
--   Member -> ali.raza@gmail.com / Member@123
-- ============================================================================

TRUNCATE order_items, orders, appointments, payments, memberships, reviews,
         enquiries, gallery_images, banners, site_content, products,
         product_categories, services, facilities, trainers, membership_plans,
         members, carts, users RESTART IDENTITY CASCADE;

-- USERS ----------------------------------------------------------------------
INSERT INTO users (name, email, password_hash, role) VALUES
('Super Admin', 'admin@ibbclub.com', '$2b$10$dEH7/wZMvnt1sMAc265.kOQ3m6gvYbcIKxjwD0vVcC5AchcUCH1WW', 'admin'),
('Ali Raza',    'ali.raza@gmail.com', '$2b$10$ioEMLZ2QfaRC6IyTs8mR6OA5PL/3B3ATIk.Adk7pBtfF7E1rk9lvi', 'member');

-- MEMBERS --------------------------------------------------------------------
INSERT INTO members (user_id, member_code, full_name, email, phone, date_of_birth, gender, address, status) VALUES
(2,    'IBC1001', 'Ali Raza',      'ali.raza@gmail.com',    '0312-3456789', '1998-03-12', 'male',   'Block 5, Gulshan-e-Iqbal, Karachi', 'active'),
(NULL, 'IBC1002', 'Usman Khalid',  'usman.khalid@gmail.com','0321-4567890', '1995-07-21', 'male',   'DHA Phase 6, Karachi',              'active'),
(NULL, 'IBC1003', 'Zainab Fatima', 'zainab.fatima@gmail.com','0315-6789012','1999-11-02', 'female', 'Bahadurabad, Karachi',              'active'),
(NULL, 'IBC1004', 'Hamza Ali',     'hamzaali@gmail.com',    '0300-8901234', '1993-01-15', 'male',   'North Nazimabad, Karachi',          'expired'),
(NULL, 'IBC1005', 'Bilal Ahmed',   'bilal.ahmed@gmail.com', '0311-2345678', '1996-05-30', 'male',   'Clifton, Karachi',                  'active'),
(NULL, 'IBC1006', 'Sana Khan',     'sana.khan@gmail.com',   '0322-1234567', '2000-09-09', 'female', 'PECHS, Karachi',                    'pending'),
(NULL, 'IBC1007', 'Ahmed Hassan',  'ahmed.hassan@gmail.com','0317-7654321', '1990-12-25', 'male',   'Malir Cantt, Karachi',              'active');

-- MEMBERSHIP PLANS (7) -------------------------------------------------------
INSERT INTO membership_plans (name, description, price, duration_months, features, is_featured, is_active) VALUES
('Basic Plan',    'Perfect for beginners getting started.',            2500.00, 1,
  '["Gym Access","Basic Equipment","Locker Room","1 Free Trial Session"]', FALSE, TRUE),
('Silver Plan',   'Great value for consistent trainers.',              4000.00, 6,
  '["Gym Access","Cardio Area","Locker Room","2 Free Sessions"]', FALSE, TRUE),
('Gold Plan',     'Our most popular all-round package.',               6000.00, 12,
  '["Gym Access","Cardio + Weight Area","Personal Trainer (2x/Week)","Diet Plan","5 Free Sessions"]', TRUE, TRUE),
('Platinum Plan', 'For serious athletes who want more.',               8500.00, 12,
  '["All Gold Benefits","Personal Trainer (3x/Week)","Custom Diet Plan","Body Composition Test","Unlimited Group Classes"]', FALSE, TRUE),
('VIP Plan',      'The ultimate premium experience.',                 12000.00, 12,
  '["All Platinum Benefits","Personal Trainer (Daily)","Premium Nutrition Plan","Priority Booking","Guest Passes (2)"]', FALSE, TRUE),
('Quarterly Boost','Short commitment, full access for 3 months.',      5500.00, 3,
  '["Full Gym Access","Cardio + Weight Area","Group Classes","1 Diet Consultation"]', FALSE, TRUE),
('Student Plan',  'Discounted access for verified students.',          3000.00, 1,
  '["Gym Access","Off-Peak Hours","Locker Room"]', FALSE, TRUE);

-- MEMBERSHIPS ----------------------------------------------------------------
INSERT INTO memberships (member_id, plan_id, plan_name, price, start_date, end_date, status) VALUES
(1, 3, 'Gold Plan',     6000.00, '2024-05-10', '2025-05-10', 'active'),
(2, 2, 'Silver Plan',   4000.00, '2024-05-12', '2024-11-12', 'active'),
(3, 4, 'Platinum Plan', 8500.00, '2024-05-15', '2025-05-15', 'active'),
(4, 1, 'Basic Plan',    2500.00, '2024-02-10', '2024-03-10', 'expired'),
(5, 3, 'Gold Plan',     6000.00, '2024-05-18', '2025-05-18', 'active'),
(6, 2, 'Silver Plan',   4000.00, '2024-05-22', '2024-11-22', 'pending'),
(7, 5, 'VIP Plan',     12000.00, '2024-05-25', '2025-05-25', 'active');

-- PAYMENTS -------------------------------------------------------------------
INSERT INTO payments (member_id, membership_id, amount, method, reference, status, paid_at) VALUES
(1, 1, 6000.00, 'card',          'TXN-1001', 'paid',    '2024-05-10'),
(2, 2, 4000.00, 'cash',          'TXN-1002', 'paid',    '2024-05-12'),
(3, 3, 8500.00, 'bank_transfer', 'TXN-1003', 'paid',    '2024-05-15'),
(5, 5, 6000.00, 'easypaisa',     'TXN-1005', 'paid',    '2024-05-18'),
(6, 6, 4000.00, 'cash',          'TXN-1006', 'pending', NULL),
(7, 7,12000.00, 'card',          'TXN-1007', 'paid',    '2024-05-25');

-- TRAINERS -------------------------------------------------------------------
INSERT INTO trainers (name, role, specialization, experience_years, bio, certifications, photo_url, facebook_url, instagram_url, availability, is_active) VALUES
('Ali Khan',     'Strength Coach',     'Powerlifting & Strength',   8,  'Ali specializes in raw strength and progressive overload programming.', 'NASM-CPT, IPF Level 2', 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600', 'https://facebook.com', 'https://instagram.com', 'Mon-Sat, 6AM-2PM', TRUE),
('Sara Malik',   'Fitness Expert',     'HIIT & Conditioning',       6,  'Sara builds high-energy conditioning plans for fat loss and endurance.',  'ACE-CPT, TRX Certified', 'https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600', 'https://facebook.com', 'https://instagram.com', 'Mon-Fri, 4PM-10PM', TRUE),
('Usman Ahmed',  'Bodybuilding Coach', 'Hypertrophy & Contest Prep',10, 'Usman coaches physique competitors from off-season to stage.',             'IFBB Pro Coach, ISSA', 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=600', 'https://facebook.com', 'https://instagram.com', 'Tue-Sun, 7AM-3PM', TRUE),
('Zainab Fatima','Yoga & Wellness',    'Yoga, Mobility & Recovery', 7,  'Zainab focuses on mobility, flexibility and mind-body recovery.',          'RYT-500, Mobility Specialist', 'https://images.unsplash.com/photo-1541694458248-5aa2101c77df?w=600', 'https://facebook.com', 'https://instagram.com', 'Mon-Sat, 8AM-1PM', TRUE);

-- SERVICES -------------------------------------------------------------------
INSERT INTO services (title, description, icon, is_active) VALUES
('Personal Training',      'One-on-one coaching tailored to your goals.',            'Dumbbell', TRUE),
('Strength Training',      'Structured programs to build raw strength.',             'Activity', TRUE),
('Cardio Training',        'Guided cardio for stamina and heart health.',            'HeartPulse', TRUE),
('Weight Loss Programs',   'Nutrition + training plans for sustainable fat loss.',   'TrendingDown', TRUE),
('Muscle Building',        'Hypertrophy-focused plans to add lean mass.',            'Zap', TRUE),
('Functional Training',    'Movement-based training for everyday strength.',         'Move', TRUE),
('Group Classes',          'High-energy sessions in a motivating community.',        'Users', TRUE),
('Nutrition Guidance',     'Personalized diet plans from certified coaches.',        'Apple', TRUE);

-- FACILITIES -----------------------------------------------------------------
INSERT INTO facilities (title, description, icon, image_url, is_active) VALUES
('Modern Equipment', 'Latest and advanced machines from top brands.',       'Dumbbell', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600', TRUE),
('Cardio Zone',      'Full range of treadmills, bikes and rowers.',         'HeartPulse','https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=600', TRUE),
('Strength Zone',    'Free weights, racks and platforms.',                  'Activity',  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600', TRUE),
('Locker Rooms',     'Clean, secure lockers for all members.',              'Lock',      'https://images.unsplash.com/photo-1558611848-73f7eb4001a1?w=600', TRUE),
('Shower Facilities','Refresh after every workout.',                        'ShowerHead','https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?w=600', TRUE),
('Supplement Area',  'Premium supplements available in-house.',             'Package',   'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600', TRUE);

-- PRODUCT CATEGORIES ---------------------------------------------------------
INSERT INTO product_categories (name, slug) VALUES
('Protein', 'protein'),
('Mass Gainer', 'mass-gainer'),
('Creatine', 'creatine'),
('Pre-Workout', 'pre-workout'),
('Vitamins', 'vitamins'),
('Accessories', 'accessories');

-- PRODUCTS -------------------------------------------------------------------
INSERT INTO products (category_id, name, brand, sku, description, price, sale_price, stock, image_url, is_featured, is_active) VALUES
(1, 'Whey Protein Isolate', 'PowerFuel', 'WHEY-001', '25g premium isolate protein per serving for lean muscle.', 6600.00, 5900.00, 120, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=600', TRUE, TRUE),
(2, 'Serious Mass Gainer',  'BulkPro',   'MASS-002', 'High-calorie gainer for hard gainers.',                    7500.00, NULL,    80,  'https://images.unsplash.com/photo-1579722820258-b8a48b4d1a44?w=600', TRUE, TRUE),
(3, 'Creatine Monohydrate', 'PurePump',  'CREA-003', 'Micronized creatine for strength and power.',              2800.00, 2500.00, 200, 'https://images.unsplash.com/photo-1526401281623-3d0ac2657d34?w=600', TRUE, TRUE),
(4, 'Pre-Workout Blast',    'IgniteX',   'PRE-004',  'Explosive energy and focus for intense sessions.',         3800.00, NULL,    95,  'https://images.unsplash.com/photo-1622484211148-d3f1d1d6d3d4?w=600', TRUE, TRUE),
(1, 'BCAA Recovery',        'RecoverPlus','BCAA-005', 'Branched-chain aminos for faster recovery.',              4200.00, 3900.00, 60,  'https://images.unsplash.com/photo-1607619056574-7b8d3ee536b2?w=600', FALSE, TRUE),
(5, 'Multivitamin Complex', 'VitaCore',  'VIT-006',  'Complete daily vitamins and minerals.',                    1800.00, NULL,    150, 'https://images.unsplash.com/photo-1584362917165-526a968579e8?w=600', FALSE, TRUE),
(6, 'Lifting Straps',       'GripMax',   'ACC-007',  'Heavy-duty straps for a stronger pull.',                   900.00,  NULL,    300, 'https://images.unsplash.com/photo-1517963879433-6ad2b056d712?w=600', FALSE, TRUE),
(6, 'Shaker Bottle 700ml',  'MixPro',    'ACC-008',  'Leak-proof shaker with mixing ball.',                      650.00,  550.00,  400, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600', FALSE, TRUE);

-- ORDERS + ITEMS -------------------------------------------------------------
INSERT INTO orders (order_code, member_id, customer_name, email, phone, address, total_amount, status) VALUES
('ORD-1258', 1, 'Ali Raza',    'ali.raza@gmail.com',    '0312-3456789', 'Gulshan-e-Iqbal, Karachi', 4500.00, 'completed'),
('ORD-1257', 2, 'Usman Khalid','usman.khalid@gmail.com','0321-4567890', 'DHA Phase 6, Karachi',     3200.00, 'completed'),
('ORD-1256', 3, 'Zainab Fatima','zainab.fatima@gmail.com','0315-6789012','Bahadurabad, Karachi',    5700.00, 'processing'),
('ORD-1255', 5, 'Bilal Ahmed', 'bilal.ahmed@gmail.com', '0311-2345678', 'Clifton, Karachi',         2800.00, 'pending');

INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) VALUES
(1, 3, 'Creatine Monohydrate', 2500.00, 1, 2500.00),
(1, 6, 'Multivitamin Complex', 1800.00, 1, 1800.00),
(2, 4, 'Pre-Workout Blast',    3800.00, 1, 3800.00),
(3, 1, 'Whey Protein Isolate', 5900.00, 1, 5900.00),
(4, 3, 'Creatine Monohydrate', 2500.00, 1, 2500.00);

-- APPOINTMENTS ---------------------------------------------------------------
INSERT INTO appointments (member_id, trainer_id, service_id, customer_name, email, phone, appointment_date, appointment_time, status) VALUES
(1, 1, 1, 'Ali Raza',     'ali.raza@gmail.com',    '0312-3456789', CURRENT_DATE + 2, '10:00', 'confirmed'),
(3, 4, 7, 'Zainab Fatima','zainab.fatima@gmail.com','0315-6789012', CURRENT_DATE + 3, '17:00', 'pending'),
(5, 3, 5, 'Bilal Ahmed',  'bilal.ahmed@gmail.com', '0311-2345678', CURRENT_DATE + 1, '08:00', 'confirmed'),
(NULL, 2, 3, 'Walk-in Guest','guest@example.com',  '0300-0000000', CURRENT_DATE + 5, '16:00', 'pending');

-- REVIEWS --------------------------------------------------------------------
INSERT INTO reviews (member_id, customer_name, role_label, rating, message, is_approved) VALUES
(4, 'Hamza Ali',     'Gold Member',     5, 'IBBC is the best gym! The trainers are amazing and the environment is perfect for fitness.', TRUE),
(1, 'Ali Raza',      'Gold Member',     5, 'Genuinely transformed my physique in 6 months. Highly recommend the Gold Plan.', TRUE),
(3, 'Zainab Fatima', 'Platinum Member', 4, 'Great classes and a supportive community. Wellness coaching is top notch.', TRUE),
(NULL,'Kamran Sheikh','Visitor',        5, 'Clean facilities and professional staff. Loved the trial session.', FALSE);

-- GALLERY --------------------------------------------------------------------
INSERT INTO gallery_images (title, category, image_url) VALUES
('Weight Floor',   'Equipment', 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800'),
('Cardio Section', 'Facilities','https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800'),
('Training Session','Training', 'https://images.unsplash.com/photo-1550345332-09e3ac987658?w=800'),
('Strength Zone',  'Equipment', 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800'),
('Group Class',    'Community', 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800'),
('Gym Interior',   'Facilities','https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800');

-- BANNERS --------------------------------------------------------------------
INSERT INTO banners (title, subtitle, image_url, position, sort_order) VALUES
('Summer Shred Challenge', 'Join now and get 20% off Gold Plan', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200', 'home', 1),
('New Supplement Arrivals','Premium protein now in stock',       'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?w=1200', 'home', 2);

-- SITE CONTENT ---------------------------------------------------------------
INSERT INTO site_content (key, value) VALUES
('hero_eyebrow',    'Welcome to IBBC'),
('hero_title',      'BUILD YOUR BEST BODY'),
('hero_subtitle',   'Join International Body Building Club and start your journey towards a stronger, healthier you.'),
('hero_image',      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80'),
('about_title',     'We Help You To Build Your Better Body'),
('about_content',   'At International Body Building Club, we provide world-class facilities, expert guidance and a motivated environment to help you achieve your fitness goals.'),
('about_image',     'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600'),
('mission',         'To make premium, results-driven fitness accessible to everyone in Karachi.'),
('vision',          'To become the most trusted body building and fitness community in Pakistan.'),
('contact_phone',   '0312-3456789'),
('contact_email',   'info@ibbclub.com'),
('contact_address', '123, Fitness Street, Karachi, Pakistan'),
('opening_hours',   'Mon - Sun: 6:00 AM - 11:00 PM'),
('social_facebook', 'https://facebook.com'),
('social_instagram','https://instagram.com'),
('social_youtube',  'https://youtube.com'),
('footer_tagline',  'Build your best body with International Body Building Club.');
