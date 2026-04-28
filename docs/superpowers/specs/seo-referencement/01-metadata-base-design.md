---
feature: "Feature 5 — SEO & Référencement"
subproject: "Metadata Open Graph & Twitter sur toutes les pages publiques"
goal: "Doter chaque page publique FR/EN d'un title, description, openGraph, twitter et alternates hreflang corrects via un helper pur réutilisable"
status: "implemented"
complexity: "M"
tdd_scope: "partial"
depends_on: []
date: "2026-04-27"
---

# Metadata Open Graph & Twitter sur toutes les pages publiques

## Scope

Étendre `src/lib/seo.ts` avec un helper pur `buildPageMetadata()` qui assemble un objet `Metadata` complet (title, description, openGraph, twitter card, alternates canonical/languages, robots conditionnel) et le brancher dans la `generateMetadata` de chaque page publique (`/`, `/services`, `/projets`, `/projets/[slug]`, `/a-propos`, `/contact`) en FR et EN, avec ajustement du root layout `[locale]` pour le `twitter` par défaut. **Exclut** la génération des images Open Graph (sub-project 02 `og-images`), le sitemap (03), le robots.txt (04) et tout JSON-LD (05).

### État livré

À la fin de ce sub-project, on peut : ouvrir `View Source` sur n'importe quelle page publique en `/fr/...` et `/en/...` et observer un `<title>`, `<meta name="description">`, balises `og:type/og:url/og:locale/og:site_name/og:title/og:description`, balises `twitter:card="summary_large_image"/twitter:title/twitter:description`, et `<link rel="alternate" hreflang>` pour `fr`, `en` et `x-default`, tous corrects et absolus ; en mode `pnpm dev`, voir aussi `<meta name="robots" content="noindex,nofollow">`.

## Dependencies

Aucune — ce sub-project est autoporté. L'infrastructure utilisée (`src/lib/seo.ts` actuel avec `siteUrl`, `localeToOgLocale`, `buildLanguageAlternates`, `setupLocaleMetadata` ; namespace `Metadata` complet dans `messages/fr.json` et `messages/en.json` ; query `findPublishedBySlug` cachée via `'use cache'` dans `src/server/queries/projects.ts`) est déjà livrée par le travail antérieur sur le portfolio.

## Files touched

