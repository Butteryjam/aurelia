import { describe, it, expect } from 'vitest'
import { consolidateItems, type ShoppingItem } from '@/lib/utils/shopping-consolidator'

describe('consolidateItems - Shopping List Consolidation & Unit Normalization', () => {
  describe('Standard consolidation and compatible units', () => {
    it('consolidates items with identical names and canonical units', () => {
      const items: ShoppingItem[] = [
        { name: 'all-purpose flour', quantity: '2', unit: 'cup', category: 'baking', recipeId: 'r1', recipeTitle: 'Pancakes' },
        { name: 'all-purpose flour', quantity: '1', unit: 'cup', category: 'baking', recipeId: 'r2', recipeTitle: 'Muffins' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(1)
      expect(consolidated[0].name.toLowerCase()).toBe('all-purpose flour')
      expect(consolidated[0].quantity).toBe('3')
      expect(consolidated[0].unit).toBe('cup')
      expect(consolidated[0].recipeIds).toEqual(['r1', 'r2'])
      expect(consolidated[0].recipeAttributions).toEqual(['Pancakes', 'Muffins'])
    })

    it('consolidates case-insensitively with unit aliases', () => {
      const items: ShoppingItem[] = [
        { name: 'Olive Oil', quantity: '2', unit: 'tbsp', category: 'pantry', recipeId: 'r1' },
        { name: 'olive oil', quantity: '1', unit: 'tablespoons', category: 'pantry', recipeId: 'r2' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(1)
      expect(consolidated[0].quantity).toBe('3')
      // canonical unit for tbsp / tablespoons is tbsp
      expect(consolidated[0].recipeIds).toEqual(['r1', 'r2'])
    })

    it('consolidates metric weight aliases (g and grams)', () => {
      const items: ShoppingItem[] = [
        { name: 'Chicken Breast', quantity: '250', unit: 'g', category: 'meat', recipeId: 'r1' },
        { name: 'chicken breast', quantity: '250', unit: 'grams', category: 'meat', recipeId: 'r2' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(1)
      expect(consolidated[0].quantity).toBe('500')
    })

    it('consolidates fractional quantities accurately', () => {
      const items: ShoppingItem[] = [
        { name: 'Butter', quantity: '1/2', unit: 'cup', category: 'dairy', recipeId: 'r1' },
        { name: 'butter', quantity: '1/2', unit: 'cup', category: 'dairy', recipeId: 'r2' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(1)
      expect(consolidated[0].quantity).toBe('1')
    })
  })

  describe('Incompatible units safety contracts', () => {
    it('never merges items with different unit families (volume vs weight)', () => {
      const items: ShoppingItem[] = [
        { name: 'Sugar', quantity: '1', unit: 'cup', category: 'baking', recipeId: 'r1' },
        { name: 'Sugar', quantity: '200', unit: 'g', category: 'baking', recipeId: 'r2' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(2)
      expect(consolidated.map((c) => c.unit)).toContain('cup')
      expect(consolidated.map((c) => c.unit)).toContain('g')
    })

    it('never merges items with count/piece vs weight/volume', () => {
      const items: ShoppingItem[] = [
        { name: 'Tomatoes', quantity: '2', unit: 'can', category: 'produce', recipeId: 'r1' },
        { name: 'Tomatoes', quantity: '500', unit: 'g', category: 'produce', recipeId: 'r2' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(2)
    })

    it('keeps items separate when unit is unknown or missing', () => {
      const items: ShoppingItem[] = [
        { name: 'Eggs', quantity: '2', unit: null, category: 'dairy', recipeId: 'r1' },
        { name: 'Eggs', quantity: '4', unit: null, category: 'dairy', recipeId: 'r2' },
      ]

      const consolidated = consolidateItems(items)
      // Safety rule 3: Items with NO unit are kept separate to avoid ambiguous unit assumptions
      expect(consolidated).toHaveLength(2)
    })

    it('keeps items separate when quantities are non-numeric', () => {
      const items: ShoppingItem[] = [
        { name: 'Salt', quantity: 'pinch', unit: 'tsp', category: 'spices', recipeId: 'r1' },
        { name: 'Salt', quantity: '1/2', unit: 'tsp', category: 'spices', recipeId: 'r2' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(2)
    })
  })

  describe('Multiple recipes & attribution integrity', () => {
    it('deduplicates recipeIds and attributions correctly across multiple merges', () => {
      const items: ShoppingItem[] = [
        { name: 'Garlic', quantity: '2', unit: 'clove', category: 'produce', recipeId: 'r1', recipeTitle: 'Pasta' },
        { name: 'Garlic', quantity: '3', unit: 'cloves', category: 'produce', recipeId: 'r2', recipeTitle: 'Stir Fry' },
        { name: 'garlic', quantity: '1', unit: 'clove', category: 'produce', recipeId: 'r1', recipeTitle: 'Pasta' },
      ]

      const consolidated = consolidateItems(items)
      expect(consolidated).toHaveLength(1)
      expect(consolidated[0].quantity).toBe('6')
      expect(consolidated[0].recipeIds).toEqual(['r1', 'r2'])
      expect(consolidated[0].recipeAttributions).toEqual(['Pasta', 'Stir Fry'])
    })

    it('handles empty input gracefully', () => {
      expect(consolidateItems([])).toEqual([])
    })
  })
})
