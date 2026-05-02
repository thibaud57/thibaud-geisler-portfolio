---
title: "Aceternity UI — Effets visuels premium"
version: "copy-paste"
description: "Référence technique pour Aceternity UI : composants d'effets copy-paste via shadcn CLI."
date: "2026-04-13"
keywords: ["aceternity", "ui", "motion", "shadcn", "effects"]
scope: ["docs"]
technologies: ["Next.js", "shadcn/ui", "Tailwind CSS", "motion"]
---

# Description

`Aceternity UI` est une collection de composants React premium aux effets visuels avancés (Aurora Background, Spotlight, 3D Card, Infinite Moving Cards), distribuée en copy-paste via le registry shadcn. Pas de package npm : les composants sont copiés dans `src/components/ui/` et modifiables. Utilisée dans le portfolio pour les effets hero et les sections visuelles impactantes, en complément de shadcn/ui (UI fonctionnelle) et Magic UI.

---

# Concepts Clés

## Installation via shadcn CLI

### Description

Aceternity UI s'appuie sur le CLI shadcn. Les composants sont référencés via `@aceternity/<component>` depuis la v4 du CLI, ou via URL directe du registry. Chaque composant installe aussi ses dépendances (typiquement `motion`, `clsx`, `tailwind-merge`).

### Exemple

```bash
# Installer un composant Aceternity via shadcn CLI
pnpm dlx shadcn@latest add @aceternity/aurora-background
pnpm dlx shadcn@latest add @aceternity/spotlight
pnpm dlx shadcn@latest add @aceternity/3d-card
```

### Points Importants

- Le CLI shadcn gère tout : copy du code, installation des deps
- Chaque composant est modifiable dans `src/components/ui/`
- Prévisualiser avec `--dry-run` avant d'écrire
- Nécessite un `components.json` shadcn initialisé

---

## Import motion/react (pas framer-motion)

### Description

Aceternity UI utilise le package `motion` (anciennement framer-motion). L'API est identique, seul l'import change. Les composants existants importent via `motion/react`. Migration triviale : remplacer `from 'framer-motion'` par `from 'motion/react'`.

### Exemple

```tsx
// src/components/features/hero.tsx
'use client'
import { motion } from 'motion/react'
import { AuroraBackground } from '@/components/ui/aurora-background'

export function Hero() {
  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="flex flex-col gap-4 items-center justify-center"
      >
        <h1 className="text-5xl font-bold">Thibaud Geisler</h1>
        <p className="text-xl">IA & Full-Stack</p>
      </motion.div>
    </AuroraBackground>
  )
}
```

### Points Importants

- Package `motion` installé (pas `framer-motion`)
- Import : `from 'motion/react'` (pas `'motion'` sans sous-chemin)
- API identique à framer-motion : `initial`, `animate`, `whileInView`, etc.
- Les composants doivent être marqués `'use client'`

---

## 'use client' obligatoire

### Description

Tous les composants Aceternity utilisent des hooks React (`useState`, `useEffect`, `useRef`) et des APIs browser (détection de souris, intersection observer). Ils requièrent systématiquement `'use client'` en tête de fichier dans un contexte Next.js App Router.

### Exemple

```tsx
// Le composant généré par le CLI contient déjà 'use client'
// src/components/ui/aurora-background.tsx
'use client'
import { cn } from '@/lib/utils'
import React from 'react'

export const AuroraBackground = ({ children, className, ...props }) => {
  return (
    <div className={cn('relative flex flex-col', className)} {...props}>
      {/* ... logique de rendu */}
      {children}
    </div>
  )
}
```

### Points Importants

- Pas utilisable dans un Server Component direct
- Pattern : wrapper dans un composant parent marqué `'use client'`
- Ou créer un composant `(public)/HomeSection.tsx` client qui importe Aceternity
- Les Server Components parents peuvent passer du contenu via `children`

---

## Utilitaire cn() et dépendances

### Description

Tous les composants Aceternity utilisent la fonction `cn()` (combinaison `clsx` + `tailwind-merge`) pour gérer les classes conditionnelles sans conflits. Partagée avec shadcn/ui dans `src/lib/utils.ts`. Si shadcn/ui est déjà installé, `cn` existe déjà.

### Exemple

```ts
// src/lib/utils.ts (partagé avec shadcn/ui)
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Points Importants

- `cn()` est partagé entre shadcn/ui, Aceternity et Magic UI
- Pas besoin de le dupliquer si shadcn/ui est déjà initialisé
- Dépendances : `clsx`, `tailwind-merge`, `motion`
- Le CLI shadcn installe automatiquement ces deps

---

# Bonnes Pratiques

## ✅ Recommandations

- Installer via shadcn CLI avec la syntaxe `@aceternity/<component>`
- Importer `motion` depuis `motion/react` (pas `framer-motion`)
- Marquer explicitement `'use client'` dans les composants parents qui utilisent Aceternity
- Combiner shadcn/ui (UI fonctionnelle) + Aceternity (effets visuels premium)
- Partager le `cn()` entre toutes les libs copy-paste

## ❌ Anti-Patterns

- Ne pas importer Aceternity dans un Server Component direct
- Ne pas garder `framer-motion` comme dépendance (déprécié, utiliser `motion`)
- Ne pas dupliquer `cn()` à chaque composant
- Ne pas surcharger tout le site d'effets Aceternity (sobriété recommandée)
- Ne pas oublier de vérifier la compatibilité avec Tailwind v4 pour certains composants

---

# 🔗 Ressources

## Documentation Officielle

- [Aceternity UI : Site](https://ui.aceternity.com/)
- [Aceternity UI : Components](https://ui.aceternity.com/components)
- [CLI Reference](https://ui.aceternity.com/docs/cli)

## Ressources Complémentaires

- [motion (ex-framer-motion)](https://motion.dev/docs/react)
- [Migration framer-motion → motion](https://motion.dev/docs/react-upgrade-guide)
