---
paths:
  - "next.config.ts"
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Next.js — Images & Fonts

## À faire
- Utiliser exclusivement `next/image` pour les images (jamais `<img>`) pour bénéficier du lazy loading, avif/webp, redimensionnement, prévention CLS
- Fournir `width` et `height` obligatoires pour les images distantes (calcul du ratio, réservation de l'espace)
- Fournir `alt` obligatoire : chaîne vide `""` si l'image est purement décorative
- Définir `sizes` sur les images `fill` pour un `srcset` adaptatif correct
- Utiliser `preload` sur l'image LCP above-the-fold (logo, hero) pour un chargement prioritaire
- Déclarer `images.remotePatterns` dans `next.config.ts` avec `protocol`, `hostname`, `pathname` pour chaque domaine externe autorisé
- Utiliser `next/font/google` ou `next/font/local` avec `variable: '--font-xxx'` + `display: 'swap'` pour self-hosting des polices et éviter le FOIT
- Pour `next/font` + Tailwind v4 : mapper les variables CSS dans `@theme inline` du `globals.css`
- **Polices du projet (DESIGN.md)**, chargées dans `src/lib/fonts.ts`, exposées par `fontVariables` et posées sur le `<html>`
  - **`Geist Sans`** → corps de texte, UI, titres H2-H6, navigation, boutons (`next/font/google`, variable `--font-sans`)
  - **`Geist Mono`** → blocs de code, snippets, éléments de stack technique (`next/font/google`, variable `--font-mono`)
  - **`Sansation`** → titres hero H1, éléments de marque, logo (`next/font/local` sur `src/lib/seo/fonts/Sansation-Bold.woff2`, variable `--font-display`, mappée à la classe `font-display`)
- Respecter la scale typographique DESIGN.md (H1/H2/H3 appliqués globalement via `@layer base` dans `globals.css` — voir `tailwind/conventions.md`)
- Utiliser `placeholder="blur"` pour les imports statiques (blurDataURL auto-généré)
- Servir les assets dynamiques via la route catch-all `/api/assets/[...path]` (ADR-011, convention nested `projets/{client,personal}/<slug>/<filename>`) : les pointer avec le **chemin relatif** que construit `buildAssetUrl()`. Ne PAS préfixer par `NEXT_PUBLIC_SITE_URL` ni déclarer le domaine dans `images.remotePatterns` — une URL absolue ferait traiter comme distante une image servie par la même origine, sans aucun gain

## À éviter
- Utiliser `images.domains` : **déprécié** Next 16, utiliser `remotePatterns` (plus granulaire et sécurisé)
- Utiliser `next/legacy/image` : **déprécié** Next 16, migrer vers `next/image`
- Utiliser `priority` : **déprécié** Next 16, renommé `preload`
- Omettre `sizes` sur une image `fill` : Next.js génère un `srcset` limité (1x/2x) au lieu du jeu complet adaptatif
- Servir des images dynamiques depuis `public/` : pas de hashing, pas de cache-busting, couplage au build. Utiliser une route API dédiée
- Utiliser des SVG en `<Image>` sans `unoptimized` : l'optimisation n'apporte rien pour les SVG
- Importer `next/font` dans `ImageResponse` : **ne fonctionne pas**, charger manuellement le fichier de police via `readFile` (`.woff2` compris, cf. Gotchas)
- Charger une police Google **peu répandue** via `next/font/google` sans vérifier sa couverture métriques (cf. Gotchas) : le fallback ajusté est abandonné en silence et le swap provoque du CLS

## Gotchas
- **`adjustFontFallback` échoue en silence sur une police Google absente du jeu de métriques.** Next embarque un snapshot figé (`next/dist/server/capsize-font-metrics.json`, ~1750 entrées, épinglé sur `@capsizecss/metrics`). Police absente → un `Log.error` au build, aucune `@font-face` de fallback, aucun `size-adjust` : le swap décale la mise en page. Sansation était dans ce cas (CLS desktop 0,28 sur les titres longs, invisible sur les titres courts)
  - **Vérifier avant d'adopter une police Google** : `node -e "console.log('<nom-minuscules>' in require('next/dist/server/capsize-font-metrics.json'))"`
  - **Si absente → `next/font/local`** : il parse le fichier réel avec `fontkit` et calcule les overrides quelle que soit la police, sans dépendre du snapshot
  - **Contrôler après coup** : le CSS de build doit porter `font-family:<police>,<police> Fallback` et une `@font-face` avec `size-adjust`/`ascent-override`
- **`preload: false` sur une police la casse** (Next 16.3.3 + Turbopack) : le fichier est renommé `-s.<hash>`, le CSS suit, mais le hint du payload RSC garde `-s.p.<hash>` → **500** à chaque rendu. Vu sur `Geist_Mono`, 2026-09-05
- **Un seul woff2 par police suffit** : `fontkit` le mesure comme un TTF (`size-adjust` identique avant/après conversion) et **satori l'accepte** pour les `ImageResponse` (PNG identique au bit près). Un TTF gardé « pour les OG » est du poids mort
- Next 16 : `images.minimumCacheTTL` passe de 60s à **4h** (14400s), réduit le coût de revalidation
- Next 16 : `images.qualities` restreint à `[75]` par défaut, toute autre valeur est coercée sauf déclaration explicite (`qualities: [25, 50, 75, 100]`)
- Next 16 : `images.imageSizes` perd la valeur `16` par défaut (retina fetch 32px minimum)
- Docker `node:24-alpine` : `sharp` nécessite `libc6-compat` installé via `apk add --no-cache libc6-compat` (Node 24 LTS, Node 20 EOL 2026-04-30)
- En mode `output: 'standalone'`, vérifier que `sharp` est bien résolu, sinon définir `NEXT_SHARP_PATH`

## Exemples
```typescript
// ✅ Image LCP : preload + width/height + alt + sizes
<Image src="/hero.jpg" alt="..." width={1200} height={600} preload sizes="100vw" />

// ❌ priority déprécié Next 16, alt manquant, pas de sizes sur fill
<Image src="/hero.jpg" priority fill />
```

```typescript
// ✅ next/font/google avec variable CSS + display swap
const font = SomeFont({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // suppressHydrationWarning requis par le store de thème (cf. theming/theme-store.md), pas par next/font
  return <html lang="fr" suppressHydrationWarning className={font.variable}>{ ... }</html>
}
```

```css
/* ✅ globals.css : mapping next/font → Tailwind v4 via @theme inline */
@import 'tailwindcss';
@theme inline { --font-sans: var(--font-sans); }
```

```typescript
// ✅ remotePatterns pour assets servis via une route API dynamique
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.example.com', pathname: '/api/assets/**' }],
  },
}

// ❌ images.domains (déprécié Next 16, utiliser remotePatterns)
images: { domains: ['cdn.example.com'] }
```
