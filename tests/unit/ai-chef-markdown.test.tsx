import React from 'react'
import { describe, it, expect } from 'vitest'
import {
  parseMarkdownBlocks,
  parseInline,
  getSafeHref,
  MarkdownContent,
} from '@/features/ai/components/markdown-content'
import type { GroundedRecipeReference } from '@/features/ai/types'

describe('AI Chef Markdown Rendering Engine', () => {
  describe('getSafeHref - XSS and URL Sanitization', () => {
    it('permits secure https and http protocols', () => {
      expect(getSafeHref('https://example.com')).toBe('https://example.com')
      expect(getSafeHref('http://localhost:3000/recipes')).toBe('http://localhost:3000/recipes')
    })

    it('permits internal application routes starting with single slash', () => {
      expect(getSafeHref('/recipes/123')).toBe('/recipes/123')
      expect(getSafeHref('/collections')).toBe('/collections')
      expect(getSafeHref('#ingredients')).toBe('#ingredients')
    })

    it('blocks dangerous javascript:, data:, and vbscript: URIs', () => {
      expect(getSafeHref("javascript:alert('xss')")).toBeNull()
      expect(getSafeHref('JAVASCRIPT:alert(1)')).toBeNull()
      expect(getSafeHref('data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
      expect(getSafeHref('vbscript:msgbox(1)')).toBeNull()
    })

    it('blocks protocol-relative double-slash URLs targeting arbitrary domains', () => {
      expect(getSafeHref('//evil.com/phish')).toBeNull()
    })

    it('permits mailto links', () => {
      expect(getSafeHref('mailto:chef@aurelia.app')).toBe('mailto:chef@aurelia.app')
    })
  })

  describe('parseMarkdownBlocks - Structural Block Parsing', () => {
    it('parses headings # through ####', () => {
      const input = `# Title H1\n## Section H2\n### Sub H3\n#### Mini H4`
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toEqual([
        { type: 'heading', level: 1, content: 'Title H1' },
        { type: 'heading', level: 2, content: 'Section H2' },
        { type: 'heading', level: 3, content: 'Sub H3' },
        { type: 'heading', level: 4, content: 'Mini H4' },
      ])
    })

    it('groups consecutive unordered list items into a single ul block', () => {
      const input = `* 3 lbs chicken\n- 2 cups buttermilk\n+ 1 tsp salt`
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('ul')
      if (blocks[0].type === 'ul') {
        expect(blocks[0].items).toHaveLength(3)
        expect(blocks[0].items[0].text).toBe('3 lbs chicken')
        expect(blocks[0].items[1].text).toBe('2 cups buttermilk')
        expect(blocks[0].items[2].text).toBe('1 tsp salt')
      }
    })

    it('groups consecutive ordered list items into a single ol block', () => {
      const input = `1. Marinate the chicken.\n2. Prepare the coating.\n3. Fry until golden.`
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toHaveLength(1)
      expect(blocks[0].type).toBe('ol')
      if (blocks[0].type === 'ol') {
        expect(blocks[0].items).toHaveLength(3)
        expect(blocks[0].items[0].num).toBe('1')
        expect(blocks[0].items[0].text).toBe('Marinate the chicken.')
        expect(blocks[0].items[1].text).toBe('Prepare the coating.')
        expect(blocks[0].items[2].text).toBe('Fry until golden.')
      }
    })

    it('parses code blocks delimited by triple backticks', () => {
      const input = '```json\n{\n  "recipe": "Pancakes"\n}\n```'
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toEqual([
        {
          type: 'code',
          lang: 'json',
          content: '{\n  "recipe": "Pancakes"\n}',
        },
      ])
    })

    it('parses horizontal rules', () => {
      const input = `Top text\n---\nBottom text`
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toHaveLength(3)
      expect(blocks[0]).toEqual({ type: 'paragraph', lines: ['Top text'] })
      expect(blocks[1]).toEqual({ type: 'hr' })
      expect(blocks[2]).toEqual({ type: 'paragraph', lines: ['Bottom text'] })
    })

    it('parses blockquotes', () => {
      const input = `> Chef's tip: Always pat the chicken dry\n> before dredging.`
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toHaveLength(1)
      expect(blocks[0]).toEqual({
        type: 'blockquote',
        content: "Chef's tip: Always pat the chicken dry\nbefore dredging.",
      })
    })

    it('correctly parses the reported UI bug pattern without treating asterisks as lists', () => {
      const input = `### Classic Buttermilk Fried Chicken\n***Prep time:***\n**The Chicken & Marinade:**\n* 3 lbs chicken`
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toHaveLength(3)
      // 1. Heading 3
      expect(blocks[0]).toEqual({
        type: 'heading',
        level: 3,
        content: 'Classic Buttermilk Fried Chicken',
      })
      // 2. Paragraph with two lines: ***Prep time:*** and **The Chicken & Marinade:**
      expect(blocks[1]).toEqual({
        type: 'paragraph',
        lines: ['***Prep time:***', '**The Chicken & Marinade:**'],
      })
      // 3. Bullet list item for * 3 lbs chicken
      expect(blocks[2]).toEqual({
        type: 'ul',
        items: [{ indent: 0, text: '3 lbs chicken' }],
      })
    })

    it('parses the full prompt verification example into expected semantic blocks', () => {
      const input = `# Recipe\n\n**Prep time:** 30 mins\n\n## Ingredients\n\n- 3 lbs chicken\n- 2 cups buttermilk\n\n### Instructions\n\n1. Marinate the chicken.\n2. Prepare the coating.`
      const blocks = parseMarkdownBlocks(input)

      expect(blocks).toHaveLength(6)
      expect(blocks[0]).toEqual({ type: 'heading', level: 1, content: 'Recipe' })
      expect(blocks[1]).toEqual({ type: 'paragraph', lines: ['**Prep time:** 30 mins'] })
      expect(blocks[2]).toEqual({ type: 'heading', level: 2, content: 'Ingredients' })
      expect(blocks[3]).toEqual({
        type: 'ul',
        items: [
          { indent: 0, text: '3 lbs chicken' },
          { indent: 0, text: '2 cups buttermilk' },
        ],
      })
      expect(blocks[4]).toEqual({ type: 'heading', level: 3, content: 'Instructions' })
      expect(blocks[5]).toEqual({
        type: 'ol',
        items: [
          { indent: 0, num: '1', text: 'Marinate the chicken.' },
          { indent: 0, num: '2', text: 'Prepare the coating.' },
        ],
      })
    })
  })

  describe('parseInline - Inline Formatting & Grounded References', () => {
    it('formats bold, italic, and bold-italic text', () => {
      const nodes = parseInline('***Prep time:*** **Bold label** and *italic note*')
      expect(nodes).toHaveLength(5)
      // 1. Bold Italic element
      expect(React.isValidElement(nodes[0])).toBe(true)
      expect((nodes[0] as React.ReactElement).type).toBe('strong')

      // 2. Plain text space
      expect(nodes[1]).toBe(' ')

      // 3. Bold element
      expect(React.isValidElement(nodes[2])).toBe(true)
      expect((nodes[2] as React.ReactElement).type).toBe('strong')

      // 4. Plain text
      expect(nodes[3]).toBe(' and ')

      // 5. Italic element
      expect(React.isValidElement(nodes[4])).toBe(true)
      expect((nodes[4] as React.ReactElement).type).toBe('em')
    })

    it('renders inline code with monospace styling', () => {
      const nodes = parseInline('Use `1 tsp kosher salt` per batch')
      expect(nodes).toHaveLength(3)
      expect(nodes[0]).toBe('Use ')
      expect(React.isValidElement(nodes[1])).toBe(true)
      expect((nodes[1] as React.ReactElement).type).toBe('code')
      expect(nodes[2]).toBe(' per batch')
    })

    it('embeds grounded recipe references with resolved recipe titles', () => {
      const references: GroundedRecipeReference[] = [
        {
          id: '8d2c499c-e35b-4ec6-8968-07fc26c7104a',
          title: 'Crispy Fried Chicken',
          description: null,
          imageUrl: null,
          cookTime: 35,
          difficulty: 'medium',
          cuisine: 'Southern',
          category: 'Dinner',
        },
      ]

      const text = 'I recommend checking out [Recipe: 8d2c499c-e35b-4ec6-8968-07fc26c7104a] from your vault.'
      const nodes = parseInline(text, references)

      expect(nodes).toHaveLength(3)
      expect(nodes[0]).toBe('I recommend checking out ')
      expect(React.isValidElement(nodes[1])).toBe(true)
      const recipeLink = nodes[1] as React.ReactElement<{ href: string; children: React.ReactNode }>
      expect(recipeLink.props.href).toBe('/recipes/8d2c499c-e35b-4ec6-8968-07fc26c7104a')
      expect(nodes[2]).toBe(' from your vault.')
    })

    it('renders safe markdown hyperlinks', () => {
      const nodes = parseInline('See [Culinary Guide](https://aurelia.app/guide) for more.')
      expect(nodes).toHaveLength(3)
      expect(nodes[0]).toBe('See ')
      expect(React.isValidElement(nodes[1])).toBe(true)
      const linkEl = nodes[1] as React.ReactElement<{ href: string; target: string }>
      expect(linkEl.type).toBe('a')
      expect(linkEl.props.href).toBe('https://aurelia.app/guide')
      expect(linkEl.props.target).toBe('_blank')
    })

    it('neutralizes malicious javascript: URLs without executing or rendering live anchor', () => {
      const nodes = parseInline('[Click Here](javascript:alert("pwned"))')
      expect(nodes).toHaveLength(1)
      expect(React.isValidElement(nodes[0])).toBe(true)
      const inertEl = nodes[0] as React.ReactElement
      // Should NOT be an anchor tag
      expect(inertEl.type).toBe('span')
    })

    it('safely escapes raw HTML tags without dangerous innerHTML', () => {
      const nodes = parseInline('Try <script>alert("xss")</script> or <img onerror="hack" />')
      // Content must remain plain string nodes, never parsed into DOM elements
      expect(nodes).toHaveLength(1)
      expect(typeof nodes[0]).toBe('string')
      expect(nodes[0]).toContain('<script>')
      expect(nodes[0]).toContain('<img')
    })
  })

  describe('MarkdownContent Component Rendering', () => {
    it('returns null when content is empty', () => {
      expect(MarkdownContent({ content: '' })).toBeNull()
    })

    it('renders a formatted recipe without raw markdown delimiters', () => {
      const element = MarkdownContent({
        content: `# Recipe\n\n**Prep time:** 30 mins\n\n## Ingredients\n\n- 3 lbs chicken\n- 2 cups buttermilk\n\n### Instructions\n\n1. Marinate the chicken.\n2. Prepare the coating.`,
      })

      expect(React.isValidElement(element)).toBe(true)
      const container = element as React.ReactElement<{ children: React.ReactNode[] }>
      expect(container.props.children).toHaveLength(6)

      // First child is h1
      const h1 = container.props.children[0] as React.ReactElement
      expect(h1.type).toBe('h1')

      // Second child is p
      const p = container.props.children[1] as React.ReactElement
      expect(p.type).toBe('p')

      // Third child is h2
      const h2 = container.props.children[2] as React.ReactElement
      expect(h2.type).toBe('h2')

      // Fourth child is ul
      const ul = container.props.children[3] as React.ReactElement
      expect(ul.type).toBe('ul')

      // Fifth child is h3
      const h3 = container.props.children[4] as React.ReactElement
      expect(h3.type).toBe('h3')

      // Sixth child is ol
      const ol = container.props.children[5] as React.ReactElement
      expect(ol.type).toBe('ol')
    })
  })
})
