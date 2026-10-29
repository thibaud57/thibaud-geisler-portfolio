---
title: "DESIGN - Thibaud Geisler Portfolio"
description: "Design system : typographie, couleurs, librairies UI, mapping composants et conventions de style."
date: "2026-10-29"
keywords: ["design", "ui", "design-system", "typography", "colors", "animations", "layout", "dark-mode", "icons", "components", "spacing", "admin", "dataviz"]
scope: ["docs", "frontend"]
technologies: ["Next.js", "Tailwind CSS", "shadcn/ui", "Magic UI", "Aceternity UI", "ReUI", "Tiptap", "Motion", "next-intl"]
---

# 🎨 Identité Visuelle

## Typographie

### Police Principale

**Famille** : `Geist Sans`

**Source** : Google Fonts via `next/font/google`

**Usage** : corps de texte, UI générale, titres H2-H3, navigation, boutons

**Tokens** : `--font-sans`, plus `--font-heading` qui en est un alias hérité de shadcn, consommé par les titres de `Card`, `Sheet`, `Dialog`, `AlertDialog` et `Empty`

### Police Display (Secondaire)

**Famille** : `Sansation`

**Source** : locale (`next/font/local`, fichier partagé avec les images OG), `700` (Bold) uniquement

**Usage** : titres hero (H1), titres de cards des surfaces marketing, éléments de marque, logo, sections display marketing

**Tokens** : `--font-display`, exposé en classe `font-display`

### Police Monospace

**Famille** : `Geist Mono`

**Source** : Google Fonts via `next/font/google`

