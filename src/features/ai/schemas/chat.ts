import { z } from 'zod'

export const chatMessageInputSchema = z.object({
  conversationId: z.string().uuid().optional(),
  recipeId: z.string().uuid().nullable().optional(),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
})

export const createConversationInputSchema = z.object({
  title: z.string().min(1).max(120).default('New Conversation'),
  recipeId: z.string().uuid().nullable().optional(),
})

export type ChatMessageInput = z.infer<typeof chatMessageInputSchema>
export type CreateConversationInput = z.infer<typeof createConversationInputSchema>
