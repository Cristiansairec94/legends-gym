-- ============================================================================
-- Sample reviews (approved) — safe to run on a live DB, nothing else is touched.
-- Run against the running Docker stack:
--   docker compose exec -T db psql -U postgres -d gym_management < database/reviews.sql
-- These appear immediately in the "Success Stories" slider on the home page.
-- ============================================================================

INSERT INTO reviews (member_id, customer_name, role_label, rating, message, is_approved) VALUES
(NULL, 'Ahmed Raza',      'Gold Member',     5, 'Best gym in the city! The trainers actually care about your progress. I gained 6kg of muscle in 4 months.', TRUE),
(NULL, 'Fatima Sheikh',   'Premium Member',  5, 'Clean, modern equipment and a super motivating environment. The diet guidance changed everything for me.', TRUE),
(NULL, 'Bilal Khan',      'Member',          4, 'Great facilities and friendly staff. Peak hours can get a little busy but overall an amazing experience.', TRUE),
(NULL, 'Ayesha Malik',    'Platinum Member', 5, 'The personal training here is next level. Lost 12kg and feel stronger than ever. Highly recommended!', TRUE),
(NULL, 'Usman Tariq',     'Gold Member',     5, 'Joined for bodybuilding and the contest-prep coaching is world class. Coaches know exactly what they are doing.', TRUE),
(NULL, 'Hina Javed',      'Member',          5, 'Love the yoga and recovery sessions. Perfect balance of strength training and mobility work.', TRUE),
(NULL, 'Salman Ali',      'Premium Member',  4, 'Excellent value for money. The supplements store on-site is a nice bonus. Staff is very knowledgeable.', TRUE),
(NULL, 'Zara Iqbal',      'Gold Member',     5, 'From day one the team made me feel welcome. My strength and confidence have both gone through the roof.', TRUE);
