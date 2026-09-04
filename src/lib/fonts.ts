import { Geist, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'

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
// next/font/local, pas /google : le jeu de métriques figé dans Next (capsize-font-metrics.json)
// ne contient pas Sansation, donc la @font-face de fallback ajustée n'est jamais générée et le
// swap décale la mise en page (CLS desktop à 0,28 sur les titres longs). En local, Next mesure
// le fichier avec fontkit et calcule size-adjust/ascent-override quelle que soit la police.
// Le .ttf est celui déjà versionné pour les images OG, qui ne savent pas lire next/font.
const sansation = localFont({
  src: './seo/fonts/Sansation-Bold.ttf',
  weight: '700',
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
