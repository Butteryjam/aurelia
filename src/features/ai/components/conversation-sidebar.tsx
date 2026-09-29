'use client'

import { useState, useTransition } from 'react'
import { Plus, MessageSquare, Trash2, Loader2, BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteConversationAction } from '../actions/conversations'
import type { ConversationSummary } from '../queries/get-conversations'

interface ConversationSidebarProps {
  conversations: ConversationSummary[]
  activeConversationId?: string | null
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onConversationDeleted?: (id: string) => void
  onClose?: () => void
}

export function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onConversationDeleted,
  onClose,
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
    <div className="flex flex-col h-full w-full bg-card/50 border-r border-border">
      {/* Header with New Chat Button */}
      <div className="p-3.5 sm:p-4 border-b border-border space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Culinary Journal
            </span>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60">
              {conversations.length}
            </span>
          </div>

          {onClose && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="md:hidden relative h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close conversation history"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        <Button
          type="button"
          onClick={onNewConversation}
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 h-9 text-xs font-semibold rounded-xl border-border/80 bg-background/60 hover:bg-muted hover:border-primary/40 hover:text-primary transition-all shadow-2xs"
        >
          <Plus className="h-3.5 w-3.5 text-primary" />
          <span>New Chef Chat</span>
        </Button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="py-12 text-center px-4 space-y-2">
            <div className="h-10 w-10 rounded-xl bg-muted/60 border border-border/70 flex items-center justify-center text-muted-foreground/60 mx-auto">
              <MessageSquare className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-foreground/80">No conversations yet</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Ask Chef about recipe pairings, substitutions, or cooking techniques.
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
                className={`group relative flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-left border ${
                  isActive
                    ? 'bg-primary/10 text-foreground font-medium border-primary/25 shadow-2xs before:absolute before:left-0 before:top-2.5 before:bottom-2.5 before:w-1 before:rounded-r-full before:bg-primary'
                    : 'border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    {conv.recipe_id ? (
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" />
                    )}
                    <p
                      className={`text-xs truncate ${
                        isActive ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'
                      }`}
                    >
                      {conv.title}
                    </p>
                  </div>

                  {conv.recipe?.title && (
                    <p className="text-[11px] text-muted-foreground truncate pl-5">
                      Recipe: {conv.recipe.title}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={isDeleting}
                  className="relative opacity-100 sm:opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all shrink-0 after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
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
