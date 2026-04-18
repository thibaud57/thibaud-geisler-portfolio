---
paths:
  - "src/app/globals.css"
  - "postcss.config.mjs"
  - "postcss.config.js"
---

# Tailwind CSS v4 — Setup & configuration

## À faire
- Installer **3 packages** : `tailwindcss`, `@tailwindcss/postcss`, `postcss` (pas de `tailwind init`, pas de `tailwind.config.js` en v4)
- Importer Tailwind via **`@import "tailwindcss"`** dans `src/app/globals.css` (remplace `@tailwind base/components/utilities` de v3)
- Configurer le plugin **`@tailwindcss/postcss`** dans `postcss.config.mjs` (renommé depuis `tailwindcss` en v3)
- Toute la config (couleurs, typographie, espacements, radius, breakpoints) se déclare dans **`@theme`** dans le CSS, plus de fichier JS
- Utiliser **`@theme inline`** pour exposer des CSS variables sémantiques imbriquées (`--color-background: var(--background)`)
- Pour le dark mode par classe : déclarer **`@custom-variant dark (&:where(.dark, .dark *));`** dans `globals.css` (v4 supprime `darkMode: 'class'` du config JS)
- Définir les tokens dans `:root` (light) et `.dark` (dark), exposés via `@theme inline` pour générer les utilitaires `bg-background`, `text-foreground`, etc.
- Préférer le format **OKLCH** pour les couleurs : meilleur gamut que HSL, convention par défaut Tailwind v4 + shadcn/ui
- Pour les **container queries** : marquer un élément avec `@container` et utiliser les variants `@sm:`, `@md:`, `@lg:`, etc. (responsive par container, pas par viewport)
- Pour les animations : utiliser **`tw-animate-css`** (remplace `tailwindcss-animate` déprécié en v4)

## À éviter
- Utiliser `@tailwind base/components/utilities` : **supprimé** en v4, remplacé par `@import "tailwindcss"`
- Créer un `tailwind.config.js` ou `tailwind.config.ts` : **inutile** en v4, toute la config est CSS-first via `@theme`
- Configurer `darkMode: 'class'` dans un fichier JS : déprécié, utiliser `@custom-variant dark` dans le CSS global
- Utiliser **`tailwindcss-animate`** : déprécié en v4, remplacer par **`tw-animate-css`**
- Mélanger Tailwind v3 et v4 dans le même projet : utilitaires renommés, incompatibles
- Utiliser des préprocesseurs **Sass / Less / Stylus** : incompatibles avec Tailwind v4 (CSS-first only)

## Gotchas
- Plugin PostCSS **renommé** : v3 `tailwindcss` → v4 **`@tailwindcss/postcss`** (sinon erreur de build)
- **Utilitaires renommés v3 → v4** : `shadow-sm` → `shadow-xs`, `blur-sm` → `blur-xs`, `rounded-sm` → `rounded-xs`, `outline-none` → `outline-hidden`, `ring` (3px) → `ring-3`
- **Gradients** : `bg-gradient-to-*` → `bg-linear-to-*`
- **Important suffix** : `!flex` (préfixe v3) → `flex!` (suffixe v4)
- **Ordre des variants empilés** : gauche-à-droite en v4 (au lieu de droite-à-gauche en v3) — ex: `dark:hover:bg-primary` (v4) au lieu de `hover:dark:bg-primary` (v3)
- **Browser minimum** : Chrome 111, Safari 16.4, Firefox 128 (pas de support legacy)

## Exemples
```css
/* ✅ src/app/globals.css minimal — @import + @custom-variant dark + tokens */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.15 0 0);
  --primary: oklch(0.55 0.18 250);
}

.dark {
  --background: oklch(0.15 0 0);
  --foreground: oklch(0.98 0 0);
  --primary: oklch(0.7 0.18 250);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
}
```

```js
// ✅ postcss.config.mjs — plugin @tailwindcss/postcss (v4)
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}

// ❌ Plugin v3 (renommé en v4)
export default {
  plugins: {
    tailwindcss: {},
  },
}
```

```html
<!-- ✅ Container queries : @container + variants @sm/@md/@lg -->
<div class="@container">
  <div class="@sm:flex @sm:gap-4">
    <div class="@sm:w-1/3">Sidebar</div>
    <div class="@sm:w-2/3">Content</div>
  </div>
</div>
```
