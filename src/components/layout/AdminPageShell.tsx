import type { ReactNode } from "react"

interface Props {
  title: string
  subtitle?: string
  actions?: ReactNode
  children?: ReactNode
}

// font-sans et font-semibold sont nécessaires : @layer base pose font-display et font-bold sur h1,
// qu'une utilitaire de taille seule n'écrase pas
export function AdminPageShell({ title, subtitle, actions, children }: Props) {
  return (
    <div className="flex w-full flex-col gap-4 px-4 py-6 md:px-6 lg:py-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-60 flex-1 flex-col gap-2">
          <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
