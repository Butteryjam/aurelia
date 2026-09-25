/**
 * Smart Shopping List Consolidator
 *
 * Safety contract (as specified in product requirements):
 * - ONLY consolidates items when units are *demonstrably compatible*.
 * - Never converts between unit families (volume ↔ weight, piece ↔ weight, etc.).
 * - When in doubt, keeps items separate and preserves recipe attribution.
 * - Items with no unit or incompatible units are never merged.
 */

import { scaleQuantity } from './quantity-scaler'

export interface ShoppingItem {
  name: string
  quantity: string | null
  unit: string | null
  category: string | null
  recipeId: string | null
  recipeTitle?: string
}

export interface ConsolidatedItem {
  name: string
  quantity: string | null
  unit: string | null
  category: string | null
  /** All recipe IDs that contributed to this item */
  recipeIds: string[]
  /** Human-readable recipe attributions */
  recipeAttributions: string[]
}

// ─── Unit normalization ───────────────────────────────────────────────────────
// Map common aliases to a canonical unit within each family.
// Items can ONLY be consolidated if they share the same canonical unit.

const UNIT_ALIASES: Record<string, string> = {
  // Volume – metric
  ml: 'ml',
  milliliter: 'ml',
  milliliters: 'ml',
  millilitre: 'ml',
  millilitres: 'ml',
  l: 'l',
  liter: 'l',
  liters: 'l',
  litre: 'l',
  litres: 'l',
  // Volume – imperial / US
  tsp: 'tsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tbsp: 'tbsp',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  'fluid oz': 'fl oz',
  'fl oz': 'fl oz',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  cup: 'cup',
  cups: 'cup',
  pint: 'pt',
  pints: 'pt',
  pt: 'pt',
  quart: 'qt',
  quarts: 'qt',
  qt: 'qt',
  gallon: 'gal',
  gallons: 'gal',
  gal: 'gal',
  // Weight – metric
  g: 'g',
  gram: 'g',
  grams: 'g',
  gramme: 'g',
  grammes: 'g',
  kg: 'kg',
  kilogram: 'kg',
  kilograms: 'kg',
  kilogramme: 'kg',
  kilogrammes: 'kg',
  // Weight – imperial
  oz: 'oz',
  ounce: 'oz',
  ounces: 'oz',
  lb: 'lb',
  lbs: 'lb',
  pound: 'lb',
  pounds: 'lb',
  // Count
  piece: 'piece',
  pieces: 'piece',
  slice: 'slice',
  slices: 'slice',
  whole: 'whole',
  can: 'can',
  cans: 'can',
  clove: 'clove',
  cloves: 'clove',
}

function normalizeUnit(raw: string | null | undefined): string | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase()
  return UNIT_ALIASES[key] ?? null // null = unknown unit → never consolidate
}

/**
 * Parse a quantity string to a float value, or null if non-numeric.
 * Re-uses the same parsing logic philosophy as quantity-scaler.ts but inline
 * to avoid cross-dependency issues.
 */
function parseQtyToFloat(qty: string | null | undefined): number | null {
  if (!qty) return null
  const s = qty.trim()

  // Mixed fraction: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) {
    const den = parseInt(mixed[3], 10)
    if (den === 0) return null
    return parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / den
  }

  // Simple fraction: "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) {
    const den = parseInt(frac[2], 10)
    if (den === 0) return null
    return parseInt(frac[1], 10) / den
  }

  // Integer or decimal
  const num = parseFloat(s)
  return isNaN(num) ? null : num
}

/**
 * Consolidate a flat list of shopping items (typically from one or more recipes).
 *
 * Consolidation rules:
 * 1. Items with the same name (case-insensitive) AND the same canonical unit → add quantities.
 * 2. Items with the same name but different / incompatible / unknown units → kept separate.
 * 3. Items with the same name and both have NO unit → kept separate (could mean different things).
 * 4. Recipe attribution is always preserved in the output.
 */
