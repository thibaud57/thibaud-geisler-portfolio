---
paths:
  - "components.json"
  - "src/components/ui/**/*.tsx"
---

# shadcn/ui — Setup, CLI & philosophie

## À faire
- Initialiser une seule fois au démarrage du projet : **`pnpm dlx shadcn@latest init -t next -b radix`** (génère `components.json` à la racine)
- **Un chemin d'import de `cn` par origine** : le code écrit pour le projet importe `@/lib/utils`, un fichier livré par le registry garde son `import { cn } from "cn"`. Les deux désignent la même fonction depuis la migration `shadcn migrate cn` (9 octobre 2026), `src/lib/utils.ts` réexportant le paquet `cn` : ne réécrire ni l'un ni l'autre
- Ajouter des composants via **`pnpm dlx shadcn@latest add <component>`** : copie le code source dans `src/components/ui/`, installe les dépendances Radix automatiquement
- Conserver le style **`radix-nova`** déclaré dans `components.json`, appliqué à tout le projet (métriques et arbitrage dans `DESIGN.md`)
- **Philosophie ownership** : les composants sont versionnés dans git et **modifiables librement** (pas de wrapper, pas d'abstraction custom : modifier directement le fichier source si besoin)
- Utiliser **`--dry-run`** avant **`--overwrite`** pour preview les changements lors d'une réinstallation (ex: après mise à jour shadcn upstream)
- **Relire chaque fichier livré par `add` avant de le committer**, et lancer `just typecheck` : le registry écrit du code que la configuration du projet refuse (cf. Gotchas)
- Pour les **CSS variables tokens** (`--primary`, `--background`, OKLCH, `@theme inline`) : voir `tailwind/setup.md`

## À éviter
- Installer **`shadcn-ui`** comme package npm : ce n'est **pas une lib**, le package `shadcn-ui` est **déprécié** : utiliser `shadcn` (sans `-ui`) via `pnpm dlx`
- **Wrapper un composant shadcn** dans une abstraction custom (`<MyButton>` qui rend `<Button>`) : modifier directement le fichier source dans `src/components/ui/`
- **Changer la valeur `style` de `components.json`** sans réinstaller les composants existants : les classes diffèrent d'un style à l'autre (hauteurs, rayons, paddings), le projet devient visuellement incohérent. Un seul `components.json` par projet, donc un seul style pour le site public et l'admin

## Gotchas
- Nouveau système de styles au format `{base}-{style}` : `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`, sur les bases `radix` ou `base`. Ils **s'ajoutent** à `new-york`, qui reste disponible et pris en charge. Depuis juillet 2026, `init` choisit la base `base` (Base UI) par défaut : `-b radix` garde Radix, qui n'est pas déprécié. Le projet est en `radix-nova`
- Composants shadcn mis à jour pour **React 19** : `forwardRef` **retiré**, les refs passent en props (règles React 19 : `react/components.md`)
- Couleurs en **OKLCH** au lieu de HSL (convention shadcn v4 + Tailwind v4)
- **Le `calendar` livré par `add` demande deux corrections avant commit**, constatées le 2026-09-22 et toujours présentes dans le registry de `shadcn` 4.21 :
  - **`modifiers.focused` dans `calendar.tsx`** viole `noPropertyAccessFromIndexSignature` (TS4111). Passer en notation crochet, et **extraire une variable** avant de la mettre en dépendance d'un effet : `modifiers["focused"]` dans un tableau de deps échoue à `react-hooks/exhaustive-deps`, qui ne sait pas l'analyser
  - **`Calendar` rend en anglais** sans prop `locale`, semaine commençant dimanche. Lui passer la locale du projet
- Pour les **composants Magic UI / Aceternity UI** ajoutés via le même CLI shadcn (issue imports `@/`, philosophie partagée) : voir `magic-ui/components.md` et `aceternity-ui/components.md`

## Exemples
```bash
# ✅ CLI shadcn — init sur la base Radix, puis add composants
pnpm dlx shadcn@latest init -t next -b radix
pnpm dlx shadcn@latest add button card dialog form input textarea

# ✅ Preview avant écriture (utile en réinstallation)
pnpm dlx shadcn@latest add --dry-run button

# ✅ Ajouter depuis un registry tiers (ex: Aceternity)
pnpm dlx shadcn@latest add @aceternity/aurora-background

# ❌ Package npm déprécié (n'existe plus)
pnpm add shadcn-ui

# ✅ Après chaque add : relire ce que le registry a écrit, puis typer
just typecheck
```
