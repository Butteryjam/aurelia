'use client'

import { useState, useRef } from 'react'
import { SafeImage } from '@/components/shared/safe-image'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string) => void
  onRemove?: () => void
  className?: string
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']

export function ImageUpload({ value, onChange, onRemove, className = '' }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value ?? null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)

    // Validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Please upload a valid image file (JPEG, PNG, WebP, AVIF, or GIF).')
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setError('Image file size must be less than 5 MB.')
      return
    }

    // Local instant preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setIsUploading(true)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be signed in to upload an image.')
      }

      const fileExt = file.name.split('.').pop() || 'jpg'
      const cleanName = file.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
      const fileName = `${user.id}/${Date.now()}_${cleanName}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError || !data) {
        throw uploadError || new Error('Upload failed')
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('recipe-images').getPublicUrl(data.path)

      onChange(publicUrl)
      setPreview(publicUrl)
    } catch (err: unknown) {
      console.error('Image upload error:', err)
      setError(err instanceof Error ? err.message : 'Could not upload image. Please try again.')
      setPreview(value ?? null)
    } finally {
      setIsUploading(false)
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function handleRemove() {
    setPreview(null)
    onChange('')
    if (onRemove) onRemove()
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0])
          }
        }}
        disabled={isUploading}
      />

      {preview ? (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-muted">
          <SafeImage
            src={preview}
            alt="Recipe preview"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-muted/60 text-muted-foreground/40">
                <ImageIcon className="h-10 w-10" />
              </div>
            }
          />

          {isUploading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 text-white backdrop-blur-xs">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <span className="text-xs font-medium">Uploading image…</span>
            </div>
          )}

          {!isUploading && (
            <div className="absolute right-3 top-3 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-8 bg-background/80 backdrop-blur-sm hover:bg-background shadow-xs text-xs"
                onClick={() => fileInputRef.current?.click()}
              >
                Change photo
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="h-8 w-8 p-0 rounded-full shadow-xs"
                onClick={handleRemove}
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-primary bg-primary/5'
              : 'border-border/80 hover:border-primary/50 hover:bg-accent/40'
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {isUploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <ImageIcon className="h-6 w-6" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {isUploading ? 'Uploading…' : 'Click or drag a recipe photo here'}
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPEG, PNG, WebP up to 5 MB
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            className="mt-1 gap-1.5 text-xs"
          >
            <Upload className="h-3.5 w-3.5" />
            Select from computer
          </Button>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive font-medium">{error}</p>
      )}
    </div>
  )
}
