'use client'

import { useTransition, useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export interface ActiveFilters {
  q: string
  category: string
  cuisine: string
  difficulty: string
  maxTime: number | null
  tag: string
  favorite: boolean
  sort: string
}

export function useRecipeFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Read current URL params
  const currentQ = searchParams.get('q') ?? ''
  const currentCategory = searchParams.get('category') ?? ''
  const currentCuisine = searchParams.get('cuisine') ?? ''
  const currentDifficulty = searchParams.get('difficulty') ?? ''
  const currentMaxTime = searchParams.get('maxTime') ? parseInt(searchParams.get('maxTime')!, 10) : null
  const currentTag = searchParams.get('tag') ?? ''
  const currentFavorite = searchParams.get('favorite') === 'true'
  const currentSort = searchParams.get('sort') ?? 'newest'

  // Local state for instant input response before debounce
  const [prevQ, setPrevQ] = useState(currentQ)
  const [searchInput, setSearchInput] = useState(currentQ)

  // Synchronize local input if URL changes externally
  if (prevQ !== currentQ) {
    setPrevQ(currentQ)
    setSearchInput(currentQ)
  }

  // Count active non-default filters (excluding sort)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentCategory && currentCategory !== 'all') count++
    if (currentCuisine && currentCuisine !== 'all') count++
    if (currentDifficulty) count++
    if (currentMaxTime && currentMaxTime > 0) count++
    if (currentTag) count++
    if (currentFavorite) count++
    return count
  }, [
    currentCategory,
    currentCuisine,
    currentDifficulty,
    currentMaxTime,
    currentTag,
    currentFavorite,
  ])

  // Helper to push updated params to URL
  const updateUrl = useCallback(
    (updates: Partial<Record<string, string | null>>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '' || value === 'all' || value === 'false') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      startTransition(() => {
        const queryString = params.toString()
        router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false })
      })
    },
    [pathname, router, searchParams]
  )

  // Debounced search sync to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== currentQ) {
        updateUrl({ q: searchInput.trim() || null })
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchInput, currentQ, updateUrl])

  const setCategory = (category: string) => updateUrl({ category })
  const setCuisine = (cuisine: string) => updateUrl({ cuisine })
  const setDifficulty = (difficulty: string) => updateUrl({ difficulty })
  const setMaxTime = (maxTime: number | null) =>
    updateUrl({ maxTime: maxTime ? maxTime.toString() : null })
  const setTag = (tag: string) => updateUrl({ tag })
  const setFavorite = (favorite: boolean) => updateUrl({ favorite: favorite ? 'true' : null })
  const setSort = (sort: string) => updateUrl({ sort: sort === 'newest' ? null : sort })

  const clearFilters = () => {
    setSearchInput('')
    updateUrl({
      q: null,
      category: null,
      cuisine: null,
      difficulty: null,
      maxTime: null,
      tag: null,
      favorite: null,
    })
  }

  return {
    filters: {
      q: searchInput,
      category: currentCategory,
      cuisine: currentCuisine,
      difficulty: currentDifficulty,
      maxTime: currentMaxTime,
      tag: currentTag,
      favorite: currentFavorite,
      sort: currentSort,
    },
    isPending,
    activeFilterCount,
    setSearchInput,
    setCategory,
    setCuisine,
    setDifficulty,
    setMaxTime,
    setTag,
    setFavorite,
    setSort,
    clearFilters,
  }
}
