/**
 * Utility for dynamically scaling recipe ingredient quantities based on serving adjustments.
 * Supports integers, decimals, simple fractions (1/2), and mixed fractions (1 1/2).
 * Preserves non-numeric text and notes unmodified.
 */

const FRACTIONS: [number, string][] = [
  [1 / 8, '1/8'],
  [1 / 4, '1/4'],
  [1 / 3, '1/3'],
  [3 / 8, '3/8'],
  [1 / 2, '1/2'],
  [5 / 8, '5/8'],
  [2 / 3, '2/3'],
  [3 / 4, '3/4'],
  [7 / 8, '7/8'],
]

/**
 * Converts a decimal value to a clean cooking fraction string if close enough,
 * or formats to 1 or 2 decimal places.
 */
function formatNumberToCookingAmount(value: number): string {
  if (value <= 0) return '0'

  // If very close to an integer
  const roundedInt = Math.round(value)
  if (Math.abs(value - roundedInt) < 0.02) {
    return roundedInt.toString()
  }

  const whole = Math.floor(value)
  const remainder = value - whole

  // Check if remainder matches a standard cooking fraction
  for (const [fracVal, fracStr] of FRACTIONS) {
    if (Math.abs(remainder - fracVal) < 0.035) {
      return whole > 0 ? `${whole} ${fracStr}` : fracStr
    }
  }

  // If close to next whole number after checking fractions
  if (Math.abs(remainder - 1) < 0.035) {
    return (whole + 1).toString()
  }

  // Fallback to formatted decimal with at most 2 decimal places without trailing zeros
  const rounded = Math.round(value * 100) / 100
  return rounded.toString()
}

/**
 * Parses a string representation of a quantity into a float.
 * Returns null if the quantity is non-numeric (e.g. "to taste").
 */
function parseQuantity(raw: string): { value: number; trailingText: string } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // 1. Mixed fraction: "1 1/2" or "2  3/4"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)(.*)$/)
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10)
    const num = parseInt(mixedMatch[2], 10)
    const den = parseInt(mixedMatch[3], 10)
    if (den !== 0) {
      return {
        value: whole + num / den,
        trailingText: mixedMatch[4]?.trim() ?? '',
      }
    }
  }

  // 2. Simple fraction: "1/2" or "3/4"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)(.*)$/)
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10)
    const den = parseInt(fracMatch[2], 10)
    if (den !== 0) {
      return {
        value: num / den,
        trailingText: fracMatch[3]?.trim() ?? '',
      }
    }
  }

  // 3. Decimal or integer: "2", "2.5", "250"
  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)(.*)$/)
  if (decimalMatch) {
    const val = parseFloat(decimalMatch[1])
    if (!isNaN(val)) {
      return {
        value: val,
        trailingText: decimalMatch[2]?.trim() ?? '',
      }
    }
  }

  return null
}

/**
 * Scales an ingredient quantity from base servings to target servings.
 *
 * @example
 * scaleQuantity("2", 2, 4) // "4"
 * scaleQuantity("250", 2, 4) // "500"
 * scaleQuantity("1/2", 2, 4) // "1"
 * scaleQuantity("1 1/2", 2, 4) // "3"
 * scaleQuantity("to taste", 2, 4) // "to taste"
 */
export function scaleQuantity(
  quantity: string | null | undefined,
  baseServings: number | null | undefined,
  targetServings: number
): string {
  if (!quantity) return ''
  if (!baseServings || baseServings <= 0 || targetServings <= 0 || baseServings === targetServings) {
    return quantity
  }

  const parsed = parseQuantity(quantity)
  if (!parsed) {
    // Non-numeric like "to taste", "pinch" — return as is
    return quantity
  }

  const factor = targetServings / baseServings
  const scaledValue = parsed.value * factor
  const formatted = formatNumberToCookingAmount(scaledValue)

  if (parsed.trailingText) {
    return `${formatted} ${parsed.trailingText}`
  }

  return formatted
}
