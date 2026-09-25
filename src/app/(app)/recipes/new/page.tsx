import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { RecipeForm } from '@/features/recipes/components/recipe-form'

export const maxDuration = 60

export const metadata = {
  title: 'New Recipe | Aurelia',
  description: 'Add a new recipe to your digital cookbook.',
}

export default function NewRecipePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl border border-primary/20 bg-primary/5 text-foreground">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs font-semibold">Have messy recipe text or a photo?</p>
            <p className="text-[11px] text-muted-foreground">
              Paste text or upload photos of cookbooks and handwriting to auto-format.
            </p>
          </div>
        </div>
        <Link
          href="/recipes/import"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors shrink-0 shadow-xs"
        >
          <span>Import with AI</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <RecipeForm mode="create" />
    </div>
  )
}
