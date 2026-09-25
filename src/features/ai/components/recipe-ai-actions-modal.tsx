'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wand2,
  Heart,
  Dumbbell,
  Leaf,
  Flame,
  Clock,
  RefreshCw,
  SlidersHorizontal,
  Loader2,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { modifyRecipeAction } from '../actions/modify-recipe'
import { createRecipe } from '@/features/recipes/actions'
import type { RecipeModificationAction, ModifiedRecipeResult } from '../types'
import { AiBadge } from './ai-badge'

interface RecipeAiActionsModalProps {
  recipeId: string
  recipeTitle: string
  trigger?: React.ReactNode
}

const PRESET_ACTIONS: Array<{
  action: RecipeModificationAction
  label: string
  icon: typeof Heart
  description: string
}> = [
  {
    action: 'healthier',
    label: 'Make Healthier',
    icon: Heart,
    description: 'Lower saturated fat and refined sugars with wholesome nutrient swaps',
  },
  {
    action: 'protein',
    label: 'Boost Protein',
    icon: Dumbbell,
    description: 'Elevate protein density with complementary lean protein sources',
  },
  {
    action: 'vegetarian',
    label: 'Make Vegetarian',
    icon: Leaf,
    description: 'Replace meat with savory plant-based texture and umami',
  },
  {
    action: 'vegan',
    label: 'Make 100% Vegan',
    icon: Leaf,
    description: 'Adapt to plant-based with zero dairy, eggs, or animal products',
  },
  {
    action: 'spicier',
    label: 'Make Spicier',
    icon: Flame,
    description: 'Elevate heat with nuanced chili warmth and aromatic spice',
  },
  {
    action: 'faster',
    label: 'Reduce Cooking Time',
    icon: Clock,
    description: 'Streamline techniques to get on the dinner table faster',
  },
  {
    action: 'substitute',
    label: 'Substitute Ingredient',
    icon: RefreshCw,
    description: 'Swap an unavailable ingredient seamlessly',
  },
  {
    action: 'custom',
    label: 'Custom Instruction',
    icon: SlidersHorizontal,
    description: 'Give Chef custom cooking constraints or preferences',
  },
]

