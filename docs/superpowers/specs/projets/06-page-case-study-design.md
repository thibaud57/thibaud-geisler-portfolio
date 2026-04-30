---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "page-case-study"
goal: "Afficher la page case study /[locale]/(public)/projets/[slug] avec generateStaticParams + contenu markdown riche + stack groupé + meta structurées"
status: "implemented"
complexity: "L"
tdd_scope: "partial"
depends_on: ["01-schema-prisma-project-design.md", "02-client-prisma-queries-design.md", "03-seed-projets-design.md", "04-route-api-assets-design.md"]
date: "2026-04-21"
---

# Page `/projets/[slug]` — Case Study détaillé

## Scope

Créer la page Server Component `src/app/[locale]/(public)/projets/[slug]/page.tsx` qui charge un projet via `findPublishedBySlug` (sub-project 02), retourne `notFound()` si slug inexistant ou projet non publié, et rend un layout case study complet. Implémenter `generateStaticParams` qui retourne tous les slugs `status = PUBLISHED` × 2 locales (FR/EN). Implémenter `generateMetadata` localisée avec title/description depuis les champs Project + `hreflang alternates`. Créer les composants `CaseStudyLayout` (orchestration), `CaseStudyHeader` (cover image + titre + sous-titre + meta structurées depuis ClientMeta/dates), `TagStackGrouped` (tous les tags du projet groupés par `kind` dans l'ordre fixe `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA` ; dans chaque groupe, tri par `ProjectTag.displayOrder asc` — pas alphabétique), `CaseStudyMarkdown` (rendu markdown via `react-markdown` + Tailwind Typography + wrapper custom pour images), `CaseStudyFooter` (liens démo/GitHub si présents + lien retour vers `/projets`). Installer `react-markdown` et `@tailwindcss/typography` si absents. Ajouter clés i18n `Projects.caseStudy.*`. Écrire 2 tests d'intégration ciblés (`generateStaticParams`, `notFound` sur slug absent/DRAFT). **Exclus** : commentaires, partage social dynamique (Twitter/LinkedIn share buttons), table des matières auto, navigation projet suivant/précédent, scroll progress indicator, related projects section.

### État livré

À la fin de ce sub-project, on peut : accéder à `/fr/projets/<slug>` (où `<slug>` correspond à un projet `PUBLISHED` en BDD) dans le navigateur et voir la case study complète avec cover image, titre, meta structurées (entreprise CLIENT, durée, taille équipe), **section "Stack & Expertises"** groupée par kind dans l'ordre fixe `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA` (groupes vides omis), chaque groupe listant ses tags triés par `ProjectTag.displayOrder asc` (pas alphabétique) avec les icônes Lucide pour `EXPERTISE` et Simple Icons pour les autres kinds, contenu markdown richement formaté (titres, paragraphes, listes, images inline avec légendes automatiques depuis l'alt), et liens démo/GitHub en bas. Accéder à `/fr/projets/slug-inexistant` ou `/fr/projets/slug-draft` retourne une 404 localisée. `pnpm build` pré-génère tous les slugs `PUBLISHED` × 2 locales sans erreur. Les 2 tests Vitest d'intégration passent.

## Dependencies

- `01-schema-prisma-project-design.md` (statut: draft) — utilise les champs `Project.caseStudyMarkdown`, `Project.coverFilename`, `Project.tags` (array de `ProjectTag` avec `displayOrder` par-projet, chaque row expose `tag.kind` incluant `EXPERTISE`), `Project.clientMeta`
- `02-client-prisma-queries-design.md` (statut: draft) — utilise `findPublishedBySlug` qui retourne `LocalizedProjectWithRelations` (type alias qui inclut automatiquement les scalaires + `tags: ProjectTag[]` triés `displayOrder asc` + clientMeta.company)
- `03-seed-projets-design.md` (statut: draft) — au moins 1-2 projets PUBLISHED avec `caseStudyMarkdown` rempli (depuis `prisma/seed-data/case-studies/<slug>.md`) sont nécessaires pour valider visuellement
- `04-route-api-assets-design.md` (statut: implemented, évolué catch-all) — la cover image et les images inline du markdown sont servies via `/api/assets/[...path]` (sous-dossiers `projets/{client,personal}/<slug>/<filename>`)

