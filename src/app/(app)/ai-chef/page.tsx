import { getConversations, getConversationWithMessages } from '@/features/ai/queries/get-conversations'
import { ChefChat } from '@/features/ai/components/chef-chat'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
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
      <PageHeader
        title="AI Chef"
        description="Your private culinary intelligence, grounded in your personal recipes and kitchen pantry."
        badge={
          <Badge
            variant="outline"
            className="gap-1.5 border-primary/25 bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 shadow-2xs"
          >
            <Sparkles className="h-3 w-3" />
            <span>Culinary Archive Intelligence</span>
          </Badge>
        }
      />
      <ChefChat
        initialConversation={initialConversation}
        focusedRecipeId={recipeId}
        focusedRecipeTitle={focusedRecipeTitle}
        conversations={conversations}
      />
    </div>
  )
}
