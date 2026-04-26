---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "page-accueil"
goal: "Livrer la page publique / (racine locale) avec Hero interactif Aceternity, teasers Services et Projets et section CTA finale, axée conversion business."
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: ["01-page-services-design.md"]
date: "2026-04-24"
---

# Page `/` — Hero interactif, teasers Services et Projets, CTA final

## Scope

Remplacer le placeholder actuel de `src/app/[locale]/(public)/page.tsx` par une home en 4 sections verticales : Hero (fond Aceternity `Background Ripple Effect` + H1 positionnement + tagline + 2 CTAs primaire/secondaire), teaser Services (3 `ServiceCard` du sub 01 réutilisés à l'identique + CTA fin de section vers `/services`), teaser Projets (3 `ProjectCard` de Feature 2 alimentés par `findManyPublished` + `slice(0, 3)` + CTA fin de section vers `/projets`), section CTA finale (H2 + phrase + Button vers `/contact`). Extension documentaire de `docs/DESIGN.md` pour formaliser l'ajout de `Background Ripple Effect` à la liste Hero effects.

**Exclu** : création de nouveaux composants service ou projet (réutilisation stricte) ; `MacbookScroll` (réservé au showcase projet dev phare dans Feature 2) ; blog teaser (post-MVP) ; rédactionnel commercial final (les clés i18n sont mises en place avec un contenu validé au brainstorming, à affiner ultérieurement sans refacto code) ; modification des queries Feature 2 ou du schéma Prisma.

### État livré

À la fin de ce sub-project, on peut : naviguer sur `/` et `/en` et voir le Hero avec le fond Ripple Effect interactif (clic sur les cellules = ondulation), le H1 "Thibaud Geisler - IA & Développement Full-Stack", la tagline, les 2 CTAs Hero (ShimmerButton "Parlons de votre projet" + Button outline "Voir les services"), la grille des 3 services (issue du sub 01), la grille des 3 projets récents (issue de Feature 2), et la section CTA finale, le tout avec metadata SEO localisée et responsive mobile-first.

## Dependencies

- `01-page-services-design.md` (statut: draft) — le teaser Services réutilise le composant `ServiceCard` et la constante `SERVICE_SLUGS` créés dans ce sub-project, ainsi que les clés i18n `ServicesPage.offers.<slug>.*`.

Éléments déjà livrés hors feature (pas besoin d'y toucher) : composant `ProjectCard` de Feature 2 (`src/components/features/projects/ProjectCard.tsx`), query `findManyPublished({ locale })` (`src/server/queries/projects.ts`), helpers `setupLocalePage`, `setupLocaleMetadata`, `buildLanguageAlternates`, `localeToOgLocale`.

## Files touched

- **À créer** : `src/components/features/home/Hero.tsx`
- **À créer** : `src/components/features/home/ServicesTeaserSection.tsx`
- **À créer** : `src/components/features/home/ProjectsTeaserSection.tsx`
- **À créer** : `src/components/features/home/ProjectsTeaserSkeleton.tsx`
- **À créer** : `src/components/features/home/FinalCtaSection.tsx`
- **À créer** via CLI : `src/components/aceternity/background-ripple-effect.tsx` (`pnpm dlx shadcn@latest add @aceternity/background-ripple-effect -p src/components/aceternity`)
- **À créer** via CLI (si absent) : `src/components/magicui/shimmer-button.tsx` (`pnpm dlx shadcn@latest add @magicui/shimmer-button`)
- **À modifier** : `src/app/[locale]/(public)/page.tsx` (remplacement du placeholder par la composition des 4 sections)
- **À modifier** : `messages/fr.json` (étoffer `HomePage` : `hero.{h1, tagline, ctaPrimary, ctaSecondary}`, `servicesTeaser.{title, subtitle, seeAll}`, `projectsTeaser.{title, subtitle, seeAll}`, `finalCta.{title, subtitle, ctaLabel}`)
- **À modifier** : `messages/en.json` (parité stricte du namespace `HomePage`)
- **À modifier** : `docs/DESIGN.md` (addendum § "Mapping Composants" et § "Stack UI" pour ajouter `Background Ripple Effect` à la liste Hero effects Aceternity)

## Architecture approach

- **Server page + îlot Client pour Aceternity** : `page.tsx` reste Server Component async (`setupLocalePage` + `getTranslations('HomePage')`), compose les 4 sections. Le Hero est un Client Component (`'use client'` obligatoire selon `.claude/rules/aceternity-ui/components.md`) car Aceternity `Background Ripple Effect` utilise `useState`/`useEffect`/`onClick`. Le Hero reçoit ses textes (H1, tagline, labels CTAs) en props depuis la page pour rester sérialisable.
- **PPR + streaming** : le teaser Projets est le seul async (query Prisma), il est enveloppé dans `<Suspense fallback={<ProjectsTeaserSkeleton/>}>`. Hero, Services teaser et FinalCta rendent en statique immédiat. Aucun `'use cache'` nouveau : le Hero et les teasers ServiceCard/FinalCta n'appellent aucune dynamic function, et `findManyPublished` est déjà en `'use cache' + cacheTag('projects')` dans Feature 2. Voir `.claude/rules/nextjs/rendering-caching.md` et `.claude/rules/nextjs/data-fetching.md`.
- **`Hero.tsx`** : wrappe `BackgroundRippleEffect` (Aceternity) autour du contenu (H1 `font-display text-5xl/6xl`, tagline `text-lg text-muted-foreground`, 2 CTAs côte à côte). CTA primaire = `ShimmerButton` Magic UI (obligation DESIGN.md "Bouton CTA hero = ShimmerButton, max 1 par page") pointant vers `/contact`. CTA secondaire = `Button variant="outline"` shadcn pointant vers `/services`. Les 2 liens utilisent `Link` de `@/i18n/navigation` pour préserver le prefix locale. Budget effets page respecté : 1 Aceternity (Ripple) + 1 Magic UI (ShimmerButton) = 2/3 selon `.claude/rules/aceternity-ui/components.md` et `.claude/rules/magic-ui/components.md`.
- **`ServicesTeaserSection.tsx`** Server : itère sur `SERVICE_SLUGS` importé depuis `src/components/features/services/service-slugs.ts` (sub 01), rend 3 `<ServiceCard>` avec les clés i18n `ServicesPage.offers.<slug>.*` (réutilisation pure, aucune duplication de contenu). Termine par un Button `variant="ghost"` "Voir tous les services" (label `HomePage.servicesTeaser.seeAll`) pointant vers `/services`.
- **`ProjectsTeaserSection.tsx`** Server async : appelle `findManyPublished({ locale })` (query Feature 2 existante, `'use cache'` + `cacheTag('projects')` → participe au même cache que `/projets` et `/a-propos`), applique `.slice(0, 3)` côté code (le tri `displayOrder asc` est déjà fait Prisma-side). Rend 3 `<ProjectCard project={p} />`. Termine par un Button `variant="ghost"` "Voir tous les projets" (label `HomePage.projectsTeaser.seeAll`) pointant vers `/projets`. Enveloppé dans `<Suspense>` côté page.
- **`ProjectsTeaserSkeleton.tsx`** : skeleton léger identique au layout (grid 3 cards placeholder `bg-muted`) pour éviter le CLS pendant le streaming.
- **`FinalCtaSection.tsx`** Server : H2 (`HomePage.finalCta.title`), phrase (`HomePage.finalCta.subtitle`), `Button variant="default"` "Parlons de votre projet" (label `HomePage.finalCta.ctaLabel`) pointant vers `/contact`. Pas de ShimmerButton ici pour respecter la règle "max 1 par page" déjà prise par le Hero.
- **i18n `HomePage`** : structure nested conforme à `.claude/rules/next-intl/translations.md` (labels d'interface → `messages/*.json`). `Metadata.homeTitle` / `homeDescription` déjà remplis, pas à recréer. Pour le séparateur dans le H1 ("Thibaud Geisler - IA & Développement Full-Stack"), utilisation du hyphen-minus ASCII simple `-` (le em dash `—` est exclu par préférence utilisateur actée dans le brainstorming).
- **Metadata SEO** : `generateMetadata` suit exactement le pattern des subs 01 et 02 (`setupLocaleMetadata`, `localeToOgLocale`, `buildLanguageAlternates('')` — chemin vide car home = racine locale). Voir `.claude/rules/nextjs/metadata-seo.md`.
- **Styling** : tokens sémantiques uniquement (`bg-card`, `text-muted-foreground`, `text-primary`), container standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`, section padding `py-16 sm:py-20 lg:py-24`. Hero probablement plus haut (full viewport ou `min-h-[70vh]` pour laisser respirer le Ripple Effect). Typo Sansation via `font-display` sur H1, `font-semibold` sur les H2 de section. Voir `.claude/rules/tailwind/conventions.md`.
- **Extension DESIGN.md** : addendum à insérer dans `docs/DESIGN.md` § "Mapping Composants" (ligne Hero effects) et § "Stack UI" → ajouter `Background Ripple Effect` à côté de `Background Beams` dans la liste Aceternity, avec mention "Fond interactif hero (grille de cellules qui ripplent au clic), recommandé hero + CTA sections par Aceternity". Modification mineure (~3-5 lignes), co-commit avec l'implémentation.

## Acceptance criteria

### Scénario 1 : rendu FR complet
**GIVEN** un visiteur navigue vers `/`
**WHEN** la page est rendue
**THEN** le Hero affiche le fond `Background Ripple Effect` interactif, un `<h1>` en typographie Sansation avec le texte exact `Thibaud Geisler - IA & Développement Full-Stack`, une tagline en `text-lg text-muted-foreground` et 2 boutons côte à côte
**AND** le 1er bouton est un `ShimmerButton` libellé `Parlons de votre projet`, pointant vers `/contact`
**AND** le 2e bouton est un `Button variant="outline"` libellé `Voir les services`, pointant vers `/services`
**AND** en dessous, la section Services affiche un H2 `Mes services`, les 3 `ServiceCard` issues du sub 01 dans l'ordre `ia → fullstack → formation`, puis un Button ghost `Voir tous les services` pointant vers `/services`
**AND** la section Projets affiche un H2 `Projets récents`, 3 `ProjectCard` triées par `displayOrder asc`, puis un Button ghost `Voir tous les projets` pointant vers `/projets`
**AND** la section CTA finale affiche un H2 `Un projet en tête ?`, une phrase courte, et un `Button variant="default"` libellé `Parlons de votre projet` pointant vers `/contact`

### Scénario 2 : rendu EN
**GIVEN** un visiteur navigue vers `/en`
**WHEN** la page est rendue
**THEN** tous les textes (H1, tagline, labels CTAs, titres de sections, sous-titres, labels "Voir tous...") sont affichés en anglais
**AND** les `ServiceCard` utilisent les textes EN de `ServicesPage.offers.<slug>.*`
**AND** les `ProjectCard` affichent les champs EN (`titleEn`, `descriptionEn`) via `localizeProject`

### Scénario 3 : CTAs Hero
**GIVEN** un visiteur est sur le Hero
**WHEN** il clique sur le bouton primaire (ShimmerButton)
**THEN** il navigue vers `/contact` (ou `/en/contact` selon la locale courante)
**AND** quand il clique sur le bouton secondaire (outline), il navigue vers `/services`

### Scénario 4 : CTAs fin de section teaser
**GIVEN** un visiteur a parcouru la section Services teaser
**WHEN** il clique sur le Button ghost "Voir tous les services"
**THEN** il navigue vers `/services`
**AND** idem pour "Voir tous les projets" qui pointe vers `/projets`

### Scénario 5 : teaser projets limite à 3 et tri
**GIVEN** la base contient N projets avec `status = 'PUBLISHED'`
**WHEN** `findManyPublished({ locale })` est appelée puis `.slice(0, 3)` appliqué
**THEN** la section Projets affiche au maximum 3 cards
**AND** l'ordre respecte `displayOrder asc` de Prisma
**AND** si N < 3, la grille affiche exactement N cards sans remplissage placeholder

### Scénario 6 : metadata SEO localisée
**GIVEN** un crawler lit le `<head>` de `/`
**WHEN** la réponse HTML arrive
**THEN** `<title>` = `Metadata.homeTitle` appliqué au template `%s | {siteTitle}` du root layout
**AND** la meta `description` vaut `Metadata.homeDescription`
**AND** la meta `og:locale` correspond à `localeToOgLocale[locale]`
**AND** `alternates.languages` couvre `fr`, `en` et `x-default` via `buildLanguageAlternates('')` (path vide pour la racine locale)

### Scénario 7 : responsive mobile
**GIVEN** un viewport `< 768px`
**WHEN** la page est rendue
**THEN** le Hero empile H1, tagline et les 2 CTAs verticalement
**AND** les 3 sections Services, Projets, Final CTA s'affichent en single col (1 card par ligne)

### Scénario 8 : responsive desktop
**GIVEN** un viewport ≥ 1024px (`lg:`)
**WHEN** la page est rendue
**THEN** le Hero garde ses 2 CTAs côte à côte horizontalement
**AND** les sections Services et Projets passent en grid 3 colonnes (`lg:grid-cols-3`)

### Scénario 9 : streaming projets teaser
**GIVEN** un visiteur charge `/`
**WHEN** le shell HTML est renvoyé
**THEN** Hero, Services teaser et Final CTA sont rendus immédiatement (PPR shell statique)
**AND** la section Projets teaser affiche le `ProjectsTeaserSkeleton` jusqu'à résolution de la query Prisma
**AND** au rechargement, la query `findManyPublished` HIT le Data Cache (tag `projects`)

### Scénario 10 : budget effets
**GIVEN** la page `/` complète est chargée
**WHEN** on audit les composants animés lib-driven
**THEN** on ne trouve qu'une seule instance de `Background Ripple Effect` (Hero, Aceternity) et une seule instance de `ShimmerButton` (Hero, Magic UI)
**AND** le total d'effets lib `≤ 3` (`1 Aceternity + 1 Magic UI + 0 supplémentaire = 2`), conforme à la règle DESIGN.md "2-3 effets max par page"

## Edge cases

- **Moins de 3 projets publiés en DB** : `.slice(0, 3)` retourne 0, 1 ou 2 cards. Le composant `ProjectsTeaserSection` rend simplement la grille avec les cards disponibles sans placeholder de remplissage. Le Button "Voir tous les projets" reste visible (il pointera sur `/projets` qui gère son propre empty state, responsabilité Feature 2).
- **ShimmerButton non installé** au moment de l'implémentation : le plan inclut une étape CLI pour l'installer si absent (`pnpm dlx shadcn@latest add @magicui/shimmer-button`). Pas de fallback code, la dépendance est prérequis.
- **Background Ripple Effect version CLI incompatible** (ex: shadcn CLI < 3.0 ne supporterait pas `@aceternity/...`) : le plan impose shadcn CLI ≥ 3.0. Si l'install échoue, fallback = copier-coller depuis la page Aceternity, mais l'API du composant resterait équivalente.
- **Interactivité Ripple Effect désactivée** (prop `interactive={false}`) : non prévu en MVP, le comportement par défaut reste cliquable. Si des visiteurs accessibilité-first signalent une gêne, on pourra exposer une prop ou désactiver ciblement — hors scope.

## Architectural decisions

### Décision : fond Hero — Background Ripple Effect vs Background Beams

**Options envisagées :**
- **A. Background Ripple Effect** (Aceternity, interactif cliquable) : grille 8×27 de cellules avec ripple au clic. Recommandé par Aceternity pour "hero + CTA sections". Plus engageant, marque le côté "expertise tech" dès l'accueil. Non listé dans DESIGN.md actuel → nécessite un addendum documentaire (`~3-5 lignes dans § Mapping Composants et § Stack UI`).
- **B. Background Beams** (Aceternity, passif) : rayons lumineux verticaux animés. Déjà listé dans DESIGN.md, aucun update doc nécessaire. Plus discret, laisse le contenu dominer.

**Choix : A**

**Rationale :**
- Portfolio orienté IA / expertise tech : un fond interactif marque dès la home le côté "tech qui vit", cohérent avec le positionnement services (IA, automatisation).
- L'interactivité (clic = ripple) crée un micro-engagement sur le LCP, sans gêner le scan du H1/CTAs.
- Coût d'extension DESIGN.md faible (~3-5 lignes co-committables avec l'implémentation), aligné sur la règle projet "chaque complexité ajoutée uniquement si le besoin réel apparaît" : ici le besoin est identifié (user-driven) et la doc est mise à jour en conséquence.
- Budget effets page respecté (1 Aceternity + 1 Magic UI ShimmerButton = 2/3 autorisés).

### Décision : teaser Projets — réutiliser `findManyPublished + slice(0, 3)` vs créer `findLatestPublished({ limit })`

**Options envisagées :**
- **A. Réutilisation** : `findManyPublished({ locale })` puis `.slice(0, 3)` côté page. Zero nouvelle query, zero modification de `src/server/queries/projects.ts`.
- **B. Nouvelle query dédiée** : ajouter `findLatestPublished({ locale, limit: number }): Promise<LocalizedProjectWithRelations[]>` avec `take: limit` côté Prisma. Transfert le filtrage au DB.

**Choix : A**

**Rationale :**
- Le volume de projets publiés est faible (≤ 20 en pratique), le `take: 3` Prisma-side n'apporte aucun gain réel face à `.slice(0, 3)` JS-side.
- Les deux chemins partagent le même `'use cache'` + `cacheTag('projects')`, donc les performances cache sont identiques.
- Pas de modification de Feature 2 requise → zero risque de régression sur `/projets` (qui consomme la même query).
- Tri par `displayOrder asc` = contrôle éditorial explicite via dashboard post-MVP (tu choisis quels projets "featured first"), sémantique plus riche qu'un tri chronologique.
- YAGNI : si plus tard le volume explose ou qu'un besoin de limit DB-side apparaît, on ajoutera la query dédiée sans refacto bloquant.

### Décision : symétrie "Voir tous..." en fin de chaque teaser section vs CTAs groupés uniquement dans le Hero

**Options envisagées :**
- **A. CTA "Voir tous" à la fin de chaque teaser (Services + Projets)**, Button `variant="ghost"` discret. Pattern symétrique et attendu.
- **B. Pas de CTA fin de section**, on s'appuie uniquement sur les 2 CTAs Hero et le footer.

**Choix : A**

**Rationale :**
- Symétrie UX : un visiteur qui lit la section Services jusqu'au bout s'attend à un lien "Voir toutes les offres", idem pour les projets. Ne pas le fournir force le visiteur à remonter ou à chercher dans la navbar.
- Coût visuel faible : Button ghost = pas de poids visuel comparable aux CTAs de conversion.
- Conversion multi-niveau : le Hero cible les visiteurs décidés (CTA primaire contact), les CTAs fin de section cibent ceux qui veulent creuser une offre spécifique avant de contacter.
- Aligne sur le pattern BRAINSTORM.md "Teaser services (3 offres résumées) / 2-3 projets récents mis en avant / CTA : prendre un appel / voir les projets".
