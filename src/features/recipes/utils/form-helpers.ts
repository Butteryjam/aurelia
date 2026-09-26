/**
 * Form helper utilities for RecipeForm row pruning and validation.
 */

export interface FormIngredientRow {
  id?: string
  name: string
  quantity: string
  unit: string
  preparationNote: string
  isOptional: boolean
  orderIndex: number
}

export interface FormInstructionRow {
  id?: string
  stepNumber: number
  instruction: string
  timerDuration: number | ''
}

/**
 * Determines whether an ingredient row is completely untouched/empty.
 * A row is only considered empty if ALL user-enterable text fields
 * (name, quantity, unit, preparationNote) are blank after trimming.
 */
export function isIngredientRowEmpty(ing: {
  name?: string
  quantity?: string
  unit?: string
  preparationNote?: string
}): boolean {
  return (
    (!ing.name || !ing.name.trim()) &&
    (!ing.quantity || !ing.quantity.trim()) &&
    (!ing.unit || !ing.unit.trim()) &&
    (!ing.preparationNote || !ing.preparationNote.trim())
  )
}

/**
 * Determines whether an ingredient row is partially completed.
 * A row is partially completed if the name is blank, but other fields
 * (such as quantity, unit, or preparationNote) contain user input.
 */
export function isIngredientRowPartiallyCompleted(ing: {
  name?: string
  quantity?: string
  unit?: string
  preparationNote?: string
}): boolean {
  const hasName = Boolean(ing.name && ing.name.trim())
  const hasOtherContent = Boolean(
    (ing.quantity && ing.quantity.trim()) ||
    (ing.unit && ing.unit.trim()) ||
    (ing.preparationNote && ing.preparationNote.trim())
  )
  return !hasName && hasOtherContent
}

/**
 * Determines whether an instruction row is completely untouched/empty.
 * A row is only considered empty if instruction text is blank after trimming
 * AND timerDuration is empty / null / undefined / not greater than 0.
 */
export function isInstructionRowEmpty(ins: {
  instruction?: string
  timerDuration?: number | '' | null
}): boolean {
  const hasText = Boolean(ins.instruction && ins.instruction.trim())
  const hasTimer =
    ins.timerDuration !== '' &&
    ins.timerDuration !== null &&
    ins.timerDuration !== undefined &&
    typeof ins.timerDuration === 'number' &&
    ins.timerDuration > 0
  return !hasText && !hasTimer
}

/**
 * Determines whether an instruction row is partially completed.
 * e.g., timer duration is specified, but instruction text is blank.
 */
export function isInstructionRowPartiallyCompleted(ins: {
  instruction?: string
  timerDuration?: number | '' | null
}): boolean {
  const hasText = Boolean(ins.instruction && ins.instruction.trim())
  const hasTimer =
    ins.timerDuration !== '' &&
    ins.timerDuration !== null &&
    ins.timerDuration !== undefined &&
    typeof ins.timerDuration === 'number' &&
    ins.timerDuration > 0
  return !hasText && hasTimer
}

/**
 * Prunes completely untouched/empty ingredient and instruction rows before validation/submission.
 * Partially completed rows are strictly preserved so user input is never silently discarded.
 * Order indexes and step numbers are re-indexed consecutively.
 */
export function pruneEmptyFormRows<
  TIng extends { name: string; quantity: string; unit: string; preparationNote: string; isOptional: boolean; orderIndex: number },
  TIns extends { instruction: string; timerDuration: number | ''; stepNumber: number }
>(data: {
  ingredients: TIng[]
  instructions: TIns[]
}): {
  ingredients: TIng[]
  instructions: TIns[]
} {
  const ingredients = data.ingredients
    .filter((ing) => !isIngredientRowEmpty(ing))
    .map((ing, idx) => ({ ...ing, orderIndex: idx }))

  const instructions = data.instructions
    .filter((ins) => !isInstructionRowEmpty(ins))
    .map((ins, idx) => ({ ...ins, stepNumber: idx + 1 }))

  return {
    ingredients,
    instructions,
  }
}
