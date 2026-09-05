---
title: "DESIGN — Thibaud Geisler Portfolio"
description: "Design system : typographie, couleurs, librairies UI, mapping composants et conventions de style."
date: "2026-09-05"
keywords: ["design", "ui", "design-system", "typography", "colors", "animations", "layout", "dark-mode", "icons", "components", "spacing", "admin", "dataviz"]
scope: ["docs", "frontend"]
technologies: ["Next.js", "Tailwind CSS", "shadcn/ui", "Magic UI", "Aceternity UI", "ReUI", "Motion", "next-intl"]
---

# 🎨 Identité Visuelle

## Typographie

### Police Principale

**Famille** : `Geist Sans`

**Source** : Google Fonts via `next/font/google`

**Usage** : corps de texte, UI générale, titres H2-H3, navigation, boutons

**Tokens** : `--font-sans`, plus `--font-heading` qui en est un alias hérité de shadcn, consommé par les titres de `Card` et de `Sheet`

### Police Display (Secondaire)

**Famille** : `Sansation`

**Source** : locale (`next/font/local`, fichier versionné avec les polices des images OG), `700` (Bold) uniquement. Volontairement pas `next/font/google` : la police est absente du jeu de métriques de Next, qui renonce alors au fallback ajusté

**Usage** : titres hero (H1), titres de cards des surfaces marketing, éléments de marque, logo, sections display marketing

**Tokens** : `--font-display`, exposé en classe `font-display`

### Police Monospace

**Famille** : `Geist Mono`

**Source** : Google Fonts via `next/font/google`