**Usage** : blocs de code, mois court et année aux deux bouts de la frise d'étude de cas (« janv. 2026 », « Jan 2026 »), la durée restant dans la grille de métadonnées, identifiants de l'admin (slug, colonne `#`, rang d'un tag, clé d'icône, dossier sous un aperçu d'asset)

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
| Libellé de champ | 0.875rem (14px) | 500 (Medium) | `text-sm font-medium` : `Label` d'un formulaire, libellé d'une ligne de vue détail, titre de la barre supérieure admin, titre d'un état vide |
| Aide et méta | 0.75rem (12px) | 400 (Regular) | `text-xs` en `text-muted-foreground` : aide persistante d'un champ, sous-titre de la première colonne d'une liste, date ou chiffre à droite d'une ligne de fiche rattachée, barre légale du footer |
| Compteur et rang | 10px | 500 (Medium) | `text-[10px]` : compteur d'un bouton de barre d'outils (`COUNTER_BADGE_CLASS`), rang d'un tag réordonnable en préfixe de son badge, en mono, sans pastille |
| Label (intitulé de section ou de donnée) | 0.875rem (14px) | 500 (Medium) | `text-sm font-medium tracking-[0.25em] text-muted-foreground uppercase` : stack, stats, signature de la landing, métadonnées d'étude de cas, sections de la sidebar admin, titres de bloc (`TitledBlock`). En `text-xs` sur les mois d'une liste de fiches rattachées et les colonnes du kanban. Constante `LABEL_CLASS`. Ajouter `text-balance` au-delà d'une dizaine de caractères, l'espacement large faisant vite déborder |
| Titre de card marketing | 1.5rem (24px) | 700 (Bold) | `font-display text-2xl font-bold tracking-normal` : cards services et projets. Taille fixe quel que soit le niveau du titre, d'où le `text-2xl` explicite |
| Display number (chiffre clé) | 3rem (48px), 3.75rem (60px) dès sm | 700 (Bold) | `font-display text-5xl font-bold text-primary sm:text-6xl` : chiffres des stats `/a-propos` |
| Titre d'écran (admin) | 1.5rem (24px) | 600 (SemiBold) | `font-sans text-2xl font-semibold tracking-tight` : `h1` d'`AdminPageShell`, des pages de formulaire, de la connexion et de l'écran d'accès refusé |
| Titre de modale | 1.125rem (18px) | 600 (SemiBold) | `text-lg font-semibold`, porté par `AlertDialogTitle` et par `DialogTitle`, qui y ajoute `leading-none` |
| Titre de card et de panneau | 1rem (16px) | 500 (Medium) | `text-base font-medium`, valeur du registry (`CardTitle`, `SheetTitle`) : cards des formulaires admin, raccourcis de l'accueil admin |
| Markdown admin | 1.125rem (18px) à 0.875rem (14px) | 600 (SemiBold) pour les titres | `ADMIN_MARKDOWN_CLASS` : `#` en `text-lg`, `##` en `text-base`, `###` en `text-sm`, texte en `text-sm`. Même échelle dans l'éditeur Détails et en lecture dans la vue détail |

> Les styles de base H1, H2 et H3 sont appliqués globalement via `@layer base` dans `globals.css` (mobile-first, palier `sm:` pour le desktop). Pas besoin de répéter ces classes sur chaque balise, sauf override ponctuel.

> `font-display` est appliquée par défaut sur H1 via `@layer base`, les autres niveaux utilisant Geist Sans.

> **Exceptions** : `font-display` s'ajoute aussi aux titres de cards marketing et aux H2 des sections de la landing, pour la cohérence éditoriale avec les H1 hero. Les H2 des autres pages, les pages de lecture (légales, case studies) et les pages internes (admin, formulaires) gardent Geist Sans. Le `tracking-tight` de la base corrige l'impression de relâchement des grandes tailles : à 24px il étrangle, d'où le `tracking-normal` de la card marketing.

> **Le niveau d'un titre suit la structure de la page, jamais son apparence.** Une card marketing est un cran sous le titre qui la précède : H2 quand elle suit le H1 de la page (`/services`, `/projets`), H3 quand elle vit sous un H2 de section (accueil). `ServiceCard` et `ProjectCard` prennent donc un `headingLevel` de leur appelant et gardent la même apparence dans les deux cas.

> **L'espace admin démarre un cran plus bas** : un titre d'écran de 48px pousserait la première ligne d'une liste dense sous la ligne de flottaison. Seule l'apparence descend, la balise suivant toujours la structure. Le poids reste 600, celui des titres d'écran et de modale ; les titres de card, de panneau et d'état vide gardent le 500 du registry, comme les libellés d'interface.

## Palette de Couleurs

### Tokens / Variables

> Valeurs en **OKLCH**, format de `globals.css` (convention shadcn/ui + Tailwind CSS v4), pour qu'un écart entre doc et code se voie à la lecture. Les trois nombres sont clarté, saturation, teinte.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Fond de page |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte principal |
| `--primary` | `oklch(0.53 0.04 140)` | `oklch(0.68 0.03 140)` | CTA, accent principal (vert sauge), filet d'un paragraphe d'accroche (`primary/60`), colonne Converti du kanban des actions |
| `--primary-foreground` | `oklch(1 0 0)` | `oklch(0.145 0 0)` | Texte sur primary |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Fond secondaire, identique à `--muted` |
| `--secondary-foreground` | `oklch(0.205 0 0)` | `oklch(0.985 0 0)` | Texte sur secondary |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` | Fond atténué |
| `--muted-foreground` | `oklch(0.556 0 0)` | `oklch(0.708 0 0)` | Texte atténué, placeholders, projet archivé, colonne À faire du kanban des actions |
| `--accent` | `oklch(0.965 0.008 140)` | `oklch(0.28 0.03 140)` | Fond accent (teinte sauge très légère), dégradé `primary/20 → accent/20` d'un aperçu ou d'un logo manquant |
| `--accent-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte sur accent |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` | Bordures |
| `--input` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 15%)` | Bordures inputs, plus contrastées que `--border` en dark |
| `--ring` | `oklch(0.53 0.04 140)` | `oklch(0.68 0.03 140)` | Focus ring (vert sauge) |
| `--destructive` | `oklch(0.53 0.16 25)` | `oklch(0.68 0.15 25)` | Erreurs, actions destructives, statuts négatifs (action ignorée, revue hebdo mauvaise). Rouge brique, cf. § Couleurs Sémantiques |
| `--card` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fond des cartes |
| `--card-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte des cartes |
| `--popover` | `oklch(1 0 0)` | `oklch(0.205 0 0)` | Fond des popovers |
| `--popover-foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` | Texte des popovers |
| `--chart-1` | `oklch(0.42 0.05 140)` | `oklch(0.82 0.05 140)` | Première série de graphique, sauge profond. Réservé |
| `--chart-2` | `oklch(0.62 0.045 140)` | `oklch(0.64 0.045 140)` | Deuxième série, sauge clair. Réservé |
| `--chart-3` | `oklch(0.45 0.06 250)` | `oklch(0.8 0.06 250)` | Troisième série, ardoise profonde. Réservé |
| `--chart-4` | `oklch(0.65 0.055 250)` | `oklch(0.62 0.06 250)` | Quatrième série, ardoise claire. Réservé |
| `--chart-5` | `oklch(0.8 0 0)` | `oklch(0.48 0 0)` | Cinquième série, gris neutre. Réservé |

> Les huit `--sidebar-*` sont les tokens du composant Sidebar (§ Navigation). Les `--chart-*` attendent les graphiques (§ Mapping Composants > Post-MVP).

### Couleurs Sémantiques

> ℹ️ Tokens custom, non générés par shadcn/ui. Chacun a son `-foreground` dans `globals.css`, réservé : aucun texte ne se pose sur ces fonds (constaté le 2026-10-13).

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--success` | `oklch(0.55 0.11 148)` | `oklch(0.72 0.11 148)` | Succès : projet publié, action répondue, action convertie dans le calendrier, revue hebdo bonne |
| `--warning` | `oklch(0.56 0.11 72)` | `oklch(0.76 0.11 72)` | Attention : projet en brouillon, action à faire dans le calendrier, revue hebdo moyenne |
| `--info` | `oklch(0.52 0.07 250)` | `oklch(0.72 0.07 250)` | Action faite. Ardoise, pas un bleu franc |
| `--shine` | `oklch(1 0 0 / 0.95)` | `oklch(1 0 0 / 0.95)` | Reflet lumineux constant (BorderBeam, effets shimmer), volontairement non-thémé pour conserver l'effet de brillance en dark mode. Uniquement sur des surfaces `bg-primary`, invisible sur une carte claire |

> Contraintes à tenir si l'un de ces tokens bouge ou si un cinquième s'ajoute : **chroma entre 0,11 et 0,16** (sauf `--info`, à 0,07), au-delà la couleur crie à côté d'un accent à 0,04 ; `--success` en teinte **148**, qui se confondrait avec `--primary` en 140 ; `--info-foreground` sombre en dark, l'ardoise y étant claire.

### Règles

- ✅ Toujours référencer les couleurs par token CSS, jamais de valeur hex en dur dans les composants : un seul endroit à modifier par mode
- ✅ L'accent vert sauge est utilisé avec parcimonie : CTA, liens de contenu et liens externes, hover states, éléments de marque. Pas de surfaces d'interface entièrement vertes.
- ✅ Privilégier le contraste : le texte principal doit toujours avoir un ratio WCAG AA minimum (4.5:1)
- ✅ Graphiques, pour leur installation (§ Mapping Composants > Post-MVP) : leurs aplats échappent à la parcimonie du vert, ce sont des données. Deux clartés de sauge (teinte 140), deux d'ardoise (teinte 250, celle de `--info`), un gris pour fermer : la teinte sépare les familles de séries, la clarté l'intérieur d'une famille. `--chart-1` à `--chart-5` par position pour des séries de même nature, rampes nommées (`primary`, `info`) pour des natures différentes, rampe sémantique quand la couleur porte un sens. Au-delà de cinq séries, la queue se regroupe en « Autres ». Aplats à 3:1 sur le fond (WCAG 1.4.11), pas les 4,5:1 du texte
- ✅ Les gris neutres (`muted`, `border`) n'ont pas de teinte colorée : ils restent purement neutres pour renforcer l'impact du vert sauge quand il apparaît
- ✅ Une couleur garde sa teinte entre light et dark, sa clarté s'adaptant au fond : elle reste lisible sans devenir une autre couleur. Le chroma ne bouge qu'à la marge (`--primary` de 0.04 à 0.03, `--destructive` de 0.16 à 0.15), sauf `--accent`, à 0.008 en light et 0.03 en dark

## Formes

### Border Radius

**Base** : `--radius: 0.625rem` (10px), les variants sont dérivées proportionnellement via `calc()` (multiplicateurs).

| Token | Valeur | Usage |
|-------|--------|-------|
| `--radius-xs` | `0.125rem` → 2px | Défaut Tailwind, seul palier non dérivé de `--radius`. Réservé |
| `--radius-sm` | `calc(var(--radius) * 0.6)` → 6px | Badges et tags, lignes à cocher des panneaux, éléments d'un `Command`, logo de 16px |
| `--radius-md` | `calc(var(--radius) * 0.8)` → 8px | Boutons `sm` et `xs`, éléments de menu, tooltips, squelettes, aperçu d'asset, logo de 28px, pastilles sociales |
| `--radius-lg` | `var(--radius)` → 10px | Boutons et champs par défaut, popovers, menus, alertes, cards bento, image de 48px d'une vue détail |
| `--radius-xl` | `calc(var(--radius) * 1.4)` → 14px | `Card`, modales, états vides, sections larges, photo de `/a-propos`, colonnes du kanban, agenda |
| `--radius-2xl` | `calc(var(--radius) * 1.8)` → 18px | Couverture d'une étude de cas, bouton principal du hero |
| `--radius-3xl` | `calc(var(--radius) * 2.2)` → 22px | Cards hero, blocs display. Réservé |
| `--radius-4xl` | `calc(var(--radius) * 2.6)` → 26px | Surfaces décoratives très arrondies. Réservé |

> Convention shadcn/ui : modifier uniquement `--radius` pour ajuster proportionnellement toute l'échelle. Style arrondi doux, moderne et accueillant.

### Ombres / Élévation

| Token | Valeur | Usage |
|-------|--------|-------|
| `shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Défaut Tailwind. Champs de l'éditeur markdown ; `radix-nova` cerne les autres d'un anneau |
| `shadow-sm` | `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)` | Repos des cards en grille, onglet actif, barres flottantes de l'éditeur |
| `shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)` | Pastilles au hover, popovers, listes et menus (valeur `radix-nova`) |
| `shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)` | Panneau latéral (`Sheet`), sous-menus |
| `shadow-xl` | `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)` | Cards au hover, vitrine et accueil admin |

> Valeurs par défaut Tailwind CSS v4 (utilitaires renommés depuis v3 : `shadow-sm` → `shadow-xs`, `shadow` → `shadow-sm`). Les composants shadcn/ui utilisent des **bordures** (`--border`) par défaut ; seules leurs surfaces flottantes (popovers, listes, menus, panneaux latéraux) y ajoutent une ombre. Ailleurs, les ombres sont réservées aux composants custom ou aux effets de hover. En dark mode, privilégier les bordures et les différences de fond (`--card` vs `--background`) pour la hiérarchie visuelle.

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
| shadcn/ui | Composants fonctionnels (Radix UI + Tailwind) | Boutons, forms, modales, navigation, cards, tables, toute l'UI fonctionnelle. Style **`radix-nova`** (compact : contrôles à 32px, paliers `sm` 28px et `xs` 24px, `rounded-lg`, padding 10px), pour le site public comme pour l'admin. En changer impose de réinstaller tous les composants. Choix de shadcn/ui : [ADR-009](adrs/009-ui-system.md) |
| Magic UI | Effets visuels copy-paste | Enrichissements marketing : typographie animée, bento grid, marquee, bordure animée, bouton shimmer, bascule de thème |
| Aceternity UI | Effets visuels copy-paste | Effets hero premium : Background Ripple Effect, les candidats étant listés en § Mapping Composants > Post-MVP |
| ReUI | Composants absents du registry shadcn | Admin : `Kanban` (pipeline des actions de prospection) et `EventCalendar` (calendriers des actions et des revues hebdo), glisser-déposer par dnd-kit. Registry compatible shadcn CLI, déclaré dans `components.json` (`@reui` → `https://reui.io/r/{style}/{name}.json`) |
| Pages CMS Editor (Tiptap) | Éditeur markdown | Champ markdown de l'admin (Détails des fiches, étude de cas d'un projet), installé par URL depuis le registre shadcn de Pages CMS, hors des registries de `components.json` ([ADR-024](adrs/024-editeur-markdown-admin.md)) |
| Tailwind CSS | Styling utilitaire | Tout le styling, composition de classes |
| `@tailwindcss/typography` | Rendu markdown (plugin Tailwind) | Classes `prose` appliquées sur le markdown des case studies et des pages légales (`prose dark:prose-invert max-w-none`). Chargé via `@plugin` dans `globals.css` |
| `c15t` | Consent Management Platform | Bandeau RGPD et modale de préférences aux tokens du design system, widget Calendly bloqué tant que les cookies marketing sont refusés. Intégration : [knowledges/c15t.md](knowledges/c15t.md) |

