"use client"

import Link from "next/link"
import { SearchX } from "lucide-react"
import type { Locale } from "next-intl"

import { Button } from "@/components/ui/button"
import { useUrlLocale } from "@/hooks/use-url-locale"

export interface NotFoundMessages {
  title: string
  description: string
  ctaLabel: string
}

interface Props {
  messages: Record<Locale, NotFoundMessages>
}

export function GlobalNotFoundContent({ messages }: Props) {
  const locale = useUrlLocale()
  const t = messages[locale]

  return (
    <main
      lang={locale}
      className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 px-4 py-12 text-center"
    >
      <SearchX aria-hidden className="size-16 text-muted-foreground" strokeWidth={1.5} />
      <h1>{t.title}</h1>
      <p className="text-base text-muted-foreground">{t.description}</p>
      <Button asChild size="lg">
        <Link href={`/${locale}`}>{t.ctaLabel}</Link>
      </Button>
    </main>
  )
}
