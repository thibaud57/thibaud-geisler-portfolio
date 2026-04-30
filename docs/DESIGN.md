---
title: "DESIGN — Thibaud Geisler Portfolio"
description: "Design system : typographie, couleurs, librairies UI, mapping composants et conventions de style."
date: "2026-04-14"
keywords: ["design", "ui", "design-system", "typography", "colors", "animations", "layout", "dark-mode", "icons", "components", "spacing"]
scope: ["docs", "frontend"]
technologies: ["Next.js", "Tailwind CSS", "shadcn/ui", "Magic UI", "Aceternity UI", "Motion", "next-themes", "next-intl"]
---

# 🎨 Identité Visuelle

## Typographie

### Police Principale

**Famille** : `Geist Sans`

**Source** : Google Fonts via `next/font/google`

**Usage** : corps de texte, UI générale, titres H2-H3, navigation, boutons

### Police Display (Secondaire)

**Famille** : `Sansation`

**Source** : Google Fonts via `next/font/google`

**Usage** : titres hero (H1), titres de cards des surfaces marketing, éléments de marque, logo, sections display marketing

### Police Monospace

**Famille** : `Geist Mono`

**Source** : Google Fonts via `next/font/google`

**Usage** : blocs de code, snippets techniques, éléments de stack technique

### Scale Typographique

| Usage | Taille | Poids | Classe Tailwind |
|-------|--------|-------|-----------------|
| H1 (display) | 3rem (48px) | 700 (Bold) | `text-5xl font-bold font-display` |
| H2 | 2.25rem (36px) | 600 (SemiBold) | `text-4xl font-semibold` |
| H3 | 1.5rem (24px) | 600 (SemiBold) | `text-2xl font-semibold` |
| Lead / Subtitle | 1.25rem (20px) | 400 (Regular) | `text-xl` |
| Body | 1rem (16px) | 400 (Regular) | `text-base` |
| Small / Caption | 0.875rem (14px) | 400 (Regular) | `text-sm` |

> `font-display` est une classe Tailwind custom mappée sur Sansation. Les autres tailles utilisent Geist Sans par défaut.

> **Exception** : sur les surfaces marketing, les titres de cards ajoutent aussi `font-display` au H3 (`font-display text-2xl font-semibold`) pour la cohérence éditoriale avec les H1 hero. Les pages internes (admin post-MVP, formulaires) gardent Geist Sans en H3.

## Palette de Couleurs

### Tokens / Variables CSS

> Les valeurs ci-dessous sont en hex pour la lisibilité. L'implémentation utilise le format **OKLCH** (convention shadcn/ui + Tailwind CSS v4).

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `#FFFFFF` | `#0F0F0F` | Fond de page |
| `--foreground` | `#0F0F0F` | `#FAFAFA` | Texte principal |
| `--primary` | `#5E7A5D` | `#8FA68E` | CTA, accent principal (vert sauge) |
| `--primary-foreground` | `#FFFFFF` | `#0F0F0F` | Texte sur primary |
| `--secondary` | `#F5F5F5` | `#1A1A1A` | Fond secondaire, cartes |
| `--secondary-foreground` | `#0F0F0F` | `#FAFAFA` | Texte sur secondary |
| `--muted` | `#F5F5F5` | `#262626` | Fond atténué |
| `--muted-foreground` | `#737373` | `#A3A3A3` | Texte atténué, placeholders |
| `--accent` | `#F0F5F0` | `#1A2E1A` | Fond accent (teinte sauge très légère) |
| `--accent-foreground` | `#0F0F0F` | `#FAFAFA` | Texte sur accent |
| `--border` | `#E5E5E5` | `#262626` | Bordures |
| `--input` | `#E5E5E5` | `#262626` | Bordures inputs |
| `--ring` | `#5E7A5D` | `#8FA68E` | Focus ring (vert sauge) |
| `--destructive` | `#DC2626` | `#EF4444` | Erreurs, actions destructives |
| `--card` | `#FFFFFF` | `#171717` | Fond des cartes |
| `--card-foreground` | `#0F0F0F` | `#FAFAFA` | Texte des cartes |
| `--popover` | `#FFFFFF` | `#171717` | Fond des popovers |
| `--popover-foreground` | `#0F0F0F` | `#FAFAFA` | Texte des popovers |

### Couleurs Sémantiques

