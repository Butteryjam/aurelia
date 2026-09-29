export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      {/* Left panel — brand / illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden">
        {/* Warm gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-secondary/40 to-accent/20" />
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px',
        }} />

        <div className="relative z-10 max-w-md text-center space-y-8 px-12 animate-fade-up">
          {/* Brand mark */}
          <div className="space-y-3">
            <h1 className="text-display">Aurelia</h1>
            <div className="mx-auto h-px w-12 bg-primary/30" />
          </div>

          {/* Tagline */}
          <p className="text-lg text-muted-foreground leading-relaxed font-serif italic">
            Your personal culinary archive
          </p>

          {/* Feature pillars */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground/70">
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/8 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>
              </span>
              <span className="text-xs font-medium">Save Recipes</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/8 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><path d="M12 17h.01"/></svg>
              </span>
              <span className="text-xs font-medium">AI Assistant</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/8 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" x2="18" y1="17" y2="17"/></svg>
              </span>
              <span className="text-xs font-medium">Cook Mode</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-8 lg:px-12 bg-background">
        <div className="w-full max-w-[380px] animate-fade-in">{children}</div>
      </div>
    </div>
  )
}
