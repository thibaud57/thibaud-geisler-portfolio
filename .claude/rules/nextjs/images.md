---
paths:
  - "next.config.ts"
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Next.js — Images (next/image)

## À faire
- Utiliser exclusivement `next/image` pour les images (jamais `<img>`) : lazy loading, avif/webp, redimensionnement, prévention du CLS
- Fournir `width` et `height` pour les images distantes (calcul du ratio, réservation de l'espace)
- Fournir `alt`, chaîne vide `""` si l'image est purement décorative
- Définir `sizes` sur les images `fill` pour un `srcset` adaptatif complet
- Poser `preload` sur l'image LCP au-dessus de la ligne de flottaison (logo, hero)
- Pointer un asset de la route `/api/assets/[...path]` (ADR-011) par le **chemin relatif** que construit `buildAssetUrl()` : ni préfixe `NEXT_PUBLIC_SITE_URL`, ni domaine dans `images.remotePatterns`, une URL absolue ferait traiter comme distante une image de la même origine
- Poser `unoptimized` sur un asset servi par une **route authentifiée** : l'optimiseur rejoue la requête sans cookie et se fait refuser. Le wrapper `AssetImage` pose le flag d'après la clé, les assets publics gardent l'optimisation
- Déclarer `images.remotePatterns` (`protocol`, `hostname`, `pathname`) pour chaque domaine externe réellement autorisé
- Utiliser `placeholder="blur"` pour les imports statiques (blurDataURL auto-généré)

## À éviter
- `images.domains`, `next/legacy/image` et la prop `priority` : dépréciés en Next 16 (respectivement `remotePatterns`, `next/image`, `preload`)
- Servir des images dynamiques depuis `public/` : pas de hashing, couplage au build, incompatible avec l'upload depuis l'espace admin
- Optimiser un SVG : l'optimiseur n'apporte rien, poser `unoptimized`

## Gotchas
- Next 16 : `images.minimumCacheTTL` passe de 60 s à **4 h**, `images.qualities` est restreint à `[75]` (toute autre valeur coercée sauf déclaration explicite), `images.imageSizes` perd la valeur `16`
- `sharp` exige `libc6-compat` sur `node:24-alpine`, et en `output: 'standalone'` il doit être résolu, sinon définir `NEXT_SHARP_PATH`
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
