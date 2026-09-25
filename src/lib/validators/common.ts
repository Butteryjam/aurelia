import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc')

export type Pagination = z.infer<typeof paginationSchema>
export type SortOrder = z.infer<typeof sortOrderSchema>