> Magic UI et Aceternity UI sont **réservés aux surfaces marketing** du site public : l'espace admin n'en reprend que la bascule de thème, partagée avec la navbar. Il s'appuie sur shadcn/ui, complété par ReUI pour l'agenda et le kanban, que le registry shadcn n'a pas.

### Convention de structure

Chaque lib UI a son sous-dossier dans `src/components/` pour la séparation visuelle :

| Lib | Sous-dossier | Note |
|-----|--------------|------|
| shadcn/ui | `src/components/ui/` | Défaut shadcn CLI. Accueille aussi l'éditeur Pages CMS (`ui/editor/`) et des composants maison transverses (`FormField`, `LabeledText`, `LeadParagraph`, `MotionItem`, `StackedSkeleton`, `StatusDot`) |
| Magic UI | `src/components/magicui/` | Défaut Magic UI |
| Aceternity UI | `src/components/aceternity/` | Défaut Aceternity = `ui/`, customisé via `-p src/components/aceternity` ou `aliases` dans `components.json` |
| ReUI | `src/components/reui/` | Chemin posé par le registre, sans alias dans `components.json` : `Kanban`, `EventCalendar` et sa dépendance `IconStack` |

## Mapping Composants

> Une section par famille d'usage. Les composants **post-MVP** vivent dans la dernière section et rejoignent leur famille au moment de leur installation ; la section disparaît quand elle se vide.

### Navigation

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Navbar | Navbar, Mobile Menu | nav custom + shadcn/ui (Sheet) | `sticky top-0` + `backdrop-blur` + `border-b border-border`, contient logo, liens, sélecteur de langue et bascule de thème. Liens plats en `ul`/`li` avec état actif via `usePathname`, NavigationMenu écarté (pensé pour des menus à sous-panneaux). Sheet pour le menu mobile |
| Footer | Footer | composant maison | Layout custom sur toutes les pages publiques, séparé du contenu par un `border-t border-border`. Contient logo, tagline, localisation, réseaux sociaux, lien CV, lien vers l'autre langue, copyright avec SIRET et navigation légale (mentions, confidentialité, cookies) |
| Language Switcher | DropdownMenu + icône Globe (Lucide) + drapeaux (`country-flag-icons`) | shadcn/ui | Switch FR / EN dans la navbar, locale courante en `font-semibold` |
| Theme Toggle | AnimatedThemeToggler | Magic UI + store `src/lib/theme.ts` | Toggle dark/light dans navbar et barre supérieure admin, icône soleil ou lune (§ Composants Animés) |
| Filtres projets | ProjectFilters, tabs custom (boutons HTML + sémantique ARIA) | shadcn/ui tokens | Filtres client / personnel / tous sur `/projets`. Tabs custom avec `role="tablist"` + `role="tab"` + `aria-selected`. Style via tokens Tailwind (`border-primary`, `text-muted-foreground`) |
| Onglets contact | Tabs | shadcn/ui (Radix) | Bascule formulaire / Calendly sur `/contact`. L'onglet Calendly est monté en `forceMount` et masqué en CSS, pour que le widget ne se réinitialise pas à chaque bascule ; la `key={pathname}` remet l'onglet par défaut au changement de locale |
| Navigation admin | Sidebar | shadcn/ui | Repliable, gère le mobile nativement : logo vers `/admin` en tête, `BrandMark` une fois replié, `Tooltip` sur chaque item replié. Bordures `--sidebar-border` en tête (prolonge le filet de la barre supérieure) et en pied. Tiroir mobile : bouton de fermeture du `Sheet` réaffiché, le registry le masquant |
| Fil d'ariane | Breadcrumb, composé par `AdminBreadcrumb` | shadcn/ui | Chemin depuis la liste d'un écran admin jusqu'à son formulaire, en création comme en édition. `AdminBreadcrumb` prend une liste `{ label, href? }` : un maillon cliquable par entrée avec `href`, un `BreadcrumbPage` pour la dernière. En édition il vit dans le composant async, son dernier maillon portant une donnée chargée |
| Menu du compte admin | Avatar + DropdownMenu | shadcn/ui | Barre supérieure admin, à droite de la bascule de thème. Photo Google, deux initiales en secours, à 24px dans un bouton de 36px comme la bascule. Ouvre nom, email et « Déconnexion » |

### Actions

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Boutons | Button | shadcn/ui | Variants `default`, `outline`, `ghost`, `secondary`, `destructive`, `link` ; taille `icon` pour les boutons à glyphe seul. `destructive` est une teinte `destructive/10` avec texte `--destructive`, pas un aplat rouge. Disposition dans un pied : § Conventions de Code > Règles |
| Bouton CTA hero | ShimmerButton | Magic UI | Hero de la landing uniquement, effet shimmer sur `--shine` |
| Téléchargement CV | DownloadCvButton | composant maison (Button) | Navbar, footer et `/a-propos`, en `variant="outline" size="sm"` dans les deux premiers |
| Connexion Google | GoogleSignInButton | composant maison (Button) | Seule action de la card de connexion admin, pleine largeur en `variant="outline" size="lg"`, logo Simple Icons en `data-icon="inline-start"`. `outline` : convention des boutons de connexion tiers |
| Actions de ligne | Button, composé par `RowActionButton` | shadcn/ui | `variant="ghost" size="icon-sm"`, glyphe seul sans `Tooltip`, l'`aria-label` nommant l'élément, 20px de large pour que les deux actions se lisent comme une paire dans une colonne Actions de 80px, posée par `actionsColumn`, puis tuile d'asset. Le crayon mène à la page d'édition (`EditRowLink`) ou ouvre la modale (`EditRowButton`), la corbeille est le déclencheur par défaut de `ConfirmDeleteDialog` |
| Liens d'une étude de cas | Button + BorderBeam, composés par `CaseStudyLinks` | shadcn/ui + Magic UI | « Voir la démo » et « Voir le code » sur la ligne des badges de format, alignés à droite, passant sous les badges quand la largeur manque, rappelés en pied d'étude au-dessus du retour aux projets |
| Création depuis une liste | Button + Link, composé par `CreateLinkButton` | shadcn/ui | `default` à icône `Plus` dans l'en-tête de page d'une liste dont la fiche s'édite en page (« Nouvelle opportunité ») ; `outline` `sm` dans une card rattachée qui crée sur une autre page (« Nouvel entretien », « Nouvelle opportunité ») |

