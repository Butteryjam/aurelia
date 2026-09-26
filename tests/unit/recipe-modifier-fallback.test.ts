import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  modifyRecipeWithAi,
  normalizeModifiedRecipeOutput,
} from '@/features/ai/services/modifier'
import {
  TOTAL_AI_BUDGET_MS,
  PRIMARY_TIMEOUT_MS,
  FALLBACK_TIMEOUT_MS,
} from '@/features/ai/services/ai-resilience'
import * as openaiClientModule from '@/features/ai/services/openai-client'
import * as retrieverModule from '@/features/ai/services/retriever'
import type { RecipeModificationInput } from '@/features/ai/types'

const MOCK_RECIPE_ID = '11111111-1111-4111-8111-111111111111'
const MOCK_USER_ID = 'user-test-uuid'

const MOCK_RECIPE_CONTEXT = {
  id: MOCK_RECIPE_ID,
  title: 'Classic Chicken Alfredo',
  cuisine: 'Italian',
  category: 'Dinner',
  cookTime: 25,
  servings: 4,
  ingredients: ['2 chicken breasts (sliced)', '8 oz fettuccine pasta', '1 cup heavy cream'],
  instructions: ['Boil fettuccine.', 'Cook chicken.', 'Simmer cream with pasta.'],
  notes: 'Use fresh parmesan.',
  reference: {
    id: MOCK_RECIPE_ID,
    title: 'Classic Chicken Alfredo',
    description: null,
    imageUrl: null,
    cookTime: 25,
    difficulty: 'easy' as const,
    cuisine: 'Italian',
    category: 'Dinner',
  },
}

const MOCK_VALID_STRUCTURED_RESPONSE = JSON.stringify({
  recipe: {
    title: 'Vegetarian Mushroom Alfredo',
    description: 'Creamy vegetarian fettuccine with cremini mushrooms.',
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    difficulty: 'easy',
    cuisine: 'Italian',
    category: 'Dinner',
    tags: ['vegetarian', 'pasta'],
    notes: 'Use vegetarian parmesan.',
    ingredients: [
      {
        name: 'cremini mushrooms',
        quantity: '8',
        unit: 'oz',
        preparationNote: 'sliced',
        isOptional: false,
      },
      {
        name: 'fettuccine pasta',
        quantity: '8',
        unit: 'oz',
        preparationNote: null,
        isOptional: false,
      },
    ],
    instructions: [
      {
        stepNumber: 1,
        instruction: 'Boil fettuccine in salted water until al dente.',
        timerDuration: 10,
      },
      {
        stepNumber: 2,
        instruction: 'Sauté mushrooms and toss with cream and pasta.',
        timerDuration: 8,
      },
    ],
  },
  summaryOfChanges: 'Replaced chicken breasts with sliced cremini mushrooms.',
  culinaryNotes: 'Sear mushrooms in a single layer to develop rich umami flavor.',
})

const MOCK_FLAT_RESPONSE = JSON.stringify({
  title: 'Vegetarian Mushroom Alfredo',
  cuisine: 'Italian',
  category: 'Dinner',
  cookTime: 20,
  servings: 4,
  ingredients: [
    '8 oz cremini mushrooms (sliced)',
    '8 oz fettuccine pasta',
    '1 cup heavy cream',
  ],
  instructions: [
    'Boil fettuccine in salted water until al dente.',
    'Sauté mushrooms and simmer with cream.',
    'Toss pasta with sauce and serve.',
  ],
  summaryOfChanges: 'Adapted recipe to vegetarian by swapping chicken for mushrooms.',
  culinaryNotes: [
    'Sear mushrooms over medium-high heat without crowding.',
    'Reserve some pasta water to adjust sauce consistency.',
  ],
})

