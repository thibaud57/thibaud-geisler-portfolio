---
paths:
  - "src/components/magicui/**/*.tsx"
  - "src/components/**/*.tsx"
  - "src/app/[locale]/(public)/**/*.tsx"
---

# Magic UI — Composants animés copy-paste

## À faire
- Installer via le CLI shadcn avec syntaxe namespace : **`pnpm dlx shadcn@latest add @magicui/<component>`** (registry déclaré dans `components.json`, voir [DESIGN.md § Outils & Discovery](../../../docs/DESIGN.md))
- Composants copiés dans **`src/components/magicui/`** (séparé de `src/components/ui/` qui contient shadcn/ui pur)
- Importer **`motion`** via `motion/react` (jamais `framer-motion` qui est legacy) — installé automatiquement par le CLI shadcn
- Toujours **`'use client'`** sur les composants qui consomment Magic UI : les composants Magic UI sont eux-mêmes Client Components (animations Intersection Observer + hooks)
- **Périmètre projet** : voir [DESIGN.md § Mapping Composants](../../../docs/DESIGN.md) pour la répartition exacte entre Magic UI, Aceternity UI et shadcn/ui, et les catégories autorisées pour ce projet
- **Limiter à 2-3 effets maximum par page** (DESIGN.md) : éviter la surcharge visuelle et la distraction du contenu
- **Intensité subtile** (DESIGN.md) : durée 200-400ms, easing `ease-out` pour les entrées et `ease-in-out` pour les transitions, intention = renforcer la qualité sans distraire le contenu
- Utiliser **`BlurFade`** pour les entrées animées au scroll (pattern Intersection Observer recommandé pour les sections marketing)
- **Combiner avec shadcn/ui** : shadcn pour l'UI fonctionnelle (Form, Button, Dialog), Magic UI pour les enrichissements visuels — les deux libs partagent le même `cn()` (`src/lib/utils.ts`) et les tokens CSS sémantiques

## À éviter
- Utiliser le package **`magicui-cli`** : **legacy/abandonné**, utiliser `pnpm dlx shadcn@latest add` à la place
- Importer depuis **`framer-motion`** : utiliser **`motion/react`** (Motion v12+, voir VERSIONS.md)
- Appliquer Magic UI à l'aveugle sur tous les éléments : distraction visuelle, contre les principes DESIGN.md (intensité subtile, intention)
- Oublier **`'use client'`** dans le composant parent qui consomme Magic UI : erreur de runtime React Server Components
- Utiliser Magic UI dans le **dashboard admin** (post-MVP) : DESIGN.md le réserve **strictement** aux surfaces marketing du site public
- Dupliquer les dépendances déjà installées par shadcn/ui (`motion`, `tailwind-merge`, `class-variance-authority`)

## Gotchas
- **Pas de versioning sémantique** (modèle copy-paste via registry shadcn) : pas de `pnpm update` possible, les composants restent figés au moment de l'install — relancer `shadcn@latest add --overwrite <component>` pour récupérer les updates upstream
- Magic UI : **Tailwind v4 + React 19 par défaut depuis avril 2025**, plus besoin de `tailwind.config.ts`
- **Issue shadcn CLI > 2.8.0 + Magic UI** : peut générer des imports sans alias `@/` dans certains composants Magic UI → vérifier/ajuster les imports `@/lib/utils` après chaque `add`
- Site **`v3.magicui.design`** conserve la variante Tailwind v3 pour l'ancienne méthode — utiliser **`magicui.design`** (v4) pour ce projet
- Pour la **philosophie copy-paste** (versionnement, modification, ownership) partagée avec shadcn-ui : voir `shadcn-ui/setup.md`

## Exemples
```bash
# ✅ Installer via syntaxe namespace (registry @magicui déclaré dans components.json)
pnpm dlx shadcn@latest add @magicui/blur-fade
pnpm dlx shadcn@latest add @magicui/marquee
pnpm dlx shadcn@latest add @magicui/number-ticker

# ❌ Package npm legacy abandonné
pnpm add magicui-cli
```

```typescript
// ✅ BlurFade en îlot client + Server Component parent
// src/app/(public)/page.tsx — Server Component
export default function HomePage() {
  return (
    <main>
      <HeroSection /> {/* îlot client pour les animations */}
    </main>
  )
}

// src/components/features/hero-section.tsx — Client Component
'use client'
export function HeroSection() {
  return (
    <BlurFade delay={0.25} inView>
      <h1 className="text-5xl font-bold font-display">Portfolio</h1>
    </BlurFade>
  )
}
```

```typescript
// ✅ Combinaison shadcn (fonctionnel) + Magic UI (effet visuel)
'use client'
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
