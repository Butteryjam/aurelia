import type { Recipe, AiConversation, AiMessage } from '@/types/database'

export interface ExtractedIngredient {
  name: string
  quantity?: string | null
  unit?: string | null
  preparationNote?: string | null
  isOptional?: boolean
}

export interface ExtractedInstruction {
  stepNumber: number
  instruction: string
  timerDuration?: number | null // in minutes
}

export interface ExtractedRecipeData {
  title: string
  description?: string | null
  ingredients: ExtractedIngredient[]
  instructions: ExtractedInstruction[]
  prepTime?: number | null
  cookTime?: number | null
  servings?: number | null
  difficulty?: 'easy' | 'medium' | 'hard' | null
  cuisine?: string | null
  category?: string | null
  tags?: string[]
  notes?: string | null
  confidenceNotes?: string | null
}

export type RecipeModificationAction =
  | 'healthier'
  | 'protein'
  | 'vegetarian'
  | 'vegan'
  | 'spicier'
  | 'milder'
  | 'faster'
  | 'substitute'
  | 'scale'
  | 'custom'

export interface RecipeModificationInput {
  recipeId: string
  action: RecipeModificationAction
  customInstruction?: string
  targetServings?: number
  substituteIngredient?: {
    original: string
    replacement: string
  }
}

export interface ModifiedRecipeResult {
  recipe: ExtractedRecipeData
  summaryOfChanges: string
  culinaryNotes?: string | null
}

export interface GroundedRecipeReference {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  cookTime: number | null
  difficulty: string | null
  cuisine: string | null
  category: string | null
}

export interface ChatMessageWithReferences extends AiMessage {
  recipeReferences?: GroundedRecipeReference[]
}

export interface ConversationWithMessages extends AiConversation {
  recipe?: Pick<Recipe, 'id' | 'title' | 'image_url' | 'cook_time' | 'cuisine'> | null
  messages: ChatMessageWithReferences[]
}

export interface AiActionResult<T = unknown> {
  data?: T
  error?: string
  rateLimited?: boolean
}
