'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  ChefHat,
  Send,
  Loader2,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  BookOpen,
  ArrowRight,
  PanelLeft,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ConversationSidebar } from './conversation-sidebar'
import { MarkdownContent } from './markdown-content'
import { sendChatMessageAction } from '../actions/chat'
import type { ConversationWithMessages, GroundedRecipeReference } from '../types'
import type { ConversationSummary } from '../queries/get-conversations'

interface ChefChatProps {
  initialConversation?: ConversationWithMessages | null
  focusedRecipeId?: string | null
  focusedRecipeTitle?: string | null
  conversations: ConversationSummary[]
}

const SUGGESTED_PROMPTS = [
  'What can I cook with chicken and onions under 30 minutes?',
  'What are quick weeknight meals in my culinary archive?',
  'How can I substitute buttermilk in baking?',
  'What can I do with leftover roasted vegetables?',
]

export function ChefChat({
  initialConversation,
  focusedRecipeId,
  focusedRecipeTitle,
  conversations: initialConversations,
}: ChefChatProps) {
  const router = useRouter()
  const [conversations, setConversations] = useState(initialConversations)
  const [activeConvId, setActiveConvId] = useState<string | null>(
    initialConversation?.id ?? null
  )
  const [messages, setMessages] = useState<
    Array<{
      id?: string
      role: 'user' | 'assistant' | 'system'
      content: string
      recipeReferences?: GroundedRecipeReference[]
    }>
  >(initialConversation?.messages ?? [])

  const [currentRecipeId, setCurrentRecipeId] = useState<string | null>(
    focusedRecipeId ?? initialConversation?.recipe_id ?? null
  )
  const [currentRecipeTitle, setCurrentRecipeTitle] = useState<string | null>(
    focusedRecipeTitle ?? initialConversation?.recipe?.title ?? null
  )

  const [inputMessage, setInputMessage] = useState('')
  const [isSending, startSending] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isSending])

  // Sync state if initialConversation prop changes externally
  const [prevConvId, setPrevConvId] = useState<string | null>(initialConversation?.id ?? null)

  if (initialConversation && initialConversation.id !== prevConvId) {
    setPrevConvId(initialConversation.id)
    setActiveConvId(initialConversation.id)
    setMessages(initialConversation.messages ?? [])
    if (initialConversation.recipe_id) {
      setCurrentRecipeId(initialConversation.recipe_id)
      setCurrentRecipeTitle(initialConversation.recipe?.title ?? null)
    }
  }

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputMessage
    if (!textToSend.trim() || isSending) return

    setError(null)
    const userText = textToSend.trim()
    setInputMessage('')

    // Optimistically add user message
    setMessages((prev) => [...prev, { role: 'user', content: userText }])

    startSending(async () => {
      try {
        const res = await sendChatMessageAction({
          conversationId: activeConvId || undefined,
          recipeId: currentRecipeId,
          message: userText,
        })

        if (res.error || !res.data) {
          setError(res.error ?? 'Unable to connect to Chef.')
          return
        }

        const { conversationId, assistantMessage, references } = res.data

        if (!activeConvId) {
          setActiveConvId(conversationId)
          router.replace(`/ai-chef?c=${conversationId}`)
        }

        // Append assistant message with references
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessage.id,
            role: 'assistant',
            content: assistantMessage.content,
            recipeReferences: references,
          },
        ])
      } catch {
        setError('Something unexpected happened while talking to Chef. Please try again.')
      }
    })
  }

  const handleCopy = (content: string, index: number) => {
    navigator.clipboard.writeText(content)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const handleNewConversation = () => {
    setActiveConvId(null)
    setMessages([])
    setCurrentRecipeId(null)
    setCurrentRecipeTitle(null)
    setError(null)
    router.replace('/ai-chef')
    setShowMobileSidebar(false)
  }

  const handleSelectConversation = (id: string) => {
    setActiveConvId(id)
    router.replace(`/ai-chef?c=${id}`)
    setShowMobileSidebar(false)
  }

  /**
   * Helper to parse and render Markdown in assistant messages and embed interactive cards.
   */
  const renderMessageContent = (
    content: string,
    references?: GroundedRecipeReference[]
  ) => {
    return (
      <div className="space-y-3">
        <MarkdownContent content={content} references={references} />

        {/* Embedded Interactive Recipe Cards below response */}
        {references && references.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-border/50">
            {references.map((rec) => (
              <Link
                key={rec.id}
                href={`/recipes/${rec.id}`}
                className="flex items-center gap-3 p-2.5 rounded-xl border border-border/80 bg-background/80 hover:border-primary/50 hover:bg-muted/50 transition-all group"
              >
                {rec.imageUrl ? (
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-border">
                    <Image
                      src={rec.imageUrl}
                      alt={rec.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border border-border">
                    <BookOpen className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {rec.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {rec.cookTime ? `${rec.cookTime}m cook` : 'Cook time N/A'}
                    {rec.cuisine ? ` • ${rec.cuisine}` : ''}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 pr-1" />
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-8.5rem)] w-full max-w-6xl mx-auto rounded-2xl border border-border bg-card overflow-hidden shadow-xs relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 h-full shrink-0">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConvId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onConversationDeleted={(id) => {
            setConversations((prev) => prev.filter((c) => c.id !== id))
            if (activeConvId === id) handleNewConversation()
          }}
        />
      </div>

      {/* Mobile Drawer Overlay */}
      {showMobileSidebar && (
        <div className="md:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex">
          <div className="w-80 max-w-[85vw] h-full bg-card border-r border-border shadow-2xl flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                History
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMobileSidebar(false)}
                className="relative h-7 w-7 after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Close conversation history"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationSidebar
                conversations={conversations}
                activeConversationId={activeConvId}
                onSelectConversation={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onConversationDeleted={(id) => {
                  setConversations((prev) => prev.filter((c) => c.id !== id))
                  if (activeConvId === id) handleNewConversation()
                }}
              />
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowMobileSidebar(false)} />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background/40">
        {/* Chat Header */}
        <div className="px-4 py-3 border-b border-border bg-card/60 backdrop-blur-xs flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden relative h-8 w-8 shrink-0 text-muted-foreground after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open conversation history"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <ChefHat className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span>AI Chef</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              </h2>
              <p className="text-[11px] text-muted-foreground truncate">
                Culinary assistant grounded in your recipes & kitchen pantry
              </p>
            </div>
          </div>

          {/* Focused Recipe Banner */}
          {currentRecipeTitle && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs shrink-0 max-w-xs truncate">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">Focus: {currentRecipeTitle}</span>
              <button
                type="button"
                onClick={() => {
                  setCurrentRecipeId(null)
                  setCurrentRecipeTitle(null)
                }}
                className="relative hover:text-destructive p-1 rounded after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title="Clear recipe focus"
                aria-label="Clear recipe focus"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 py-8">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                <ChefHat className="h-8 w-8" />
              </div>

              <div className="space-y-1.5">
                <h3 className="font-serif text-lg font-bold text-foreground">
                  Welcome to Your Kitchen Studio
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  I can search your culinary archive, suggest dinner based on what ingredients you have,
                  explain cooking techniques, and adapt recipes to your dietary needs.
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="w-full space-y-2 pt-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Try asking:
                </p>
                <div className="space-y-1.5">
                  {SUGGESTED_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      className="w-full text-left p-2.5 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-muted/60 transition-all text-xs text-foreground/90 font-medium group flex items-center justify-between gap-2"
                    >
                      <span>{prompt}</span>
                      <Sparkles className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isUser = msg.role === 'user'

              return (
                <div
                  key={idx}
                  className={`flex gap-3 text-sm ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                      <ChefHat className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl p-4 shadow-2xs ${
                      isUser
                        ? 'bg-primary text-primary-foreground font-medium rounded-br-xs'
                        : 'bg-card border border-border/80 text-foreground rounded-bl-xs'
                    }`}
                  >
                    {!isUser ? (
                      renderMessageContent(msg.content, msg.recipeReferences)
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                    )}

                    {!isUser && (
                      <div className="flex items-center justify-end gap-2 pt-2 mt-2 border-t border-border/40 text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, idx)}
                          className="relative hover:text-foreground p-1.5 rounded-md transition-colors after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Copy response"
                          aria-label="Copy response"
                        >
                          {copiedIndex === idx ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}

          {/* Thinking / Loading indicator */}
          {isSending && (
            <div aria-live="polite" className="flex gap-3 text-sm justify-start animate-in fade-in-50">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                <ChefHat className="h-4 w-4" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-bl-xs p-4 flex items-center gap-2.5 text-muted-foreground text-xs">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span>Chef is reviewing your recipes…</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div role="alert" className="flex items-center gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="flex-1 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="relative hover:underline font-medium p-1 after:absolute after:-inset-2 after:content-['']"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock */}
        <div className="p-3 sm:p-4 border-t border-border bg-card/60 backdrop-blur-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-end gap-2"
          >
            <div className="relative flex-1 rounded-xl border border-border bg-background shadow-xs focus-within:border-primary transition-colors">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage()
                  }
                }}
                placeholder={
                  currentRecipeTitle
                    ? `Ask Chef about ${currentRecipeTitle}…`
                    : 'Ask Chef anything about your recipes or culinary techniques…'
                }
                rows={1}
                className="w-full resize-none border-0 bg-transparent py-2.5 px-3 text-xs sm:text-sm focus-visible:ring-0 shadow-none min-h-[42px] max-h-32"
                aria-label="Message to AI Chef"
              />
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={!inputMessage.trim() || isSending}
              className="h-[42px] w-[42px] shrink-0 rounded-xl font-medium shadow-xs"
              aria-label="Send message to AI Chef"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Chef answers from your saved recipes & culinary science. Never shares your data.
          </p>
        </div>
      </div>
    </div>
  )
}
