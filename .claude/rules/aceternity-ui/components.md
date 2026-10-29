---
paths:
  - "src/components/aceternity/**/*.tsx"
---

# Aceternity UI : composants animés premium

## À faire
- Installer par le skill `shadcn` (registry `@aceternity` déclaré dans `components.json`, voir [DESIGN.md § Outils & Discovery](../../../docs/DESIGN.md)) : l'alias `aceternity` de `components.json` dirige le CLI vers **`src/components/aceternity/`**, à part de `ui/` et de `magicui/`
- Importer **`motion`** via `motion/react`, jamais `framer-motion`
- Garder `'use client'` en tête du fichier du composant (le CLI le pose) : un Server Component parent l'importe directement, seul le composant porte la frontière client
- Réserver Aceternity aux **surfaces marketing du site public** (hero, sections clés) : jamais dans l'espace admin (DESIGN.md)
- Respecter le plafond d'effets par page, les durées et les easings de [DESIGN.md § Animations](../../../docs/DESIGN.md) ainsi que la répartition entre Aceternity UI, Magic UI et shadcn/ui de § Mapping Composants
- Documenter toute **modification locale** en commentaire de tête du fichier copié : lien vers l'upstream et pourquoi du diff (cf. `background-ripple-effect.tsx`)

## À éviter
- Garder **`framer-motion`** comme dépendance : renommé en `motion`
- Relancer `add --overwrite` sur un composant modifié sans reporter le diff documenté en tête : la modification disparaît en silence

## Gotchas
- **Pas de versioning sémantique** (copy-paste via registry shadcn) : pas de `pnpm update`, relancer `add --overwrite @aceternity/<component>` pour récupérer l'upstream
- Philosophie copy-paste (versionnement, modification, ownership) partagée avec shadcn-ui : voir `shadcn-ui/setup.md`

## Exemples
```typescript
// ✅ Server Component qui importe l'effet, 'use client' reste dans le fichier de l'effet
export default function Hero() {
  return <section className="relative"><BackgroundEffect /><h1>Titre</h1></section>
}

// ❌ framer-motion legacy
import { motion } from 'framer-motion'
```
