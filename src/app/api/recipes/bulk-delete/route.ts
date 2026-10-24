import { NextResponse } from 'next/server'
import { authenticateMobileRequest } from '@/lib/supabase/mobile-auth'
import { cleanupRecipeImages } from '@/features/recipes/utils/storage'

export async function POST(request: Request) {
  return handleBulkDelete(request)
}

export async function DELETE(request: Request) {
  return handleBulkDelete(request)
}

async function handleBulkDelete(request: Request) {
  const auth = await authenticateMobileRequest(request)
  if (auth.error || !auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error || 'Unauthorized' }, { status: 401 })
  }

  const { user, supabase } = auth

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON request body.' }, { status: 400 })
  }

  const ids = (body as { ids?: unknown })?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'No recipes selected for deletion.' }, { status: 400 })
  }

  const uniqueIds = Array.from(
    new Set(ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  )

  if (uniqueIds.length === 0) {
    return NextResponse.json({ error: 'No valid recipes selected for deletion.' }, { status: 400 })
  }

  if (uniqueIds.length > 100) {
    return NextResponse.json({ error: 'Cannot delete more than 100 recipes at once.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('recipes')
    .delete()
    .in('id', uniqueIds)
    .eq('user_id', user.id)
    .select('id, image_url')

  if (error) {
    console.error('[bulk-delete] Delete error:', error)
    return NextResponse.json({ error: 'Could not delete selected recipes.' }, { status: 500 })
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: 'No matching recipes found to delete or permission denied.' },
      { status: 404 }
    )
  }

  const imageUrls = data.map((r) => r.image_url).filter(Boolean)
  if (imageUrls.length > 0) {
    await cleanupRecipeImages(supabase, imageUrls)
  }

  return NextResponse.json({
    data: {
      success: true,
      count: data.length,
      deletedIds: data.map((r) => r.id),
    },
  })
}
