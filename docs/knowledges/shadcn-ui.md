---
title: "shadcn/ui — Composants UI copy-paste"
version: "4.21.4"
description: "Référence technique pour shadcn/ui : philosophie copy-paste, CLI et patterns pour le portfolio."
date: "2026-04-13"
keywords: ["shadcn", "ui", "radix", "tailwind", "components"]
scope: ["docs"]
technologies: ["Next.js", "Tailwind CSS", "React"]
---

# Description

`shadcn/ui` n'est pas une librairie npm : c'est un ensemble de composants React copiés directement dans le projet via CLI. Les composants appartiennent au code du projet, sont modifiables sans surcharge ni wrapper, et s'appuient sur Radix UI pour les primitifs headless et Tailwind CSS pour le styling. Utilisé dans le portfolio pour tous les composants UI fonctionnels (Button, Dialog, Card, Table) combinés avec Magic UI et Aceternity UI pour les effets visuels. Style retenu par le projet : voir `DESIGN.md`.

---

# Concepts Clés

## Philosophie copy-paste ownership

### Description

Les composants ne sont pas installés comme dépendances npm : ils sont copiés via CLI dans `src/components/ui/`, versionnés dans le repo et modifiables librement. Cette approche évite l'abstraction par wrapper et permet d'adapter chaque composant aux besoins spécifiques du projet sans combattre une API externe.

### Exemple

```bash
# Initialiser shadcn/ui dans le projet (base Radix : Base UI est le défaut depuis juillet 2026)
pnpm dlx shadcn@latest init -t next -b radix

# Ajouter des composants
pnpm dlx shadcn@latest add button card dialog form
```

### Points Importants

- Les composants sont versionnés dans `src/components/ui/` et modifiables
- Pas de mise à jour automatique : les updates shadcn/ui se réappliquent manuellement via `add --overwrite`
- Chaque composant est autonome et peut être supprimé simplement
- Le `components.json` à la racine configure style, aliases, CSS variables

---

## CLI et opérations

### Description

Le CLI `shadcn` gère l'initialisation, l'ajout, la preview et la migration des composants. En v4, il supporte les presets, l'installation depuis d'autres registries (`@aceternity/`), et les commandes `view` / `search` / `docs` pour l'exploration.

### Exemple

```bash
# Prévisualiser avant ajout
pnpm dlx shadcn@latest add --dry-run button

# Ajouter plusieurs composants en une commande
pnpm dlx shadcn@latest add button card dialog form input textarea

# Ajouter depuis un registry tiers (Aceternity)
pnpm dlx shadcn@latest add @aceternity/aurora-background

# Afficher la config du projet
pnpm dlx shadcn@latest info
```

### Points Importants

- `--dry-run` prévisualise sans écrire les fichiers
- `--overwrite` force l'écrasement en cas de réinstallation
- Les registries tiers se référencent via `@namespace/component`
- `pnpm dlx` évite d'installer `shadcn` comme dépendance globale

---

## Design tokens et CSS variables

### Description

Le theming repose sur des CSS variables définies dans `globals.css` (couleurs, radius). Les composants utilisent ces tokens via Tailwind (`bg-primary`, `text-foreground`). Pour le portfolio avec Tailwind v4, les variables sont exposées via `@theme inline` pour permettre aux utilitaires Tailwind de les consommer.

### Exemple

```css
/* src/app/globals.css (extrait) */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.53 0.04 140);
  --primary-foreground: oklch(1 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.68 0.03 140);
  --primary-foreground: oklch(0.145 0 0);
}
```

### Points Importants

- Les tokens sémantiques (`--primary`, `--background`) découplent le design system de Tailwind
- `@theme inline` permet d'exposer les variables aux utilitaires Tailwind
- Le dark mode surcharge les tokens via la classe `.dark`
- Changer les valeurs CSS repaint automatiquement tous les composants shadcn/ui
- Les tokens du projet sont en `oklch()` : la palette complète, light et dark, est tenue dans `docs/DESIGN.md` § Identité Visuelle
- `@import "shadcn/tailwind.css"`, posé par `shadcn init`, fournit les variantes `data-open:`/`data-closed:` et les animations partagées des composants : ce n'est pas du code mort

---

## CVA pour variants typés

### Description

`class-variance-authority` (CVA) est utilisé en interne par shadcn/ui pour définir des variantes de composants typées (size, variant). Pattern standard : définir les classes de base et les variants dans un objet `cva`, puis exposer les props via `VariantProps`.

### Exemple

```tsx
// src/components/ui/button.tsx (extrait, classes abrégées)
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

const buttonVariants = cva('group/button inline-flex items-center rounded-lg text-sm font-medium …', {
  variants: {
    variant: { default: '…', outline: '…', secondary: '…', ghost: '…', destructive: '…', link: '…' },
    size: { default: 'h-8 …', xs: 'h-6 …', sm: 'h-7 …', lg: 'h-9 …', icon: 'size-8', 'icon-xs': 'size-6 …', 'icon-sm': 'size-7 …', 'icon-lg': 'size-9' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

function Button({
  className, variant = 'default', size = 'default', asChild = false, ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

### Points Importants

- Les variantes et tailles réelles (hauteurs 32/28/24 px, variantes `icon-*`) sont décrites dans `docs/DESIGN.md`, la fiche ne les recopie pas
- `asChild` rend l'enfant (un `Link`, par exemple) avec les styles du bouton, via `Slot.Root` de `radix-ui`
- `data-slot`, `data-variant` et `data-size` permettent de styler un bouton selon son contexte (`in-data-[slot=button-group]:…`)
- `cn()` résout les conflits de classes Tailwind. Il vient du paquet `cn`, que le registry importe depuis septembre 2026 et que `src/lib/utils.ts` réexporte depuis la migration `shadcn migrate cn` du 9 octobre 2026 (même sortie annoncée que `clsx` + `tailwind-merge` v3)
- `VariantProps` extrait automatiquement les types des variants
- `defaultVariants` fournit des valeurs par défaut
- La prop `className` peut toujours surcharger les classes du variant

---

## Server/Client Components

### Description

Les composants primitifs shadcn/ui (Button, Card, Input) fonctionnent en Server Components. Les composants interactifs (Dialog, Sheet, Popover, Select) utilisent des hooks Radix et nécessitent `'use client'`. Dans le portfolio, les pages publiques en Server Components consomment les primitifs, les formulaires interactifs sont délimités en îlots clients.

### Exemple

```tsx
// src/components/features/contact/ContactForm.tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { submitContact } from '@/server/actions/contact'