- **À modifier** : `src/lib/seo.ts` (ajout de la fonction pure `buildPageMetadata` et de son type d'input à côté des helpers existants, sans remplacer ce qui existe)
- **À créer** : `src/lib/seo.test.ts` (tests unitaires colocalisés du helper pur, convention projet)
- **À modifier** : `src/app/[locale]/layout.tsx` (ajout `twitter: { card: 'summary_large_image', siteName }` dans `generateMetadata` racine, le reste inchangé)
- **À modifier** : `src/app/[locale]/(public)/page.tsx` (remplacement du bloc `Metadata` par appel à `buildPageMetadata` avec `path: ''`, `ogType: 'website'`)
- **À modifier** : `src/app/[locale]/(public)/services/page.tsx` (idem, `path: '/services'`)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (création d'une `generateMetadata` avec `path: '/a-propos'`)
- **À modifier** : `src/app/[locale]/(public)/projets/page.tsx` (création d'une `generateMetadata` avec `path: '/projets'`)
- **À modifier** : `src/app/[locale]/(public)/contact/page.tsx` (création d'une `generateMetadata` avec `path: '/contact'`)
- **À modifier** : `src/app/[locale]/(public)/projets/[slug]/page.tsx` (remplacement du bloc actuel par `buildPageMetadata({ path: '/projets/<slug>', title: project.title, description: project.description, ogType: 'article' })`, et `notFound()` côté `generateMetadata` au lieu de `{ title: 'Not found' }` lorsque `findPublishedBySlug` retourne `null`)

## Architecture approach

- **Helper pur, signature étroite** : `buildPageMetadata({ locale, path, title, description, ogType? }): Metadata` reçoit uniquement des strings déjà résolues. Aucun appel à `getTranslations`, aucun accès Prisma, aucun side effect. Cohérent avec la convention projet `localizeProject(project, locale)` et `formatDurationRange(timeline, label)` (helpers purs colocalisés avec leur test). Voir `.claude/rules/typescript/conventions.md` (alias `@/*`, types via `z.infer`/`typeof`).
- **Réutilisation des helpers existants** : `buildPageMetadata` consomme `siteUrl`, `localeToOgLocale`, `buildLanguageAlternates(path)` déjà exportés par `src/lib/seo.ts`. Les pages continuent d'appeler `setupLocaleMetadata(params)` pour résoudre `{ locale, t }` puis passent `t('homeTitle')` / `t('homeDescription')` au helper. Voir `.claude/rules/next-intl/translations.md` (`getTranslations` async dans `generateMetadata`) et `.claude/rules/next-intl/setup.md` (`hasLocale` + URL préfixée locale, `localePrefix: 'always'` confirmé dans `src/i18n/routing.ts`).
- **Composition de l'objet `Metadata`** : `title` et `description` passés tels quels (le `title.template` du root layout `[locale]/layout.tsx` applique automatiquement `%s | <siteTitle>` côté pages enfants) ; `openGraph` complet avec `type` (`'website'` par défaut, `'article'` pour `/projets/[slug]`), `locale` via `localeToOgLocale[locale]`, `siteName` via `t('siteTitle')` injecté par le layout racine (héritage shallow), `url` absolue calculée comme `${siteUrl}/${locale}${path}`, `title` et `description` ; `twitter` avec `card: 'summary_large_image'`, `title` et `description` (le `siteName` Twitter remonte du root layout) ; `alternates.canonical = ${siteUrl}/${locale}${path}` (URL absolue, conforme `.claude/rules/nextjs/metadata-seo.md`) et `alternates.languages = buildLanguageAlternates(path)`. Voir aussi `.claude/rules/nextjs/metadata-seo.md` (`metadataBase`, viewport séparé, alternates non-mergés en deep) et ADR-010 (i18n next-intl).
- **Pas d'`openGraph.images` ni de `twitter.images` dans ce sub-project** : volontairement laissé absent pour éviter le couplage avec le sub-project 02. Next.js 16 détecte automatiquement les fichiers `opengraph-image.tsx` / `twitter-image.tsx` ajoutés au sub-project suivant et les merge sur la metadata, sans modification de ce helper.
- **Robots conditionnel hors prod** : `process.env.NODE_ENV !== 'production'` ⇒ ajout de `robots: { index: false, follow: false }` dans le retour. Aucune nouvelle env var. Stub testable via `vi.stubEnv` (Vitest 4). Couvre `pnpm dev` (`development`) et les tests Vitest (`test`). Confirmé en prod via `next start` Dokploy après `pnpm build` (`NODE_ENV=production`).
- **Async params** : `generateMetadata({ params })` reste asynchrone, `await params` via `setupLocaleMetadata` déjà existant. Voir `.claude/rules/nextjs/routing.md` (params Promise hard-error Next 16) et ADR-001 (monolithe Next.js App Router).
- **Page `/projets/[slug]`** : `findPublishedBySlug(slug, locale)` est wrappée `'use cache'` + `cacheTag('projects')` dans `src/server/queries/projects.ts`, l'appel depuis `generateMetadata` est mutualisé avec celui du composant page (per-request via Data Cache), pas de double query. Si `null` ⇒ `notFound()` (au lieu du `{ title: 'Not found' }` actuel) pour aligner avec le `notFound()` du composant page et éviter l'indexation d'une page d'erreur.
- **Pas de modification du namespace `Metadata` dans `messages/{fr,en}.json`** : toutes les clés nécessaires (`siteTitle`, `siteDescription`, `homeTitle/Description`, `servicesTitle/Description`, `projectsTitle/Description`, `aboutTitle/Description`, `contactTitle/Description`, `projectTitle({slug})`, `projectDescription({slug})`) existent déjà.

## Acceptance criteria

### Scénario 1 : Page statique en FR avec metadata complet
**GIVEN** un visiteur qui charge `/fr/services` en mode `pnpm build && pnpm start`
**WHEN** il consulte le HTML rendu côté serveur
**THEN** la page contient `<title>Services | Thibaud Geisler : IA & Développement</title>`
**AND** un `<meta name="description">` issu de `t('Metadata.servicesDescription')`
**AND** `og:type="website"`, `og:locale="fr_FR"`, `og:site_name`, `og:url="https://thibaud-geisler.com/fr/services"`, `og:title`, `og:description`
**AND** `twitter:card="summary_large_image"`, `twitter:title`, `twitter:description`
**AND** `<link rel="canonical" href="https://thibaud-geisler.com/fr/services">`
**AND** `<link rel="alternate" hreflang="fr">`, `<link rel="alternate" hreflang="en">`, `<link rel="alternate" hreflang="x-default">` pointant vers `/fr/services`, `/en/services`, `/fr/services` (defaultLocale)

### Scénario 2 : Même page en EN
**GIVEN** un visiteur qui charge `/en/services`
**WHEN** il consulte le HTML rendu côté serveur
**THEN** la page contient le titre et la description traduits via `t('Metadata.servicesTitle')` / `t('Metadata.servicesDescription')` avec messages `en.json`
**AND** `og:locale="en_US"`
**AND** `og:url="https://thibaud-geisler.com/en/services"`
**AND** `<link rel="canonical" href="https://thibaud-geisler.com/en/services">`

### Scénario 3 : Page case study `/projets/[slug]` (og:type article)
**GIVEN** un projet publié avec `slug = "webapp-gestion-sinistres"` en base
**WHEN** un visiteur charge `/fr/projets/webapp-gestion-sinistres`
**THEN** la page contient `<title>` reprenant `project.title` (locale FR) appliqué au template `%s | <siteTitle>`
**AND** `<meta name="description">` reprenant `project.description` (locale FR)
**AND** `og:type="article"` (et non `"website"`)
**AND** `og:url="https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres"`
**AND** `<link rel="canonical" href="https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres">`
**AND** `<link rel="alternate" hreflang="en" href="https://thibaud-geisler.com/en/projets/webapp-gestion-sinistres">`

### Scénario 4 : Slug projet inexistant
**GIVEN** un slug `inconnu` qui n'existe pas en base
**WHEN** un visiteur charge `/fr/projets/inconnu`
**THEN** `generateMetadata` appelle `notFound()` au lieu de retourner un objet `Metadata`
**AND** la réponse est un 404 sans metadata SEO indexable

### Scénario 5 : Mode dev → noindex automatique
**GIVEN** l'application lancée via `pnpm dev` (`NODE_ENV=development`)
**WHEN** un visiteur charge n'importe quelle page publique
**THEN** le HTML contient `<meta name="robots" content="noindex,nofollow">`
**AND** en `pnpm build && pnpm start` (`NODE_ENV=production`) cette balise est absente

## Tests à écrire

### Unit

- `src/lib/seo.test.ts` :
  - **Title et description** : `buildPageMetadata({ ..., title: 'X', description: 'Y' })` retourne `metadata.title === 'X'` et `metadata.description === 'Y'` (passés tels quels, le template est appliqué par Next.js via le root layout)
  - **openGraph.type par défaut** : sans `ogType` fourni, `metadata.openGraph.type === 'website'`
  - **openGraph.type article** : avec `ogType: 'article'`, `metadata.openGraph.type === 'article'`
  - **openGraph.locale mappée** : `locale: 'fr'` ⇒ `metadata.openGraph.locale === 'fr_FR'` ; `locale: 'en'` ⇒ `'en_US'`
  - **openGraph.url absolue** : `path: '/services'`, `locale: 'fr'` ⇒ `metadata.openGraph.url === 'https://thibaud-geisler.com/fr/services'` (avec `siteUrl` stubbé via `vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://thibaud-geisler.com')`)
  - **openGraph.url home** : `path: ''`, `locale: 'fr'` ⇒ `metadata.openGraph.url === 'https://thibaud-geisler.com/fr'` (sans slash final)
  - **openGraph.url nested** : `path: '/projets/webapp-gestion-sinistres'`, `locale: 'en'` ⇒ `metadata.openGraph.url === 'https://thibaud-geisler.com/en/projets/webapp-gestion-sinistres'`
  - **Twitter card** : `metadata.twitter.card === 'summary_large_image'`, `metadata.twitter.title === title`, `metadata.twitter.description === description`
  - **Canonical absolue** : `metadata.alternates.canonical === metadata.openGraph.url` (cohérence)
  - **Languages alternates** : `metadata.alternates.languages` contient les clés `'fr'`, `'en'`, `'x-default'` pointant vers les paths préfixés (vérifie l'intégration avec `buildLanguageAlternates`)
  - **Robots prod absent** : `vi.stubEnv('NODE_ENV', 'production')` ⇒ `metadata.robots === undefined`
  - **Robots non-prod présent** : `vi.stubEnv('NODE_ENV', 'development')` ⇒ `metadata.robots === { index: false, follow: false }`

Setup : factory `buildInput(overrides?)` (convention vue dans `.claude/rules/nextjs/tests.md`) initialisant locale `'fr'`, path `''`, title et description bidons, `afterEach(() => vi.unstubAllEnvs())`. Aucun mock de `next-intl`, `next/navigation` ou Prisma : le helper est pur.

Tests délibérément exclus (no-lib-test, voir `~/.claude/CLAUDE.md` § Code > Tests) :
- Les `generateMetadata` des 6 pages (testerait l'intégration Next.js, pas une règle métier projet) — couvert par les scénarios end-to-end visuels (View Source).
- `metadataBase`, `title.template`, `viewport.themeColor` du root layout `[locale]/layout.tsx` (config Next.js, no-lib-test).
- `setupLocaleMetadata`, `localeToOgLocale`, `buildLanguageAlternates` (helpers déjà existants non modifiés par ce sub-project ; `buildLanguageAlternates` est utilisé indirectement dans le test "Languages alternates" via le retour du helper).
- Le runtime next-intl (`hasLocale`, `getTranslations`, `notFound`).

## Edge cases

- **Path racine `''`** : la home FR doit produire `og:url = '<siteUrl>/fr'` sans slash trailing pour rester canonique. Test dédié couvre.
- **Slug projet absent en EN mais présent en FR** : la query Prisma `findPublishedBySlug(slug, locale)` retourne le projet (les champs sont jumelés FR/EN dans le modèle, pas de filtre par locale). Pas d'edge case côté metadata, le projet est trouvé et `localizeProject` choisit la version locale.
- **`NEXT_PUBLIC_SITE_URL` absente** : le fallback `siteUrl = 'http://localhost:3000'` (déjà en place dans `src/lib/seo.ts`) garantit que les URLs absolues restent valides en local. À documenter par un test du helper avec `vi.stubEnv('NEXT_PUBLIC_SITE_URL', undefined)` si pertinent (sinon couvert implicitement par la valeur par défaut).
