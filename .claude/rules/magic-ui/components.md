---
paths:
  - "src/components/magicui/**/*.tsx"
---

# Magic UI — Composants animés copy-paste

## À faire
- Installer via le CLI shadcn avec syntaxe namespace : **`pnpm dlx shadcn@latest add @magicui/<component>`** (registry déclaré dans `components.json`, voir [DESIGN.md § Outils & Discovery](../../../docs/DESIGN.md))
- Composants copiés dans **`src/components/magicui/`** (séparé de `src/components/ui/` qui contient shadcn/ui pur)
- Importer **`motion`** via `motion/react`, jamais `framer-motion`
- Marquer **`'use client'`** tout composant qui consomme Magic UI : ses composants sont eux-mêmes Client Components (Intersection Observer + hooks), un parent Server Component casse au runtime
- **Périmètre projet** : voir [DESIGN.md § Mapping Composants](../../../docs/DESIGN.md) pour la répartition entre Magic UI, Aceternity UI et shadcn/ui
- Limiter à **2-3 effets par page**, d'intensité subtile : durée 200-400ms, easing `ease-out` pour les entrées et `ease-in-out` pour les transitions (DESIGN.md)
- Utiliser **`BlurFade`** pour les entrées animées au scroll des sections marketing
- **Combiner avec shadcn/ui** : shadcn pour l'UI fonctionnelle (Form, Button, Dialog), Magic UI pour les enrichissements visuels, avec le même `cn()` (`src/lib/utils.ts`) et les mêmes tokens CSS

## À éviter
- Utiliser le package **`magicui-cli`** : legacy, abandonné
- Appliquer Magic UI à l'aveugle sur tous les éléments : distraction visuelle, contre les principes DESIGN.md
- Utiliser Magic UI dans l'**espace admin** : DESIGN.md le réserve aux surfaces marketing du site public
- Dupliquer les dépendances déjà installées par shadcn/ui (`motion`, `cn`, `class-variance-authority`), ou réinstaller `clsx` et `tailwind-merge`, que le paquet `cn` remplace

## Gotchas
- **Pas de versioning sémantique** (copy-paste via registry shadcn) : les composants restent figés à l'install, relancer `shadcn@latest add --overwrite <component>` pour récupérer l'upstream
- Magic UI : **Tailwind v4 + React 19 par défaut depuis avril 2025**, plus besoin de `tailwind.config.ts`
- **Issue shadcn CLI > 2.8.0 + Magic UI** : imports parfois générés sans alias `@/` → vérifier les imports `@/lib/utils` après chaque `add`
- `v3.magicui.design` garde la variante Tailwind v3 : utiliser **`magicui.design`** (v4)
- Philosophie copy-paste (versionnement, modification, ownership) partagée avec shadcn-ui : voir `shadcn-ui/setup.md`

## Exemples
```bash
# ✅ Installer via syntaxe namespace
pnpm dlx shadcn@latest add @magicui/blur-fade

# ❌ Package npm legacy abandonné
pnpm add magicui-cli
```

```typescript
// ✅ Îlot client : effet Magic UI autour d'un composant shadcn
'use client'
export function Cta() {
  return (
    <BlurFade delay={0.25} inView>
      <Button>Contact</Button>
    </BlurFade>
  )
}
```
