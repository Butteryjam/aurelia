export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Left panel — brand / illustration */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center bg-primary/5 px-12">
        <div className="max-w-md text-center space-y-6">
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">
            Aurelia
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Your personal culinary archive.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground/80">
            <span>✦ Save recipes</span>
            <span>✦ AI assistant</span>
            <span>✦ Cook mode</span>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  )
}