**Usage** : blocs de code, snippets techniques, éléments de stack technique, valeurs numériques (années de la timeline d'étude de cas)

**Tokens** : `--font-mono`, exposé en classe `font-mono`

### Scale Typographique

> Une seule taille signifie aucun palier responsive. Le cas échéant, le palier est indiqué à la suite.

| Usage | Taille | Poids | Classe Tailwind |
|-------|--------|-------|-----------------|
| H1 (display) | 2.25rem (36px), 3rem (48px) dès sm | 700 (Bold) | `font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl` |
| H1 hero (landing) | idem, plus 3.75rem (60px) dès lg | 700 (Bold) | `lg:text-6xl` en override local sur le seul H1 du hero, pour l'impact marketing |
| H2 | 1.875rem (30px), 2.25rem (36px) dès sm | 600 (SemiBold) | `text-3xl font-semibold tracking-tight text-balance sm:text-4xl` |
| H3 | 1.5rem (24px) | 600 (SemiBold) | `text-2xl font-semibold tracking-tight` |
| Lead (paragraphe d'accroche sous un H1) | 1.25rem (20px) | 400 (Regular) | `text-xl` : taglines du hero et de `/a-propos`, chapô d'étude de cas |
| Subtitle (en-tête de page, texte de section) | 1.125rem (18px) | 400 (Regular) | `text-lg` : sous-titres centrés de `PageShell`, CTA final |
| Body | 1rem (16px) | 400 (Regular) | `text-base` |
| Small / Caption | 0.875rem (14px) | 400 (Regular) | `text-sm` |
| Label (intitulé de section ou de donnée) | 0.875rem (14px) | 500 (Medium) | `text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground` : titres de cartes de stack, libellés de stats, libellé de signature de la landing, métadonnées et timeline d'étude de cas. Ajouter `text-balance` au-delà d'une dizaine de caractères, l'espacement large faisant vite déborder |
| Titre de card marketing | 1.5rem (24px) | 700 (Bold) | `font-display text-2xl font-bold tracking-normal` : cards services et projets. Taille fixe quel que soit le niveau du titre, d'où le `text-2xl` explicite |
| Display number (chiffre clé) | 3rem (48px), 3.75rem (60px) dès sm | 700 (Bold) | `font-display text-5xl font-bold text-primary sm:text-6xl` : chiffres des stats `/a-propos` |

> Les styles de base H1, H2 et H3 sont appliqués globalement via `@layer base` dans `globals.css` (mobile-first, palier `sm:` pour le desktop). Pas besoin de répéter ces classes sur chaque balise, sauf override ponctuel.

> `font-display` est appliquée par défaut sur H1 via `@layer base`, les autres niveaux utilisant Geist Sans.

> **Exceptions** : `font-display` s'ajoute aussi aux titres de cards marketing et aux H2 des sections de la landing, pour la cohérence éditoriale avec les H1 hero. Les H2 des autres pages, les pages de lecture (légales, case studies) et les pages internes (admin post-MVP, formulaires) gardent Geist Sans. Le `tracking-tight` de la base corrige l'impression de relâchement des grandes tailles : à 24px il étrangle, d'où le `tracking-normal` de la card marketing.

> **Le niveau d'un titre suit la structure de la page, jamais son apparence.** Une card marketing est un cran sous le titre qui la précède : H2 quand elle suit le H1 de la page (`/services`, `/projets`), H3 quand elle vit sous un H2 de section (accueil). `ServiceCard` et `ProjectCard` prennent donc un `headingLevel` de leur appelant, et gardent la même apparence dans les deux cas.

## Palette de Couleurs

### Tokens / Variables CSS

> Valeurs en **OKLCH**, format de `globals.css` (convention shadcn/ui + Tailwind CSS v4), pour qu'un écart entre doc et code se voie à la lecture. Les trois nombres sont clarté, saturation, teinte.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Fond de page |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte principal |
| `--primary` | `oklch(0.53 0.04 140)` | `oklch(0.68 0.03 140)` | CTA, accent principal (vert sauge) |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Texte sur primary |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Fond secondaire, identique à `--muted` |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Texte sur secondary |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Fond atténué |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Texte atténué, placeholders |
| `--accent` | `oklch(0.965 0.008 140)` | `oklch(0.28 0.03 140)` | Fond accent (teinte sauge très légère) |
| `--accent-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte sur accent |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Bordures |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Bordures inputs, plus contrastées que `--border` en dark |
| `--ring` | `oklch(0.53 0.04 140)` | `oklch(0.68 0.03 140)` | Focus ring (vert sauge) |
| `--destructive` | `oklch(0.53 0.16 25)` | `oklch(0.68 0.15 25)` | Erreurs, actions destructives. Rouge brique, cf. § Couleurs Sémantiques |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fond des cartes |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte des cartes |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fond des popovers |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte des popovers |

> Les huit `--sidebar-*` sont le scaffolding shadcn du composant Sidebar, non installé (post-MVP). `--chart-1` à `--chart-5` : voir § Palette dataviz.

### Couleurs Sémantiques

> ℹ️ Tokens custom, non générés par shadcn/ui. Chacun a son `-foreground` associé dans `globals.css`.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | `oklch(0.55 0.11 148)` | `oklch(0.72 0.11 148)` | Confirmation formulaire, actions réussies. Réservé (admin post-MVP) |
| `--warning` | `oklch(0.56 0.11 72)` | `oklch(0.76 0.11 72)` | Avertissements, états attention. Réservé (admin post-MVP) |
| `--info` | `oklch(0.52 0.07 250)` | `oklch(0.72 0.07 250)` | Messages informatifs, aide contextuelle. Ardoise, pas un bleu franc. Réservé (admin post-MVP) |
| `--shine` | `oklch(1 0 0 / 0.95)` | `oklch(1 0 0 / 0.95)` | Reflet lumineux constant (BorderBeam, effets shimmer), volontairement non-thémé pour conserver l'effet de brillance en dark mode. Uniquement sur des surfaces `bg-primary`, invisible sur une carte claire |

> Contraintes à tenir si l'un de ces tokens bouge ou si un cinquième s'ajoute : **chroma entre 0,11 et 0,16**, au-delà la couleur crie à côté d'un accent à 0,04 ; `--success` en teinte **148**, qui se confondrait avec `--primary` en 140 ; `--info-foreground` sombre en dark, l'ardoise y étant claire.

### Palette dataviz

> Cinq séries pour les graphiques de l'espace admin (`--chart-1` à `--chart-5`).

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--chart-1` | `oklch(0.42 0.05 140)` | `oklch(0.82 0.05 140)` | Première série, sauge profond. Réservé (admin post-MVP) |
| `--chart-2` | `oklch(0.62 0.045 140)` | `oklch(0.64 0.045 140)` | Deuxième série, sauge clair. Réservé (admin post-MVP) |
| `--chart-3` | `oklch(0.45 0.06 250)` | `oklch(0.8 0.06 250)` | Troisième série, ardoise profonde. Réservé (admin post-MVP) |
| `--chart-4` | `oklch(0.65 0.055 250)` | `oklch(0.62 0.06 250)` | Quatrième série, ardoise claire. Réservé (admin post-MVP) |
| `--chart-5` | `oklch(0.8 0 0)` | `oklch(0.48 0 0)` | Cinquième série, gris neutre. Réservé (admin post-MVP) |

**Sauge + ardoise** : deux clartés de sauge (teinte 140, celle de la marque), deux d'ardoise (teinte 250, celle de `--info`), un gris neutre pour fermer. Aucune teinte hors du système : une couleur inventée pour un graphique n'appartient à aucune partie de la marque. La teinte sépare les familles de séries, la clarté sépare à l'intérieur d'une famille.

**Règle d'attribution des couleurs de série, en trois branches** :

- Séries de **même nature** (CA par mois, parts d'un total, donut) : `--chart-1` à `--chart-5` **par position**, sans choix explicite
- Séries de **natures différentes** dans un même graphique (visites du site contre sessions du chatbot) : rampes **nommées** (`primary`, `info`), la teinte devant faire la distinction que la clarté seule ne fait pas
- La couleur **porte un sens** : rampe **sémantique** (`--destructive` pour un impayé, `--warning` pour un retard)

> Au-delà de cinq séries, regrouper la queue en « Autres ». Les aplats de graphique visent 3:1 sur le fond (WCAG 1.4.11, composants non textuels), pas les 4,5:1 exigés du texte.

### Règles

- ✅ Toujours référencer les couleurs par token CSS, jamais de valeur hex en dur dans les composants : un seul endroit à modifier par mode
- ✅ L'accent vert sauge est utilisé avec parcimonie : CTA, liens, hover states, éléments de marque. Pas de surfaces d'interface entièrement vertes. Les aplats des graphiques échappent à cette règle : ce sont des données, pas du chrome, et leur couleur est la seule chose qui distingue une série d'une autre.
- ✅ Privilégier le contraste : le texte principal doit toujours avoir un ratio WCAG AA minimum (4.5:1)
- ✅ Les gris neutres (`muted`, `border`) n'ont pas de teinte colorée : ils restent purement neutres pour renforcer l'impact du vert sauge quand il apparaît
- ✅ Une couleur garde sa teinte et son chroma entre light et dark : seule la clarté change, ce qui la maintient lisible sur son fond sans en faire une autre couleur

## Formes

### Border Radius

**Base** : `--radius: 0.625rem` (10px), les variants sont dérivées proportionnellement via `calc()` (multiplicateurs).

| Token | Valeur | Usage |
|-------|--------|-------|
| `--radius-xs` | `calc(var(--radius) * 0.2)` → 2px | Bouton de fermeture d'une modale. Réservé (admin post-MVP) |
| `--radius-sm` | `calc(var(--radius) * 0.6)` → 6px | Badges, tags, petits éléments |
| `--radius-md` | `calc(var(--radius) * 0.8)` → 8px | Boutons, inputs, éléments UI courants |
| `--radius-lg` | `var(--radius)` → 10px | Cards, conteneurs |
| `--radius-xl` | `calc(var(--radius) * 1.4)` → 14px | Sections, éléments larges |
| `--radius-2xl` | `calc(var(--radius) * 1.8)` → 18px | Conteneurs visuels marketing |
| `--radius-3xl` | `calc(var(--radius) * 2.2)` → 22px | Cards hero, blocs display. Réservé |
| `--radius-4xl` | `calc(var(--radius) * 2.6)` → 26px | Surfaces décoratives très arrondies. Réservé |

> Convention shadcn/ui : modifier uniquement `--radius` pour ajuster proportionnellement toute l'échelle. Style arrondi doux, moderne et accueillant.

### Ombres / Élévation

| Token | Valeur | Usage |
|-------|--------|-------|
| `shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Affordance de champ shadcn : `Checkbox`, `Switch`, `RadioGroup`, déclencheur de `Select`. Réservé (admin post-MVP) |
| `shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Repos des cards en grille |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Petits éléments cliquables au hover (pastilles), dropdowns et menus (valeur `radix-nova`) |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Panneau latéral du menu mobile |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | Cards au hover |

> Valeurs par défaut Tailwind CSS v4 (utilitaires renommés depuis v3 : `shadow-sm` → `shadow-xs`, `shadow` → `shadow-sm`). Les composants shadcn/ui utilisent des **bordures** (`--border`) par défaut, pas des ombres. Les ombres sont réservées aux composants custom ou aux effets de hover. En dark mode, privilégier les bordures et les différences de fond (`--card` vs `--background`) pour la hiérarchie visuelle.

## Dark / Light Mode

**Stratégie** : store maison `src/lib/theme.ts`. Pas `next-themes`, dont le thème reste périmé sous React 19 Activity

**Mécanisme** : CSS variables sur `:root` (light) et `.dark` (dark), classe posée sur `<html>` par le store `src/lib/theme.ts` (singleton `useSyncExternalStore` + script inline anti-FOUC). Tant que le visiteur n'a rien choisi, le mode se résout depuis `prefers-color-scheme`.

### Règles

- ✅ Le thème suit la préférence OS du visiteur tant qu'il n'a rien choisi, `'system'` étant la valeur de repli du store : approche inclusive, pas de surprise pour les visiteurs non-dev
- ✅ Le toggle dark/light est accessible depuis la navbar pour permettre de forcer un mode
- ✅ Le design doit fonctionner aussi bien en light qu'en dark (pas optimisé pour un seul mode)

---

# 📦 Librairies UI

## Outils & Discovery

### Mécanismes disponibles

| Type | Outil / Ressource | Usage |
|------|-------------------|-------|
| CLI | `pnpm dlx shadcn@latest` | Point d'entrée unifié discovery / audit / install pour tous les registries déclarés dans `components.json`. Détail des commandes dans le skill shadcn. |
| Skill | `.claude/skills/shadcn/` | Skill officiel shadcn auto-chargé : CLI reference complète, critical rules de composition, patterns officiels. Remplace la redocumentation locale des commandes CLI |

### Configuration projet

Voir `components.json` (racine projet) pour la déclaration des registries / namespaces. Installation via syntaxe namespace : `pnpm dlx shadcn@latest add @magicui/<component>`, `@aceternity/<component>`, `@shadcn/<component>`.

## Stack UI

| Librairie | Rôle | Périmètre |
|-----------|------|-----------|
| shadcn/ui | Composants fonctionnels (Radix UI + Tailwind) | Boutons, forms, modales, navigation, cards, tables, toute l'UI fonctionnelle. Style **`radix-nova`** (compact : contrôles à 32px, `rounded-lg`, padding 10px) |
| Magic UI | Effets visuels copy-paste | Enrichissements marketing : typographie animée, bento grid, marquee, bordure animée, bouton shimmer, bascule de thème |
| Aceternity UI | Effets visuels copy-paste | Effets hero premium. Installé : Background Ripple Effect seul, les candidats étant listés en § Mapping Composants > Post-MVP |
| ReUI | Composants absents du registry shadcn | Post-MVP admin, `EventCalendar` uniquement. Registry compatible shadcn CLI, à déclarer dans `components.json` (`@reui` → `https://reui.io/r/{style}/{name}.json`) |
| Tailwind CSS | Styling utilitaire | Tout le styling, composition de classes |
| `@tailwindcss/typography` | Rendu markdown (plugin Tailwind) | Classes `prose` appliquées sur le markdown des case studies et des pages légales (`prose dark:prose-invert max-w-none`). Chargé via `@plugin` dans `globals.css` |

> Magic UI et Aceternity UI sont **réservés aux surfaces marketing** du site public. L'espace admin (post-MVP) utilise shadcn/ui, à une exception près : `EventCalendar`, que le registry shadcn n'a pas.

### Style shadcn

`components.json` déclare **`radix-nova`**, appliqué à tout le projet : site public et espace admin partagent `src/components/ui/`. Ce style a été retenu pour sa compacité, qui sert la densité d'écran d'un espace admin sans desservir les pages marketing. Les autres styles du système `{base}-{style}` (`vega`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`, plus l'ancien `new-york`) restent disponibles, mais **changer de style impose de réinstaller tous les composants** : les hauteurs, rayons et paddings diffèrent, et un projet à moitié migré devient visuellement incohérent. Le choix de shadcn/ui lui-même, face à du custom, est arbitré par [ADR-009](adrs/009-ui-system.md). Commandes CLI et pièges : `.claude/rules/shadcn-ui/setup.md`.

### Consentement cookies (CMP)

Le site utilise **`@c15t/nextjs`** comme Consent Management Platform : bandeau de consentement cookies (RGPD), gating du widget Calendly tant que les cookies marketing ne sont pas acceptés, bouton "Préférences cookies" dans le footer. Voir [knowledges/c15t.md](knowledges/c15t.md) pour le détail d'intégration. Le styling du banner et de la modale de préférences hérite des tokens CSS du design system (couleurs, radius, typo) pour rester cohérent avec le reste de l'UI.

### Convention de structure

Chaque lib UI a son sous-dossier dans `src/components/` pour la séparation visuelle :

| Lib | Sous-dossier | Note |
|-----|--------------|------|
| shadcn/ui | `src/components/ui/` | Défaut shadcn CLI |
| Magic UI | `src/components/magicui/` | Défaut Magic UI |
| Aceternity UI | `src/components/aceternity/` | Défaut Aceternity = `ui/`, customisé via `-p src/components/aceternity` ou `aliases` dans `components.json` |
| ReUI | `src/components/reui/` | Post-MVP, même principe que les deux précédents |

## Mapping Composants

> Une section par famille d'usage. Les composants **post-MVP** vivent dans la dernière section et rejoignent leur famille au moment de leur installation ; la section disparaît quand elle se vide.

### Navigation

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Navbar | Navbar, Mobile Menu | nav custom + shadcn/ui (Sheet) | `sticky top-0` + `backdrop-blur` + `border-b border-border`, contient logo, liens, sélecteur de langue et bascule de thème. Liens plats en `ul`/`li` avec état actif via `usePathname`, NavigationMenu écarté (pensé pour des menus à sous-panneaux). Sheet pour le menu mobile |
| Footer | Footer | composant maison | Layout custom sur toutes les pages publiques, séparé du contenu par un `border-t border-border`. Contient logo, tagline, localisation, réseaux sociaux, lien CV, copyright et navigation légale (mentions, confidentialité, cookies) |
| Language Switcher | DropdownMenu + icône Globe (Lucide) + drapeaux (`country-flag-icons`) | shadcn/ui | Switch FR / EN dans la navbar, locale courante en `font-semibold` |
| Theme Toggle | AnimatedThemeToggler | Magic UI + store `src/lib/theme.ts` | Toggle dark/light animé dans navbar, morphing soleil/lune |
| Filtres projets | Tabs custom minimaliste (boutons HTML + sémantique ARIA) | shadcn/ui tokens | Filtres client / personnel / tous sur `/projets`. Tabs custom avec `role="tablist"` + `role="tab"` + `aria-selected` (requis pour les tests Testing Library). Style via tokens Tailwind (`border-primary`, `text-muted-foreground`) |
| Onglets contact | Tabs | shadcn/ui (Radix) | Bascule formulaire / Calendly sur `/contact`. L'onglet Calendly est monté en `forceMount` et masqué en CSS, pour que le widget ne se réinitialise pas à chaque bascule ; la `key={pathname}` remet l'onglet par défaut au changement de locale |

### Actions

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Boutons | Button | shadcn/ui | Variants `default`, `outline`, `ghost`, `secondary`, `destructive`, `link` ; taille `icon` pour les boutons à glyphe seul. `destructive` est une teinte `destructive/10` avec texte `--destructive`, pas un aplat rouge |
| Bouton CTA hero | ShimmerButton | Magic UI | Hero de la landing uniquement, effet shimmer sur `--shine` |
| Téléchargement CV | DownloadCvButton | composant maison (Button) | Navbar, footer et `/a-propos`, en `variant="outline" size="sm"` dans les deux premiers |

### Formulaires

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Champs | Input, Textarea, Label | shadcn/ui | Formulaire contact |
| Formulaire contact | Card + Input + Textarea + Button + Label | shadcn/ui | Layout 2 colonnes (formulaire / Calendly + réseaux), sans abstraction Form : validation Zod dans la Server Action, erreurs de champ en `text-sm text-destructive` sous l'input, confirmation par toast |

### Cards et grilles

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Cards services | Card | shadcn/ui | Grille uniforme 3 colonnes, focus contenu textuel (landing + /services) |
| Cards projets | BentoCard | Magic UI | Showcase visuel dans BentoGrid (landing + /projects) |
| Bento Grid | BentoGrid + BentoCard | Magic UI | Grille asymétrique et son conteneur : cards projets (landing + /projects) et stack `/a-propos`. Conteneur visuel seul (`rounded-lg`, bordure, `shadow-sm`), l'affordance de survol vivant sur l'élément cliquable |
| Tables de données | Table | shadcn/ui | Tri, filtrage et pagination en état local React, sans librairie de table à cette volumétrie |

### Badges

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Badges Tag (technos/infra/outils/expertises) | TagBadge | shadcn/ui + @icons-pack/react-simple-icons + lucide-react | `variant="secondary"` + `border-border` portée par le CVA comme pour les badges meta, casse normale (noms de marque). Simple Icons pour technos/infra/outils, Lucide pour expertises, renderer choisi selon le préfixe `tag.icon` (`"simple-icons:*"` ou `"lucide:*"`). Cards projets, case studies et stack `/a-propos` |
| Badges Meta (format, entreprise, compteur, statut) | Badge, prop `meta` | shadcn/ui | Type de projet (API, Web App…), entreprise avec logo, compteur de tags, statut "En cours". `meta` applique `uppercase tracking-wider` ; `variant="outline"`, `default` pour un état unique mis en avant |

### Feedback et chargement

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Feedback | Toast | shadcn/ui (Sonner) | Confirmation formulaire |
| Chargement | Skeleton, StackedSkeleton | shadcn/ui + composant maison | `StackedSkeleton` empile des `Skeleton` aux hauteurs passées en props. Utilisé en fallback de `<Suspense>` sur la page case study et dans son `loading.tsx` |

### Overlays

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Panneau latéral | Sheet | shadcn/ui | Menu mobile |

### Contenu et texte

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Paragraphe d'accroche | LeadParagraph | composant maison | Filet `border-l-2 border-primary/60` + `pl-5` sur la tagline `/a-propos` et le chapô d'étude de cas |
| Texte à libellé | LabeledText | composant maison | Met en gras le libellé d'un paragraphe traduit jusqu'aux deux-points, au-delà de 30 caractères le texte est rendu tel quel. Utilisé sur `/a-propos`, où le gras vit dans le composant plutôt que dans les fichiers de traduction |
| Typographie display | HyperText, WordRotate | Magic UI | Effets textes animés sur surfaces marketing (tagline hero scrambled, CTAs rotation de mots) |
| Number Ticker | NumberTicker | Magic UI | Chiffres clés animés sur /a-propos (années d'expérience, projets livrés, etc.) |
| Marquee | Marquee | Magic UI | Bande de logos de la stack qui défile sous le CTA final de la landing, avec fondu sur les bords |
| Rendu markdown | MarkdownContent | composant maison (`@tailwindcss/typography`) | Case studies et pages légales, classes `prose` et overrides `prose-h2` / `prose-h3` alignés sur la scale |

### Effets visuels

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Hero effects | Background Ripple Effect | Aceternity UI | Fond interactif hero/CTA, grille de cellules qui ripplent au clic |
| Effets visuels enrichis | Border Beam | Magic UI | Enrichissement visuel des surfaces marketing, always-on sur 3 emplacements (badge "En cours", CTA démo, card service mise en avant) |
| Entrée au scroll | MotionItem | composant maison (`IntersectionObserver`) | Props `index` (rang dans la rangée) et `className` : inséré dans une grille il en devient l'élément, les classes du parent (`col-span`, `h-full`) doivent lui être portées |

### Identité

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Logo | BrandLogo | composant maison (`next/image`) | Navbar, footer et menu mobile, variante claire ou sombre selon le thème |
| Réseaux sociaux | SocialLinks | composant maison (Simple Icons + Lucide) | Pastilles de 36px en navbar mobile, footer et `/contact` |
| Localisation | LocationLine | composant maison (`country-flag-icons`) | Drapeaux FR et LU, footer et `/contact` |

### Post-MVP (non installés)

> Chaque entrée rejoint sa famille ci-dessus au moment de son installation.

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Navigation admin | Sidebar | shadcn/ui | Repliable, gère le mobile nativement |
| Navigation dans les listes | Breadcrumb, Pagination | shadcn/ui | Leur ajouter une prop `size` (`default` / `sm`), que le registry n'a pas : sous une table dont les boutons d'action sont à 28px, un pager à 32px pèse trop |
| Barre d'outils de liste | Input + Button + Popover + Checkbox | shadcn/ui | Recherche, puis un seul bouton `outline` ouvrant tous les filtres en Popover, compteur d'actifs en `Badge`. Multi-sélection par axe appliquée au clic, pas d'option « Tous », compteurs facettés, ligne récapitulative sous la barre |
| En-tête de colonne triable | Button `ghost` dans le `th` | shadcn/ui | Cycle croissant, décroissant, ordre d'affichage ; `aria-sort` sur le bouton. Glisser-déposer désactivé dès qu'un tri ou un filtre est actif |
| Formulaires admin | Select, Switch, Checkbox, RadioGroup | shadcn/ui | `useActionState` (React 19) sur une Server Action validée par Zod, comme le formulaire de contact. `Checkbox` plutôt qu'une case native : l'état indéterminé du « tout sélectionner » d'un tableau ne se rend pas autrement |
| Champ de recherche | Combobox (Popover + Command) | shadcn/ui | Composition, pas un composant du registry. Registre de tags, liste d'entreprises : là où taper vaut mieux que dérouler. Hérite du contournement de `Command` |
| Panneau contextuel | Popover | shadcn/ui | Ancré sur son déclencheur, `align="end"` sous une barre d'outils. Seul (filtres d'une liste) ou en composition (Combobox, sélecteur de date) |
| Sélecteur de date | Popover + Calendar | shadcn/ui | Dates de facture, d'échéance, de mission |
| Agenda mensuel | EventCalendar | ReUI | Registry `@reui` à déclarer dans `components.json`, même CLI. Vue mois ; ne persiste rien, `onEventUpdate` à brancher sur Prisma |
| Feedback | Alert | shadcn/ui | Avis persistant en tête d'écran. Les erreurs de champ d'un formulaire restent un `<p className="text-sm text-destructive">` sous l'input |
| Modales | Dialog, AlertDialog | shadcn/ui | `AlertDialog` pour la confirmation avant suppression |
| Palette de commandes | Command | shadcn/ui | État sélectionné incorrect en `radix-nova`, issue [#9228](https://github.com/shadcn-ui/ui/issues/9228) ouverte au 29/08/2026. Contournable en pilotant la coche soi-même plutôt que par cmdk |
| Graphiques | Chart | shadcn/ui (Recharts) | Audience, indicateurs CRM, chiffre d'affaires. Couleurs de série : voir § Palette dataviz |
| Indicateur circulaire | ProgressCircle | composant maison (conventions Tremor) | Anneau à valeur unique (budget consommé, taux de remplissage), métrique à côté. SVG maison, pas une dépendance |
| Primitifs d'interface | Tooltip, Separator, ScrollArea, Avatar, Collapsible | shadcn/ui | - |
| Effets hero | MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams | Aceternity UI | Candidats |
| Effets visuels | Shine Border, Particles, Meteors, Magic Card | Magic UI | Candidats |
| Typographie display | Text Reveal | Magic UI | Candidat (au scroll) |
| Typographie display (alt) | Text Generate Effect, Flip Words | Aceternity UI | Candidats |

## États des Composants

> Les composants shadcn/ui, Magic UI et Aceternity UI (Button, BentoCard, ShimmerButton, etc.) ont leurs états et animations **intégrés**. Les guidelines ci-dessous s'appliquent uniquement aux composants **custom** non-lib créés from scratch.

| État | Style / Comportement | Contexte |
|------|---------------------|----------|
| Hover (surfaces cliquables custom) | Léger scale `1.01` + ombre + transition `300ms ease-out` | Cards (`shadow-xl`) et petits éléments type pastille (`shadow-md`) |
| Hover (surfaces custom non cliquables) | Contour porté à `primary/40`, transition `300ms ease-out` | Cards services et tuiles de stack : le contour se colore, la surface reste en place, l'action vivant dans le bouton de la card |
| Hover (liens d'interface) | Transition couleur `150ms` vers `text-primary` | Nav, liens hors composants shadcn |
| Actif (lien de navigation) | `font-semibold text-primary` ; `font-semibold` seul dans le sélecteur de langue, où la couleur marquerait un lien | Item de la navbar correspondant à la route courante, locale courante du sélecteur |
| Loading | Skeleton pulse (`animate-pulse`) | Chargement de contenu dynamique (projets, etc.) |

---

# 🖼️ Icônes

**Librairie UI** : `Lucide React` (incluse avec shadcn/ui)

**Librairie logos** : `Simple Icons` via `@icons-pack/react-simple-icons` (logos techs, frameworks, réseaux sociaux)

**Librairie drapeaux** : `country-flag-icons` (sélecteur de langue, ligne de localisation)

**Règles** :
- Lucide pour toutes les icônes d'interface (flèches, menu, settings, mail, etc.)
- Simple Icons pour les logos de marques et technologies (Python, React, Docker, LinkedIn, etc.)
- `country-flag-icons` pour les drapeaux, que ni Lucide ni Simple Icons ne fournissent
- LinkedIn en SVG inline dans `src/lib/icons.tsx`, Simple Icons ayant retiré ce logo pour raisons de licence
- Style stroke uniquement (Lucide) : pas de mix stroke/fill
- Taille cohérente par contexte : `16px` inline, `20px` UI standard, `24px` standalone, `32px+` décoratif
- Une icône inscrite dans un conteneur se dimensionne par rapport à lui et sort de cette grille : `12px` dans un badge, imposé par `Badge` via `[&>svg]:size-3!`

---

# ✨ Animations & Motion

## Librairie(s)

| Librairie | Rôle | Périmètre |
|-----------|------|-----------|
| Motion (package `motion`, import `motion/react`) | Moteur d'animation sous-jacent des composants Magic UI | Jamais appelé directement dans le code applicatif |
| Magic UI | Text effects et effets visuels enrichis | HyperText, WordRotate, NumberTicker, Marquee, BorderBeam, ShimmerButton, AnimatedThemeToggler |
| Aceternity UI | Hero effects premium | Background Ripple Effect, hero / sections clés |

## Principes Directeurs

- **Intensité** : `subtile`, chaque animation a un but fonctionnel (guider l'attention, confirmer une action)
- **Durée standard** : `200-400ms` pour tout ce qui déplace ou fait apparaître ; `150ms` pour les micro-transitions de couleur seule, défaut Tailwind
- **Easing** : `ease-out` (entrées), `ease-in-out` (transitions)
- **Intention** : renforcer la sensation de qualité et de fluidité sans distraire. Le contenu prime sur l'effet : 2 à 3 effets Magic UI par page au plus, un seul ShimmerButton
- **Périmètre** : les animations d'entrée au scroll sont réservées aux surfaces marketing (accueil, `/services`, `/projets`, `/a-propos`), les pages de lecture continue et le formulaire de contact affichant leur contenu directement
- **Accessibilité** : `prefers-reduced-motion` est respecté (hook maison de `MotionItem` sur `matchMedia`, et `@media` dans `globals.css`), le contenu s'affiche alors sans fondu ni délai

## Composants Animés

> Ce tableau liste uniquement les animations **implémentées manuellement** (Motion, Tailwind transitions, CSS) sur des composants custom ou sur des composants shadcn non animés par défaut. Les composants Magic UI et Aceternity UI du tableau ci-dessus ont leurs animations **intégrées** et ne sont pas dupliqués ici. `BorderBeam` fait exception : l'animation vient de la lib, mais ses emplacements et ses paramètres sont une décision projet, donc documentés ci-dessous. Les transitions de survol et d'état actif vivent en § États des Composants, pas ici.

| Composant | Type d'animation | Librairie | Trigger |
|-----------|-----------------|-----------|---------|
| Sections marketing | Fade-in + slide-up 20px, `400ms ease-out` | CSS + IntersectionObserver (`MotionItem`) | Scroll (viewport entry à 20%) |
| Cards en grille | Idem, en cascade `100ms` par colonne (`index % colonnes`, plafonnée à une rangée) | CSS + IntersectionObserver (`MotionItem`) | Scroll (viewport entry à 20%) |
| Page transitions | Fondu croisé `200ms`, `ease-in-out` en sortie et `ease-out` en entrée | React `ViewTransition` | Changement de route. Porté par `PageShell` pour les pages qui l'utilisent, et par la landing pour elle-même |
| Badge "En cours" (indicateur live) | BorderBeam rotation bordure, `colorFrom=var(--shine)`, `duration=7s`, `size=30` | Magic UI | Always-on (signale les cards de projets actifs) |
| CTA "Voir la démo" (case study) | BorderBeam rotation bordure, `colorFrom=var(--shine)`, `duration=7s`, `size=40` | Magic UI | Always-on (mise en valeur du CTA principal, uniquement sur bouton démo, pas github) |
| Card service mise en avant | BorderBeam rotation bordure, `colorFrom=var(--primary)`, `duration=7s`, `size=80` | Magic UI | Always-on (une seule card par grille services, pilotée par `SERVICE_HIGHLIGHTS`) |

---

# 📐 Layout & Espacement

## Structure de Page

| Élément | Valeur | Usage |
|---------|--------|-------|
| Container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | 1280px max, padding responsive |
| Padding vertical de page | `py-8 lg:py-14` | porté par `PageShell` |
| Padding vertical du footer | `py-8 lg:py-12` | bloc principal ; barre légale en `py-6` |
| Espacement entre sections | `gap-16 sm:gap-20 lg:gap-24` | `PageShell`, toutes les pages sauf la landing |
| Espacement entre sections, landing | `gap-20 sm:gap-24 lg:gap-28` | rythme majoré d'un cran : la landing porte son propre `<main>` pour laisser le hero déborder du container, et applique celui-ci section par section |
| Spacing pages documentaires | `space-y-12` sur le wrapper, `gap-6` entre sections coded, `prose-h2:mt-12 prose-h2:mb-6` sur le markdown | rythme serré pour la lecture continue (légales, case studies) |
| Rythme interne d'une section | `gap` uniforme, doublé avant un bloc d'un autre registre | CTA final : 32px entre titre, sous-titre et bouton, 64px avant la bande stack |
| Grid principal | CSS Grid ou Flexbox | selon le contexte, pas de librairie de grid externe |
| Container admin | pleine largeur moins la sidebar | post-MVP, sans `max-w-7xl` centré |
| Espacement entre sections, admin | `py-6` à `py-8` | post-MVP, la densité prime sur le souffle |

## Responsive

> Approche : `mobile-first` (standard Tailwind CSS)

> L'espace admin y est soumis au même titre que les pages publiques : tables, kanban et formulaires se conçoivent mobile-first, l'outil devant rester utilisable au téléphone.

| Breakpoint | Notation Tailwind | Largeur | Changements clés |
|------------|-------------------|---------|------------------|
| Base | (défaut) | < 640px | Layout single column, navigation hamburger. Deux colonnes admises pour un bloc de contenu court (footer) |
| sm | `sm:` | ≥ 640px | Ajustements mineurs de spacing |
| md | `md:` | ≥ 768px | Grids 2 colonnes, navigation desktop visible |
| lg | `lg:` | ≥ 1024px | Grids 3 colonnes, layout final desktop |
| xl | `xl:` | ≥ 1280px | Container max-width atteint, espacement final |

---

# 🔧 Conventions de Code

## Composition de Styles

**Utilitaire** : `cn()` (shadcn/ui), wrapper autour de `clsx` + `tailwind-merge` pour composer les classes Tailwind sans conflit.

**Ordre d'application** : `layout → spacing → typography → colors → effects → responsive`

```typescript
// Exemple
<div className={cn(
  "flex flex-col gap-4",          // layout
  "p-6",                          // spacing
  "text-base font-medium",        // typography
  "bg-card text-card-foreground", // colors
  "rounded-lg shadow-sm",         // effects
  "md:flex-row md:gap-8"          // responsive
)}>
```

## Règles

- ✅ **`cn()` obligatoire** : toujours utiliser `cn()` pour composer les classes dans les composants React (permet le merge propre et l'override par props)
- ✅ **Composants shadcn** : toujours utiliser les composants shadcn/ui quand ils existent avant de créer un composant custom
- ✅ **Responsive** : écrire le style mobile d'abord, puis élargir avec `sm:`, `md:`, `lg:`
- ✅ **Liens** : les liens de contenu (paragraphe, liste, définition) portent `text-primary underline underline-offset-2` en permanence (WCAG 1.4.1, la couleur seule tombe à 1:1 sur `text-muted-foreground`). Les liens d'interface (nav, CTA, boutons, cards) se distinguent par la couleur (`hover:text-primary`), sur le reset global de `globals.css`

## Anti-Patterns

- ❌ **Couleurs en dur** : ne jamais utiliser `bg-green-600` ou `text-[#8FA68E]`, toujours passer par les tokens (`bg-primary`, `text-primary`)
- ❌ **CSS modules / styled-components** : tout le styling passe par Tailwind. Pas de fichiers CSS custom sauf cas exceptionnel (ex: animations keyframes complexes)
- ❌ **`!important`** : ne jamais utiliser `!important`. Si un style ne s'applique pas, corriger la cascade avec `cn()` ou revoir la structure du composant
- ❌ **Inline styles** : ne jamais utiliser `style={{}}` sauf pour des valeurs dynamiques calculées (ex: positions, dimensions variables)
- ❌ **Deux styles shadcn dans le même projet** : `components.json` ne porte qu'une valeur `style`, site public et admin partagent `src/components/ui/`. Maintenir deux jeux de composants pour différencier les surfaces est une sur-ingénierie

> **Exceptions admises**, hors du code applicatif : les composants vendored (shadcn, Magic UI, Aceternity) gardent leurs valeurs d'origine, un `shadcn add --overwrite` les rétablirait ; le template OG passe par Satori, qui ne résout ni les variables CSS ni les classes ; le store de thème injecte un `transition: none !important` éphémère le temps de la bascule.

---

# 🔗 Ressources

## Documentation Officielle
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Motion](https://motion.dev)
- [Lucide Icons](https://lucide.dev)
- [Simple Icons](https://simpleicons.org)
- [country-flag-icons](https://catamphetamine.gitlab.io/country-flag-icons/)

## Ressources Complémentaires
- [Magic UI](https://magicui.design) : effets visuels copy-paste (ADR-009)
- [Aceternity UI](https://ui.aceternity.com) : effets visuels copy-paste (ADR-009)
- [ReUI](https://reui.io) : registry compatible shadcn CLI, `EventCalendar` pour l'agenda admin (post-MVP)
- [Radix UI](https://www.radix-ui.com) : primitives accessibles sous-jacentes à shadcn/ui
- [Geist Font](https://vercel.com/font) : polices Geist Sans et Geist Mono (Vercel)
- [Sansation](https://fonts.google.com/specimen/Sansation) : police display, par Bernd Montag, sous licence OFL
- [Realtime Colors](https://www.realtimecolors.com) : visualisation palette en contexte réel