> ℹ️ Tokens custom, non générés par shadcn/ui. À définir dans le CSS global.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | `#16A34A` | `#22C55E` | Confirmation formulaire, actions réussies |
| `--warning` | `#CA8A04` | `#EAB308` | Avertissements, états attention |
| `--info` | `#2563EB` | `#3B82F6` | Messages informatifs, aide contextuelle |
| `--shine` | `#FFFFFF / 0.95` | `#FFFFFF / 0.95` | Reflet lumineux constant (BorderBeam, effets shimmer) — volontairement non-thémé pour conserver l'effet de brillance en dark mode |

### Règles

- ✅ Toujours référencer les couleurs par token CSS : jamais de valeur hex en dur dans les composants
- ✅ L'accent vert sauge est utilisé avec parcimonie : CTA, liens, hover states, éléments de marque. Pas de surfaces entièrement vertes.
- ✅ Privilégier le contraste : le texte principal doit toujours avoir un ratio WCAG AA minimum (4.5:1)
- ✅ Les gris neutres (`muted`, `border`) n'ont pas de teinte colorée : ils restent purement neutres pour renforcer l'impact du vert sauge quand il apparaît

## Formes

### Border Radius

**Base** : `--radius: 0.625rem` (10px) — les variants sont dérivées automatiquement via `calc()`.

| Token | Valeur | Usage |
|-------|--------|-------|
| `--radius-sm` | `calc(var(--radius) - 4px)` → 6px | Badges, tags, petits éléments |
| `--radius-md` | `calc(var(--radius) - 2px)` → 8px | Boutons, inputs, éléments UI courants |
| `--radius-lg` | `var(--radius)` → 10px | Cards, conteneurs, modales |
| `--radius-xl` | `calc(var(--radius) + 4px)` → 14px | Sections, éléments larges |

> Convention shadcn/ui : modifier uniquement `--radius` pour ajuster proportionnellement toute l'échelle. Style arrondi doux, moderne et accueillant.

### Ombres / Élévation

| Token | Valeur | Usage |
|-------|--------|-------|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Petits éléments, boutons |
| `shadow` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Dropdowns, menus |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Cards custom au hover |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Modales, popovers |

> Valeurs par défaut Tailwind CSS. Les composants shadcn/ui (Card, Dialog, Popover) utilisent des **bordures** (`--border`) par défaut, pas des ombres. Les ombres sont réservées aux composants custom ou aux effets de hover. En dark mode, privilégier les bordures et les différences de fond (`--card` vs `--background`) pour la hiérarchie visuelle.

## Dark / Light Mode

**Stratégie** : `next-themes`

**Mécanisme** : CSS variables sur `:root` (light) et `.dark` (dark), switch via `next-themes` avec `attribute="class"`. **Suit la préférence OS du visiteur** (`defaultTheme="system"` + `enableSystem`), avec `prefers-color-scheme` comme source par défaut.

### Règles

- ✅ Le thème suit la préférence OS du visiteur (`defaultTheme="system"`) — approche inclusive et respectueuse, pas de surprise pour les visiteurs non-dev
- ✅ Le toggle dark/light est accessible depuis la navbar pour permettre de forcer un mode
- ✅ Le design doit fonctionner aussi bien en light qu'en dark (pas optimisé pour un seul mode)
- ✅ Toutes les couleurs passent par les tokens CSS variables : un seul endroit à modifier par mode

---

# 📦 Librairies UI

## Outils & Discovery

### Mécanismes disponibles

| Type | Outil / Ressource | Usage |
|------|-------------------|-------|
| CLI | `pnpm dlx shadcn@latest` | Point d'entrée unifié discovery / audit / install pour les 3 registries. Détail des commandes dans le skill shadcn. |
| Skill | `.claude/skills/shadcn/` | Skill officiel shadcn auto-chargé : CLI reference complète, critical rules de composition, patterns officiels. Remplace la redocumentation locale des commandes CLI |

### Configuration projet

Voir `components.json` (racine projet) pour la déclaration des registries / namespaces. Installation via syntaxe namespace : `pnpm dlx shadcn@latest add @magicui/<component>`, `@aceternity/<component>`, `@shadcn/<component>`.

## Stack UI

| Librairie | Rôle | Périmètre |
|-----------|------|-----------|
| shadcn/ui | Composants fonctionnels (Radix UI + Tailwind) | Boutons, forms, modales, navigation, cards, tables — toute l'UI fonctionnelle |
| Magic UI | Effets visuels copy-paste | Enrichissements marketing : text effects, typographie animée, bento grid, marquee, particles, borders animés |
| Aceternity UI | Effets visuels copy-paste | Effets hero premium : MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams, Background Ripple Effect |
| Tailwind CSS | Styling utilitaire | Tout le styling, composition de classes |
| `@tailwindcss/typography` | Rendu markdown (plugin Tailwind) | Classes `prose` appliquées sur le markdown des case studies (`prose prose-lg dark:prose-invert max-w-none`). Chargé via `@plugin` dans `globals.css` |

