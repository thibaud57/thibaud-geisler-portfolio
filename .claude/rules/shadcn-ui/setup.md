---
paths:
  - "components.json"
  - "src/components/ui/**/*.tsx"
  - "src/components/reui/**/*.tsx"
---

# shadcn/ui : setup, CLI et philosophie

## À faire
- Ajouter et mettre à jour les composants par le **skill `shadcn`** (`.claude/skills/shadcn/`), qui porte le CLI des registries : il copie le code source dans `src/components/ui/` et installe les dépendances Radix
- **Un chemin d'import de `cn` par origine** : le code écrit pour le projet importe `@/lib/utils`, un fichier livré par le registry garde son `import { cn } from "cn"`. Les deux désignent la même fonction depuis la migration `shadcn migrate cn` (9 octobre 2026), `src/lib/utils.ts` réexportant le paquet `cn` : ne réécrire ni l'un ni l'autre
- Conserver le style **`radix-nova`** déclaré dans `components.json`, appliqué à tout le projet (métriques et arbitrage dans `DESIGN.md`)
- **Philosophie ownership** : les composants sont versionnés dans git et **modifiables librement** (pas de wrapper, pas d'abstraction custom : modifier directement le fichier source si besoin)
- Utiliser **`--dry-run`** avant **`--overwrite`** pour preview les changements lors d'une réinstallation (ex: après mise à jour shadcn upstream)
- **Relire chaque fichier livré par `add` avant de le committer** puis lancer `just typecheck` : le registry écrit du code que la configuration du projet refuse (cf. Gotchas)
- Pour les **CSS variables tokens** (`--primary`, `--background`, OKLCH, `@theme inline`) : voir `tailwind/setup.md`

## À éviter
- **Wrapper un composant shadcn** dans une abstraction custom (`<MyButton>` qui rend `<Button>`) : modifier directement le fichier source dans `src/components/ui/`
- **Changer la valeur `style` de `components.json`** sans réinstaller les composants existants : les classes diffèrent d'un style à l'autre (hauteurs, rayons, paddings), le projet devient visuellement incohérent. Un seul `components.json` par projet, donc un seul style pour le site public comme pour l'admin

## Gotchas
- Nouveau système de styles au format `{base}-{style}` : `nova`, `vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`, sur les bases `radix` ou `base`. Ils **s'ajoutent** à `new-york`, qui reste disponible et pris en charge. Depuis juillet 2026, `init` choisit la base `base` (Base UI) par défaut : `-b radix` garde Radix, qui n'est pas déprécié. Le projet est en `radix-nova`
- Composants shadcn mis à jour pour **React 19** : `forwardRef` **retiré**, les refs passent en props (règles React 19 : `react/components.md`)
- Couleurs en **OKLCH** au lieu de HSL (convention shadcn v4 + Tailwind v4)
- **Le `calendar` livré par `add` demande deux corrections avant commit**, constatées le 2026-09-22 et toujours présentes dans le registry de `shadcn` 4.21 :
  - **`modifiers.focused` dans `calendar.tsx`** viole `noPropertyAccessFromIndexSignature` (TS4111). Passer en notation crochet puis **extraire une variable** avant de la mettre en dépendance d'un effet : `modifiers["focused"]` dans un tableau de deps échoue à `react-hooks/exhaustive-deps`, qui ne sait pas l'analyser
  - **`Calendar` rend en anglais** sans prop `locale`, semaine commençant dimanche. Lui passer la locale du projet
- **`Kanban` du registre `@reui` : passer `id={React.useId()}` au `DndContext`** après chaque `add`. Sans id, dnd-kit numérote son `aria-describedby` (`DndDescribedBy-N`) par un compteur de module qui avance à chaque rendu serveur : l'hydratation ne correspond plus et les instructions du lecteur d'écran pointent vers un id absent (constaté le 2026-10-08, `@dnd-kit/core` 6.3.1)
- Pour les **composants Magic UI / Aceternity UI** ajoutés via le même CLI shadcn : voir `magic-ui/components.md` et `aceternity-ui/components.md`
