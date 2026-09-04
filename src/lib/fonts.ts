import { Geist, Geist_Mono, Sansation } from 'next/font/google'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
const sansation = Sansation({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-display',
  display: 'swap',
})

// À poser sur le <html> de TOUT document du projet. Un document rendu hors du layout
// [locale] (global-not-found, espace admin) qui les oublie perd les trois familles :
// --font-sans devient vide, `html { @apply font-sans }` résout dans le vide et le
// navigateur retombe sur son serif par défaut.
export const fontVariables = [
  geistSans.variable,
  geistMono.variable,
  sansation.variable,
].join(' ')
