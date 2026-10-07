---
paths:
  - "src/lib/fonts.ts"
  - "src/app/**/layout.tsx"
  - "src/app/**/opengraph-image.*"
  - "src/app/globals.css"
---

# Next.js — Polices (next/font)

## À faire
- Charger les polices par `next/font/google` ou `next/font/local` avec `variable: '--font-xxx'` et `display: 'swap'` : self-hosting, pas de FOIT
- Mapper les variables CSS dans `@theme inline` de `globals.css` pour Tailwind v4
- Charger les polices du projet dans `src/lib/fonts.ts`, exposées par `fontVariables` et posées sur le `<html>` (DESIGN.md) :
  - **`Geist Sans`** (`--font-sans`) : corps de texte, UI, navigation, boutons, et titres H2-H6 hors exceptions de la landing
  - **`Geist Mono`** (`--font-mono`) : code, snippets, éléments de stack technique
  - **`Sansation`** (`next/font/local` sur `src/lib/seo/fonts/Sansation-Bold.woff2`, `--font-display`, classe `font-display`) : titres hero H1, logo, et selon DESIGN.md les titres de cards marketing et les H2 des sections de la landing
- Respecter la scale typographique de DESIGN.md, appliquée globalement par `@layer base` (voir `tailwind/conventions.md`)
- Vérifier qu'une police Google figure dans le jeu de métriques de Next avant de l'adopter, sinon passer par `next/font/local` (cf. Gotchas)

## À éviter
- Importer `next/font` dans un `ImageResponse` : ne fonctionne pas, charger le fichier par `readFile`, en `.ttf` ou `.otf` (cf. Gotchas)
- Poser `preload: false` sur une police (cf. Gotchas)

## Gotchas
- **`adjustFontFallback` échoue en silence sur une police Google absente du jeu de métriques** (`next/dist/server/capsize-font-metrics.json`, ~1750 entrées figées) : un `Log.error` au build, aucune `@font-face` de fallback, aucun `size-adjust`, et le swap décale la mise en page. Sansation était dans ce cas (CLS desktop 0,28 sur les titres longs)
  - Vérifier : `node -e "console.log('<nom-minuscules>' in require('next/dist/server/capsize-font-metrics.json'))"`
  - Si absente → `next/font/local`, qui mesure le fichier réel avec `fontkit`
  - Contrôler : le CSS de build porte `font-family:<police>,<police> Fallback` et une `@font-face` avec `size-adjust`
- **`preload: false` casse la police** (Next 16.3.3 + Turbopack) : le fichier devient `-s.<hash>` mais le hint du payload RSC garde `-s.p.<hash>`, d'où un **500** à chaque rendu (vu sur `Geist_Mono`, 2026-09-05)
- **`ImageResponse` ne lit pas le woff2** : satori lève `Unsupported OpenType signature wOF2`, l'image OG part en **502**. Garder un `.ttf` pour les OG à côté du `.woff2` du navigateur (garde-fou : `og-fonts.integration.test.tsx`)

## Exemples
```typescript
// ✅ Police locale avec variable CSS et swap
const display = localFont({ src: './fonts/Display-Bold.woff2', variable: '--font-display', display: 'swap' })

// ✅ ImageResponse : police lue sur disque, en TTF
const font = await readFile(join(process.cwd(), 'src/lib/seo/fonts/Display-Bold.ttf'))

// ❌ next/font dans ImageResponse, et preload: false
const mono = Geist_Mono({ subsets: ['latin'], preload: false })
```
