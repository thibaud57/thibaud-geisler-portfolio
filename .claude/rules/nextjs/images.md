---
paths:
  - "next.config.ts"
  - "src/{app,components}/**/*.tsx"
---

# Next.js — Images (next/image)

## À faire
- Utiliser exclusivement `next/image` pour les images (jamais `<img>`) : lazy loading, avif/webp, redimensionnement, prévention du CLS
- Fournir `width` et `height` pour les images distantes (calcul du ratio, réservation de l'espace)
- Fournir `alt`, chaîne vide `""` si l'image est purement décorative
- Définir `sizes` sur les images `fill` pour un `srcset` adaptatif complet
- Poser `preload` sur l'image LCP au-dessus de la ligne de flottaison (hero, logo de navbar)
- Pointer un asset de la route `/api/assets/[...path]` (ADR-011) par le **chemin relatif** que construit `buildAssetUrl()` : ni préfixe `NEXT_PUBLIC_SITE_URL`, ni domaine dans `images.remotePatterns`, une URL absolue ferait traiter comme distante une image de la même origine
- Poser `unoptimized` sur un asset servi par une **route authentifiée** : l'optimiseur rejoue la requête sans cookie et se fait refuser. Le wrapper `AssetImage` pose le flag d'après la clé, les assets publics gardent l'optimisation
- Déclarer `images.remotePatterns` (`protocol`, `hostname`, `pathname`) pour chaque domaine externe réellement autorisé
- Utiliser `placeholder="blur"` pour les imports statiques (blurDataURL auto-généré)

## À éviter
- `images.domains` (déprécié depuis Next 14, → `remotePatterns`), `next/legacy/image` et la prop `priority` (dépréciés en Next 16, → `next/image`, `preload`)
- Servir des images dynamiques depuis `public/` : pas de hashing, couplage au build, incompatible avec l'upload depuis l'espace admin
- Poser `unoptimized` sur un SVG dont l'URL finit par `.svg` : Next l'applique déjà. Le poser seulement sur un SVG servi sous une autre URL

## Gotchas
- Next 16 : `images.minimumCacheTTL` passe de 60 s à **4 h**, `images.qualities` est restreint à `[75]` (toute autre valeur coercée sauf déclaration explicite), `images.imageSizes` perd la valeur `16`
- `sharp` publie des binaires musl : aucun paquet système à ajouter sur `node:24-alpine`. En `output: 'standalone'`, il doit être résolu, sinon définir `NEXT_SHARP_PATH`. Le prouver par une requête `/_next/image` sur l'image Docker, pas par un `import('sharp')` depuis `/app`, qui ne voit pas le `node_modules` de Next
- **React 19 précharge de lui-même une `<img>` non lazy rendue dans le shell** : `loading="eager"` émet le même `<link rel="preload">` que la prop `preload` de `next/image`. Une image en deux variantes masquées par thème (`ThemedImage`) voit donc ses deux variantes préchargées quelle que soit la prop (constaté le 9 octobre 2026, Next 16.4 et React 19.3). Seul `loading="lazy"` y échappe
- Polices et `ImageResponse` : voir `nextjs/fonts.md`

## Exemples
```typescript
// ✅ Image LCP : preload, dimensions, alt, sizes
<Image src="/hero.jpg" alt="…" width={1200} height={600} preload sizes="100vw" />

// ✅ Asset de la route interne : chemin relatif, aucun remotePatterns
<Image src={buildAssetUrl(key)} alt="…" width={640} height={360} />

// ❌ priority déprécié, alt manquant, URL absolue sur la même origine
<Image src={`${siteUrl}/api/assets/${key}`} priority fill />
```
