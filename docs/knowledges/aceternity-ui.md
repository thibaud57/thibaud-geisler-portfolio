---
title: "Aceternity UI : Effets visuels premium"
version: "n/a (composant copié)"
description: "Référence technique pour Aceternity UI : composants d'effets copy-paste via shadcn CLI."
date: "2026-10-28"
keywords: ["aceternity", "ui", "motion", "shadcn", "effects"]
scope: ["docs"]
technologies: ["Next.js", "shadcn/ui", "Tailwind CSS", "motion"]
---

# Description

`Aceternity UI` est une collection de composants React premium aux effets visuels avancés (Aurora Background, Spotlight, 3D Card, Infinite Moving Cards), distribuée en copy-paste via le registry shadcn. Pas de package npm : les composants sont copiés dans `src/components/aceternity/` (alias `aceternity` de `components.json`) et modifiables. Le portfolio l'emploie pour le fond animé du hero (`BackgroundRippleEffect`), en complément de shadcn/ui (UI fonctionnelle) et Magic UI.

---

# Concepts Clés

## Installation via shadcn CLI

### Description

Aceternity UI s'appuie sur le CLI shadcn. Les composants sont référencés via `@aceternity/<component>` depuis la v4 du CLI, ou via URL directe du registry. Chaque composant installe aussi ses dépendances (typiquement `motion`, et selon l'âge du composant `cn` ou `clsx` + `tailwind-merge`).

### Exemple

```bash
# Installer un composant Aceternity via shadcn CLI (écrit dans src/components/aceternity/)
pnpm dlx shadcn@latest add @aceternity/background-ripple-effect
```

### Points Importants

- Le CLI shadcn gère tout : copy du code, installation des deps
- Chaque composant est modifiable dans `src/components/aceternity/`, séparé des composants shadcn de `src/components/ui/`
- Prévisualiser avec `--dry-run` avant d'écrire
- Nécessite un `components.json` shadcn initialisé

---

## Import motion/react (pas framer-motion)

### Description

Aceternity UI utilise le package `motion` (anciennement framer-motion). L'API est identique, seul l'import change. Les composants existants importent via `motion/react`. Migration triviale : remplacer `from 'framer-motion'` par `from 'motion/react'`.

### Exemple

```tsx
'use client'
import { motion } from 'motion/react'
import { BackgroundRippleEffect } from '@/components/aceternity/background-ripple-effect'

export function Hero() {
  return (
    <section className="relative">
      <BackgroundRippleEffect />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        className="flex flex-col gap-4 items-center justify-center"
      >
        <h1 className="text-5xl font-bold">Thibaud Geisler</h1>
        <p className="text-xl">IA & Full-Stack</p>
      </motion.div>
    </section>
  )
}
```

### Points Importants

- Package `motion` installé (pas `framer-motion`), en v14 depuis le 9 octobre 2026 : aucun breaking change de l'API React entre 13 et 14 (guide de migration officiel)
- Import : `from 'motion/react'` (pas `'motion'` sans sous-chemin)
- API identique à framer-motion : `initial`, `animate`, `whileInView`, etc.
- Les composants qui animent par `motion` portent `'use client'` dans leur propre fichier

---

## 'use client' obligatoire

### Description

Tous les composants Aceternity utilisent des hooks React (`useState`, `useEffect`, `useRef`) et des APIs browser (détection de souris, intersection observer). Ils requièrent systématiquement `'use client'` en tête de fichier dans un contexte Next.js App Router.

### Exemple

```tsx
// Le composant généré par le CLI contient déjà 'use client'
// src/components/aceternity/background-ripple-effect.tsx
'use client'
import { cn } from '@/lib/utils'
import React from 'react'

export const BackgroundRippleEffect = ({ children, className, ...props }) => {
  return (
    <div className={cn('relative flex flex-col', className)} {...props}>
      {/* ... logique de rendu */}
      {children}
    </div>
  )
}
```

### Points Importants

- `'use client'` vit dans le fichier du composant : un Server Component parent l'importe et le rend directement, sans wrapper client intermédiaire
- Le parent n'a pas à porter `'use client'` : la frontière client commence au module importé
- Les Server Components parents peuvent passer du contenu via `children`

---

## Utilitaire cn() et dépendances

### Description

Tous les composants Aceternity utilisent la fonction `cn()` pour gérer les classes conditionnelles sans conflits. Partagée avec shadcn/ui dans `src/lib/utils.ts`, qui réexporte depuis le 9 octobre 2026 le paquet `cn` (remplaçant de `clsx` + `tailwind-merge`, cf. `shadcn-ui.md`).

### Exemple

```ts
// src/lib/utils.ts (partagé avec shadcn/ui, Aceternity et Magic UI)
export { cn } from "cn"
```

### Points Importants

- `cn()` est partagé entre shadcn/ui, Aceternity et Magic UI
- Pas besoin de le dupliquer si shadcn/ui est déjà initialisé
- Dépendances : `cn`, `motion`
- Un composant ancien du registry peut réinstaller `clsx` et `tailwind-merge` : les retirer et pointer son import vers `@/lib/utils`

---

# Bonnes Pratiques

## ✅ Recommandations

- Installer via shadcn CLI avec la syntaxe `@aceternity/<component>`
- Documenter toute modification locale en commentaire de tête du fichier copié, avec le lien vers la version upstream et le pourquoi du diff (cf. `background-ripple-effect.tsx`) : sans lui, une réinstallation par le CLI écrase la modification sans que personne le voie
- Importer `motion` depuis `motion/react` (pas `framer-motion`)
- Garder `'use client'` dans le fichier du composant Aceternity, jamais le remonter sur le parent qui l'importe
- Combiner shadcn/ui (UI fonctionnelle) + Aceternity (effets visuels premium)
- Partager le `cn()` entre toutes les libs copy-paste

## ❌ Anti-Patterns

- Ne pas marquer `'use client'` une page ou une section entière pour y rendre un effet Aceternity
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
