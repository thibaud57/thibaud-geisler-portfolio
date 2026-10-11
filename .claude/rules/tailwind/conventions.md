---
paths:
  - "src/{app,components}/**/*.tsx"
---

# Tailwind CSS — Conventions de code & usage

## À faire
- **`cn()` obligatoire** : composer les classes Tailwind par `cn()` (paquet `cn`, réexporté par `src/lib/utils.ts`, même sortie que `clsx` + `tailwind-merge` v3) pour un override propre par props, sans conflit
- Référencer les couleurs par **token CSS sémantique** (`bg-primary`, `text-foreground`, `border-border`, `bg-card`), jamais par une couleur Tailwind brute (`bg-green-600`) ni un hex (`text-[#8FA68E]`) : seuls les tokens suivent le passage light/dark
- **Mobile-first** : style de base pour mobile, puis élargir avec `sm:`, `md:`, `lg:`, `xl:`
- **Ordre d'application** dans `cn()` : `layout → spacing → typography → colors → effects → responsive`
- Respecter les **breakpoints projet** : `sm` (≥640px), `md` (≥768px, navigation desktop), `lg` (≥1024px, grids 3 col), `xl` (≥1280px, container max)
- **Gabarits standard** : container `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, espacement vertical de section `py-16 sm:py-20 lg:py-24`
- Extraire une **classe réutilisable** en composant React, jamais en `@apply` : `@apply` ne reste autorisé que dans `@layer base`, pour les resets HTML globaux (`*`, `body`, `html`) qu'aucun composant ne peut cibler
- Utiliser les **opacity modifiers** (`bg-black/50`, `text-foreground/80`) au lieu de `bg-opacity-*` / `text-opacity-*` (supprimés en v4)
- **Border radius via `--radius`** : modifier uniquement `--radius` dans `globals.css`, l'échelle sm/md/lg/xl en dérive
- **Curseurs posés une fois en `@layer base`** : preflight v4 retire le curseur des boutons et laisse le curseur texte hériter partout. `globals.css` pose les trois règles : `cursor-default` sur `body`, `cursor: text` sur `input` (hors case et radio), `textarea, [contenteditable]`, `cursor: pointer` sur les boutons, `select` et `summary` natifs, les items à rôle ARIA (`option`, `menuitem`, `menuitemcheckbox`, `menuitemradio`, hors `aria-disabled`) et les `label` qui enveloppent une case ou un radio. Un nouvel élément cliquable se couvre en ajoutant son rôle à cette liste. Parti pris : DESIGN.md § Règles
- **Retirer tout `cursor-default` ou `cursor-pointer` d'un composant livré par `add`** (`SelectItem`, `CommandItem`, items de `DropdownMenu`, menu de l'éditeur) : un utilitaire l'emporte sur `@layer base` et rend la flèche sur un item cliquable. Un `cursor-*` local ne reste légitime que sur un élément sans rôle ni bouton (ligne de table cliquable, zone de dépôt)
- **Scale typo H1/H2/H3 appliquée par `@layer base`** dans `globals.css` : ne pas répéter les classes de taille sur chaque heading. Override local pour les exceptions (`font-display` des cards marketing, `text-xs uppercase` des labels visuels). Garder `prose-h2:*` / `prose-h3:*` dans `MarkdownContent` (spécificité `.prose`)

## À éviter
- Utiliser **`!important`** : corriger la cascade via `cn()` ou revoir la structure du composant
- **Inline styles** `style={{}}`, sauf valeurs **dynamiques calculées** au runtime (positions, dimensions variables)
- **CSS modules ou styled-components** : tout le styling passe par Tailwind, sauf cas exceptionnel (keyframes complexes)
- Définir des **breakpoints custom** hors `sm/md/lg/xl`

## Gotchas
- Pour la **config initiale** (`@import "tailwindcss"`, `@theme`, `@custom-variant dark`, PostCSS, container queries, breaking changes v3→v4) : voir `tailwind/setup.md`
- Pour la **palette de couleurs du projet** (tokens OKLCH, vert sauge `--primary`, dark/light variants) : voir `DESIGN.md` section Palette de Couleurs
- **Un conteneur qui défile rogne l'anneau de focus** des éléments collés à son bord : `overflow-y-auto` passe aussi l'axe horizontal en `auto`, et `overflow-hidden` coupe tout. Les 3px du `ring-3` disparaissent sans erreur (constaté le 2026-10-09 sur le formulaire d'action, la vue détail et les listes). Réserver la place au lieu de rétrécir le contenu :
  - **Dans une modale** : `DialogBody` (`ui/dialog.tsx`), qui défile jusqu'au bord de la modale (`-mx-4 px-4`). Les champs ne bougent pas
  - **Ailleurs** : marge négative compensée par un padding au moins égal à l'anneau (`-mx-1 px-1`, comme les colonnes du Pipeline)
  - **Ligne de table cliquable** : contour de focus en retrait (`focus-visible:-outline-offset-2`)

## Exemples
```typescript
// ✅ cn() dans l'ordre layout → spacing → typography → colors → effects → responsive
<div className={cn('flex flex-col gap-4', 'p-6', 'text-base font-medium', 'bg-card text-card-foreground', 'rounded-lg', 'md:flex-row')} />

// ✅ Token sémantique : suit le dark mode
<button className="bg-primary text-primary-foreground hover:bg-primary/90">Action</button>

// ❌ Couleur brute ou hex : ignore le dark mode
<button className="bg-green-600 text-[#ffffff]">Action</button>
```
