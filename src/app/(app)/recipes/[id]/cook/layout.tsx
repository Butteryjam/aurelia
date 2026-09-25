/**
 * Cook Mode layout.
 * The CookModeView component uses `fixed inset-0 z-50` to create an
 * immersive full-screen overlay, so no special layout chrome is needed here.
 */
export default function CookLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
