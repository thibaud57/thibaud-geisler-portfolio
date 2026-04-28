type Props = {
  title?: string
  subtitle?: string
  children: React.ReactNode
}

export function PageShell({ title, subtitle, children }: Props) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
      {title ? (
        <header className="mb-8 flex flex-col items-center gap-2 text-center lg:mb-10">
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="max-w-2xl text-lg text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>
      ) : null}
      {children}
    </main>
  )
}
