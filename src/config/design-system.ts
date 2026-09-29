/**
 * Aurelia Design System Tokens & Semantic Constants
 * --------------------------------------------------
 * Single source of truth for design tokens used across Aurelia.
 * Standardizes typography scales, radius tiers, semantic badges, and elevation tokens.
 */

export const TYPOGRAPHY = {
  display: 'text-3xl sm:text-4xl font-serif font-bold tracking-tight',
  pageTitle: 'text-2xl sm:text-3xl font-serif font-bold tracking-tight',
  sectionTitle: 'text-lg sm:text-xl font-serif font-semibold tracking-tight',
  cardTitle: 'text-base font-sans font-semibold tracking-tight',
  eyebrow: 'text-[11px] font-sans font-bold uppercase tracking-wider text-muted-foreground',
  meta: 'text-xs font-medium text-muted-foreground',
  metaMuted: 'text-xs text-muted-foreground/80',
} as const

export const RADII = {
  small: 'rounded-lg',    // 8px - Badges, small pills, inner tags
  control: 'rounded-xl',  // 12px - Inputs, buttons, dialogs, dropdowns
  card: 'rounded-2xl',    // 16px - Cards, hero media, outer sheets
  pill: 'rounded-full',   // 9999px - Pills, avatars, circular icon triggers
} as const

export const ELEVATION = {
  flat: 'shadow-none',
  card: 'shadow-card',
  hover: 'shadow-hover',
  dialog: 'shadow-dialog',
} as const

export const ICON_SIZES = {
  sm: 'h-3.5 w-3.5',
  base: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-6 w-6',
  display: 'h-8 w-8',
} as const

export const BADGE_VARIANTS = {
  difficulty: {
    easy: 'difficulty-easy',
    medium: 'difficulty-medium',
    hard: 'difficulty-hard',
  },
  mealType: {
    breakfast: 'meal-breakfast',
    lunch: 'meal-lunch',
    dinner: 'meal-dinner',
    snack: 'meal-snack',
  },
  neutral: 'tag-neutral',
} as const
