import React from 'react'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
import type { GroundedRecipeReference } from '../types'

interface MarkdownContentProps {
  content: string
  references?: GroundedRecipeReference[]
  className?: string
}

type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; content: string }
  | { type: 'paragraph'; lines: string[] }
  | { type: 'ul'; items: { text: string; indent: number }[] }
  | { type: 'ol'; items: { text: string; indent: number; num: string }[] }
  | { type: 'blockquote'; content: string }
  | { type: 'code'; lang?: string; content: string }
  | { type: 'hr' }

/**
 * Validates URLs against an explicit safe protocol whitelist.
 * Blocks dangerous schemes like javascript:, data:, vbscript:, etc.
 */
export function getSafeHref(url: string): string | null {
  const trimmed = url.trim()
  // Internal relative links
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed
  }
  // Anchor links
  if (trimmed.startsWith('#')) {
    return trimmed
  }
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
      return trimmed
    }
  } catch {
    return null
  }
  return null
}

/**
 * Parses raw text lines into high-level Markdown blocks.
 */
export function parseMarkdownBlocks(text: string): Block[] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n')
  const blocks: Block[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Empty line
    if (line.trim() === '') {
      i++
      continue
    }

    // Code block
    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim()
      i++
      const codeLines: string[] = []
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // skip closing ```
      blocks.push({ type: 'code', lang, content: codeLines.join('\n') })
      continue
    }

    // Horizontal rule: exactly ---, ***, or ___ on a line by itself
    if (/^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // Headings # through ####
    const headingMatch = line.match(/^(#{1,4})[ \t]+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4
      blocks.push({ type: 'heading', level, content: headingMatch[2].trim() })
      i++
      continue
    }

    // Blockquote
    const bqMatch = line.match(/^[ \t]*>[ \t]?(.*)$/)
    if (bqMatch) {
      const bqLines: string[] = [bqMatch[1]]
      i++
      while (i < lines.length) {
        const nextBq = lines[i].match(/^[ \t]*>[ \t]?(.*)$/)
        if (!nextBq) break
        bqLines.push(nextBq[1])
        i++
      }
      blocks.push({ type: 'blockquote', content: bqLines.join('\n') })
      continue
    }

    // Unordered list items: * item, - item, + item
    const ulMatch = line.match(/^([ \t]*)([*+-])[ \t]+(.+)$/)
    if (ulMatch) {
      const items: { text: string; indent: number }[] = []
      while (i < lines.length) {
        const m = lines[i].match(/^([ \t]*)([*+-])[ \t]+(.+)$/)
        if (m) {
          items.push({ indent: m[1].length, text: m[3] })
          i++
        } else if (
          items.length > 0 &&
          lines[i].trim() !== '' &&
          (lines[i].startsWith('  ') || lines[i].startsWith('\t'))
        ) {
          // Multiline continuation
          items[items.length - 1].text += ' ' + lines[i].trim()
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'ul', items })
      continue
    }

    // Ordered list items: 1. item, 2) item
    const olMatch = line.match(/^([ \t]*)(\d+)[\.\)][ \t]+(.+)$/)
    if (olMatch) {
      const items: { text: string; indent: number; num: string }[] = []
      while (i < lines.length) {
        const m = lines[i].match(/^([ \t]*)(\d+)[\.\)][ \t]+(.+)$/)
        if (m) {
          items.push({ indent: m[1].length, num: m[2], text: m[3] })
          i++
        } else if (
          items.length > 0 &&
          lines[i].trim() !== '' &&
          (lines[i].startsWith('  ') || lines[i].startsWith('\t'))
        ) {
          // Multiline continuation
          items[items.length - 1].text += ' ' + lines[i].trim()
          i++
        } else {
          break
        }
      }
      blocks.push({ type: 'ol', items })
      continue
    }

    // Paragraph: collect consecutive lines until empty line or special block
    const pLines: string[] = []
    while (i < lines.length) {
      const current = lines[i]
      if (current.trim() === '') break
      if (current.trimStart().startsWith('```')) break
      if (/^[ \t]*(?:---|\*\*\*|___)[ \t]*$/.test(current)) break
      if (/^#{1,4}[ \t]+.+$/.test(current)) break
      if (/^[ \t]*>[ \t]?.*$/.test(current)) break
      if (/^([ \t]*)([*+-])[ \t]+.+$/.test(current)) break
      if (/^([ \t]*)(\d+)[\.\)][ \t]+.+$/.test(current)) break

      pLines.push(current)
      i++
    }

    if (pLines.length > 0) {
      blocks.push({ type: 'paragraph', lines: pLines })
    }
  }

  return blocks
}

/**
 * Token types recognized inside inline text.
 */
interface InlineMatch {
  index: number
  length: number
  type: 'code' | 'recipe' | 'link' | 'bold_italic' | 'bold' | 'italic' | 'strike'
  content: string
  extra?: {
    url?: string
    recipeId?: string
  }
}

/**
 * Finds the earliest inline token in a substring.
 */
