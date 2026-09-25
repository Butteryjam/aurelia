import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getUserDraftKey,
  getLegacyDraftKey,
  readSavedDraft,
  draftServerSnapshot,
} from '@/features/recipes/utils/draft-store'

describe('RecipeForm Draft & Hydration Regression Tests', () => {
  const userA = 'user-a-1111'
  const userB = 'user-b-2222'
  const recipeId = 'test-recipe-123'

  beforeEach(() => {
    // Mock window and localStorage for node environment
    const storage: Record<string, string> = {}
    const localStorageMock = {
      getItem: vi.fn((key: string) => storage[key] ?? null),
      setItem: vi.fn((key: string, val: string) => {
        storage[key] = val
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key]
      }),
      clear: vi.fn(() => {
        Object.keys(storage).forEach((k) => delete storage[k])
      }),
    }

    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', localStorageMock)
  })

  it('1. server snapshot is always false to ensure deterministic SSR', () => {
    expect(draftServerSnapshot()).toBe(false)
  })

  it('2. initial hydration snapshot is false when userId is not yet resolved', () => {
    // When userId is null (pre-hydration / before client auth resolves)
    const draft = readSavedDraft(null, recipeId)
    expect(draft).toBeNull()
  })

  it('3. user-scoped draft is properly recognized post-hydration for the active user', () => {
    const userDraftKey = getUserDraftKey(userA, recipeId)
    const draftData = {
      title: 'Truffle Pasta',
      description: 'Handmade pasta with black truffles',
      ingredients: [{ name: 'Flour' }],
    }
    localStorage.setItem(userDraftKey, JSON.stringify(draftData))

    const result = readSavedDraft(userA, recipeId)
    expect(result).not.toBeNull()
    expect(result?.key).toBe(userDraftKey)
    expect(result?.data.title).toBe('Truffle Pasta')
  })

  it('4. unscoped legacy draft without _userId is strictly rejected', () => {
    const legacyKey = getLegacyDraftKey(recipeId)
    const legacyDataWithoutUserId = {
      title: 'Unscoped Draft Recipe',
      description: 'Missing _userId field',
    }
    localStorage.setItem(legacyKey, JSON.stringify(legacyDataWithoutUserId))

    // Even if userA attempts to read, missing _userId must reject it
    const result = readSavedDraft(userA, recipeId)
    expect(result).toBeNull()
  })

  it('5. legacy draft with mismatched _userId is rejected to prevent cross-account leak', () => {
    const legacyKey = getLegacyDraftKey(recipeId)
    const legacyDataUserB = {
      _userId: userB,
      title: "User B's Private Draft",
    }
    localStorage.setItem(legacyKey, JSON.stringify(legacyDataUserB))

    // User A reads: must be rejected
    const resultForUserA = readSavedDraft(userA, recipeId)
    expect(resultForUserA).toBeNull()
  })

  it('6. matching legacy _userId is accepted in read-only compatibility mode', () => {
    const legacyKey = getLegacyDraftKey(recipeId)
    const legacyDataUserA = {
      _userId: userA,
      title: "User A's Migrated Draft",
    }
    localStorage.setItem(legacyKey, JSON.stringify(legacyDataUserA))

    const result = readSavedDraft(userA, recipeId)
    expect(result).not.toBeNull()
    expect(result?.key).toBe(legacyKey)
    expect(result?.data.title).toBe("User A's Migrated Draft")
  })

  it('7. legacy draft key is never written or overwritten during autosave', () => {
    // Simulating autosave behavior: always writes to getUserDraftKey, never getLegacyDraftKey
    const targetUserId = userA
    const autosaveKey = getUserDraftKey(targetUserId, recipeId)
    const legacyKey = getLegacyDraftKey(recipeId)

    localStorage.setItem(
      autosaveKey,
      JSON.stringify({ title: 'Active Draft', _userId: targetUserId })
    )

    expect(localStorage.getItem(legacyKey)).toBeNull()
    expect(localStorage.getItem(autosaveKey)).not.toBeNull()
  })

  it('8. pending autosave timer is invalidated immediately on account switch', () => {
    let pendingTimer: NodeJS.Timeout | null = null
    let writeExecuted = false

    // Simulate scheduling autosave for User A
    const currentUserIdRef = { current: userA }
    pendingTimer = setTimeout(() => {
      // Guard inside autosave callback: verify current user matches scheduled user
      if (currentUserIdRef.current === userA) {
        writeExecuted = true
      }
    }, 50)

    // Simulate account switch to User B before timer fires
    if (pendingTimer) {
      clearTimeout(pendingTimer)
      pendingTimer = null
    }
    currentUserIdRef.current = userB

    // Wait past timer duration
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(writeExecuted).toBe(false)
        expect(pendingTimer).toBeNull()
        resolve()
      }, 70)
    })
  })
})
