---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "page-services"
goal: "Livrer la page publique /services présentant les 3 offres (IA & Automatisation, Développement Full-Stack, Formation IA) avec CTA par service."
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-04-24"
---

# Page `/services` : 3 offres avec CTA

## Scope

Remplacer le placeholder actuel de `src/app/[locale]/(public)/services/page.tsx` par une vraie page présentant les 3 offres du portfolio (IA & Automatisation, Développement Full-Stack, Formation IA), via un composant `ServiceCard` réutilisable, avec contenu i18n dans `messages/*.json`, metadata SEO localisée (déjà câblée dans le namespace `Metadata`) et animation d'entrée scroll-driven sur les cards. Chaque card pointe vers `/contact?service=<slug>` pour permettre à Feature 4 (formulaire contact) de pré-remplir un champ "Sujet" à partir du query param.

**Exclu** : formulaire contact + Server Action SMTP (Feature 4) ; hero effect Aceternity/Magic UI sur cette page (réservé à la home `/`) ; rédactionnel commercial final des offres (les clés i18n sont mises en place avec un contenu provisoire à affiner par le user sans refacto de code) ; CRUD services en BDD (reporté à l'éventuelle Feature 1 Post-MVP "Gérer les contenus" si le besoin émerge).

### État livré

À la fin de ce sub-project, on peut : naviguer sur `/services` et `/en/services` et voir une page structurée (H1 + subtitle + 3 cards avec icône Lucide, description, 3-5 bullets, CTA fonctionnel vers `/contact?service=<slug>`), avec metadata SEO localisée dans le `<head>`, responsive 1/2/3 colonnes et animation fade-in + slide-up au scroll.

## Dependencies

Aucune, ce sub-project est autoporté. Les helpers SEO réutilisés (`setupLocaleMetadata`, `setupLocalePage`, `buildLanguageAlternates`, `localeToOgLocale`) et les clés `Metadata.servicesTitle` / `Metadata.servicesDescription` existent déjà dans le projet (livrés par Feature 6 `support-multilingue`).

## Files touched

- **À créer** : `src/components/features/services/ServiceCard.tsx`
- **À créer** : `src/components/features/services/ServicesGrid.tsx`
- **À créer** : `src/components/features/services/service-slugs.ts`
- **À modifier** : `src/app/[locale]/(public)/services/page.tsx` (remplacement du placeholder par la vraie page)
- **À modifier** : `messages/fr.json` (étoffer le namespace `ServicesPage` : ajout `subtitle` + `offers.{ia|fullstack|formation}.{title,description,bullets,ctaLabel}`)
- **À modifier** : `messages/en.json` (parité FR/EN stricte du namespace `ServicesPage`)

## Architecture approach

- **Server-first** : `page.tsx` reste un Server Component async, `setupLocalePage(params)` + `getTranslations('ServicesPage')` en entrée, pas de state client. Pattern aligné sur `src/app/[locale]/(public)/projets/page.tsx` (header H1 + subtitle + grid). Voir `.claude/rules/nextjs/server-client-components.md` et `.claude/rules/nextjs/routing.md`.
- **`ServiceCard` Server Component pur** (shadcn `Card`) : reçoit `slug`, `title`, `description`, `bullets[]`, `ctaLabel`. Lookup icône Lucide via `ICON_MAP` local (`{ ia: Bot, fullstack: Code, formation: GraduationCap }`) colocalisé dans le composant. CTA = `<Link href={/contact?service=${slug}}>` wrappant un `<Button>` shadcn (variant `default`). Voir `.claude/rules/shadcn-ui/components.md`.
- **`ServicesGrid` leaf Client Component** (`'use client'`) : wrapper qui applique `motion.div` avec `initial`/`whileInView`/`transition` et stagger sur chaque card. Reçoit les `<ServiceCard>` en `children` via `React.Children.map` pour les garder server-rendered (pattern "Server child of Client" de `.claude/rules/nextjs/server-client-components.md`). Motion déjà dans les dépendances (`motion@^12`), pas d'ajout de package.
- **`service-slugs.ts`** : exporte `SERVICE_SLUGS = ['ia', 'fullstack', 'formation'] as const` et type dérivé `export type ServiceSlug = typeof SERVICE_SLUGS[number]` (pattern typage via `typeof` de `.claude/rules/typescript/conventions.md`). Sert de source unique de vérité pour l'ordre et la correspondance i18n ↔ icône ↔ query param.
- **Contenu i18n** : alignement strict sur `.claude/rules/next-intl/translations.md` (labels d'interface et enums bornés → `messages/*.json`). Structure nested `ServicesPage.offers.<slug>.title|description|bullets|ctaLabel`. Lecture des bullets avec `t.raw('offers.<slug>.bullets') as string[]` (next-intl expose la valeur brute pour les arrays). Pas de nouvelle clé dans `Metadata.*` (réutilisation directe des `servicesTitle` / `servicesDescription` existants).
- **Metadata SEO** : `generateMetadata` réutilise le pattern actuel de la page (helper `setupLocaleMetadata(params)` + `localeToOgLocale[locale]` + `buildLanguageAlternates('/services')`). Aucune modification du helper. Voir `.claude/rules/nextjs/metadata-seo.md`.
- **Caching** : contenu statique (strings i18n, icônes, structure). Aucun `'use cache'` nécessaire, aucune query Prisma. Le PPR Next 16 (`cacheComponents: true`) traite naturellement le shell comme statique puisqu'aucune dynamic function n'est appelée. Voir `.claude/rules/nextjs/rendering-caching.md`.
- **Styling** : `cn()` obligatoire pour composer les classes, tokens couleur sémantiques uniquement (`bg-card`, `text-primary`, `text-muted-foreground`), typographie DESIGN.md (H1 `font-display text-4xl font-bold tracking-tight sm:text-5xl`, H3 card `text-2xl font-semibold`, body `text-base`). Container standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, section padding `py-16 sm:py-20 lg:py-24`. Voir `.claude/rules/tailwind/conventions.md`.
- **Hover state card** : `transition hover:shadow-md hover:-translate-y-0.5` en Tailwind pur (pas de motion Client), pour que le hover reste disponible côté server render.
- **Animation scroll** : Motion sur le wrapper `<motion.div>` de `ServicesGrid` avec `initial={{ opacity: 0, y: 20 }}` → `whileInView={{ opacity: 1, y: 0 }}` → `transition={{ duration: 0.4, delay: i * 0.1 }}` → `viewport={{ once: true }}`. Stagger 0.1s pour un effet cascade léger.

## Acceptance criteria

### Scénario 1 : rendu FR complet
**GIVEN** un visiteur sans JavaScript bloqué navigue vers `/services`
**WHEN** la page est rendue
**THEN** le `<h1>` affiche `Services` en typographie Sansation (`font-display`), le subtitle s'affiche juste en dessous en `text-muted-foreground`
**AND** 3 cards sont rendues dans l'ordre strict `ia`, `fullstack`, `formation`
**AND** chaque card affiche l'icône Lucide attendue (Bot, Code, GraduationCap) en `text-primary` taille 32px, le titre en H3, la description, 3 à 5 bullets puces, et un CTA `Button` avec le label localisé

### Scénario 2 : rendu EN
**GIVEN** un visiteur navigue vers `/en/services`
**WHEN** la page est rendue
**THEN** tous les textes (header, subtitle, titres de cards, descriptions, bullets, labels CTA) sont affichés en anglais
**AND** l'ordre et les icônes restent identiques

### Scénario 3 : metadata SEO localisée
**GIVEN** un crawler lit le `<head>` de `/services`
**WHEN** la réponse HTML arrive
**THEN** le `<title>` utilise `Metadata.servicesTitle` via le template `%s | {siteTitle}` défini dans le root layout
**AND** la meta `description` vaut `Metadata.servicesDescription`
**AND** la meta `og:locale` correspond à `localeToOgLocale[locale]`
**AND** les balises `<link rel="alternate" hreflang="...">` sont générées pour `fr`, `en` et `x-default` via `buildLanguageAlternates('/services')`

### Scénario 4 : CTA vers contact avec slug
**GIVEN** un visiteur est sur `/services`
**WHEN** il clique sur le CTA de la card "IA & Automatisation"
**THEN** il navigue vers `/contact?service=ia`
**AND** idem pour les deux autres cards avec les slugs `fullstack` et `formation`

### Scénario 5 : responsive
**GIVEN** les 3 cards sont rendues dans un viewport variable
**WHEN** le viewport est `< 768px`
**THEN** les cards s'empilent en 1 colonne
**AND** à `md:` (≥ 768px) la grid passe à 2 colonnes
**AND** à `lg:` (≥ 1024px) la grid passe à 3 colonnes

### Scénario 6 : animation scroll
**GIVEN** un visiteur scrolle vers la grid pour la première fois
**WHEN** une card entre dans le viewport
**THEN** elle apparaît avec fade-in + slide-up (translateY 20 → 0, opacity 0 → 1) en 400 ms
**AND** les cards suivantes enchainent avec un stagger de 0,1 s
**AND** au re-scroll ultérieur, les cards ne re-jouent pas l'animation (`viewport={{ once: true }}`)

## Edge cases

- **Parité FR/EN manquante sur `offers.<slug>.bullets`** : si `t.raw('offers.<slug>.bullets')` retourne `undefined`, le composant crasherait au `.map()`. La convention projet (voir `.claude/rules/next-intl/translations.md`) garantit la parité des messages, et la revue de la PR doit vérifier visuellement les deux langues. Pas de fallback automatique ajouté (surcouche non justifiée pour 3 offres).
- **Slug non listé dans `SERVICE_SLUGS` côté `/contact?service=<slug>`** : out of scope ici, géré par Feature 4 (validation Zod du query param et fallback silencieux si inconnu).

## Architectural decisions

### Décision : pattern d'animation scroll : wrapper ad hoc vs composant motion générique

**Options envisagées :**
- **A. `ServicesGrid` ad hoc dans `src/components/features/services/`** : un Client Component dédié au scope de ce sub-project, qui encapsule la grid + motion. Si un autre sub-project (ex: `/a-propos`, `/`) a besoin du même pattern plus tard, on promeut en composant générique `ScrollFadeIn` à ce moment-là.
- **B. Composant générique `ScrollFadeIn` d'emblée dans `src/components/motion/` (nouveau dossier)** : anticipe la réutilisation, mais n'a qu'un seul consommateur au lancement.

**Choix : A**

**Rationale :**
- YAGNI et alignement sur CLAUDE.md projet ("Pas de sur-ingénierie anticipatoire : chaque complexité ajoutée uniquement si le besoin réel apparaît")
- Le pattern générique se concevra mieux une fois qu'un 2e consommateur aura des exigences concrètes (stagger variable, direction différente, threshold scroll configurable, etc.), ce que l'option A permet sans surcoût
- Promouvoir vers `motion/` au moment de la 2e utilisation = refacto trivial (déplacement de fichier + généralisation des props)

### Décision : stockage du contenu des 3 offres (i18n messages vs BDD Prisma)

**Options envisagées :**
- **A. i18n messages pur + constante TS `SERVICE_SLUGS`** : textes dans `messages/{fr,en}.json` sous `ServicesPage.offers.<slug>.*`, ordre et mapping icône dans `service-slugs.ts` + `ICON_MAP`.
- **B. Table Prisma `Service`** : colonnes `titleFr`/`titleEn`/`descriptionFr`/`descriptionEn`/`bullets (Json)`, queries, seed, helper `localize-content`, cohérent avec le pattern Projects.

**Choix : A**

**Rationale :**
- 3 offres fixes (enum borné) + contenu court + aucun CRUD prévu en MVP → cas typique "labels d'interface et enums bornés" de `.claude/rules/next-intl/translations.md`
- Coût B = L (migration + seed + queries + helper localize + schéma Zod) pour zéro valeur utilisateur tant que le dashboard admin n'existe pas
- Choix réversible : si Feature 1 Post-MVP (dashboard "Gérer les contenus") justifie une édition dynamique, refacto ciblé (ajout table + seed depuis `messages/*.json` courants + swap source dans `ServiceCard`) estimé à 1-2 h
