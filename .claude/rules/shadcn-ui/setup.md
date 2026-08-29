---
paths:
  - "components.json"
  - "src/components/ui/**/*.tsx"
---

# shadcn/ui — Setup, CLI & philosophie

## À faire
- Initialiser une seule fois au démarrage du projet : **`pnpm dlx shadcn@latest init -t next`** (génère `components.json` à la racine)
- Ajouter des composants via **`pnpm dlx shadcn@latest add <component>`** : copie le code source dans `src/components/ui/`, installe les dépendances Radix automatiquement
- Conserver le style **`radix-nova`** déclaré dans `components.json`, appliqué à tout le projet (métriques et arbitrage dans `DESIGN.md`)
- **Philosophie ownership** : les composants sont versionnés dans git et **modifiables librement** (pas de wrapper, pas d'abstraction custom — modifier directement le fichier source si besoin)
- Utiliser **`--dry-run`** avant **`--overwrite`** pour preview les changements lors d'une réinstallation (ex: après mise à jour shadcn upstream)
- Pour les **CSS variables tokens** (`--primary`, `--background`, OKLCH, `@theme inline`) : voir `tailwind/setup.md`

## À éviter
- Installer **`shadcn-ui`** comme package npm : ce n'est **pas une lib**, le package `shadcn-ui` est **déprécié** — utiliser `shadcn` (sans `-ui`) via `pnpm dlx`
- **Wrapper un composant shadcn** dans une abstraction custom (`<MyButton>` qui rend `<Button>`) : modifier directement le fichier source dans `src/components/ui/`
- **Changer la valeur `style` de `components.json`** sans réinstaller les composants existants : les classes diffèrent d'un style à l'autre (hauteurs, rayons, paddings), le projet devient visuellement incohérent. Un seul `components.json` par projet, donc un seul style pour le site public et l'admin

## Gotchas
- Nouveau système de styles au format `{librairie}-{style}` : `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea` sur les bases `radix`, `base` ou `aria`. Ils **s'ajoutent** à `new-york`, qui reste le style par défaut du CLI ; seul **`default`** est déprécié. Le projet n'utilise ni l'un ni l'autre, il est en `radix-nova`
- Composants shadcn mis à jour pour **React 19** : `forwardRef` **retiré**, les refs sont passées directement en props (pattern R19)
- Couleurs en **OKLCH** au lieu de HSL (convention shadcn v4 + Tailwind v4)
- Pour les **composants Magic UI / Aceternity UI** ajoutés via le même CLI shadcn (issue imports `@/`, philosophie partagée) : voir `magic-ui/components.md` et `aceternity-ui/components.md`

## Exemples
```bash
# ✅ CLI shadcn — init puis add composants
pnpm dlx shadcn@latest init -t next
pnpm dlx shadcn@latest add button card dialog form input textarea

# ✅ Preview avant écriture (utile en réinstallation)
pnpm dlx shadcn@latest add --dry-run button

# ✅ Ajouter depuis un registry tiers (ex: Aceternity)
pnpm dlx shadcn@latest add @aceternity/aurora-background

# ❌ Package npm déprécié (n'existe plus)
pnpm add shadcn-ui
```
