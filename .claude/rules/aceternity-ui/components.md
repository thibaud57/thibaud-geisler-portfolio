---
paths:
  - "src/components/aceternity/**/*.tsx"
---

# Aceternity UI — Composants animés premium

## À faire
- Installer via le CLI shadcn avec syntaxe namespace : **`pnpm dlx shadcn@latest add @aceternity/<component>`** (registry déclaré dans `components.json`, voir [DESIGN.md § Outils & Discovery](../../../docs/DESIGN.md))
- Laisser le CLI écrire dans **`src/components/aceternity/`** : l'alias `aceternity` de `components.json` l'y dirige, à part de `ui/` (shadcn) et de `magicui/`
- Importer **`motion`** via `motion/react`, jamais `framer-motion`
- Marquer **`'use client'`** tout composant qui consomme Aceternity : `useState`, `useEffect`, `useRef`, intersection observer, détection souris
- Garder Aceternity dans un **îlot client** en bas de l'arbre : le Server Component parent lui passe son contenu par `children`, il ne l'importe jamais directement
- Réserver Aceternity aux **surfaces marketing du site public** (hero, sections clés) : jamais dans l'espace admin (DESIGN.md)
- Répartir les rôles entre Aceternity UI, Magic UI et shadcn/ui selon [DESIGN.md § Mapping Composants](../../../docs/DESIGN.md)
- Limiter à **2-3 effets par page**, d'intensité subtile : durée 200-400ms, easing `ease-out` (entrées) ou `ease-in-out` (transitions) (DESIGN.md)
- Composer les classes par le **`cn()` partagé** de `src/lib/utils.ts`, jamais redéfini dans un composant
- Documenter toute **modification locale** en commentaire de tête du fichier copié : lien vers l'upstream et pourquoi du diff (cf. `background-ripple-effect.tsx`)

## À éviter
- Garder **`framer-motion`** comme dépendance : legacy, incompatible avec React 19 sans overrides
- Relancer `add --overwrite` sur un composant modifié sans reporter le diff documenté en tête : la modification disparaît en silence

## Gotchas
- **Pas de versioning sémantique** (copy-paste via registry shadcn) : pas de `pnpm update`, relancer `shadcn@latest add --overwrite @aceternity/<component>` pour récupérer l'upstream
- `motion` v12+ requis (version exacte : `docs/VERSIONS.md`) : Aceternity l'utilise à la place de `framer-motion`
- Les composants Aceternity suivent Tailwind v4, la variante v3 est dépréciée côté Aceternity
- La syntaxe namespacée `@aceternity/<component>` exige le CLI shadcn 3.0+ (avant : URL directe du registry)
- Philosophie copy-paste (versionnement, modification, ownership) partagée avec shadcn-ui : voir `shadcn-ui/setup.md`

## Exemples
```typescript
// ✅ Server Component parent, îlot client pour l'effet
export default function Page() {
  return <main><Hero /></main>
}

'use client'
export function Hero() {
  return <section className="relative"><BackgroundEffect /><h1>Titre</h1></section>
}

// ❌ Effet importé dans un Server Component, et framer-motion legacy
import { motion } from 'framer-motion'
export default function Page() { return <Spotlight /> }
```