export function RecipeAiActionsModal({
  recipeId,
  recipeTitle,
  trigger,
}: RecipeAiActionsModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedAction, setSelectedAction] = useState<RecipeModificationAction>('healthier')
  const [customNote, setCustomNote] = useState('')
  const [subOriginal, setSubOriginal] = useState('')
  const [subReplacement, setSubReplacement] = useState('')

  const [isModifying, startModifying] = useTransition()
  const [isSaving, startSaving] = useTransition()
  const [result, setResult] = useState<ModifiedRecipeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = () => {
    setError(null)
    startModifying(async () => {
      try {
        const payload = {
          recipeId,
          action: selectedAction,
          customInstruction: customNote.trim() || undefined,
          substituteIngredient:
            selectedAction === 'substitute' && subOriginal && subReplacement
              ? { original: subOriginal.trim(), replacement: subReplacement.trim() }
              : undefined,
        }

        const res = await modifyRecipeAction(payload)
        if (res.error || !res.data) {
          setError(res.error ?? 'Failed to adapt recipe.')
          return
        }

        setResult(res.data)
      } catch {
        setError('An unexpected error occurred while modifying the recipe.')
      }
    })
  }

  const handleSaveAsNew = () => {
    if (!result) return

    setError(null)
    startSaving(async () => {
      try {
        const modRecipe = result.recipe
        const saveRes = await createRecipe({
          title: `${modRecipe.title} (Adapted)`,
          description: modRecipe.description || undefined,
          prepTime: modRecipe.prepTime || undefined,
          cookTime: modRecipe.cookTime || undefined,
          servings: modRecipe.servings || undefined,
          difficulty: modRecipe.difficulty || undefined,
          cuisine: modRecipe.cuisine || undefined,
          category: modRecipe.category || undefined,
          notes: result.culinaryNotes ? `Chef's Adaptation Note: ${result.culinaryNotes}` : undefined,
          tags: [...(modRecipe.tags || []), 'ai-modified'],
          ingredients: modRecipe.ingredients.map((ing, idx) => ({
            name: ing.name,
            quantity: ing.quantity || undefined,
            unit: ing.unit || undefined,
            preparationNote: ing.preparationNote || undefined,
            isOptional: !!ing.isOptional,
            orderIndex: idx,
          })),
          instructions: modRecipe.instructions.map((inst, idx) => ({
            stepNumber: idx + 1,
            instruction: inst.instruction,
            timerDuration: inst.timerDuration || undefined,
          })),
        })

        if (saveRes.error || !saveRes.data) {
          setError(saveRes.error ?? 'Failed to save new recipe.')
          return
        }

        setOpen(false)
        router.push(`/recipes/${saveRes.data.id}`)
      } catch {
        setError('Failed to save adapted recipe.')
      }
    })
  }

  const handleReset = () => {
    setResult(null)
    setError(null)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) handleReset()
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Wand2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>AI Modify</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AiBadge type="modified" />
            <DialogTitle className="text-base font-semibold">Adapt Recipe with AI</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Modify <span className="font-semibold text-foreground">&quot;{recipeTitle}&quot;</span>. Your original recipe will remain untouched.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_ACTIONS.map((item) => {
                const isSelected = selectedAction === item.action
                const Icon = item.icon

                return (
                  <button
                    key={item.action}
                    type="button"
                    onClick={() => setSelectedAction(item.action)}
                    className={`flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                        : 'border-border/80 hover:border-border hover:bg-muted/40'
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Conditional extra inputs */}
            {selectedAction === 'substitute' && (
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/30">
                <div>
                  <Label className="text-xs">Original Ingredient</Label>
                  <Input
                    value={subOriginal}
                    onChange={(e) => setSubOriginal(e.target.value)}
                    placeholder="e.g. Heavy Cream"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs">Substitute With</Label>
                  <Input
                    value={subReplacement}
                    onChange={(e) => setSubReplacement(e.target.value)}
                    placeholder="e.g. Coconut Milk"
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              </div>
            )}

            {selectedAction === 'custom' && (
              <div className="space-y-1.5 p-3.5 rounded-xl border border-border bg-muted/30">
                <Label className="text-xs">Custom Instructions for Chef</Label>
                <Input
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Make it kid-friendly without spicy peppers and add extra peas"
                  className="h-8 text-xs"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleGenerate}
                disabled={isModifying}
                className="gap-2 text-xs font-semibold"
              >
                {isModifying ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span>Generate Modification</span>
              </Button>
            </div>
          </div>
        ) : (
          /* Result Preview */
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Summary of Culinary Changes:</span>
              </div>
              <p className="text-foreground/90 pl-6 leading-relaxed">
                {result.summaryOfChanges}
              </p>
              {result.culinaryNotes && (
                <p className="text-muted-foreground text-[11px] pl-6 pt-1 italic">
                  Tip: {result.culinaryNotes}
                </p>
              )}
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto p-3 rounded-xl border border-border bg-muted/20">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Adapted Ingredients ({result.recipe.ingredients.length})
              </h4>
              <ul className="text-xs space-y-1">
                {result.recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>
                      {ing.quantity ? `${ing.quantity} ` : ''}
                      {ing.unit ? `${ing.unit} ` : ''}
                      <strong className="font-semibold">{ing.name}</strong>
                      {ing.preparationNote ? ` (${ing.preparationNote})` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
                className="text-xs"
              >
                Try Another Modification
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleSaveAsNew}
                disabled={isSaving}
                className="gap-2 text-xs font-semibold"
              >
                {isSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                <span>Save as New Recipe</span>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
