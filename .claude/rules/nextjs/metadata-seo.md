---
paths:
  - "src/app/**/page.tsx"
  - "src/app/**/layout.tsx"
  - "src/app/robots.ts"
  - "src/app/sitemap.ts"
  - "src/app/manifest.ts"
  - "src/app/favicon.ico"
  - "src/app/**/icon.*"
  - "src/app/**/apple-icon.*"
  - "src/app/**/opengraph-image.*"
  - "src/app/**/twitter-image.*"
---

# Next.js — Metadata & SEO

## À faire
- Pour `viewport.themeColor`, aligner les couleurs sur les tokens `--background` light/dark de la palette définie dans `DESIGN.md` plutôt que des hex en dur déconnectés du design system
- Déclarer `metadataBase: new URL('https://example.com')` dans le root layout pour que toutes les URLs relatives (OG images, canonical) soient résolues correctement
- Utiliser `title: { template: '%s | Site Name', default: 'Site Name' }` dans le root layout pour appliquer automatiquement le template aux pages enfants
- Utiliser `generateMetadata` async pour les pages dynamiques (`/items/[slug]`), avec `await params` obligatoire
- Définir `alternates.canonical` sur les pages dynamiques pour éviter le contenu dupliqué
- Définir `alternates.languages` avec une clé `'x-default'` pour le SEO multilingue FR/EN
- Exporter `viewport` ou `generateViewport` **séparément** de `metadata` (themeColor, colorScheme, viewport sont retirés de l'objet `metadata` depuis Next 14)
- Utiliser les fichiers `app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` pour les metadata dynamiques (retournent `MetadataRoute.Robots` / `Sitemap` / `Manifest`)
- Générer les images OG dynamiques via `opengraph-image.tsx` + `ImageResponse` (flexbox uniquement, pas de grid)
- Dimensionner les images OG en **1200x630 px** pour un affichage optimal toutes plateformes
- Échapper `<` en `\u003c` dans `JSON.stringify` des JSON-LD pour éviter l'injection de `</script>`
- Injecter le JSON-LD dans un Server Component via `<script type="application/ld+json" dangerouslySetInnerHTML={...}>`

## À éviter
- Exporter à la fois `metadata` statique et `generateMetadata` dans le même segment (impossible, choisir un mode)
- Mettre `themeColor`, `colorScheme` ou `viewport` dans l'objet `metadata` : **dépréciés** Next 14, utiliser l'export `viewport` séparé
- Compter sur un deep merge des `alternates` ou `openGraph.images` entre parent et enfant : le merge est **shallow**, la valeur enfant écrase complètement la parente
- Utiliser `next/font` dans `ImageResponse` : ne fonctionne pas, charger les fichiers font manuellement avec `readFile`
- Utiliser `display: grid` dans `ImageResponse` : seul `flex` est supporté

## Gotchas
- Next 15.2+ : streaming metadata activé sur les pages dynamiques (UI streamé immédiatement, `<meta>` injectés une fois `generateMetadata` résolu), désactivé pour les bots/crawlers
- Codemod dispo pour migrer viewport : `npx @next/codemod metadata-to-viewport-export`
- React 19 supporte nativement `<title>`, `<meta>`, `<link>` dans le JSX (hoist auto dans `<head>`) : garder la Metadata API pour le SEO structurel, utiliser les balises natives pour les métadonnées locales (widget, Client Component)

## Exemples
```typescript
// ✅ Root layout : metadataBase + title template + viewport séparé
export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: { template: '%s | My Site', default: 'My Site' },
  description: '...',
}

export const viewport: Viewport = {
  themeColor: [{ media: '(prefers-color-scheme: dark)', color: '...' }],
}

// ❌ themeColor dans metadata (déprécié Next 14, utiliser export viewport)
export const metadata: Metadata = { themeColor: '#000' }
```

```typescript
// ✅ generateMetadata dynamique avec params async
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const item = await getItem(slug)
  return {
    title: item.title,
    alternates: { canonical: `/items/${slug}` },
    openGraph: { images: [{ url: `/items/${slug}/opengraph-image`, width: 1200, height: 630 }] },
  }
}

// ❌ params synchrone (hard error Next 16)
export async function generateMetadata({ params }: { params: { slug: string } }) { ... }
```

```typescript
// ✅ app/sitemap.ts — retourne MetadataRoute.Sitemap
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const items = await getItems()
  return [
    { url: 'https://example.com', lastModified: new Date() },
    ...items.map(item => ({ url: `https://example.com/items/${item.slug}`, lastModified: item.updatedAt })),
  ]
}
```
