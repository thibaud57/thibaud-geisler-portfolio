---
title: "Tailwind CSS : Framework utility-first"
version: "4.3.5"
description: "Référence technique pour Tailwind CSS v4 : CSS-first config, @theme, dark mode et intégration Next.js."
date: "2026-11-10"
keywords: ["tailwind", "css", "utility", "theme", "dark-mode"]
scope: ["docs"]
technologies: ["Next.js", "React", "shadcn/ui"]
---

# Description

`Tailwind CSS` v4 est le framework utility-first utilisé dans le portfolio. La v4 marque un virage majeur : configuration CSS-first via `@theme` (plus de `tailwind.config.js`), support natif des container queries, couleurs OKLCH par défaut, et plugin Vite officiel. Intégration via `@tailwindcss/postcss` dans Next.js 16, avec dark mode par classe pour le store de thème du projet et shadcn/ui.

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

En v4, le dark mode par classe ne se configure plus via `darkMode: 'class'` dans un fichier JS. Il faut déclarer explicitement un `@custom-variant dark` dans le CSS global, pointant sur la classe `.dark` (ajoutée par le store de thème). Sans cette déclaration, les utilitaires `dark:*` ne fonctionnent pas.

### Exemple

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
}
```

### Points Importants

- Sans `@custom-variant dark`, les utilitaires `dark:*` ne génèrent rien
- Le sélecteur `&:where(.dark, .dark *)` couvre l'élément et ses descendants
- Combiner avec le store de thème (`src/lib/theme.ts`) qui ajoute/retire la classe `.dark` sur `<html>`
- Les tokens CSS sémantiques sont surchargés par `.dark` puis exposés via `@theme inline`

---

## Utilitaires renommés

### Description

La v4 renomme plusieurs utilitaires pour harmoniser les échelles. Les anciennes formes sont supprimées (pas un renommage progressif). Attention aux conflits lors d'une migration depuis v3.

### Exemple

```html
<!-- v3 → v4 -->
<!-- shadow-sm → shadow-xs, shadow → shadow-sm -->
<div class="shadow-sm">ombre de base (ex shadow v3)</div>
<div class="shadow-xs">ombre la plus fine (ex shadow-sm v3)</div>

<!-- rounded-sm → rounded-xs, rounded → rounded-sm -->
<div class="rounded-sm">rayon de base, 4px (ex rounded v3)</div>
<div class="rounded-xs">rayon fin, 2px (ex rounded-sm v3)</div>

<!-- outline-none → outline-hidden -->
<button class="outline-hidden">sans outline</button>

<!-- flex-shrink-0 → shrink-0, flex-grow → grow -->
<div class="shrink-0 grow">flex children</div>
```

### Points Importants

- `shadow-sm` v4 = `shadow` v3 et `shadow-xs` v4 = `shadow-sm` v3 (décalage d'un cran, de même pour `rounded`, `blur`) ([upgrade guide](https://tailwindcss.com/docs/upgrade-guide), relevé le 2026-11-10)
- Le décalage vaut aussi pour `drop-shadow`
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
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  /* tokens sémantiques en oklch(), cf. docs/DESIGN.md */
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

# Bonnes Pratiques

## ✅ Recommandations

- Déclarer tous les tokens dans `@theme` (CSS variables sémantiques) et utiliser `@theme inline` pour exposer des variables imbriquées
- Poser `@custom-variant dark` pour le dark mode par classe : sans lui, `dark:*` ne génère rien
- Utiliser les opacity modifiers (`bg-black/50`) au lieu de `bg-opacity-*`

## ❌ Anti-Patterns

- Ne pas utiliser `tailwindcss-animate` (déprécié, utiliser `tw-animate-css`)

---

# 🔗 Ressources

## Documentation Officielle

- [Tailwind CSS : Documentation](https://tailwindcss.com/docs)
- [Tailwind v4 : Blog officiel](https://tailwindcss.com/blog/tailwindcss-v4)
- [Upgrade guide v3 → v4](https://tailwindcss.com/docs/upgrade-guide)

## Ressources Complémentaires

- [shadcn/ui + Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Next.js framework guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
