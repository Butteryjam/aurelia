'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import Link from 'next/link'
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
import { SafeImage } from '@/components/shared/safe-image'
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
  {
    title: 'Pantry Intelligence',
    prompt: 'What can I cook with what I have?',
    detail: 'Suggest dishes using on-hand ingredients',
  },
  {
    title: 'Nutrition & Macros',
    prompt: 'Make my dinner higher in protein.',
    detail: 'Optimize protein ratios without losing flavor',
  },
  {
    title: 'Cookbook Meal Plan',
    prompt: 'Plan three dinners from my saved recipes.',
    detail: 'Harmonious weeknight menu from your archive',
  },
  {
    title: 'Culinary Technique',
    prompt: 'How can I improve this recipe?',
    detail: 'Elevation tips, aromatics & finishing touches',
  },
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
      <div className="space-y-3.5">
        <MarkdownContent content={content} references={references} />

        {/* Embedded Interactive Recipe Cards below response */}
        {references && references.length > 0 && (
          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              <span>Referenced from Your Cookbook</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {references.map((rec) => (
                <Link
                  key={rec.id}
                  href={`/recipes/${rec.id}`}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border/80 bg-background/80 hover:border-primary/40 hover:bg-muted/50 hover:shadow-2xs transition-all group"
                >
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden shrink-0 border border-border bg-muted">
                    {rec.imageUrl ? (
                      <SafeImage
                        src={rec.imageUrl}
                        alt={rec.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {rec.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {rec.cookTime ? `${rec.cookTime}m cook` : 'Cook time N/A'}
                      {rec.cuisine ? ` • ${rec.cuisine}` : ''}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 pr-1" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100dvh-13.5rem)] sm:h-[calc(100dvh-14rem)] min-h-[520px] w-full max-w-6xl mx-auto rounded-2xl border border-border bg-card overflow-hidden shadow-xs relative">
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
                onClose={() => setShowMobileSidebar(false)}
              />
            </div>
          </div>
          <div className="flex-1" onClick={() => setShowMobileSidebar(false)} />
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-background/40">
        {/* Chat Header */}
        <div className="px-3.5 sm:px-4 py-3 border-b border-border bg-card/60 backdrop-blur-xs flex items-center justify-between gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileSidebar(true)}
              className="md:hidden relative h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Open conversation history"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>

            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20 shadow-2xs">
              <ChefHat className="h-5 w-5" />
            </div>

            <div className="min-w-0 shrink-0">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 font-serif sm:font-sans tracking-tight whitespace-nowrap">
                <span>AI Chef</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Culinary Intelligence Active" />
              </h2>
              <p className="text-[11px] text-muted-foreground truncate hidden sm:block">
                Private culinary intelligence grounded in your kitchen archive
              </p>
            </div>
          </div>

          {/* Focused Recipe Banner */}
          {currentRecipeTitle && (
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 text-xs shrink min-w-0 max-w-[140px] sm:max-w-xs truncate shadow-2xs">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate font-medium">Focus: {currentRecipeTitle}</span>
              <button
                type="button"
                onClick={() => {
                  setCurrentRecipeId(null)
                  setCurrentRecipeTitle(null)
                }}
                className="relative hover:text-destructive p-1 rounded-md transition-colors after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
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
            <div className="min-h-full my-auto flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-5 sm:space-y-6 py-4 sm:py-8 px-2">
              <div className="relative">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-xs">
                  <ChefHat className="h-8 w-8" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center shadow-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                </div>
              </div>

              <div className="space-y-2 max-w-md">
                <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  Your Culinary Intelligence Studio
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Chef analyzes your recipe library, recommends dishes based on on-hand ingredients,
                  guides preparation techniques, and customizes nutritional profiles.
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="w-full space-y-2.5 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggested Culinary Inquiries
                  </span>
                  <span className="text-[10px] text-muted-foreground">Tap to ask</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SUGGESTED_PROMPTS.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt)}
                      className="group flex flex-col justify-between p-3.5 rounded-xl border border-border/80 bg-card/80 hover:bg-muted/60 hover:border-primary/40 hover:shadow-2xs transition-all text-left"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                          {item.title}
                        </span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:text-primary transition-all shrink-0" />
                      </div>
                      <p className="text-xs font-medium text-foreground leading-snug">
                        {item.prompt}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {item.detail}
                      </p>
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
                    <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 shadow-2xs">
                      <ChefHat className="h-4 w-4" />
                    </div>
                  )}

                  <div
                    className={`relative max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 sm:p-5 shadow-2xs ${
                      isUser
                        ? 'bg-primary text-primary-foreground font-normal rounded-tr-xs'
                        : 'bg-card border border-border/80 text-foreground rounded-tl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-border/50 text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground/90 font-serif text-xs">
                          AI Chef
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground/80">
                          Culinary Intelligence
                        </span>
                      </div>
                    )}

                    {!isUser ? (
                      renderMessageContent(msg.content, msg.recipeReferences)
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</p>
                    )}

                    {!isUser && (
                      <div className="flex items-center justify-end gap-2 pt-2.5 mt-3 border-t border-border/50 text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, idx)}
                          className="relative flex items-center gap-1.5 text-xs hover:text-foreground p-1.5 rounded-lg hover:bg-muted/60 transition-colors after:absolute after:-inset-1.5 after:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          title="Copy response"
                          aria-label="Copy response"
                        >
                          {copiedIndex === idx ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                                Copied
                              </span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              <span className="text-[11px]">Copy</span>
                            </>
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
            <div aria-live="polite" className="flex gap-3 text-sm justify-start animate-in fade-in-50 duration-300">
              <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20 shadow-2xs">
                <ChefHat className="h-4 w-4 animate-pulse" />
              </div>
              <div className="bg-card border border-border/80 rounded-2xl rounded-tl-xs p-4 shadow-2xs flex items-center gap-3 text-muted-foreground text-xs">
                <div className="flex gap-1" aria-hidden="true">
                  <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" />
                </div>
                <span className="font-medium text-foreground/80">Chef is reviewing your recipes & culinary archives…</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div role="alert" className="flex items-center gap-3 p-3.5 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs shadow-2xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p className="flex-1 font-medium">{error}</p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="relative hover:underline font-semibold p-1 after:absolute after:-inset-2 after:content-[''] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive rounded"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Dock */}
        <div className="p-3 sm:p-4 border-t border-border bg-card/70 backdrop-blur-md">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-end gap-2.5 max-w-4xl mx-auto"
          >
            <div className="relative flex-1 rounded-xl border border-border bg-background shadow-2xs focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
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
                className="w-full resize-none border-0 bg-transparent py-2.5 px-3.5 text-xs sm:text-sm focus-visible:ring-0 shadow-none min-h-[44px] max-h-32 text-foreground placeholder:text-muted-foreground/70"
                aria-label="Message to AI Chef"
              />
            </div>

            <Button
              type="submit"
              size="icon"
              disabled={!inputMessage.trim() || isSending}
              className="h-[44px] w-[44px] shrink-0 rounded-xl font-medium shadow-2xs transition-all disabled:opacity-40"
              aria-label="Send message to AI Chef"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center mt-2.5">
            Chef answers from your saved recipes & culinary science. Never shares your data.
          </p>
        </div>
      </div>
    </div>
  )
}
