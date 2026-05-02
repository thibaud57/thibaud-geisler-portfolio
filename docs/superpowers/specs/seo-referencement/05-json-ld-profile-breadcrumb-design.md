---
feature: "Feature 5 — SEO & Référencement"
subproject: "JSON-LD ProfilePage + Person + BreadcrumbList"
goal: "Injecter du JSON-LD ProfilePage (avec Person imbriqué + sameAs + knowsAbout Thing+Wikidata) sur /a-propos et BreadcrumbList sur les pages internes pour activer les rich results Profile page et Breadcrumbs"
status: "implemented"
complexity: "M"
tdd_scope: "partial"
depends_on: []
date: "2026-04-27"
---

# JSON-LD ProfilePage + Person + BreadcrumbList

## Scope

Créer une constante `EXPERTISE` (4 disciplines avec mapping Wikidata best practice 2025-2026) dans `src/config/expertise.ts`, deux helpers purs `buildProfilePagePerson()` et `buildBreadcrumbList()` colocalisés dans `src/lib/seo/json-ld.ts`, un composant Server `<JsonLd>` générique d'injection avec échappement `</script>`, et l'intégration dans 4 pages (`/a-propos` pour ProfilePage+Person, `/services` + `/projets` + `/projets/[slug]` pour BreadcrumbList). Réutilisation directe des sources de vérité existantes (`SOCIAL_LINKS` pour `sameAs`, `siteUrl` du sub-project 01, `Metadata` namespace messages, `buildAssetUrl('branding/portrait.jpg')` pour l'image, `findPublishedBySlug` pour le titre projet localisé). **Exclut** tous les autres schémas JSON-LD différés post-MVP (Organization, Service, Offer, Article, Course, SoftwareApplication, FAQ, HowTo, Review, WebSite+SearchAction déprécié 21/11/2024). Exclut aussi le sitemap (sub-project 03), le robots.txt (sub-project 04), les Open Graph images (sub-project 02) et la metadata HTML standard (sub-project 01).

### État livré

À la fin de ce sub-project, on peut : (a) charger `/fr/a-propos` (et `/en/a-propos`), faire View Source, copier le `<script type="application/ld+json">` et obtenir un statut "Profile page eligible" sans erreur ni warning bloquant via [Google Rich Results Test](https://search.google.com/test/rich-results), avec `Person.knowsAbout` contenant les 4 entrées `Thing+Wikidata` ; (b) idem pour `/fr/services`, `/fr/projets`, `/fr/projets/<slug>` (et leurs équivalents EN) qui doivent retourner "Breadcrumbs eligible".

## Dependencies

Aucune, ce sub-project est autoporté. Il consomme en lecture seule des modules livrés antérieurement (`siteUrl` dans `src/lib/seo.ts`, `SOCIAL_LINKS` dans `src/config/social-links.ts`, `findPublishedBySlug` dans `src/server/queries/projects.ts`, `buildAssetUrl` dans `src/lib/assets.ts`, `setupLocalePage` dans `src/i18n/locale-guard.ts`) sans modification de leur signature. Le sub-project ne touche pas non plus aux helpers SEO du sub-project 01 ni aux fichiers OG du sub-project 02.

## Files touched

- **À créer** : `src/config/expertise.ts` (constante `EXPERTISE` + type `Expertise`, ~15 lignes, pattern aligné avec `src/config/social-links.ts`)
- **À créer** : `src/lib/seo/json-ld.ts` (helpers purs `buildProfilePagePerson()` + `buildBreadcrumbList()` + types JSON-LD associés)
- **À créer** : `src/lib/seo/json-ld.test.ts` (tests unitaires colocalisés Vitest project unit, ~14 cas)
- **À créer** : `src/components/seo/json-ld.tsx` (Server Component `<JsonLd data={...}>` avec échappement `</script>` via `replace(/</g, '\\u003c')`)
- **À modifier** : `messages/fr.json` (ajouter au namespace `Metadata` les clés `jobTitle`, `breadcrumbHome`, `breadcrumbServices`, `breadcrumbProjects` avec valeurs FR)
- **À modifier** : `messages/en.json` (idem en EN)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (importer et utiliser `buildProfilePagePerson` + `<JsonLd>` dans le composant default export, après `setupLocalePage(params)`)
- **À modifier** : `src/app/[locale]/(public)/services/page.tsx` (idem avec `buildBreadcrumbList` items `[Accueil/Home, Services]`)
- **À modifier** : `src/app/[locale]/(public)/projets/page.tsx` (idem avec items `[Accueil/Home, Projets/Projects]`)
- **À modifier** : `src/app/[locale]/(public)/projets/[slug]/page.tsx` (idem avec items `[Accueil/Home, Projets/Projects, project.title]`, segment dynamique réutilisant la query `findPublishedBySlug` déjà appelée par la page)

**Non touchés** : `src/lib/seo.ts` (sub-project 01 read-only), `src/server/queries/projects.ts` (réutilise `findPublishedBySlug` existante), `src/config/social-links.ts` (read-only pour `sameAs`), `src/lib/assets.ts` (read-only pour `buildAssetUrl`), `next.config.ts`, `package.json`, `prisma/schema.prisma`.

## Architecture approach

- **Séparation en 4 unités** : (1) constante de configuration `EXPERTISE` dans `src/config/expertise.ts`, (2) helpers purs dans `src/lib/seo/json-ld.ts` (testables sans mock), (3) Server Component d'injection dans `src/components/seo/json-ld.tsx` (5 lignes, single responsibility), (4) intégration dans 4 pages. Chaque unité a une responsabilité unique. Voir `.claude/rules/typescript/conventions.md` (alias `@/*`, types via `z.infer`/`typeof`).
- **Constante `EXPERTISE`** dans `src/config/expertise.ts` : 4 entrées `{ name, wikidataId?, wikipediaUrl? }` (3 avec Wikidata `Q11660`/`Q638608`/`Q386275` + 1 sans `AI Training`). Format `as const` typé strict. Cohérent avec le pattern `src/config/social-links.ts` (constante chrome stable, locale-agnostic, source de vérité unique). Les disciplines sont en anglais international (Google et AI engines indexent en anglais pour les concepts, recommandation [Will Scott 2025](https://willscott.me/2025/07/30/sameas-versus-knowsabout-in-schema/)).
- **Helper pur `buildProfilePagePerson({ locale, siteUrl, name, jobTitle, description, email, image, sameAs, expertise }): ProfilePagePerson`** : signature étroite, reçoit toutes les valeurs résolues (aucun appel `getTranslations` ni Prisma à l'intérieur). Compose un objet `{ '@context': 'https://schema.org', '@type': 'ProfilePage', dateModified: <ISO 8601>, mainEntity: { '@type': 'Person', '@id': '<siteUrl>/#person', name, jobTitle, description, url, email, image, sameAs, knowsAbout } }`. Le `Person['@id']` est volontairement **locale-agnostic** (`${siteUrl}/#person`) car c'est la même entité quel que soit la version FR/EN visitée, permet de référencer la Person depuis d'autres schémas futurs (ex: `Article` post-MVP avec `author: { '@id': '<siteUrl>/#person' }` au lieu de redéclarer Person) pour un linking propre dans le Knowledge Graph. Le mapping `expertise → knowsAbout` produit un `Thing` complet `{ '@type': 'Thing', name, '@id': 'https://www.wikidata.org/wiki/<wikidataId>', sameAs: <wikipediaUrl> }` quand `wikidataId` est présent, sinon une string simple (`'AI Training'`). Schema.org accepte le mix `string | Thing` dans `knowsAbout`. Voir `.claude/rules/nextjs/server-client-components.md` (composant Server pur).
- **Helper pur `buildBreadcrumbList({ locale, siteUrl, items }): BreadcrumbList`** : `items: Array<{ name: string; path: string }>` ordonnés du parent vers l'enfant. Compose `{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name, item: '<siteUrl>/<locale><path>' }, ...] }`. URLs absolues construites via `siteUrl` (sub-project 01). Position 1-based conforme schema.org.
- **Server Component `<JsonLd>`** dans `src/components/seo/json-ld.tsx` : signature `{ data: object }`. Sérialise via `JSON.stringify(data)` puis échappe `</script>` en remplaçant `<` par `<` (cf. `.claude/rules/nextjs/metadata-seo.md` qui interdit explicitement l'injection de `</script>` non échappée). Retourne `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />`. Pas de `'use client'`, aucun hook, ~5 lignes.
- **Pages async `Server Component`** : chaque page modifiée appelle `setupLocalePage(params)` (déjà utilisé) puis `getTranslations({ locale, namespace: 'Metadata' })` (cf. `.claude/rules/next-intl/translations.md` pour `getTranslations` async côté serveur), construit l'objet JSON-LD via les helpers, et place `<JsonLd data={...} />` à la fin du JSX (le placement n'a pas d'impact SEO, le `<script>` est hoist par React 19 dans le `<head>` automatiquement, voir `.claude/rules/react/hooks.md`).
- **Page `/a-propos`** : injecte un seul `<JsonLd data={buildProfilePagePerson(...)} />` avec `name = 'Thibaud Geisler'` (chrome), `jobTitle = t('jobTitle')` (nouvelle clé i18n), `description = t('aboutDescription')` (réutilise la clé existante du sub-project 01), `email = 'contact@thibaud-geisler.com'` (extrait depuis `src/config/social-links.ts:12`, sans `mailto:` car `Person.email` attend l'email pur), `image = ${siteUrl}${buildAssetUrl('branding/portrait.jpg')}` (URL absolue), `sameAs = [LinkedIn URL, GitHub URL]` (filtre les `email` du `SOCIAL_LINKS` car schema.org veut des URLs externes dans `sameAs`, pas des `mailto:`), `expertise = EXPERTISE`.
- **Pages `/services`, `/projets`, `/projets/[slug]`** : injectent un `<JsonLd data={buildBreadcrumbList({ items })} />`. Items :
  - `/services` : `[{ name: t('breadcrumbHome'), path: '' }, { name: t('breadcrumbServices'), path: '/services' }]`
  - `/projets` : `[{ name: t('breadcrumbHome'), path: '' }, { name: t('breadcrumbProjects'), path: '/projets' }]`
  - `/projets/[slug]` : `[{ name: t('breadcrumbHome'), path: '' }, { name: t('breadcrumbProjects'), path: '/projets' }, { name: project.title, path: '/projets/${slug}' }]` (`project.title` localisé déjà résolu via `findPublishedBySlug(slug, locale)` cachée).
- **Pages volontairement SANS BreadcrumbList** : home `/` (root, pas de chemin remontant), `/contact` et `/a-propos` (feuilles depuis la nav, leur breadcrumb serait juste `[Home, Contact]` peu utile). YAGNI au MVP.
- **`Metadata.jobTitle` séparé de `AboutPage.hero.headline`** : le headline H1 (`"Thibaud Geisler - IA & Développement Full-Stack"`) contient le nom + le titre. Le JSON-LD a déjà `Person.name` séparé donc on duplique pas. Une clé dédiée `Metadata.jobTitle` (`"IA & développement full-stack"` en FR / `"AI & full-stack development"` en EN) garde le SEO découplé du H1 si tu changes la formulation marketing du H1 plus tard.
- **`dateModified` du `ProfilePage`** : `new Date().toISOString()` au moment du build (suffisant pour MVP). Google recommande sa présence pour signaler la fraîcheur du profil. Si on veut un signal plus précis post-MVP, on peut le piloter par un champ DB ou la date du commit du seed Person.
- **ADRs liés** : ADR-001 (monolithe Next.js, helpers et composants dans la même app), ADR-006 (hub de démos, JSON-LD signe l'identité personnelle "Thibaud Geisler" en tant qu'asset commercial principal d'un freelance), ADR-010 (i18n FR/EN, valeurs traduites via next-intl messages).

## Acceptance criteria

### Scénario 1 : ProfilePage avec Person imbriqué validé Google sur /a-propos FR
**GIVEN** l'application déployée en mode `pnpm build && pnpm start` (`NEXT_PUBLIC_SITE_URL=https://thibaud-geisler.com`)
**WHEN** un visiteur charge `/fr/a-propos` et fait View Source
**THEN** la page contient un `<script type="application/ld+json">` unique pour ProfilePage
**AND** le JSON contient `@context: "https://schema.org"`, `@type: "ProfilePage"`, `dateModified` ISO 8601
**AND** `mainEntity` est un `Person` avec `'@id': "https://thibaud-geisler.com/#person"` (locale-agnostic), `name: "Thibaud Geisler"`, `jobTitle: "IA & développement full-stack"`, `description` issu de `Metadata.aboutDescription` FR, `url: "https://thibaud-geisler.com/fr/a-propos"`, `email: "contact@thibaud-geisler.com"`, `image: "https://thibaud-geisler.com/api/assets/branding/portrait.jpg"`
**AND** `Person.sameAs` contient `["https://www.linkedin.com/in/thibaud-geisler/", "https://github.com/thibaud57"]` (sans le mailto)
**AND** `Person.knowsAbout` contient 4 entrées : 3 `Thing` complets (`Artificial Intelligence` Q11660, `Software Engineering` Q638608, `Web Development` Q386275) + 1 string `"AI Training"`
**AND** Google Rich Results Test retourne "Profile page" éligible sans erreur

### Scénario 2 : Mêmes données traduites sur /en/a-propos
**GIVEN** la même page en `/en/a-propos`
**WHEN** on inspecte le JSON-LD
**THEN** `mainEntity.jobTitle = "AI & full-stack development"`, `mainEntity.description` issu de `Metadata.aboutDescription` EN
**AND** `mainEntity.url = "https://thibaud-geisler.com/en/a-propos"` (locale EN dans l'URL)
**AND** `mainEntity.knowsAbout` reste identique en EN (les disciplines sont locale-agnostic, en anglais)

### Scénario 3 : BreadcrumbList sur /fr/services
**GIVEN** la page `/fr/services`
**WHEN** on inspecte le JSON-LD
**THEN** la page contient un `<script type="application/ld+json">` pour BreadcrumbList
**AND** le JSON contient `@type: "BreadcrumbList"` et un `itemListElement` de 2 ListItems
**AND** ListItem 1 : `position: 1`, `name: "Accueil"`, `item: "https://thibaud-geisler.com/fr"`
**AND** ListItem 2 : `position: 2`, `name: "Services"`, `item: "https://thibaud-geisler.com/fr/services"`
**AND** Google Rich Results Test retourne "Breadcrumbs" éligible sans erreur

### Scénario 4 : BreadcrumbList dynamique sur /fr/projets/[slug]
**GIVEN** un projet publié avec `slug: "webapp-gestion-sinistres"` et `titleFr: "Webapp Gestion Sinistres"`
**WHEN** on charge `/fr/projets/webapp-gestion-sinistres` et inspecte le JSON-LD
**THEN** la page contient un BreadcrumbList avec 3 ListItems
**AND** ListItem 3 : `position: 3`, `name: "Webapp Gestion Sinistres"` (titre projet localisé), `item: "https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres"`

### Scénario 5 : Échappement de `</script>` dans le JSON
**GIVEN** une description Person ou un titre projet contenant accidentellement la chaîne `</script>` (édition utilisateur en post-MVP via dashboard)
**WHEN** le JSON-LD est rendu côté serveur
**THEN** le HTML de sortie ne contient PAS la séquence `</script>` à l'intérieur du `<script type="application/ld+json">`
**AND** la séquence est échappée en `</script>` (le `<` remplacé par `<`)

## Tests à écrire

### Unit

- `src/lib/seo/json-ld.test.ts` :
  - **`buildProfilePagePerson`, structure ProfilePage** : retour contient `'@context': 'https://schema.org'` et `'@type': 'ProfilePage'`
  - **`buildProfilePagePerson`, Person imbriqué** : `mainEntity` est un objet avec `'@type': 'Person'` et toutes les propriétés `'@id'`, `name`, `jobTitle`, `description`, `url`, `email`, `image`, `sameAs`, `knowsAbout` présentes
  - **`buildProfilePagePerson`, Person.@id locale-agnostic** : `mainEntity['@id'] === '<siteUrl>/#person'` quel que soit `locale: 'fr'` ou `locale: 'en'` (même valeur pour les 2 locales)
  - **`buildProfilePagePerson`, URL absolue locale** : `mainEntity.url === '<siteUrl>/fr/a-propos'` quand `locale: 'fr'`, et `'<siteUrl>/en/a-propos'` quand `locale: 'en'`
  - **`buildProfilePagePerson`, image absolue** : `mainEntity.image` commence par `https://` ou `http://`, jamais une URL relative
  - **`buildProfilePagePerson`, sameAs filtre l'email** : si `sameAs: ['https://linkedin.com/x', 'https://github.com/x']` est passé, le retour ne contient pas `mailto:` (le test passe la liste déjà filtrée pour vérifier que le helper ne ré-injecte rien)
  - **`buildProfilePagePerson`, knowsAbout Thing avec wikidataId** : entrée `{ name: 'Artificial Intelligence', wikidataId: 'Q11660', wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence' }` produit `{ '@type': 'Thing', name: 'Artificial Intelligence', '@id': 'https://www.wikidata.org/wiki/Q11660', sameAs: 'https://en.wikipedia.org/wiki/Artificial_intelligence' }`
  - **`buildProfilePagePerson`, knowsAbout string sans wikidataId** : entrée `{ name: 'AI Training' }` produit la string `'AI Training'`
  - **`buildProfilePagePerson`, knowsAbout préserve l'ordre** : 4 entrées passées dans un ordre donné restent dans le même ordre dans `knowsAbout`
  - **`buildProfilePagePerson`, dateModified ISO 8601** : `dateModified` est une string parseable par `new Date()` et `.toISOString()` retourne la même valeur
  - **`buildBreadcrumbList`, structure** : retour contient `'@context': 'https://schema.org'` et `'@type': 'BreadcrumbList'`
  - **`buildBreadcrumbList`, itemListElement length** : N items passés produisent N ListItems
  - **`buildBreadcrumbList`, position 1-based** : les positions sont `1, 2, 3, ...` (pas 0-based)
  - **`buildBreadcrumbList`, item URL absolue avec locale** : `items: [{ name: 'Home', path: '' }, { name: 'Services', path: '/services' }]` avec `locale: 'fr'` produit URLs `<siteUrl>/fr` et `<siteUrl>/fr/services`
  - **`buildBreadcrumbList`, préserve l'ordre des items**

Setup : factories `buildProfileInput(overrides?)` et `buildBreadcrumbInput(overrides?)` (convention vue dans `.claude/rules/nextjs/tests.md`). Constante `SITE_URL_FIXTURE = 'https://thibaud-geisler.com'` réutilisée. Aucun mock de `next-intl`, `next/cache`, Prisma, `next/navigation` : les helpers sont 100% purs.

Tests délibérément exclus (no-lib-test, voir `~/.claude/CLAUDE.md` § Code > Tests) :
- `src/components/seo/json-ld.tsx` : 5 lignes triviales (`JSON.stringify` + `replace` + `dangerouslySetInnerHTML`). Test = framework React + regex documentée.
- `src/config/expertise.ts` : constante typée, pas de logique.
- L'intégration dans les 4 pages : couverte par les acceptance scénarios (Google Rich Results Test + View Source).
- L'échappement `</script>` : le scénario 5 acceptance le valide manuellement.

## Edge cases

- **`Person.knowsAbout` mix `string | Thing` dans le même tableau** : schema.org accepte explicitement (vérifié sur [schema.org/Person](https://schema.org/Person)). Couvert par les tests "Thing avec wikidataId" + "string sans wikidataId" qui valident le mapping conditionnel.
- **`siteUrl` avec trailing slash** : si `process.env.NEXT_PUBLIC_SITE_URL = 'https://thibaud-geisler.com/'`, les URLs `Person.url`, `Person.image`, `BreadcrumbList.item` produiraient un double slash. Les helpers normalisent via `siteUrl.replace(/\/$/, '')` (même logique que `buildSitemapEntries` du sub-project 03 et `app/robots.ts` du sub-project 04).
- **Description vide ou null** : `Person.description` doit toujours être présente (Google warn sinon). Le helper exige `description: string` non-optionnel dans la signature, le compilateur empêche le cas null.
- **Slug projet inexistant sur `/projets/[slug]`** : la page appelle déjà `notFound()` avant le `<JsonLd>` (cf. composant existant + sub-project 01 a aligné le `notFound()` côté `generateMetadata`). Donc `<JsonLd>` n'est jamais rendu sur un slug invalide.
- **`buildAssetUrl('branding/portrait.jpg')` retourne une URL relative** (`/api/assets/branding/portrait.jpg`) : le helper `buildProfilePagePerson` doit la préfixer par `siteUrl` pour produire l'URL absolue requise par schema.org. À documenter dans la signature : le caller passe l'URL absolue déjà construite (`${siteUrl}${buildAssetUrl(...)}`), pas le helper qui s'en charge (séparation pure).
- **`</script>` injecté via `project.title` ou `project.description`** : couvert par l'échappement systématique dans `<JsonLd>` (scénario 5). Aucune dépendance à la sanitization en amont.

## Architectural decisions

### Décision : Format `knowsAbout` : strings simples vs Thing+Wikidata

**Options envisagées :**
- **A. Tableau de strings** : `["Artificial Intelligence", "Software Engineering", "Web Development", "AI Training"]`. Format minimal, valide schema.org.
- **B. Tableau de `Thing` avec `@id` Wikidata + `sameAs` Wikipedia** : `[{ '@type': 'Thing', name: 'Artificial Intelligence', '@id': 'https://www.wikidata.org/wiki/Q11660', sameAs: 'https://en.wikipedia.org/wiki/Artificial_intelligence' }, ...]`. Format enrichi.
- **C. Tableau mixte `string | Thing`** : `Thing` complet pour les disciplines avec page Wikidata existante, string simple pour celles sans (ex: `AI Training`). Format pragmatique.

**Choix : C**

**Rationale :**
- Recherche web 2025-2026 confirme que le format `Thing+Wikidata` est la **vraie** best practice E-E-A-T (sources : [Will Scott juillet 2025](https://willscott.me/2025/07/30/sameas-versus-knowsabout-in-schema/), [Aubrey Yung](https://aubreyyung.com/knowsabout-schema/)) : *"the knowsAbout entity markup is contributing to the source selection signal for the site's declared topical authority areas"*. Les AI engines (Perplexity, ChatGPT, Claude search) exploitent les `@id` Wikidata pour identifier les experts en topic recognition. Coût marginal très faible (1 URL Wikidata + 1 URL Wikipedia par entrée).
- L'option A est valide minimal mais perd le signal sémantique fort. Refactor vers B/C plus tard = exactement le même effort.
- L'option B oblige à inventer ou forcer un Wikidata `@id` pour `AI Training` qui n'a pas de page Wikipedia/Wikidata propre. Risque de pointer vers un terme inexact ("Training" générique vs "AI Training" spécifique).
- L'option C est la plus propre : 3 disciplines avec page Wikidata existante (AI Q11660, Software Engineering Q638608, Web Development Q386275) en `Thing` complet, et `AI Training` en string simple comme fallback honnête. Schema.org accepte explicitement le mix `string | Thing` dans le même tableau. Les tests valident les deux branches.

### Décision : Emplacement de la liste `EXPERTISE` : DB Prisma vs Config typée hardcodée

**Options envisagées :**
- **A. `src/config/expertise.ts`** : constante typée `as const` avec mapping Wikidata, suit le pattern `src/config/social-links.ts`.
- **B. Nouveau modèle Prisma `Expertise`** + migration + seed + lecture via `prisma.expertise.findMany()` cachée.
- **C. Étendre le modèle `Tag` existant** avec colonnes `wikidataId` + `wikipediaUrl`, filtrer `kind: 'EXPERTISE'`.

**Choix : A**

**Rationale :**
- L'option B est sur-ingénierie pour 5 entrées qui ne changent jamais : migration Prisma + seed + dashboard CRUD post-MVP + tests intégration = ~3-4h pour ~5 lignes de constantes. Aucun gain avant que le dashboard admin existe (post-MVP). YAGNI.
- L'option C mélange deux concerns : les Tags servent aujourd'hui purement à l'UI projets (badges, filtres techniques, légalisés en `nameFr`/`nameEn`). Y greffer du SEO Wikidata pollue un modèle stable, et les Tags sont localisés alors que `knowsAbout` doit être stable en anglais international. De plus, certains Tags `kind: 'AI'` sont des outils (`rag`, `mcp`) pas des disciplines, ce qui forcerait à filtrer en plus du filtrage `HIDDEN_ON_ABOUT_TAG_SLUGS` existant.
- L'option A est cohérente avec le pattern projet déjà observé : `src/config/social-links.ts` est exactement la même nature (constante chrome stable, locale-agnostic, source unique de vérité), même emplacement, même format `as const`. Les disciplines d'un freelance ne changent qu'avec un repositionnement commercial intentionnel (rare, manuel par définition). Migration vers DB triviale post-MVP si le besoin émerge réellement.
- Trade-off accepté : 4 entrées en dur dans le repo. Acceptable car c'est de l'identité commerciale, pas du contenu éditorial mouvant.