### Formulaires

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Champs | Input, Textarea, Label | shadcn/ui | Formulaire contact et formulaires admin |
| Champ de formulaire | Label + contrôle, composé par `FormField` | composant maison | Libellé, contrôle, erreur sous le champ en `text-sm text-destructive`, puis aide persistante (§ Scale Typographique) citée par l'`aria-describedby` du contrôle (id `<champ>-help`). L'aide n'énonce jamais une évidence ni une unité, celle-ci passant dans le libellé (« Durée (mois) »). Formulaires admin et contact |
| Champ texte (admin) | `FormField` + Input ou Textarea, composés par `FieldInput`, `NumberField` et `TextareaField` | composant maison | Tout champ texte d'un formulaire admin, en page comme en modale : câble seul `aria-invalid` et `aria-describedby` (erreur, aide). Un `Select` d'énumération passe par `SelectField`, qui pose en première option la sentinelle « Non renseigné » dès que `noneLabel` est donné |
| Valeur en lecture seule | Input `readOnly`, composé par `ReadOnlyField` | composant maison | Champ grisé (`bg-muted text-muted-foreground`) plutôt qu'un texte, seul un champ étant labelable. Valeurs reprises d'un lead dans le mode « Depuis un lead » d'un contact : `MirroredField` les substitue à la saisie, qui reste montée et masquée |
| Cases d'une énumération | Checkbox + Label, composés par `CheckboxGroupField` | shadcn/ui | Choix multiple parmi six valeurs au plus, un `MultiSelectCombobox` à badges prenant le relais au-delà : types d'une entreprise ou d'un contact, formats d'un projet. Une case par valeur, son glyphe devant le libellé (§ Icônes), sur deux colonnes (trois dès `sm` pour les formats) |
| Sélecteur de personne | Combobox, composé par `PersonCombobox` sur `SingleSelectCombobox` | shadcn/ui | Option en nom puis entreprise en `text-muted-foreground`, sans suffixe de rôle, dans le sélecteur « Depuis un lead » aussi. « Aucun » en tête quand le champ est facultatif ; l'entreprise passe par `CompanyCombobox`, « Aucune » retirée quand elle est obligatoire |
| Formulaire en page | Card + Button, composés par `FormPage` dans `AdminFormPage` | composant maison | Titre, Annuler et Enregistrer dans une barre collée en haut au défilement : 56px sur une ligne dès `lg`, filet bas une fois collée. 16px (`gap-4`) entre fil d'Ariane, barre et grille ; dès `lg`, colonne principale et colonne droite (`1.7fr` / `1fr`) collée à 72px sous la barre. Chaque card est une `FormCard`, le padding de page vient d'`AdminFormPage` |
| Contenu de Détails | `DetailsCard` | composant maison | Du texte libre seulement : une donnée qui a son champ ou sa fiche n'y figure jamais |
| Formulaire contact | Card + Input + Textarea + Button + Label | shadcn/ui | Une colonne : localisation et réseaux en tête, puis formulaire et Calendly en onglets (§ Navigation). Sans abstraction Form : validation Zod dans la Server Action, confirmation par toast |
| Champs à choix fermé | Select, Checkbox | shadcn/ui | `Select` pour une liste fermée d'une dizaine d'options au plus, validée par Zod côté serveur. Ouvert sous le champ, calé à gauche (`position="popper"`, `align="start"` par défaut), là où le registry l'ouvre par-dessus. Options d'une énumération par `EnumSelectItems` (§ Icônes). `Checkbox` : cases des filtres d'une liste, cochées sur toute la hauteur de leur ligne |
| Champ de recherche | Combobox (Popover + Command) | shadcn/ui | Composition, pas un composant du registry, pour plus d'une dizaine d'options. Panneau à la largeur du déclencheur (`w-(--radix-popper-anchor-width)`). Coche pilotée par `data-checked` sur `CommandItem`, `Command` rendant mal l'état sélectionné en `radix-nova` ([#9228](https://github.com/shadcn-ui/ui/issues/9228)). Sélection multiple : badges retirables sous le champ (`MultiSelectCombobox`, `ProjectTagsField` numéroté et réordonnable) |
| Choix entre deux catégories | RadioGroup | shadcn/ui | Deux options côte à côte, libellés en formes courtes de l'énumération (« Client » et « Perso »), le `Switch` étant réservé à un réglage appliqué à l'instant |
| Sélecteur de date | Popover + Calendar, composé par `DatePicker`, posé par `DateField` | shadcn/ui | Base de tout champ date de l'admin : déclencheur `outline` pleine largeur à l'icône calendrier, panneau calé à gauche, `locale` française et semaine commençant lundi (le registry rend en anglais). Le champ qui l'emploie fixe le texte vide, le format affiché, les jours désactivés, le mois ouvert et le libellé d'effacement |
| Date facultative | `DatePicker`, composé par `OptionalDateField` | shadcn/ui | Date seule effaçable depuis son panneau : assujettissement à la TVA, rencontre d'une personne, réponse à une action |
| Mois de démarrage | Popover + Button, composé par `MonthField` | shadcn/ui | Démarrage d'une opportunité : le bouton des champs date ouvre une grille des douze mois sous une année à faire défiler, avec « Effacer » ; valeur `AAAA-MM` entière ou vide |
| Champ date et heure | `DatePicker` + Input, composé par `DateTimeField` | shadcn/ui | Date et heure d'un entretien, affichées « 01/12/2025 · 11:00 », le point médian séparant les deux comme toute paire de l'admin |
| Champ markdown (admin) | Editor, composé par `MarkdownEditorField` | Pages CMS Editor (Tiptap) | Détails des fiches et étude de cas d'un projet, saisie à la Notion, `format="markdown"`, images coupées ([ADR-024](adrs/024-editeur-markdown-admin.md)). Même échelle que la lecture en vue détail (§ Scale Typographique, Markdown admin). Hauteur de 8rem à 60vh selon le texte, puis défilement dans le cadre de l'éditeur. Menus en français, le menu « / » et le sélecteur de bloc gardant toutes les entrées de l'éditeur |
| Texte long bilingue (admin) | FormCard + Tabs, composés par `LocalizedTabsCard` | shadcn/ui (Radix) | `TabsList` dans l'action de la card (`CardAction` calée sur le bas), un panneau par langue monté en `forceMount` et masqué en CSS pour que les deux langues partent avec le formulaire, libellé du champ en `sr-only`. Puce `StatusDot` `warning` sur l'onglet d'une langue sans contenu, `destructive` sur celui d'une langue en erreur, ouvert de lui-même au retour du serveur. Titres et noms courts restent côte à côte, modales comprises |

