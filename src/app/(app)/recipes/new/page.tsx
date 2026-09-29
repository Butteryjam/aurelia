import Link from 'next/link'
import { Sparkles, ArrowRight, Wand2 } from 'lucide-react'
import { RecipeForm } from '@/features/recipes/components/recipe-form'

export const maxDuration = 60

export const metadata = {
  title: 'New Recipe | Aurelia',
  description: 'Add a new recipe to your digital cookbook archive.',
}

export default function NewRecipePage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* AI Assistant Callout */}
      <aside
        aria-label="AI Recipe Import Alternative"
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent text-foreground shadow-xs transition-all hover:border-primary/40"
      >
        <div className="flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0 shadow-xs border border-primary/20">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <p className="text-xs sm:text-sm font-semibold text-foreground">
                Have messy recipe text or a photo?
              </p>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Sparkles className="h-2.5 w-2.5" />
                AI Extraction
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Paste raw culinary excerpts or upload photos of handwritten cards to auto-structure this recipe.
            </p>
          </div>
        </div>
        <Link
          href="/recipes/import"
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all shrink-0 shadow-xs hover:shadow-sm"
        >
          <span>Import with AI</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </aside>

      <RecipeForm mode="create" />
    </div>
  )
}
