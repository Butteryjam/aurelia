import { z } from 'zod'
import { extractedRecipeSchema } from './recipe-extraction'

export const recipeModificationActionSchema = z.enum([
  'healthier',
  'protein',
  'vegetarian',
  'vegan',
  'spicier',
  'milder',
  'faster',
  'substitute',
  'scale',
  'custom',
])

export const recipeModificationInputSchema = z.object({
  recipeId: z.string().uuid(),
  action: recipeModificationActionSchema,
  customInstruction: z.string().max(500).optional(),
  targetServings: z.number().int().positive().max(100).optional(),
  substituteIngredient: z
    .object({
      original: z.string().min(1),
      replacement: z.string().min(1),
    })
    .optional(),
})

export const modifiedRecipeResultSchema = z.object({
  recipe: extractedRecipeSchema,
  summaryOfChanges: z.string().min(1),
  culinaryNotes: z.string().nullable().optional(),
})

export type RecipeModificationInputType = z.infer<typeof recipeModificationInputSchema>
export type ModifiedRecipeResultType = z.infer<typeof modifiedRecipeResultSchema>
