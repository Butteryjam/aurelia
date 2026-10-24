import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'
import { deleteRecipe, bulkDeleteRecipes } from '@/features/recipes/actions'
import { extractRecipeImagePath, cleanupRecipeImages } from '@/features/recipes/utils/storage'
import { DeleteRecipeDialog } from '@/features/recipes/components/delete-recipe-dialog'
import { BulkDeleteDialog } from '@/features/recipes/components/bulk-delete-dialog'
import { DELETE as singleDeleteApi } from '@/app/api/recipes/[id]/route'
import { POST as bulkDeleteApi } from '@/app/api/recipes/bulk-delete/route'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/recipes',
}))

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock @radix-ui/react-dialog Portal for SSR rendering in vitest
vi.mock('@radix-ui/react-dialog', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@radix-ui/react-dialog')>()
  return {
    ...actual,
    Portal: ({ children }: any) => <>{children}</>,
  }
})

// Mock Supabase server client
const mockGetUser = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockIn = vi.fn()
const mockSelect = vi.fn()
const mockStorageRemove = vi.fn()

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(() => ({
    delete: mockDelete,
  })),
  storage: {
    from: vi.fn(() => ({
      remove: mockStorageRemove,
    })),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// Mock mobile-auth for API routes
const mockMobileAuth = vi.fn()
vi.mock('@/lib/supabase/mobile-auth', () => ({
  authenticateMobileRequest: vi.fn((req) => mockMobileAuth(req)),
}))

describe('Recipe Deletion & Bulk Deletion Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default authenticated user
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-aurelia-1' } },
    })

    // Setup chained delete query
    mockSelect.mockResolvedValue({
      data: [{ id: 'recipe-1', image_url: 'https://example.supabase.co/storage/v1/object/public/recipe-images/user-aurelia-1/photo.jpg' }],
      error: null,
    })
    mockEq.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
    })
    mockIn.mockReturnValue({
      eq: mockEq,
      select: mockSelect,
    })
    mockDelete.mockReturnValue({
      eq: mockEq,
      in: mockIn,
      select: mockSelect,
    })

    mockStorageRemove.mockResolvedValue({ data: [], error: null })
  })

  describe('Storage Image Cleanup Helper', () => {
    it('extracts storage paths correctly from Aurelia public image URLs', () => {
      const url =
        'https://xyz.supabase.co/storage/v1/object/public/recipe-images/user-123/1700000000_pasta.jpg'
      const path = extractRecipeImagePath(url)
      expect(path).toBe('user-123/1700000000_pasta.jpg')
    })

    it('returns null for external images (Unsplash, etc.) and invalid inputs', () => {
      expect(extractRecipeImagePath('https://images.unsplash.com/photo-12345')).toBeNull()
      expect(extractRecipeImagePath('')).toBeNull()
      expect(extractRecipeImagePath(null)).toBeNull()
      expect(extractRecipeImagePath(undefined)).toBeNull()
    })

    it('cleans up valid storage paths without throwing on empty or external inputs', async () => {
      const client = {
        storage: {
          from: vi.fn(() => ({
            remove: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        },
      } as any

      await cleanupRecipeImages(client, [
        'https://xyz.supabase.co/storage/v1/object/public/recipe-images/user-1/img1.jpg',
        'https://images.unsplash.com/photo-external',
        null,
      ])

      expect(client.storage.from).toHaveBeenCalledWith('recipe-images')
    })
  })

  describe('Single-Recipe Deletion (Server Action)', () => {
    it('successfully deletes a recipe owned by authenticated user and cleans storage', async () => {
      const result = await deleteRecipe('recipe-1')

      expect(result).toEqual({ data: { success: true, id: 'recipe-1' } })
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'recipe-1')
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-aurelia-1')
      expect(mockStorageRemove).toHaveBeenCalledWith(['user-aurelia-1/photo.jpg'])
    })

    it('rejects unauthenticated requests with a safe error', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })

      const result = await deleteRecipe('recipe-1')
      expect(result).toEqual({ error: 'You must be signed in to delete a recipe.' })
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns permission denied / not found when user attempts to delete another user recipe', async () => {
      // Supabase RLS returns 0 deleted rows if not owned
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await deleteRecipe('recipe-other-user')
      expect(result).toEqual({
        error: 'Recipe not found or you do not have permission to delete it.',
      })
    })

    it('handles database deletion failure gracefully without throwing', async () => {
      mockSelect.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database connection failed' },
      })

      const result = await deleteRecipe('recipe-1')
      expect(result).toEqual({ error: 'Could not delete recipe.' })
    })
  })

  describe('Bulk Recipe Deletion (Server Action)', () => {
    it('successfully deletes multiple recipes owned by the user and reports exact count', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [
          { id: 'rec-1', image_url: 'https://xyz/recipe-images/u1/rec1.jpg' },
          { id: 'rec-2', image_url: 'https://xyz/recipe-images/u1/rec2.jpg' },
          { id: 'rec-3', image_url: null },
        ],
        error: null,
      })

      const result = await bulkDeleteRecipes(['rec-1', 'rec-2', 'rec-3'])

      expect(result.data).toEqual({
        success: true,
        count: 3,
        deletedIds: ['rec-1', 'rec-2', 'rec-3'],
      })
      expect(mockIn).toHaveBeenCalledWith('id', ['rec-1', 'rec-2', 'rec-3'])
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-aurelia-1')
      expect(mockStorageRemove).toHaveBeenCalledWith(['u1/rec1.jpg', 'u1/rec2.jpg'])
    })

    it('deduplicates recipe IDs and filters invalid IDs', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [{ id: 'rec-1', image_url: null }],
        error: null,
      })

      const result = await bulkDeleteRecipes(['rec-1', 'rec-1', '', '   '])
      expect(result.data?.count).toBe(1)
      expect(mockIn).toHaveBeenCalledWith('id', ['rec-1'])
    })

    it('rejects empty selections', async () => {
      const result = await bulkDeleteRecipes([])
      expect(result).toEqual({ error: 'No recipes selected for deletion.' })
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('rejects oversized batch deletion beyond limit of 100', async () => {
      const largeBatch = Array.from({ length: 105 }, (_, i) => `id-${i}`)
      const result = await bulkDeleteRecipes(largeBatch)
      expect(result).toEqual({ error: 'Cannot delete more than 100 recipes at once.' })
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('rejects unauthenticated bulk deletion requests', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } })
      const result = await bulkDeleteRecipes(['rec-1'])
      expect(result).toEqual({ error: 'You must be signed in to delete recipes.' })
      expect(mockDelete).not.toHaveBeenCalled()
    })

    it('returns permission denied / not found if no matching owned recipes exist', async () => {
      mockSelect.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await bulkDeleteRecipes(['rec-stranger-1', 'rec-stranger-2'])
      expect(result).toEqual({
        error: 'No matching recipes found to delete or permission denied.',
      })
    })
  })

  describe('REST API Endpoints (Mobile Support)', () => {
    it('DELETE /api/recipes/[id] deletes owned recipe and returns 200', async () => {
      mockMobileAuth.mockResolvedValueOnce({
        user: { id: 'user-mobile-1' },
        supabase: mockSupabase,
      })

      const request = new Request('http://localhost/api/recipes/rec-123', { method: 'DELETE' })
      const context = { params: Promise.resolve({ id: 'rec-123' }) }

      const response = await singleDeleteApi(request, context)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json).toEqual({ data: { success: true } })
    })

    it('DELETE /api/recipes/[id] returns 404 when recipe not found or unauthorized', async () => {
      mockMobileAuth.mockResolvedValueOnce({
        user: { id: 'user-mobile-1' },
        supabase: mockSupabase,
      })
      mockSelect.mockResolvedValueOnce({ data: [], error: null })

      const request = new Request('http://localhost/api/recipes/missing-id', { method: 'DELETE' })
      const context = { params: Promise.resolve({ id: 'missing-id' }) }

      const response = await singleDeleteApi(request, context)
      expect(response.status).toBe(404)
    })

    it('DELETE /api/recipes/[id] returns 401 when unauthenticated', async () => {
      mockMobileAuth.mockResolvedValueOnce({
        error: 'Unauthorized',
        user: null,
        supabase: null,
      })

      const request = new Request('http://localhost/api/recipes/rec-123', { method: 'DELETE' })
      const context = { params: Promise.resolve({ id: 'rec-123' }) }

      const response = await singleDeleteApi(request, context)
      expect(response.status).toBe(401)
    })

    it('POST /api/recipes/bulk-delete deletes owned batch and returns 200 with count', async () => {
      mockMobileAuth.mockResolvedValueOnce({
        user: { id: 'user-mobile-1' },
        supabase: mockSupabase,
      })
      mockSelect.mockResolvedValueOnce({
        data: [{ id: 'id-1', image_url: null }, { id: 'id-2', image_url: null }],
        error: null,
      })

      const request = new Request('http://localhost/api/recipes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['id-1', 'id-2'] }),
      })

      const response = await bulkDeleteApi(request)
      expect(response.status).toBe(200)
      const json = await response.json()
      expect(json.data.count).toBe(2)
      expect(json.data.deletedIds).toEqual(['id-1', 'id-2'])
    })

    it('POST /api/recipes/bulk-delete returns 400 for empty or invalid ids array', async () => {
      mockMobileAuth.mockResolvedValueOnce({
        user: { id: 'user-mobile-1' },
        supabase: mockSupabase,
      })

      const request = new Request('http://localhost/api/recipes/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [] }),
      })

      const response = await bulkDeleteApi(request)
      expect(response.status).toBe(400)
    })
  })

  describe('UI Confirmation Dialog Verification', () => {
    it('DeleteRecipeDialog displays exact title, message, and buttons as specified', () => {
      const html = renderToStaticMarkup(
        <DeleteRecipeDialog
          recipeId="rec-1"
          recipeTitle="Classic Carbonara"
          open={true}
        />
      )

      // Exact title specified in prompt: "Delete this recipe?"
      expect(html).toContain('Delete this recipe?')
      // Exact message: "This recipe will be permanently deleted. This action cannot be undone."
      expect(html).toContain('This recipe will be permanently deleted. This action cannot be undone.')
      // Exact buttons: "Cancel" and "Delete Recipe"
      expect(html).toContain('Cancel')
      expect(html).toContain('Delete Recipe')
    })

    it('BulkDeleteDialog displays exact title, message, and dynamic counts for multiple recipes', () => {
      const selected = [
        { id: '1', title: 'Tiramisu' },
        { id: '2', title: 'Panna Cotta' },
        { id: '3', title: 'Gelato' },
        { id: '4', title: 'Cannoli' },
        { id: '5', title: 'Affogato' },
      ]

      const html = renderToStaticMarkup(
        <BulkDeleteDialog
          open={true}
          onOpenChange={vi.fn()}
          selectedRecipes={selected}
        />
      )

      // Exact prompt example: "Delete 5 recipes?"
      expect(html).toContain('Delete 5 recipes?')
      // Exact prompt example: "The selected recipes will be permanently deleted. This action cannot be undone."
      expect(html).toContain('The selected recipes will be permanently deleted. This action cannot be undone.')
      // Exact button: "Delete 5 Recipes"
      expect(html).toContain('Delete 5 Recipes')
      expect(html).toContain('Cancel')
      // Summary list review of selected recipes
      expect(html).toContain('Tiramisu')
      expect(html).toContain('Affogato')
    })

    it('BulkDeleteDialog displays correct singular format for 1 recipe', () => {
      const selected = [{ id: '1', title: 'Tiramisu' }]

      const html = renderToStaticMarkup(
        <BulkDeleteDialog
          open={true}
          onOpenChange={vi.fn()}
          selectedRecipes={selected}
        />
      )

      expect(html).toContain('Delete 1 recipe?')
      expect(html).toContain('Delete 1 Recipe')
    })
  })
})
