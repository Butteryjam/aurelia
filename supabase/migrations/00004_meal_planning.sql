-- =============================================================================
-- Migration 00004: Relational Meal Planning Architecture
-- =============================================================================

-- 1. Custom Enum Types
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_type') THEN
    CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_plan_status') THEN
    CREATE TYPE meal_plan_status AS ENUM ('active', 'archived', 'template');
  END IF;
END $$;

-- 2. Meal Plans (Weekly or named planning containers)
CREATE TABLE IF NOT EXISTS meal_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  start_date  date,
  end_date    date,
  status      meal_plan_status NOT NULL DEFAULT 'active',
  notes       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_meal_plans_user_dates ON meal_plans(user_id, start_date DESC);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_status ON meal_plans(user_id, status);

-- Trigger for meal_plans updated_at
DROP TRIGGER IF EXISTS meal_plans_updated_at ON meal_plans;
CREATE TRIGGER meal_plans_updated_at
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Meal Plan Items (Individual planned meals / slots)
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_plan_id                uuid REFERENCES meal_plans(id) ON DELETE SET NULL,
  recipe_id                   uuid REFERENCES recipes(id) ON DELETE SET NULL,

  -- Display metadata snapshots (preserves historical integrity if recipe is deleted)
  title                       text NOT NULL,
  recipe_image_url_snapshot   text,

  -- Scheduling & portioning
  date                        date NOT NULL,
  meal_type                   meal_type NOT NULL,
  servings                    integer NOT NULL DEFAULT 2 CHECK (servings > 0),
  notes                       text,
  order_index                 integer NOT NULL DEFAULT 0,

  -- Completion tracking
  is_cooked                   boolean NOT NULL DEFAULT false,
  cooking_session_id          uuid REFERENCES cooking_sessions(id) ON DELETE SET NULL,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for meal_plan_items
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_user_date ON meal_plan_items(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_recipe ON meal_plan_items(recipe_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan ON meal_plan_items(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_session ON meal_plan_items(cooking_session_id);

-- Trigger for meal_plan_items updated_at
DROP TRIGGER IF EXISTS meal_plan_items_updated_at ON meal_plan_items;
CREATE TRIGGER meal_plan_items_updated_at
  BEFORE UPDATE ON meal_plan_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own meal plans" ON meal_plans;
CREATE POLICY "Users manage own meal plans"
  ON meal_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own meal plan items" ON meal_plan_items;
CREATE POLICY "Users manage own meal plan items"
  ON meal_plan_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- PostgREST Grants
-- =============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON meal_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON meal_plan_items TO authenticated;
