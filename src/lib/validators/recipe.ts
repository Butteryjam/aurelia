import { z } from 'zod'

export const ingredientSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Ingredient name is required').max(200),
  quantity: z.string().max(50).nullable().optional(),
  unit: z.string().max(50).nullable().optional(),
  orderIndex: z.number().int().min(0).default(0),
  isOptional: z.boolean().default(false),
  preparationNote: z.string().max(200).nullable().optional(),
})

export const instructionSchema = z.object({
  id: z.string().uuid().optional(),
  stepNumber: z.number().int().positive(),
  instruction: z.string().min(1, 'Instruction text is required').max(2000),
  timerDuration: z.number().int().positive().nullable().optional(),
})

export const createRecipeSchema = z.object({
  title: z.string().min(1, 'Recipe title is required').max(200),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z
    .string()
    .url('Image must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
  prepTime: z.number().int().nonnegative().nullable().optional(),
  cookTime: z.number().int().nonnegative().nullable().optional(),
  totalTime: z.number().int().nonnegative().nullable().optional(),
  servings: z.number().int().positive('Servings must be at least 1').nullable().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).nullable().optional(),
  cuisine: z.string().max(100).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  tags: z.array(z.string()).optional(),
  ingredients: z.array(ingredientSchema).optional(),
  instructions: z.array(instructionSchema).optional(),
})

export const updateRecipeSchema = createRecipeSchema.partial()

export type IngredientInput = z.infer<typeof ingredientSchema>
export type InstructionInput = z.infer<typeof instructionSchema>
export type CreateRecipeInput = z.infer<typeof createRecipeSchema>
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>
