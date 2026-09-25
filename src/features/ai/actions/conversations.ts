'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { AiActionResult } from '../types'

/**
 * Delete an AI conversation and its messages.
 */
export async function deleteConversationAction(
  conversationId: string
): Promise<AiActionResult<{ success: true }>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be signed in to delete conversations.' }
  }

  const { error } = await supabase
    .from('ai_conversations')
    .delete()
    .eq('id', conversationId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete conversation:', error)
    return { error: 'Failed to delete conversation.' }
  }

  revalidatePath('/ai-chef')
  return { data: { success: true } }
}
