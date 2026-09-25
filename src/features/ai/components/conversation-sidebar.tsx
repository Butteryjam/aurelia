'use client'

import { useState, useTransition } from 'react'
import { Plus, MessageSquare, Trash2, Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteConversationAction } from '../actions/conversations'
import type { ConversationSummary } from '../queries/get-conversations'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId?: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onConversationDeleted?: (id: string) => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onConversationDeleted,
}: ConversationSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this conversation?')) return

    setDeletingId(id)
    startTransition(async () => {
      await deleteConversationAction(id)
      setDeletingId(null)
      onConversationDeleted?.(id)
    })
  }

  return (
    <div className="flex flex-col h-full w-full bg-card border-r border-border">
      {/* Header with New Chat Button */}
      <div className="p-4 border-b border-border space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Conversations
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground font-mono">
            {conversations.length}
          </span>
        </div>

        <Button
          type="button"
          onClick={onNewConversation}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-9 text-xs font-semibold"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>New Chef Chat</span>
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="py-8 text-center px-4">
            <MessageSquare className="h-6 w-6 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No conversations yet.</p>
            <p className="text-[11px] text-muted-foreground/80 mt-1">
              Ask Chef about recipe ideas or ingredients!
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = conv.id === activeConversationId
            const isDeleting = deletingId === conv.id

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors text-left ${
                  isActive
                    ? 'bg-primary/10 text-primary font-medium border border-primary/20'
                    : 'hover:bg-muted/70 text-foreground/80 hover:text-foreground'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    {conv.recipe_id ? (
                      <BookOpen className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <MessageSquare className="h-3 w-3 shrink-0 text-muted-foreground" />
                    )}
                    <p className="text-xs font-medium truncate">{conv.title}</p>
                  </div>

                  {conv.recipe?.title && (
                    <p className="text-[10px] text-muted-foreground truncate pl-4.5">
                      Recipe: {conv.recipe.title}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={isDeleting}
                  className="relative opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-foreground hover:text-destructive rounded-md transition-opacity shrink-0 after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
