---
title: "DESIGN — Thibaud Geisler Portfolio"
description: "Design system : typographie, couleurs, librairies UI, mapping composants et conventions de style."
date: "2026-10-13"
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

**Usage** : blocs de code, années de la timeline d'étude de cas, identifiants de l'admin (slug, colonne `#`, rang d'un tag, clé d'icône, dossier sous un aperçu d'asset)

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
| Compteur et rang | 10px | 500 (Medium) | `text-[10px]` : compteur d'un bouton de barre d'outils (`COUNTER_BADGE_CLASS`), rang d'un tag réordonnable en mono |
| Label (intitulé de section ou de donnée) | 0.875rem (14px) | 500 (Medium) | `text-sm font-medium tracking-[0.25em] text-muted-foreground uppercase` : stack, stats, signature de la landing, métadonnées d'étude de cas, sections de la sidebar admin, lignes de groupe des tables, titres de bloc (`TitledBlock`). En `text-xs` sur les mois d'une liste de fiches rattachées et les colonnes du kanban. Partagé par la constante `LABEL_CLASS` (`src/lib/typography.ts`). Ajouter `text-balance` au-delà d'une dizaine de caractères, l'espacement large faisant vite déborder |
| Titre de card marketing | 1.5rem (24px) | 700 (Bold) | `font-display text-2xl font-bold tracking-normal` : cards services et projets. Taille fixe quel que soit le niveau du titre, d'où le `text-2xl` explicite |
| Display number (chiffre clé) | 3rem (48px), 3.75rem (60px) dès sm | 700 (Bold) | `font-display text-5xl font-bold text-primary sm:text-6xl` : chiffres des stats `/a-propos` |
| Titre d'écran (admin) | 1.5rem (24px) | 600 (SemiBold) | `font-sans text-2xl font-semibold tracking-tight` : `h1` d'`AdminPageShell`, des pages de formulaire, de la connexion et de l'écran d'accès refusé |
| Titre de modale | 1.125rem (18px) | 600 (SemiBold) | `text-lg font-semibold`, porté par `AlertDialogTitle` et par `DialogTitle`, qui y ajoute `leading-none` |
| Titre de card et de panneau | 1rem (16px) | 500 (Medium) | `text-base font-medium`, valeur du registry (`CardTitle`, `SheetTitle`) : cards des formulaires admin, raccourcis de l'accueil admin |
| Markdown admin | 1.125rem (18px) à 0.875rem (14px) | 600 (SemiBold) pour les titres | `ADMIN_MARKDOWN_CLASS` (`src/lib/typography.ts`) : `#` en `text-lg`, `##` en `text-base`, `###` en `text-sm`, texte en `text-sm`. Même échelle dans l'éditeur Détails et en lecture dans la vue détail |

> Les styles de base H1, H2 et H3 sont appliqués globalement via `@layer base` dans `globals.css` (mobile-first, palier `sm:` pour le desktop). Pas besoin de répéter ces classes sur chaque balise, sauf override ponctuel.

> `font-display` est appliquée par défaut sur H1 via `@layer base`, les autres niveaux utilisant Geist Sans.

> **Exceptions** : `font-display` s'ajoute aussi aux titres de cards marketing et aux H2 des sections de la landing, pour la cohérence éditoriale avec les H1 hero. Les H2 des autres pages, les pages de lecture (légales, case studies) et les pages internes (admin, formulaires) gardent Geist Sans. Le `tracking-tight` de la base corrige l'impression de relâchement des grandes tailles : à 24px il étrangle, d'où le `tracking-normal` de la card marketing.

> **Le niveau d'un titre suit la structure de la page, jamais son apparence.** Une card marketing est un cran sous le titre qui la précède : H2 quand elle suit le H1 de la page (`/services`, `/projets`), H3 quand elle vit sous un H2 de section (accueil). `ServiceCard` et `ProjectCard` prennent donc un `headingLevel` de leur appelant, et gardent la même apparence dans les deux cas.

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
| `@c15t/nextjs` | Consent Management Platform | Bandeau RGPD et modale de préférences aux tokens du design system, widget Calendly bloqué tant que les cookies marketing sont refusés. Intégration : [knowledges/c15t.md](knowledges/c15t.md) |

> Magic UI et Aceternity UI sont **réservés aux surfaces marketing** du site public : l'espace admin n'en reprend que la bascule de thème, partagée avec la navbar. Il s'appuie sur shadcn/ui, complété par ReUI pour l'agenda et le kanban, que le registry shadcn n'a pas.

### Convention de structure

Chaque lib UI a son sous-dossier dans `src/components/` pour la séparation visuelle :

| Lib | Sous-dossier | Note |
|-----|--------------|------|
| shadcn/ui | `src/components/ui/` | Défaut shadcn CLI. Accueille aussi l'éditeur Pages CMS (`ui/editor/`) et des composants maison transverses (`FormField`, `LabeledText`, `LeadParagraph`, `MotionItem`, `StackedSkeleton`) |
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
| Navigation admin | Sidebar | shadcn/ui | Repliable, gère le mobile nativement : logo vers `/admin` en tête, `BrandMark` une fois replié, `Tooltip` sur chaque item replié. Une bordure `--sidebar-border` en tête prolonge le filet de la barre supérieure, une autre en pied détache la déconnexion de la navigation. Les vues d'une section s'affichent en sous-entrées sous l'item actif, une entrée sans écran restant visible et désactivée. Le tiroir mobile réaffiche le bouton de fermeture du `Sheet`, masqué par le registry |
| Fil d'ariane | Breadcrumb, composé par `AdminBreadcrumb` | shadcn/ui | Chemin depuis la liste d'un écran admin jusqu'à son formulaire, en création comme en édition. `AdminBreadcrumb` prend une liste `{ label, href? }` : un maillon cliquable par entrée avec `href`, un `BreadcrumbPage` pour la dernière. Sur un écran d'édition il vit dans le composant async, son dernier maillon portant une donnée chargée |
| Menu du compte admin | Avatar + DropdownMenu | shadcn/ui | Barre supérieure admin, à droite de la bascule de thème. Photo Google, deux initiales en secours, à 24px dans un bouton de 36px comme la bascule. Ouvre nom, email et « Déconnexion » |

### Actions

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Boutons | Button | shadcn/ui | Variants `default`, `outline`, `ghost`, `secondary`, `destructive`, `link` ; taille `icon` pour les boutons à glyphe seul. `destructive` est une teinte `destructive/10` avec texte `--destructive`, pas un aplat rouge. Disposition dans un pied : § Conventions de Code > Règles |
| Bouton CTA hero | ShimmerButton | Magic UI | Hero de la landing uniquement, effet shimmer sur `--shine` |
| Téléchargement CV | DownloadCvButton | composant maison (Button) | Navbar, footer et `/a-propos`, en `variant="outline" size="sm"` dans les deux premiers |
| Connexion Google | GoogleSignInButton | composant maison (Button) | Seule action de la card de connexion admin, pleine largeur en `variant="outline" size="lg"`, logo Simple Icons en `data-icon="inline-start"`. `outline` : convention des boutons de connexion tiers |
| Actions de ligne | Button, composé par `RowActionButton` | shadcn/ui | `variant="ghost" size="icon-sm"`, glyphe seul sans `Tooltip` (§ Arbitrages, « Actions de ligne »), 20px de large pour que les deux actions se lisent comme une paire (§ Arbitrages, « Largeur de la colonne Actions »). Colonne Actions d'une liste, posée par `actionsColumn`, puis tuile d'asset. Le crayon mène à la page d'édition (`EditRowLink`) ou ouvre la modale (`EditRowButton`), la corbeille est le déclencheur par défaut de `ConfirmDeleteDialog`. Une fiche opposée ne garde que l'effacement de ses échanges, puis la suppression au terme de l'opposition |
| Création depuis une liste | Button + Link, composé par `CreateLinkButton` | shadcn/ui | `default` à icône `Plus` dans l'en-tête de page d'une liste dont la fiche s'édite en page (« Nouvelle opportunité ») ; `outline` `sm` dans une card rattachée qui crée sur une autre page (« Nouvel entretien », « Nouvelle opportunité ») |

### Formulaires

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Champs | Input, Textarea, Label | shadcn/ui | Formulaire contact et formulaires admin |
| Champ de formulaire | Label + contrôle, composé par `FormField` | composant maison | Libellé, contrôle, erreur sous le champ (§ Arbitrages, « Erreur de champ »), puis aide persistante (§ Scale Typographique), citée par l'`aria-describedby` du contrôle (id `<champ>-help`). Formulaires admin et contact |
| Champ texte (admin) | `FormField` + Input ou Textarea, composés par `FieldInput`, `NumberField` et `TextareaField` | composant maison | Tout champ texte d'un formulaire admin, en page comme en modale : câble seul `aria-invalid` et `aria-describedby` (erreur, aide). Un `Select` d'énumération passe par `SelectField`, dont la sentinelle « Non renseigné » ou « Non renseignée » s'accorde au nom du champ : `SelectField` la pose en première option sous `NONE_VALUE` dès que `noneLabel` est donné, le schéma la retraduit en `null` |
| Valeur en lecture seule | Input `readOnly`, composé par `ReadOnlyField` | composant maison | Champ grisé (`bg-muted text-muted-foreground`) plutôt qu'un texte, seul un champ étant labelable : valeurs reprises d'un lead dans le mode « Depuis un lead » d'un contact, que `MirroredField` substitue à la saisie, gardée montée et masquée (§ Arbitrages, « Saisie d'un formulaire à deux modes ») |
| Cases d'une énumération | Checkbox + Label, composés par `CheckboxGroupField` | shadcn/ui | Choix multiple parmi six valeurs au plus (§ Arbitrages) : types d'une entreprise ou d'un contact, formats d'un projet. Une case par valeur, son glyphe devant le libellé (§ Icônes), sur deux colonnes (trois dès `sm` pour les formats) |
| Sélecteur de personne | Combobox, composé par `PersonCombobox` sur `SingleSelectCombobox` | shadcn/ui | Apporteur d'une opportunité, lead d'origine d'un contact, personne d'une action, option rendue selon § Arbitrages. « Aucun » en tête quand le champ est facultatif ; l'entreprise passe par `CompanyCombobox`, « Aucune » retirée quand elle est obligatoire |
| Formulaire en page | Card + Button, composés par `FormPage` dans `AdminFormPage` | composant maison | Fiche longue (§ Arbitrages, « Page ou modale d'édition ») : titre, Annuler et Enregistrer en tête, colonne principale et colonne droite collante dès `lg` (`1.7fr` / `1fr`), cards rattachées en fin de colonne principale. Chaque card est une `FormCard`. `AdminFormPage` porte le padding de page, le `Suspense` et son squelette, le fil d'Ariane vivant dans la section chargée. Cards communes : `DetailsCard` (éditeur markdown, aide en description) et `NotesCard` (une ligne, 200 caractères, aide unique) |
| Formulaire contact | Card + Input + Textarea + Button + Label | shadcn/ui | Une colonne : localisation et réseaux en tête, puis formulaire et Calendly en onglets (§ Navigation). Sans abstraction Form : validation Zod dans la Server Action, confirmation par toast |
| Champs à choix fermé | Select, Checkbox | shadcn/ui | `Select` pour une liste fermée d'une dizaine d'options au plus (catégorie d'un tag, lignes par page), validée par Zod côté serveur. Le projet l'ouvre sous le champ, calé à gauche (`position="popper"`, `align="start"` par défaut), là où le registry l'ouvre par-dessus. Options d'une énumération par `EnumSelectItems` (§ Icônes). `Checkbox` : cases des filtres d'une liste, cochées sur toute la hauteur de leur ligne |
| Champ de recherche | Combobox (Popover + Command) | shadcn/ui | Composition, pas un composant du registry. Au-delà d'une dizaine d'options, là où taper vaut mieux que dérouler : icône d'un tag, parmi tout le registre. Panneau à la largeur du déclencheur (`w-(--radix-popper-anchor-width)`, `--radix-popover-trigger-width` n'existant pas), aligné à gauche. La coche se pilote par `data-checked` sur `CommandItem` : `Command` rend mal l'état sélectionné en `radix-nova`, issue [#9228](https://github.com/shadcn-ui/ui/issues/9228) ouverte au 29/08/2026. Une sélection multiple affiche ses choix en badges retirables sous le champ, pleine largeur au-dessus d'eux (§ Arbitrages, « Multi-sélection ») : `MultiSelectCombobox` pour les secteurs et localités d'une entreprise et les correspondants d'un entretien, `ProjectTagsField` pour les tags d'un projet, numérotés et réordonnables au glisser-déposer |
| Choix entre deux catégories | RadioGroup | shadcn/ui | Deux options côte à côte (§ Arbitrages, « Choix entre deux catégories ») : nature d'un projet à côté de son statut, entreprise qui mène un entretien, mode « Nouveau contact » ou « Depuis un lead » d'un contact |
| Sélecteur de date | Popover + Calendar, composé par `DatePicker`, posé par `DateField` | shadcn/ui | Base de tout champ date de l'admin : déclencheur `outline` pleine largeur à l'icône calendrier, panneau calé à gauche, `locale` française et semaine commençant lundi (le registry rend en anglais). Le champ qui l'emploie fixe le texte vide, le format affiché, les jours désactivés, le mois ouvert et le libellé d'effacement. Dates d'un projet (« En cours », « Aucune date de fin »), d'une action et d'un signal ; vendredi de clôture d'une revue hebdo, seuls les vendredis choisissables, affiché par le libellé de sa semaine |
| Date facultative | `DatePicker`, composé par `OptionalDateField` | shadcn/ui | Date seule effaçable depuis son panneau : assujettissement à la TVA, rencontre d'une personne, réponse à une action |
| Mois de démarrage | Popover + Button, composé par `MonthField` | shadcn/ui | Démarrage d'une opportunité : le bouton des champs date ouvre une grille des douze mois sous une année à faire défiler, avec « Effacer » ; valeur `AAAA-MM` entière ou vide |
| Champ date et heure | `DatePicker` + Input, composé par `DateTimeField` | shadcn/ui | Date et heure d'un entretien |
| Champ markdown (admin) | Editor, composé par `MarkdownEditorField` | Pages CMS Editor (Tiptap) | Détails des fiches et étude de cas d'un projet, saisie à la Notion, `format="markdown"`, images coupées ([ADR-024](adrs/024-editeur-markdown-admin.md)). Même échelle que la lecture en vue détail (§ Scale Typographique, Markdown admin) |

### Cards et grilles

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Cards services | Card | shadcn/ui | Grille uniforme, 2 colonnes dès `md` puis 3 dès `lg`, focus contenu textuel (landing + /services) |
| Cards projets | BentoCard | Magic UI | Showcase visuel dans BentoGrid (landing + `/projets`) |
| Bento Grid | BentoGrid + BentoCard | Magic UI | Grille asymétrique et son conteneur : cards projets (landing + `/projets`) et stack `/a-propos`. Conteneur visuel seul (`rounded-lg`, bordure, `shadow-sm`), l'affordance de survol vivant sur l'élément cliquable |
| Table simple | Table | shadcn/ui | Données figées, ni tri ni pagination : table de la politique de confidentialité, sur le site public |
| Raccourcis de l'accueil admin | Card + Link | shadcn/ui | Une card cliquable par section (glyphe et libellé), 2 colonnes dès `sm` puis 4 dès `lg`, survol des surfaces cliquables (§ États des Composants) |
| Table de liste (admin) | Table, Pagination | shadcn/ui | Recherche, filtres, tri et pagination sur un même jeu de lignes, en état local React et sans librairie de table à cette volumétrie, composés dans `DataTable`. Table bord à bord dans sa `Card` : 16px aux cellules de bord, 8px à l'intérieur, survol d'un bord à l'autre. Colonnes à largeur fixe (`table-fixed`, § Conventions de Code > Règles, Largeur d'une colonne de liste), texte long tronqué, première colonne en `TitleCell` (§ Références de fiche). Une liste dont l'ordre s'édite ouvre sur une colonne `#`, dont l'en-tête ramène à cet ordre ; dans cet ordre (ni tri, ni recherche, ni filtre), les lignes se regroupent sous une ligne de groupe `bg-muted/50` (libellé et compteur au registre Label) et se glissent-déposent dans leur groupe, la ligne déposée prenant la place de la cible. Tri : croissant, décroissant, ordre d'affichage, `aria-sort` sur le `th`. Pied sous la card, sur la rangée `xs` : compteur et lignes par page (5, 10, 25, 50, 100 ; 25 par défaut) à gauche, pager à droite. `Pagination` relaie la taille de `Button` ; `Select` reçoit du projet le palier `xs`, que le registry n'a pas |
| Barre d'outils de liste | Input + Button + Popover + Checkbox + Badge, composés par `OptionsPopover` | shadcn/ui | Au-dessus de la card de la table : recherche à loupe (320px au plus, valeur du design system, son texte d'aide tenant dans le champ), puis « Colonnes » et « Filtres » en `outline`, chacun portant en `Badge` `default` son compteur (colonnes masquables affichées, valeurs cochées). « Colonnes » n'apparaît que si l'écran déclare une colonne masquable. Leurs panneaux (`align="end"`, § Arbitrages, « Panneaux Filtres et Colonnes ») : une `Checkbox` par valeur appliquée au clic, sans option « Tous », compteurs facettés selon la recherche en cours, un bloc sans valeur non rendu ; pied « Réinitialiser » puis « Appliquer », qui referme (§ Conventions de Code > Règles, Pied d'action). Masquer une colonne la sort de la recherche et rend l'ordre d'affichage si elle portait le tri |
| Sélecteur de période | Select, composé par `PeriodSelect` | shadcn/ui | Choix unique avec valeur par défaut, `aria-label` « Période » : au-dessus du kanban des actions et de la vue Revue des revues hebdo. La table des actions filtre la période par sa facette, au même calcul « à N jours près » |
| Card de connexion admin | Card + Separator | shadcn/ui | Centrée en `max-w-sm` sur `/admin/login`. En-tête centré : logo, `Separator`, titre à l'échelle admin, `CardDescription`. Contenu : avis d'erreur éventuel puis bouton de connexion |
| Lignes rattachées | Link + `TruncateTooltip` + Button, composé par `RelatedLinksList` sur `RelatedLinkRow` | composant maison | Fil des fiches rattachées (§ Arbitrages, « Fil des fiches rattachées » et « Longueur d'une liste de fiches rattachées »), du plus récent au plus ancien. Une rangée par fiche : libellé en lien vers la fiche, méta tronquée sous `TruncateTooltip`, puis à droite `trailing` (date ou chiffre en `tabular-nums`) et `actions`, groupées sans gap comme dans la colonne Actions, pour un élément sans page propre (action, signal) dont `onClick` ouvre la vue détail en place. Le builder de lien de chaque fiche fournit son `marker`, glyphe de l'énumération en 14px ou point neutre, et `at`, la date qui la range sous son mois ; une fiche sans date reste sur le fil, sans en-tête |
| Fiches rattachées | Card, composé par `RelatedLinksCard` sur `RelatedLinksList` | shadcn/ui | Card d'une page de fiche (§ Arbitrages, « Élément rattaché à une fiche »), présente aussi en création sous la forme de `PendingRelatedCard` : vide, « Après l'enregistrement de … », bouton d'ajout `outline` désactivé. Le bloc de la vue détail reprend les mêmes lignes, sans la card |
| Fiches rattachées avec création | Card + Button, composé par `RelatedCreateCard` | composant maison | Compose `RelatedLinksCard`, `PendingRelatedCard` et `CreateLinkButton` : la card des liens et son bouton « Nouveau … » en `outline` `sm` quand la fiche existe, `PendingRelatedCard` en création. Entretiens et opportunités d'un lead, entretiens d'une opportunité |
| Tableau kanban | Kanban | ReUI | Pipeline des actions de prospection. **Headless** : colonne et carte composées en `Card` (colonne : icône du statut, libellé au registre Label, compteur en `Badge` `outline` ; carte `size="sm"`). Une seule rangée de colonnes de 13.75rem au moins, les 220px de la maquette, qui défile horizontalement, à la hauteur de l'écran (§ Arbitrages, « Hauteur d'un tableau kanban »). Le changement de statut s'enregistre au lâcher, Échap annule le geste. Aucune poignée de colonne, leur ordre étant fixe |
| Agenda mensuel | EventCalendar, composé par `AdminMonthCalendar` | ReUI | Calendriers des actions de prospection et des revues hebdo, sur une surface `bg-card` cerclée comme une `Card`. Vue mois seule (§ Arbitrages, « Sélecteur de vue d'un calendrier »), grille affichée même vide, en français, semaine au lundi, défilement avec la page. Une action ou une revue y occupe une journée entière, au jour de Paris, sa pastille teintée par son statut (§ Couleurs Sémantiques). Le clic sur un jour crée une action, ou ouvre ou crée la revue de sa semaine ; une action à faire se glisse vers un autre jour. Tire `ScrollArea` (shadcn) pour ses surfaces défilantes |

### Badges

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Badges Tag (technos/infra/outils/expertises) | TagBadge | shadcn/ui + @icons-pack/react-simple-icons + lucide-react | `variant="secondary"` + `border-border` portée par le CVA comme pour les badges meta, casse normale (noms de marque). Simple Icons pour technos/infra/outils, Lucide pour expertises, renderer choisi selon le préfixe `tag.icon` (`"simple-icons:*"` ou `"lucide:*"`). Cards projets, case studies et stack `/a-propos` |
| Badges Meta (format, entreprise, compteur, statut) | Badge, prop `meta` ; FormatBadges pour les formats | shadcn/ui | Type de projet (API, Web App…), nom de l'entreprise, précédé de son logo en 14px quand il existe, compteur de tags, statut "En cours". `meta` applique `uppercase tracking-wider` ; `variant="outline"`, `default` pour un état unique mis en avant. Une liste de badges en affichage s'arrête à trois puis « +N » en `outline`, muet sur la vitrine, relu au survol par `Tooltip` dans l'administration (`BadgeList`, § Arbitrages, « Badges tronqués ») |
| Valeur d'énumération | Badge + Lucide, composé par `EnumBadge` | shadcn/ui | Badge `secondary` d'une valeur d'énumération du CRM, son glyphe devant le libellé quand l'énumération en a (§ Icônes), sinon `labelBadge` ; en-tête de vue détail par `headerBadge` (§ Arbitrages, « En-tête d'une vue détail »). Le même glyphe précède l'option d'un `Select` (`EnumSelectItems`) |

### Feedback et chargement

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Feedback | Toast | shadcn/ui (Sonner) | Confirmation formulaire, échec de déconnexion admin. Dans l'admin, `useSaveFeedback` pose le toast d'enregistrement (§ Arbitrages), celui d'erreur et celui d'une fiche supprimée entre-temps, qui ramène à la liste |
| Avis | Alert | shadcn/ui | Avis persistant en tête d'écran : refus de connexion admin, en `variant="destructive"` avec `ShieldBan` pour un compte refusé et `CircleAlert` sinon. Une erreur de champ reste sous son champ (§ Formulaires) |
| Chargement | Skeleton, StackedSkeleton, DataTableSkeleton | shadcn/ui + composants maison | `StackedSkeleton` empile des `Skeleton` aux hauteurs passées en props : fallback de `<Suspense>` des pages publiques et des sections de l'accueil, d'`AdminFormPage` et de l'écran Assets. `DataTableSkeleton` reprend la barre d'outils, la card et les lignes d'une table de liste admin, en fallback de ses écrans |
| État vide | Empty, composé par `EmptyState` | shadcn/ui | Base vide et filtres ou recherche sans résultat d'une liste, de la grille d'assets et du kanban des actions (§ Arbitrages, « États vides ») : l'écran fournit icône, titre et texte de la base vide, `EmptyState` rend l'état filtré et son bouton « Réinitialiser les filtres » (`outline`, `sm`). Bordure pleine (`border-solid`), pas le `border-dashed` du registry, comme les autres surfaces admin ; aucune bordure dans une cellule de table |

### Overlays

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Panneau latéral | Sheet | shadcn/ui | Menu mobile, navigation admin au téléphone |
| Modales | Dialog, AlertDialog | shadcn/ui | `AlertDialog` pour confirmer une suppression, l'opposition d'une personne ou l'effacement de ses échanges, à la largeur du registry ; une modale de formulaire ou de lecture passe à 640px, pour tenir deux colonnes. Le pied court d'un bord à l'autre en bandeau `muted/50`. La confirmation porte `TriangleAlert` (32px) en `text-destructive` dans `AlertDialogMedia`, sans tuile (§ Arbitrages, « Icône de confirmation »), titre et texte alignés à gauche à toutes les largeurs. Une suppression refusée d'avance désactive en plus le bouton de suppression (§ Arbitrages, « Refus de suppression ») |
| Formulaire en modale | Dialog, composé par `FormDialog` et `FormDialogForm` | shadcn/ui | Saisie courte (action, signal, revue, tag, dépôt de fichier). Ouverte par son déclencheur ou par l'écran (« Modifier » d'une vue détail), repartant d'un formulaire neuf à chaque ouverture. Sous un plafond de `85svh` (`svh` et non `vh`, que la barre d'URL mobile fausse), les champs défilent seuls dans `DialogBody`, sur deux colonnes, en-tête et pied restant atteignables. Pied Annuler et Enregistrer (§ Arbitrages, « Bouton d'enregistrement ») |
| Vue détail (admin) | Dialog, composé par `DetailDialog` | shadcn/ui | Ouverte au clic d'une ligne de toute liste admin, hors colonne Actions et glisser-déposer, ou depuis une fiche rattachée, sur la liste de l'autre fiche. L'écran ne fournit que des données : image (`AssetTileLink`), titre, sous-titre, badges, blocs titrés (`TitledBlock`) séparés d'un `Separator`. Le composant en déduit la disposition : deux colonnes, une seule pour un bloc d'un champ, pleine largeur pour un texte long ou une liste de fiches rattachées, dernier champ impair seul à gauche ; libellé au registre Libellé de champ (§ Scale Typographique), omis quand le titre du bloc nomme le champ. Pied « Fermer » et « Modifier », qui referme puis passe la main à l'écran. En-tête, blocs et valeurs absentes : § Arbitrages |
| Consentement cookies | ConsentBanner, ConsentDialog | `@c15t/nextjs` | Bandeau au premier passage ; modale de préférences rouverte par « Gérer mes cookies » au footer (`OpenCookiePreferencesLink`), par la politique de confidentialité et par le widget Calendly bloqué (`OpenCookiePreferencesButton`) |
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
| Texte tronqué (admin) | Tooltip, composé par `TruncateTooltip` | shadcn/ui | Toute cellule ou libellé tronqué (`truncate`) d'une liste ou fiche admin : pose un `Tooltip` seulement si le texte déborde réellement, réévalué au redimensionnement. Aucune cellule n'est rendue focusable : le texte complet reste lisible par un lecteur d'écran, l'utilisateur clavier atteint la valeur via la vue détail au clic de ligne |
| Valeur absente (admin) | `EmptyValue` | composant maison | Tiret cadratin en `text-muted-foreground`, rendu par `DataTable` et `DetailDialog` pour toute valeur `null` (§ Arbitrages, « Valeur absente ») |
| Adresse web (admin) | `ExternalUrl` | composant maison | Lien `text-primary` vers un nouvel onglet, souligné au survol : site d'une entreprise, profil LinkedIn (§ Arbitrages, « Adresse web ») |
| Bloc titré (admin) | `TitledBlock` | composant maison | Titre au registre Label puis contenu, sur deux colonnes dès plus d'un élément : blocs d'une vue détail, panneaux Filtres et Colonnes |

### Références de fiche (admin)

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Lien vers une fiche | `RecordLink`, composé par `CompanyLink`, `PersonRecordLink` et `PersonLink` | composant maison | Entreprise ou personne, la même en colonne (`companyCell`) et en vue détail : logo de l'entreprise en 16px, puis le nom, un seul lien vers sa vue détail (§ Arbitrages, « Lien vers une fiche de l'admin »). Sans fiche à ouvrir, la référence reste en texte simple. `PersonLink` ajoute un `Badge` `outline` à une personne opposée |
| Première colonne d'une liste | `TitleCell` | composant maison | Titre en `font-medium`, puis sous-titre choisi par la liste (§ Scale Typographique, Aide et méta), en mono pour un slug, visuel facultatif à gauche (§ Arbitrages, « Première colonne d'une liste ») |
| Logo d'entreprise | `CompanyLogoTile` | composant maison | Pastille carrée à trois tailles : 16px devant une référence (`RecordLink`), 28px dans la première colonne des listes entreprises, leads et contacts (`TitleCell`, taille `md` du design system), 48px dans l'en-tête d'une vue détail, soit la hauteur du titre et du sous-titre réunis. Image entière sur fond neutre, dégradé quand le logo manque, comme une tuile d'aperçu |
| Image d'une vue détail | `AssetTileLink` | composant maison | Logo d'une entreprise ou couverture d'un projet, en 48px à gauche du titre, cliquable vers son fichier dans Assets quand il existe (§ Arbitrages, « Image d'identité d'une vue détail ») |

