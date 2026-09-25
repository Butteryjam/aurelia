-- =============================================================================
-- CRITICAL WARNING — LOCAL DEVELOPMENT & TESTING SEED ONLY
-- =============================================================================
-- DO NOT RUN THIS SCRIPT AGAINST PRODUCTION SUPABASE DATABASES OR REMOTE PROJECTS.
--
-- This script contains mock developer accounts (e.g., chef@recipevault.app,
-- elena@recipevault.app) with dummy development passwords ('Password123!') and
-- hardcoded fixture UUIDs.
--
-- This file is intended ONLY for local development environments via:
--   supabase db reset (runs migrations + seed.sql automatically on local Docker)
-- Or local psql testing.
--
-- Running this script in a production database will inject mock user identities
-- and sample recipes into auth.users and public tables.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Test Users (Supabase Auth)
-- ---------------------------------------------------------------------------
-- Deterministic UUIDs for development
DO $$
DECLARE
  test_user_id uuid := 'a1111111-1111-1111-1111-111111111111'::uuid;
  second_user_id uuid := 'b2222222-2222-2222-2222-222222222222'::uuid;
BEGIN
  -- Insert primary dev user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = test_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      test_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'chef@recipevault.app',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Chef Julian"}',
      now(),
      now()
    );
  END IF;

  -- Insert second dev user if not exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = second_user_id) THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      second_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'elena@recipevault.app',
      crypt('Password123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"display_name":"Elena Rostova"}',
      now(),
      now()
    );
  END IF;
END $$;

-- Update user profiles with rich metadata
INSERT INTO public.profiles (id, display_name, avatar_url, dietary_preferences, measurement_system)
VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    'Chef Julian',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    ARRAY['Low-Carb', 'Mediterranean'],
    'metric'
  ),
  (
    'b2222222-2222-2222-2222-222222222222',
    'Elena Rostova',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
    ARRAY['Vegetarian'],
    'imperial'
  )
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  dietary_preferences = EXCLUDED.dietary_preferences,
  measurement_system = EXCLUDED.measurement_system;

-- ---------------------------------------------------------------------------
-- 2. Master Ingredients Catalog
-- ---------------------------------------------------------------------------
INSERT INTO ingredients (id, name, category) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Salmon Fillet', 'Fish & Seafood'),
  ('c1000000-0000-0000-0000-000000000002', 'Unsalted Butter', 'Dairy'),
  ('c1000000-0000-0000-0000-000000000003', 'Fresh Lemon', 'Produce'),
  ('c1000000-0000-0000-0000-000000000004', 'Fresh Garlic', 'Produce'),
  ('c1000000-0000-0000-0000-000000000005', 'Asparagus', 'Produce'),
  ('c1000000-0000-0000-0000-000000000006', 'Extra Virgin Olive Oil', 'Oils & Vinegars'),
  ('c1000000-0000-0000-0000-000000000007', 'Spaghetti', 'Pantry & Pasta'),
  ('c1000000-0000-0000-0000-000000000008', 'Guanciale', 'Meat'),
  ('c1000000-0000-0000-0000-000000000009', 'Large Eggs', 'Dairy & Eggs'),
  ('c1000000-0000-0000-0000-000000000010', 'Pecorino Romano', 'Dairy'),
  ('c1000000-0000-0000-0000-000000000011', 'Fresh Ground Black Pepper', 'Spices & Seasoning'),
  ('c1000000-0000-0000-0000-000000000012', 'Chicken Thighs', 'Meat'),
  ('c1000000-0000-0000-0000-000000000013', 'Thai Holy Basil', 'Produce & Herbs'),
  ('c1000000-0000-0000-0000-000000000014', 'Bird’s Eye Chili', 'Produce'),
  ('c1000000-0000-0000-0000-000000000015', 'Oyster Sauce', 'Condiments & Sauces'),
  ('c1000000-0000-0000-0000-000000000016', 'Fish Sauce', 'Condiments & Sauces'),
  ('c1000000-0000-0000-0000-000000000017', 'Jasmine Rice', 'Grains & Rice'),
  ('c1000000-0000-0000-0000-000000000018', 'Quinoa', 'Grains & Rice'),
  ('c1000000-0000-0000-0000-000000000019', 'Chickpeas', 'Canned Goods'),
  ('c1000000-0000-0000-0000-000000000020', 'Yellow Onion', 'Produce'),
  ('c1000000-0000-0000-0000-000000000021', 'Beef Broth', 'Canned Goods'),
  ('c1000000-0000-0000-0000-000000000022', 'Gruyère Cheese', 'Dairy'),
  ('c1000000-0000-0000-0000-000000000023', 'French Baguette', 'Bakery'),
  ('c1000000-0000-0000-0000-000000000024', 'Chia Seeds', 'Baking & Seeds'),
  ('c1000000-0000-0000-0000-000000000025', 'Almond Milk', 'Dairy Alternatives'),
  ('c1000000-0000-0000-0000-000000000026', 'Ceremonial Matcha Powder', 'Coffee & Tea'),
  ('c1000000-0000-0000-0000-000000000027', 'Pure Maple Syrup', 'Baking & Sweeteners')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Tags
