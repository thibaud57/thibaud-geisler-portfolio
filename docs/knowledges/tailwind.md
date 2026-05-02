---
title: "Tailwind CSS — Framework utility-first"
version: "4.2.2"
description: "Référence technique pour Tailwind CSS v4 : CSS-first config, @theme, dark mode et intégration Next.js."
date: "2026-04-13"
keywords: ["tailwind", "css", "utility", "theme", "dark-mode"]
scope: ["docs"]
technologies: ["Next.js", "React", "shadcn/ui"]
---

# Description

`Tailwind CSS` v4 est le framework utility-first utilisé dans le portfolio. La v4 marque un virage majeur : configuration CSS-first via `@theme` (plus de `tailwind.config.js`), support natif des container queries, couleurs OKLCH par défaut, et plugin Vite officiel. Intégration via `@tailwindcss/postcss` dans Next.js 16, avec dark mode par classe pour next-themes et shadcn/ui.

---

# Concepts Clés

## CSS-first configuration via @theme

### Description

Toute la configuration du design system se fait en CSS dans le fichier d'entrée via la directive `@theme`. Plus de `tailwind.config.js` en v4. Les tokens (couleurs, typographie, espacements, radius) sont déclarés comme des CSS variables consommables partout dans le projet.

### Exemple

```css
/* src/app/globals.css */
@import "tailwindcss";

@theme {
  --color-brand-500: oklch(0.65 0.18 250);
  --color-brand-600: oklch(0.55 0.2 250);
  --font-display: "Satoshi", sans-serif;
  --breakpoint-3xl: 120rem;
  --radius-lg: 0.5rem;
}
```

### Points Importants

- `@tailwind base/components/utilities` supprimé, remplacé par `@import "tailwindcss"`
- Les tokens déclarés dans `@theme` génèrent les utilitaires Tailwind correspondants
- `@theme inline` permet d'imbriquer des `var(--foo)` sans cassure
- Pas besoin de `tailwind.config.js` pour un projet standard

---

## Dark mode avec classe

### Description

En v4, le dark mode par classe ne se configure plus via `darkMode: 'class'` dans un fichier JS. Il faut déclarer explicitement un `@custom-variant dark` dans le CSS global, pointant sur la classe `.dark` (ajoutée par next-themes). Sans cette déclaration, les utilitaires `dark:*` ne fonctionnent pas.

### Exemple

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: hsl(0 0% 100%);
  --foreground: hsl(222.2 84% 4.9%);
}

.dark {
  --background: hsl(222.2 84% 4.9%);
  --foreground: hsl(210 40% 98%);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

### Points Importants

- Sans `@custom-variant dark`, les utilitaires `dark:*` ne génèrent rien
- Le sélecteur `&:where(.dark, .dark *)` couvre l'élément et ses descendants
- Combiner avec `next-themes` qui ajoute/retire la classe `.dark` sur `<html>`
- Les tokens CSS sémantiques sont surchargés par `.dark` puis exposés via `@theme inline`

---

## Utilitaires renommés

### Description

La v4 renomme plusieurs utilitaires pour harmoniser les échelles. Les anciennes formes sont supprimées (pas un renommage progressif). Attention aux conflits lors d'une migration depuis v3.

### Exemple

```html
<!-- v3 → v4 -->
<!-- shadow-sm → shadow-xs, shadow → shadow-sm -->
<div class="shadow-sm">shadow 2px (ex shadow-sm v3)</div>
<div class="shadow-md">shadow medium</div>

<!-- rounded-sm → rounded-xs, rounded → rounded-sm -->
<div class="rounded-sm">border radius 2px</div>

<!-- outline-none → outline-hidden -->
<button class="outline-hidden">sans outline</button>

<!-- flex-shrink-0 → shrink-0, flex-grow → grow -->
<div class="shrink-0 grow">flex children</div>
```

### Points Importants

- `shadow-sm` v4 = `shadow` v3 (décalage d'un cran vers le plus grand)
- `blur-sm` v4 = `blur` v3, idem pour `drop-shadow`, `rounded`
- `bg-opacity-*`, `text-opacity-*` supprimés : utiliser `bg-black/50` (opacity modifier)
- `ring` par défaut passe de 3px à 1px

---

## Container queries natifs

### Description

La v4 ajoute le support natif des container queries (responsive par container plutôt que par viewport). Utile pour des composants qui s'adaptent à leur conteneur parent, pas à la taille de fenêtre.

### Exemple

```html
<div class="@container">
  <div class="@sm:flex @sm:gap-4">
    <img class="@sm:w-24 @sm:shrink-0" src="/img.jpg" alt="" />
    <div>Contenu qui passe en flex si le container est @sm+</div>
  </div>
</div>
```

### Points Importants

- `@container` marque l'élément comme container query ancestor
- Breakpoints : `@sm`, `@md`, `@lg`, `@xl`, `@2xl`, `@3xl`, `@4xl` (sur le container, pas le viewport)
- Utile pour les composants shadcn/ui réutilisés dans des layouts variables
- Pas besoin de plugin : support natif

---

## Intégration Next.js via PostCSS

### Description

Dans Next.js 16, Tailwind v4 s'intègre via le plugin PostCSS `@tailwindcss/postcss`. La configuration se fait dans `postcss.config.mjs`, et le CSS d'entrée est importé dans `app/layout.tsx` ou `globals.css`.

### Exemple

```js
// postcss.config.mjs
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

```css
/* src/app/globals.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* tokens sémantiques */
}
```

```tsx
// src/app/layout.tsx
import './globals.css'
```

### Points Importants

- Plugin PostCSS renommé : `tailwindcss` → `@tailwindcss/postcss`
- Pas besoin d'`autoprefixer` séparé (inclus)
- Compatible Next.js 16 + Turbopack
- Alternative : plugin Vite `@tailwindcss/vite` pour les projets Vite

---

# Commandes Clés

## Installation (Next.js 16)

### Description

Installation de Tailwind v4 dans un projet Next.js 16. Pas de commande `tailwind init` en v4 (suppression du `tailwind.config.js`, config 100% CSS-first). Le setup consiste à installer 3 packages et créer `postcss.config.mjs` + importer Tailwind dans `globals.css`.

### Syntaxe

```bash
# 1. Installer les 3 packages requis
pnpm add tailwindcss @tailwindcss/postcss postcss

# 2. Créer postcss.config.mjs à la racine
cat > postcss.config.mjs << 'EOF'
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
}
export default config
EOF