function findNextInlineToken(text: string): InlineMatch | null {
  const matches: InlineMatch[] = []

  // 1. Inline code: `code`
  const codeMatch = text.match(/`([^`]+)`/)
  if (codeMatch && codeMatch.index !== undefined) {
    matches.push({
      index: codeMatch.index,
      length: codeMatch[0].length,
      type: 'code',
      content: codeMatch[1],
    })
  }

  // 2. Grounded Recipe: [Recipe: <uuid>]
  const recipeMatch = text.match(/\[Recipe:\s*([a-f0-9-]{36})\]/i)
  if (recipeMatch && recipeMatch.index !== undefined) {
    matches.push({
      index: recipeMatch.index,
      length: recipeMatch[0].length,
      type: 'recipe',
      content: recipeMatch[0],
      extra: { recipeId: recipeMatch[1] },
    })
  }

  // 3. Link: [text](url) - handles optional balanced parentheses in URLs (e.g. Wikipedia or query strings)
  const linkMatch = text.match(/\[([^\]]+)\]\(((?:[^\s()]|\([^()\s]*\))*)\)/)
  if (linkMatch && linkMatch.index !== undefined) {
    matches.push({
      index: linkMatch.index,
      length: linkMatch[0].length,
      type: 'link',
      content: linkMatch[1],
      extra: { url: linkMatch[2] },
    })
  }

  // 4. Bold + Italic: ***text*** or ___text___
  const biMatch = text.match(/(?:\*\*\*([^*]+)\*\*\*|___([^_]+)___)/)
  if (biMatch && biMatch.index !== undefined) {
    matches.push({
      index: biMatch.index,
      length: biMatch[0].length,
      type: 'bold_italic',
      content: biMatch[1] ?? biMatch[2],
    })
  }

  // 5. Bold: **text** or __text__
  const boldMatch = text.match(/(?:\*\*([^*]+)\*\*|__([^_]+)__)/)
  if (boldMatch && boldMatch.index !== undefined) {
    matches.push({
      index: boldMatch.index,
      length: boldMatch[0].length,
      type: 'bold',
      content: boldMatch[1] ?? boldMatch[2],
    })
  }

  // 6. Italic: *text* or _text_ (excluding intra-word underscores)
  const italicMatch = text.match(/(?:\*([^*]+)\*|(?<![a-zA-Z0-9])_([^_]+)_(?![a-zA-Z0-9]))/)
  if (italicMatch && italicMatch.index !== undefined) {
    matches.push({
      index: italicMatch.index,
      length: italicMatch[0].length,
      type: 'italic',
      content: italicMatch[1] ?? italicMatch[2],
    })
  }

  // 7. Strikethrough: ~~text~~
  const strikeMatch = text.match(/~~([^~]+)~~/)
  if (strikeMatch && strikeMatch.index !== undefined) {
    matches.push({
      index: strikeMatch.index,
      length: strikeMatch[0].length,
      type: 'strike',
      content: strikeMatch[1],
    })
  }

  if (matches.length === 0) return null

  // Sort primarily by earliest index, secondarily by longest match
  matches.sort((a, b) => {
    if (a.index !== b.index) return a.index - b.index
    return b.length - a.length
  })

  return matches[0]
}

/**
 * Parses inline markdown recursively into React nodes.
 * Natively escapes all content via standard React JSX — NO dangerouslySetInnerHTML.
 */
export function parseInline(
  text: string,
  references?: GroundedRecipeReference[],
  keyPrefix = 'inline'
): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  let remaining = text
  let counter = 0

  while (remaining.length > 0) {
    const token = findNextInlineToken(remaining)
    if (!token) {
      nodes.push(remaining)
      break
    }

    const key = `${keyPrefix}-${counter++}`

    // Push plain text preceding the token
    if (token.index > 0) {
      nodes.push(remaining.slice(0, token.index))
    }

    switch (token.type) {
      case 'code':
        nodes.push(
          <code
            key={key}
            className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-foreground border border-border/50"
          >
            {token.content}
          </code>
        )
        break

      case 'recipe': {
        const recipeId = token.extra?.recipeId?.toLowerCase()
        const ref = references?.find((r) => r.id.toLowerCase() === recipeId)
        const title = ref?.title ?? 'View Recipe'
        const targetHref = ref ? `/recipes/${ref.id}` : recipeId ? `/recipes/${recipeId}` : '#'

        nodes.push(
          <Link
            key={key}
            href={targetHref}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 my-0.5 mx-1 rounded-md border border-primary/25 bg-primary/10 text-primary font-medium text-xs hover:bg-primary/20 hover:border-primary/40 transition-all align-middle shadow-2xs group"
          >
            <BookOpen className="h-3 w-3 shrink-0 text-primary/80 group-hover:text-primary transition-colors" />
            <span className="truncate max-w-[200px]">{title}</span>
            <ArrowRight className="h-2.5 w-2.5 shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
          </Link>
        )
        break
      }

      case 'link': {
        const safeHref = getSafeHref(token.extra?.url ?? '')
        const linkLabel = parseInline(token.content, references, `${key}-label`)

        if (!safeHref) {
          // If unsafe URL scheme, render inert text rather than executable link
          nodes.push(
            <span key={key} className="text-muted-foreground underline decoration-dotted">
              {linkLabel}
            </span>
          )
        } else if (safeHref.startsWith('http:') || safeHref.startsWith('https:')) {
          nodes.push(
            <a
              key={key}
              href={safeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors font-medium"
            >
              {linkLabel}
            </a>
          )
        } else {
          nodes.push(
            <Link
              key={key}
              href={safeHref}
              className="text-primary underline underline-offset-4 hover:text-primary/80 transition-colors font-medium"
            >
              {linkLabel}
            </Link>
          )
        }
        break
      }

      case 'bold_italic':
        nodes.push(
          <strong key={key} className="font-semibold text-foreground">
            <em>{parseInline(token.content, references, `${key}-bi`)}</em>
          </strong>
        )
        break

      case 'bold':
        nodes.push(
          <strong key={key} className="font-semibold text-foreground">
            {parseInline(token.content, references, `${key}-b`)}
          </strong>
        )
        break

      case 'italic':
        nodes.push(
          <em key={key} className="italic">
            {parseInline(token.content, references, `${key}-i`)}
          </em>
        )
        break

      case 'strike':
        nodes.push(
          <del key={key} className="line-through text-muted-foreground">
            {parseInline(token.content, references, `${key}-s`)}
          </del>
        )
        break
    }

    remaining = remaining.slice(token.index + token.length)
  }

  return nodes
}

/**
 * Main MarkdownContent component for AI Chef and assistant responses.
 * Renders semantic, accessible HTML with Aurelia typography and zero dangerouslySetInnerHTML.
 */
export function MarkdownContent({ content, references, className = '' }: MarkdownContentProps) {
  if (!content) return null

  const blocks = parseMarkdownBlocks(content)

  return (
    <div className={`space-y-2.5 text-sm leading-relaxed ${className}`}>
      {blocks.map((block, idx) => {
        const key = `block-${idx}`

        switch (block.type) {
          case 'heading': {
            const inner = parseInline(block.content, references, `h-${idx}`)
            switch (block.level) {
              case 1:
                return (
                  <h1
                    key={key}
                    className="font-serif text-lg font-bold text-foreground mt-4 mb-2 first:mt-0 tracking-tight"
                  >
                    {inner}
                  </h1>
                )
              case 2:
                return (
                  <h2
                    key={key}
                    className="font-serif text-base font-semibold text-foreground mt-3 mb-1.5 first:mt-0 tracking-tight"
                  >
                    {inner}
                  </h2>
                )
              case 3:
                return (
                  <h3 key={key} className="font-semibold text-sm text-foreground mt-2.5 mb-1 first:mt-0">
                    {inner}
                  </h3>
                )
              case 4:
              default:
                return (
                  <h4
                    key={key}
                    className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mt-2 mb-1 first:mt-0"
                  >
                    {inner}
                  </h4>
                )
            }
          }

          case 'paragraph':
            return (
              <p
                key={key}
                className="text-sm leading-relaxed text-foreground/90 my-1.5 first:mt-0 last:mb-0"
              >
                {block.lines.map((line, lineIdx) => (
                  <span key={lineIdx}>
                    {lineIdx > 0 && <br />}
                    {parseInline(line, references, `p-${idx}-${lineIdx}`)}
                  </span>
                ))}
              </p>
            )

          case 'ul':
            return (
              <ul
                key={key}
                className="list-disc list-outside pl-5 my-2 space-y-1.5 text-sm leading-relaxed text-foreground/90 marker:text-primary/70"
              >
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className={`leading-relaxed ${item.indent >= 2 ? 'ml-3 list-[circle]' : ''}`}
                  >
                    {parseInline(item.text, references, `ul-${idx}-${itemIdx}`)}
                  </li>
                ))}
              </ul>
            )

          case 'ol':
            return (
              <ol
                key={key}
                className="list-decimal list-outside pl-5 my-2 space-y-1.5 text-sm leading-relaxed text-foreground/90 marker:text-primary/70 marker:font-semibold"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className={`leading-relaxed ${item.indent >= 2 ? 'ml-3' : ''}`}>
                    {parseInline(item.text, references, `ol-${idx}-${itemIdx}`)}
                  </li>
                ))}
              </ol>
            )

          case 'blockquote':
            return (
              <blockquote
                key={key}
                className="my-2.5 pl-3.5 py-1.5 border-l-2 border-primary/50 bg-primary/5 rounded-r-lg italic text-foreground/80 text-sm"
              >
                {parseInline(block.content, references, `bq-${idx}`)}
              </blockquote>
            )

          case 'code':
            return (
              <pre
                key={key}
                className="my-2.5 p-3 rounded-xl bg-muted/70 border border-border/70 font-mono text-xs overflow-x-auto text-foreground shadow-2xs"
              >
                <code>{block.content}</code>
              </pre>
            )

          case 'hr':
            return <hr key={key} className="my-3 border-border/60" />

          default:
            return null
        }
      })}
    </div>
  )
}
