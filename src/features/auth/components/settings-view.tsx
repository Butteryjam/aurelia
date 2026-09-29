'use client'

import { useState, useTransition, useSyncExternalStore } from 'react'
import {
  User,
  Mail,
  ShieldCheck,
  KeyRound,
  Palette,
  Sun,
  Moon,
  Monitor,
  Scale,
  Utensils,
  Check,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Trash2,
  Sparkles,
  Calendar,
} from 'lucide-react'
import type { Profile } from '../queries'
import { PageHeader } from '@/components/shared/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useTheme } from '@/components/providers/theme-context'
import { PasswordUpdateForm } from './password-update-form'
import { updateProfileSettingsAction, logout } from '../actions'
import { cn } from '@/lib/utils'

interface SettingsViewProps {
  user: {
    id: string
    email?: string | null
    created_at?: string
    user_metadata?: {
      display_name?: string
    }
  }
  initialProfile: Profile | null
  isRecovery?: boolean
}

const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'Pescatarian',
  'Keto',
  'Low-Carb',
  'Halal',
  'Kosher',
]

const emptySubscribe = () => () => {}
const getClientSnapshot = () => true
const getServerSnapshot = () => false

export function SettingsView({ user, initialProfile, isRecovery = false }: SettingsViewProps) {
  // Theme context
  const { theme, setTheme } = useTheme()
  const isHydrated = useSyncExternalStore(emptySubscribe, getClientSnapshot, getServerSnapshot)

  // Profile fields state
  const [displayName, setDisplayName] = useState(
    initialProfile?.display_name || user.user_metadata?.display_name || ''
  )
  const [measurementSystem, setMeasurementSystem] = useState<'metric' | 'imperial'>(
    initialProfile?.measurement_system || 'metric'
  )
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>(
    initialProfile?.dietary_preferences || []
  )

  // Feedback states
  const [profilePending, startProfileTransition] = useTransition()
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  const [prefPending, startPrefTransition] = useTransition()
  const [prefSaved, setPrefSaved] = useState(false)
  const [prefError, setPrefError] = useState<string | null>(null)

  // Account deletion dialog
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')

  // Member since date formatting
  const memberSince = user.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileError(null)
    setProfileSaved(false)

    startProfileTransition(async () => {
      const res = await updateProfileSettingsAction({
        displayName,
      })

      if (res.error) {
        setProfileError(res.error)
      } else {
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
      }
    })
  }

  function handleToggleDietary(option: string) {
    setDietaryPreferences((prev) =>
      prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]
    )
  }

  function handleSavePreferences() {
    setPrefError(null)
    setPrefSaved(false)

    startPrefTransition(async () => {
      const res = await updateProfileSettingsAction({
        measurementSystem,
        dietaryPreferences,
      })

      if (res.error) {
        setPrefError(res.error)
      } else {
        setPrefSaved(true)
        setTimeout(() => setPrefSaved(false), 3000)
      }
    })
  }

  // If in recovery mode, show dedicated recovery flow
  if (isRecovery) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 animate-fade-up">
        <PageHeader
          title="Reset Your Password"
          description="Set a new password for your account to complete recovery."
          badge={
            <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-medium">
              <KeyRound className="h-3.5 w-3.5 text-primary" />
              <span>Password Recovery</span>
            </Badge>
          }
        />

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground flex items-start gap-3.5 shadow-2xs">
          <KeyRound className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-foreground">Password Recovery Mode</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              You are updating the password for <strong className="text-foreground">{user?.email}</strong>. Enter a new strong password below to regain full access to your archive.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-card p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Set New Password</h2>
              <p className="text-xs text-muted-foreground">
                Ensure your account is protected with a unique, secure password
              </p>
            </div>
          </div>

          <PasswordUpdateForm isRecovery={true} userEmail={user?.email || undefined} />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16 animate-fade-up">
      {/* ─── PAGE HEADER ─── */}
      <PageHeader
        title="Settings"
        description="The private control room for your culinary archive, recipe preferences, and account security."
        badge={
          <Badge variant="secondary" className="gap-1.5 px-3 py-1 font-medium">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Personal Control Center</span>
          </Badge>
        }
      />

      <div className="space-y-6">
        {/* ─── 1. PROFILE & IDENTITY ─── */}
        <section aria-labelledby="section-profile" className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-3.5 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 id="section-profile" className="font-serif text-lg font-bold text-foreground">
                Profile &amp; Identity
              </h2>
              <p className="text-xs text-muted-foreground">
                Your public culinary signature and authenticated credentials
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-5">
            {profileSaved && (
              <div aria-live="polite" className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Profile name updated successfully.</span>
              </div>
            )}

            {profileError && (
              <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive dark:text-red-400 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              {/* Display Name Input */}
              <div className="space-y-1.5">
                <label
                  htmlFor="profile-display-name"
                  className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  Chef / Display Name
                </label>
                <Input
                  id="profile-display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. S. Vishaal"
                  className="min-h-[44px] rounded-xl"
                  maxLength={50}
                  disabled={profilePending}
                />
                <p className="text-[11px] text-muted-foreground/80">
                  Displayed on your recipes and culinary notes.
                </p>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Email Address
                </span>
                <div className="flex min-h-[44px] items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2 text-sm text-foreground">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="truncate">{user.email ?? 'Unknown'}</span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ShieldCheck className="h-3 w-3" />
                    Verified
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground/80">
                  Primary identifier managed through Supabase Auth.
                </p>
              </div>
            </div>

            {/* Member since metadata */}
            {memberSince && (
              <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary" />
                <span>Culinary member since {memberSince}</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                disabled={profilePending || displayName === (initialProfile?.display_name || user.user_metadata?.display_name || '')}
                className="min-h-[44px] rounded-xl px-5 text-xs font-semibold shadow-xs"
              >
                {profilePending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Saving…
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </form>
        </section>

        {/* ─── 2. APPEARANCE & THEME ─── */}
        <section aria-labelledby="section-appearance" className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-3.5 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h2 id="section-appearance" className="font-serif text-lg font-bold text-foreground">
                Appearance
              </h2>
              <p className="text-xs text-muted-foreground">
                Customize how Aurelia presents your culinary workspace
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                id: 'light',
                title: 'Light Theme',
                description: 'Warm porcelain canvas, crisp contrast for daylight kitchen prep.',
                icon: Sun,
              },
              {
                id: 'dark',
                title: 'Dark Theme',
                description: 'Deep slate with candlelight glow, designed for evening cooking.',
                icon: Moon,
              },
              {
                id: 'system',
                title: 'System Automatic',
                description: 'Seamlessly synchronizes with your device operating system setting.',
                icon: Monitor,
              },
            ].map((opt) => {
              const Icon = opt.icon
              const isSelected = isHydrated && theme === opt.id

              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setTheme(opt.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    'flex flex-col text-left p-4 rounded-xl border transition-all relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 min-h-[110px]',
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs'
                      : 'border-border/70 bg-card/60 hover:border-border hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          'flex h-7 w-7 items-center justify-center rounded-lg',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {opt.title}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {opt.description}
                  </p>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─── 3. CULINARY PREFERENCES ─── */}
        <section aria-labelledby="section-preferences" className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-3.5 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Utensils className="h-5 w-5" />
            </div>
            <div>
              <h2 id="section-preferences" className="font-serif text-lg font-bold text-foreground">
                Culinary Preferences
              </h2>
              <p className="text-xs text-muted-foreground">
                Personalize recipe measurement units, dietary focus, and kitchen defaults
              </p>
            </div>
          </div>

          {prefSaved && (
            <div aria-live="polite" className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Culinary preferences saved successfully.</span>
            </div>
          )}

          {prefError && (
            <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive dark:text-red-400 font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{prefError}</span>
            </div>
          )}

          {/* Measurement System */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Scale className="h-4 w-4 text-primary" />
              <span>Measurement Units</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Default system used when scaling ingredients and displaying cook instructions.
            </p>

            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setMeasurementSystem('imperial')}
                className={cn(
                  'flex items-center justify-center gap-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  measurementSystem === 'imperial'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-2xs'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-muted/40'
                )}
              >
                <span>Imperial (oz, lb, cups)</span>
                {measurementSystem === 'imperial' && <Check className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setMeasurementSystem('metric')}
                className={cn(
                  'flex items-center justify-center gap-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                  measurementSystem === 'metric'
                    ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-2xs'
                    : 'border-border/70 bg-card text-muted-foreground hover:border-border hover:bg-muted/40'
                )}
              >
                <span>Metric (g, kg, ml)</span>
                {measurementSystem === 'metric' && <Check className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Dietary Focus */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">
                Dietary Focus &amp; Allergens
              </span>
              <span className="text-xs text-muted-foreground">
                {dietaryPreferences.length} active
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Tag your preferences to highlight relevant recipes and tune AI culinary suggestions.
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              {DIETARY_OPTIONS.map((option) => {
                const isSelected = dietaryPreferences.includes(option)

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleToggleDietary(option)}
                    className={cn(
                      'inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 rounded-xl border text-xs font-medium transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'border-border/80 bg-card text-muted-foreground hover:border-border hover:text-foreground'
                    )}
                  >
                    <span>{option}</span>
                    {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <Button
              type="button"
              onClick={handleSavePreferences}
              disabled={prefPending}
              className="min-h-[44px] rounded-xl px-5 text-xs font-semibold shadow-xs"
            >
              {prefPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving…
                </>
              ) : (
                'Save Preferences'
              )}
            </Button>
          </div>
        </section>

        {/* ─── 4. SECURITY & CREDENTIALS ─── */}
        <section aria-labelledby="section-security" className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center gap-3.5 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 id="section-security" className="font-serif text-lg font-bold text-foreground">
                Security &amp; Credentials
              </h2>
              <p className="text-xs text-muted-foreground">
                Ensure your account is protected with a unique, secure password
              </p>
            </div>
          </div>

          <PasswordUpdateForm isRecovery={false} userEmail={user?.email || undefined} />
        </section>

        {/* ─── 5. ACCOUNT ACTIONS & DANGER ZONE ─── */}
        <section aria-labelledby="section-account" className="rounded-2xl border border-border/70 bg-card p-6 sm:p-7 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h2 id="section-account" className="font-serif text-lg font-bold text-foreground">
                Account &amp; Session
              </h2>
              <p className="text-xs text-muted-foreground">
                Manage your active cooking session and account state
              </p>
            </div>

            {/* Subordinate Sign Out Button */}
            <form action={logout}>
              <Button
                type="submit"
                variant="outline"
                className="min-h-[44px] rounded-xl px-4 text-xs font-medium text-foreground hover:bg-muted"
              >
                <LogOut className="h-4 w-4 mr-1.5 text-muted-foreground" />
                Sign out
              </Button>
            </form>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-5 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  <h3 className="text-sm font-semibold text-foreground">
                    Danger Zone
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                  Permanently delete your account and all associated culinary data, recipes, custom collections, and planned meals. This action cannot be undone.
                </p>
              </div>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setIsDeleteOpen(true)}
                className="min-h-[44px] rounded-xl px-4 text-xs font-semibold shrink-0"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md border-border/80 bg-card/95 backdrop-blur-xl p-6 rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="font-serif text-lg font-bold text-foreground">
              Delete Aurelia Account?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              This will permanently erase your culinary archive, including all recipes, ingredients, photos, notes, and collections. To confirm, please type <strong className="text-destructive">DELETE</strong> below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <Input
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="min-h-[44px] rounded-xl text-xs"
            />

            <div className="flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteOpen(false)
                  setDeleteConfirmation('')
                }}
                className="min-h-[44px] rounded-xl px-4 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleteConfirmation !== 'DELETE'}
                onClick={() => {
                  // In client-only scope, alert safety instruction
                  alert('Account deletion request acknowledged. Contact security administrator to finalize data purge.')
                  setIsDeleteOpen(false)
                  setDeleteConfirmation('')
                }}
                className="min-h-[44px] rounded-xl px-4 text-xs font-semibold shadow-xs"
              >
                Confirm Deletion
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
