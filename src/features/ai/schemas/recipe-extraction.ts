import { z } from 'zod'

export const extractedIngredientSchema = z.object({
  name: z.string().min(1, 'Ingredient name cannot be empty'),
  quantity: z.string().nullable().optional(),
  unit: z.string().nullable().optional(),
  preparationNote: z.string().nullable().optional(),
  isOptional: z.boolean().default(false),
})

export const extractedInstructionSchema = z.object({
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1, 'Instruction text cannot be empty'),
  timerDuration: z.number().int().nonnegative().nullable().optional(),
})

export const extractedRecipeSchema = z.object({
  title: z.string().min(1, 'Recipe title is required').default('Untitled Recipe'),
  description: z.string().nullable().optional(),
  ingredients: z.array(extractedIngredientSchema).min(1, 'At least one ingredient is required'),
  instructions: z.array(extractedInstructionSchema).min(1, 'At least one instruction step is required'),
  prepTime: z.number().int().nonnegative().nullable().optional(),
  cookTime: z.number().int().nonnegative().nullable().optional(),
  servings: z.number().int().positive().nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  cuisine: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().nullable().optional(),
  confidenceNotes: z.string().nullable().optional(),
})

export type ExtractedRecipeSchemaType = z.infer<typeof extractedRecipeSchema>