### Assets (admin)

| Catégorie | Composant | Librairie | Notes |
|-----------|-----------|-----------|-------|
| Grille d'assets | Card + Input + Popover + Checkbox + Empty + Pagination, composés par `AssetsBrowser` | shadcn/ui | L'écran Assets. Même barre d'outils qu'une liste admin, avec deux facettes (dossier de destination, nature image ou PDF), même état vide et même pied de pagination (§ Arbitrages), mais une grille de tuiles à la place de la table : une colonne au téléphone, jusqu'à cinq en `xl`. Chaque tuile porte ses actions de ligne (copier le chemin, supprimer) et sa rangée de rattachements (`BadgeList`). Le paramètre `q` de l'URL pose la recherche à l'ouverture, ce dont se sert la tuile d'une vue détail |
| Tuile d'aperçu | `AssetPreview` sur `AssetFrame` | composant maison | Vignette `aspect-video` bord à bord, puis le nom du fichier tronqué sous `TruncateTooltip` et son dossier parent, la clé complète au survol (§ Arbitrages, « Chemin sous un aperçu »). Image entière dans son cadre sur fond `muted`, dégradé `primary/20 → accent/20` pour un aperçu manquant (§ Arbitrages, « Aperçu d'un fichier ») ; un PDF affiche un glyphe. La variante `row` pose la vignette à gauche du nom, pour une ligne de vue détail |
| Image d'asset | `AssetImage` | composant maison (`next/image`) | Construit l'URL selon la clé, route publique ou route gardée, sans optimisation `next/image` sur une clé gardée (rule `nextjs/images`) |
| Sélecteur d'asset | Dialog + Input + Pagination, composés par `AssetPicker` | shadcn/ui | Choix d'un fichier depuis un formulaire, sous un plafond de `85svh` : tuiles d'au moins 140px qui remplissent la modale de 640px, plutôt que les paliers de l'écran Assets, faits pour la largeur de la page. La grille défile seule, même pied de pagination, sans facettes. Le choix ne s'applique qu'au bouton « Choisir » |
| Dépôt de fichier | Dialog + Select + Input, composés par `AssetUploadDialog` dans `FormDialog` | shadcn/ui | `Select` pour le dossier de destination, sous-dossier affiché seulement quand le dossier en attend un, nom du fichier, puis zone de dépôt par glisser-déposer ou sélecteur natif, filtrés sur les extensions autorisées. Bouton d'enregistrement en `Upload` (§ Arbitrages, « Bouton d'enregistrement ») |
| Fichier d'un formulaire | `AssetField` sur `AssetFrame` | composant maison | Logo d'une entreprise, couverture d'un projet : aperçu dans le cadre d'`AssetPreview`, nom du fichier dessous, puis la rangée de boutons, « Retirer » en icône à droite (§ Arbitrages, « Fichier d'un formulaire ») |

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
| Réglage appliqué à l'instant | Switch | shadcn/ui | Une bascule qui s'engage sans passer par « Enregistrer ». Un choix soumis par un formulaire reste un `RadioGroup` (§ Arbitrages, « Choix entre deux catégories ») |
| Graphiques | Chart | shadcn/ui (Recharts) | Audience, indicateurs CRM, chiffre d'affaires. Couleurs de série : `--chart-*` et § Palette de Couleurs > Règles |
| Indicateur circulaire | ProgressCircle | composant maison (conventions Tremor) | Anneau à valeur unique (budget consommé, taux de remplissage), métrique à côté. SVG maison, pas une dépendance |
| Effets hero | MacbookScroll, Spotlight, Hero Parallax, Aurora Background, Background Beams | Aceternity UI | Candidats |
| Effets visuels | Shine Border, Particles, Meteors, Magic Card | Magic UI | Candidats |
| Typographie display | Text Reveal | Magic UI | Candidat (au scroll) |
| Typographie display (alt) | Text Generate Effect, Flip Words | Aceternity UI | Candidats |

## États des Composants

> Les composants shadcn/ui, Magic UI et Aceternity UI (Button, BentoCard, ShimmerButton, etc.) ont leurs états et animations **intégrés**. Les guidelines ci-dessous s'appliquent uniquement aux composants **custom** non-lib créés from scratch.

| État | Style / Comportement | Contexte |
|------|---------------------|----------|
| Hover (surfaces cliquables custom) | Léger scale `1.01` + ombre + transition `300ms ease-out` | Cards de la vitrine et raccourcis de l'accueil admin (`shadow-xl`), petits éléments type pastille (`shadow-md`) |
| Hover (surfaces custom non cliquables) | Contour porté à `primary/40`, transition `300ms ease-out` | Cards services et tuiles de stack : le contour se colore, la surface reste en place, l'action vivant dans le bouton de la card |
| Hover (tuile ou zone cliquable admin) | Contour porté à `border-primary` | Image d'une vue détail, aperçu d'asset en ligne de vue détail, zone de dépôt d'un fichier |
| Hover (liens d'interface) | Transition couleur `150ms` vers `text-primary` | Navbar, indicateur de défilement du hero, entreprise d'une étude de cas |
| Hover (liens discrets) | Transition couleur `150ms` de `text-muted-foreground` vers `text-foreground` | Navigation légale du footer, retour d'une étude de cas, bande de stack du CTA final |
| Hover (liens soulignés) | Soulignement, couleur inchangée | Lien seul sur sa ligne en `text-primary`, lien vers une fiche admin en couleur du texte (§ Conventions de Code > Règles, Liens) |
| Actif (lien de navigation) | `font-semibold text-primary` ; `font-semibold` seul dans le sélecteur de langue, où la couleur marquerait un lien ; filtre de `/projets` souligné (`border-b-2 border-primary`) en `font-medium text-foreground` | Item de la navbar correspondant à la route courante, locale courante du sélecteur, filtre courant |
| Ligne de table cliquable | `cursor-pointer`, contour de focus en retrait (`focus-visible:-outline-offset-2`) : la table défile dans un conteneur qui rognerait un contour extérieur | Listes admin à vue détail |
| Glisser-déposer | Élément glissable en `cursor-grab`, badge de tag saisi en `cursor-grabbing` à 40 % d'opacité. Cible : fond `bg-muted` sur une ligne de table, anneau `ring-2 ring-primary ring-offset-1` sur une colonne de kanban ou un badge de tag (§ Arbitrages, « Cible d'un glisser-déposer ») | Listes à ordre éditable, kanban des actions, tags d'un projet |
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
- Une énumération du CRM qui a sa table de glyphes Lucide (LinkedIn en logo de marque) les montre partout où sa valeur s'affiche : badge, option de `Select` (`EnumSelectItems`), case d'une grille de `Checkbox`, comme les emojis des selects Notion. Seul le panneau des filtres d'une liste reste en libellé seul : case, libellé et compteur y tiennent déjà la ligne. « Autre » n'en a pas, et une énumération sans table (taille, secteurs, zones) n'en reçoit pas : on n'invente pas de glyphe à une classification nominale. La table vit à côté des libellés de chaque domaine (`*_ICONS` près de `*_LABELS`), jamais dans l'écran

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
| CTA "Voir la démo" (case study) | BorderBeam rotation bordure, `colorFrom=var(--shine)`, `colorTo=transparent`, `borderWidth=2`, `duration=7s`, `size=40` | Magic UI | Always-on (mise en valeur du CTA principal, uniquement sur bouton démo, pas github) |
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
- ✅ **Liens** : un lien dans du texte courant (paragraphes des pages légales et du contact) porte `text-primary` et un soulignement permanent léger (`decoration-primary/40`, `underline-offset-4`), plein au survol : il doit se repérer sans la couleur (WCAG 1.4.1, le vert du mode sombre ne contraste pas assez avec le texte). Un lien seul sur sa ligne (liste « Liens » d'un case study, adresse sous un libellé côté admin) garde la couleur et ne se souligne qu'au survol, sa place disant déjà ce qu'il est. Ces deux classes vivent ensemble dans `typography.ts`. Un lien vers une autre fiche de l'admin prend la couleur du texte, précédé de son visuel, puis se souligne au survol : logo d'une entreprise ou d'une personne (`RecordLink`), glyphe du fil pour une fiche rattachée. Le vert reste aux liens qui sortent de l'admin. Les liens d'interface (nav, CTA, boutons, cards) se distinguent par la couleur seule (§ États des Composants), sur le reset global de `globals.css`
- ✅ **Valeurs numériques** : ce qui se compare s'aligne à droite en `tabular-nums` (montants, quantités, taux, durées), pour que les ordres de grandeur se lisent en colonne. Sans changer de famille : Geist Sans porte des chiffres tabulaires, le mono gardant ses usages (§ Police Monospace). Ce qui se lit comme une étiquette reste à gauche : années, dates, numéros de facture, identifiants, une date gardant `tabular-nums`. `NumberTicker` l'applique déjà aux chiffres clés de `/a-propos`
- ✅ **Pied d'action** : un pied de modale, de panneau ou d'en-tête de formulaire ne porte qu'un seul bouton `default` sauge, celui de l'action principale, placé en dernier à droite ; ce qui l'accompagne est `outline` ou `ghost`, comme « Réinitialiser » avant « Appliquer » dans un panneau
- ✅ **Largeur des champs** : tout contrôle de saisie occupe la largeur de sa colonne, texte, liste déroulante, recherche ou date, pour que les champs d'une rangée s'alignent. À poser explicitement, plusieurs contrôles du registry se dimensionnant sur leur contenu
- ✅ **Largeur d'une colonne de liste** : un multiple de 8, au plus juste entre l'en-tête (icône de tri comprise) et le contenu des lignes à 95 %, mesurés sur les vraies données de la vue complète. Une colonne de badges prend son badge le plus large, qui ne se tronque ni ne passe à la ligne ; un texte long garde un plafond et se tronque ; un en-tête de plusieurs mots plus long que son contenu passe sur deux lignes plutôt que d'élargir la colonne. Les largeurs vivent à côté de chaque table, les communes (`#`, Actions) dans `src/lib/admin/table-widths.ts`
- ✅ **Texte trop long** : ce qui ne tient pas dans sa colonne se tronque par une ellipse, relue au survol par `Tooltip` côté admin (§ Contenu et texte), muette sur la vitrine. Le `placeholder` fait exception, il doit tenir entier dans son champ
- ✅ **Curseur** : le curseur texte ne paraît que sur les champs de saisie, le pointeur sur ce qui se clique, la flèche partout ailleurs. Posé une fois en `@layer base` dans `globals.css`, jamais composant par composant : hérité par défaut, le curseur texte fait passer un contenu statique pour éditable

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

- **Design system** : [Thibaud Geisler Design System](https://claude.ai/design/p/75a17be1-6ed8-4e44-9517-0b3184998c0c) : composants, fiches d'usage, cartes et kit du site public. Synchronisé depuis le dépôt par `/design-sync`, fait foi sur les composants
- **Maquette** : [Espace Admin](https://claude.ai/design/p/d2229cd8-49ca-4774-b7c8-0fdc88b83103) : écrans de l'espace admin, fait foi sur l'apparence des écrans
- **Lecture locale** : export dans `.design-sync/maquette/` et `.design-sync/design-system/`, ignorés par git, procédure dans `.design-sync/NOTES.md`. À refaire quand la maquette évolue : sa lecture distante est tronquée au-delà de 256 Kio, sans erreur

### Arbitrages

Écarts à la maquette ou au design system tranchés par le propriétaire. Ils priment sur eux pour tous les écrans.

- **Espacement des formulaires** : 16px (`gap-4`) entre les champs et entre les rangées, en modale comme en page, là où la maquette en montre 12. Maquette réalignée le 2026-10-01
- **Erreur de champ** : `text-sm text-destructive` sous le champ, là où la maquette l'écrit en 12px. Maquette réalignée le 2026-09-19
- **Refus de suppression** : remplace le texte de la confirmation, en `text-destructive` dès l'ouverture, là où la maquette ajoute un `Alert` sous le texte. Maquette réalignée le 2026-09-19
- **Icône de confirmation** : `TriangleAlert` sans tuile, là où la maquette la pose sur un fond `muted`. Maquette réalignée le 2026-09-19
- **Libellés bilingues** : en toutes lettres, « Nom (français) », là où la maquette écrit « Nom (FR) ». Maquette réalignée le 2026-09-19
- **Séparateur dans un libellé** : deux-points, le tiret cadratin étant réservé à la valeur absente, là où la maquette emploie un tiret cadratin. Maquette réalignée le 2026-10-02
- **Titre d'une modale de modification** : nomme l'élément, « Modifier Agents IA », là où la maquette écrit « Modifier le tag ». Maquette réalignée le 2026-10-02
- **Description d'un formulaire en modale** : dit l'action, « Créer un tag pour catégoriser les projets. », là où la maquette y explique la langue des noms. Maquette réalignée le 2026-10-02
- **Valeurs métier** : celles de la base (catégories, statuts, formats, ordre d'affichage à partir de 1), là où la maquette montre des valeurs d'exemple. Maquette réalignée le 2026-09-19
- **Choix des colonnes** : proposé par `DataTable` sur toute liste qui déclare des colonnes masquables, là où la maquette ne le montre que sur certaines listes. Maquette réalignée le 2026-10-01
- **Colonnes par vue** : la vue « tout » (« Tous », « Toutes », « Journal ») affiche toutes ses colonnes et toutes ses facettes ; une vue filtrée ne masque que les colonnes que son filtre rend constantes ou toujours vides et verrouille la facette correspondante, tout le reste restant visible (Projets exclus : colonnes orientées vitrine), là où la maquette en masque sur toutes les vues (amendé le 2026-10-14, c'était « les autres autant ou moins selon leur objet, en masquant celle qu'elles filtrent sur une seule valeur » ; décision du propriétaire du 2026-10-14)
- **Facette d'une vue filtrée** : la facette de la valeur que filtre la vue disparaît avec sa colonne, là où la maquette la garde (décision du 2026-10-12). Maquette réalignée le 2026-10-13
- **Badges tronqués** : trois puis un « +N » (`BadgeList`), tous en vue détail et dans un champ d'édition, là où la maquette en montre deux. Maquette réalignée le 2026-10-01
- **Valeur d'énumération** : `Badge` `secondary` en colonne, carte et vue détail ; nature d'un projet et catégorie d'un tag en `Badge` `outline` `meta`, comme les badges d'en-tête, et statut d'un projet en puce colorée dans sa colonne, là où la maquette alterne badge et texte. Maquette réalignée le 2026-10-02
- **Valeur absente** : `null`, rendu par `EmptyValue` dans `DataTable` et `DetailDialog`, jamais un tiret écrit par l'écran, là où la maquette alterne tiret plein, tiret gris et cellule vide. Maquette réalignée le 2026-10-02
- **Adresse web** : lien `ExternalUrl` vers un nouvel onglet, là où la maquette l'écrit en texte. Maquette réalignée le 2026-10-02
- **Texte tronqué** : `TruncateTooltip`, infobulle seulement si le texte déborde, là où la maquette n'en pose aucune. Maquette réalignée le 2026-10-02
- **Actions de ligne** : sans `Tooltip`, l'`aria-label` nommant l'élément, là où la maquette en pose un sur chaque action. Maquette réalignée le 2026-10-02
- **Largeur de la colonne Actions** : 80px sur toute liste, l'en-tête « Actions » la fixant au-dessus de ses deux `RowActionButton` de 20px, là où la maquette donne 120px aux leads, aux contacts et aux actions de prospection, de 76 à 88px ailleurs (mesure du 2026-10-13). Maquette réalignée le 2026-10-13
- **Un même mot pour une même donnée** : colonne, vue détail et formulaire lisent la même constante `*_FIELD_LABELS`, « Nature » pour client ou perso, là où la maquette abrège en colonne. Maquette réalignée le 2026-10-01
- **Panneaux Filtres et Colonnes** : `OptionsPopover`, blocs `TitledBlock` sur deux colonnes dès plus d'un élément, `Separator` entre deux axes, là où la maquette empile une liste plate. Maquette réalignée le 2026-10-01
- **États vides** : `EmptyState` pour toute liste et la grille d'assets, l'écran fournissant la base vide, l'état filtré étant commun avec « Réinitialiser les filtres », là où la maquette écrit ce bloc à la main par écran. Maquette réalignée le 2026-10-01
- **Pied de pagination** : identique sur toute liste, grille de tuiles comprise, sélecteur de lignes par page inclus, là où la maquette l'omet sous la grille d'assets. Maquette réalignée le 2026-10-01
- **Liste au téléphone** : la même table, qui défile horizontalement, là où la maquette dessine des cartes empilées pour les projets. Maquette réalignée le 2026-10-01
- **Clic sur une ligne** : ouvre la vue détail (`DetailDialog`) dont « Modifier » mène à l'édition, le crayon de la ligne y menant directement, là où la maquette ne câble la vue détail que sur certains écrans. Maquette réalignée le 2026-10-02
- **Clic sur une fiche rattachée** : une action ou un signal, qui s'éditent en modale, ouvrent leur vue détail en place, sans quitter la fiche, là où la maquette ouvre l'autre fiche à la place de la vue courante (décision du 2026-10-12). Maquette réalignée le 2026-10-13
- **Page ou modale d'édition** : page en cards pour une fiche longue ou qui regroupe d'autres éléments (entreprise, projet, lead, contact, opportunité, entretien), modale pour une saisie courte (action de prospection, signal, revue hebdo, tag), là où la maquette ouvre lead, contact et entretien en modale. Maquette réalignée le 2026-10-01
- **Élément rattaché à une fiche** : créé, modifié et supprimé dans une card de la page de sa fiche, dans la colonne principale sous la card Détails, présente aussi en création (vide, création désactivée), jamais depuis une ligne de liste, la vue détail restant une lecture, là où la maquette n'a pas de card pour l'élément rattaché sur la page de sa fiche. Maquette réalignée le 2026-10-01, placement le 2026-10-02
- **Blocs d'une vue détail** : ceux des cards du formulaire, mêmes titres et libellés, sans les champs portés par l'en-tête, dans l'ordre logique de la fiche plutôt que celui de la page d'édition (champs courts, puis Notes, puis Détails, puis fiches rattachées), un texte long (étude de cas) résumé à sa présence et sa taille, là où la maquette montre une grille plate et place Détails avant les blocs de champs. Maquette réalignée le 2026-10-01, puis le 2026-10-13 pour l'ordre propre à la vue détail (décision du 2026-10-12). Une donnée calculée ou une fiche liée, sans champ dans le formulaire (Travaillée, Dernier contact de sa part, fiche lead d'un contact, conditions de l'opportunité d'un entretien, entretien précédent), s'y ajoute en lecture dans le bloc qu'elle complète, comme dans la maquette (décision du 2026-10-12)
- **En-tête d'une vue détail** : le même pour toutes les fiches, construit par le composant à partir de données (image, titre, sous-titre, badges), jamais de JSX propre à un écran. Badges `outline` `meta` à droite du titre, statut d'abord puis nature ou catégorie. Sous-titre court choisi par l'écran : le slug pour une entreprise, un projet ou un tag, sinon poste, rôle ou date. L'ordre d'affichage d'un projet ou d'un tag redevient une ligne de son bloc Identité, sans mention du nombre de projets d'une entreprise, là où la maquette met en sous-titre l'ordre, la nature et la durée d'un projet ou le nombre de projets d'une entreprise (décision du 2026-10-12). Maquette réalignée le 2026-10-13 sur le portfolio et le CRM
- **Bloc vide d'une vue détail** : toujours affiché, ses valeurs absentes rendues par `EmptyValue`, pour que la disposition de la modale ne change jamais d'une fiche à l'autre, là où la maquette masque les blocs sans donnée (notes, détails, entité légale). Même règle pour un champ que le formulaire n'affiche que sous condition (issue d'un entretien fait, réponse reçue d'une action) : la vue détail le garde, vide (décision du 2026-10-12). Maquette réalignée le 2026-10-13 sur le portfolio et le CRM
- **Image d'identité d'une vue détail** : le logo d'une entreprise et la couverture d'un projet passent à gauche du titre de la vue détail, en tuile carrée de 48px cliquable vers son fichier dans Assets quand il existe, sans bloc dédié, là où la maquette en fait un bloc Logo ou un bloc Couverture (couverture : décision du 2026-10-12). Maquette réalignée le 2026-10-13
- **Lien d'une fiche rattachée** : `RelatedLinksList`, chaque ligne menant à la vue détail de l'autre fiche, là où la maquette les écrivait en texte. Maquette réalignée le 2026-10-02
- **Fil des fiches rattachées** : un fil chronologique, quel que soit leur nombre, une seule rangée par fiche, date ou chiffre à droite, glyphe de l'énumération sur le fil, groupé par mois pour les fiches datées (actions, signaux, entretiens, opportunités datées par leur début de mission sinon leur création, leads d'une entreprise datés par leur rencontre sinon leur création), là où la maquette les liste à plat, la date sur une seconde ligne (décision du 2026-10-13). Maquette réalignée le 2026-10-13
- **Longueur d'une liste de fiches rattachées** : cinq rangées, puis « Voir plus (N restants) » par cinq et « Voir moins », en vue détail comme en card de page, là où la maquette les affiche toutes. Ni filtre ni bloc repliable (décision du 2026-10-13). Maquette réalignée le 2026-10-13
- **Lien vers une fiche de l'admin** : couleur du texte, soulignement au survol, précédé de son visuel (logo de l'entreprise, ou celui de l'entreprise d'une personne), le même en colonne et en vue détail, là où la maquette le met en vert. Le vert reste aux liens externes (décision du 2026-10-13). Maquette réalignée le 2026-10-13
- **Première colonne d'une liste** : `TitleCell`, le titre puis un sous-titre choisi par la liste (slug en mono, entreprise d'une personne), un visuel facultatif à gauche, là où la maquette donne au logo, au slug et à l'entreprise d'une personne leurs propres colonnes. Leads et contacts n'ont pas de colonne Entreprise (décision du 2026-10-13). Maquette réalignée le 2026-10-13 sur le portfolio et le CRM
- **Date et heure** : « 01/12/2025 · 11:00 », le point médian séparant les deux comme toute paire de l'admin, là où la maquette les sépare d'une espace (décision du 2026-10-13). Maquette réalignée le 2026-10-13
- **Date d'une action de prospection** : le jour seul, sans heure, rangé à minuit heure de Paris (`DateField`, `z.iso.date` puis `zonedDayStart`) et affiché en journée entière dans le calendrier (`allDay`) ; en quittant « À faire » sans changer de jour, l'action prend l'instant réel d'envoi (`applyStatusRules`), là où la maquette saisit et affiche une heure (décision du 2026-10-14)
- **Colonnes de personne** : mêmes largeurs dans les leads et les contacts ; email, téléphone et LinkedIn à 168px, la largeur de LinkedIn, comme le site web d'une entreprise, là où la maquette donne 200px à l'email, 140px au téléphone et 150px au site web (décision du 2026-10-13). Maquette réalignée le 2026-10-13
- **Confirmation de suppression** : `ConfirmDeleteDialog`, titre qui nomme l'élément, « Supprimer « Agents IA » ? », bouton « Supprimer », refus métier en `text-destructive` à la place de la description, là où la maquette écrit « Supprimer le tag ». Maquette réalignée le 2026-10-01
- **Toast d'enregistrement** : « <Élément> créé » à la création, « <Élément> mis à jour » à la modification, accordé à l'élément (« Action créée »), là où la maquette écrit « Action enregistrée » (décision du 2026-10-08). Maquette réalignée le 2026-10-13
- **Bouton d'enregistrement** : icône `Save`, ou `Upload` pour un dépôt, en modale comme en page, là où la maquette ne la met qu'en page. Maquette réalignée le 2026-10-02
- **Deux champs courts d'une même card** : côte à côte en `sm:grid-cols-2`, là où la maquette les empile parfois. Maquette réalignée le 2026-10-01
- **Ordre d'un formulaire** : aucun champ seul sur une demi-ligne (pleine largeur sinon), nom ou titre d'abord et avant le slug, puis rattachements, qualification, chiffres, dates, textes longs, les formulaires semblables sur la même grille, là où la maquette laissait des champs orphelins et posait le slug avant le nom. Maquette réalignée le 2026-10-02
- **Card Détails ou Notes** : son titre sert de libellé au champ, sans `Label` répété dessous, là où la maquette répétait « Détails ». Maquette réalignée le 2026-10-02
- **Contenu de Détails** : du texte libre seulement. Une donnée qui a son champ ou sa fiche (signal, action, date de rencontre, notes) n'y figure jamais, ni dans les gabarits ni dans les fiches reprises de Notion ; ce qui n'a aucun champ entre en puce libellée dans Contexte, là où la maquette ne tranche pas (décision du 2026-10-12). Maquette réalignée le 2026-10-13
- **Gabarits de Détails** : lead en Contexte, puis Hypothèse / Angle en outbound, choisi à la sélection de l'origine ; contact en Profil, Relation (LinkedIn, email et téléphone ont leurs champs, pas de bloc Liens) ; une personne lead et contact suit le gabarit contact ; à la promotion, un Détails resté au gabarit lead est remplacé, un texte saisi gardé, là où la maquette pose Hypothèse / Angle avant Contexte sur tout lead (décision du 2026-10-12, gabarit contact et promotion le 2026-10-13). Maquette réalignée le 2026-10-13
- **Aide de l'éditeur Détails** : en description de la card, sous son titre, sur toute page en cards, là où la maquette la met sous l'éditeur sur le lead (décision du 2026-10-06). Maquette réalignée le 2026-10-13
- **Card Identité d'une personne** : sans description, toute entreprise venant du CRM, là où la maquette écrit « L'entreprise vient du CRM. » sous le titre (lead, contact) (décision du 2026-10-06). Maquette réalignée le 2026-10-13
- **Notes** : `Input` d'une ligne, aide « Une ligne de marqueurs, séparés par | » identique partout, là où la maquette mêlait une zone de texte « Notes libres » et des aides différentes. Maquette réalignée le 2026-10-02
- **Aide d'un champ** : jamais une évidence ni une unité (« De 0 à 10. », « En euros HT par jour. ») ; l'unité passe dans le libellé, « Durée (mois) », là où la maquette les écrivait sous le champ. Maquette réalignée le 2026-10-02
- **Glyphe d'une valeur d'énumération** : glyphe Lucide dans le badge et devant l'option du `Select` (§ Icônes), là où la maquette n'en montrait aucun. Maquette réalignée le 2026-10-02
- **Résumé d'une saisie** : aucun texte qui répète les champs au-dessus, là où la maquette rappelle la période sous les dates. Maquette réalignée le 2026-10-01
- **Choix entre deux catégories** : deux `RadioGroupItem`, le `Switch` étant réservé à un réglage appliqué à l'instant, là où la maquette met un `Switch` sur la nature d'un projet. Maquette réalignée le 2026-10-01
- **Libellés d'un choix à deux catégories** : formes courtes de l'énumération, « Client » et « Perso », là où la maquette écrit « Projet client ». Maquette réalignée le 2026-10-01
- **Choix multiple parmi des valeurs fixes** : grille de `Checkbox` jusqu'à six valeurs, Combobox à badges au-delà, là où la maquette ne tranche pas. Maquette réalignée le 2026-10-01
- **Multi-sélection** : champ de recherche pleine largeur, choix en badges retirables dessous, là où la maquette les pose côte à côte. Maquette réalignée le 2026-10-01
- **Rang d'un élément réordonnable** : préfixe du badge en `font-mono text-[10px]`, là où la maquette pose une pastille `bg-muted` de 18px. Maquette réalignée le 2026-10-01
- **Cible d'un glisser-déposer** : anneau `ring-primary` sur une colonne de kanban ou un badge de tag survolés, fond `bg-muted` sur une ligne de table, dont la table qui défile rognerait l'anneau, là où la maquette ne marque que l'élément déplacé. Maquette réalignée le 2026-10-01, ligne de table le 2026-10-13
- **Titre d'une card de formulaire** : nomme son contenu réel, « Liens » sur le projet, là où la maquette écrit « Avancement ». Maquette réalignée le 2026-10-01
- **Rangée de rattachement d'une tuile** : réservée sur toutes les tuiles, icône de lien et filet toujours visibles, là où la maquette la masque sans référence. Maquette réalignée le 2026-10-01
- **Aperçu d'un fichier** : image entière dans son cadre sur fond neutre, le dégradé réservé à l'aperçu manquant, là où la maquette montre un dégradé partout. Maquette réalignée le 2026-10-01
- **Chemin sous un aperçu** : dossier parent seul, chemin complet au survol, là où la maquette écrit le chemin complet. Maquette réalignée le 2026-10-01
- **Menus du champ markdown** : libellés en français, menu « / » et sélecteur de bloc gardant toutes les entrées de l'éditeur (Texte, Titre 1 à 3, Liste à puces, Liste numérotée, Liste de tâches, Tableau, Citation, Bloc de code), là où le design system ne montre que titres, listes et citation (décision du 2026-10-05). Design system réaligné le 2026-10-13
- **Fichier d'un formulaire** : `AssetField` pour le logo d'une entreprise et la couverture d'un projet, aperçu entier dans son cadre sur fond neutre (`AssetFrame`, le cadre d'`AssetPreview`), nom du fichier dessous, boutons sur une rangée : les façons de poser le fichier (choisir, récupérer depuis le site), puis « Retirer » en icône `X` à droite, là où la maquette borne l'image à une fraction du cadre et n'écrit la légende que sur le logo (décision du 2026-10-06, rangée précisée le 2026-10-12). Maquette réalignée le 2026-10-13
- **Hauteur d'un tableau kanban** : le tableau remplit la hauteur de l'écran sous l'en-tête, colonnes pleine hauteur même vides, cartes qui défilent dans leur colonne (`overflow-y-auto`), scrollbar masquée par `no-scrollbar` comme celle du menu latéral, la page ne défilant jamais, là où la maquette donne aux colonnes la hauteur de leur contenu (décision du 2026-10-08). Maquette réalignée le 2026-10-13
- **Sélecteur de vue d'un calendrier** : absent tant que le calendrier n'a qu'une vue (`showViewSwitcher={false}`), là où la maquette montre un bouton « Mois » désactivé (décision du 2026-10-09). Maquette réalignée le 2026-10-13
- **Bouton d'ajout d'un calendrier** : le bouton de création de l'en-tête de page et le clic sur un jour, aucun bouton « Ajouter » dans la barre du calendrier, là où la maquette en pose un (décision du 2026-10-09). Maquette réalignée le 2026-10-13
- **Opposition d'un contact** : aucun bouton « Ne plus contacter » sur la page d'un contact, aucune ligne réduite « Ne plus contacter » dans Contacts, l'opposition se posant depuis la fiche lead et retirant le rôle Contact, là où la maquette montre le bouton sur la page contact, la ligne réduite et l'avertissement de suppression d'un contact opposé (décision du 2026-10-09). Maquette réalignée le 2026-10-13
- **Autre rôle d'une personne** : un champ « Fiche lead » ou « Fiche contact » dans le bloc Identité, logo de son entreprise et nom, cliquable vers l'autre vue détail, en vue détail comme en lecture seule sur la page de modification, là où la maquette en fait un bloc Pipeline ou Réseau à part (décision du 2026-10-13). Maquette réalignée le 2026-10-13
- **Option d'un sélecteur de personne** : nom puis entreprise en `text-muted-foreground`, sans suffixe de rôle, là où la maquette écrit « Nom · Entreprise · Lead » dans le sélecteur « Depuis un lead » (décision du 2026-10-09). Maquette réalignée le 2026-10-13
- **Apostrophe d'un texte d'interface** : apostrophe droite (`'`), là où la maquette écrit l'apostrophe typographique (`’`) (décision du 2026-10-09). Maquette réalignée le 2026-10-13
- **Saisie d'un formulaire à deux modes** : ce qui a été saisi dans un mode reste en place quand on passe à l'autre puis qu'on revient, là où la maquette vide les champs de « Nouveau contact » au retour depuis « Depuis un lead » (décision du 2026-10-09). Maquette réalignée le 2026-10-13
- **Vocabulaire du domaine** : « opportunité » (placeholders des combobox, messages de recherche et de liste vide), là où la maquette écrit encore « mission » dans les champs et les messages du formulaire d'entretien (décision du 2026-10-11). Maquette réalignée le 2026-10-13
- **Libellés du CRM** : « Localité », « Localités » au pluriel, pour l'énumération des zones, « Actions » pour le compte d'actions d'un lead, « Jours par semaine » pour le champ que la colonne « Rythme » fusionne avec les jours sur site, là où la maquette écrit « Zones », « Relances » et « Rythme » (décision du 2026-10-12). Maquette réalignée le 2026-10-13
- **Ordre d'un sous-menu** : les vues de travail d'abord, la vue complète (« Toutes », « Tous », « Journal ») en dernier, sur toute section, là où la maquette met la vue complète en tête pour Entreprises et Projets (décision du 2026-10-12). Maquette réalignée le 2026-10-13
- **Marquer fait** : aucun bouton de ligne, le statut d'une action changeant par le formulaire ou le Kanban, là où la maquette pose « Marquer fait » sur la ligne d'une action à faire (retrait du 2026-10-13, consigné le 2026-10-14)
- **Titres des vues entreprises** : « Entreprises de recrutement » et « Entreprises prospects », là où la maquette titre « Recrutement » et « Prospects » (décision du 2026-10-14)
- **Sous-titre de la vue À venir des entretiens** : « Ceux qui restent à tenir, les retards d'abord puis le prochain. », la vue gardant les entretiens planifiés en retard, là où la maquette écrit « le prochain en premier » (décision du 2026-10-14)
- **Carte d'action d'une personne opposée** : visible et glissable dans le Kanban comme dans le calendrier, le serveur refusant le déplacement (`assertProspectionAllowed`) : la carte revient à sa place et un toast d'erreur dit l'opposition, là où la maquette ne tranche pas (décision du 2026-10-14)

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
- [Radix UI](https://www.radix-ui.com) : primitives accessibles sous-jacentes à shadcn/ui
- [Geist Font](https://vercel.com/font) : polices Geist Sans et Geist Mono (Vercel)
- [Sansation](https://fonts.google.com/specimen/Sansation) : police display, par Bernd Montag, sous licence OFL
- [Realtime Colors](https://www.realtimecolors.com) : visualisation palette en contexte réel
