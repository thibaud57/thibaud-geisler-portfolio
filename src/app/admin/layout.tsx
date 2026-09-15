import type { Metadata } from "next"
import type { ReactNode } from "react"

import { ThemeScript } from "@/components/theme-script"
import { Toaster } from "@/components/ui/sonner"
import { fontVariables } from "@/lib/fonts"

import "@/app/globals.css"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <ThemeScript />
        {children}
        <Toaster />
      </body>
    </html>
  )
}
