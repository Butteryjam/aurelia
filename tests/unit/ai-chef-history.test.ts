import { describe, it, expect } from 'vitest'
import { normalizeConversationHistory } from '@/features/ai/services/chef'

describe('normalizeConversationHistory - AI Conversation History Normalization', () => {
  it('preserves clean alternating user and assistant turns', () => {
    const input = [
      { role: 'user', content: 'What can I make with eggs and spinach?' },
      { role: 'assistant', content: 'You can make a spinach frittata or an omelette.' },
      { role: 'user', content: 'How long do I bake the frittata?' },
      { role: 'assistant', content: 'Bake at 350°F (175°C) for about 20-25 minutes.' },
    ] as const

    const result = normalizeConversationHistory([...input])
    expect(result).toHaveLength(4)
    expect(result[0]).toEqual({ role: 'user', content: 'What can I make with eggs and spinach?' })
    expect(result[1]).toEqual({ role: 'assistant', content: 'You can make a spinach frittata or an omelette.' })
    expect(result[2]).toEqual({ role: 'user', content: 'How long do I bake the frittata?' })
    expect(result[3]).toEqual({ role: 'assistant', content: 'Bake at 350°F (175°C) for about 20-25 minutes.' })
  })

  it('merges consecutive same-role messages to guarantee strict turn alternation', () => {
    const input = [
      { role: 'user', content: 'First thought.' },
      { role: 'user', content: 'Second thought.' },
      { role: 'assistant', content: 'Here is step 1.' },
      { role: 'assistant', content: 'Here is step 2.' },
    ] as const

    const result = normalizeConversationHistory([...input])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      role: 'user',
      content: 'First thought.\n\nSecond thought.',
    })
    expect(result[1]).toEqual({
      role: 'assistant',
      content: 'Here is step 1.\n\nHere is step 2.',
    })
  })

  it('strips orphaned trailing user messages so history ends on an assistant turn', () => {
    const input = [
      { role: 'user', content: 'Hello Chef!' },
      { role: 'assistant', content: 'Hello! What are we cooking today?' },
      { role: 'user', content: 'An orphaned query that previously failed or timed out.' },
    ] as const

    const result = normalizeConversationHistory([...input])
    // The trailing user message should be pruned so the prompt builder can cleanly append the new active user message
    expect(result).toHaveLength(2)
    expect(result[result.length - 1].role).toBe('assistant')
  })

  it('filters out empty content, whitespace, or invalid roles', () => {
    const input = [
      { role: 'system', content: 'System instruction that should not be in history' },
      { role: 'user', content: '   ' }, // empty whitespace
      { role: 'user', content: 'Valid message' },
      { role: 'assistant', content: 'Valid response' },
    ] as const

    const result = normalizeConversationHistory([...input])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ role: 'user', content: 'Valid message' })
    expect(result[1]).toEqual({ role: 'assistant', content: 'Valid response' })
  })

  it('handles empty input history', () => {
    expect(normalizeConversationHistory([])).toEqual([])
  })
})