> Magic UI et Aceternity UI sont **réservés aux surfaces marketing** du site public. Le dashboard admin (post-MVP) utilise shadcn/ui seul.

### Convention de structure

Chaque lib UI a son sous-dossier dans `src/components/` pour la séparation visuelle :

| Lib | Sous-dossier | Note |
|-----|--------------|------|
| shadcn/ui | `src/components/ui/` | Défaut shadcn CLI |
| Magic UI | `src/components/magicui/` | Défaut Magic UI |
| Aceternity UI | `src/components/aceternity/` | Défaut Aceternity = `ui/`, customisé via `-p src/components/aceternity` ou `aliases` dans `components.json` |

## Mapping Composants

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Navigation | Navbar, Mobile Menu | shadcn/ui (NavigationMenu, Sheet) | — |
| Language Switcher | DropdownMenu + icône Globe (Lucide) | shadcn/ui | Switch FR / EN dans navbar (Feature 6 i18n) |
| Theme Toggle | AnimatedThemeToggler | Magic UI + next-themes | Toggle dark/light animé dans navbar, morphing soleil/lune |
| Bouton CTA hero | ShimmerButton | Magic UI | Hero / landing uniquement, effet shimmer, max 1 par page |
| Boutons | Button (variants selon contexte) | shadcn/ui | default, outline, ghost, destructive, icon — variant choisi selon l'usage |
| Formulaires | Input, Textarea, Select | shadcn/ui | Formulaire contact |
| Cards services | Card service | shadcn/ui (Card) | Grille uniforme 3 colonnes, focus contenu textuel (landing + /services) |
| Cards projets | Card projet | Magic UI (BentoCard) | Showcase visuel dans BentoGrid asymétrique (landing + /projects) |
| Filtres projets | Tabs custom minimaliste (boutons HTML + sémantique ARIA) | shadcn/ui tokens | Filtres client / personnel / tous sur `/projets`. Tabs custom avec `role="tablist"` + `role="tab"` + `aria-selected` (requis pour les tests Testing Library). Style via tokens Tailwind (`border-primary`, `text-muted-foreground`). Aceternity Tabs pas installé en MVP |
| Badges Tag (technos/infra/outils/expertises) | Badge + Simple Icons / Lucide | shadcn/ui + @icons-pack/react-simple-icons + lucide-react | Tags projets avec icône : Simple Icons pour technos/infra/outils (ex: React, Python, Docker) ou Lucide pour expertises (ex: Scraping, RAG, MCP). `variant="secondary"` par défaut. Délégation du renderer d'icône selon le préfixe `tag.icon` (`"simple-icons:*"` ou `"lucide:*"`) |
| Badges Format (type de projet) | Badge sans icône | shadcn/ui | Types de projet (API, Web App, App Mobile, Desktop App, CLI, IA) affichés à côté ou sous le titre (card + case study). `variant="outline"` pour distinguer visuellement des Tags (étiquette catégorique, pas de glyphe). Valeur en texte uniquement |
| Feedback | Toast, Alert | shadcn/ui (Sonner, Alert) | Confirmation formulaire |
| Modales | Dialog, Sheet | shadcn/ui (Dialog, Sheet) | — |
| Hero effects | MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams, Background Ripple Effect | Aceternity UI | Effets hero premium, sections clés uniquement (MacbookScroll = showcase projet dev principal, Background Ripple Effect = fond interactif hero/CTA — grille de cellules qui ripplent au clic) |
| Formulaire contact | Form shadcn pur (Card + Input + Textarea + Button + Label) | shadcn/ui | Layout 2 cols (form / Calendly + réseaux) reconstruit en shadcn sans bloc Aceternity PRO. UI livrée par Feature 1 sub 04, logique métier (Zod + Server Action + SMTP + rate limiting) par Feature 4 |
| Effets visuels enrichis | Border Beam, Shine Border, Particles, Meteors, Magic Card | Magic UI | Enrichissement visuel des sections marketing |
| Typographie display | Hyper Text, Text Reveal, Word Rotate | Magic UI | Effets textes animés sur surfaces marketing (tagline hero scrambled, CTAs rotation de mots, reveal au scroll) |
| Typographie display (alt) | Text Generate Effect, Flip Words | Aceternity UI | Alternatives premium pour génération de texte (style IA) ou flip de phrases sur sections clés |
| Number Ticker | NumberTicker | Magic UI | Chiffres clés animés sur /a-propos (années d'expérience, projets livrés, etc.) |
| Bento Grid | BentoGrid + BentoCard | Magic UI | Grille asymétrique pour les cards projets (landing + /projects) |
| Marquee | Marquee | Magic UI | Défilement horizontal (logos techs, clients, projets) |

## États des Composants

> Les composants shadcn/ui, Magic UI et Aceternity UI (Button, BentoCard, MacbookScroll, ShimmerButton, etc.) ont leurs états et animations **intégrés**. Les guidelines ci-dessous s'appliquent uniquement aux composants **custom** non-lib créés from scratch.

| État | Style / Comportement | Contexte |
|------|---------------------|----------|
| Hover (cards custom) | Léger scale `1.02` + shadow-md + transition `200ms ease-out` | Cards custom uniquement |
| Hover (liens custom) | Underline + transition couleur `150ms` | Liens hors composants shadcn |
| Loading | Skeleton pulse (`animate-pulse`) | Chargement de contenu dynamique (projets, etc.) |

---

# 🖼️ Icônes

**Librairie UI** : `Lucide React` (incluse avec shadcn/ui)

**Librairie logos** : `Simple Icons` via `@icons-pack/react-simple-icons` (logos techs, frameworks, réseaux sociaux)

**Taille standard** : `20px` (icônes UI), `24px` (icônes standalone)

**Règles** :
- Lucide pour toutes les icônes d'interface (flèches, menu, settings, mail, etc.)
- Simple Icons pour les logos de marques et technologies (Python, React, Docker, LinkedIn, etc.)
- Style stroke uniquement (Lucide) : pas de mix stroke/fill
- Taille cohérente par contexte : `16px` inline, `20px` UI standard, `24px` standalone, `32px+` décoratif

---

# ✨ Animations & Motion

## Librairie(s)

| Librairie | Rôle | Périmètre |
|-----------|------|-----------|
| Motion (package `motion`, import `motion/react`) | Animations UI et transitions | Fade-in au scroll, transitions de page, hover states |
| Magic UI | Text effects et effets visuels enrichis | Text reveals, aurora text, border beam, particles — 2-3 effets max par page |
| Aceternity UI | Hero effects premium | MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams, Background Ripple Effect — hero / sections clés uniquement |

## Principes Directeurs

- **Intensité** : `subtile` — chaque animation a un but fonctionnel (guider l'attention, confirmer une action)
- **Durée standard** : `200-400ms`
- **Easing** : `ease-out` (entrées), `ease-in-out` (transitions)
- **Intention** : renforcer la sensation de qualité et de fluidité sans distraire. Le contenu prime sur l'effet.

## Composants Animés

> Ce tableau liste uniquement les animations **implémentées manuellement** (Motion, Tailwind transitions, CSS) sur des composants custom ou sur des composants shadcn non animés par défaut. Les composants Magic UI et Aceternity UI listés dans `§ Mapping Composants` (ShimmerButton, AnimatedThemeToggler, NumberTicker, MacbookScroll, Spotlight, Text Reveal, BentoCard, Marquee, Tabs, etc.) ont leurs animations **intégrées** et ne sont pas dupliqués ici.

| Composant | Type d'animation | Librairie | Trigger |
|-----------|-----------------|-----------|---------|
| Sections de page | Fade-in + léger slide-up | Motion | Scroll (viewport entry) |
| Cards custom | Scale + shadow au hover | Tailwind transitions | Hover |
| Boutons CTA standards | Défaut shadcn (`hover:bg-primary/90`) | Tailwind transitions | Hover |
| Navigation | Transition smooth underline | Tailwind transitions | Hover / Active |
| Page transitions | Fade cross-dissolve (expérimental — nécessite View Transitions API) | Motion | Route change |
| Badge "En cours" (indicateur live) | BorderBeam rotation bordure, `colorFrom=var(--shine)`, `duration=7s` | Magic UI | Always-on (signale les cards de projets actifs) |
| CTA "Voir la démo" (case study) | BorderBeam rotation bordure, `colorFrom=var(--shine)`, `duration=7s` | Magic UI | Always-on (mise en valeur du CTA principal, uniquement sur bouton démo, pas github) |

---

# 📐 Layout & Espacement

## Structure de Page

**Container** : `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` (1280px max, padding responsive)

**Section padding** : `py-16 sm:py-20 lg:py-24` (espacement vertical entre sections marketing)

**Spacing pages documentaires** : `space-y-12` (48px fixe) sur le wrapper interne — pour pages denses en lecture continue (mentions légales, politique de confidentialité, case studies projets). Rythme typographique plus serré que le marketing pour préserver le flux de lecture. Combiné avec `gap-6` interne pour les sections coded et `prose-h2:mt-12 prose-h2:mb-6` pour les sections markdown afin d'aligner sur le même rythme.

**Grid principal** : CSS Grid ou Flexbox selon le contexte, pas de librairie de grid externe

**Navbar** : sticky top, backdrop blur, contient Navbar + Mobile Menu + Language Switcher + Theme Toggle (voir Mapping Composants)

**Footer** : layout custom (pas de composant lib dédié), présent sur toutes les pages publiques. Contenu : logo/nom, navigation secondaire (Services, Projets, À propos, Contact), liens réseaux sociaux (Simple Icons), lien CV discret, copyright. Séparé du contenu par un `border-t border-border`.

## Responsive

> Approche : `mobile-first` (standard Tailwind CSS)

| Breakpoint | Notation Tailwind | Largeur | Changements clés |
|------------|-------------------|---------|------------------|
| Base | (défaut) | < 640px | Layout single column, navigation hamburger |
| sm | `sm:` | ≥ 640px | Ajustements mineurs de spacing |
| md | `md:` | ≥ 768px | Grids 2 colonnes, navigation desktop visible |
| lg | `lg:` | ≥ 1024px | Grids 3 colonnes, layout final desktop |
| xl | `xl:` | ≥ 1280px | Container max-width atteint, espacement final |

---

# 🔧 Conventions de Code

## Composition de Styles

**Utilitaire** : `cn()` (shadcn/ui) — wrapper autour de `clsx` + `tailwind-merge` pour composer les classes Tailwind sans conflit.

**Ordre d'application** : `layout → spacing → typography → colors → effects → responsive`

```typescript
// Exemple
<div className={cn(
  "flex flex-col gap-4",          // layout
  "p-6",                          // spacing
  "text-base font-medium",        // typography
  "bg-card text-card-foreground",  // colors
  "rounded-lg shadow-sm",         // effects
  "md:flex-row md:gap-8"          // responsive
)}>
```

## Règles

- ✅ **Tokens CSS** : utiliser les variables CSS (`bg-primary`, `text-muted-foreground`, etc.) au lieu de couleurs Tailwind brutes (`bg-green-600`)
- ✅ **`cn()` obligatoire** : toujours utiliser `cn()` pour composer les classes dans les composants React (permet le merge propre et l'override par props)
- ✅ **Composants shadcn** : toujours utiliser les composants shadcn/ui quand ils existent avant de créer un composant custom
- ✅ **Responsive** : écrire le style mobile d'abord, puis élargir avec `sm:`, `md:`, `lg:`
- ✅ **Liens sans underline** : distinction par couleur uniquement (ex: `hover:text-primary`), reset global dans `globals.css`

## Anti-Patterns

- ❌ **Couleurs en dur** : ne jamais utiliser `bg-green-600` ou `text-[#8FA68E]` — toujours passer par les tokens (`bg-primary`, `text-primary`)
- ❌ **CSS modules / styled-components** : tout le styling passe par Tailwind. Pas de fichiers CSS custom sauf cas exceptionnel (ex: animations keyframes complexes)
- ❌ **`!important`** : ne jamais utiliser `!important`. Si un style ne s'applique pas, corriger la cascade avec `cn()` ou revoir la structure du composant
- ❌ **Inline styles** : ne jamais utiliser `style={{}}` sauf pour des valeurs dynamiques calculées (ex: positions, dimensions variables)

---

# 🔗 Ressources

## Documentation Officielle
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Motion](https://motion.dev)
- [Lucide Icons](https://lucide.dev)
- [Simple Icons](https://simpleicons.org)
- [next-themes](https://github.com/pacocoursey/next-themes)

## Ressources Complémentaires
- [Magic UI](https://magicui.design) — effets visuels copy-paste (ADR-009)
- [Aceternity UI](https://ui.aceternity.com) — effets visuels copy-paste (ADR-009)
- [Radix UI](https://www.radix-ui.com) — primitives accessibles sous-jacentes à shadcn/ui
- [Geist Font](https://vercel.com/font) — polices Geist Sans et Geist Mono (Vercel)
- [Realtime Colors](https://www.realtimecolors.com) — visualisation palette en contexte réel
