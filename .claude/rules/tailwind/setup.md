---
paths:
  - "src/app/globals.css"
  - "postcss.config.mjs"
---

# Tailwind CSS v4 : setup et configuration

## À faire
- Importer Tailwind par **`@import "tailwindcss"`** en tête de `src/app/globals.css`, jamais par `@tailwind base/components/utilities` (supprimé en v4)
- Garder les deux imports qui suivent : **`@import "tw-animate-css"`** (animations, remplace `tailwindcss-animate` déprécié) et **`@import "shadcn/tailwind.css"`** (posé par `shadcn init` : variantes `data-open:`/`data-closed:` et animations partagées des composants). Le second n'est pas du code mort
- Brancher le plugin **`@tailwindcss/postcss`** dans `postcss.config.mjs` : avec `tailwindcss`, ce sont les deux seuls paquets, sans `postcss` en dépendance directe
- Déclarer toute la config (couleurs, typographie, espacements, radius, breakpoints) dans **`@theme`**, dans le CSS : ni `tailwind init`, ni `tailwind.config.js`
- Utiliser **`@theme inline`** pour exposer les variables sémantiques (`--color-background: var(--background)`)
- Déclarer le dark mode par classe avec **`@custom-variant dark (&:where(.dark, .dark *));`**, jamais par `darkMode: 'class'` (supprimé avec le config JS)
- Définir les tokens dans `:root` (light) et `.dark` (dark), exposés via `@theme inline` pour générer `bg-background`, `text-foreground`, etc.
- Exprimer les couleurs en **OKLCH** : convention de Tailwind v4 et shadcn/ui

## Gotchas
- **Utilitaires renommés v3 → v4** : `shadow-sm` → `shadow-xs`, `blur-sm` → `blur-xs`, `rounded-sm` → `rounded-xs`, `outline-none` → `outline-hidden`, `ring` (3px) → `ring-3`
- **Gradients** : `bg-gradient-to-*` → `bg-linear-to-*`
- **Important suffix** : `!flex` (préfixe v3) → `flex!` (suffixe v4)
- **Ordre des variants empilés** : gauche-à-droite en v4, ex: `dark:hover:bg-primary` (v4) au lieu de `hover:dark:bg-primary` (v3)
- **Browser minimum** : Chrome 111, Safari 16.4, Firefox 128 (pas de support legacy)

## Exemples
```css
/* ✅ En-tête de globals.css : trois imports, variante dark, tokens exposés */
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:where(.dark, .dark *));

@theme inline {
  --color-background: var(--background);
}

:root { --background: oklch(1 0 0); }
.dark { --background: oklch(0.145 0 0); }
```

```js
// ✅ postcss.config.mjs : plugin v4
export default { plugins: { '@tailwindcss/postcss': {} } }

// ❌ Plugin v3, renommé en v4
export default { plugins: { tailwindcss: {} } }
```
