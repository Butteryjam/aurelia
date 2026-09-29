'use client'

import { useState } from 'react'
import { Heart } from 'lucide-react'
import { toggleFavorite } from '@/features/recipes/actions'
import { cn } from '@/lib/utils'

interface FavoriteButtonProps {
  recipeId: string
  initialFavorite?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
}

export function FavoriteButton({
  recipeId,
  initialFavorite = false,
  className,
  size = 'md',
}: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(initialFavorite)
  const [isPending, setIsPending] = useState(false)

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (isPending) return

    // Optimistic update
    const previous = isFav
    setIsFav(!previous)
    setIsPending(true)

    try {
      const res = await toggleFavorite(recipeId)
      if (res.error) {
        // Rollback on error
        setIsFav(previous)
        console.error('Failed to toggle favorite:', res.error)
      } else if (res.data) {
        setIsFav(res.data.isFavorite)
      }
    } catch (err) {
      // Rollback on network/exception
      setIsFav(previous)
      console.error('Favorite error:', err)
    } finally {
      setIsPending(false)
    }
  }

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const btnSizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-10 w-10',
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      aria-pressed={isFav}
      className={cn(
        'relative inline-flex items-center justify-center rounded-full transition-all duration-200 active:scale-90',
        'bg-background/85 dark:bg-card/85 backdrop-blur-md border border-border/50 shadow-xs hover:bg-background dark:hover:bg-card',
        'after:absolute after:-inset-2 after:content-[\'\']',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        isFav ? 'text-rose-500 hover:text-rose-600' : 'text-muted-foreground hover:text-foreground',
        btnSizes[size],
        className
      )}
    >
      <Heart
        className={cn(
          iconSizes[size],
          'transition-transform duration-200',
          isFav && 'fill-current scale-110'
        )}
      />
    </button>
  )
}
