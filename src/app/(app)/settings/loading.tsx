import { PageHeaderSkeleton, SettingsSectionSkeleton } from '@/components/shared/skeletons'

export default function SettingsLoading() {
  return (
    <div
      role="status"
      aria-label="Loading Account Settings"
      className="space-y-8 pb-16 max-w-3xl mx-auto animate-fade-in"
    >
      <span className="sr-only">Loading your settings and preferences…</span>

      {/* Page Header Skeleton */}
      <PageHeaderSkeleton hasBadge={false} />

      {/* 5 Distinct Settings Sections matching SettingsView */}
      <div className="space-y-6 pt-1">
        {/* 1. Profile & Identity */}
        <SettingsSectionSkeleton />

        {/* 2. Appearance */}
        <SettingsSectionSkeleton />

        {/* 3. Culinary Preferences */}
        <SettingsSectionSkeleton />

        {/* 4. Security & Credentials */}
        <SettingsSectionSkeleton />

        {/* 5. Account Management */}
        <SettingsSectionSkeleton />
      </div>
    </div>
  )
}
