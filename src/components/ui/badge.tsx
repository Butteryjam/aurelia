import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border transition-colors select-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border-border text-foreground bg-transparent',
        'tag-neutral': 'border-border/80 bg-muted/60 text-muted-foreground',
        'difficulty-easy':
          'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-semibold capitalize',
        'difficulty-medium':
          'border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold capitalize',
        'difficulty-hard':
          'border-rose-600/25 bg-rose-500/10 text-rose-800 dark:text-rose-300 font-semibold capitalize',
        'meal-breakfast':
          'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium',
        'meal-lunch':
          'border-stone-500/30 bg-stone-500/10 text-stone-800 dark:text-stone-300 font-medium',
        'meal-dinner':
          'border-primary/30 bg-primary/10 text-primary font-medium',
        'meal-snack':
          'border-stone-400/30 bg-stone-400/10 text-stone-700 dark:text-stone-300 font-medium',
        success:
          'border-emerald-600/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-medium',
        warning:
          'border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-300 font-medium',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs font-medium',
        sm: 'px-2 py-0.5 text-[11px] font-medium',
        lg: 'px-3 py-1 text-xs font-semibold',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
