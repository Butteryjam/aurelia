'use client'

import type { DayNutritionSummary } from '../types'
import { Flame } from 'lucide-react'

interface DailyNutritionSummaryProps {
  summary: DayNutritionSummary
  className?: string
}

export function DailyNutritionSummary({ summary, className }: DailyNutritionSummaryProps) {
  if (!summary.hasData) return null

  return (
    <div
      className={`flex items-center justify-between rounded-md bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground border border-border/30 ${className || ''}`}
      aria-label="Estimated daily nutrition"
    >
      <div className="flex items-center gap-1 font-semibold text-foreground/90">
        <Flame className="h-2.5 w-2.5 text-amber-500 shrink-0" />
        <span>{summary.calories}</span>
        <span className="text-[9px] font-normal text-muted-foreground">kcal</span>
      </div>
      <div className="flex items-center gap-1.5 text-[9px] font-medium text-foreground/80">
        <span>P:{summary.protein_g}g</span>
        <span>C:{summary.carbs_g}g</span>
        <span>F:{summary.fat_g}g</span>
      </div>
    </div>
  )
}
