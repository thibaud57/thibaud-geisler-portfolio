'use client'

import { useServerInsertedHTML } from 'next/navigation'

import { themeInitScript } from '@/lib/theme-script'

// Injecte le script anti-FOUC dans le flux SSR uniquement : rendu client = null, donc
// React ne rencontre jamais de <script> au re-render (l'avertissement que next-themes
// déclenchait, cf. pacocoursey/next-themes#387) et le script n'est jamais dupliqué.
export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
  ))
  return null
}