# 3. Importer Tailwind dans src/app/globals.css
# Remplacer tout contenu Tailwind v3 existant par :
# @import "tailwindcss";
```

### Points Importants

- Pas de `pnpm add @tailwindcss/cli` en contexte Next.js : PostCSS + Turbopack gèrent la compilation
- Plugin PostCSS **renommé** : en v3 c'était `tailwindcss` dans `postcss.config`, en v4 c'est `@tailwindcss/postcss`
- Aucun `tailwind.config.js` à créer : toute la config passe par `@theme` dans le CSS
- Turbopack (défaut Next.js 16) est compatible nativement avec le plugin PostCSS Tailwind v4

---

## CLI standalone (hors Next.js)

### Description

Le binaire `@tailwindcss/cli` est utile pour les projets HTML statique ou Vite sans plugin. Dans le portfolio (Next.js), il n'est **pas nécessaire**. Cette section est documentée pour complétude.

### Syntaxe

```bash
# Installation
pnpm add -D @tailwindcss/cli

# Build single
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css

# Watch mode
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --watch

# Build production (minifié)
npx @tailwindcss/cli -i ./src/input.css -o ./dist/output.css --minify
```

### Points Importants

- Binaire **renommé** en v4 : `npx tailwindcss` → `npx @tailwindcss/cli`
- Flags courts : `-i` (input), `-o` (output), `-w` (watch), `-m` (minify)
- Dans le portfolio, cette CLI n'est pas utilisée (PostCSS gère via Next.js)

---

# Bonnes Pratiques

## ✅ Recommandations

- Déclarer tous les tokens dans `@theme` (CSS variables sémantiques)
- Utiliser `@theme inline` pour exposer des variables imbriquées
- Configurer `@custom-variant dark` pour le dark mode par classe
- Préférer l'extraction en composants React plutôt que `@apply`
- Utiliser les opacity modifiers (`bg-black/50`) au lieu de `bg-opacity-*`

## ❌ Anti-Patterns

- Ne pas utiliser `@tailwind base/components/utilities` (supprimé en v4)
- Ne pas créer de `tailwind.config.js` (inutile en v4)
- Ne pas oublier `@custom-variant dark` pour le dark mode par classe
- Ne pas utiliser `tailwindcss-animate` (déprécié, utiliser `tw-animate-css`)
- Ne pas mélanger v3 et v4 dans le même projet

---

# 🔗 Ressources

## Documentation Officielle

- [Tailwind CSS : Documentation](https://tailwindcss.com/docs)
- [Tailwind v4 : Blog officiel](https://tailwindcss.com/blog/tailwindcss-v4)
- [Upgrade guide v3 → v4](https://tailwindcss.com/docs/upgrade-guide)

## Ressources Complémentaires

- [shadcn/ui + Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Next.js framework guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
