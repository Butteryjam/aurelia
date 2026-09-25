import { z } from 'zod'

export const createCollectionSchema = z.object({
  name: z.string().min(1, 'Collection name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  coverImageUrl: z
    .string()
    .url('Cover image must be a valid URL')
    .or(z.literal(''))
    .nullable()
    .optional(),
})

export const updateCollectionSchema = createCollectionSchema.partial()

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>
export type UpdateCollectionInput = z.infer<typeof updateCollectionSchema>