describe('Recipe Modifier AI Resilience & Normalization Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.spyOn(retrieverModule, 'getFocusedRecipeContext').mockResolvedValue(MOCK_RECIPE_CONTEXT)
  })

  describe('Defensive Normalization (normalizeModifiedRecipeOutput)', () => {
    it('1. Correct structured response validates successfully without alteration', () => {
      const parsed = JSON.parse(MOCK_VALID_STRUCTURED_RESPONSE)
      const normalized = normalizeModifiedRecipeOutput(parsed) as any

      expect(normalized.recipe).toBeDefined()
      expect(normalized.recipe.title).toBe('Vegetarian Mushroom Alfredo')
      expect(normalized.recipe.ingredients[0].name).toBe('cremini mushrooms')
      expect(normalized.recipe.ingredients[0].quantity).toBe('8')
      expect(normalized.recipe.ingredients[0].unit).toBe('oz')
      expect(normalized.recipe.instructions[0].stepNumber).toBe(1)
      expect(normalized.summaryOfChanges).toBe('Replaced chicken breasts with sliced cremini mushrooms.')
      expect(normalized.culinaryNotes).toBe('Sear mushrooms in a single layer to develop rich umami flavor.')
    })

    it('2. Flat model output is normalized successfully into top-level recipe object', () => {
      const parsed = JSON.parse(MOCK_FLAT_RESPONSE)
      const normalized = normalizeModifiedRecipeOutput(parsed) as any

      expect(normalized.recipe).toBeDefined()
      expect(normalized.recipe.title).toBe('Vegetarian Mushroom Alfredo')
      expect(normalized.recipe.cuisine).toBe('Italian')
      expect(normalized.recipe.servings).toBe(4)
      expect(normalized.summaryOfChanges).toBe('Adapted recipe to vegetarian by swapping chicken for mushrooms.')
    })

    it('3. String ingredients are normalized into structured ingredient objects', () => {
      const raw = {
        recipe: {
          title: 'Tofu Stir Fry',
          ingredients: [
            '14 oz extra firm tofu (cubed)',
            '2 tbsp soy sauce',
            'Salt and black pepper to taste',
          ],
          instructions: [{ stepNumber: 1, instruction: 'Stir fry tofu.' }],
        },
        summaryOfChanges: 'Substituted chicken with tofu.',
        culinaryNotes: 'Press tofu beforehand.',
      }

      const normalized = normalizeModifiedRecipeOutput(raw) as any
      const ingredients = normalized.recipe.ingredients

      expect(ingredients).toHaveLength(3)
      expect(ingredients[0]).toEqual({
        name: 'extra firm tofu',
        quantity: '14',
        unit: 'oz',
        preparationNote: 'cubed',
        isOptional: false,
      })
      expect(ingredients[1]).toEqual({
        name: 'soy sauce',
        quantity: '2',
        unit: 'tbsp',
        preparationNote: null,
        isOptional: false,
      })
      expect(ingredients[2].name).toBe('Salt and black pepper to taste')
      expect(ingredients[2].isOptional).toBe(false)
    })

    it('4. String instructions are normalized into sequential step objects', () => {
      const raw = {
        recipe: {
          title: 'Quick Pasta',
          ingredients: [{ name: 'pasta', quantity: '1', unit: 'lb' }],
          instructions: [
            'Boil water in a large pot.',
            'Cook pasta for 10 minutes.',
            'Drain and serve with olive oil.',
          ],
        },
        summaryOfChanges: 'Simplified instructions.',
        culinaryNotes: null,
      }

      const normalized = normalizeModifiedRecipeOutput(raw) as any
      const instructions = normalized.recipe.instructions

      expect(instructions).toHaveLength(3)
      expect(instructions[0]).toEqual({
        stepNumber: 1,
        instruction: 'Boil water in a large pot.',
        timerDuration: null,
      })
      expect(instructions[1]).toEqual({
        stepNumber: 2,
        instruction: 'Cook pasta for 10 minutes.',
        timerDuration: null,
      })
      expect(instructions[2]).toEqual({
        stepNumber: 3,
        instruction: 'Drain and serve with olive oil.',
        timerDuration: null,
      })
    })

    it('5. Array culinaryNotes is normalized into a single joined string', () => {
      const raw = {
        recipe: {
          title: 'Spicy Curry',
          ingredients: [{ name: 'curry paste', quantity: '2', unit: 'tbsp' }],
          instructions: [{ stepNumber: 1, instruction: 'Simmer paste.' }],
        },
        summaryOfChanges: 'Increased spice.',
        culinaryNotes: [
          'Add coconut milk to temper heat if needed.',
          'Bloom spices in oil first.',
        ],
      }

      const normalized = normalizeModifiedRecipeOutput(raw) as any
      expect(normalized.culinaryNotes).toBe(
        'Add coconut milk to temper heat if needed. Bloom spices in oil first.'
      )
    })
  })

  describe('End-to-End modifyRecipeWithAi Failover & Budget Execution', () => {
    const input: RecipeModificationInput = {
      recipeId: MOCK_RECIPE_ID,
      action: 'vegetarian',
      customInstruction: 'Make this dish vegetarian.',
    }

    it('6. Primary model 429 -> fallback to gemini-3.5-flash succeeds', async () => {
      const recordedAttempts: Array<{ model: string; options: any }> = []
      const createMock = vi.fn().mockImplementation(async ({ model }, options) => {
        recordedAttempts.push({ model, options })
        if (model === 'gemini-3.6-flash') {
          const rateErr = new Error('Quota exceeded for metric')
          ;(rateErr as any).status = 429
          throw rateErr
        }

        return {
          choices: [{ message: { content: MOCK_FLAT_RESPONSE } }],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: { chat: { completions: { create: createMock } } } as any,
      })

      const result = await modifyRecipeWithAi(input, MOCK_USER_ID)

      expect(recordedAttempts).toHaveLength(2)
      expect(recordedAttempts[0].model).toBe('gemini-3.6-flash')
      expect(recordedAttempts[0].options.timeout).toBe(PRIMARY_TIMEOUT_MS)
      expect(recordedAttempts[1].model).toBe('gemini-3.5-flash')
      expect(recordedAttempts[1].options.timeout).toBe(FALLBACK_TIMEOUT_MS)

      expect(result.error).toBeUndefined()
      expect(result.data?.recipe.title).toBe('Vegetarian Mushroom Alfredo')
      expect(result.data?.summaryOfChanges).toContain('vegetarian')
    })

    it('7. Primary model 503 -> fallback to gemini-3.5-flash succeeds', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        if (model === 'gemini-3.6-flash') {
          const err = new Error('Service Unavailable')
          ;(err as any).status = 503
          throw err
        }

        return {
          choices: [{ message: { content: MOCK_VALID_STRUCTURED_RESPONSE } }],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: { chat: { completions: { create: createMock } } } as any,
      })

      const result = await modifyRecipeWithAi(input, MOCK_USER_ID)

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.error).toBeUndefined()
      expect(result.data?.recipe.title).toBe('Vegetarian Mushroom Alfredo')
    })

    it('8. Timeout / network error -> fallback to gemini-3.5-flash succeeds', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        if (model === 'gemini-3.6-flash') {
          const timeoutErr = new Error('Request timed out.')
          timeoutErr.name = 'APIConnectionTimeoutError'
          throw timeoutErr
        }

        return {
          choices: [{ message: { content: MOCK_VALID_STRUCTURED_RESPONSE } }],
        }
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: { chat: { completions: { create: createMock } } } as any,
      })

      const result = await modifyRecipeWithAi(input, MOCK_USER_ID)

      expect(recordedAttempts).toEqual(['gemini-3.6-flash', 'gemini-3.5-flash'])
      expect(result.error).toBeUndefined()
      expect(result.data?.recipe.title).toBe('Vegetarian Mushroom Alfredo')
    })

    it('9. Permanent 4xx (e.g. 400 Bad Request) does not incorrectly trigger fallback', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        const badReqErr = new Error('Invalid parameter passed to model')
        ;(badReqErr as any).status = 400
        throw badReqErr
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: { chat: { completions: { create: createMock } } } as any,
      })

      const result = await modifyRecipeWithAi(input, MOCK_USER_ID)

      expect(recordedAttempts).toHaveLength(1)
      expect(recordedAttempts[0]).toBe('gemini-3.6-flash')
      expect(result.error).toBe(
        'Unable to modify this recipe right now. Your original recipe is unchanged.'
      )
    })

    it('10. Total AI budget is respected when remaining deadline is exhausted', async () => {
      const recordedAttempts: string[] = []
      const createMock = vi.fn().mockImplementation(async ({ model }) => {
        recordedAttempts.push(model)
        vi.advanceTimersByTime(TOTAL_AI_BUDGET_MS - 2000)
        const err = new Error('High demand')
        ;(err as any).status = 503
        throw err
      })

      vi.useFakeTimers()

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: { chat: { completions: { create: createMock } } } as any,
      })

      const modifyPromise = modifyRecipeWithAi(input, MOCK_USER_ID)
      await vi.runAllTimersAsync()
      const result = await modifyPromise

      vi.useRealTimers()

      expect(recordedAttempts).toEqual(['gemini-3.6-flash'])
      expect(result.data).toBeUndefined()
      expect(result.error).toBe(
        'Unable to modify this recipe right now. Your original recipe is unchanged.'
      )
    })

    it('11. Invalid response after normalization returns the safe validation error', async () => {
      const createMock = vi.fn().mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                unexpectedKey: 'This does not resemble a recipe at all',
              }),
            },
          },
        ],
      })

      vi.spyOn(openaiClientModule, 'getAiConfig').mockReturnValue({
        provider: 'gemini',
        model: 'gemini-3.6-flash',
        client: { chat: { completions: { create: createMock } } } as any,
      })

      const result = await modifyRecipeWithAi(input, MOCK_USER_ID)

      expect(result.data).toBeUndefined()
      expect(result.error).toBe(
        'Unable to validate the modified recipe format. Please try your request again.'
      )
    })
  })
})
