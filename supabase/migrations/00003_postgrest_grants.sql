-- =============================================================================
-- RecipeVault — PostgREST Role Grants
-- =============================================================================
-- The initial schema created tables and RLS policies but omitted the
-- PostgreSQL GRANT statements that PostgREST requires.  Without these,
-- the REST API cannot access any tables regardless of RLS.
--
-- Principle: grant the MINIMUM privileges each role needs.
--   • anon           – SELECT only on tables whose RLS policies permit
--                       unauthenticated reads (recipes with is_public = true,
--                       and their child rows via RLS sub-selects).
--   • authenticated  – full DML on tables the app uses through RLS.
--
-- RLS remains enabled on every table.  These grants do NOT bypass RLS.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Schema-level USAGE (required for PostgREST to see the tables at all)
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- Sequence privileges (required for INSERT with DEFAULT gen_random_uuid()
-- or serial columns)
-- ---------------------------------------------------------------------------
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ---------------------------------------------------------------------------
-- ANON role — read-only, and only on tables with public-facing RLS policies
-- ---------------------------------------------------------------------------
-- recipes:              RLS allows SELECT when is_public = true
-- recipe_ingredients:   RLS allows SELECT via subquery on recipes
-- recipe_instructions:  RLS allows SELECT via subquery on recipes
-- recipe_tags:          RLS allows SELECT via subquery on recipes
-- recipe_sources:       RLS allows SELECT via subquery on recipes
-- ingredients:          master catalog (RLS restricts to authenticated, but
--                       SELECT grant to anon is harmless; the policy enforces)
-- ---------------------------------------------------------------------------
GRANT SELECT ON
  recipes,
  recipe_ingredients,
  recipe_instructions,
  recipe_tags,
  recipe_sources,
  ingredients
TO anon;

-- ---------------------------------------------------------------------------
-- AUTHENTICATED role — DML as allowed by each table's RLS policies
-- ---------------------------------------------------------------------------

-- Tables the authenticated user fully manages (CRUD)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  profiles,
  recipes,
  recipe_ingredients,
  recipe_instructions,
  collections,
  collection_recipes,
  tags,
  recipe_tags,
  favorites,
  shopping_lists,
  shopping_list_items,
  cooking_sessions,
  user_preferences,
  ai_conversations,
  ai_messages,
  recipe_versions,
  recipe_sources
TO authenticated;

-- Master ingredients: authenticated users can read and add, not update/delete
GRANT SELECT, INSERT ON ingredients TO authenticated;
