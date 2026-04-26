---
paths:
  - "src/app/**/*.tsx"
  - "src/components/**/*.tsx"
---

# Tailwind CSS — Conventions de code & usage

## À faire
- **`cn()` obligatoire** : toujours utiliser `cn()` (de shadcn/ui — wrapper `clsx` + `tailwind-merge`) pour composer les classes Tailwind dans les composants React (override propre par props sans conflit)
- Référencer les couleurs par **token CSS sémantique** (`bg-primary`, `text-foreground`, `border-border`, `bg-card`) au lieu de couleurs Tailwind brutes (`bg-green-600`) ou hex en dur (`text-[#8FA68E]`) — les tokens vivent dans `globals.css` et changent automatiquement entre light/dark
- **Mobile-first** : écrire le style de base pour mobile, puis élargir avec les variants `sm:`, `md:`, `lg:`, `xl:` (convention Tailwind standard)
- **Ordre d'application** dans `cn()` : `layout → spacing → typography → colors → effects → responsive` (lisibilité accrue)
- Respecter les **breakpoints projet** : `sm` (≥640px), `md` (≥768px, navigation desktop), `lg` (≥1024px, grids 3 col), `xl` (≥1280px, container max)
- **Container standard** du projet : `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (1280px max, padding responsive)
- **Section padding vertical** standard : `py-16 sm:py-20 lg:py-24` pour l'espacement entre sections
- Préférer l'**extraction en composants React** plutôt que `@apply` pour créer une **classe réutilisable** du type `.btn-primary` (composants > directives Tailwind). **Exception** : `@apply` reste autorisé dans `@layer base` pour les **resets HTML globaux** (sélecteurs `*`, `body`, `html`…) où aucun composant React ne peut matcher la cible
- Utiliser les **opacity modifiers** (`bg-black/50`, `text-foreground/80`) au lieu de `bg-opacity-*` / `text-opacity-*` (supprimés en v4)
- **Border radius via `--radius`** : modifier uniquement `--radius` dans `globals.css` pour ajuster proportionnellement toute l'échelle (sm/md/lg/xl dérivés via `calc()`)
- **`cursor-pointer` v4** : preflight v4 retire le default sur `<button>` → restaurer via snippet officiel (`button:not(:disabled), [role="button"]:not(:disabled)`) dans `@layer base` + ajouter `cursor-pointer` dans les CVA des items shadcn cliquables (`DropdownMenuItem`, `SelectItem`, etc.). Pas de `:is()` custom étendu.

## À éviter
- **Couleurs en dur** : `bg-green-600`, `text-[#8FA68E]`, `text-red-500` → toujours via tokens (`bg-primary`, `text-destructive`) sinon le dark mode ne fonctionne pas
- Utiliser **`@apply`** hors `@layer base` pour composer des classes réutilisables : préférer l'extraction en composant React (plus maintenable, meilleur DX). `@apply` reste autorisé dans `@layer base` pour les resets HTML globaux (pattern shadcn/ui officiel)
- Utiliser **`!important`** : si un style ne s'applique pas, corriger la cascade via `cn()` ou revoir la structure du composant
- **Inline styles** `style={{}}` : utiliser Tailwind, sauf pour des valeurs **dynamiques calculées** au runtime (positions, dimensions variables)
- **CSS modules ou styled-components** : tout le styling passe par Tailwind, pas de CSS custom sauf cas exceptionnel (animations keyframes complexes)
- Définir des **breakpoints custom non standards** : respecter `sm/md/lg/xl` pour la cohérence projet

## Gotchas
- Pour la **config initiale** (`@import "tailwindcss"`, `@theme`, `@custom-variant dark`, PostCSS, container queries, breaking changes v3→v4) : voir `tailwind/setup.md`
- Pour la **palette de couleurs du projet** (tokens OKLCH, vert sauge `--primary`, dark/light variants) : voir `DESIGN.md` section Palette de Couleurs

## Exemples
```typescript
// ✅ cn() avec ordre layout → spacing → typography → colors → effects → responsive
<div className={cn(
  "flex flex-col gap-4",          // layout
  "p-6",                          // spacing
  "text-base font-medium",        // typography
  "bg-card text-card-foreground", // colors
  "rounded-lg shadow-sm",         // effects
  "md:flex-row md:gap-8"          // responsive
)}>
```

```typescript
// ✅ Tokens CSS sémantiques (s'adaptent automatiquement au dark mode)
<button className="bg-primary text-primary-foreground hover:bg-primary/90">
  Action
</button>

// ❌ Couleur hardcodée (ne s'adapte pas au dark mode)
<button className="bg-green-600 text-white hover:bg-green-700">
  Action
</button>

// ❌ Hex en dur (idem + casse les conventions)
<button className="bg-[#aabbcc] text-[#ffffff]">
  Action
</button>
```

```typescript
// ✅ Container + section padding standards du projet
<section className="py-16 sm:py-20 lg:py-24">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    {/* contenu */}
  </div>
</section>
```
