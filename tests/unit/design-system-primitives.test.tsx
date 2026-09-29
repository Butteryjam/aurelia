import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { ActionToolbar } from '@/components/shared/action-toolbar'
import { ChefHat } from 'lucide-react'

describe('Aurelia Design System Primitives (Phase 2)', () => {
  describe('Button Variants & Radius System', () => {
    it('renders primary button with rounded-xl and active press feedback class', () => {
      const html = renderToStaticMarkup(<Button variant="default">Primary Action</Button>)
      expect(html).toContain('bg-primary')
      expect(html).toContain('rounded-xl')
      expect(html).toContain('active:scale-[0.98]')
      expect(html).toContain('Primary Action')
    })

    it('renders small button with rounded-lg', () => {
      const html = renderToStaticMarkup(<Button size="sm">Small Action</Button>)
      expect(html).toContain('rounded-lg')
      expect(html).toContain('Small Action')
    })
  })

  describe('Card Variants & Anatomy', () => {
    it('renders card with rounded-2xl and shadow-card by default', () => {
      const html = renderToStaticMarkup(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
          </CardHeader>
          <CardContent>Content</CardContent>
        </Card>
      )
      expect(html).toContain('rounded-2xl')
      expect(html).toContain('shadow-card')
      expect(html).toContain('Card Title')
      expect(html).toContain('Content')
    })

    it('supports interactive and flat card variants', () => {
      const interactiveHtml = renderToStaticMarkup(<Card variant="interactive">Interactive</Card>)
      const flatHtml = renderToStaticMarkup(<Card variant="flat">Flat</Card>)

      expect(interactiveHtml).toContain('hover:shadow-hover')
      expect(flatHtml).toContain('shadow-none')
    })
  })

  describe('Badge Semantic Variants', () => {
    it('renders difficulty variants with accessible contrast classes', () => {
      const easyHtml = renderToStaticMarkup(<Badge variant="difficulty-easy">Easy</Badge>)
      const mediumHtml = renderToStaticMarkup(<Badge variant="difficulty-medium">Medium</Badge>)
      const hardHtml = renderToStaticMarkup(<Badge variant="difficulty-hard">Hard</Badge>)

      expect(easyHtml).toContain('text-emerald-800')
      expect(mediumHtml).toContain('text-amber-800')
      expect(hardHtml).toContain('text-rose-800')
    })

    it('renders mealType and tag-neutral variants', () => {
      const breakfastHtml = renderToStaticMarkup(<Badge variant="meal-breakfast">Breakfast</Badge>)
      const dinnerHtml = renderToStaticMarkup(<Badge variant="meal-dinner">Dinner</Badge>)
      const tagHtml = renderToStaticMarkup(<Badge variant="tag-neutral">Quick</Badge>)

      expect(breakfastHtml).toContain('bg-amber-500/10')
      expect(dinnerHtml).toContain('text-primary')
      expect(tagHtml).toContain('bg-muted/60')
    })
  })

  describe('Input Standardized Radius & Form States', () => {
    it('renders input with rounded-xl, text-sm, and focus ring classes', () => {
      const html = renderToStaticMarkup(<Input placeholder="Search dishes..." />)
      expect(html).toContain('rounded-xl')
      expect(html).toContain('focus-visible:ring-ring')
      expect(html).toContain('placeholder="Search dishes..."')
    })
  })

  describe('Dialog Primitives & Typography', () => {
    it('renders dialog header, title, and description with serif hierarchy', () => {
      const html = renderToStaticMarkup(
        <Dialog open>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
        </Dialog>
      )
      expect(html).toContain('font-serif')
      expect(html).toContain('Confirm Delete')
      expect(html).toContain('This action cannot be undone.')
    })
  })

  describe('PageHeader Universal Primitive', () => {
    it('renders title, description, breadcrumb, badge, and action slots', () => {
      const html = renderToStaticMarkup(
        <PageHeader
          title="Culinary Archive"
          description="Browse and organize your curated dishes"
          breadcrumb={<span>Home / Recipes</span>}
          badge={<Badge variant="default">12 Dishes</Badge>}
          primaryAction={<Button>Add Recipe</Button>}
          secondaryActions={<Button variant="outline">Filter</Button>}
        />
      )
      expect(html).toContain('Culinary Archive')
      expect(html).toContain('Browse and organize your curated dishes')
      expect(html).toContain('Home / Recipes')
      expect(html).toContain('12 Dishes')
      expect(html).toContain('Add Recipe')
      expect(html).toContain('Filter')
    })
  })

  describe('EmptyState Universal Primitive', () => {
    it('renders standard, compact, and editorial variants', () => {
      const standardHtml = renderToStaticMarkup(
        <EmptyState
          icon={ChefHat}
          title="No recipes found"
          description="Try adjusting your culinary search"
          action={<Button>Clear filters</Button>}
        />
      )
      expect(standardHtml).toContain('No recipes found')
      expect(standardHtml).toContain('Clear filters')

      const compactHtml = renderToStaticMarkup(
        <EmptyState
          variant="compact"
          title="No meals planned"
          description="Schedule a meal for today"
        />
      )
      expect(compactHtml).toContain('No meals planned')
      expect(compactHtml).toContain('Schedule a meal for today')

      const editorialHtml = renderToStaticMarkup(
        <EmptyState
          variant="editorial"
          title="Your Pantry is Empty"
          description="Start building your digital cookbook"
        />
      )
      expect(editorialHtml).toContain('Your Pantry is Empty')
    })
  })

  describe('ActionToolbar Primitive', () => {
    it('renders primary and secondary actions gracefully', () => {
      const html = renderToStaticMarkup(
        <ActionToolbar
          primaryAction={{
            id: 'cook',
            label: 'Cook Mode',
          }}
          secondaryActions={[
            { id: 'share', label: 'Share' },
            { id: 'edit', label: 'Edit' },
          ]}
        />
      )
      expect(html).toContain('Cook Mode')
      expect(html).toContain('Share')
      expect(html).toContain('Edit')
    })

    it('renders overflow menu button when secondary actions exceed maxVisibleSecondary', () => {
      const html = renderToStaticMarkup(
        <ActionToolbar
          maxVisibleSecondary={1}
          primaryAction={{ id: 'cook', label: 'Cook Mode' }}
          secondaryActions={[
            { id: 'share', label: 'Share' },
            { id: 'edit', label: 'Edit' },
            { id: 'delete', label: 'Delete', destructive: true },
          ]}
        />
      )
      expect(html).toContain('Cook Mode')
      expect(html).toContain('Share')
      expect(html).toContain('More')
    })
  })
})
