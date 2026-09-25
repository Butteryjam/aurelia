import { z } from 'zod'

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be 50 characters or less')
    .trim()
    .optional(),
  avatarUrl: z.string().url().nullable().optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  measurementSystem: z.enum(['metric', 'imperial']).optional(),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