export function consolidateItems(items: ShoppingItem[]): ConsolidatedItem[] {
  // Key: `${normalizedName}||${canonicalUnit}`
  const map = new Map<string, ConsolidatedItem & { totalFloat: number | null }>()
  // Separate bucket for items that could NOT be consolidated (unknown unit / no unit / parse fail)
  const unmerged: ConsolidatedItem[] = []

  for (const item of items) {
    const normalizedName = item.name.trim().toLowerCase()
    const canonicalUnit = normalizeUnit(item.unit)

    // Only merge if both the name and the canonical unit are known and matching
    if (canonicalUnit !== null) {
      const key = `${normalizedName}||${canonicalUnit}`
      const existing = map.get(key)
      const parsed = parseQtyToFloat(item.quantity)

      if (existing) {
        // Merge: add quantity if both are numeric; otherwise concatenate or keep first
        if (parsed !== null && existing.totalFloat !== null) {
          existing.totalFloat += parsed
        } else {
          // At least one is non-numeric — cannot safely add; keep separate
          unmerged.push({
            name: item.name.trim(),
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            recipeIds: item.recipeId ? [item.recipeId] : [],
            recipeAttributions: item.recipeTitle ? [item.recipeTitle] : [],
          })
          continue
        }

        // Merge recipe attributions (deduplicate)
        if (item.recipeId && !existing.recipeIds.includes(item.recipeId)) {
          existing.recipeIds.push(item.recipeId)
        }
        if (item.recipeTitle && !existing.recipeAttributions.includes(item.recipeTitle)) {
          existing.recipeAttributions.push(item.recipeTitle)
        }
      } else {
        // New entry
        map.set(key, {
          name: item.name.trim(),
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          totalFloat: parsed,
          recipeIds: item.recipeId ? [item.recipeId] : [],
          recipeAttributions: item.recipeTitle ? [item.recipeTitle] : [],
        })
      }
    } else {
      // Unknown / no unit — never consolidate with other items
      unmerged.push({
        name: item.name.trim(),
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        recipeIds: item.recipeId ? [item.recipeId] : [],
        recipeAttributions: item.recipeTitle ? [item.recipeTitle] : [],
      })
    }
  }

  // Convert merged entries back to string quantities using the existing formatter
  const merged: ConsolidatedItem[] = Array.from(map.values()).map(
    ({ totalFloat, ...rest }) => ({
      ...rest,
      quantity:
        totalFloat !== null
          ? scaleQuantity(totalFloat.toString(), 1, 1) // format via existing utility
          : rest.quantity,
    })
  )

  return [...merged, ...unmerged]
}

/**
 * Conservative natural-language parser for manually typed shopping items.
 *
 * Examples of what it parses:
 *   "2 cups flour"           → { quantity: "2", unit: "cups", name: "flour" }
 *   "500g chicken breast"    → { quantity: "500", unit: "g", name: "chicken breast" }
 *   "1/2 tsp salt"           → { quantity: "1/2", unit: "tsp", name: "salt" }
 *   "eggs"                   → { quantity: null, unit: null, name: "eggs" }
 *   "some olive oil"         → preserved as-is (name: "some olive oil")
 *
 * If parsing is ambiguous, the entire raw string is preserved as the item name.
 */
export function parseManualItem(raw: string): {
  name: string
  quantity: string | null
  unit: string | null
} {
  const s = raw.trim()
  if (!s) return { name: s, quantity: null, unit: null }

  // Pattern: [optional quantity] [optional unit] [name]
  // Quantity: integer, decimal, simple fraction, mixed fraction
  const QTY = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`
  // Unit: match against known aliases only (conservative)
  const unitKeys = Object.keys(UNIT_ALIASES)
    .sort((a, b) => b.length - a.length) // longest first to avoid partial matches
    .map((k) => k.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'))
  const UNIT = unitKeys.join('|')

  const pattern = new RegExp(
    `^(${QTY})\\s*(${UNIT})(?:\\s+(.+))?$`,
    'i'
  )
  const match = s.match(pattern)

  if (match) {
    const [, qty, unit, rest] = match
    // If no remainder (just "2 cups"), treat as name = unit (unlikely but safe)
    const name = rest?.trim() || unit
    return {
      quantity: qty ?? null,
      unit: unit ?? null,
      name,
    }
  }

  // Fallback: try quantity-only prefix ("2 eggs")
  const qtyOnly = new RegExp(`^(${QTY})\\s+(.+)$`)
  const qMatch = s.match(qtyOnly)
  if (qMatch) {
    return {
      quantity: qMatch[1] ?? null,
      unit: null,
      name: qMatch[2]?.trim() ?? s,
    }
  }

  // Ambiguous — preserve entire string as name
  return { name: s, quantity: null, unit: null }
}
