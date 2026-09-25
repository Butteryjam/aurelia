import { createClient } from '@/lib/supabase/server'
import type { ConversationWithMessages } from '../types'
import type { AiConversation, Recipe } from '@/types/database'

export interface ConversationSummary extends AiConversation {
  recipe?: Pick<Recipe, 'id' | 'title' | 'image_url' | 'cook_time' | 'cuisine'> | null
}

/**
 * Fetch all AI conversations for the current user.
 */
export async function getConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('ai_conversations')
    .select(`
      *,
      recipe:recipes(id, title, image_url, cook_time, cuisine)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Failed to get conversations:', error)
    return []
  }

  type RawRow = AiConversation & {
    recipe: Pick<Recipe, 'id' | 'title' | 'image_url' | 'cook_time' | 'cuisine'> | null
  }

  return (data ?? []) as unknown as RawRow[]
}

/**
 * Fetch a single conversation along with its full message history.
 */
export async function getConversationWithMessages(
  conversationId: string
): Promise<ConversationWithMessages | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  // Verify conversation ownership
  const { data: convData, error: convError } = await supabase
    .from('ai_conversations')
    .select(`
      *,
      recipe:recipes(id, title, image_url, cook_time, cuisine)
    `)
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (convError || !convData) {
    return null
  }

  // Fetch all messages in this conversation
  const { data: messages, error: msgError } = await supabase
    .from('ai_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (msgError) {
    console.error('Failed to get conversation messages:', msgError)
    return null
  }

  type RawConv = AiConversation & {
    recipe: Pick<Recipe, 'id' | 'title' | 'image_url' | 'cook_time' | 'cuisine'> | null
  }

  const conv = convData as unknown as RawConv

  return {
    ...conv,
    messages: messages ?? [],
  }
}
