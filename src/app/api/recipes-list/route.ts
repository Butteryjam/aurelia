import { NextResponse } from 'next/server'
import { getRecipes } from '@/features/recipes/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/recipes-list
 * Returns a lightweight list of the user's recipes for the shopping list dialog.
 */
export async function GET() {
  const recipes = await getRecipes({ sort: 'alpha' })
  return NextResponse.json(
    { recipes },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    }
  )
}

