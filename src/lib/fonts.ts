import { Geist, Geist_Mono } from 'next/font/google'
import localFont from 'next/font/local'

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})
// Pas de `preload: false` : Next 16.3.3 renomme alors le fichier `-s.<hash>` mais le hint du
// payload RSC garde `-s.p.<hash>`, et la police part en 500 (vérifié en build local 2026-09-05).
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
// next/font/local, pas /google : le jeu de métriques figé dans Next (capsize-font-metrics.json)
// ne contient pas Sansation, donc la @font-face de fallback ajustée n'est jamais générée et le
// swap décale la mise en page (CLS desktop à 0,28 sur les titres longs). En local, Next mesure
// le fichier avec fontkit et calcule size-adjust/ascent-override quelle que soit la police.
// Un seul .woff2 pour le navigateur et les images OG : satori le lit aussi (rendu identique
// au bit près face au .ttf, supprimé depuis).
const sansation = localFont({
  src: './seo/fonts/Sansation-Bold.woff2',
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
