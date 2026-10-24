import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Extracts the storage file path from an Aurelia recipe image URL.
 * Example URL: https://[project].supabase.co/storage/v1/object/public/recipe-images/[userId]/[fileName]
 * Returns: "[userId]/[fileName]"
 */
export function extractRecipeImagePath(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null
  const bucketMarker = '/recipe-images/'
  const idx = imageUrl.indexOf(bucketMarker)
  if (idx === -1) return null

  const path = imageUrl.substring(idx + bucketMarker.length).split('?')[0]
  if (!path) return null

  try {
    return decodeURIComponent(path)
  } catch {
    return path
  }
}

/**
 * Safely removes one or more images from the recipe-images bucket in Supabase storage.
 * Does not throw if the file does not exist or if the URL is external.
 */
export async function cleanupRecipeImages(
  supabase: SupabaseClient,
  imageUrls: Array<string | null | undefined>
): Promise<void> {
  const paths = imageUrls
    .map(extractRecipeImagePath)
    .filter((p): p is string => Boolean(p && p.trim()))

  if (paths.length === 0) return

  try {
    const { error } = await supabase.storage.from('recipe-images').remove(paths)
    if (error) {
      console.warn('[cleanupRecipeImages] Warning removing storage files:', error.message)
    }
  } catch (err) {
    console.warn('[cleanupRecipeImages] Exception removing storage files:', err)
  }
}
