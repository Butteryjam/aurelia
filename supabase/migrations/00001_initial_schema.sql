-- =============================================================================
-- RecipeVault — Initial Database Schema
-- =============================================================================
-- Production-ready PostgreSQL schema with Row-Level Security (RLS),
-- full-text search, relational integrity, and indexing.
-- Run this migration against your Supabase project:
--   supabase db push
-- Or paste into the Supabase SQL Editor.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Custom ENUM types
-- ---------------------------------------------------------------------------

CREATE TYPE difficulty_level AS ENUM ('easy', 'medium', 'hard');
CREATE TYPE shopping_list_status AS ENUM ('active', 'completed', 'archived');
CREATE TYPE ai_message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE recipe_source_type AS ENUM ('manual', 'url', 'ai', 'import');
CREATE TYPE measurement_system AS ENUM ('metric', 'imperial');

-- ---------------------------------------------------------------------------
-- 2. Helper: auto-update updated_at timestamp
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- 3. Profiles (extends auth.users)
-- ---------------------------------------------------------------------------

CREATE TABLE profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name        text,
  avatar_url          text,
  dietary_preferences text[] DEFAULT '{}',
  measurement_system  measurement_system NOT NULL DEFAULT 'metric',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Recipes
-- ---------------------------------------------------------------------------

CREATE TABLE recipes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  image_url       text,
  prep_time       integer,       -- in minutes
  cook_time       integer,       -- in minutes
  total_time      integer,       -- in minutes
  servings        integer,
  difficulty      difficulty_level,
  cuisine         text,
  category        text,
  notes           text,
  rating          numeric(2,1) CHECK (rating >= 0 AND rating <= 5),
  source_url      text,
  nutrition_facts jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_public       boolean NOT NULL DEFAULT false,
  fts             tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' ||
      coalesce(cuisine, '') || ' ' ||
      coalesce(category, '') || ' ' ||
      coalesce(notes, '')
    )
  ) STORED,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_user_id_created ON recipes(user_id, created_at DESC);
CREATE INDEX idx_recipes_category ON recipes(user_id, category) WHERE category IS NOT NULL;
CREATE INDEX idx_recipes_cuisine ON recipes(user_id, cuisine) WHERE cuisine IS NOT NULL;
CREATE INDEX idx_recipes_cook_time ON recipes(user_id, cook_time);
CREATE INDEX idx_recipes_total_time ON recipes(user_id, total_time);
CREATE INDEX idx_recipes_rating ON recipes(user_id, rating DESC NULLS LAST);
CREATE INDEX idx_recipes_is_public ON recipes(is_public) WHERE is_public = true;
CREATE INDEX idx_recipes_fts ON recipes USING gin(fts);

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 5. Master Ingredients (Canonical catalog)
-- ---------------------------------------------------------------------------

CREATE TABLE ingredients (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text,          -- e.g. "Produce", "Dairy", "Meat", "Pantry", "Spices", "Baking"
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name)
);

CREATE INDEX idx_ingredients_name ON ingredients(lower(name));
CREATE INDEX idx_ingredients_category ON ingredients(category) WHERE category IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 6. Recipe Ingredients (Recipe-specific with amounts, units, prep notes)
-- ---------------------------------------------------------------------------

CREATE TABLE recipe_ingredients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id         uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id     uuid REFERENCES ingredients(id) ON DELETE SET NULL,
  name              text NOT NULL,
  quantity          text,          -- stored as text for fractions like "1/2" or decimals
  unit              text,
  order_index       integer NOT NULL DEFAULT 0,
  is_optional       boolean NOT NULL DEFAULT false,
  preparation_note  text,          -- e.g. "finely chopped", "room temperature"
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id, order_index);
CREATE INDEX idx_recipe_ingredients_ingredient ON recipe_ingredients(ingredient_id);
CREATE INDEX idx_recipe_ingredients_name ON recipe_ingredients(lower(name));

-- ---------------------------------------------------------------------------
-- 7. Recipe Instructions
-- ---------------------------------------------------------------------------

CREATE TABLE recipe_instructions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number     integer NOT NULL,
  instruction     text NOT NULL,
  timer_duration  integer,       -- seconds, optional timer for Cook Mode
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_instructions_recipe ON recipe_instructions(recipe_id, step_number);

-- ---------------------------------------------------------------------------
-- 8. Collections
-- ---------------------------------------------------------------------------