-- ---------------------------------------------------------------------------
INSERT INTO tags (id, user_id, name) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Quick & Easy'),
  ('d1000000-0000-0000-0000-000000000002', 'a1111111-1111-1111-1111-111111111111', 'High Protein'),
  ('d1000000-0000-0000-0000-000000000003', 'a1111111-1111-1111-1111-111111111111', 'Low Carb'),
  ('d1000000-0000-0000-0000-000000000004', 'a1111111-1111-1111-1111-111111111111', 'Italian Classic'),
  ('d1000000-0000-0000-0000-000000000005', 'a1111111-1111-1111-1111-111111111111', 'Comfort Food'),
  ('d1000000-0000-0000-0000-000000000006', 'a1111111-1111-1111-1111-111111111111', 'Spicy'),
  ('d1000000-0000-0000-0000-000000000007', 'a1111111-1111-1111-1111-111111111111', 'Street Food'),
  ('d1000000-0000-0000-0000-000000000008', 'a1111111-1111-1111-1111-111111111111', 'Vegetarian'),
  ('d1000000-0000-0000-0000-000000000009', 'a1111111-1111-1111-1111-111111111111', 'Meal Prep'),
  ('d1000000-0000-0000-0000-000000000010', 'a1111111-1111-1111-1111-111111111111', 'Gluten-Free')
