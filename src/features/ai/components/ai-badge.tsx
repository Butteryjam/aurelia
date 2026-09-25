'use client'

import { Sparkles, Wand2, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface AiBadgeProps {
  type: 'imported' | 'modified' | 'generated'
  className?: string
}

export function AiBadge({ type, className }: AiBadgeProps) {
  switch (type) {
    case 'imported':
      return (
        <Badge
          variant="outline"
          className={`gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[11px] font-medium ${className}`}
        >
          <FileText className="h-3 w-3" />
          <span>AI Imported</span>
        </Badge>
      )
    case 'modified':
      return (
        <Badge
          variant="outline"
          className={`gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-medium ${className}`}
        >
          <Wand2 className="h-3 w-3" />
          <span>AI Modified</span>
        </Badge>
      )
    case 'generated':
      return (
        <Badge
          variant="outline"
          className={`gap-1.5 border-primary/30 bg-primary/10 text-primary text-[11px] font-medium ${className}`}
        >
          <Sparkles className="h-3 w-3" />
          <span>AI Generated</span>
        </Badge>
      )
  }
}
