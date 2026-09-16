import type { ReactNode } from "react"

interface Props {
  title: string
  subtitle?: string
  children?: ReactNode
}

// font-sans et font-semibold sont nécessaires : @layer base pose font-display et font-bold sur h1,
// qu'une utilitaire de taille seule n'écrase pas
export function AdminPageShell({ title, subtitle, children }: Props) {
  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle ? <p className="mt-2 text-muted-foreground">{subtitle}</p> : null}
      {children ? <div className="mt-6">{children}</div> : null}
    </div>
  )
}