ON CONFLICT (user_id, name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Collections
-- ---------------------------------------------------------------------------
INSERT INTO collections (id, user_id, name, description, cover_image_url) VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'a1111111-1111-1111-1111-111111111111',
    'Weeknight Dinners',
    'Fast, nourishing, restaurant-caliber meals ready in 30 minutes or less.',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'a1111111-1111-1111-1111-111111111111',
    'Artisanal Comfort',
    'Classic European recipes refined with traditional technique.',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=80'
  ),
  (
    'e1000000-0000-0000-0000-000000000003',
    'a1111111-1111-1111-1111-111111111111',
    'Healthy & Vibrant',
    'Wholesome, nutrient-dense bowls and power breakfasts.',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Recipes
-- ---------------------------------------------------------------------------

-- Recipe 1: Pan-Seared Salmon with Lemon-Herb Butter
INSERT INTO recipes (
  id, user_id, title, description, image_url, prep_time, cook_time, total_time,
  servings, difficulty, cuisine, category, notes, rating, source_url, nutrition_facts, is_public
) VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'a1111111-1111-1111-1111-111111111111',
  'Pan-Seared Salmon with Lemon-Herb Butter & Asparagus',
  'Crispy skin salmon fillets basted in garlic lemon butter alongside tender pan-roasted asparagus spears.',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=1200&q=80',
  10, 15, 25, 2, 'easy', 'Mediterranean', 'Dinner',
  'Pat salmon completely dry with paper towels to get the crispiest skin possible.',
  4.9,
  'https://cooking.nytimes.com',
  '{"calories": 520, "protein_g": 42, "carbs_g": 6, "fat_g": 36, "fiber_g": 3}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Recipe 2: Traditional Roman Spaghetti Carbonara
INSERT INTO recipes (
  id, user_id, title, description, image_url, prep_time, cook_time, total_time,
  servings, difficulty, cuisine, category, notes, rating, source_url, nutrition_facts, is_public
) VALUES (
  'f1000000-0000-0000-0000-000000000002',
  'a1111111-1111-1111-1111-111111111111',
  'Authentic Roman Spaghetti Carbonara',
  'The quintessential Roman classic made strictly with crispy guanciale, fresh egg yolks, Pecorino Romano, and cracked black pepper. No cream ever.',
  'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=1200&q=80',
  10, 15, 25, 4, 'medium', 'Italian', 'Dinner',
  'Take the pan off the heat before adding the egg mixture to prevent curdling.',
  5.0,
  'https://lacucinaitaliana.it',
  '{"calories": 680, "protein_g": 28, "carbs_g": 72, "fat_g": 32, "fiber_g": 3}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Recipe 3: Spicy Thai Basil Chicken (Pad Krapow Gai)
INSERT INTO recipes (
  id, user_id, title, description, image_url, prep_time, cook_time, total_time,
  servings, difficulty, cuisine, category, notes, rating, source_url, nutrition_facts, is_public
) VALUES (
  'f1000000-0000-0000-0000-000000000003',
  'a1111111-1111-1111-1111-111111111111',
  'Spicy Thai Basil Chicken (Pad Krapow Gai)',
  'A wok-fired Thai street food essential featuring minced chicken, fiery chilies, garlic, and aromatic holy basil topped with a crispy fried egg.',
  'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=1200&q=80',
  15, 10, 25, 2, 'easy', 'Thai', 'Dinner',
  'Use holy basil if you can find it at an Asian grocery, otherwise Italian sweet basil works well.',
  4.8,
  'https://hot-thai-kitchen.com',
  '{"calories": 480, "protein_g": 38, "carbs_g": 45, "fat_g": 18, "fiber_g": 2}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Recipe 4: Mediterranean Quinoa & Roasted Chickpea Bowl
INSERT INTO recipes (
  id, user_id, title, description, image_url, prep_time, cook_time, total_time,
  servings, difficulty, cuisine, category, notes, rating, source_url, nutrition_facts, is_public
) VALUES (
  'f1000000-0000-0000-0000-000000000004',
  'a1111111-1111-1111-1111-111111111111',
  'Mediterranean Quinoa & Spiced Chickpea Bowl',
  'Fluffy herbed quinoa paired with crispy roasted chickpeas, cucumber, cherry tomatoes, and creamy lemon-tahini dressing.',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80',
  15, 25, 40, 3, 'easy', 'Mediterranean', 'Lunch',
  'Excellent for meal prep — keeps fresh in the fridge for up to 4 days.',
  4.7,
  'https://minimalistbaker.com',
  '{"calories": 410, "protein_g": 16, "carbs_g": 58, "fat_g": 14, "fiber_g": 11}'::jsonb,
  false
) ON CONFLICT (id) DO NOTHING;

-- Recipe 5: French Onion Soup with Gruyère Crostini
INSERT INTO recipes (
  id, user_id, title, description, image_url, prep_time, cook_time, total_time,
  servings, difficulty, cuisine, category, notes, rating, source_url, nutrition_facts, is_public
) VALUES (
  'f1000000-0000-0000-0000-000000000005',
  'a1111111-1111-1111-1111-111111111111',
  'Classic French Onion Soup with Gruyère Crostini',
  'Slowly caramelized onions simmered in rich beef broth, finished with sherry wine and crowned with toasted baguette and melted bubbling Gruyère.',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80',
  20, 60, 80, 4, 'medium', 'French', 'Soup',
  'Do not rush the onions: caramelization takes a full 45 minutes on low heat.',
  4.9,
  'https://seriouseats.com',
  '{"calories": 390, "protein_g": 18, "carbs_g": 36, "fat_g": 20, "fiber_g": 4}'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Recipe Ingredients
-- ---------------------------------------------------------------------------

-- Ingredients for Salmon
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, name, quantity, unit, order_index, preparation_note) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001', 'Salmon Fillet', '2', 'fillets (6 oz each)', 1, 'skin-on, patted dry'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000002', 'Unsalted Butter', '2', 'tbsp', 2, 'diced'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000003', 'Fresh Lemon', '1', 'whole', 3, 'juiced and zested'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000004', 'Fresh Garlic', '3', 'cloves', 4, 'minced'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000005', 'Asparagus', '1', 'bunch', 5, 'woody ends snapped off'),
  ('f1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000006', 'Extra Virgin Olive Oil', '1', 'tbsp', 6, NULL);

-- Ingredients for Carbonara
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, name, quantity, unit, order_index, preparation_note) VALUES
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000007', 'Spaghetti', '400', 'g', 1, 'bronze-cut preferred'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000008', 'Guanciale', '200', 'g', 2, 'cut into 1/4 inch thick strips'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000009', 'Large Eggs', '4', 'yolks + 1 whole', 3, 'room temperature'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000010', 'Pecorino Romano', '100', 'g', 4, 'very finely grated'),
  ('f1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000011', 'Fresh Ground Black Pepper', '2', 'tsp', 5, 'coarsely ground');

-- Ingredients for Thai Basil Chicken
INSERT INTO recipe_ingredients (recipe_id, ingredient_id, name, quantity, unit, order_index, preparation_note) VALUES
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000012', 'Chicken Thighs', '450', 'g', 1, 'finely hand-minced'),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000013', 'Thai Holy Basil', '1', 'cup packed', 2, 'leaves picked'),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000014', 'Bird’s Eye Chili', '5', 'peppers', 3, 'pounded in mortar'),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000004', 'Fresh Garlic', '6', 'cloves', 4, 'pounded in mortar'),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000015', 'Oyster Sauce', '1.5', 'tbsp', 5, NULL),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000016', 'Fish Sauce', '1', 'tbsp', 6, NULL),
  ('f1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000017', 'Jasmine Rice', '2', 'cups', 7, 'steamed for serving');