export function ContactForm() {
  const [state, action, pending] = useActionState(submitContact, null)

  return (
    <form action={action} className="space-y-4">
      <Input name="name" placeholder="Nom" required />
      <Input name="email" type="email" placeholder="Email" required />
      <Textarea name="message" placeholder="Message" required />
      <Button type="submit" disabled={pending}>
        {pending ? 'Envoi...' : 'Envoyer'}
      </Button>
    </form>
  )
}
```

### Points Importants

- Les composants avec état interne (Dialog, DropdownMenu) sont déjà marqués `'use client'`
- Les primitifs (Button, Card) sont utilisables en Server Components
- Isoler les îlots clients le plus bas possible dans l'arbre
- Pour le portfolio : page `/contact` = Server Component, le `<ContactForm />` = Client Component

---

# Commandes Clés

## Initialisation

### Description

Commande à lancer une seule fois au démarrage du projet pour créer `components.json`, configurer les aliases et installer les dépendances de base (`cn`, class-variance-authority).

### Syntaxe

```bash
pnpm dlx shadcn@latest init -t next -b radix
pnpm dlx shadcn@latest init -y -t next -b radix --no-monorepo

# Projet antérieur à septembre 2026 : remplacer clsx + tailwind-merge par le paquet cn
pnpm dlx shadcn@latest migrate cn
```

### Points Importants

- `-t next` cible Next.js (valeurs possibles : `next | vite | astro | laravel`)
- `-b` choisit la base (`base | radix | aria`) : depuis juillet 2026, le défaut est Base UI, `-b radix` garde Radix, qui n'est pas déprécié
- `migrate cn` ne réécrit que les fichiers qui importent `clsx`, `tailwind-merge` ou `cnfast` (ici, seul `src/lib/utils.ts`, devenu `export { cn } from "cn"`) puis retire ces paquets. Les composants qui importent `cn` depuis `@/lib/utils` restent intacts
- `--defaults` applique les défauts du CLI (couleur `zinc`, CSS variables activées). Le projet utilise `radix-nova` et `neutral`, donc ne pas initialiser avec `--defaults`
- Génère `components.json` à la racine, référence de config pour les commandes `add`
- À relancer avec `-f` uniquement pour forcer une reconfig

---

## Ajout de composants

### Description

Copie le code source des composants dans `src/components/ui/`. Accepte un ou plusieurs noms, des URLs de registry, ou des références à des registries tiers (`@aceternity/`).

### Syntaxe

```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add button card dialog form input textarea
pnpm dlx shadcn@latest add --overwrite button
pnpm dlx shadcn@latest add --dry-run button
pnpm dlx shadcn@latest add @aceternity/aurora-background
```

### Points Importants

- Toujours relire le diff avant de valider une réinstallation avec `--overwrite`
- `--dry-run` + `--diff` affichent les changements sans écriture
- Les dépendances (ex: `@radix-ui/react-dialog`) sont installées automatiquement
- Les composants installés sont propriété du projet : les modifier librement

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser le style déclaré dans `components.json`, sans le modifier (métriques et arbitrage dans `DESIGN.md`)
- Combiner shadcn/ui (UI fonctionnelle) + Magic UI / Aceternity UI (effets visuels)
- Versionner `src/components/ui/` dans git
- Définir les tokens sémantiques dans `globals.css`, pas en inline
- Utiliser `cn()` pour toute composition de classes
- Marquer les îlots clients le plus bas possible dans l'arbre

## ❌ Anti-Patterns

- Ne pas wrapper un composant shadcn dans un abstraction personnelle (modifier directement)
- Ne pas importer shadcn/ui comme une lib npm (elle n'existe pas en tant que package)
- Ne pas inliner des valeurs de couleurs Tailwind arbitraires (utiliser les tokens)
- Ne pas changer la valeur `style` de `components.json` sans réinstaller les composants existants : les classes diffèrent d'un style à l'autre
- Ne pas utiliser `@apply` pour refactorer : extraire en composants React

---

# 🔗 Ressources

## Documentation Officielle

- [shadcn/ui : Documentation](https://ui.shadcn.com/docs)
- [CLI Reference](https://ui.shadcn.com/docs/cli)
- [Installation Next.js](https://ui.shadcn.com/docs/installation/next)
- [Tailwind v4 guide](https://ui.shadcn.com/docs/tailwind-v4)

## Ressources Complémentaires

- [Radix UI : Primitives](https://www.radix-ui.com/primitives)
- [class-variance-authority](https://cva.style/docs)
- [cn](https://github.com/shadcn-ui/cn) (remplaçant de `clsx` + `tailwind-merge`)
- [Changelog shadcn : `cn`](https://ui.shadcn.com/docs/changelog/2026-09-cn) et [Base UI par défaut](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)
