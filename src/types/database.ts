/**
 * Aurelia Database Types
 *
 * These types mirror the PostgreSQL schema defined in
 * supabase/migrations/00001_initial_schema.sql
 *
 * In production, generate these automatically with:
 *   npx supabase gen types typescript --project-id <id> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface NutritionFacts {
  calories?: number
  protein_g?: number
  carbs_g?: number
  fat_g?: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
  [key: string]: Json | undefined
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          dietary_preferences: string[] | null
          measurement_system: 'metric' | 'imperial'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          dietary_preferences?: string[] | null
          measurement_system?: 'metric' | 'imperial'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          dietary_preferences?: string[] | null
          measurement_system?: 'metric' | 'imperial'
          updated_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string | null
          image_url: string | null
          prep_time: number | null
          cook_time: number | null
          total_time: number | null
          servings: number | null
          difficulty: 'easy' | 'medium' | 'hard' | null
          cuisine: string | null
          category: string | null
          notes: string | null
          rating: number | null
          source_url: string | null
          nutrition_facts: Json
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description?: string | null
          image_url?: string | null
          prep_time?: number | null
          cook_time?: number | null
          total_time?: number | null
          servings?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          cuisine?: string | null
          category?: string | null
          notes?: string | null
          rating?: number | null
          source_url?: string | null
          nutrition_facts?: Json
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string | null
          image_url?: string | null
          prep_time?: number | null
          cook_time?: number | null
          total_time?: number | null
          servings?: number | null
          difficulty?: 'easy' | 'medium' | 'hard' | null
          cuisine?: string | null
          category?: string | null
          notes?: string | null
          rating?: number | null
          source_url?: string | null
          nutrition_facts?: Json
          is_public?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: string
          name: string
          category: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          category?: string | null
        }
        Relationships: []
      }
      recipe_ingredients: {
        Row: {
          id: string
          recipe_id: string
          ingredient_id: string | null
          name: string
          quantity: string | null
          unit: string | null
          order_index: number
          is_optional: boolean
          preparation_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          ingredient_id?: string | null
          name: string
          quantity?: string | null
          unit?: string | null
          order_index: number
          is_optional?: boolean
          preparation_note?: string | null
          created_at?: string
        }
        Update: {
          ingredient_id?: string | null
          name?: string
          quantity?: string | null
          unit?: string | null
          order_index?: number
          is_optional?: boolean
          preparation_note?: string | null
        }
        Relationships: []
      }
      recipe_instructions: {
        Row: {
          id: string
          recipe_id: string
          step_number: number
          instruction: string
          timer_duration: number | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          step_number: number
          instruction: string
          timer_duration?: number | null
          created_at?: string
        }
        Update: {
          step_number?: number
          instruction?: string
          timer_duration?: number | null
        }
        Relationships: []
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string | null
          cover_image_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collection_recipes: {
        Row: {
          collection_id: string
          recipe_id: string
          added_at: string
        }
        Insert: {
          collection_id: string
          recipe_id: string
          added_at?: string
        }
        Update: {
          collection_id?: string
          recipe_id?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          name?: string
        }
        Relationships: []
      }
      recipe_tags: {
        Row: {
          recipe_id: string
          tag_id: string
        }
        Insert: {
          recipe_id: string
          tag_id: string
        }
        Update: {
          recipe_id?: string
          tag_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          user_id: string
          recipe_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          recipe_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          recipe_id?: string
        }
        Relationships: []
      }
      shopping_lists: {
        Row: {
          id: string
          user_id: string
          name: string
          status: 'active' | 'completed' | 'archived'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          status?: 'active' | 'completed' | 'archived'
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          status?: 'active' | 'completed' | 'archived'
          updated_at?: string
        }
        Relationships: []
      }
      shopping_list_items: {
        Row: {
          id: string
          shopping_list_id: string
          name: string
          quantity: string | null
          unit: string | null
          category: string | null
          is_checked: boolean
          recipe_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shopping_list_id: string
          name: string
          quantity?: string | null
          unit?: string | null
          category?: string | null
          is_checked?: boolean
          recipe_id?: string | null
          created_at?: string
        }
        Update: {
          name?: string
          quantity?: string | null
          unit?: string | null
          category?: string | null
          is_checked?: boolean
        }
        Relationships: []
      }
      cooking_sessions: {
        Row: {
          id: string
          user_id: string
          recipe_id: string
          started_at: string
          completed_at: string | null
          notes: string | null
          rating: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          recipe_id: string
          started_at?: string
          completed_at?: string | null
          notes?: string | null
          rating?: number | null
          created_at?: string
        }
        Update: {
          completed_at?: string | null
          notes?: string | null
          rating?: number | null
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          id: string
          user_id: string
          title: string
          start_date: string | null
          end_date: string | null
          status: 'active' | 'archived' | 'template'
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          start_date?: string | null
          end_date?: string | null
          status?: 'active' | 'archived' | 'template'
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          start_date?: string | null
          end_date?: string | null
          status?: 'active' | 'archived' | 'template'
          notes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      meal_plan_items: {
        Row: {
          id: string
          user_id: string
          meal_plan_id: string | null
          recipe_id: string | null
          title: string
          recipe_image_url_snapshot: string | null
          date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          servings: number
          notes: string | null
          order_index: number
          is_cooked: boolean
          cooking_session_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          meal_plan_id?: string | null
          recipe_id?: string | null
          title: string
          recipe_image_url_snapshot?: string | null
          date: string
          meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          servings?: number
          notes?: string | null
          order_index?: number
          is_cooked?: boolean
          cooking_session_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          meal_plan_id?: string | null
          recipe_id?: string | null
          title?: string
          recipe_image_url_snapshot?: string | null
          date?: string
          meal_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack'
          servings?: number
          notes?: string | null
          order_index?: number
          is_cooked?: boolean
          cooking_session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          user_id: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          user_id: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ai_conversations: {
        Row: {
          id: string
          user_id: string
          title: string
          recipe_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          recipe_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          recipe_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          id: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count: number | null
          created_at: string
        }
        Insert: {
          id?: string
          conversation_id: string
          role: 'user' | 'assistant' | 'system'
          content: string
          token_count?: number | null
          created_at?: string
        }
        Update: {
          role?: 'user' | 'assistant' | 'system'
          content?: string
          token_count?: number | null
        }
        Relationships: []
      }
      recipe_versions: {
        Row: {
          id: string
          recipe_id: string
          version_number: number
          snapshot: Json
          change_note: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          version_number: number
          snapshot: Json
          change_note?: string | null
          created_at?: string
        }
        Update: {
          version_number?: number
          snapshot?: Json
          change_note?: string | null
        }
        Relationships: []
      }
      recipe_sources: {
        Row: {
          id: string
          recipe_id: string
          source_type: 'manual' | 'url' | 'ai' | 'import'
          source_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          source_type: 'manual' | 'url' | 'ai' | 'import'
          source_url?: string | null
          created_at?: string
        }
        Update: {
          source_type?: 'manual' | 'url' | 'ai' | 'import'
          source_url?: string | null
        }
        Relationships: []
      }
      ai_rate_limits: {
        Row: {
          id: string
          user_id: string
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      check_ai_rate_limit: {
        Args: {
          p_action: string
          p_max_requests: number
          p_window_seconds: number
        }
        Returns: Json
      }
    }
    Enums: {
      difficulty_level: 'easy' | 'medium' | 'hard'
      shopping_list_status: 'active' | 'completed' | 'archived'
      ai_message_role: 'user' | 'assistant' | 'system'
      recipe_source_type: 'manual' | 'url' | 'ai' | 'import'
      measurement_system: 'metric' | 'imperial'
    }
  }
}

// Convenience type aliases
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateDto<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Recipe = Tables<'recipes'>
export type Ingredient = Tables<'ingredients'>
export type RecipeIngredient = Tables<'recipe_ingredients'>
export type RecipeInstruction = Tables<'recipe_instructions'>
export type Collection = Tables<'collections'>
export type Tag = Tables<'tags'>
export type ShoppingList = Tables<'shopping_lists'>
export type ShoppingListItem = Tables<'shopping_list_items'>
export type CookingSession = Tables<'cooking_sessions'>
export type UserPreference = Tables<'user_preferences'>
export type AiConversation = Tables<'ai_conversations'>
export type AiMessage = Tables<'ai_messages'>
export type RecipeVersion = Tables<'recipe_versions'>
export type RecipeSource = Tables<'recipe_sources'>
export type MealPlan = Tables<'meal_plans'>
export type MealPlanItem = Tables<'meal_plan_items'>
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MealPlanStatus = 'active' | 'archived' | 'template'

export interface RecipeWithDetails extends Recipe {
  recipe_ingredients?: RecipeIngredient[]
  recipe_instructions?: RecipeInstruction[]
  tags?: Tag[]
  is_favorite?: boolean
}
