-- =============================================================================
-- RecipeVault — Supabase Storage Setup Migration
-- =============================================================================
-- Configures the public `recipe-images` bucket for recipe food photography,
-- with file size limits, MIME type restrictions, and RLS policies.
-- =============================================================================

-- 1. Create the storage bucket if not already present
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-images',
  'recipe-images',
  true,
  5242880, -- 5 MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif'
  ];

-- 2. Storage Row Level Security Policies
-- Allow public viewing of recipe photos
CREATE POLICY "Public recipe images are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

-- Allow authenticated users to upload photos into their own folder (folder name matches auth.uid())
CREATE POLICY "Users can upload recipe images to their own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'recipe-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update/overwrite photos in their own folder
CREATE POLICY "Users can update recipe images in their own folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'recipe-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete photos in their own folder
CREATE POLICY "Users can delete recipe images from their own folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'recipe-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
