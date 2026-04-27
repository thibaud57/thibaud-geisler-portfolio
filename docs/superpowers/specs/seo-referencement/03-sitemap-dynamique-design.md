---
feature: "Feature 5 — SEO & Référencement"
subproject: "Sitemap dynamique avec slugs projets et hreflang FR/EN"
goal: "Étendre /sitemap.xml pour inclure tous les projets publiés en plus des pages statiques, avec alternates hreflang et invalidation par cacheTag('projects')"
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: []
date: "2026-04-27"
---

# Sitemap dynamique avec slugs projets et hreflang FR/EN

## Scope

Étendre la route `src/app/sitemap.ts` (qui couvre déjà les 5 pages statiques avec alternates hreflang via `buildLanguageAlternates`) pour inclure tous les projets `PUBLISHED` via une nouvelle query Prisma allégée `findAllPublishedSlugs()`, ajouter `cacheTag('projects')` au sitemap pour mutualiser l'invalidation avec les autres queries projets, et extraire toute la logique de mapping dans une fonction pure `buildSitemapEntries()` colocalisée dans `src/lib/sitemap.ts` + tests Vitest. **Exclut** la déclaration `Sitemap:` dans `robots.txt` (sub-project 04), un sitemap-index multi-fichiers (post-MVP, inutile sous 50 000 URLs), tout JSON-LD (sub-project 05), les Open Graph images (sub-project 02) et la modification du helper `src/lib/seo.ts` du sub-project 01.

### État livré

À la fin de ce sub-project, on peut : `curl -s http://localhost:3000/sitemap.xml | xmllint --noout -` retourne 0 (XML valide), le sitemap contient une entrée par page statique (5 paths × 1 entrée canonical FR + alternates EN/x-default) et une entrée par projet publié (`/fr/projets/<slug>` canonical + alternates EN/x-default avec `<lastmod>` issu de `project.updatedAt`), et un `revalidateTag('projects')` depuis une Server Action invalide bien le sitemap.

## Dependencies

Aucune — ce sub-project est autoporté. Il réutilise des modules livrés antérieurement (`siteUrl` et `buildLanguageAlternates` dans `src/lib/seo.ts`, `routing` dans `src/i18n/routing.ts`, modèle Prisma `Project` avec `slug`/`updatedAt`/`status`) sans modification de leur signature.

## Files touched

