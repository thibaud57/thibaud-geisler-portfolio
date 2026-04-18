---
paths:
  - "src/components/aceternity/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/app/[locale]/(public)/**/*.tsx"
---

# Aceternity UI — Composants animés premium

## À faire
- Installer via le CLI shadcn avec syntaxe namespace : **`pnpm dlx shadcn@latest add @aceternity/<component>`** (registry déclaré dans `components.json`, voir [DESIGN.md § Outils & Discovery](../../../docs/DESIGN.md))
- **Composants dans `src/components/aceternity/`** (recommandation projet, cohérent avec `src/components/magicui/`) — customiser via le flag `-p src/components/aceternity` ou les `aliases` dans `components.json`
- Importer **`motion`** via `motion/react` (jamais `framer-motion` qui est legacy) — installé automatiquement par le CLI
- Toujours **`'use client'`** sur les composants qui consomment Aceternity : utilisent `useState`, `useEffect`, `useRef`, intersection observer, détection souris
- **Réservé aux surfaces marketing du site public** (DESIGN.md) : hero, sections clés, transitions visuelles — **JAMAIS** dans le dashboard admin
- **Périmètre projet** : voir [DESIGN.md § Mapping Composants](../../../docs/DESIGN.md) pour la répartition exacte entre Aceternity UI, Magic UI et shadcn/ui, et les catégories autorisées pour ce projet
- **Limiter à 2-3 effets maximum par page** (DESIGN.md) : éviter la surcharge visuelle et la distraction
- **Intensité subtile** (DESIGN.md) : durée 200-400ms, easing `ease-out` (entrées) ou `ease-in-out` (transitions), intention = renforcer la qualité sans distraire le contenu
- **Wrapper dans un composant parent Client** : un Server Component parent peut passer le contenu via `children`, le wrapper Client utilise Aceternity (pattern îlot client en bas de l'arbre)
- **Combiner avec shadcn/ui (fonctionnel) + Magic UI (autres effets visuels)** : les 3 libs partagent le même `cn()` (`src/lib/utils.ts`) et les tokens CSS sémantiques shadcn

## À éviter
- Importer Aceternity dans un **Server Component direct** : utiliser un wrapper Client (les composants Aceternity sont 100% Client Components)
- Garder **`framer-motion`** comme dépendance : **déprécié**, utiliser **`motion` v12+** (incompatible avec React 19 sans overrides)
- Dupliquer **`cn()`** à chaque composant : déjà dans `src/lib/utils.ts` (partagé avec shadcn/ui et Magic UI)
- **Surcharger** tout le site d'effets Aceternity : sobriété recommandée par DESIGN.md (2-3 effets max par page)
- Utiliser Aceternity dans le **dashboard admin** (post-MVP) : DESIGN.md le réserve **strictement** aux surfaces marketing du site public
- Oublier **`'use client'`** dans le composant parent qui consomme Aceternity

## Gotchas
- **Pas de versioning sémantique** (modèle copy-paste via registry shadcn) : pas de `pnpm update` possible, relancer `shadcn@latest add --overwrite @aceternity/<component>` pour récupérer les updates upstream
- **`motion` v12+ obligatoire** (ex-`framer-motion`) : Aceternity utilise `motion`, le legacy `framer-motion` n'est **pas compatible avec React 19** sans overrides
- Tailwind v4 standard documenté : l'ancien standard Tailwind v3 est **déprécié** côté Aceternity
- **Support shadcn CLI 3.0+** pour la syntaxe namespacée `@aceternity/<component>` (versions antérieures : utiliser l'URL directe)
- Pour la **philosophie copy-paste** (versionnement, modification, ownership) partagée avec shadcn-ui : voir `shadcn-ui/setup.md`

## Exemples
```bash
# ✅ Installer via syntaxe namespace (registry @aceternity déclaré dans components.json)
pnpm dlx shadcn@latest add @aceternity/aurora-background
pnpm dlx shadcn@latest add @aceternity/spotlight
pnpm dlx shadcn@latest add @aceternity/3d-card

# ✅ Customiser le path de copie (recommandation projet : src/components/aceternity/)
pnpm dlx shadcn@latest add @aceternity/aurora-background -p src/components/aceternity
```

```typescript
// ✅ Server Component parent + îlot Client pour Aceternity
// src/app/(public)/page.tsx — Server Component
export default function HomePage() {
  return (
    <main>
      <HeroSection /> {/* îlot client en bas de l'arbre */}
    </main>
  )
}

// src/components/features/hero-section.tsx — Client Component
'use client'
export function HeroSection() {
  return (
    <AuroraBackground>
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        <h1 className="text-5xl font-bold font-display">Portfolio</h1>
      </motion.div>
    </AuroraBackground>
  )
}
```

```typescript
// ❌ Importer Aceternity dans un Server Component direct (erreur runtime)
export default function Page() {
  return <Spotlight>{/* ... */}</Spotlight> // crash : useState/useEffect en SC
}

// ❌ Importer depuis framer-motion (legacy, incompatible React 19)
import { motion } from 'framer-motion'
```
