---
title: "next-themes — Dark/Light Mode"
version: "0.4.6"
description: "Référence technique pour next-themes : concepts clés, usage et exemples pour le portfolio Next.js."
date: "2026-04-13"
keywords: ["next-themes", "dark-mode", "nextjs", "tailwind", "theme"]
scope: ["docs"]
technologies: ["Next.js", "React", "Tailwind CSS"]
---

# Description

`next-themes` est une librairie légère pour gérer le dark/light mode (et thèmes personnalisés) dans les applications Next.js. Elle expose un `ThemeProvider` qui injecte un script bloquant avant l'hydration pour éviter le flash of wrong theme (FOWT), et un hook `useTheme` pour lire/modifier le thème courant. Utilisée dans le portfolio pour le toggle dark/light sur les pages publiques, combinée avec Tailwind CSS v4 via `@custom-variant dark`.

---

# Concepts Clés

## ThemeProvider (App Router)

### Description

Wrapper racine à placer dans `app/layout.tsx`. Injecte un script inline avant l'hydration pour définir la classe CSS du thème avant le premier paint. L'attribut `suppressHydrationWarning` sur `<html>` est obligatoire car next-themes modifie l'attribut `class` au mount côté client, ce qui déclencherait sinon un warning React de hydration mismatch.

### Exemple

```tsx
// src/app/layout.tsx
import { ThemeProvider } from 'next-themes'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Points Importants

- `suppressHydrationWarning` doit être placé sur `<html>`, pas sur `<body>`
- `attribute="class"` ajoute la classe `.dark` ou `.light` sur `<html>`, indispensable pour Tailwind
- `defaultTheme="system"` et `enableSystem` permettent de suivre la préférence OS via `prefers-color-scheme`
- Le script injecté s'exécute avant l'hydration React pour éviter le flash visuel

---

## useTheme — Hook client

### Description

Hook retournant l'état et les setters du thème. Doit être appelé dans un composant marqué `'use client'`. Côté serveur, `theme` et `resolvedTheme` sont `undefined` : il faut utiliser le pattern `mounted` pour différer le rendu conditionnel jusqu'à l'hydration client.

### Exemple

```tsx
'use client'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="size-9" />

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}
```

### Points Importants

- Utiliser `resolvedTheme` (jamais `theme`) pour les logiques conditionnelles d'UI, car `theme` peut valoir `'system'`
- `theme` : valeur sélectionnée (peut être `'system'`)
- `resolvedTheme` : thème effectivement appliqué (`'light'` ou `'dark'`)
- `systemTheme` : préférence OS détectée
- Le pattern `mounted` évite les hydration mismatches sur les toggles conditionnels

---

## Intégration Tailwind CSS v4

### Description

Tailwind v4 supprime `darkMode: 'class'` de `tailwind.config.js` (la config est désormais CSS-first). Pour activer le dark mode par classe avec next-themes, il faut déclarer explicitement un `@custom-variant dark` dans le CSS global pointant sur la classe `.dark` ajoutée par next-themes.

### Exemple

```css
/* src/app/globals.css */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

```tsx
// Utilisation dans les composants
<div className="bg-white text-black dark:bg-black dark:text-white">
  Contenu qui s'adapte au thème
</div>
```

### Points Importants

- Sans `@custom-variant dark`, les utilitaires `dark:*` ne s'appliquent pas avec Tailwind v4
- `ThemeProvider` doit utiliser `attribute="class"` (pas `data-theme`) pour matcher le sélecteur `.dark`
- Le sélecteur `&:where(.dark, .dark *)` applique le variant quand `.dark` est sur l'élément ou un ancêtre
- Pas de `tailwind.config.js` nécessaire pour le dark mode en v4

---

## Props ThemeProvider

### Description

Props principales du `ThemeProvider` pour configurer le comportement du thème (stockage, transitions, thèmes custom, CSP).

### Exemple

```tsx
<ThemeProvider
  attribute="class"              // 'class' ou 'data-theme' ou string[]
  defaultTheme="system"           // 'system' | 'light' | 'dark'
  enableSystem                    // suit prefers-color-scheme
  disableTransitionOnChange       // évite le flash de transitions CSS
  storageKey="portfolio-theme"    // clé localStorage
  themes={['light', 'dark']}      // thèmes disponibles
>
  {children}
</ThemeProvider>
```

### Points Importants

- `disableTransitionOnChange` : utile si les transitions CSS provoquent un flash visuel au changement
- `storageKey` : utile pour isoler le thème du portfolio d'autres apps sur le même domaine
- `enableColorScheme` (défaut `true`) applique la propriété CSS `color-scheme` pour ajuster scrollbars et form controls natifs
- Support multi-attributs depuis v0.4.1 : `attribute={['class', 'data-theme']}`

---

# Bonnes Pratiques

## ✅ Recommandations

- Placer `suppressHydrationWarning` sur `<html>` dans `app/layout.tsx`
- Toujours utiliser `resolvedTheme` pour les logiques conditionnelles d'UI
- Appliquer le pattern `mounted` sur les composants qui rendent différemment selon le thème
- Pour Tailwind v4 : déclarer `@custom-variant dark (&:where(.dark, .dark *));` dans `globals.css`
- Utiliser `disableTransitionOnChange` si des transitions globales provoquent un flash
- Marquer les composants qui utilisent `useTheme` avec `'use client'`

## ❌ Anti-Patterns

- Ne pas utiliser `theme` pour décider de l'affichage (peut valoir `'system'`, impossible à rendre)
- Ne pas oublier `suppressHydrationWarning` sur `<html>` (warning React en console)
- Ne pas rendre conditionnellement sans le pattern `mounted` (hydration mismatch)
- Ne pas essayer d'utiliser `useTheme` dans un Server Component (hook client uniquement)
- Ne pas configurer `darkMode: 'class'` dans `tailwind.config.js` en v4 (obsolète, utiliser `@custom-variant`)

---

# 🔗 Ressources

## Documentation Officielle

- [next-themes — GitHub](https://github.com/pacocoursey/next-themes)
- [next-themes — Releases](https://github.com/pacocoursey/next-themes/releases)

## Ressources Complémentaires

- [Dark mode avec Next 15, next-themes et Tailwind v4](https://iifx.dev/en/articles/456423217/solved-enabling-class-based-dark-mode-with-next-15-next-themes-and-tailwind-4)
- [Theme colors with Tailwind CSS v4 and next-themes](https://medium.com/@kevstrosky/theme-colors-with-tailwind-css-v4-0-and-next-themes-dark-light-custom-mode-36dca1e20419)