- **À modifier** : `src/server/queries/projects.ts` (ajouter la fonction `findAllPublishedSlugs()` à côté des deux fonctions existantes `findManyPublished` et `findPublishedBySlug`. Aucune modification des fonctions existantes.)
- **À créer** : `src/lib/sitemap.ts` (helper pur `buildSitemapEntries({ staticPaths, projects, siteUrl })` retournant `MetadataRoute.Sitemap`, plus une constante exportée `PUBLIC_STATIC_PATHS` listant les chemins statiques par défaut)
- **À créer** : `src/lib/sitemap.test.ts` (tests unitaires colocalisés du helper pur, ~11 cas)
- **À modifier** : `src/app/sitemap.ts` (réécriture complète : passer de ~25 lignes avec `localizedEntry` interne à ~15 lignes orchestrant `findAllPublishedSlugs()` + `buildSitemapEntries()`. Conserver `'use cache'` + `cacheLife('days')`, ajouter `cacheTag('projects')`, retirer le TODO mentionnant la Feature 2 Projets puisqu'elle est maintenant câblée.)

**Non touchés** : `src/lib/seo.ts` (sub-project 01 inchangé, le sitemap consomme `siteUrl` et `buildLanguageAlternates` tels quels), `src/i18n/routing.ts`, `prisma/schema.prisma`, `messages/{fr,en}.json` (le sitemap n'expose aucun texte traduit), `next.config.ts`, `package.json`.

## Architecture approach

- **Séparation des responsabilités en 3 unités** : (1) accès données dans `src/server/queries/projects.ts` avec `findAllPublishedSlugs()` allégée, (2) logique pure de mapping dans `src/lib/sitemap.ts` avec `buildSitemapEntries()` testable, (3) route handler mince dans `src/app/sitemap.ts` qui orchestre. Aligné avec la convention projet observée (helpers + tests colocalisés, ex: `src/lib/projects.ts` + `src/lib/projects.test.ts`).
- **Query Prisma allégée `findAllPublishedSlugs()`** : `prisma.project.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true }, orderBy: { displayOrder: 'asc' } })` retourne `{ slug: string; updatedAt: Date }[]`. Locale-agnostic (le `slug` est mono-valeur dans le modèle, pas de variante FR/EN dans la BDD). Wrappée `'use cache'` + `cacheLife('hours')` + `cacheTag('projects')` (mêmes paramètres que `findManyPublished` pour mutualiser le cache et l'invalidation). Importe `'server-only'` comme les autres queries. Voir `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/rendering-caching.md`.
- **Helper pur `buildSitemapEntries({ staticPaths, projects, siteUrl })`** dans `src/lib/sitemap.ts` : aucun side effect, aucun accès Prisma, aucun import de `next/cache`. Reçoit `staticPaths: readonly string[]`, `projects: readonly { slug: string; updatedAt: Date }[]`, `siteUrl: string`. Retourne `MetadataRoute.Sitemap` (type Next.js). Pour chaque path statique : URL canonical `${siteUrl}/${routing.defaultLocale}${path}`, `lastModified: new Date()` (signal de rebuild), `alternates: { languages: buildLanguageAlternates(path, siteUrl) }`. Pour chaque projet : URL canonical `${siteUrl}/${routing.defaultLocale}/projets/${project.slug}`, `lastModified: project.updatedAt` (timestamptz Prisma), même structure d'alternates. Voir `.claude/rules/typescript/conventions.md`, `.claude/rules/vitest/setup.md`.
- **Constante exportée `PUBLIC_STATIC_PATHS`** : `['', '/services', '/projets', '/a-propos', '/contact'] as const` co-définie dans `src/lib/sitemap.ts`. Source unique pour les pages chrome connues, importée par le route handler. Si une nouvelle page publique est ajoutée ultérieurement, on l'ajoute ici (un seul endroit).
- **Route handler `src/app/sitemap.ts` réécrit** : conserve `'use cache'` + `cacheLife('days')` (les pages statiques bougent rarement), ajoute `cacheTag('projects')` (pour permettre `revalidateTag('projects')` depuis le dashboard admin post-MVP de régénérer le sitemap quand un projet est publié/dépublié, cohérent avec la stratégie déjà en place sur `findManyPublished` et `findPublishedBySlug`). Appelle `findAllPublishedSlugs()` puis `buildSitemapEntries({ staticPaths: PUBLIC_STATIC_PATHS, projects, siteUrl })`. Voir `.claude/rules/nextjs/metadata-seo.md` pour la convention `app/sitemap.ts`, `.claude/rules/nextjs/rendering-caching.md` pour `cacheTag` et `revalidateTag`.
- **URL canonical en `defaultLocale` (FR)** : convention déjà en place dans le code existant (`${siteUrl}/${routing.defaultLocale}${path}`). Cohérent avec `localePrefix: 'always'` (toutes les URLs publiques sont préfixées). Les versions EN sont exposées comme alternates plutôt que comme entries séparées, conforme à la recommandation Google pour les sitemaps multilingues.
- **`hreflang` via `buildLanguageAlternates(path, siteUrl)`** : helper existant du sub-project 01 dans `src/lib/seo.ts`. Produit `{ fr: '<siteUrl>/fr<path>', en: '<siteUrl>/en<path>', 'x-default': '<siteUrl>/fr<path>' }`. Aligné avec la stratégie i18n d'ADR-010.
- **Pas d'export externe (démos)** dans le sitemap : ADR-006 positionne le portfolio en hub vers démos externes hébergées sur des domaines autonomes. Le sitemap ne référence que les pages du portfolio (qui sont les pages indexables et linkables sur le domaine `thibaud-geisler.com`). Les démos externes ont leur propre indexation sur leurs domaines respectifs.
- **`<changefreq>` et `<priority>` non utilisés** : Google a publiquement déclaré ignorer ces champs. Aligné avec `.claude/rules/nextjs/metadata-seo.md` qui n'en parle pas comme requis. Sous-modèles Next.js `MetadataRoute.Sitemap` les acceptent en optionnel mais on s'en passe pour rester minimal.
- **Pas de `<image:image>` ni `<news:news>`** : extensions sitemap réservées aux sites avec contenu image / actualités structurés, non pertinent pour un portfolio MVP. À envisager post-MVP si le blog (ADR-013) prend de l'ampleur.
- **ADRs liés** : ADR-001 (monolithe Next.js, route handler dans la même app), ADR-006 (hub de démos, sitemap n'inclut pas les domaines externes), ADR-010 (i18n FR/EN, `hreflang` via alternates).

## Acceptance criteria

### Scénario 1 : Sitemap structurel valide avec pages statiques + projets
**GIVEN** `N` projets `status: 'PUBLISHED'` en base (N ≥ 1)
**WHEN** un visiteur ou un crawler charge `GET /sitemap.xml` en mode `pnpm build && pnpm start`
**THEN** la réponse est `Content-Type: application/xml` (ou `text/xml`) avec un statut 200
**AND** le XML est parseable sans erreur (`xmllint --noout` retourne 0)
**AND** le `<urlset>` contient `5 + N` éléments `<url>` (5 paths statiques + N projets)

### Scénario 2 : Page statique avec hreflang
**GIVEN** la page statique `/services` (présente dans `PUBLIC_STATIC_PATHS`)
**WHEN** on inspecte l'entrée correspondante dans `sitemap.xml`
**THEN** l'entrée contient `<loc>https://thibaud-geisler.com/fr/services</loc>` (canonical en `routing.defaultLocale`)
**AND** un `<lastmod>` ISO 8601 valide (date du build)
**AND** trois `<xhtml:link rel="alternate" hreflang="...">` pour `fr`, `en` et `x-default` pointant vers les bonnes URLs

### Scénario 3 : Page projet dynamique avec lastmod issu d'`updatedAt`
**GIVEN** un projet publié avec `slug: "digiclaims"` et `updatedAt: 2026-03-15T10:00:00Z`
**WHEN** on inspecte l'entrée du projet dans `sitemap.xml`
**THEN** l'entrée contient `<loc>https://thibaud-geisler.com/fr/projets/digiclaims</loc>`
**AND** `<lastmod>2026-03-15T10:00:00.000Z</lastmod>` (sérialisé depuis `updatedAt`, pas `new Date()`)
**AND** trois `<xhtml:link rel="alternate" hreflang="...">` pointant vers les versions FR/EN/x-default du projet

### Scénario 4 : Projet non publié exclu
**GIVEN** un projet avec `status: 'DRAFT'` ou `status: 'ARCHIVED'`
**WHEN** le sitemap est généré
**THEN** son slug n'apparaît dans aucune entrée du sitemap

### Scénario 5 : Invalidation par cacheTag
**GIVEN** un sitemap déjà mis en cache (avec `'use cache'` + `cacheLife('days')`)
**WHEN** un appel `revalidateTag('projects')` est exécuté (par exemple depuis une Server Action admin post-MVP qui publie un nouveau projet)
**THEN** la requête suivante sur `/sitemap.xml` régénère le sitemap, qui inclut le nouveau projet sans attendre l'expiration `days`

## Tests à écrire

### Unit

- `src/lib/sitemap.test.ts` :
  - **Pages statiques uniquement** : `buildSitemapEntries({ staticPaths: PUBLIC_STATIC_PATHS, projects: [], siteUrl })` retourne 5 entrées (une par chemin statique)
  - **URL canonical statique** : `path: '/services'` produit `url === 'https://thibaud-geisler.com/fr/services'` (canonical en `defaultLocale`)
  - **Home (path vide)** : `path: ''` produit `url === 'https://thibaud-geisler.com/fr'` sans slash trailing
  - **Alternates statiques** : chaque entrée statique expose `alternates.languages` avec les clés `fr`, `en`, `x-default` mappant les bonnes URLs
  - **Projets uniquement** : `buildSitemapEntries({ staticPaths: [], projects: [project1, project2], siteUrl })` retourne 2 entrées
  - **URL canonical projet** : un projet `{ slug: 'digiclaims', updatedAt }` produit `url === 'https://thibaud-geisler.com/fr/projets/digiclaims'`
  - **lastModified projet = `updatedAt`** : un projet avec `updatedAt: new Date('2026-03-15T10:00:00Z')` produit `lastModified === new Date('2026-03-15T10:00:00Z')` (pas `new Date()`)
  - **Alternates projets** : chaque entrée projet expose `alternates.languages` avec `fr`, `en`, `x-default` pointant vers `/fr/projets/<slug>`, `/en/projets/<slug>`, `/fr/projets/<slug>`
  - **Composition** : avec `staticPaths` complets + 3 projets, retourne `5 + 3 = 8` entrées
  - **Ordre** : statiques d'abord (dans l'ordre de `staticPaths`), projets ensuite (dans l'ordre du tableau passé)
  - **Aucun double slash** : `siteUrl = 'https://thibaud-geisler.com/'` (avec trailing slash) ne produit pas `https://thibaud-geisler.com//fr/services` (le helper normalise ou test passe en signalant qu'on attend `siteUrl` sans trailing)

Setup : factory `buildProject(overrides?: { slug?: string; updatedAt?: Date })` initialisant `slug: 'sample'`, `updatedAt: new Date('2026-01-01T00:00:00Z')`. Constante `SITE_URL_FIXTURE = 'https://thibaud-geisler.com'` réutilisée dans tous les tests. Aucun mock de `next-intl`, `next/cache`, Prisma, `next/navigation` : le helper est 100% pur.

Tests délibérément exclus (no-lib-test, voir `~/.claude/CLAUDE.md` § Code > Tests) :
- `findAllPublishedSlugs()` : wrapper Prisma trivial, testable uniquement via mock Prisma (anti-pattern projet) ou via test d'intégration sur la BDD réelle (overkill pour une fonction `select` simple).
- Le route handler `src/app/sitemap.ts` lui-même : couvert par le framework Next.js et la composition des deux unités déjà testées (helper pur + query). Validation manuelle suffisante.
- La signature de `MetadataRoute.Sitemap` : type Next.js, validé au compile-time par TypeScript.
- `buildLanguageAlternates` : déjà existant, hors scope (utilisé indirectement via les tests d'alternates de `buildSitemapEntries`).

## Edge cases

- **Aucun projet publié** : `findAllPublishedSlugs()` retourne `[]`, le sitemap contient uniquement les 5 entrées statiques. Comportement valide. Couvert par le test "Pages statiques uniquement".
- **`siteUrl` avec trailing slash** : si `process.env.NEXT_PUBLIC_SITE_URL = 'https://thibaud-geisler.com/'` (saisie utilisateur potentielle), risque de double slash dans `<loc>`. À acter dans le helper : soit normaliser via `siteUrl.replace(/\/$/, '')`, soit assumer que `siteUrl` n'a jamais de trailing slash (convention du sub-project 01) et tester explicitement le cas. Pris en charge par le test "Aucun double slash".
- **Slug avec caractères spéciaux URL-encodables** : impossible en pratique car les slugs Project sont validés en kebab-case lowercase via la convention base. Couvert implicitement par les contraintes du modèle Prisma (`slug: String @unique`) + seed-data validé.
- **`updatedAt` Prisma timestamptz vs Date JS** : `prisma.project.findMany` avec `select: { updatedAt: true }` retourne un objet `Date` JS standard. `MetadataRoute.Sitemap[number]['lastModified']` accepte `Date | string`, on passe directement le `Date` (Next.js sérialise en ISO 8601). Aucune transformation manuelle nécessaire.
- **Volumétrie dépassant 50 000 URLs** : limite Google pour un sitemap unique. Hors scope MVP (le portfolio aura tout au plus quelques dizaines de projets). Si dépassement post-MVP, refactor vers un sitemap-index avec `app/sitemap.ts` retournant un tableau d'objets `{ id, lastModified }` + `app/sitemap/[id]/sitemap.ts` pour chaque sub-sitemap.

## Architectural decisions

### Décision : Query Prisma dédiée sitemap vs réutiliser `findManyPublished`

**Options envisagées :**
- **A. Créer `findAllPublishedSlugs()` allégée** dans `src/server/queries/projects.ts` retournant `{ slug, updatedAt }[]` (locale-agnostic, `select` minimal).
- **B. Réutiliser `findManyPublished({ locale: 'fr' })`** existante et extraire `{ slug, updatedAt }` côté helper de mapping.

**Choix : A**

**Rationale :**
- L'option B impose un payload riche inutile : `findManyPublished` charge `tags` (avec JOIN sur `Tag` via `ProjectTag`), `clientMeta` (JOIN sur `ClientMeta` + `Company`), puis applique `localizeProject` qui résout les champs FR/EN. Coût SQL et compute inutiles pour un sitemap qui n'a besoin que de 2 colonnes scalaires.
- L'option B impose un argument `locale` factice (les slugs ne dépendent pas de la locale dans le modèle). Sémantique trompeuse, le sitemap n'est ni FR ni EN, il liste toutes les URLs.
- L'option A reste cohérente avec les conventions Prisma 7 du projet (`'use cache'` + `cacheTag('projects')` mêmes paramètres que les autres fonctions, `'server-only'` en tête, ordre `displayOrder: 'asc'` réutilisé pour cohérence). Coût marginal : ~10 lignes ajoutées dans un fichier qui en contient déjà 2 fonctions sœurs.
- Le `cacheTag('projects')` mutualisé entre `findAllPublishedSlugs`, `findManyPublished`, `findPublishedBySlug` permet une invalidation atomique : un seul `revalidateTag('projects')` depuis une Server Action admin post-MVP régénère toutes les surfaces qui dépendent des projets (liste, page case study, sitemap).

### Décision : Helper de mapping dans nouveau fichier vs étendre `src/lib/seo.ts`

**Options envisagées :**
- **A. Nouveau fichier `src/lib/sitemap.ts`** (+ test colocalisé `src/lib/sitemap.test.ts`).
- **B. Étendre `src/lib/seo.ts`** (qui contient déjà `buildPageMetadata`, `buildLanguageAlternates`, etc. du sub-project 01) en ajoutant `buildSitemapEntries` + tests dans `src/lib/seo.test.ts` existant.

**Choix : A**

**Rationale :**
- Responsabilités distinctes : `src/lib/seo.ts` traite la metadata des pages (`<title>`, `<meta>`, `og:*`, hreflang sur les pages individuelles). Le sitemap est une route distincte avec sa propre forme de données (`MetadataRoute.Sitemap`). Mélanger les deux dans un fichier unique brouille la lecture.
- Cohérent avec la convention de colocalisation déjà observée : `src/lib/projects.ts` + `src/lib/projects.test.ts`, `src/i18n/localize-content.ts` + `src/i18n/localize-content.test.ts`. Chaque module a son test colocalisé à plat.
- Maintient `src/lib/seo.ts` à une taille raisonnable (< 100 lignes). Si on continue à empiler, le fichier devient un fourre-tout difficile à parcourir.
- Trade-off accepté : 2 fichiers au lieu d'1, mais la séparation des concerns prime sur la concentration.