### Cards et grilles

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Cards services | Card | shadcn/ui | Grille uniforme, 2 colonnes dès `md` puis 3 dès `lg`, focus contenu textuel (landing + /services) |
| Cards projets | BentoCard | Magic UI | Showcase visuel dans BentoGrid (landing + `/projets`) |
| Bento Grid | BentoGrid + BentoCard | Magic UI | Grille asymétrique et son conteneur : cards projets (landing + `/projets`) et stack `/a-propos`. Conteneur visuel seul (`rounded-lg`, bordure, `shadow-sm`), l'affordance de survol vivant sur l'élément cliquable |
| Table simple | Table | shadcn/ui | Données figées, ni tri ni pagination : table de la politique de confidentialité, sur le site public |
| Raccourcis de l'accueil admin | Card + Link | shadcn/ui | Une card cliquable par section (glyphe et libellé), 2 colonnes dès `sm` puis 4 dès `lg`, survol des surfaces cliquables (§ États des Composants) |
| Table de liste (admin) | Table, Pagination | shadcn/ui | Composée dans `DataTable`. Table bord à bord dans sa `Card` : cellules de bord à 16px, autres à 8px ; défilement horizontal au téléphone. Colonnes `table-fixed` (§ Conventions de Code > Règles), texte long tronqué, première colonne en `TitleCell`. Ligne de groupe en `bg-muted/50`, `aria-sort` sur le `th`. Pied sous la card sur la rangée `xs` : compteur et lignes par page (5, 10, 25, 50, 100 ; 25 par défaut) à gauche, pager à droite ; `Select` reçoit le palier `xs` |
| Barre d'outils de liste | Input + Button + Popover + Checkbox + Badge, composés par `OptionsPopover` | shadcn/ui | Au-dessus de la card : recherche à loupe (320px au plus), puis « Colonnes » et « Filtres » en `outline`, chacun avec son compteur en `Badge` `default`. Panneaux en `align="end"` : blocs `TitledBlock` sur deux colonnes dès plus d'un élément, `Separator` entre axes, une `Checkbox` par valeur appliquée au clic, sans option « Tous », compteurs facettés ; pied « Réinitialiser » puis « Appliquer » (§ Conventions de Code > Règles, Pied d'action) |
| Sélecteur de période | Select, composé par `PeriodSelect` | shadcn/ui | Choix unique avec valeur par défaut, `aria-label` « Période », au-dessus du kanban des actions et de la vue Revue des revues hebdo |
| Card de connexion admin | Card + Separator | shadcn/ui | Centrée en `max-w-sm` sur `/admin/login`. En-tête centré : logo, `Separator`, titre à l'échelle admin, `CardDescription`. Contenu : avis d'erreur éventuel puis bouton de connexion |
| Lignes rattachées | Link + `TruncateTooltip` + Button, composé par `RelatedLinksList` sur `RelatedLinkRow` | composant maison | Une rangée par fiche : `marker` (glyphe de l'énumération en 14px ou point neutre), libellé en lien, méta tronquée sous `TruncateTooltip`, puis à droite `trailing` (date ou chiffre en `tabular-nums`) et `actions` sans gap. Rangées groupées sous un en-tête de mois |
| Fiches rattachées | Card, composé par `RelatedLinksCard` sur `RelatedLinksList` | shadcn/ui | Card d'une page de fiche, dans la colonne principale sous la card Détails. Le bloc de la vue détail reprend les mêmes lignes sans la card |
| Fiches rattachées avec création | Card + Button, composé par `RelatedCreateCard` | composant maison | Compose `RelatedLinksCard`, `PendingRelatedCard` (card vide, bouton d'ajout `outline` désactivé) et `CreateLinkButton` (« Nouveau … » en `outline` `sm`). Entretiens et opportunités d'un lead, entretiens d'une opportunité |
| Tableau kanban | Kanban | ReUI | **Headless** : colonne et carte composées en `Card` (colonne : icône du statut, libellé au registre Label, compteur en `Badge` `outline` ; carte `size="sm"`). Une rangée de colonnes de 13.75rem au moins, qui défile horizontalement. Le tableau remplit la hauteur de l'écran sous l'en-tête : colonnes pleine hauteur même vides, cartes qui défilent dans leur colonne (`overflow-y-auto`, `no-scrollbar`). Aucune poignée de colonne, ordre fixe |
| Agenda mensuel | EventCalendar, composé par `AdminMonthCalendar` | ReUI | Sur une surface `bg-card` cerclée comme une `Card`. Vue mois seule (`showViewSwitcher={false}`), grille affichée même vide, en français, semaine au lundi, défilement avec la page. Un élément occupe une journée entière, sa pastille teintée par son statut (§ Couleurs Sémantiques). Pas de bouton « Ajouter » dans la barre ; tire `ScrollArea` (shadcn) pour ses surfaces défilantes |

### Badges

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Badges Tag (technos/infra/outils/expertises) | TagBadge | shadcn/ui + @icons-pack/react-simple-icons + lucide-react | `variant="secondary"` + `border-border` portée par le CVA comme pour les badges meta, casse normale (noms de marque). Renderer choisi selon le préfixe `tag.icon` : `"simple-icons:*"` (technos, infra, outils), `"lucide:*"` (expertises) ou `"custom:*"` (SVG maison). Cards projets, case studies et stack `/a-propos` |
| Badges Meta (format, entreprise, compteur, statut) | Badge, prop `meta` ; FormatBadges pour les formats | shadcn/ui | `meta` applique `uppercase tracking-wider` ; `variant="outline"`, `default` pour un état unique mis en avant. Logo de l'entreprise en 14px devant son nom. Une liste de badges en affichage s'arrête à trois puis « +N » en `outline` (`BadgeList`), muet sur la vitrine, relu au survol par `Tooltip` côté admin ; une vue détail et un champ d'édition les affichent tous |
| Valeur d'énumération | Badge + Lucide, composé par `EnumBadge` | shadcn/ui | Badge `secondary` d'une valeur d'énumération du CRM, son glyphe devant le libellé quand l'énumération en a (§ Icônes), sinon `labelBadge` ; en-tête de vue détail par `headerBadge`. Les badges d'en-tête (nature d'un projet, catégorie d'un tag) passent en `outline` `meta`, le statut d'un projet en puce `StatusDot`. Le même glyphe précède l'option d'un `Select` (`EnumSelectItems`) |

### Feedback et chargement

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Feedback | Toast | shadcn/ui (Sonner) | Confirmation formulaire, échec de déconnexion admin. Dans l'admin, `useSaveFeedback` pose le toast d'enregistrement, accordé à l'élément (« Action créée » à la création, « Action mise à jour » à la modification), celui d'erreur et celui d'une fiche supprimée entre-temps, qui ramène à la liste |
| Avis | Alert | shadcn/ui | Avis persistant en tête d'écran : refus de connexion admin, en `variant="destructive"` avec `ShieldBan` pour un compte refusé et `CircleAlert` sinon. Une erreur de champ reste sous son champ (§ Formulaires) |
| Chargement | Skeleton, StackedSkeleton, DataTableSkeleton | shadcn/ui + composants maison | `StackedSkeleton` empile des `Skeleton` aux hauteurs passées en props : fallback de `<Suspense>` des pages publiques et des sections de l'accueil, d'`AdminFormPage` et de l'écran Assets. `DataTableSkeleton` reprend la barre d'outils, la card et les lignes d'une table de liste admin, en fallback de ses écrans |
| État vide | Empty, composé par `EmptyState` | shadcn/ui | `EmptyState` rend l'état filtré et son bouton « Réinitialiser les filtres » (`outline`, `sm`) ; l'écran fournit icône, titre et texte de la base vide. Bordure pleine (`border-solid`), pas le `border-dashed` du registry, comme les autres surfaces admin ; aucune bordure dans une cellule de table |

### Overlays

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Panneau latéral | Sheet | shadcn/ui | Menu mobile, navigation admin au téléphone |
| Modales | Dialog, AlertDialog | shadcn/ui | `AlertDialog` pour confirmer une suppression, à la largeur du registry ; une modale de formulaire ou de lecture passe à 640px pour tenir deux colonnes. Pied en bandeau `muted/50` d'un bord à l'autre. La confirmation porte `TriangleAlert` (32px) en `text-destructive` dans `AlertDialogMedia`, sans tuile, titre et texte alignés à gauche. `ConfirmDeleteDialog` : titre qui nomme l'élément (« Supprimer « Agents IA » ? ») et bouton « Supprimer » |
| Agrandissement d'image | Dialog, composé par `ZoomableImage` | shadcn/ui | Vignette cliquable, image entière jusqu'à 80dvh de haut et pleine largeur moins les marges de la modale, bouton Fermer dans le coin haut droit de l'écran, légende sous l'image reprise de l'alt. Voile et contenu en thème sombre quel que soit le thème. Glyphe `Maximize2` dans le coin de la vignette, en pastille sombre translucide, visible au survol ou au focus sur un pointeur fin et en permanence sur écran tactile (`pointer-coarse`) |
| Formulaire en modale | Dialog, composé par `FormDialog` et `FormDialogForm` | shadcn/ui | Repart d'un formulaire neuf à chaque ouverture. Titre d'une modification nommant l'élément (« Modifier Agents IA »), description disant l'action (« Créer un tag pour catégoriser les projets. »). Plafond de `85svh` (`svh`, la barre d'URL mobile faussant `vh`) : champs sur deux colonnes qui défilent seuls dans `DialogBody`, en-tête et pied fixes. Pied Annuler et Enregistrer, à l'icône `Save` |
| Vue détail (admin) | Dialog, composé par `DetailDialog` | shadcn/ui | L'écran ne fournit que des données : image (`AssetTileLink`), titre, sous-titre, badges `outline` `meta` à droite du titre, blocs titrés (`TitledBlock`) séparés d'un `Separator`. Deux colonnes, pleine largeur pour un texte long ou une liste de fiches rattachées ; libellé au registre Libellé de champ (§ Scale Typographique). Pied « Fermer » et « Modifier ». Un bloc sans donnée reste affiché, ses valeurs absentes rendues par `EmptyValue` |
| Consentement cookies | ConsentBanner, ConsentDialog | `c15t` (`c15t/next`) | Bandeau au premier passage ; modale de préférences rouverte par « Gérer mes cookies » au footer (`OpenCookiePreferencesLink`), par la politique de confidentialité et par le widget Calendly bloqué (`OpenCookiePreferencesButton`). Tokens du design system rendus par `ConsentTheme` (layout serveur), parties ajustées par les slots de `src/components/cookies/consent-theme.ts`. Rendu aligné sur c15t 2 : filet `border` au-dessus du pied de la modale, boutons du pied qui rétrécissent au lieu de déborder, liens non soulignés (exception volontaire à la règle des liens : le texte du bandeau est court et le lien y est déjà en `text-primary`). Titre du bandeau et de la modale en `h2`, boutons d'accordéon dans la police du site, Geist |
| Panneau contextuel | Popover | shadcn/ui | Ancré sur son déclencheur. Seul, `align="end"` sous une barre d'outils (filtres d'une liste), ou en composition (Combobox, sélecteur de date). Son pied suit celui d'une modale (§ Conventions de Code > Règles, Pied d'action) |

### Contenu et texte

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Paragraphe d'accroche | LeadParagraph | composant maison | Filet `border-l-2 border-primary/60` + `pl-5` sur la tagline `/a-propos` et le chapô d'étude de cas |
| Texte à libellé | LabeledText | composant maison | Met en gras le libellé d'un paragraphe traduit jusqu'aux deux-points, au-delà de 30 caractères le texte est rendu tel quel. Utilisé sur `/a-propos` et dans les cards services, où le gras vit dans le composant plutôt que dans les fichiers de traduction |
| Typographie display | HyperText, WordRotate | Magic UI | Effets textes animés sur surfaces marketing (tagline hero scrambled, CTAs rotation de mots) |
| Number Ticker | NumberTicker, composé par NumberTickerStats | Magic UI | Chiffres clés animés sur /a-propos (années d'expérience, projets livrés, etc.) |
| Marquee | Marquee | Magic UI | Bande de logos de la stack qui défile sous le CTA final de la landing, avec fondu sur les bords |
| Rendu markdown | MarkdownContent | composant maison (`@tailwindcss/typography`) | Case studies et pages légales, classes `prose` et overrides `prose-h2` / `prose-h3` alignés sur la scale. Variante `admin` pour Détails en vue détail (§ Scale Typographique, Markdown admin) |
| Texte tronqué (admin) | Tooltip, composé par `TruncateTooltip` | shadcn/ui | Toute cellule ou libellé tronqué (`truncate`) d'une liste ou fiche admin : pose un `Tooltip` seulement si le texte déborde réellement, réévalué au redimensionnement. Aucune cellule n'est rendue focusable |
| Valeur absente (admin) | `EmptyValue` | composant maison | Tiret cadratin en `text-muted-foreground`, rendu par `DataTable` et `DetailDialog` pour toute valeur `null`, jamais un tiret écrit par l'écran ; le tiret cadratin lui est réservé, un séparateur dans un libellé s'écrivant avec des deux-points |
| Adresse web (admin) | `ExternalUrl` | composant maison | Lien `text-primary` vers un nouvel onglet, souligné au survol : site d'une entreprise, profil LinkedIn |
| Bloc titré (admin) | `TitledBlock` | composant maison | Titre au registre Label puis contenu, sur deux colonnes dès plus d'un élément : blocs d'une vue détail, panneaux Filtres et Colonnes |

### Références de fiche (admin)

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Lien vers une fiche | `RecordLink`, composé par `CompanyLink`, `PersonRecordLink` et `PersonLink` | composant maison | Entreprise ou personne, la même en colonne (`companyCell`) et en vue détail : logo de l'entreprise en 16px, puis le nom, un seul lien vers sa vue détail. Sans fiche à ouvrir, la référence reste en texte simple. `PersonLink` ajoute un `Badge` `outline` à une personne opposée |
| Première colonne d'une liste | `TitleCell` | composant maison | Titre en `font-medium`, puis sous-titre choisi par la liste (§ Scale Typographique, Aide et méta), en mono pour un slug, visuel facultatif à gauche ; le logo, le slug et l'entreprise d'une personne n'ont pas de colonne propre, leads et contacts n'ayant pas de colonne Entreprise |
| Logo d'entreprise | `CompanyLogoTile` | composant maison | Pastille carrée à trois tailles : 16px devant une référence (`RecordLink`), 28px dans la première colonne (`TitleCell`, taille `md` du design system), 48px dans l'en-tête d'une vue détail. Image entière sur fond neutre, dégradé quand le logo manque, comme une tuile d'aperçu |
| Image d'une vue détail | `AssetTileLink` | composant maison | Logo d'une entreprise ou couverture d'un projet, en 48px à gauche du titre, cliquable vers son fichier dans Assets quand il existe, sans bloc Logo ni bloc Couverture dans le corps |

### Assets (admin)

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Grille d'assets | Card + Input + Popover + Checkbox + Empty + Pagination, composés par `AssetsBrowser` | shadcn/ui | L'écran Assets : même barre d'outils qu'une liste admin avec deux facettes (dossier, nature image ou PDF), même état vide et même pied de pagination, mais une grille de tuiles à la place de la table : une colonne au téléphone, jusqu'à cinq en `xl`. Chaque tuile porte ses actions de ligne (copier le chemin, supprimer) et sa rangée de rattachements (`BadgeList`), réservée sur toutes les tuiles |
| Tuile d'aperçu | `AssetPreview` sur `AssetFrame` | composant maison | Vignette `aspect-video` bord à bord, puis nom du fichier tronqué sous `TruncateTooltip` et dossier parent. Image entière sur fond `muted`, dégradé `primary/20 → accent/20` pour un aperçu manquant, glyphe pour un PDF. La variante `row` pose la vignette à gauche du nom |
| Image d'asset | `AssetImage` | composant maison (`next/image`) | Construit l'URL selon la clé, route publique ou route gardée, sans optimisation `next/image` sur une clé gardée (rule `nextjs/images`) |
| Sélecteur d'asset | Dialog + Input + Pagination, composés par `AssetPicker` | shadcn/ui | Choix d'un fichier depuis un formulaire, sous un plafond de `85svh` : tuiles d'au moins 140px qui remplissent la modale de 640px, plutôt que les paliers de l'écran Assets, faits pour la largeur de la page. La grille défile seule, même pied de pagination, sans facettes. |
| Dépôt de fichier | Dialog + Select + Input, composés par `AssetUploadDialog` dans `FormDialog` | shadcn/ui | `Select` pour le dossier de destination, nom du fichier, puis zone de dépôt par glisser-déposer ou sélecteur natif. Bouton d'enregistrement en `Upload` |
| Fichier d'un formulaire | `AssetField` sur `AssetFrame` | composant maison | Logo d'une entreprise, couverture d'un projet : aperçu entier dans le cadre d'`AssetPreview`, sur fond neutre, nom du fichier dessous, puis la rangée de boutons : les façons de poser le fichier (choisir, récupérer depuis le site), puis « Retirer » en icône `X` à droite |

### Effets visuels

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Hero effects | Background Ripple Effect | Aceternity UI | Fond du hero de l'accueil uniquement, grille de cellules qui ripplent au clic |
| Effets visuels enrichis | Border Beam | Magic UI | Enrichissement visuel des surfaces marketing, always-on aux emplacements que liste § Composants Animés |
| Entrée au scroll | MotionItem | composant maison (`IntersectionObserver`) | Props `index` (rang dans la rangée) et `className` : inséré dans une grille il en devient l'élément, les classes du parent (`col-span`, `h-full`) doivent lui être portées |

### Identité

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Logo | BrandLogo | composant maison (`next/image`) | Navbar, footer, menu mobile, connexion admin et rail admin, variante claire ou sombre selon le thème. 140px de base, 200px dès `md` par défaut (navbar, footer) ; fixé à 140px sur la connexion, où 200px dépasserait le titre de la card ; 180px dans le menu mobile ; 120px dans le rail, 150px dès `md`, valeurs du design system, dans les 175px utiles de son en-tête |
| Petit logo | BrandMark | composant maison (`next/image`) | Rail admin replié, à 24px : le logo horizontal ne tient pas dans ses 3rem |
| Réseaux sociaux | SocialLinks | composant maison (Simple Icons + Lucide) | Pastilles de 36px, la taille des boutons icône de la navbar (bascule de thème), en navbar mobile, footer et `/contact` |
| Localisation | LocationLine | composant maison (`country-flag-icons`) | Drapeaux FR et LU, puis une ligne Remote à glyphe `Globe`, sur `/contact` |

### Post-MVP (non installés)

> Chaque entrée rejoint sa famille ci-dessus au moment de son installation.

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Réglage appliqué à l'instant | Switch | shadcn/ui | Une bascule qui s'engage sans passer par « Enregistrer ». Un choix soumis par un formulaire reste un `RadioGroup` (§ Formulaires) |
| Graphiques | Chart | shadcn/ui (Recharts) | Audience, indicateurs CRM, chiffre d'affaires. Couleurs de série : `--chart-*` et § Palette de Couleurs > Règles |
| Fil de conversation | Message, Bubble, MessageScroller, Marker | shadcn/ui | Assistant interne, créateur de specs et chatbot public, mêmes composants ([ADR-027](adrs/027-composants-chat.md)). Libellés en props : français en dur dans l'admin, next-intl sur le site public |
| Saisie de message | Prompt Input (pattern AI Elements), Input Group | shadcn/ui | Champ sous le fil ; pendant qu'une question attend, ce qui s'y tape répond à la question en cours |
| Questions de l'agent | Questionnaire | shadcn/ui | Questions posées une à une par l'agent : choix simple ou multiple, réponse libre, étapes. Stepper du créateur de specs |
| Étapes d'une session | Trace, Tool (pattern AI Elements) | shadcn/ui | Appels d'outils, liste des tâches et agents lancés en parallèle |
| Confirmation d'écriture | Confirmation (pattern AI Elements) | shadcn/ui | Écriture de l'agent dans l'app à valider avant exécution |
| Réponse en streaming | Bulle markdown | composant maison (`react-markdown`, `remend`) | Markdown réparé à chaque morceau reçu, même rendu que `MarkdownContent` ; règles de sécurité dans l'ADR-027 |
| Fenêtre de l'assistant | Fenêtre flottante | composant maison | Déplaçable et redimensionnable, pour ne jamais masquer la page en cours. Ouverte par un bouton à icône de l'en-tête, sur tous les écrans ; l'historique des conversations s'ouvre par l'entrée « Conversations » du menu de l'avatar |
| Indicateur circulaire | ProgressCircle | composant maison (conventions Tremor) | Anneau à valeur unique (budget consommé, taux de remplissage), métrique à côté. SVG maison, pas une dépendance |

## États des Composants

> Les composants shadcn/ui, Magic UI et Aceternity UI (Button, BentoCard, ShimmerButton, etc.) ont leurs états et animations **intégrés**. Les guidelines ci-dessous s'appliquent uniquement aux composants **custom** non-lib créés from scratch.

| État | Style / Comportement | Contexte |
|------|---------------------|----------|
| Hover (surfaces cliquables custom) | Léger scale `1.01` + ombre + transition `300ms ease-out` | Cards de la vitrine et raccourcis de l'accueil admin (`shadow-xl`), petits éléments type pastille (`shadow-md`) |
| Hover (surfaces custom non cliquables) | Contour porté à `primary/40`, transition `300ms ease-out`, la surface reste en place | Cards services et tuiles de stack |
| Hover (tuile ou zone cliquable admin) | Contour porté à `border-primary` | Image d'une vue détail, aperçu d'asset en ligne de vue détail, zone de dépôt d'un fichier |
| Hover (liens d'interface) | Transition couleur `150ms` vers `text-primary` | Navbar, indicateur de défilement du hero, entreprise d'une étude de cas |
| Hover (liens discrets) | Transition couleur `150ms` de `text-muted-foreground` vers `text-foreground` | Navigation légale du footer, retour d'une étude de cas, bande de stack du CTA final |
| Hover (liens soulignés) | Soulignement, couleur inchangée | Lien seul sur sa ligne en `text-primary`, lien vers une fiche admin en couleur du texte (§ Conventions de Code > Règles, Liens) |
| Actif (lien de navigation) | `font-semibold text-primary` ; `font-semibold` seul dans le sélecteur de langue ; filtre de `/projets` souligné (`border-b-2 border-primary`) en `font-medium text-foreground` | Item de la navbar correspondant à la route courante, locale courante du sélecteur, filtre courant |
| Ligne de table cliquable | `cursor-pointer`, contour de focus en retrait (`focus-visible:-outline-offset-2`) | Listes admin à vue détail |
| Glisser-déposer | Élément glissable en `cursor-grab`, badge de tag saisi en `cursor-grabbing` à 40 % d'opacité. Cible : fond `bg-muted` sur une ligne de table, anneau `ring-2 ring-primary ring-offset-1` sur une colonne de kanban ou un badge de tag. Le dépôt s'enregistre au lâcher, Échap annule le geste | Listes à ordre éditable, kanban des actions, tags d'un projet |
| Sélection (tuile) | `border-primary bg-accent`, contour `primary/40` au survol d'une tuile non choisie | Tuiles du sélecteur d'asset |
| Loading | Skeleton pulse (`animate-pulse`) | Chargement de contenu dynamique (projets, etc.) |

---

# 🖼️ Icônes

**Librairie UI** : `Lucide React` (incluse avec shadcn/ui)

**Librairie logos** : `Simple Icons` via `@icons-pack/react-simple-icons` (logos techs, frameworks, réseaux sociaux)

**Librairie drapeaux** : `country-flag-icons` (sélecteur de langue, ligne de localisation)

**Règles** :
- Lucide pour toutes les icônes d'interface (flèches, menu, settings, mail, etc.)
- Simple Icons pour les logos de marques et technologies (Python, React, Docker, GitHub, etc.)
- `country-flag-icons` pour les drapeaux, que ni Lucide ni Simple Icons ne fournissent
- LinkedIn et Malt en SVG inline dans `src/lib/icons.tsx` : Simple Icons a retiré le premier pour raisons de licence et n'a pas le second
- Style stroke uniquement (Lucide) : pas de mix stroke/fill
- Taille cohérente par contexte : `16px` inline, `20px` UI standard, `24px` standalone, `32px+` décoratif
- Une icône inscrite dans un conteneur se dimensionne par rapport à lui et sort de cette grille : `12px` dans un badge, imposé par `Badge` via `[&>svg]:size-3!`
- Une énumération du CRM qui a sa table de glyphes Lucide (LinkedIn en logo de marque) les montre partout où sa valeur s'affiche : badge, option de `Select` (`EnumSelectItems`), case d'une grille de `Checkbox`, comme les emojis des selects Notion. Seul le panneau des filtres d'une liste reste en libellé seul : case, libellé et compteur y tiennent déjà la ligne. « Autre » n'en a pas ; une énumération sans table (taille, secteurs, zones) n'en reçoit pas : on n'invente pas de glyphe à une classification nominale. La table vit à côté des libellés de chaque domaine (`*_ICONS` près de `*_LABELS`), jamais dans l'écran

---

# ✨ Animations & Motion

## Librairie(s)

| Librairie | Rôle | Périmètre |
|-----------|------|-----------|
| Motion (package `motion`, import `motion/react`) | Moteur d'animation sous-jacent des composants Magic UI | Jamais appelé directement dans le code applicatif |
| Magic UI | Text effects et effets visuels enrichis | HyperText, WordRotate, NumberTicker, Marquee, BorderBeam, ShimmerButton, AnimatedThemeToggler |
| Aceternity UI | Hero effects premium | Background Ripple Effect, hero de l'accueil |

## Principes Directeurs

- **Intensité** : `subtile`, chaque animation a un but fonctionnel (guider l'attention, confirmer une action)
- **Durée standard** : `200-400ms` pour tout ce qui déplace ou fait apparaître ; `150ms` pour les micro-transitions de couleur seule, défaut Tailwind ; `100ms` pour l'ouverture des popovers, menus et panneaux, valeur des composants shadcn. Les boucles always-on (BorderBeam, rebond, pulsation) gardent leur propre cycle
- **Easing** : `ease-out` (entrées), `ease-in-out` (transitions)
- **Intention** : renforcer la sensation de qualité et de fluidité sans distraire. Le contenu prime sur l'effet : 3 à 5 effets Magic UI par page au plus, la landing portant le plafond, un seul ShimmerButton. La bascule de thème de la navbar et le BorderBeam d'un projet en cours, qui suit les données, ne comptent pas
- **Périmètre** : les animations d'entrée au scroll sont réservées aux surfaces marketing (accueil, `/services`, `/projets`, `/a-propos`), les pages de lecture continue et le formulaire de contact affichant leur contenu directement
- **Accessibilité** : `prefers-reduced-motion` coupe l'entrée au scroll (hook maison de `MotionItem` sur `matchMedia`), les transitions de page (`@media` dans `globals.css`), le défilement doux et le rebond de l'indicateur du hero (`motion-safe:`), le contenu s'affichant sans fondu ni délai. Les effets Magic UI et Aceternity n'ont pas de garde

## Composants Animés

> Ce tableau ne liste que les animations **implémentées manuellement** (Motion, transitions Tailwind, CSS), sur des composants custom ou sur des composants shadcn non animés. Celles de Magic UI et d'Aceternity UI sont intégrées à leurs composants. `BorderBeam` et `AnimatedThemeToggler` font exception : l'animation vient de la lib, mais leurs emplacements et leurs paramètres sont une décision projet. Les transitions de survol et d'état actif vivent en § États des Composants.

| Composant | Type d'animation | Librairie | Trigger |
|-----------|-----------------|-----------|---------|
| Sections marketing | Fade-in + slide-up 20px, `400ms ease-out` | CSS + IntersectionObserver (`MotionItem`) | Scroll (viewport entry à 20%) |
| Cards en grille | Idem, en cascade `100ms` par colonne (`index % colonnes`, plafonnée à une rangée). Les trois premières cards, visibles sans défiler, s'affichent sans animation | CSS + IntersectionObserver (`MotionItem`) | Scroll (viewport entry à 20%) |
| Page transitions | Fondu croisé `200ms`, `ease-in-out` en sortie et `ease-out` en entrée | React `ViewTransition` | Changement de route. Porté par `PageShell` pour les pages qui l'utilisent, et par la landing pour elle-même |
| Indicateur de défilement du hero | Rebond (`animate-bounce`), coupé sous `prefers-reduced-motion` | Tailwind | Always-on |
| Étape en cours d'une étude de cas | Pulsation (`animate-pulse`) du point de la timeline, anneau `ring-primary/20` | Tailwind | Always-on |
| Bascule de thème | Échange soleil et lune, nouveau thème révélé en hexagone, `variant="hexagon"`, `duration=200ms` | Magic UI | Clic |
| Badge "En cours" (indicateur live) | BorderBeam rotation bordure, `colorFrom=var(--shine)`, `colorTo=transparent`, `borderWidth=2`, `duration=7s`, `size=30` | Magic UI | Always-on (signale les cards de projets actifs) |
| CTA "Voir la démo" (case study) | BorderBeam rotation bordure, `colorFrom=var(--shine)`, `colorTo=transparent`, `borderWidth=2`, `duration=7s`, `size=40` | Magic UI | Always-on (mise en valeur du CTA principal, uniquement sur bouton démo, pas github, en tête comme en pied d'étude) |
| Card service mise en avant | BorderBeam rotation bordure, `colorFrom=var(--primary)`, `colorTo=transparent`, `borderWidth=2`, `duration=7s`, `size=80` | Magic UI | Always-on (une seule card par grille services, pilotée par `SERVICE_HIGHLIGHTS`) |

---

# 📐 Layout & Espacement

## Structure de Page

| Élément | Valeur | Usage |
|---------|--------|-------|
| Container | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` | 1280px max, padding responsive |
| Padding vertical de page | `py-8 lg:py-14` | porté par `PageShell` |
| Padding vertical du footer | `py-8 lg:py-12` | bloc principal ; barre légale en `py-6` |
| Espacement entre sections | `gap-16 sm:gap-20 lg:gap-24` | `PageShell`, toutes les pages sauf la landing |
| Espacement entre sections, landing | `gap-20 sm:gap-24 lg:gap-28`, plus `pb-20 sm:pb-24 lg:pb-28` en bas | rythme majoré d'un cran, porté par le `<main>` propre à la landing, qui laisse le hero déborder du container ; chaque section repose son propre container |
| Spacing pages documentaires | `space-y-12` sur le wrapper, `gap-6` entre sections coded, `prose-h2:mt-12 prose-h2:mb-6` sur le markdown | rythme serré pour la lecture continue (légales, case studies) |
| Rythme interne d'une section | `gap` uniforme, doublé avant un bloc d'un autre registre | CTA final : 32px entre titre, sous-titre et bouton, 64px avant la bande stack |
| Grid principal | CSS Grid ou Flexbox | selon le contexte, pas de librairie de grid externe |
| Container admin | pleine largeur moins la sidebar | sans `max-w-7xl` centré |
| Barre supérieure admin | `56px` | un cran sous les 64px de la navbar publique. L'en-tête du rail s'aligne dessus, et leurs deux bordures basses n'en forment qu'une |
| Rail de navigation admin | `13rem` (208px) | contre 16rem par défaut : « Actions prospection », le plus long libellé, occupe 127px des 152px laissés au texte (mesure du 2026-10-13). Se pose par `style` sur `SidebarProvider` ; le mobile garde la largeur du `Sheet` |
| Padding de page, admin | `px-4 py-6 md:px-6 lg:py-8` | porté par `AdminPageShell`, qui rend aussi le titre d'écran et son sous-titre. La densité prime sur le souffle |

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

**Utilitaire** : `cn()` (shadcn/ui), fourni par le paquet `cn` et réexporté par `src/lib/utils.ts`, même sortie que `clsx` + `tailwind-merge`, pour composer les classes Tailwind sans conflit.

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
- ✅ **Liens** : un lien dans du texte courant porte `text-primary` et un soulignement permanent léger (`decoration-primary/40`, `underline-offset-4`), plein au survol. Un lien seul sur sa ligne garde la couleur et ne se souligne qu'au survol. Un lien vers une autre fiche de l'admin prend la couleur du texte, précédé de son visuel, souligné au survol : le vert reste aux liens qui sortent de l'admin. Les liens d'interface se distinguent par la couleur seule (§ États des Composants)
- ✅ **Valeurs numériques** : ce qui se compare (montants, quantités, taux, durées) s'aligne à droite en `tabular-nums`, en Geist Sans, le mono gardant ses usages (§ Police Monospace). Ce qui se lit comme une étiquette (années, dates, numéros de facture, identifiants) reste à gauche, une date gardant `tabular-nums`
- ✅ **Pied d'action** : un pied de modale, de panneau ou d'en-tête de formulaire ne porte qu'un seul bouton `default` sauge, celui de l'action principale, placé en dernier à droite ; le reste est `outline` ou `ghost` (« Réinitialiser » avant « Appliquer »). Le bouton d'enregistrement porte l'icône `Save` (`Upload` pour un dépôt)
- ✅ **Textes d'interface** : rédaction (libellés, vocabulaire, apostrophe) dans la rule `shadcn-ui/admin-textes`
- ✅ **Espacement des formulaires** : 16px (`gap-4`) entre les champs et entre les rangées, en modale comme en page
- ✅ **Champs courts** : deux champs courts d'une même card se posent côte à côte en `sm:grid-cols-2`
- ✅ **Ordre d'un formulaire** : aucun champ seul sur une demi-ligne (pleine largeur sinon), nom ou titre d'abord et avant le slug, puis rattachements, qualification, chiffres, dates, textes longs ; les formulaires semblables partagent la même grille
- ✅ **Largeur des champs** : tout contrôle de saisie occupe la largeur de sa colonne, texte, liste déroulante, recherche ou date, pour que les champs d'une rangée s'alignent. À poser explicitement, plusieurs contrôles du registry se dimensionnant sur leur contenu
- ✅ **Largeur d'une colonne de liste** : un multiple de 8, au plus juste entre l'en-tête (icône de tri comprise) et le contenu des lignes à 95 %. Une colonne de badges prend son badge le plus large, sans troncature ni retour à la ligne ; un texte long garde un plafond et se tronque ; un en-tête de plusieurs mots passe sur deux lignes plutôt que d'élargir la colonne. Les largeurs vivent à côté de chaque table, les communes (`#`, Actions) dans `src/lib/admin/table-widths.ts`
- ✅ **Texte trop long** : ce qui ne tient pas dans sa colonne se tronque par une ellipse, relue au survol par `Tooltip` côté admin (§ Contenu et texte), muette sur la vitrine. Le `placeholder` fait exception, il doit tenir entier dans son champ
- ✅ **Curseur** : le curseur texte ne paraît que sur les champs de saisie, le pointeur sur ce qui se clique, la flèche partout ailleurs. Posé une fois en `@layer base` dans `globals.css`, jamais composant par composant

## Anti-Patterns

- ❌ **Couleurs en dur** : ne jamais utiliser `bg-green-600` ou `text-[#8FA68E]`, toujours passer par les tokens (`bg-primary`, `text-primary`)
- ❌ **CSS modules / styled-components** : tout le styling passe par Tailwind. Pas de fichiers CSS custom sauf cas exceptionnel (ex: animations keyframes complexes)
- ❌ **`!important`** : ne jamais utiliser `!important`. Si un style ne s'applique pas, corriger la cascade avec `cn()` ou revoir la structure du composant
- ❌ **Inline styles** : ne jamais utiliser `style={{}}` sauf pour des valeurs dynamiques calculées (ex: positions, dimensions variables)
- ❌ **Deux styles shadcn dans le même projet** : `components.json` ne porte qu'une valeur `style`, site public et admin partagent `src/components/ui/`. Maintenir deux jeux de composants pour différencier les surfaces est une sur-ingénierie

> **Exceptions admises** : les composants vendored (shadcn, Magic UI, Aceternity) gardent leurs valeurs d'origine, un `shadcn add --overwrite` les rétablirait ; le template OG passe par Satori, qui ne résout ni les variables CSS ni les classes ; le `themeColor` du viewport s'écrit en hex, le navigateur le lisant hors du CSS ; la largeur du rail admin passe par le `style` de `SidebarProvider`, seul moyen de poser sa variable `--sidebar-width` ; le store de thème injecte un `transition: none !important` éphémère le temps de la bascule ; sous `prefers-reduced-motion`, `globals.css` coupe en `!important` les animations des pseudo-éléments `::view-transition-*`, que le navigateur pose avec une spécificité qu'aucune classe ne bat.

---

# 🔗 Ressources

## Maquette et design system externes

- **Design system** : [Thibaud Geisler Design System](https://claude.ai/artifact/1YqgqnqwrcJV9M2GZmusWi), artifact Claude : composants, fiches d'usage, cartes et kit du site public. Synchronisé à la main depuis le dépôt, fait foi sur les composants
- **Maquette** : [Espace Admin](https://claude.ai/design/p/d2229cd8-49ca-4774-b7c8-0fdc88b83103) : écrans de l'espace admin, fait foi sur l'apparence des écrans
- **Lecture locale** : export de la maquette dans `.design-sync/maquette/` et copie du design system dans `.design-sync/design-system/` (mêmes chemins que l'artifact), ignorés par git, procédure dans `.design-sync/NOTES.md`. À refaire quand la maquette évolue : sa lecture distante est tronquée au-delà de 256 Kio, sans erreur

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
- [ReUI](https://reui.io) : registry compatible shadcn CLI, `Kanban` et `EventCalendar` pour les vues pipeline et calendrier de l'admin
- [Geist Font](https://vercel.com/font) : polices Geist Sans et Geist Mono (Vercel)
- [Sansation](https://fonts.google.com/specimen/Sansation) : police display, par Bernd Montag, sous licence OFL
