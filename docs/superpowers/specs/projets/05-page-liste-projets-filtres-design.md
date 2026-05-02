---
feature: "Feature 2 — Projets (liste + case studies)"
subproject: "page-liste-projets-filtres"
goal: "Afficher la page publique /[locale]/(public)/projets avec liste BentoGrid filtrable par type CLIENT/PERSONAL/Tous, cards cliquables vers le case study"
status: "implemented"
complexity: "L"
tdd_scope: "partial"
depends_on: ["01-schema-prisma-project-design.md", "02-client-prisma-queries-design.md", "03-seed-projets-design.md"]
date: "2026-04-21"
---

# Page `/projets` : Liste filtrable avec BentoGrid + Tabs custom

## Scope

Créer la page Server Component `src/app/[locale]/(public)/projets/page.tsx` qui SSR la liste via `findManyPublished` (sub-project 02), un composant Client `ProjectFilters` (Tabs custom minimaliste avec sémantique `role="tablist"` + `role="tab"` + `aria-selected`, Tous / Clients / Perso, 'Tous' par défaut), un composant Client `ProjectsList` (state local `useState<'ALL' | 'CLIENT' | 'PERSONAL'>`, filtre client-side via `array.filter`, map vers `ProjectCard`), un composant `ProjectCard` (BentoCard Magic UI, card entière cliquable vers `/[locale]/(public)/projets/[slug]`, image cover via `/api/assets/<coverFilename>` avec fallback gradient, title + **badges `Format` outline sans icône** sous le titre (labels localisés via i18n), description teaser, **3 premiers tags du projet** depuis `project.tags` (array de `ProjectTag` déjà trié ASC par `displayOrder` côté query, tous kinds mélangés dans l'ordre défini par-projet) + `+N`, **bloc entreprise inline** (logo miniature + nom, sans badge) si CLIENT via `clientMeta.company`, badge `En cours` si `endedAt = null`), un sub-composant `TagBadge` unifié (délègue au renderer Simple Icons ou Lucide selon le préfixe de `tag.icon`, fallback texte si `icon = null`). Ajouter clés i18n `Projects.*` dont `Projects.formats.*` pour les labels ProjectFormat dans `messages/fr.json` et `messages/en.json`. Générer la metadata SEO via `generateMetadata` + `getTranslations`. Écrire 1 test Vitest ciblé sur la logique de filtrage (règle no-lib-test). **Exclus** : pagination (volume ~10 projets), recherche textuelle, tri alternatif par date (reporté UI v2), liens démo/GitHub sur la card (réservés au case study), page case study `/projets/[slug]` (sub-project 06), dashboard admin (post-MVP).

### État livré

À la fin de ce sub-project, on peut : accéder à `/fr/projets` et `/en/projets` dans le navigateur et voir les projets seedés (sub-project 03) sous forme de cards BentoCard avec cover image + titre + **badges Format outline sans icône** (ex: "API / Web App") + description + 3 premiers badges `Tag` du projet (ordre pré-trié par `ProjectTag.displayOrder` asc côté query, tous kinds mélangés selon ce que l'auteur a mis en avant dans `tagSlugs[]`, chacun avec son icône Simple Icons ou Lucide) + **bloc entreprise inline** (logo miniature + nom) si CLIENT + badge 'En cours'. Le clic sur un onglet (Tous / Clients / Perso) filtre les cards visibles sans rechargement de page. Le clic sur une card navigue vers `/[locale]/projets/[slug]` (404 tant que sub-project 06 pas implémenté). Le test `ProjectsList.test.tsx` passe au vert. `generateMetadata` produit des balises `<title>` et `<meta description>` localisées, avec hreflang alternates FR/EN.

## Dependencies

- `01-schema-prisma-project-design.md` (statut: draft), la page utilise les champs `coverFilename`, `clientMeta`, `tags` du modèle `Project` (le modèle `Tag` expose `kind`, `icon` ; `ProjectTag` expose `displayOrder` par-projet)
- `02-client-prisma-queries-design.md` (statut: draft), la page consomme `findManyPublished({ type? })` et le type `ProjectWithRelations` (tags nested via `ProjectTag` triés `displayOrder asc` côté query)
- `03-seed-projets-design.md` (statut: draft), au moins 1-2 projets seedés sont nécessaires pour valider visuellement le rendu

Note : la route `/api/assets/[filename]` (sub-project 04) doit être implémentée pour servir les cover images ; sinon les cards afficheront le fallback gradient.

## Files touched

- **À créer** : `src/app/[locale]/(public)/projets/page.tsx` (Server Component : `generateMetadata` localisé + rendu SSR de `ProjectsList`)
- **À créer** : `src/components/features/projects/ProjectsList.tsx` (Client Component : `'use client'`, `useState` pour le filtre, rend `ProjectFilters` + grille de `ProjectCard`)
- **À créer** : `src/components/features/projects/ProjectFilters.tsx` (Client Component : Tabs custom minimaliste avec sémantique ARIA, props `{ value, onChange }`, 3 onglets fixes)
- **À créer** : `src/components/features/projects/ProjectCard.tsx` (Client Component : `'use client'`, rendu comme enfant de `ProjectsList` côté client, BentoCard Magic UI + Next.js `Link` cliquable, affichage conditionnel badges Format + Tag + Company + InProgress)
- **À créer** : `src/components/features/projects/TagBadge.tsx` (Client Component : rendu à l'intérieur de `ProjectCard` côté client, badge shadcn qui délègue dynamiquement au renderer d'icône selon le préfixe de `tag.icon`, `simple-icons:*` → composant de `@icons-pack/react-simple-icons`, `lucide:*` → composant de `lucide-react`, `null` → fallback texte seul)
- **À créer** : `src/components/features/projects/FormatBadge.tsx` (Client Component : wrapper shadcn `Badge variant="outline"` affichant le label localisé du `ProjectFormat` (ex: "API", "Web App", "App Mobile"...) **sans icône**. Rendu comme étiquette catégorique sous/à côté du titre du projet)
- **À créer** : `src/components/features/projects/__tests__/ProjectsList.test.tsx` (Vitest + Testing Library : 1 test filtrage)
- **À installer via CLI shadcn** : `src/components/magicui/bento-grid.tsx` (si absent, via `pnpm shadcn add "@magicui/bento-grid"` ou similaire selon le registry configuré dans `components.json`)
- **À modifier** : `messages/fr.json` (ajout section `Projects`)
- **À modifier** : `messages/en.json` (ajout section `Projects`)

## Architecture approach

### Server Component `page.tsx`

- **Route** : `src/app/[locale]/(public)/projets/page.tsx` dans le route group `[locale]/(public)` existant. Conforme à [.claude/rules/nextjs/routing.md](../../../../.claude/rules/nextjs/routing.md).
- **Async params** : `params: Promise<{ locale: string }>`, `const { locale } = await params`. Next 15+ + next-intl 4.
- **`setRequestLocale(locale)`** obligatoire en tête pour supporter le rendu statique par locale. Conforme à [.claude/rules/next-intl/setup.md](../../../../.claude/rules/next-intl/setup.md).
- **`hasLocale(routing.locales, locale)`** comme type guard avec `notFound()` si invalide.
- **Fetch server-side** : `const projects = await findManyPublished()` (pas de filtre côté query, filtre géré côté client par `ProjectsList`). Conforme à [.claude/rules/nextjs/data-fetching.md](../../../../.claude/rules/nextjs/data-fetching.md).
- **Passage props** : la page rend `<ProjectsList projects={projects} />` côté serveur, les cards sont pré-rendues statiquement.
- **Pas de cache directive `'use cache'`** : la query BDD est dynamique (contenu change au fur et à mesure des seeds). Next 16 peut optimiser via Partial Prerendering (config `cacheComponents: true` déjà active dans `next.config.ts`) sans effort explicite.
- **`generateMetadata`** : `async function generateMetadata({ params })` qui récupère `locale` puis `getTranslations({ locale, namespace: 'Projects' })`, retourne `{ title, description, alternates: { languages: { fr: '/fr/projets', en: '/en/projets' } } }`. Conforme à [.claude/rules/nextjs/metadata-seo.md](../../../../.claude/rules/nextjs/metadata-seo.md).

### Client Component `ProjectsList`

- **`'use client'`** directive en tête. Conforme à [.claude/rules/nextjs/server-client-components.md](../../../../.claude/rules/nextjs/server-client-components.md).
- **Props** : `{ projects: ProjectWithRelations[] }` (type importé depuis `@/types/project`, sub-project 02).
- **State** : `const [filter, setFilter] = useState<ProjectsFilter>('ALL')` où `type ProjectsFilter = 'ALL' | 'CLIENT' | 'PERSONAL'`. Conforme à [.claude/rules/react/hooks.md](../../../../.claude/rules/react/hooks.md).
- **Filtrage** : `const visible = filter === 'ALL' ? projects : projects.filter(p => p.type === filter)`. Logique simple côté client (volume faible).
- **Layout** : `<BentoGrid>` (Magic UI) qui accepte des children BentoCard en layout asymétrique. Responsive via config par défaut du registry Magic UI.
- **Pas de `key={filter}`** pour re-render : le `map` sur `visible` suffit, React diff correctement.
- **Rendu vide** : si `visible.length === 0`, afficher un message localisé (`t('Projects.emptyState')`).

### Client Component `ProjectFilters`

- **`'use client'`**.
- **Props** : `{ value: ProjectsFilter, onChange: (next: ProjectsFilter) => void }`. Controlled component (state remonte au parent `ProjectsList`).
- **Rendu** : Tabs custom minimaliste (boutons HTML natifs) avec 3 onglets `{ value, label }` où `label` vient de `t('Projects.filters.all')`, etc. Pas de dépendance Aceternity UI : la sémantique ARIA + les tokens Tailwind du projet suffisent pour ce cas d'usage simple.
- **Ordre des onglets** : `['ALL', 'CLIENT', 'PERSONAL']` (traduits via i18n). 'ALL' actif par défaut (propagation du state parent).
- **Accessibilité** : `role="tablist"` sur le container, `role="tab"` + `aria-selected` sur chaque bouton, géré manuellement.

### Client Component `ProjectCard`

- **`'use client'`** : rendu à l'intérieur de `ProjectsList` (Client Component) via `.map()` → doit être client lui-même. Pas de data fetching interne (props uniquement), donc coût négligeable côté bundle.
- **Props** : `{ project: ProjectWithRelations, locale: string }`.
- **Structure** : `<Link>` englobant un `<BentoCard>` contenant (dans l'ordre) : cover image conditionnelle, rangée de badges méta, titre H3, description, rangée de badges `Tag`.
- **Cover image** : sous-composant `CoverImage` qui rend `<Image>` Next.js avec `src="/api/assets/<coverFilename>"` si `coverFilename` présent, sinon fallback div avec gradient Tailwind utilisant des tokens CSS (`from-primary/20` vers `to-accent/20`).
- **Bloc Entreprise (si CLIENT)** : `clientMeta.company.logoFilename` + `clientMeta.company.name`. Affichage inline sobre **sans badge wrap** : `<Image>` miniature (~18-20px, rond ou carré selon logo, fallback avatar initial si pas de logo) à gauche + nom de l'entreprise en texte `text-sm text-muted-foreground` à droite. Conditionnel sur `clientMeta !== null`. Si `logoFilename` null → juste le nom texte, pas de placeholder moche.
- **`inProgressBadge`** : si `project.endedAt === null`, affichage d'un point vert + label `t('Projects.inProgress')`. Conditionnel.
- **Tri + limite tags** : `project.tags` est un array de `ProjectTag` **déjà trié `displayOrder asc` côté query** (cf. `findManyPublished` du sub-project 02 : `include: { tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } } }`). Le composant applique simplement `.slice(0, 3)` pour prendre les 3 premiers (0 en premier) et calcule `extraCount = max(0, project.tags.length - 3)`. Affichage `+N` si `extraCount > 0`. Chaque item rendu passe par `TagBadge` avec `tag={projectTag.tag}`. Les 3 tags visibles mélangent librement expertises et technos, c'est l'auteur du seed qui pilote via l'ordre de `tagSlugs[]` (pas de filtre par `kind` ici, la card raconte en priorité ce que le projet fait ET avec quoi, sans dogme).
- **Query Prisma correspondante** (appelée par le Server Component `page.tsx` via `findManyPublished()`) :
  ```typescript
  prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    include: {
      tags: {
        include: { tag: true },
        orderBy: { displayOrder: 'asc' },
      },
      clientMeta: { include: { company: true } },
    },
    orderBy: { displayOrder: 'asc' },
  })
  ```
- **Pas de liens démo/GitHub** sur la card (décision architecturale : réservés au case study).

### Client Component `TagBadge`

- **`'use client'`** : rendu à l'intérieur de `ProjectCard` (Client). Héritage hiérarchique, pas de use d'API client spécifique.
- **Props** : `{ tag: Tag }` (type Prisma : `{ slug, name, kind, icon }` ; plus de champ `displayOrder` global, c'est la row `ProjectTag` qui le porte, mais `TagBadge` ne l'utilise pas, il affiche juste le tag).
- **Rendu** : composant shadcn `Badge` + icône résolue dynamiquement selon `tag.icon` :
  - Si `tag.icon = null` → badge texte seul (nom du tag).
  - Si `tag.icon` match `/^simple-icons:(.+)$/` → résoudre le composant React depuis `@icons-pack/react-simple-icons` (mapping slug → composant via un helper wrapper qui split `"<lib>:<slug>"` puis lookup dans la lib ; fallback texte si slug inconnu).
  - Si `tag.icon` match `/^lucide:(.+)$/` → résoudre dynamiquement le composant Lucide via `lucide-react` (lookup par nom kebab-case → PascalCase dans l'export `* as LucideIcons`).
- **Taille** : icône `14-16px` (cohérent avec la taille d'un badge shadcn standard). Cf. [.claude/rules/shadcn-ui/components.md](../../../../.claude/rules/shadcn-ui/components.md).
- **Distinction visuelle subtile expertises vs technos** : pas de variante de Badge différente par `kind` sur la card (tous avec `variant="secondary"`) pour rester visuellement cohérent. Le case study (sub-project 06) applique des groupements par `kind` mais la card garde un rendu uniforme.

### Animations

- **Hover card** : scale 1.02 + shadow-md (classes Tailwind + transition 200ms ease-out). Cf. DESIGN.md.
- **Scroll fade-in** : via `motion/react` sur le container `<BentoGrid>`, variants `initial: { opacity: 0, y: 20 }` → `animate: { opacity: 1, y: 0 }`, trigger `whileInView` avec `viewport: { once: true }`.
- **Tabs** : transition subtile sur le `border-bottom` de l'onglet actif via `transition-colors` Tailwind (pas d'animation complexe).

### i18n

- Ajouter une section `Projects` dans `messages/fr.json` et `messages/en.json` avec clés : `metaTitle`, `metaDescription`, `pageTitle`, `pageSubtitle`, `inProgress`, `emptyState`, et un sous-objet `filters` avec `all` / `client` / `personal`.
- **Type-safety** : les clés sont narrow typed via l'augmentation `AppConfig` de next-intl (déjà en place dans le projet). Conforme à [.claude/rules/next-intl/translations.md](../../../../.claude/rules/next-intl/translations.md).

### Approche de test

- Test Vitest + Testing Library en environnement jsdom (default `vitest.config.ts`).
- Mock `next-intl` via `vi.mock('next-intl')` pour retourner `useTranslations` renvoyant les clés brutes (évite setup provider).
- `ProjectCard` rendu avec `role="article"` sémantique pour cibler dans les assertions.

## Acceptance criteria

### Scénario 1 : Rendu initial de la page en FR

**GIVEN** la BDD `portfolio_dev` contient au moins 2 projets PUBLISHED (1 CLIENT + 1 PERSONAL) avec leurs tags (mélange de expertises + technos)
**WHEN** le visiteur accède à `/fr/projets`
**THEN** la page affiche les projets dans un BentoGrid
**AND** chaque card affiche : cover image (ou gradient fallback), titre + badges Format outline sans icône, description, 3 premiers badges `Tag` du projet (ordre pré-trié par `ProjectTag.displayOrder asc` côté query, tous kinds mélangés selon l'ordre de `tagSlugs[]` du seed) + `+N` si le projet a plus de 3 tags, bloc entreprise inline (logo miniature + nom sans wrapper badge) pour les CLIENT, badge 'En cours' si `endedAt = null`
**AND** l'onglet 'Tous' est actif par défaut
**AND** le `<title>` du document est 'Projets' ou similaire selon `messages/fr.json`

### Scénario 2 : Filtrage Clients

**GIVEN** la page affiche 3 projets (2 CLIENT + 1 PERSONAL)
**WHEN** le visiteur clique sur l'onglet 'Clients'
**THEN** seulement les 2 projets CLIENT sont visibles
**AND** aucun rechargement de page (navigation client-side)

### Scénario 3 : Filtrage Personnels

**GIVEN** la page affiche 3 projets (2 CLIENT + 1 PERSONAL)
**WHEN** le visiteur clique sur l'onglet 'Personnels'
**THEN** seulement le projet PERSONAL est visible

### Scénario 4 : Navigation vers case study

**GIVEN** la page affiche au moins 1 projet dont `slug = 'mon-projet'`
**WHEN** le visiteur clique sur la card
**THEN** le navigateur navigue vers `/fr/projets/mon-projet`
**AND** pendant que le sub-project 06 n'est pas implémenté, 404 Next.js est retourné (attendu, le case study viendra ensuite)

### Scénario 5 : Bascule FR → EN

**GIVEN** la page `/fr/projets` affichée
**WHEN** le visiteur bascule vers EN (via le sélecteur de langue existant, sub-project support-multilingue)
**THEN** la page `/en/projects` ou `/en/projets` (selon pathnames acté ailleurs) affiche les mêmes projets
**AND** les labels d'onglets, le titre, la description sont traduits en anglais
**AND** les `hreflang` alternates sont présents dans le `<head>`

### Scénario 6 : Aucun projet dans une catégorie

**GIVEN** la BDD contient 3 projets tous CLIENT (0 PERSONAL)
**WHEN** le visiteur clique sur 'Personnels'
**THEN** un message d'état vide localisé est affiché (`Projects.emptyState`)
**AND** pas d'erreur

### Scénario 7 : Cover image absente

**GIVEN** un projet avec `coverFilename = null`
**WHEN** la page rend sa card
**THEN** un gradient fallback s'affiche à la place de l'image
**AND** aucune requête HTTP vers `/api/assets/null` n'est émise

## Tests à écrire

### Unit

- `src/components/features/projects/__tests__/ProjectsList.test.tsx` :
  - **Test 1** : `ProjectsList` filtre correctement par type (couvre scénarios 2, 3, 6 via `render` + `fireEvent` + `screen.getAllByRole('article')`).

Ce seul test couvre la logique métier unique du sub-project (le filtrage côté client). Pas de test sur `ProjectCard` (rendu statique selon props = plumbing React), pas de test sur `ProjectFilters` isolé (le test intégré dans `ProjectsList.test.tsx` couvre le callback + le filtrage simultanément). Classé **unit** (pas `.integration.test.tsx`) : le fichier est matché par `just test-unit` via le pattern d'exclusion du Justfile, le test tourne en jsdom sans dépendance BDD/HTTP.

→ `tdd_scope = partial` (1 test ciblé, couverture règle métier filtrage suffisante).

## Edge cases

- **0 projet en BDD** : la page affiche le message `Projects.emptyState` pour l'onglet actif. Pas d'erreur.
- **Projet avec 0 tags** : le tableau de badges est vide. Pas de crash sur `.slice` ou `.map` (tableau vide OK).
- **Projet avec > 10 tags** : 3 visibles + `+N` où N peut être grand (ex: `+12`). Le format reste compact. L'ordre de `tagSlugs[]` dans le seed décide quels 3 apparaissent en priorité (index 0-2).
- **Plusieurs projets partagent un même tag à des positions différentes** : supporté nativement par `ProjectTag` (table explicite portant `displayOrder` par-projet). Ex: `typescript` peut être en position 0 sur un projet centré sur le typage et en position 3 sur un autre où il est secondaire.
- **Tag avec `icon = null`** : le `TagBadge` affiche le nom seul, pas de glyphe. Pas de crash.
- **Tag avec `icon` dans une lib inconnue** (ex: `icon: 'heroicons:react'`) : normalement impossible car la validation Zod au seed (sub-project 03) rejette ce cas. Si ça arrive (import SQL direct), le lookup échoue → fallback texte seul.
- **`clientMeta` null pour un projet CLIENT** : le badge entreprise n'est pas affiché (conditionnel `project.clientMeta?.company?.name`). Cas improbable en pratique (tout projet CLIENT a un `clientMeta` + `Company` associée via le seed) mais géré défensivement côté UI. Pas d'erreur.
- **`endedAt` dans le futur** : badge 'En cours' affiché uniquement si `endedAt === null` (pas pour les dates futures). Comportement voulu : projet avec date de fin planifiée = "terminé prévu" = pas 'En cours'.
- **Locale invalide `/de/projets`** : `hasLocale` renvoie false, `notFound()` déclenché, page 404 localisée fallback.
- **Cover image corrompue ou 404** : la route `/api/assets` renvoie 404, `<Image>` Next.js affiche son fallback natif (alt text). Pas de gradient dans ce cas.
- **Transition de page très longue liste** : volume MVP ~10 projets, le filtrage client est instantané. Pas d'optimisation `useMemo` prématurée.

## Architectural decisions

### Décision : Filtrage côté client plutôt que via query param URL + refetch

**Options envisagées :**
- **A. State local `useState` + filter client** : un seul fetch SSR avec tous les projets, filter côté client. Instantané, pas de navigation.
- **B. Query param URL** (`/projets?type=client`) + refetch SSR : chaque filtre = nouvelle URL + nouveau SSR. Partageable, meilleur SEO sur vues filtrées.
- **C. Hybride** : state local par défaut, URL query param si besoin de partage.

**Choix : A**

**Rationale :**
- Volume faible (~10 projets) : fetch SSR complet + filter client = performance optimale.
- Pas de cas d'usage "partager un lien filtré" identifié en MVP.
- Simplicité UX : pas de reload, feedback instantané.
- Peut évoluer vers B si le besoin de deep-linking apparaît (ajout trivial : `useSearchParams`, pas de breaking change).

### Décision : Card entière cliquable (Link englobant) plutôt que bouton 'Voir le projet'

**Options envisagées :**
- **A. `<Link>` englobant toute la card** : UX moderne portfolios, target large.
- **B. Bouton explicite 'Voir le projet'** en bas de card : card non cliquable, bouton seul actif.
- **C. Card non cliquable, pas de case study** : seuls les liens démo/GitHub actifs.

**Choix : A**

**Rationale :**
- UX standard sur les portfolios modernes (Awwwards, Dribbble portfolios).
- Target cliquable large = meilleure accessibilité tactile (mobile).
- Accessibilité assurée via `aria-label` sur le Link englobant (ex: `Voir le projet <title>`).
- Pas de liens internes secondaires sur la card (démo/GitHub sont réservés au case study, décision UX validée) → pas de risque de propagation de clics multiples.

### Décision : 3 badges `Tag` max visibles + `+N` (ordre contrôlé par `ProjectTag.displayOrder` par-projet)

**Options envisagées :**
- **A. 3 max + `+N`** : compact, lisible mobile, info supplémentaire accessible au case study.
- **B. 4 ou 5 max** : un peu plus généreux. Risque encombrement mobile.
- **C. Pas de limite** : tous les badges visibles. Cards déséquilibrées entre projets à 2 tags et projets à 15 tags.

**Choix : A**

**Rationale :**
- Les vrais projets cumulent souvent 10-20 tags (technos + infra + expertises). Tout afficher sur la card = saturer l'espace visuel.
- 3 tags principaux = signal fort ("Scraping anti-bot / Next.js / Docker") sans noyer. L'ordre de `tagSlugs[]` dans le seed (sub-project 03) permet à l'auteur de choisir lesquels par-projet (typiquement : 1-2 expertises phares + 1-2 technos dominantes au début du tableau).
- `+N` indicateur visuel clair que la richesse est présente, clic case study pour voir tout.
- Responsive safe sur mobile (~320px viewport).

### Décision : Cover image via convention `coverFilename` servi par `/api/assets/`

**Options envisagées :**
- **A. Champ `coverFilename String?` sur Project** (décidé par amendement 01) : source de vérité BDD, chaque projet peut avoir un fichier de nom différent.
- **B. Convention implicite `<slug>.png` dans le volume** : pas de champ BDD, tentative de fetch `<slug>.png`, fallback si 404.
- **C. Pas de cover en MVP** : gradient par défaut pour toutes les cards.

**Choix : A**

**Rationale :**
- Flexibilité : un projet peut avoir un cover au nom arbitraire (ex: `airbus-cover-v2.webp`).
- Source de vérité explicite en BDD, visible dans Prisma Studio et le seed.
- Fallback gradient activé si `coverFilename = null` (projet sans image).
- Impact mineur sur le schéma (ajout d'un champ optionnel au sub-project 01, amendement propre).

### Décision : `ProjectFilters` controlled component plutôt que stateful interne

**Options envisagées :**
- **A. Controlled** : props `{ value, onChange }`, le state vit dans `ProjectsList` (le parent).
- **B. Uncontrolled** : `ProjectFilters` gère son propre state, `ProjectsList` reçoit un `onFilterChange` callback.

**Choix : A**

**Rationale :**
- Single source of truth : le state du filtre vit au plus haut niveau qui en a besoin (`ProjectsList`).
- Plus simple à tester (on injecte le state dans le test).
- Pattern standard React (controlled components).

