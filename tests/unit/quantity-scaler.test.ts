import { describe, it, expect } from 'vitest'
import { scaleQuantity } from '@/lib/utils/quantity-scaler'

describe('scaleQuantity - Recipe Quantity Scaling', () => {
  describe('Normal cases & integer scaling', () => {
    it('scales up an integer quantity correctly', () => {
      expect(scaleQuantity('2', 2, 4)).toBe('4')
      expect(scaleQuantity('1', 1, 3)).toBe('3')
      expect(scaleQuantity('250', 2, 4)).toBe('500')
    })

    it('scales down an integer quantity correctly', () => {
      expect(scaleQuantity('4', 4, 2)).toBe('2')
      expect(scaleQuantity('6', 3, 1)).toBe('2')
    })

    it('returns original quantity when base and target servings are equal', () => {
      expect(scaleQuantity('3', 4, 4)).toBe('3')
      expect(scaleQuantity('1 1/2', 2, 2)).toBe('1 1/2')
      expect(scaleQuantity('to taste', 4, 4)).toBe('to taste')
    })
  })

  describe('Fractions and mixed fractions', () => {
    it('scales simple fractions accurately', () => {
      // 1/2 scaled x2 -> 1
      expect(scaleQuantity('1/2', 2, 4)).toBe('1')
      // 1/4 scaled x2 -> 1/2
      expect(scaleQuantity('1/4', 2, 4)).toBe('1/2')
      // 3/4 scaled x2 -> 1 1/2
      expect(scaleQuantity('3/4', 2, 4)).toBe('1 1/2')
      // 1/3 scaled x2 -> 2/3
      expect(scaleQuantity('1/3', 2, 4)).toBe('2/3')
    })

    it('scales mixed fractions accurately', () => {
      // 1 1/2 scaled x2 -> 3
      expect(scaleQuantity('1 1/2', 2, 4)).toBe('3')
      // 2 1/2 scaled x2 -> 5
      expect(scaleQuantity('2 1/2', 2, 4)).toBe('5')
      // 1 1/4 scaled x2 -> 2 1/2
      expect(scaleQuantity('1 1/4', 2, 4)).toBe('2 1/2')
    })

    it('formats fractional values to standard cooking amounts', () => {
      // 1 scaled x 0.5 -> 1/2
      expect(scaleQuantity('1', 4, 2)).toBe('1/2')
      // 1 scaled x 0.25 -> 1/4
      expect(scaleQuantity('1', 4, 1)).toBe('1/4')
      // 1 scaled x 0.75 -> 3/4
      expect(scaleQuantity('1', 4, 3)).toBe('3/4')
      // 1 scaled x 0.125 -> 1/8
      expect(scaleQuantity('1', 8, 1)).toBe('1/8')
    })
  })

  describe('Decimals and unusual values', () => {
    it('scales decimal quantities properly', () => {
      expect(scaleQuantity('1.5', 2, 4)).toBe('3')
      expect(scaleQuantity('0.5', 2, 4)).toBe('1')
      expect(scaleQuantity('2.25', 1, 2)).toBe('4 1/2')
    })

    it('handles decimal values without standard fractional equivalents', () => {
      // 0.7 * (3/2) = 1.05
      const res = scaleQuantity('0.7', 2, 3)
      expect(res).toBe('1.05')
    })
  })

  describe('Invalid, null, and empty inputs', () => {
    it('returns empty string for null, undefined, or empty quantity', () => {
      expect(scaleQuantity('', 2, 4)).toBe('')
      expect(scaleQuantity(null, 2, 4)).toBe('')
      expect(scaleQuantity(undefined, 2, 4)).toBe('')
    })

    it('returns original string when baseServings is invalid or <= 0', () => {
      expect(scaleQuantity('2', 0, 4)).toBe('2')
      expect(scaleQuantity('2', -1, 4)).toBe('2')
      expect(scaleQuantity('2', null, 4)).toBe('2')
      expect(scaleQuantity('2', undefined, 4)).toBe('2')
    })

    it('returns original string when targetServings is invalid or <= 0', () => {
      expect(scaleQuantity('2', 2, 0)).toBe('2')
      expect(scaleQuantity('2', 2, -2)).toBe('2')
    })
  })

  describe('Non-numeric descriptions and trailing notes', () => {
    it('preserves culinary qualitative terms unmodified', () => {
      expect(scaleQuantity('to taste', 2, 4)).toBe('to taste')
      expect(scaleQuantity('pinch', 2, 4)).toBe('pinch')
      expect(scaleQuantity('a handful', 2, 4)).toBe('a handful')
      expect(scaleQuantity('freshly cracked', 2, 4)).toBe('freshly cracked')
    })

    it('preserves trailing descriptive text when scaling', () => {
      expect(scaleQuantity('2 cups', 2, 4)).toBe('4 cups')
      expect(scaleQuantity('1/2 tsp', 2, 4)).toBe('1 tsp')
    })
  })
})
