---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "page-a-propos"
goal: "Livrer la page publique /a-propos présentant hero + portrait, positionnement business, stats dynamiques (XP auto + missions + clients dérivés DB), stack technique dérivée des tags projets publiés, bouton CV téléchargeable."
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-04-24"
---

# Page `/a-propos` — Hero, bio business, stats auto et stack dérivée

## Scope

Remplacer le placeholder actuel de `src/app/[locale]/(public)/a-propos/page.tsx` par une page en 4 sections verticales : hero (portrait + H1 + tagline + bouton CV), bio business (2-3 paragraphes i18n positionnés sur l'approche et non le déroulé CV), stats animées (années d'expérience calculées automatiquement depuis `START_YEAR = 2020`, missions clients livrées et clients servis dérivés de la DB via queries Prisma `'use cache'`), et stack technique groupée par `TagKind` dérivée des tags effectivement utilisés dans les projets publiés (priorité visuelle donnée à IA / EXPERTISE pour aligner le positionnement services). Le bouton CV (`DownloadCvButton` livré par Feature 3) est réutilisé tel quel, placé au-dessus du pli sous le portrait.

**Exclu** : édition dynamique des stats ou du bio (reportée à l'éventuelle Feature 1 Post-MVP "Gérer les contenus" du dashboard) ; timeline carrière / expériences datées (redite du CV qui reste téléchargeable, hors intention business-solution de la page) ; refactor de `DownloadCvButton` ; ADR-011 n'est pas modifié dans ce sub-project mais le silo `/api/assets/branding/` est introduit de facto (à formaliser séparément si besoin).

### État livré

À la fin de ce sub-project, on peut : naviguer sur `/a-propos` et `/en/a-propos` et voir le portrait, le nom + positionnement IA, le CV téléchargeable en tête de page, 2-3 paragraphes de bio business, 3 chiffres animés (`X ans d'expérience`, `N missions livrées`, `M clients servis`) et la stack technique groupée par catégorie (AI, EXPERTISE, LANGUAGE, FRAMEWORK, DATABASE, INFRA) avec icônes Simple Icons, le tout avec metadata SEO localisée et responsive mobile-first.

## Dependencies

Aucune — ce sub-project est autoporté. Les éléments réutilisés sont déjà livrés :
- `DownloadCvButton` et la clé i18n `Common.cv.*` (Feature 3 `gestion-et-exposition-des-assets`, sub 02, statut : implemented).
- Route `/api/assets/[...path]` (Feature 2 `projets`, sub 04, statut : implemented).
- Helpers `setupLocalePage`, `setupLocaleMetadata`, `buildLanguageAlternates`, `localeToOgLocale` (Feature 6 `support-multilingue` et setup i18n, déjà présents).
- Schéma Prisma `Project` + `Tag` + `ProjectTag` + enum `TagKind` (Feature 2 `projets`, sub 01, statut : implemented).

## Files touched

- **À créer** : `src/components/features/about/AboutHero.tsx`
- **À créer** : `src/components/features/about/NumberTickerStats.tsx`
- **À créer** : `src/components/features/about/TechStackBadges.tsx`
- **À créer** : `src/components/features/about/tag-kind-order.ts`
- **À créer** : `src/server/queries/about.ts`
- **À créer** : `src/components/magicui/number-ticker.tsx` (généré par le CLI shadcn/magicui, voir plan)
- **À créer** : asset `portrait.webp` dans le volume Docker `assets/branding/` (déploiement manuel ou via étape de setup, hors compilation code)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (remplacement du placeholder)
- **À modifier** : `messages/fr.json` (étoffer `AboutPage` : `hero.{headline,tagline,portraitAlt}`, `bio.{intro,positioning,approach}`, `stats.{years,missions,clients}.label`, `stats.suffixPlus`, `stack.title`, `stack.kindLabels.{AI,EXPERTISE,LANGUAGE,FRAMEWORK,DATABASE,INFRA}`)
- **À modifier** : `messages/en.json` (parité stricte du namespace `AboutPage`)

## Architecture approach

- **Server-first** : `page.tsx` reste Server Component async. `setupLocalePage(params)` + `getTranslations('AboutPage')`. Les 3 queries DB (`countMissionsDelivered`, `countClientsServed`, `findPublishedTags`) sont wrappées en `'use cache'` + `cacheLife('hours')` + `cacheTag('projects')` pour participer au Data Cache Next 16 (voir `.claude/rules/nextjs/rendering-caching.md`) et profiter de la même invalidation que Feature 2 (le dashboard post-MVP qui publie/dépublie un Project révoquera automatiquement le cache de `/a-propos`).
- **Suspense par zone async** (`.claude/rules/nextjs/server-client-components.md` + `.claude/rules/nextjs/data-fetching.md`) : la section stats et la section stack sont chacune enveloppées dans `<Suspense fallback={...}>` pour streamer le shell statique pendant que les queries DB résolvent. Le hero + la bio (zéro query DB) sortent instantanément côté PPR.
- **`'use cache'` absorbe `new Date()` Prisma** : pas besoin d'appeler `await connection()` dans les queries (voir rappel `.claude/rules/nextjs/data-fetching.md` sur l'issue Prisma #28588).
- **`AboutHero` Server Component** : rend le portrait via `next/image` en pointant sur `buildAssetUrl('branding/portrait.webp')` (URL absolue construite à partir de `NEXT_PUBLIC_SITE_URL` + la route `/api/assets/[...path]`). Conforme à `.claude/rules/nextjs/images-fonts.md` (`width`/`height` explicites, `alt` traduit via `hero.portraitAlt`, `preload` car LCP above-the-fold). Dans le hero on appelle `<DownloadCvButton locale={locale} />` tel quel (composant Server async déjà réutilisable, accepte déjà `variant`, `size`, `className`).
- **`NumberTickerStats` Client Component** (`'use client'` obligatoire selon `.claude/rules/magic-ui/components.md`) : wrap minimal sur `NumberTicker` de Magic UI. Reçoit un tableau `{ slug, value, label, suffix? }` déjà résolu côté page et rend une grid 3 colonnes. Le suffixe `+` (ex: `6+ ans`, `4+ missions`) est optionnel, contrôlé par page. Pour éviter une transition non animée au premier render, `NumberTicker` dispose d'une animation `startValue=0 → value` déclenchée par Intersection Observer (behavior par défaut Magic UI).
- **`TechStackBadges` Server Component** : reçoit `tags: Tag[]` (résultat Prisma) et `locale`. Groupement par `kind` côté render via un `Map<TagKind, Tag[]>`. Itération sur `KIND_ORDER` importé de `tag-kind-order.ts` pour figer l'ordre d'affichage IA → EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → INFRA. Résolution du nom via ternaire `locale === 'fr' ? tag.nameFr : tag.nameEn`. Badge shadcn (`Badge variant="outline"`) + Simple Icon lookup via `@icons-pack/react-simple-icons` sur `tag.icon` (pattern déjà en place dans `TagBadge` de Feature 2, `src/components/features/projects/TagBadge.tsx` peut servir de modèle pour la résolution d'icône — ne pas importer directement pour éviter un couplage inutile, mais lire le pattern).
- **`tag-kind-order.ts`** : `export const KIND_ORDER = ['AI', 'EXPERTISE', 'LANGUAGE', 'FRAMEWORK', 'DATABASE', 'INFRA'] as const satisfies readonly TagKind[]`. Typage via `typeof` (`.claude/rules/typescript/conventions.md`). Exporte aussi un helper pur `getYearsOfExperience(startYear: number = 2020): number` (1 ligne `new Date().getFullYear() - startYear`) → colocalisation des constantes "about" non-i18n. Si un second fichier de type "constantes about" émerge, on scindera.
- **Queries DB** (`src/server/queries/about.ts`, `import 'server-only'` en tête selon `.claude/rules/nextjs/data-fetching.md`) : 3 fonctions. Filtres métier explicites dans les `where` Prisma (`status: 'PUBLISHED'`, `type: 'CLIENT'`, `endedAt: { not: null }` pour missions livrées). Le count clients utilise `prisma.company.count` avec `slug: { not: 'personnel' }` + `clientMetas: { some: { project: { status: 'PUBLISHED', type: 'CLIENT' } } }` (le filtre `type: 'CLIENT'` sur `Project` via l'enum `ProjectType` remplace proprement un filtre magic string sur `companySlug`). La query `findPublishedTags` ne filtre pas par `type` volontairement (la stack couvre tout ce qui est visible au visiteur, projets perso inclus).
- **i18n `AboutPage`** : structure nested `hero.* / bio.* / stats.* / stack.*` conforme à `.claude/rules/next-intl/translations.md` (labels d'interface + enums bornés dans messages). `Metadata.aboutTitle` / `aboutDescription` déjà présents, pas à recréer.
- **Metadata SEO** : `generateMetadata` suit le pattern de `01-page-services-design.md` (helper `setupLocaleMetadata`, `localeToOgLocale`, `buildLanguageAlternates('/a-propos')`). Voir `.claude/rules/nextjs/metadata-seo.md`.
- **Styling** : tokens sémantiques uniquement (`bg-card`, `text-muted-foreground`, `text-primary`), container standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, section padding `py-16 sm:py-20 lg:py-24`, typo Sansation via `font-display` sur le H1 (`.claude/rules/tailwind/conventions.md`). Hero : grid 2 colonnes `lg:grid-cols-2` avec portrait à gauche et headline/CV à droite, empilé en mobile.
- **Budget effet Magic UI sur la page** : 1 seul effet (`NumberTicker`), conforme à la limite "2-3 max par page" de `.claude/rules/magic-ui/components.md`.

## Acceptance criteria

### Scénario 1 : rendu FR complet
**GIVEN** un visiteur navigue vers `/a-propos`
**WHEN** la page est rendue
**THEN** la section hero affiche le portrait `portrait.webp` optimisé par `next/image`, un `<h1>` `font-display` avec le nom + positionnement IA, une tagline `text-lg text-muted-foreground`, et le `DownloadCvButton` variant default
**AND** la section bio affiche 3 paragraphes (`intro`, `positioning`, `approach`) en `text-base`
**AND** la section stats affiche 3 compteurs animés (`X ans d'expérience`, `N missions livrées`, `M clients servis`) avec `NumberTicker` démarrant à 0 puis transitionnant vers la valeur au scroll dans le viewport
**AND** la section stack affiche les catégories dans l'ordre `AI → EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → INFRA`, chaque catégorie avec son libellé traduit puis ses badges (nom `nameFr` + éventuelle icône Simple Icons)

### Scénario 2 : rendu EN
**GIVEN** un visiteur navigue vers `/en/a-propos`
**WHEN** la page est rendue
**THEN** tous les textes (hero, bio, stats labels, stack kind labels) sont affichés en anglais
**AND** les badges stack affichent `tag.nameEn`
**AND** la valeur `years of experience` est identique (calcul indépendant de la locale)

### Scénario 3 : années d'expérience calculées
**GIVEN** la constante `START_YEAR = 2020`
**WHEN** la page est rendue en 2026
**THEN** le compteur "années d'expérience" affiche `6`
**AND** en 2027 sans toucher au code il affichera `7`

### Scénario 4 : missions et clients dérivés DB
**GIVEN** la base contient des `Project` avec `status = 'PUBLISHED'`
**WHEN** `countMissionsDelivered` est appelée
**THEN** elle retourne le nombre de projets `status = 'PUBLISHED'` avec `type = 'CLIENT'` et `endedAt` non null
**AND** `countClientsServed` retourne le nombre de `Company` distinctes (hors `slug = 'personnel'`) liées à au moins un `Project` `status = 'PUBLISHED'` et `type = 'CLIENT'` via `ClientMeta`

### Scénario 5 : stack dérivée DB
**GIVEN** la table `Tag` contient des tags rattachés à `ProjectTag` sur des projets publiés
**WHEN** `findPublishedTags` est appelée
**THEN** elle retourne uniquement les tags qui ont au moins un `ProjectTag` lié à un `Project` avec `status = 'PUBLISHED'`
**AND** les tags non rattachés à un projet publié ne sont pas affichés

### Scénario 6 : metadata SEO localisée
**GIVEN** un crawler lit le `<head>` de `/a-propos`
**THEN** `<title>` = `Metadata.aboutTitle` appliqué au template `%s | {siteTitle}`
**AND** `description` = `Metadata.aboutDescription`
**AND** `og:locale` = `localeToOgLocale[locale]`
**AND** `alternates.languages` couvre `fr`, `en`, `x-default` via `buildLanguageAlternates('/a-propos')`

### Scénario 7 : responsive mobile
**GIVEN** un viewport `< 768px`
**WHEN** la page est rendue
**THEN** hero empilé (portrait puis headline/CV), bio en single col, stats en single col, stack en single col (avec badges wrap à l'intérieur)

### Scénario 8 : responsive desktop
**GIVEN** un viewport ≥ 1024px (`lg:`)
**WHEN** la page est rendue
**THEN** hero passe en grid 2 colonnes (portrait à droite, headline/CV à gauche)
**AND** stats passent en grid 3 colonnes
**AND** stack reste sur 1 colonne verticale avec les badges en `flex-wrap` à l'intérieur de chaque catégorie

### Scénario 9 : cache Data Cache
**GIVEN** un premier visiteur charge `/a-propos`
**WHEN** un second visiteur recharge la page
**THEN** les queries DB (`countMissionsDelivered`, `countClientsServed`, `findPublishedTags`) répondent depuis le Data Cache (pas de roundtrip Prisma)
**AND** une invalidation `revalidateTag('projects', 'max')` déclenchée depuis un futur Server Action dashboard (post-MVP) rafraîchit la page `/a-propos`

## Edge cases

- **Portrait `portrait.webp` introuvable** dans le volume assets au déploiement : `next/image` renvoie une erreur de chargement côté client. **Décision** : l'upload de l'asset est une étape ops runbook (documenter dans le PR body), pas de fallback JS codé. Si absent en dev, le build passe mais la page affiche un visuel cassé — acceptable pour le MVP single-user.
- **DB sans projet publié** (premier déploiement avant seed) : `countMissionsDelivered` et `countClientsServed` renvoient `0`, `findPublishedTags` renvoie `[]`. La page s'affiche avec 3 compteurs à 0 et une section stack vide. Acceptable (ne devrait jamais survenir en prod une fois seedé). Pas de branch UI "empty state" custom.
- **Tag avec `icon = null`** : le composant `TechStackBadges` affiche le badge avec le label seul, sans icône. Conforme au schéma (`icon String?`).
- **`getYearsOfExperience` appelée en janvier après changement d'année** : valide — `new Date().getFullYear()` reflète l'année en cours, incrément automatique au 1er janvier. Pas d'arrondi mois (6,7 → 7 par exemple) : le chiffre est entier par design.

## Architectural decisions

### Décision : stockage du portrait — silo `/api/assets/branding/` vs `public/`

**Options envisagées :**
- **A. `/api/assets/branding/portrait.webp`** servi par la route catch-all existante (Feature 2 sub 04). Nouveau silo `branding/` pour les assets personnels fixes (portrait, logo, éventuels visuels branding). Aligné avec ADR-011 (tous les assets dynamiques passent par la route API, pas `public/`), cohérent avec l'emplacement du CV (`/api/assets/cv/...`).
- **B. `public/images/portrait.webp`** servi statiquement par Next. Zéro infra, mais crée une incohérence avec CV et covers projets qui passent déjà par la route API (tous stockés dans le volume Docker d'assets).

**Choix : A**

**Rationale :**
- Cohérence avec le reste des assets persos (CV déjà servi par `/api/assets/`) → un seul endroit à backuper/déployer.
- Pas d'asset dans le repo git (sauf cas exceptionnel) → aligné avec l'esprit d'ADR-011 (séparation assets / code).
- Coût négligeable : aucune nouvelle route, juste un upload dans le volume `branding/`.
- Si Feature 1 Post-MVP (dashboard "Gérer les contenus") veut uploader un nouveau portrait, le chemin est déjà le bon.
- ADR-011 sera complété ultérieurement (note d'édition) pour formaliser le silo `branding/`, mais aucune décision structurante à acter ici au-delà de ce fait.

### Décision : source des stats et de la stack — DB dérivée vs statiques i18n

**Options envisagées :**
- **A. DB dérivée** : queries Prisma sur `Project`/`Tag` wrappées `'use cache'` + `cacheTag('projects')`. Missions livrées = count PUBLISHED + endedAt + client. Clients servis = distinct `companySlug`. Stack = `Tag` rattachés à au moins un `Project` publié.
- **B. Valeurs figées en i18n** : chiffres et liste de technos dans `messages/*.json`, maintenance manuelle à chaque nouveau projet/techno.

**Choix : A**

**Rationale :**
- La DB est déjà la source de vérité pour `Project` et `Tag` (Feature 2 livrée). Dupliquer en i18n force une synchronisation manuelle.
- Auto-maintenance : chaque projet publié côté dashboard post-MVP mettra automatiquement à jour les compteurs et la stack via `cacheTag('projects')`.
- Coût : 3 fonctions de query triviales, aucun nouveau schéma, aucune nouvelle dépendance.
- Ne casse pas la règle next-intl (les **labels** des stats et des catégories restent en messages, seules les **données** viennent de la DB — c'est l'usage approprié du partage i18n / DB documenté dans `.claude/rules/next-intl/translations.md`).
- **Intégrité** : le chiffre affiché reflète exactement ce qui est visible par le visiteur (projets publiés). Pas de gonflage marketing.

### Décision : calcul automatique des années d'expérience vs valeur figée

**Options envisagées :**
- **A. Calcul auto** via `new Date().getFullYear() - START_YEAR` avec `START_YEAR = 2020`.
- **B. Valeur figée** dans `messages/*.json` (`stats.years.value: 6`).

**Choix : A**

**Rationale :**
- Zero maintenance annuelle (pas de PR le 1er janvier pour bumper `6 → 7`).
- Helper pur 1 ligne, testable trivialement mais non prioritaire (plumbing `Intl`/`Date` = no-lib-test).
- `START_YEAR = 2020` intègre l'alternance Cloudsmart comme XP (convention tacite en tech : alternance livrable = XP comptée).
- Réversible : si un jour le calcul doit devenir plus fin (mois de début, demi-années), c'est une évolution du helper sans impact sur le contenu ni la DB.
