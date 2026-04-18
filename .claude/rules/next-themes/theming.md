---
paths:
  - "src/app/layout.tsx"
  - "src/app/[locale]/layout.tsx"
  - "src/app/globals.css"
  - "src/components/providers/**/*.tsx"
  - "src/components/**/theme*.tsx"
  - "src/components/**/Theme*.tsx"
---

# next-themes — Theming dark/light

## À faire
- Wrapper le `<body>` du root layout avec **`<ThemeProvider>`** importé de `next-themes` (depuis v0.3.0 le package inclut sa directive `'use client'`, plus besoin de wrapper custom)
- **`suppressHydrationWarning`** obligatoire sur `<html>` (jamais sur `<body>`) : next-themes modifie l'attribut `class` au mount client, sinon hydration mismatch React
- Configurer **`attribute="class"`** pour ajouter `.dark` ou `.light` sur `<html>` (compatible Tailwind CSS v4)
- Configurer **`defaultTheme="system"`** + **`enableSystem`** pour suivre la préférence OS du visiteur (DESIGN.md : approche inclusive, pas de surprise pour les visiteurs non-dev)
- Activer **`disableTransitionOnChange`** pour éviter le flash de transitions CSS au switch de thème
- Optionnel : `storageKey="<nom-app>-theme"` pour isoler le localStorage si plusieurs apps cohabitent sur le même domaine
- Utiliser `useTheme()` uniquement dans des composants marqués **`'use client'`** (hook React, jamais dans un Server Component)
- Toujours utiliser **`resolvedTheme`** (jamais `theme`) pour les logiques conditionnelles d'UI : `theme` peut valoir `'system'`, impossible à rendre directement
- Pattern **`mounted`** sur les composants qui rendent différemment selon le thème : `useState(false)` + `useEffect(() => setMounted(true))` + render placeholder avant mount
- Pour **Tailwind CSS v4** : déclarer `@custom-variant dark (&:where(.dark, .dark *));` dans `globals.css` (Tailwind v4 supprime `darkMode: 'class'` du config JS)
- Toutes les couleurs UI passent par les **tokens CSS variables** définis dans `:root` et `.dark` (DESIGN.md : palette OKLCH vert sauge), jamais de hex en dur
- Le toggle dark/light est **accessible depuis la navbar** pour permettre au visiteur de forcer un mode (DESIGN.md)

## À éviter
- Utiliser `theme` au lieu de `resolvedTheme` pour décider de l'affichage : `theme` peut valoir `'system'`, impossible à rendre directement
- Oublier `suppressHydrationWarning` sur `<html>` : warning React en console (next-themes modifie `class` après l'hydration)
- Rendre conditionnellement selon `resolvedTheme` **sans le pattern `mounted`** : `resolvedTheme` est `undefined` côté serveur, donc hydration mismatch
- Utiliser `useTheme` dans un **Server Component** : hook client uniquement, casse au build
- Configurer `darkMode: 'class'` dans `tailwind.config.js` en v4 : **obsolète**, utiliser `@custom-variant dark` dans le CSS global
- Hardcoder des couleurs hex dans les composants : toujours passer par les tokens CSS (`bg-background`, `text-foreground`, etc.) — sinon le dark mode ne s'applique pas au composant

## Gotchas
- next-themes 0.4.6 + Next 16 : `suppressHydrationWarning` sur `<html>` **obligatoire** (sinon hydration mismatch React au mount)
- `useTheme().theme` et `resolvedTheme` toujours **`undefined` côté serveur** : retarder toute UI thème-dépendante avec le pattern `mounted`
- Projet next-themes **peu maintenu** (~1 release/an, mais stable) : pas de risque immédiat, à surveiller à long terme

## Exemples
```tsx
// ✅ src/app/layout.tsx — ThemeProvider en root + suppressHydrationWarning sur <html>
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

```tsx
// ✅ ThemeToggle Client Component avec mounted pattern + resolvedTheme
'use client'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="size-9" /> // placeholder anti-mismatch

  return (
    <button onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
      {resolvedTheme === 'dark' ? 'Light' : 'Dark'}
    </button>
  )
}

// ❌ Render direct sans mounted → hydration mismatch (resolvedTheme undefined côté serveur)
```

```css
/* ✅ src/app/globals.css — @custom-variant dark obligatoire pour Tailwind v4 */
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

```typescript
// ❌ tailwind.config.js avec darkMode: 'class' (obsolète en v4)
module.exports = { darkMode: 'class' }
```