-- ---------------------------------------------------------------------------
-- 7. Recipe Instructions (Cook Mode with Timers)
-- ---------------------------------------------------------------------------

-- Instructions for Salmon
INSERT INTO recipe_instructions (recipe_id, step_number, instruction, timer_duration) VALUES
  ('f1000000-0000-0000-0000-000000000001', 1, 'Season salmon fillets generously on both sides with kosher salt and black pepper. Heat olive oil in a heavy stainless steel or cast iron skillet over medium-high heat until shimmering.', NULL),
  ('f1000000-0000-0000-0000-000000000001', 2, 'Place salmon skin-side down in the hot skillet. Press gently with a spatula for 10 seconds to ensure even contact. Cook undisturbed until the skin is crisp and edges are golden.', 360),
  ('f1000000-0000-0000-0000-000000000001', 3, 'Flip salmon. Add asparagus spears around the salmon in the pan. Toss in butter, minced garlic, and lemon zest.', 120),
  ('f1000000-0000-0000-0000-000000000001', 4, 'Tilt the pan and continuously spoon melted garlic-lemon butter over the top of the salmon fillets until cooked through to medium (125°F internal temperature). Squeeze fresh lemon juice over everything and rest 2 minutes before serving.', 180);

-- Instructions for Carbonara
INSERT INTO recipe_instructions (recipe_id, step_number, instruction, timer_duration) VALUES
  ('f1000000-0000-0000-0000-000000000002', 1, 'Bring a large pot of water to a boil. Add salt (less than usual, as Pecorino and guanciale are salty). Drop the spaghetti.', 540),
  ('f1000000-0000-0000-0000-000000000002', 2, 'Meanwhile, in a cold skillet, add the sliced guanciale. Turn heat to medium-low to slowly render the fat until golden brown and crispy outside but tender inside. Remove pan from heat.', 480),
  ('f1000000-0000-0000-0000-000000000002', 3, 'In a bowl, vigorously whisk egg yolks, whole egg, grated Pecorino Romano, and cracked black pepper into a thick cream.', NULL),
  ('f1000000-0000-0000-0000-000000000002', 4, 'Transfer al dente pasta directly into the guanciale skillet with 1/4 cup pasta water. Toss off the heat for 30 seconds to cool slightly, then pour in egg mixture while tossing continuously until glossy and silky. Plate immediately with extra Pecorino and pepper.', 60);

-- Instructions for Thai Basil Chicken
INSERT INTO recipe_instructions (recipe_id, step_number, instruction, timer_duration) VALUES
  ('f1000000-0000-0000-0000-000000000003', 1, 'In a stone mortar, pound chilies and garlic together into a coarse, fragrant paste.', NULL),
  ('f1000000-0000-0000-0000-000000000003', 2, 'Heat 2 tablespoons of high-smoke-point oil in a wok over high heat. Add pounded chili-garlic paste and stir-fry until intensely aromatic (about 30 seconds).', 30),
  ('f1000000-0000-0000-0000-000000000003', 3, 'Add minced chicken and break apart with spatula. Stir-fry vigorously until chicken is 90% cooked through.', 180),
  ('f1000000-0000-0000-0000-000000000003', 4, 'Splash oyster sauce, fish sauce, and a pinch of sugar. Toss in fresh holy basil leaves and kill the heat immediately. Toss until basil wilts from residual heat. Serve over warm jasmine rice with a crispy fried egg.', 60);

-- ---------------------------------------------------------------------------
-- 8. Recipe Tags
-- ---------------------------------------------------------------------------
INSERT INTO recipe_tags (recipe_id, tag_id) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001'), -- Quick & Easy
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000002'), -- High Protein
  ('f1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000003'), -- Low Carb
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000004'), -- Italian Classic
  ('f1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000005'), -- Comfort Food
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001'), -- Quick & Easy
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000006'), -- Spicy
  ('f1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000007')  -- Street Food
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. Collection Recipes
-- ---------------------------------------------------------------------------
INSERT INTO collection_recipes (collection_id, recipe_id) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000001'),
  ('e1000000-0000-0000-0000-000000000001', 'f1000000-0000-0000-0000-000000000003'),
  ('e1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000002'),
  ('e1000000-0000-0000-0000-000000000002', 'f1000000-0000-0000-0000-000000000005'),
  ('e1000000-0000-0000-0000-000000000003', 'f1000000-0000-0000-0000-000000000004')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. Favorites
