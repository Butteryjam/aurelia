import {
  Home,
  BookOpen,
  FolderOpen,
  ChefHat,
  ShoppingCart,
  Settings,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  readonly label: string
  readonly href: string
  readonly icon: LucideIcon
  readonly mobileNav?: boolean
}

export const navigationItems: readonly NavItem[] = [
  { label: 'Home', href: '/', icon: Home, mobileNav: true },
  { label: 'Recipes', href: '/recipes', icon: BookOpen, mobileNav: true },
  { label: 'Meal Planner', href: '/meal-planner', icon: CalendarDays, mobileNav: true },
  { label: 'Collections', href: '/collections', icon: FolderOpen },
  { label: 'AI Chef', href: '/ai-chef', icon: ChefHat, mobileNav: true },
  { label: 'Shopping', href: '/shopping', icon: ShoppingCart, mobileNav: true },
  { label: 'Settings', href: '/settings', icon: Settings },
] as const

export const mobileNavItems = navigationItems.filter((item) => item.mobileNav)

