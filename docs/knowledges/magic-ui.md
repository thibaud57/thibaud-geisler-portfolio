---
title: "Magic UI — Composants animés"
version: "copy-paste"
description: "Référence technique pour Magic UI : 150+ composants animés copy-paste via shadcn CLI."
date: "2026-04-13"
keywords: ["magic-ui", "animation", "shadcn", "motion", "components"]
scope: ["docs"]
technologies: ["Next.js", "shadcn/ui", "Tailwind CSS", "motion"]
---

# Description

`Magic UI` est une collection de 150+ composants React animés distribués en copy-paste via le registry shadcn. Spécialisé dans les effets de fond (Animated Grid Pattern, Retro Grid), les animations de texte (Number Ticker, Blur Fade, Word Rotate), les cartes (Magic Card, Border Beam), les boutons (Shimmer Button, Rainbow Button) et les marquees. Utilisé dans le portfolio en complément de shadcn/ui et Aceternity UI pour ajouter de la vie aux sections statiques.

---

# Concepts Clés

## Installation via shadcn CLI

### Description

Comme Aceternity, Magic UI s'installe via le CLI shadcn en pointant sur son registry. Deux syntaxes : l'URL directe `https://magicui.design/r/<component>` ou (avec CLI shadcn v4+) un namespace raccourci. Les composants sont copiés dans `src/components/magicui/`.

### Exemple

```bash
pnpm dlx shadcn@latest add "https://magicui.design/r/marquee"
pnpm dlx shadcn@latest add "https://magicui.design/r/animated-beam"
pnpm dlx shadcn@latest add "https://magicui.design/r/blur-fade"
pnpm dlx shadcn@latest add "https://magicui.design/r/number-ticker"
```

### Points Importants

- Pas de commande `magicui init` dédiée : utiliser `shadcn init` standard
- Les composants vont dans `src/components/magicui/` (pas `ui/`)
- Chaque composant installe automatiquement ses dépendances (`motion`, etc.)
- Registry compatible avec le même `components.json` que shadcn/ui

---

## Catégories de composants

### Description

Magic UI regroupe ses composants par catégorie d'usage. Pour le portfolio, les catégories les plus pertinentes sont : Text Animations (titres de hero), Background Effects (sections immersives), Cards (projets), Buttons (CTAs), Marquee (logos clients / stack).

### Exemple

```tsx
// src/app/(public)/page.tsx — Server Component
import { BlurFade } from '@/components/magicui/blur-fade'
import { Marquee } from '@/components/magicui/marquee'

export default function HomePage() {
  return (
    <main>
      <BlurFade delay={0.25} inView>
        <h1 className="text-5xl font-bold">Portfolio</h1>
      </BlurFade>

      <section>
        <h2>Stack utilisée</h2>
        <Marquee pauseOnHover className="mt-8">
          <img src="/logos/nextjs.svg" alt="Next.js" />
          <img src="/logos/prisma.svg" alt="Prisma" />
          <img src="/logos/postgres.svg" alt="PostgreSQL" />
        </Marquee>
      </section>
    </main>
  )
}
```

### Points Importants

- Les composants Magic UI sont `'use client'` (animations)
- `BlurFade` : animation d'entrée au scroll via Intersection Observer
- `Marquee` : défilement infini (logos, témoignages)
- `NumberTicker` : animation de compteur (statistiques)
- Voir le catalogue complet sur magicui.design/docs/components

---

## Import motion/react

### Description

Comme Aceternity, Magic UI utilise le package `motion` (anciennement framer-motion). Les composants importent via `motion/react`. Les dépendances motion sont installées automatiquement lors de l'installation d'un composant qui en a besoin.

### Exemple

```tsx
// src/components/magicui/blur-fade.tsx (généré par le CLI)
'use client'
import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

export function BlurFade({ children, delay = 0, inView = false }) {
  const ref = useRef(null)
  const inViewResult = useInView(ref, { once: true, margin: '-50px' })
  // ...animation
}
```

### Points Importants

- Package `motion` requis (installé automatiquement)
- Import via `motion/react`, pas `framer-motion`
- Certains composants utilisent `useInView` pour le scroll-triggered
- Les composants sont 100% client, toujours `'use client'`

---

## Combinaison avec shadcn/ui

### Description

Magic UI est un superset de shadcn/ui : même système de registry, même `components.json`, même conventions. Les deux coexistent sans conflit. Pattern recommandé : shadcn/ui pour l'UI fonctionnelle (Form, Button, Dialog), Magic UI pour les enrichissements visuels (animations d'entrée, effets).

### Exemple

```tsx
'use client'
import { Button } from '@/components/ui/button'           // shadcn
import { ShimmerButton } from '@/components/magicui/shimmer-button' // Magic UI
import { BlurFade } from '@/components/magicui/blur-fade'

export function CTASection() {
  return (
    <BlurFade delay={0.5}>
      <div className="flex gap-4">
        <Button variant="outline">En savoir plus</Button>
        <ShimmerButton>Contactez-moi</ShimmerButton>
      </div>
    </BlurFade>
  )
}
```

### Points Importants

- Les deux libs partagent le même `cn()` dans `src/lib/utils.ts`
- Les tokens CSS sémantiques shadcn/ui sont accessibles aux composants Magic UI
- Garder shadcn/ui pour les composants réutilisés de manière systématique
- Réserver Magic UI aux moments visuels forts (hero, sections de transition)

---

# Bonnes Pratiques

## ✅ Recommandations

- Installer via `shadcn@latest add` avec l'URL du registry Magic UI
- Organiser dans `src/components/magicui/` (séparé de `ui/`)
- Combiner avec shadcn/ui (fonctionnel) et Aceternity (effets premium)
- Utiliser `BlurFade` pour des entrées animées au scroll
- Limiter les effets pour ne pas surcharger les performances

## ❌ Anti-Patterns

- Ne pas utiliser le package `magicui-cli` legacy (utiliser `shadcn@latest`)
- Ne pas importer depuis `framer-motion` (utiliser `motion/react`)
- Ne pas appliquer des composants Magic UI à l'aveugle sur tous les éléments (distraction visuelle)
- Ne pas oublier `'use client'` dans les composants qui consomment Magic UI
- Ne pas dupliquer les dépendances déjà installées par shadcn/ui

---

# 🔗 Ressources

## Documentation Officielle

- [Magic UI : Documentation](https://magicui.design/docs)
- [Magic UI : Components](https://magicui.design/docs/components)
- [Installation](https://magicui.design/docs/installation)

## Ressources Complémentaires

- [Magic UI : GitHub](https://github.com/magicuidesign/magicui)
- [motion (ex-framer-motion)](https://motion.dev/docs/react)