CREATE TABLE collections (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  cover_image_url text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_collections_user_id ON collections(user_id);

CREATE TRIGGER collections_updated_at
  BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 9. Collection ↔ Recipe (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE collection_recipes (
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  recipe_id     uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  added_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, recipe_id)
);

CREATE INDEX idx_collection_recipes_recipe ON collection_recipes(recipe_id);

-- ---------------------------------------------------------------------------
-- 10. Tags (user-scoped)
-- ---------------------------------------------------------------------------

CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX idx_tags_user_id ON tags(user_id);
CREATE INDEX idx_tags_name ON tags(lower(name));

-- ---------------------------------------------------------------------------
-- 11. Recipe ↔ Tag (many-to-many)
-- ---------------------------------------------------------------------------

CREATE TABLE recipe_tags (
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, tag_id)
);

CREATE INDEX idx_recipe_tags_tag ON recipe_tags(tag_id);

-- ---------------------------------------------------------------------------
-- 12. Favorites
-- ---------------------------------------------------------------------------

CREATE TABLE favorites (
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id  uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE INDEX idx_favorites_user ON favorites(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 13. Shopping Lists
-- ---------------------------------------------------------------------------

CREATE TABLE shopping_lists (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  status      shopping_list_status NOT NULL DEFAULT 'active',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_lists_user_id ON shopping_lists(user_id);

CREATE TRIGGER shopping_lists_updated_at
  BEFORE UPDATE ON shopping_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 14. Shopping List Items
-- ---------------------------------------------------------------------------

CREATE TABLE shopping_list_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id  uuid NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  name              text NOT NULL,
  quantity          text,
  unit              text,
  category          text,
  is_checked        boolean NOT NULL DEFAULT false,
  recipe_id         uuid REFERENCES recipes(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_shopping_list_items_list ON shopping_list_items(shopping_list_id);

-- ---------------------------------------------------------------------------
-- 15. Cooking Sessions
-- ---------------------------------------------------------------------------

CREATE TABLE cooking_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id     uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  started_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  notes         text,
  rating        integer CHECK (rating >= 1 AND rating <= 5),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cooking_sessions_user_id ON cooking_sessions(user_id);
CREATE INDEX idx_cooking_sessions_recipe ON cooking_sessions(recipe_id);

-- ---------------------------------------------------------------------------
-- 16. User Preferences (JSONB for flexibility)
-- ---------------------------------------------------------------------------

CREATE TABLE user_preferences (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 17. AI Conversations
-- ---------------------------------------------------------------------------

CREATE TABLE ai_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  recipe_id   uuid REFERENCES recipes(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id, created_at DESC);

CREATE TRIGGER ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- 18. AI Messages
-- ---------------------------------------------------------------------------

CREATE TABLE ai_messages (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id   uuid NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role              ai_message_role NOT NULL,
  content           text NOT NULL,
  token_count       integer,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_messages_conversation ON ai_messages(conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- 19. Recipe Versions (History & AI changes)
-- ---------------------------------------------------------------------------

CREATE TABLE recipe_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id       uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version_number  integer NOT NULL,
  snapshot        jsonb NOT NULL,
  change_note     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, version_number)
);

CREATE INDEX idx_recipe_versions_recipe ON recipe_versions(recipe_id, version_number DESC);

-- ---------------------------------------------------------------------------
-- 20. Recipe Sources
-- ---------------------------------------------------------------------------

CREATE TABLE recipe_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  source_type recipe_source_type NOT NULL,
  source_url  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recipe_sources_recipe ON recipe_sources(recipe_id);


-- ===========================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ===========================================================================

-- Enable RLS on every single table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_sources ENABLE ROW LEVEL SECURITY;

-- ---- Profiles ----
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
-- Note: Insert is handled automatically by the auth.users trigger

-- ---- Recipes ----
-- Public recipes viewable by anyone (including anonymous/all users); private by owner only
CREATE POLICY "Users can view public or own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- ---- Master Ingredients ----
CREATE POLICY "Ingredients are readable by all authenticated users"
  ON ingredients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Ingredients can be added by authenticated users"
  ON ingredients FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ---- Recipe Ingredients ----
CREATE POLICY "Users can view ingredients of accessible recipes"
  ON recipe_ingredients FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND (recipes.user_id = auth.uid() OR recipes.is_public = true)
  ));

CREATE POLICY "Users can create ingredients for their recipes"
  ON recipe_ingredients FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update ingredients of their recipes"
  ON recipe_ingredients FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete ingredients of their recipes"
  ON recipe_ingredients FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_ingredients.recipe_id
      AND recipes.user_id = auth.uid()
  ));

-- ---- Recipe Instructions ----
CREATE POLICY "Users can view instructions of accessible recipes"
  ON recipe_instructions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_instructions.recipe_id
      AND (recipes.user_id = auth.uid() OR recipes.is_public = true)
  ));

