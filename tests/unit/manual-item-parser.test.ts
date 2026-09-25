import { describe, it, expect } from 'vitest'
import { parseManualItem } from '@/lib/utils/shopping-consolidator'

describe('parseManualItem - Manual Grocery Text Parsing', () => {
  describe('Standard quantity + unit + name', () => {
    it('parses integer quantity with unit and name', () => {
      const res = parseManualItem('2 cups flour')
      expect(res).toEqual({
        quantity: '2',
        unit: 'cups',
        name: 'flour',
      })
    })

    it('parses metric weight units with item name', () => {
      const res = parseManualItem('500g chicken breast')
      expect(res).toEqual({
        quantity: '500',
        unit: 'g',
        name: 'chicken breast',
      })
    })

    it('parses simple fraction quantity with unit', () => {
      const res = parseManualItem('1/2 tsp salt')
      expect(res).toEqual({
        quantity: '1/2',
        unit: 'tsp',
        name: 'salt',
      })
    })

    it('parses mixed fraction quantity with imperial unit', () => {
      const res = parseManualItem('1 1/2 lbs ground beef')
      expect(res).toEqual({
        quantity: '1 1/2',
        unit: 'lbs',
        name: 'ground beef',
      })
    })

    it('parses count units such as cloves and cans', () => {
      const cloves = parseManualItem('4 cloves garlic')
      expect(cloves).toEqual({
        quantity: '4',
        unit: 'cloves',
        name: 'garlic',
      })

      const cans = parseManualItem('2 cans diced tomatoes')
      expect(cans).toEqual({
        quantity: '2',
        unit: 'cans',
        name: 'diced tomatoes',
      })
    })
  })

  describe('Quantity + name without unit', () => {
    it('parses numeric count without unit', () => {
      const res = parseManualItem('2 eggs')
      expect(res).toEqual({
        quantity: '2',
        unit: null,
        name: 'eggs',
      })
    })

    it('parses fraction count without unit', () => {
      const res = parseManualItem('1/2 lemon')
      expect(res).toEqual({
        quantity: '1/2',
        unit: null,
        name: 'lemon',
      })
    })
  })

  describe('Item name only (no quantity or unit)', () => {
    it('preserves single item name', () => {
      const res = parseManualItem('olive oil')
      expect(res).toEqual({
        name: 'olive oil',
        quantity: null,
        unit: null,
      })
    })

    it('preserves multi-word pantry item', () => {
      const res = parseManualItem('balsamic vinegar of modena')
      expect(res).toEqual({
        name: 'balsamic vinegar of modena',
        quantity: null,
        unit: null,
      })
    })
  })

  describe('Ambiguous inputs and edge cases', () => {
    it('preserves qualitative descriptive inputs as name', () => {
      const res = parseManualItem('some fresh cilantro')
      expect(res).toEqual({
        name: 'some fresh cilantro',
        quantity: null,
        unit: null,
      })
    })

    it('handles empty or whitespace-only strings gracefully', () => {
      const empty = parseManualItem('')
      expect(empty).toEqual({ name: '', quantity: null, unit: null })

      const spaces = parseManualItem('   ')
      expect(spaces).toEqual({ name: '', quantity: null, unit: null })
    })

    it('trims excess leading/trailing whitespace cleanly', () => {
      const res = parseManualItem('   3 cups milk   ')
      expect(res).toEqual({
        quantity: '3',
        unit: 'cups',
        name: 'milk',
      })
    })
  })
})
