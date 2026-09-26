import { describe, it, expect } from 'vitest'
import {
  isIngredientRowEmpty,
  isIngredientRowPartiallyCompleted,
  isInstructionRowEmpty,
  isInstructionRowPartiallyCompleted,
  pruneEmptyFormRows,
} from '@/features/recipes/utils/form-helpers'

describe('Recipe Form Row Pruning & Validation Helpers', () => {
  describe('isIngredientRowEmpty', () => {
    it('returns true when all fields are empty strings', () => {
      expect(
        isIngredientRowEmpty({
          name: '',
          quantity: '',
          unit: '',
          preparationNote: '',
        })
      ).toBe(true)
    })

    it('returns true when all fields only contain whitespace', () => {
      expect(
        isIngredientRowEmpty({
          name: '   ',
          quantity: '  ',
          unit: '\t',
          preparationNote: '\n',
        })
      ).toBe(true)
    })

    it('returns false when name is present', () => {
      expect(
        isIngredientRowEmpty({
          name: 'Sea Bass',
          quantity: '',
          unit: '',
          preparationNote: '',
        })
      ).toBe(false)
    })

    it('returns false when quantity is present but name is empty', () => {
      expect(
        isIngredientRowEmpty({
          name: '',
          quantity: '2',
          unit: '',
          preparationNote: '',
        })
      ).toBe(false)
    })

    it('returns false when unit is present but name is empty', () => {
      expect(
        isIngredientRowEmpty({
          name: '',
          quantity: '',
          unit: 'tbsp',
          preparationNote: '',
        })
      ).toBe(false)
    })

    it('returns false when preparationNote is present but name is empty', () => {
      expect(
        isIngredientRowEmpty({
          name: '',
          quantity: '',
          unit: '',
          preparationNote: 'finely minced',
        })
      ).toBe(false)
    })
  })

  describe('isIngredientRowPartiallyCompleted', () => {
    it('returns false when row is completely empty', () => {
      expect(
        isIngredientRowPartiallyCompleted({
          name: '',
          quantity: '',
          unit: '',
          preparationNote: '',
        })
      ).toBe(false)
    })

    it('returns false when row has a valid name and other fields', () => {
      expect(
        isIngredientRowPartiallyCompleted({
          name: 'Olive Oil',
          quantity: '2',
          unit: 'tbsp',
          preparationNote: 'extra virgin',
        })
      ).toBe(false)
    })

    it('returns true when name is missing but quantity is provided', () => {
      expect(
        isIngredientRowPartiallyCompleted({
          name: '',
          quantity: '500',
          unit: '',
          preparationNote: '',
        })
      ).toBe(true)
    })

    it('returns true when name is whitespace but unit and note are provided', () => {
      expect(
        isIngredientRowPartiallyCompleted({
          name: '   ',
          quantity: '',
          unit: 'grams',
          preparationNote: 'diced',
        })
      ).toBe(true)
    })
  })

  describe('isInstructionRowEmpty', () => {
    it('returns true when instruction text and timer are empty', () => {
      expect(
        isInstructionRowEmpty({
          instruction: '',
          timerDuration: '',
        })
      ).toBe(true)
    })

    it('returns true when instruction is whitespace and timer is empty or 0', () => {
      expect(
        isInstructionRowEmpty({
          instruction: '   ',
          timerDuration: '',
        })
      ).toBe(true)
      expect(
        isInstructionRowEmpty({
          instruction: '',
          timerDuration: null,
        })
      ).toBe(true)
    })

    it('returns false when instruction text is present', () => {
      expect(
        isInstructionRowEmpty({
          instruction: 'Preheat oven to 375F.',
          timerDuration: '',
        })
      ).toBe(false)
    })

    it('returns false when timerDuration is set even if instruction text is blank', () => {
      expect(
        isInstructionRowEmpty({
          instruction: '',
          timerDuration: 15,
        })
      ).toBe(false)
    })
  })

  describe('isInstructionRowPartiallyCompleted', () => {
    it('returns false when row is completely empty', () => {
      expect(
        isInstructionRowPartiallyCompleted({
          instruction: '',
          timerDuration: '',
        })
      ).toBe(false)
    })

    it('returns false when instruction text is filled', () => {
      expect(
        isInstructionRowPartiallyCompleted({
          instruction: 'Sear salmon skin side down.',
          timerDuration: 5,
        })
      ).toBe(false)
    })

    it('returns true when timerDuration is set but instruction text is empty', () => {
      expect(
        isInstructionRowPartiallyCompleted({
          instruction: '',
          timerDuration: 10,
        })
      ).toBe(true)
    })
  })

  describe('pruneEmptyFormRows', () => {
    it('prunes completely untouched ingredient and instruction rows while preserving filled rows', () => {
      const input = {
        ingredients: [
          {
            name: 'Salmon Fillet',
            quantity: '2',
            unit: 'pieces',
            preparationNote: 'skin on',
            isOptional: false,
            orderIndex: 0,
          },
          {
            name: '',
            quantity: '',
            unit: '',
            preparationNote: '',
            isOptional: false,
            orderIndex: 1,
          },
          {
            name: 'Rosemary',
            quantity: '1',
            unit: 'sprig',
            preparationNote: '',
            isOptional: false,
            orderIndex: 2,
          },
          {
            name: '   ',
            quantity: '  ',
            unit: '',
            preparationNote: '',
            isOptional: false,
            orderIndex: 3,
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: 'Season salmon generously with salt.',
            timerDuration: '' as const,
          },
          {
            stepNumber: 2,
            instruction: '',
            timerDuration: '' as const,
          },
          {
            stepNumber: 3,
            instruction: 'Sear in cast iron for 4 minutes.',
            timerDuration: 4,
          },
          {
            stepNumber: 4,
            instruction: '   ',
            timerDuration: '' as const,
          },
        ],
      }

      const result = pruneEmptyFormRows(input)

      // Pruned ingredients
      expect(result.ingredients).toHaveLength(2)
      expect(result.ingredients[0].name).toBe('Salmon Fillet')
      expect(result.ingredients[0].orderIndex).toBe(0)
      expect(result.ingredients[1].name).toBe('Rosemary')
      expect(result.ingredients[1].orderIndex).toBe(1)

      // Pruned instructions
      expect(result.instructions).toHaveLength(2)
      expect(result.instructions[0].instruction).toBe('Season salmon generously with salt.')
      expect(result.instructions[0].stepNumber).toBe(1)
      expect(result.instructions[1].instruction).toBe('Sear in cast iron for 4 minutes.')
      expect(result.instructions[1].stepNumber).toBe(2)
    })

    it('strictly preserves partially filled ingredient rows so user input is never silently discarded', () => {
      const input = {
        ingredients: [
          {
            name: '',
            quantity: '2',
            unit: 'cups',
            preparationNote: '',
            isOptional: false,
            orderIndex: 0,
          },
          {
            name: 'Flour',
            quantity: '1',
            unit: 'cup',
            preparationNote: '',
            isOptional: false,
            orderIndex: 1,
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: '',
            timerDuration: 20,
          },
        ],
      }

      const result = pruneEmptyFormRows(input)

      // Partially filled rows are preserved
      expect(result.ingredients).toHaveLength(2)
      expect(result.ingredients[0].quantity).toBe('2')
      expect(result.ingredients[0].name).toBe('')
      expect(isIngredientRowPartiallyCompleted(result.ingredients[0])).toBe(true)

      expect(result.instructions).toHaveLength(1)
      expect(result.instructions[0].timerDuration).toBe(20)
      expect(result.instructions[0].instruction).toBe('')
      expect(isInstructionRowPartiallyCompleted(result.instructions[0])).toBe(true)
    })

    it('handles all rows being completely empty', () => {
      const input = {
        ingredients: [
          {
            name: '',
            quantity: '',
            unit: '',
            preparationNote: '',
            isOptional: false,
            orderIndex: 0,
          },
          {
            name: '',
            quantity: '',
            unit: '',
            preparationNote: '',
            isOptional: false,
            orderIndex: 1,
          },
        ],
        instructions: [
          {
            stepNumber: 1,
            instruction: '',
            timerDuration: '' as const,
          },
          {
            stepNumber: 2,
            instruction: '',
            timerDuration: '' as const,
          },
        ],
      }

      const result = pruneEmptyFormRows(input)
      expect(result.ingredients).toHaveLength(0)
      expect(result.instructions).toHaveLength(0)
    })
  })
})
