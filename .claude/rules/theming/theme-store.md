---
paths:
  - "src/lib/theme.ts"
  - "src/lib/theme-script.ts"
  - "src/components/theme-script.tsx"
  - "src/app/**/layout.tsx"
  - "src/app/global-not-found.tsx"
---

# Theming — store maison dark/light (`src/lib/theme.ts`)

next-themes a été retiré (abandonné depuis mars 2025, bug de thème périmé sous React 19 Activity, pacocoursey/next-themes#375). Le thème est géré par un store singleton de module, sans provider.

## À faire
- Consommer le thème via **`useTheme()` de `@/lib/theme`** uniquement : `{ theme, resolvedTheme, setTheme }`, même API que next-themes
- **`resolvedTheme` est `undefined` au SSR et pendant l'hydratation** : rendre un placeholder tant qu'il l'est. `useSyncExternalStore` re-rend seul au premier snapshot client — jamais de state `mounted` + effect
- **`suppressHydrationWarning` sur `<html>`** (jamais sur `<body>`) : le script anti-FOUC pose la classe avant l'hydratation
- Script anti-FOUC : **`<ThemeScript />`** (via `useServerInsertedHTML`, invisible pour React côté client, donc sans warning script-in-component) dans le layout `[locale]` ; `global-not-found.tsx` embarque le script brut, il rend son propre document
- Toute écriture de thème passe par **`setTheme()`** : écrivain unique, il persiste, applique la classe et notifie
- Dark mode Tailwind v4 : `@custom-variant dark` dans `globals.css`, couleurs via tokens uniquement (cf. `tailwind/conventions.md`)

## À éviter
- **Recréer un `app/layout.tsx` passe-plat au-dessus de `[locale]`** : il redeviendrait le root layout, `[locale]/layout` serait remonté à chaque changement de langue et React purgerait la classe de thème du `<html>` (Host Singletons). Le root layout du projet EST `app/[locale]/layout.tsx` ; le 404 hors locale passe par `global-not-found.tsx` (`experimental.globalNotFound`)
- **Réintroduire un provider React pour le thème** (next-themes ou équivalent) : React 19 Activity garde un arbre par locale monté mais caché, chaque instance réappliquerait son état périmé en redevenant active
- Manipuler `document.documentElement.classList` en dehors de `src/lib/theme.ts`
- Utiliser `theme` au lieu de `resolvedTheme` pour l'affichage : `theme` peut valoir `'system'`

## Gotchas
- Un `MutationObserver` (dans le store) réapplique le thème depuis le storage si la classe disparaît : c'est lui qui absorbe les purges d'attributs de React au changement de segment. Ne pas le retirer
- La préférence OS (`prefers-color-scheme`) et la sync entre onglets (`storage` event) sont gérées par le store, rien à câbler côté composant

## Exemples
```tsx
// ✅ Consommation : placeholder tant que resolvedTheme est undefined, zéro effect
const { resolvedTheme, setTheme } = useTheme()
if (!resolvedTheme) return <Button variant="ghost" size="icon"><Moon /></Button>

// ❌ Pattern mounted hérité de next-themes (state + effect + eslint-disable) : inutile ici
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
```
