/**
 * Pure draft storage, key management, and hydration-safe external store utilities
 * for RecipeForm autosave and recovery.
 */

export interface RecipeFormData {
  title: string
  description: string
  imageUrl: string
  prepTime: number | ''
  cookTime: number | ''
  servings: number | ''
  difficulty: 'easy' | 'medium' | 'hard' | ''
  cuisine: string
  category: string
  notes: string
  tags: string[]
  ingredients: {
    id?: string
    name: string
    quantity: string
    unit: string
    preparationNote: string
    isOptional: boolean
    orderIndex: number
  }[]
  instructions: {
    id?: string
    stepNumber: number
    instruction: string
    timerDuration: number | ''
  }[]
}

export type RecipeDraftPayload = RecipeFormData & { _userId?: string }

export const draftListeners = new Set<() => void>()

export function subscribeDraft(callback: () => void) {
  draftListeners.add(callback)
  const onStorage = (e: StorageEvent) => {
    if (e.key && e.key.includes('recipe_draft')) {
      callback()
    }
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
  }
  return () => {
    draftListeners.delete(callback)
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', onStorage)
    }
  }
}

export function notifyDraftChange() {
  draftListeners.forEach((listener) => {
    try {
      listener()
    } catch {
      // ignore
    }
  })
}

export function getUserDraftKey(userId: string, recipeId?: string): string {
  return `recipe_draft_${userId}_${recipeId ?? 'new'}`
}

export function getLegacyDraftKey(recipeId?: string): string {
  return `recipe_draft_${recipeId ?? 'new'}`
}

/**
 * Server snapshot for useSyncExternalStore: always false.
 */
export const draftServerSnapshot = (): boolean => false

/**
 * Reads an autosaved draft for the authenticated user according to strict security rules:
 * 1. User-scoped draft recognized (`recipe_draft_${userId}_${recipeId}`)
 * 2. Unscoped draft without _userId rejected
 * 3. Mismatched legacy _userId rejected
 * 4. Matching legacy _userId accepted (read-only migration compatibility)
 */
export function readSavedDraft(
  userId: string | null,
  recipeId?: string
): { data: RecipeDraftPayload; key: string } | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const userKey = getUserDraftKey(userId, recipeId)
    // 1. Prefer user-scoped key whenever it exists
    const savedUser = localStorage.getItem(userKey)
    if (savedUser) {
      const parsed = JSON.parse(savedUser)
      if (
        parsed &&
        (parsed.title ||
          parsed.description ||
          parsed.ingredients?.some((i: { name?: string }) => Boolean(i?.name)))
      ) {
        return { data: parsed, key: userKey }
      }
    }

    // 2. Read-only legacy migration compatibility:
    // Only accept legacy key if it contains _userId and that value exactly matches the authenticated user.
    // Never restore an unscoped legacy draft when _userId is absent.
    const legacyKey = getLegacyDraftKey(recipeId)
    const savedLegacy = localStorage.getItem(legacyKey)
    if (savedLegacy) {
      const parsed = JSON.parse(savedLegacy)
      if (
        parsed &&
        parsed._userId === userId &&
        (parsed.title ||
          parsed.description ||
          parsed.ingredients?.some((i: { name?: string }) => Boolean(i?.name)))
      ) {
        return { data: parsed, key: legacyKey }
      }
    }
  } catch {
    return null
  }
  return null
}
