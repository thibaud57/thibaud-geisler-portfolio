---
title: "shadcn/ui — Composants UI copy-paste"
version: "4.2.0"
description: "Référence technique pour shadcn/ui : philosophie copy-paste, CLI et patterns pour le portfolio."
date: "2026-04-13"
keywords: ["shadcn", "ui", "radix", "tailwind", "components"]
scope: ["docs"]
technologies: ["Next.js", "Tailwind CSS", "React"]
---

# Description

`shadcn/ui` n'est pas une librairie npm : c'est un ensemble de composants React copiés directement dans le projet via CLI. Les composants appartiennent au code du projet, sont modifiables sans surcharge ni wrapper, et s'appuient sur Radix UI pour les primitifs headless et Tailwind CSS pour le styling. Utilisé dans le portfolio pour tous les composants UI fonctionnels (Button, Form, Dialog, Card) combinés avec Magic UI et Aceternity UI pour les effets visuels. Style retenu : `new-york`.

---

# Concepts Clés

## Philosophie copy-paste ownership

### Description

Les composants ne sont pas installés comme dépendances npm : ils sont copiés via CLI dans `src/components/ui/`, versionnés dans le repo et modifiables librement. Cette approche évite l'abstraction par wrapper et permet d'adapter chaque composant aux besoins spécifiques du projet sans combattre une API externe.

### Exemple

```bash
# Initialiser shadcn/ui dans le projet
pnpm dlx shadcn@latest init -t next

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
/* src/app/globals.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222.2 84% 4.9%);
  --primary: hsl(222.2 47.4% 11.2%);
  --primary-foreground: hsl(210 40% 98%);
  --radius: 0.5rem;
}

.dark {
  --background: hsl(222.2 84% 4.9%);
  --foreground: hsl(210 40% 98%);
  --primary: hsl(210 40% 98%);
  --primary-foreground: hsl(222.2 47.4% 11.2%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) - 2px);
  --radius-sm: calc(var(--radius) - 4px);
}
```

### Points Importants

- Les tokens sémantiques (`--primary`, `--background`) découplent le design system de Tailwind
- `@theme inline` permet d'exposer les variables aux utilitaires Tailwind
- Le dark mode surcharge les tokens via la classe `.dark`
- Changer les valeurs CSS repaint automatiquement tous les composants shadcn/ui

---

## CVA pour variants typés

### Description

`class-variance-authority` (CVA) est utilisé en interne par shadcn/ui pour définir des variantes de composants typées (size, variant). Pattern standard : définir les classes de base et les variants dans un objet `cva`, puis exposer les props via `VariantProps`.

### Exemple

```tsx
// src/components/ui/button.tsx (extrait)
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground',
        outline: 'border border-input bg-background',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-11 px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}
```

### Points Importants

- `cn()` (clsx + tailwind-merge) résout les conflits de classes Tailwind
- `VariantProps` extrait automatiquement les types des variants
- `defaultVariants` fournit des valeurs par défaut
- La prop `className` peut toujours surcharger les classes du variant

---

## Server/Client Components

### Description

Les composants primitifs shadcn/ui (Button, Card, Input) fonctionnent en Server Components. Les composants interactifs (Dialog, Sheet, Popover, Select) utilisent des hooks Radix et nécessitent `'use client'`. Dans le portfolio, les pages publiques en Server Components consomment les primitifs, les formulaires interactifs sont délimités en îlots clients.

### Exemple

```tsx
// src/components/features/contact-form.tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { sendContact } from '@/server/actions/contact'

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, null)

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

Commande à lancer une seule fois au démarrage du projet pour créer `components.json`, configurer les aliases et installer les dépendances de base (tailwind-merge, clsx, class-variance-authority).

### Syntaxe

```bash
pnpm dlx shadcn@latest init -t next
pnpm dlx shadcn@latest init --defaults
pnpm dlx shadcn@latest init -y -t next --no-monorepo
```

### Points Importants

- `-t next` cible Next.js (valeurs possibles : `next | vite | astro | laravel`)
- `--defaults` applique les défauts (style `new-york`, couleur `zinc`, CSS variables activées)
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

- Utiliser le style `new-york` (plus contemporain, border-radius plus large)
- Combiner shadcn/ui (UI fonctionnelle) + Magic UI / Aceternity UI (effets visuels)
- Versionner `src/components/ui/` dans git
- Définir les tokens sémantiques dans `globals.css`, pas en inline
- Utiliser `cn()` pour toute composition de classes
- Marquer les îlots clients le plus bas possible dans l'arbre

## ❌ Anti-Patterns

- Ne pas wrapper un composant shadcn dans un abstraction personnelle (modifier directement)
- Ne pas importer shadcn/ui comme une lib npm (elle n'existe pas en tant que package)
- Ne pas inliner des valeurs de couleurs Tailwind arbitraires (utiliser les tokens)
- Ne pas mixer `new-york` et `default` dans le même projet
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
- [tailwind-merge](https://github.com/dcastil/tailwind-merge)