## Files touched

- **À créer** : `src/app/[locale]/(public)/projets/[slug]/page.tsx` (Server Component + `generateStaticParams` + `generateMetadata`)
- **À créer** : `src/components/features/projects/CaseStudyLayout.tsx` (orchestration sections)
- **À créer** : `src/components/features/projects/CaseStudyHeader.tsx` (cover + title + meta structurées)
- **À créer** : `src/components/features/projects/TagStackGrouped.tsx` (tous les tags groupés par kind dans l'ordre fixe EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA, tri par `ProjectTag.displayOrder` asc dans chaque groupe)
- **À créer** : `src/components/features/projects/CaseStudyMarkdown.tsx` (rendu react-markdown + Image wrapper custom)
- **À créer** : `src/components/features/projects/CaseStudyFooter.tsx` (liens + retour)
- **À créer** : `tests/integration/case-study-page.integration.test.ts` (2 tests Vitest)
- **À modifier** : `package.json` (ajout `react-markdown` + `remark-gfm` + `@tailwindcss/typography` si absents)
- **À modifier** : `src/app/globals.css` ou `tailwind.config.*` (activer plugin `@tailwindcss/typography` pour Tailwind 4)
- **À modifier** : `messages/fr.json` (ajout section `Projects.caseStudy.*`)
- **À modifier** : `messages/en.json` (ajout section `Projects.caseStudy.*`)

## Architecture approach

### Server Component `page.tsx`

- **Route** : `src/app/[locale]/(public)/projets/[slug]/page.tsx` dans le route group `[locale]/(public)/projets/` (sibling de `page.tsx` du sub-project 05).
- **Async params** : `params: Promise<{ locale: string; slug: string }>`, `const { locale, slug } = await params`. Next 15+ + next-intl 4.
- **`setRequestLocale(locale)`** obligatoire en tête pour supporter le rendu statique par locale. Conforme à [.claude/rules/next-intl/setup.md](../../../../.claude/rules/next-intl/setup.md).
- **`hasLocale(routing.locales, locale)`** comme type guard avec `notFound()` si invalide.
- **Fetch server-side** : `const project = await findPublishedBySlug(slug, locale)` (sub-project 02). Si `project === null` : `notFound()` (slug absent OU projet non PUBLISHED). Conforme à [.claude/rules/nextjs/data-fetching.md](../../../../.claude/rules/nextjs/data-fetching.md).
- **Passage props** : la page rend `<CaseStudyLayout project={project} locale={locale} />`.
- **Pas d'ISR ou cache explicite** : `generateStaticParams` pré-génère les pages à la build, `cacheComponents: true` de Next 16 active le Partial Prerendering automatiquement. Conforme à [.claude/rules/nextjs/rendering-caching.md](../../../../.claude/rules/nextjs/rendering-caching.md).
- **`generateStaticParams`** : async, utilise `prisma.project.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true } })` pour récupérer uniquement les slugs publiés (pas d'include, minimal payload). Retourne un produit cartésien `slug × locale` : `routing.locales.flatMap(locale => slugs.map(({ slug }) => ({ locale, slug })))`.
- **`generateMetadata`** : async, récupère le projet via `findPublishedBySlug`, retourne `{ title: project.title, description: project.description, alternates: { languages: { fr: '/fr/projets/<slug>', en: '/en/projets/<slug>' } } }`. Si projet absent, la metadata reste vide (Next.js gère avec le `notFound` de la page elle-même). Conforme à [.claude/rules/nextjs/metadata-seo.md](../../../../.claude/rules/nextjs/metadata-seo.md).

### Composant `CaseStudyLayout` (Server Component)

Orchestre les sections principales dans un `<article>` container Tailwind responsive, dans cet ordre :
1. `CaseStudyHeader` (cover + titre + meta structurées)
2. `CaseStudyMarkdown` — rendue conditionnellement si `caseStudyMarkdown` non null
3. `TagStackGrouped` (tous les tags du projet groupés par kind dans l'ordre fixe EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA) — omise si le projet n'a aucun tag
4. `CaseStudyFooter` (liens + retour)

La hiérarchie de lecture est : header (contexte immédiat) → narration libre (contexte métier et apprentissages) → stack & expertises groupées (preuve technique structurée). Le groupe `EXPERTISE` en tête de la section Stack met en avant la valeur métier du projet, les autres groupes descendent de la base applicative (LANGUAGE) vers les surfaces périphériques (INFRA). Chaque section est auto-omise si son contenu est vide, pas de bloc blanc.

### Composant `CaseStudyHeader` (Server Component)

- **Cover image** : identique au pattern de `ProjectCard` du sub-project 05 — `<Image src="/api/assets/<coverFilename>">` où `coverFilename` est un chemin relatif nested `projets/{client,personal}/<slug>/cover.webp` (route catch-all, convention dans `.claude/rules/nextjs/assets.md`). Gradient fallback si null. Affichée en grand (hauteur ~400px desktop, responsive).
- **Titre H1** : `project.title` (classes Tailwind typography pour grand titre).
- **Badges Format** sous le titre : `project.formats.map(format => <Badge variant="outline">{t(`Projects.formats.${format}`)}</Badge>)` — étiquettes catégoriques sans icône (cohérent avec la card liste). Omis si `formats.length === 0`.
- **Sous-titre** : `project.description` (teaser court en lead texte).
- **Meta structurées** : grille 2x2/3x2 ou colonnes compactes sur desktop, stack verticale sur mobile. Structure en 2 blocs :
  - **Bloc Entreprise** (si `clientMeta.company` présent, projet CLIENT) : logo + nom en grand (pas 20px comme la card, plutôt 40-48px), lien vers le site web si `websiteUrl` présent, meta secondaires en dessous en texte `text-sm text-muted-foreground` : secteurs (join "/", ex: "Assurance / Banque"), taille (enum `CompanySize` localisée : "TPE", "PME", "ETI", "Groupe"), locations (join "/", ex: "Luxembourg / Europe").
  - **Bloc Mission** (grille méta 3-4 items, toutes conditionnelles sauf durée) :
    - `clientMeta.teamSize` → `t('Projects.caseStudy.meta.teamSizeValue', { count: teamSize })` ("3 personnes" / "People: 3" via ICU plural)
    - `clientMeta.contractStatus` → label traduit via `Projects.caseStudy.contractStatus.*` (FREELANCE / CDI / STAGE / ALTERNANCE)
    - `clientMeta.workMode` → label traduit via `Projects.caseStudy.workMode.*` (PRESENTIEL → "Présentiel" / "On-site", HYBRIDE → "Hybride" / "Hybrid", REMOTE → "Remote")
    - Durée : formaté depuis `startedAt` + `endedAt` (ex: "2022 — 2024" ou "2022 — En cours" si `endedAt` null)
- **Lien retour** : `<Link href="/projets">← {t('backToList')}</Link>` en haut à gauche (mobile-friendly).

### Composant `TagStackGrouped` (Server Component)

- **Props** : `{ tags: ProjectTag[] }` où chaque `ProjectTag` expose `displayOrder` + relation `tag` (type Prisma `{ slug, name, kind, icon }`). Le tableau arrive déjà trié `displayOrder asc` côté query (sub-project 02).
- **Filtrage** : aucun — tous les tags du projet (y compris `EXPERTISE`) sont affichés ; c'est le groupement par `kind` qui structure le rendu.
- **Regroupement par `TagKind`** via `Array.reduce` (compat large ; `Object.groupBy` ES2024 reste une option si target projet = es2024). Le résultat est un objet `Partial<Record<TagKind, ProjectTag[]>>`.
- **Ordre d'affichage fixe des groupes** : `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA`. Le groupe `EXPERTISE` est en tête car il raconte la valeur métier (ce que tu maîtrises via ce projet), puis la stack descend de la base applicative (LANGUAGE / FRAMEWORK / DATABASE) vers l'IA applicative puis les outils périphériques et l'infra.
- **Ordre d'affichage dans chaque groupe** : tri par `displayOrder ASC` (pas alphabétique). Comme le tableau en props est déjà trié par la query Prisma, aucun re-tri côté composant — le groupement par `reduce` en parcourant le tableau ordonné préserve naturellement l'ordre.
- **Rendu** : titre principal de section `t('Projects.caseStudy.stackTitle')` (ex: "Stack & Expertises" en FR), puis pour chaque kind non-vide un sous-titre localisé via `t('Projects.caseStudy.kind.<KIND>')` (ex: "Expertises", "Langages", "Frameworks", "Bases de données", "IA", "Outils", "Infrastructure") + grille de `TagBadge` (réutilisé du sub-project 05).
- **Mise en valeur visuelle du groupe `EXPERTISE`** : même composant `TagBadge` mais classe optionnelle pour badge un peu plus grand (ex: `className="text-base px-3 py-1"` pour le seul groupe EXPERTISE), sans introduire un composant dédié. Les autres groupes utilisent la taille standard.
- **Skip si kind absent** : si un projet n'utilise pas de `DATABASE`, la section Databases n'apparaît pas.
- **Composant entier retourne `null`** si `tags.length === 0` (projet sans tag — très rare).

### Composant `CaseStudyMarkdown` (Server Component)

- **Props** : `{ markdown: string }`.
- **Render via `react-markdown`** avec `remark-gfm` (GitHub Flavored Markdown : tables, checklists, strikethrough).
- **Wrapper autour** : classe `prose prose-lg dark:prose-invert max-w-none` (plugin `@tailwindcss/typography`).
- **Custom renderer pour les images** : wrap `<img>` markdown en `<figure>` contenant `<Image>` Next.js + `<figcaption>` dérivée de l'`alt` du markdown. L'alt (`![Dashboard](/api/assets/projets/personal/<slug>/dashboard.png)`) devient légende visible sous l'image. Accessibilité : `alt` vide si légende vide, sémantique `<figure>` correcte.
- **Custom renderer pour les liens externes** : ajouter `target="_blank" rel="noopener noreferrer"` si `href` commence par `http`.

### Composant `CaseStudyFooter` (Server Component)

- **Props** : `{ project: LocalizedProjectWithRelations, locale: string }`.
- **Rendu** :
  - Bloc "Liens" : boutons `Démo` (si `demoUrl` non-null) + `GitHub` (si `githubUrl` non-null). Utilise `Button` shadcn + Lucide icons (`ExternalLink`, `Github`).
  - Lien retour : `<Link href="/projets">← Retour aux projets</Link>`.
- **Masquage conditionnel** : si ni `demoUrl` ni `githubUrl`, le bloc "Liens" est omis.

### Tests `case-study-page.integration.test.ts`

2 tests ciblés sur la logique métier (pas de test sur le rendu markdown ou la mise en page) :

1. **`generateStaticParams` retourne uniquement les projets PUBLISHED × 2 locales** :
   - Fixtures : 1 `PUBLISHED`, 1 `DRAFT`, 1 `ARCHIVED` en BDD
   - Appel `generateStaticParams()`
   - Assert : résultat = `[{ locale: 'fr', slug: 'p1' }, { locale: 'en', slug: 'p1' }]` (uniquement le PUBLISHED × 2 locales)

2. **`findPublishedBySlug` + comportement `notFound` attendu** :
   - Fixtures : 1 `PUBLISHED` slug `'pub'`, 1 `DRAFT` slug `'draft'`
   - Appel `findPublishedBySlug('draft')` → retourne `null` (couvert déjà par tests sub-project 02)
   - Appel `findPublishedBySlug('inexistant')` → retourne `null` (couvert déjà sub-project 02)
   - **Ce test vérifie juste que la page `page.tsx` appelle `notFound()` quand le retour est null** : pour éviter de tester du plumbing Next.js, ce test se limite à vérifier que la route handler `GET` du cas absent retourne 404 (via un `expect(response.status).toBe(404)` sur un fetch).

En pratique, le test 2 peut être réalisé via un smoke test `curl http://localhost:3000/fr/projets/inexistant` dans le plan (pas un test Vitest). → On garde seulement le test 1 (generateStaticParams) en Vitest intégration.

→ `tdd_scope = partial` confirmé (1 test ciblé sur la règle métier `generateStaticParams` + smoke test manuel pour `notFound`).

## Acceptance criteria

### Scénario 1 : Pré-génération SEO

**GIVEN** la BDD contient 3 projets (1 PUBLISHED slug `'p1'`, 1 DRAFT slug `'p2'`, 1 ARCHIVED slug `'p3'`) et `routing.locales = ['fr', 'en']`
**WHEN** on exécute `pnpm build`
**THEN** Next.js pré-génère 2 pages statiques : `/fr/projets/p1` et `/en/projets/p1`
**AND** aucune page n'est générée pour `p2` ou `p3`
**AND** `pnpm build` termine sans erreur

### Scénario 2 : Rendu page case study avec contenu riche

**GIVEN** un projet PUBLISHED en BDD avec tous les champs remplis : `title`, `description`, `formats` (ex: `[WEB_APP, API]`), `coverFilename`, `caseStudyMarkdown`, `tags` (8 rows `ProjectTag` : 2 EXPERTISE + 6 multi-kinds technos, `displayOrder` 0→7 reflétant l'ordre `tagSlugs[]` du seed), `clientMeta` (`teamSize`, `contractStatus`, `workMode`, relation `company` avec logo/sectors/size/locations), `startedAt`, `endedAt`, `githubUrl`, `demoUrl`
**WHEN** le visiteur accède à `/fr/projets/<slug>`
**THEN** la page affiche dans l'ordre : cover image en grand (via `/api/assets/<coverFilename>`), titre H1, description en lead, grille meta (entreprise + équipe + contrat + durée)
**AND** le contenu `caseStudyMarkdown` est rendu richement (titres H2/H3, paragraphes, listes, images inline avec légendes depuis alt)
**AND** la section "Stack & Expertises" groupe les 8 tags par kind dans l'ordre fixe `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA` avec sous-titres localisés, chaque groupe listant ses tags triés par `displayOrder asc` (pas alphabétique)
**AND** dans le groupe `EXPERTISE`, les badges ont une taille légèrement plus marquée (mise en valeur)
**AND** les images du markdown sont servies via `/api/assets/<filename>`
**AND** le footer affiche les 2 boutons Démo + GitHub et le lien "← Retour aux projets"

### Scénario 3 : Projet sans `caseStudyMarkdown`

**GIVEN** un projet PUBLISHED avec `caseStudyMarkdown = null` (fichier `.md` manquant dans `case-studies/`)
**WHEN** le visiteur accède à la page case study
**THEN** les sections Header + TagStackGrouped + Footer sont affichées normalement
**AND** la section markdown est simplement absente (pas de bloc vide)

### Scénario 4 : Slug inexistant

**GIVEN** aucune row en BDD avec slug `'slug-inexistant'`
**WHEN** le visiteur accède à `/fr/projets/slug-inexistant`
**THEN** la page retourne status HTTP 404
**AND** la 404 localisée (Next.js `not-found.tsx` du projet) s'affiche

### Scénario 5 : Projet DRAFT non accessible

**GIVEN** un projet en BDD avec `status = DRAFT` et slug `'mon-brouillon'`
**WHEN** le visiteur accède à `/fr/projets/mon-brouillon`
**THEN** la page retourne 404 (même si le slug existe, le filtre `status=PUBLISHED` masque)
**AND** la 404 localisée s'affiche

### Scénario 6 : Metadata SEO localisée

**GIVEN** un projet PUBLISHED en BDD avec `title = 'Foyer'` et `description = 'Dev Scala/Angular chez Foyer Luxembourg'`
**WHEN** on inspecte le `<head>` de `/fr/projets/foyer`
**THEN** `<title>` contient `Foyer` (éventuellement suffixé par le template global du projet)
**AND** `<meta name="description">` contient la description exacte
**AND** `<link rel="alternate" hreflang="en">` pointe vers `/en/projets/foyer`
**AND** `<link rel="alternate" hreflang="fr">` pointe vers `/fr/projets/foyer`

### Scénario 7 : Stack groupé par kind dans l'ordre fixe

**GIVEN** un projet PUBLISHED lié à 7 `ProjectTag` avec `displayOrder` 0→6 : `typescript` (LANGUAGE, displayOrder=0), `anti-bot-scraping` (EXPERTISE, displayOrder=1), React (FRAMEWORK, displayOrder=2), PostgreSQL (DATABASE, displayOrder=3), `anonymization` (EXPERTISE, displayOrder=4), Docker (INFRA, displayOrder=5), OpenAI (AI, displayOrder=6)
**WHEN** la page case study rend le layout complet
**THEN** la section `TagStackGrouped` s'affiche avec 6 sous-groupes dans l'ordre fixe `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA`
**AND** le groupe `EXPERTISE` contient `[anti-bot-scraping (displayOrder=1), anonymization (displayOrder=4)]` dans cet ordre (tri par `displayOrder asc`, pas alphabétique : Anonymisation n'arrive PAS avant Scraping alors qu'elle viendrait en premier alphabétiquement)
**AND** chaque sous-section a un sous-titre localisé (ex: "Expertises" / "Expertise", "Langages" / "Languages")
**AND** les badges du groupe `EXPERTISE` ont un style légèrement plus marqué que les autres groupes
**AND** un kind sans tag sur un projet n'a pas de sous-section (skip si groupe vide)

### Scénario 8 : Projet sans expertises

**GIVEN** un projet PUBLISHED avec uniquement des tags technos (aucun `EXPERTISE`)
**WHEN** la page case study rend le layout
**THEN** la section `TagStackGrouped` s'affiche avec uniquement les groupes non-EXPERTISE présents (ex: LANGUAGE + FRAMEWORK + DATABASE)
**AND** aucun bloc vide, aucun titre orphelin pour le groupe `EXPERTISE`

## Tests à écrire

### Integration

- `tests/integration/case-study-page.integration.test.ts` :
  - **Test 1** : `generateStaticParams` retourne uniquement les slugs `PUBLISHED` × `routing.locales` (couvre scénario 1). Fixtures : 1 PUBLISHED, 1 DRAFT, 1 ARCHIVED. Assert : array contient les 2 entrées `{ locale: 'fr'|'en', slug: 'p1' }` et rien d'autre.

Le scénario 4 (slug inexistant → 404) et scénario 5 (DRAFT → 404) sont couverts par les tests du sub-project 02 (`findPublishedBySlug` retourne null) + smoke test manuel via curl dans le plan. Écrire un test Vitest qui monte une app Next.js pour tester `notFound()` = plumbing Next.js, hors scope règle no-lib-test.

Les autres scénarios (2, 3, 6, 7) sont validés par le smoke test visuel dans le plan (accès navigateur + inspect DOM).

→ `tdd_scope = partial` (1 test ciblé sur la règle métier `generateStaticParams`).

## Edge cases

- **Projet sans cover** (`coverFilename = null`) : gradient fallback affiché en header, comme sur la card de la liste. Cohérent sub-project 05.
- **Projet sans `clientMeta`** (PERSONAL) : la grille meta n'affiche que les infos disponibles (durée, pas d'entreprise ni équipe). Display conditionnel.
- **Projet PUBLISHED avec `endedAt = null`** (mission en cours) : durée affichée "2023 — En cours" (via label traduit).
- **Markdown vide** (`''` ou `null`) : section markdown omise totalement. Page valide sans elle.
- **Markdown avec images cassées** : `react-markdown` rend un `<img>` ; si l'URL retourne 404 côté serveur (`/api/assets/...`), le navigateur affiche l'alt text seul. Pas de crash.
- **Markdown très long** : pas de pagination ni scroll lock. Responsive via prose.
- **Projet sans tags** (peu probable mais possible) : `TagStackGrouped` retourne `null`. Le layout rend Header + Markdown + Footer sans bloc vide.
- **Projet avec uniquement des tags EXPERTISE (pas de technos)** : `TagStackGrouped` affiche uniquement le groupe `EXPERTISE`, pas de groupes LANGUAGE/FRAMEWORK/etc.
- **Projet avec uniquement des tags non-EXPERTISE (pas de expertises)** : le groupe `EXPERTISE` est skippé, les autres groupes s'affichent normalement. Couvert par Scénario 8.
- **Slug avec caractères spéciaux** (`é`, `à`) : la route Next.js les accepte. `findPublishedBySlug` compare strictement — le slug en BDD doit matcher. Si typo de slug dans l'URL : 404.
- **Locale invalide dans l'URL** (`/de/projets/foo`) : `hasLocale` renvoie false → `notFound()`.
- **Build timeout** sur `generateStaticParams` avec trop de slugs : non applicable en MVP (~10 projets), à revoir si le volume explose.

## Architectural decisions

### Décision : `caseStudyMarkdown` comme champ String unique en BDD (pas Json structuré ni MDX)

**Options envisagées :**
- **A. Champ String unique markdown libre** : 1 champ `caseStudyMarkdown String?` sur Project, contenu markdown libre, rendu via `react-markdown` + Tailwind Typography. Flexibilité totale sur la structure (chaque projet a ses propres titres/sections).
- **B. Champ Json structuré** : `caseStudyContent Json?` avec structure fixe `{ context, challenges, solution, screenshots[] }`. Structure cohérente entre projets mais rigide.
- **C. Fichiers MDX** : 1 fichier `content/projets/<slug>.mdx` par projet. Flexibilité + JSX inline. Diverge du pattern "tout en BDD" acté par ADR-013.

**Choix : A**

**Rationale :**
- Conforme à ADR-013 (stockage en BDD, MDX écarté pour cohérence avec la gestion projets).
- Flexibilité nécessaire : l'exemple concret Foyer (fourni par le user) montre une structure très riche (Contexte / Stack / 3 Réalisations imbriquées / Impact / Liens) qu'un Json structuré fixe ne peut pas capturer naturellement. Un projet perso CLI aura une structure beaucoup plus simple (2 paragraphes).
- Édition : le user écrit dans `seed-data/projects.ts` via template strings TypeScript multi-lignes (dans VSCode), ou plus tard dans un dashboard admin avec textarea markdown.
- Pas de duplication des champs structurés : `caseStudyMarkdown` ne contient PAS le titre (déjà dans `Project.title`), ni les expertises / technos (déjà via `Project.tags`), ni l'entreprise (déjà dans `ClientMeta.company.name`), ni le format (déjà dans `Project.formats`). Il contient uniquement le contenu **narratif riche** (prose + images + liens).

### Décision : Composant unique `TagStackGrouped` avec 6 groupes dans l'ordre fixe EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA

**Options envisagées :**
- **A. 1 seul composant `TagStackGrouped`** qui regroupe tous les tags (y compris EXPERTISE) par kind dans un ordre fixe. Le groupe `EXPERTISE` a une mise en valeur visuelle légère (badge plus grand), les autres groupes sont en style standard. Section unique rendue après le markdown.
- **B. 2 composants distincts (`ExpertiseSection` en haut + `TagStackGrid` hors EXPERTISE en bas)** : le layout intercalerait le markdown entre les deux. Plus de fichiers, plus de visuel "Expertises mises en premier".
- **C. Pas de distinction, toutes les tags dans une seule grille sans regroupement par kind** : simple mais perd la structure sémantique.

**Choix : A**

**Rationale :**
- Le groupement par kind reste l'information structurante : le visiteur voit d'un coup d'œil quelles expertises + quel langage + quels frameworks + etc.
- Placer `EXPERTISE` **dans** la même section (en tête) plutôt que dans un composant séparé simplifie le layout (pas d'intercalation markdown/expertise/stack) et garde la mise en avant métier via la position et le style. La case study reste lisible : Header → Markdown (narration) → Stack & Expertises groupées → Footer.
- Ordre fixe **EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA** : expertises en tête (valeur métier), puis la stack descend de la base applicative (LANGUAGE) vers les surfaces (INFRA). L'ordre `AI` avant `INFRA` positionne l'IA comme couche applicative (proche des frameworks) plutôt que comme outil périphérique, cohérent avec les projets portant une valeur IA.
- Tri par `displayOrder asc` dans chaque groupe (pas alphabétique) : l'auteur du seed choisit l'ordre dans `tagSlugs[]`, qui se propage à `ProjectTag.displayOrder`, qui pilote l'ordre dans chaque groupe. Ex: si `tagSlugs: ['anti-bot-scraping', 'typescript', ...]`, alors `anti-bot-scraping` (EXPERTISE) a `displayOrder=0` et apparaîtra avant toute autre expertise ayant un `displayOrder` plus grand.
- Kinds vides skippés (pas de section vide). Composant entier retourne `null` si aucun tag.
- Cohérence avec la décision sub-project 01 d'avoir `TagKind` discriminant à 6 valeurs et `ProjectTag.displayOrder` par-projet, c'est exactement l'usage anticipé.

### Décision : `react-markdown` + `@tailwindcss/typography` plutôt que MDX ou bibliothèque lourde

**Options envisagées :**
- **A. `react-markdown` + `remark-gfm` + `@tailwindcss/typography`** : rendu markdown léger, plugins GitHub flavored, style automatique via prose. Pas de setup MDX.
- **B. `@next/mdx`** : support MDX natif Next.js. Plus puissant (JSX inline) mais setup plus lourd + diverge ADR-013.
- **C. Bibliothèque custom de rendu** : écrire un parser maison. Overkill.

**Choix : A**

**Rationale :**
- Le contenu case study est du markdown pur enrichi d'images inline. `react-markdown` + `remark-gfm` couvre 100% des besoins.
- `@tailwindcss/typography` (plugin `prose`) gère automatiquement : hiérarchie titres, espacement paragraphes/listes, couleurs dark mode, blockquotes, code blocks. **Zéro CSS custom** à écrire.
- Custom renderer `img` → `<figure>` avec `next/image` + `<figcaption>` depuis l'alt = légendes propres et images optimisées.
- Setup minimal : 3 packages (`react-markdown`, `remark-gfm`, `@tailwindcss/typography`), plugin Tailwind activé dans `globals.css` ou config.
- Packages maintenus et ultra-communs (millions de téléchargements/semaine). Conforme à [.claude/rules/react/hooks.md](../../../../.claude/rules/react/hooks.md) (pas d'over-engineering).

### Décision : `generateStaticParams` × `routing.locales` avec produit cartésien

**Options envisagées :**
- **A. Produit cartésien `slug × locale`** : `routing.locales.flatMap(locale => slugs.map(slug => ({ locale, slug })))`. Next.js pré-génère `/fr/projets/p1`, `/en/projets/p1`, etc.
- **B. `slug` seulement, locale gérée par middleware** : `generateStaticParams` renvoie juste les slugs. Le middleware Next.js gère la locale dynamiquement.
- **C. Pas de `generateStaticParams`** : pages dynamiques SSR à chaque requête. Plus simple mais perd l'avantage SEO de la pré-génération.

**Choix : A**

**Rationale :**
- ADR-003 précise explicitement l'usage de `generateStaticParams` pour SEO.
- Le pattern `[locale]/[slug]` demande une pré-génération explicite par tuple locale+slug (contrainte Next.js App Router).
- Volume faible (~10 projets × 2 locales = 20 pages), build time négligeable.
- Pages statiques = TTFB minimal, Lighthouse optimal.

### Décision : Pas de navigation prev/next projet en MVP

**Options envisagées :**
- **A. Pas de nav prev/next** : seulement "← Retour aux projets" en footer.
- **B. Nav prev/next par `displayOrder`** : en footer, liens vers le projet précédent et suivant dans l'ordre d'affichage de la liste.

**Choix : A**

**Rationale :**
- YAGNI : pas de demande explicite, l'utilisateur peut revenir à la liste et cliquer sur un autre projet en 2 clics.
- Complexité : déterminer le prev/next nécessite de fetch la liste complète des projets ou faire une query supplémentaire. Pas justifié MVP.
- Ajoutable plus tard si analytics montrent que les visiteurs naviguent entre cases studies successivement.

