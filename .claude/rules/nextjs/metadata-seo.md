---
paths:
  - "src/app/**/{page,layout}.tsx"
  - "src/app/{robots,sitemap,manifest}.ts"
  - "src/app/favicon.ico"
  - "src/app/**/{icon,apple-icon,opengraph-image,twitter-image}.*"
---

# Next.js — Metadata & SEO

## À faire
- Déclarer `metadataBase` dans le root layout : toutes les URLs relatives (OG images, canonical) s'y résolvent
- Utiliser `title: { template: '%s | Site Name', default: 'Site Name' }` dans le root layout pour titrer automatiquement les pages enfants
- Utiliser `generateMetadata` async pour les pages dynamiques, avec `await params`
- Définir `alternates.canonical` sur les pages dynamiques, et `alternates.languages` avec une clé `'x-default'` pour le FR/EN. Ces métadonnées sont la seule source des hreflang : `alternateLinks: false` (`src/i18n/routing.ts`) coupe le header `Link` que next-intl poserait sinon, calculé sans elles
- Exporter `viewport` ou `generateViewport` **séparément** de `metadata` : `themeColor`, `colorScheme` et `viewport` ont quitté l'objet `metadata` en Next 14
- Aligner `viewport.themeColor` sur les tokens `--background` light/dark de DESIGN.md, pas sur des hex déconnectés du design system
- Servir `robots`, `sitemap` et `manifest` par `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` (`MetadataRoute.Robots` / `Sitemap` / `Manifest`)
- Générer les images OG par `opengraph-image.tsx` + `ImageResponse`, en **1200×630 px** et en flexbox uniquement (`display: grid` n'est pas supporté)
- Injecter le JSON-LD dans un Server Component par `<script type="application/ld+json" dangerouslySetInnerHTML={...}>`, en échappant `<` en `<` dans le `JSON.stringify` (sinon un `</script>` injecté ferme la balise)

## À éviter
- Exporter `metadata` statique et `generateMetadata` dans le même segment : choisir un mode
- Compter sur un deep merge des `alternates` ou `openGraph.images` entre parent et enfant : le merge est **shallow**, l'enfant écrase le parent

## Gotchas
- **`ImageResponse` porte une RCE critique de Next 16.2.0 à 16.3.5** (CVE-2026-94545, corrigée en 16.3.6) : ne jamais redescendre sous 16.3.6, et ne jamais injecter dans le JSX d'une image OG une valeur saisie par un visiteur
- **`export const runtime` est interdit dans un `opengraph-image.tsx`** quand `cacheComponents: true` : le build rejette ce segment config, le projet l'a retiré de ses images OG (`docs/VERSIONS.md` § Next.js)
- Next 15.2+ : streaming metadata sur les pages dynamiques (`<meta>` injectés dans le `<body>` une fois `generateMetadata` résolu). Next sert un rendu **bloquant** aux user-agents de [`htmlLimitedBots`](https://nextjs.org/docs/app/api-reference/config/next-config-js/htmlLimitedBots) (LinkedIn, Twitter, Facebook, Slack, Discord, WhatsApp, Bingbot…). Next en exclut Googlebot, supposé lire le DOM rendu, mais Google n'accepte le canonical que dans le `<head>` : le projet l'ajoute, sans quoi les pages projet sortent sans canonical (Search Console, 2026-10-07)
- **L'inspection d'URL de Search Console ne voit pas ce problème** : `Google-InspectionTool` est servi en bloquant. Vérifier avec l'UA Googlebot
- **Auditer le SEO avec un UA de bot, jamais `curl` nu** : un crawl anonyme reçoit le streaming et fait croire à des métadonnées absentes du `<head>`. Comparer les offsets de `<title>` et `</head>` par UA (`curl -A "LinkedInBot/1.0"`)
- Ne PAS désactiver le streaming par `htmlLimitedBots: /.*/` (bugs connus avec `cacheComponents` + PPR sur 16.2.x-16.3.0). Le levier est une expression ciblée qui reprend la liste par défaut de Next (`node_modules/next/dist/shared/lib/router/utils/html-bots.js`, l'option la remplace au lieu de l'étendre) et ajoute `Googlebot`, `TelegramBot`, `Bluesky`, `Mastodon`
- React 19 hoiste nativement `<title>`, `<meta>`, `<link>` du JSX dans `<head>` : garder la Metadata API pour le SEO structurel, les balises natives pour les métadonnées locales
- Polices dans un `ImageResponse` : voir `nextjs/fonts.md`

## Exemples
```typescript
// ✅ Root layout : metadataBase, template de titre, viewport séparé
export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: { template: '%s | My Site', default: 'My Site' },
}
export const viewport: Viewport = { themeColor: [{ media: '(prefers-color-scheme: dark)', color: '…' }] }

// ❌ themeColor dans metadata (retiré en Next 14)
export const metadata: Metadata = { themeColor: '#000' }
```