-- ---------------------------------------------------------------------------
INSERT INTO favorites (user_id, recipe_id) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'f1000000-0000-0000-0000-000000000001'),
  ('a1111111-1111-1111-1111-111111111111', 'f1000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 11. Recipe Sources
-- ---------------------------------------------------------------------------
INSERT INTO recipe_sources (recipe_id, source_type, source_url) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'url', 'https://cooking.nytimes.com/recipes/salmon-lemon-butter'),
  ('f1000000-0000-0000-0000-000000000002', 'manual', NULL),
  ('f1000000-0000-0000-0000-000000000003', 'ai', 'Imported & refined by AI Chef');

-- ---------------------------------------------------------------------------
-- 12. Shopping Lists & Items
-- ---------------------------------------------------------------------------
INSERT INTO shopping_lists (id, user_id, name, status) VALUES
  ('11000000-0000-0000-0000-000000000001', 'a1111111-1111-1111-1111-111111111111', 'Weekend Italian Feast', 'active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shopping_list_items (shopping_list_id, name, quantity, unit, category, is_checked, recipe_id) VALUES
  ('11000000-0000-0000-0000-000000000001', 'Spaghetti', '400', 'g', 'Pantry', true, 'f1000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000001', 'Guanciale', '200', 'g', 'Meat', false, 'f1000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000001', 'Pecorino Romano', '100', 'g', 'Dairy', false, 'f1000000-0000-0000-0000-000000000002'),
  ('11000000-0000-0000-0000-000000000001', 'Fresh Basil', '1', 'bunch', 'Produce', false, NULL);

-- ---------------------------------------------------------------------------
-- 13. Cooking Sessions
-- ---------------------------------------------------------------------------
INSERT INTO cooking_sessions (id, user_id, recipe_id, started_at, completed_at, notes, rating) VALUES
  (
    '22000000-0000-0000-0000-000000000001',
    'a1111111-1111-1111-1111-111111111111',
    'f1000000-0000-0000-0000-000000000001',
    now() - interval '2 days',
    now() - interval '2 days' + interval '26 minutes',
    'Perfect skin crispiness! Basted with extra thyme.',
    5
  );

-- ---------------------------------------------------------------------------
-- 14. User Preferences
-- ---------------------------------------------------------------------------
INSERT INTO user_preferences (user_id, preferences) VALUES
  (
    'a1111111-1111-1111-1111-111111111111',
    '{"theme": "dark", "sound_effects": true, "cook_mode_screen_lock": true, "spice_tolerance": "high", "default_servings": 2}'::jsonb
  )
ON CONFLICT (user_id) DO UPDATE SET preferences = EXCLUDED.preferences;

-- ---------------------------------------------------------------------------
-- 15. AI Conversation & Messages
-- ---------------------------------------------------------------------------
INSERT INTO ai_conversations (id, user_id, title, recipe_id) VALUES
  (
    '33000000-0000-0000-0000-000000000001',
    'a1111111-1111-1111-1111-111111111111',
    'Salmon Pan-Searing Tips',
    'f1000000-0000-0000-0000-000000000001'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO ai_messages (conversation_id, role, content, token_count) VALUES
  (
    '33000000-0000-0000-0000-000000000001',
    'user',
    'How do I ensure my salmon skin does not stick to stainless steel without burning the garlic butter?',
    28
  ),
  (
    '33000000-0000-0000-0000-000000000001',
    'assistant',
    'Two chef secrets: First, ensure the salmon skin is completely dry and the pan is properly preheated before adding high smoke-point oil. Second, do not add the butter and garlic at the start! Cook the skin first for 5-6 minutes; only add the butter, garlic, and herbs during the final 2 minutes to baste gently without burning the milk solids.',
    76
  );

-- ---------------------------------------------------------------------------
-- 16. Recipe Version
-- ---------------------------------------------------------------------------
INSERT INTO recipe_versions (recipe_id, version_number, snapshot, change_note) VALUES
  (
    'f1000000-0000-0000-0000-000000000001',
    1,
    '{"title": "Pan-Seared Salmon", "servings": 2, "cook_time": 15, "prep_time": 10}'::jsonb,
    'Initial recipe version created'
  )
ON CONFLICT (recipe_id, version_number) DO NOTHING;