CREATE POLICY "Users can create instructions for their recipes"
  ON recipe_instructions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_instructions.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update instructions of their recipes"
  ON recipe_instructions FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_instructions.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete instructions of their recipes"
  ON recipe_instructions FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_instructions.recipe_id
      AND recipes.user_id = auth.uid()
  ));

-- ---- Collections ----
CREATE POLICY "Users can view their own collections"
  ON collections FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own collections"
  ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own collections"
  ON collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own collections"
  ON collections FOR DELETE USING (auth.uid() = user_id);

-- ---- Collection ↔ Recipe ----
CREATE POLICY "Users can view their collection recipes"
  ON collection_recipes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_recipes.collection_id
      AND collections.user_id = auth.uid()
  ));

CREATE POLICY "Users can add recipes to their collections"
  ON collection_recipes FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_recipes.collection_id
      AND collections.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove recipes from their collections"
  ON collection_recipes FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM collections
    WHERE collections.id = collection_recipes.collection_id
      AND collections.user_id = auth.uid()
  ));

-- ---- Tags ----
CREATE POLICY "Users can view their own tags"
  ON tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own tags"
  ON tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tags"
  ON tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tags"
  ON tags FOR DELETE USING (auth.uid() = user_id);

-- ---- Recipe ↔ Tag ----
CREATE POLICY "Users can view tags on accessible recipes"
  ON recipe_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
      AND (recipes.user_id = auth.uid() OR recipes.is_public = true)
  ));

CREATE POLICY "Users can tag their recipes"
  ON recipe_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can untag their recipes"
  ON recipe_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_tags.recipe_id
      AND recipes.user_id = auth.uid()
  ));

-- ---- Favorites ----
CREATE POLICY "Users can view their own favorites"
  ON favorites FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can favorite accessible recipes"
  ON favorites FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = favorites.recipe_id
        AND (recipes.user_id = auth.uid() OR recipes.is_public = true)
    )
  );

CREATE POLICY "Users can unfavorite recipes"
  ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ---- Shopping Lists ----
CREATE POLICY "Users can view their own shopping lists"
  ON shopping_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own shopping lists"
  ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own shopping lists"
  ON shopping_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own shopping lists"
  ON shopping_lists FOR DELETE USING (auth.uid() = user_id);

-- ---- Shopping List Items ----
CREATE POLICY "Users can view items in their shopping lists"
  ON shopping_list_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM shopping_lists
    WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can add items to their shopping lists"
  ON shopping_list_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM shopping_lists
    WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their shopping lists"
  ON shopping_list_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM shopping_lists
    WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their shopping lists"
  ON shopping_list_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM shopping_lists
    WHERE shopping_lists.id = shopping_list_items.shopping_list_id
      AND shopping_lists.user_id = auth.uid()
  ));

-- ---- Cooking Sessions ----
CREATE POLICY "Users can view their own cooking sessions"
  ON cooking_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own cooking sessions"
  ON cooking_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cooking sessions"
  ON cooking_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cooking sessions"
  ON cooking_sessions FOR DELETE USING (auth.uid() = user_id);

-- ---- User Preferences ----
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own preferences"
  ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- ---- AI Conversations ----
CREATE POLICY "Users can view their own conversations"
  ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own conversations"
  ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversations"
  ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversations"
  ON ai_conversations FOR DELETE USING (auth.uid() = user_id);

-- ---- AI Messages ----
CREATE POLICY "Users can view messages in their conversations"
  ON ai_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in their conversations"
  ON ai_messages FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM ai_conversations
    WHERE ai_conversations.id = ai_messages.conversation_id
      AND ai_conversations.user_id = auth.uid()
  ));

-- ---- Recipe Versions ----
CREATE POLICY "Users can view versions of their recipes"
  ON recipe_versions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_versions.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can create versions of their recipes"
  ON recipe_versions FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_versions.recipe_id
      AND recipes.user_id = auth.uid()
  ));

-- ---- Recipe Sources ----
CREATE POLICY "Users can view sources of accessible recipes"
  ON recipe_sources FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_sources.recipe_id
      AND (recipes.user_id = auth.uid() OR recipes.is_public = true)
  ));

CREATE POLICY "Users can create sources for their recipes"
  ON recipe_sources FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_sources.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update sources of their recipes"
  ON recipe_sources FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_sources.recipe_id
      AND recipes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete sources of their recipes"
  ON recipe_sources FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM recipes
    WHERE recipes.id = recipe_sources.recipe_id
      AND recipes.user_id = auth.uid()
  ));
