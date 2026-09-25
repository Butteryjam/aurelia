import { NextResponse } from 'next/server'
import { getRecipes } from '@/features/recipes/queries'

/**
 * GET /api/recipes-list
 * Returns a lightweight list of the user's recipes for the shopping list dialog.
 */
export async function GET() {
  const recipes = await getRecipes({ sort: 'alpha' })
  return NextResponse.json({ recipes })
}
