import { getConversations, getConversationWithMessages } from '@/features/ai/queries/get-conversations'
import { ChefChat } from '@/features/ai/components/chef-chat'
import { createClient } from '@/lib/supabase/server'
import type { ConversationWithMessages } from '@/features/ai/types'

export const maxDuration = 60

interface AIChefPageProps {
  searchParams: Promise<{
    c?: string
    recipeId?: string
  }>
}

export default async function AIChefPage({ searchParams }: AIChefPageProps) {
  const resolvedParams = await searchParams
  const convId = resolvedParams.c
  const recipeId = resolvedParams.recipeId

  const conversations = await getConversations()

  let initialConversation: ConversationWithMessages | null = null
  if (convId) {
    initialConversation = await getConversationWithMessages(convId)
  }

  let focusedRecipeTitle: string | null = null
  if (recipeId) {
    const supabase = await createClient()
    const { data: recipe } = await supabase
      .from('recipes')
      .select('title')
      .eq('id', recipeId)
      .single()
    if (recipe?.title) {
      focusedRecipeTitle = recipe.title
    }
  }

  return (
    <div className="space-y-4">
      <ChefChat
        initialConversation={initialConversation}
        focusedRecipeId={recipeId}
        focusedRecipeTitle={focusedRecipeTitle}
        conversations={conversations}
      />
    </div>
  )
}
