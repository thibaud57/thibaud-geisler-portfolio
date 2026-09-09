---
feature: "Feature 1 — Espace admin"
subproject: "crud-tags"
goal: "Gérer les tags depuis l'espace admin et établir le pattern CRUD des entités légères"
status: "draft"
complexity: "M"
tdd_scope: "full"
depends_on: ["06-shell-admin-design.md"]
date: "2026-09-03"
---

# CRUD des tags

## Scope

Créer, modifier et supprimer des tags depuis l'espace admin : Server Actions validées par Zod, écran de liste, formulaire en modale et confirmation de suppression. S'y ajoute le composant de table de liste partagé, écrit ici et réutilisé par les sub-projects `08` et `12`.

Ce sub-project établit le pattern que reprendront les entités légères suivantes, Entreprises au `08` et le reste de l'admin ensuite. Exclut la réorganisation par glisser-déposer : `displayOrder` s'édite au clavier comme un champ ordinaire.

### État livré

À la fin de ce sub-project, on peut : créer un tag depuis l'écran d'administration et le voir apparaître sur les pages publiques après invalidation du cache, le modifier, et constater qu'un tag rattaché à un projet ne peut pas être supprimé.

## Dependencies

- `06-shell-admin-design.md` (statut: draft) : fournit le shell dans lequel l'écran s'insère, et la page d'attente `/admin/tags` que ce sub-project remplace.

## Files touched

- **À créer** : `src/lib/schemas/tag.ts` (schémas Zod partagés)
- **À créer** : `src/server/actions/tags.ts` (Server Actions de mutation)
- **À créer** : `src/server/actions/tags.test.ts`
- **À créer** : `src/server/actions/tags.types.ts` (types d'état de formulaire)
- **À modifier** : `src/server/queries/tags.ts` (requête de liste pour l'administration)
- **À modifier** : `src/lib/icons.tsx` (export des clés d'icônes disponibles)
- **À modifier** : `src/app/admin/(protected)/tags/page.tsx` (remplacement de la page d'attente)
- **À créer** : `src/components/features/admin/DataTable.tsx` (table de liste partagée : recherche, tri par colonne, pied paginé)
- **À créer** : `src/components/features/admin/tags/TagsTable.tsx`
- **À créer** : `src/components/features/admin/tags/TagFormDialog.tsx`
- **À créer** : `src/components/features/admin/tags/DeleteTagDialog.tsx`
- **À créer** : `src/components/ui/` : `alert-dialog`, `dialog`, `select`, `pagination`, `checkbox`, installés par le CLI shadcn **s'ils sont absents**
- **À modifier** : `docs/DESIGN.md` (§ Mapping Composants) : la ligne « Modales » rejoint la section Overlays avec `Dialog` et `AlertDialog`, `Select` et `Checkbox` sortent de la ligne « Formulaires admin » pour rejoindre la section Formulaires, `Pagination` sort de « Navigation dans les listes », et la ligne « Barre d'outils de liste » est marquée comme cible ultérieure

## Architecture approach

**Le pattern des Server Actions suit celui de `submitContact`.** Signature `(prevState, formData)` compatible `useActionState`, retour d'un état typé portant `ok`, `errors` issus de `flatten().fieldErrors`, `message` pour les erreurs non liées à un champ, et `values` pour repeupler le formulaire. Les directives `'use server'` et `'server-only'` en tête, et un logger obtenu par `createActionLogger`.

**Les messages de validation sont en français, directement dans le schéma.** Le formulaire de contact renvoie des codes (`name_required`) parce que le site public est bilingue et que next-intl les traduit. L'espace admin étant monolingue par l'ADR-021, un code devrait être résolu par un mapping créé pour l'occasion, sans jamais traduire quoi que ce soit.

**Formulaires en `useActionState`**, sans librairie de formulaire, comme sur le site public. Les champs shadcn (`Input`, `Label`, `Select`) sont montés directement et les erreurs rendues sous chacun depuis l'état retourné.

**Les tags portent du contenu bilingue alors que l'interface ne l'est pas.** `nameFr` et `nameEn` sont deux champs du formulaire, parce qu'ils s'affichent sur un site public bilingue. L'admin est en français, ce qu'il édite ne l'est pas nécessairement.

**Le champ `icon` devient un select, pas une saisie libre.** Son format est `<lib>:<slug>` avec `lib` valant `simple-icons` ou `lucide`, et `resolveTagIcon` retourne `null` **sans erreur** quand le slug est inconnu. Une faute de frappe produirait donc un tag sans icône, sans que rien ne le signale. Les clés étant connues à la compilation, le formulaire les propose et le schéma les valide.

**La suppression doit composer avec `onDelete: Restrict`.** La relation `ProjectTag` interdit de supprimer un tag rattaché à un projet : PostgreSQL lève une violation de contrainte que Prisma remonte en erreur connue. L'action l'intercepte et renvoie un message explicite plutôt que de laisser remonter une erreur technique.

**Chaque Server Action vérifie la session elle-même.** `await getCurrentUser()` ouvre chaque mutation, hors de tout `try/catch`. Le layout protège l'affichage des pages, il ne protège pas l'exécution des actions : une Server Action exportée est un endpoint HTTP que quiconque connaît l'identifiant peut appeler sans jamais charger l'écran. C'est la défense en profondeur qu'impose `.claude/rules/nextjs/server-actions.md`, qui écrit aussi bien « vérifier l'authentification dans chaque Server Action, même si le proxy protège déjà la route » que « ne pas dépendre uniquement du proxy : un matcher modifié peut supprimer la couverture ». L'appel précède le `try`, sinon le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique.

**Invalidation par `updateTag('tags')` et `updateTag('projects')`** après chaque mutation réussie. La première étiquette est celle des requêtes publiques de `src/server/queries/tags.ts`. La seconde est indispensable et facile à manquer : `PROJECT_INCLUDE` (`src/types/project.ts`) embarque les tags dans chaque projet caché sous l'étiquette `projects`, donc renommer un tag ou changer son icône laisse les cartes projet et les case studies afficher l'ancienne valeur jusqu'à expiration du `cacheLife('hours')`. Le scénario 7 passerait sur `/a-propos`, qui lit `findAllTags`, et échouerait sur `/projets`.

**La lecture des données de la page vit sous `<Suspense>`.** Avec `cacheComponents: true`, une requête Prisma sans `'use cache'` est un accès dynamique : appelée directement dans le composant de page, elle fait échouer le build sur « Uncached data was accessed outside of `<Suspense>` ». La page monte donc un sous-composant async sous `<Suspense>`, avec un `StackedSkeleton` en fallback. Point de vigilance propre au premier écran admin lisant Prisma sans cache : l'issue prisma#28588 (« used new Date() before accessing uncached data ») peut se manifester ici, sa mitigation est un `await connection()` en tête du sous-composant.

`updateTag` plutôt que `revalidateTag` : le premier fait attendre la requête suivante le temps de recharger, le second sert d'abord du contenu périmé. Comme on vérifie l'effet en consultant la page publique juste après la mutation, seule la première sémantique rend le critère observable. `updateTag` n'est utilisable que depuis une Server Action, ce qui est précisément le contexte ici.

**La table de liste est un composant partagé, écrit une fois ici.** `docs/DESIGN.md` § Mapping Composants décrit le motif cible d'une table admin, et le design system rappelle que ce n'est pas un composant du registry mais un pattern en état local React, sans librairie de table à cette volumétrie. Ce sub-project en écrit la moitié utile tout de suite : champ de recherche, en-tête de colonne triable (cycle croissant, décroissant, ordre d'affichage, avec `aria-sort` sur le bouton `ghost` du `th`), et pied sur la rangée `xs` portant le compteur à gauche et le pager à droite. Les sub-projects `08` et `12` le réutilisent tel quel, ce qui fait que les trois écrans de liste se ressemblent dès le premier jour.

Les deux `Popover` de la barre d'outils, choix des colonnes affichées et filtres à compteurs facettés, **restent hors de cet epic**. Ils n'ont de sens qu'avec du volume et des colonnes qu'on veut masquer : à cinq entreprises et trente tags, ils ajouteraient des contrôles sans emploi. DESIGN.md les garde comme cible et le note. Aucun contrôle désactivé ni décoratif n'est posé en attendant : une recherche grisée n'annonce rien d'utile dans son propre back-office et laisse du code à reprendre.

**La liste d'administration ne réutilise pas la requête publique.** `findAllTags` applique `'use cache'` : l'administration doit lire la base sans cache, pour voir ses propres mutations. Une requête distincte est ajoutée plutôt que de paramétrer l'existante, dont le comportement de cache ne se désactive pas au cas par cas.

Rules applicables : `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`, `.claude/rules/nextjs/tests.md`.

## Acceptance criteria

### Scénario 1 : Création
**GIVEN** le formulaire de création ouvert
**WHEN** on saisit un slug, un nom français, un nom anglais et une catégorie valides
**THEN** le tag est créé en base
**AND** il apparaît dans la liste sans rechargement manuel

### Scénario 2 : Slug déjà pris
**GIVEN** un tag existant portant le slug `react`
**WHEN** on tente d'en créer un second avec le même slug
**THEN** aucune ligne n'est créée
**AND** le formulaire signale que ce slug est déjà utilisé, sous le champ concerné

### Scénario 3 : Validation des champs
**GIVEN** le formulaire de création
**WHEN** on soumet un slug vide et un nom français vide
**THEN** aucune requête base n'est émise
**AND** les deux champs portent un message d'erreur en français
**AND** les valeurs saisies sont conservées dans le formulaire

### Scénario 4 : Modification
**GIVEN** un tag existant
**WHEN** on modifie son nom français et on enregistre
**THEN** la base reflète la modification
**AND** les autres champs sont inchangés

### Scénario 5 : Suppression d'un tag libre
**GIVEN** un tag rattaché à aucun projet
**WHEN** on confirme sa suppression
**THEN** il disparaît de la base et de la liste

### Scénario 6 : Suppression d'un tag rattaché
**GIVEN** un tag rattaché à au moins un projet
**WHEN** on tente de le supprimer
**THEN** la suppression échoue
**AND** un message explique que le tag est utilisé par des projets
**AND** ni le tag ni ses rattachements ne sont altérés

### Scénario 7 : Répercussion sur le site public
**GIVEN** un tag existant, renommé depuis l'administration
**WHEN** on consulte `/a-propos`, qui lit `findAllTags`
**THEN** le nouveau nom y figure
**AND** sur `/projets`, les cards des projets portant ce tag affichent aussi le nouveau nom, `projects` ayant été invalidée en même temps que `tags`

### Scénario 10 : Table de liste utilisable
**GIVEN** l'écran des tags et plus d'une page de lignes
**WHEN** on saisit un terme dans la recherche, puis on clique deux fois sur un en-tête de colonne
**THEN** la liste se filtre, puis se trie en croissant, puis en décroissant
**AND** `aria-sort` reflète l'état courant
**AND** le pied affiche le compteur et permet de changer de page

### Scénario 11 : Build de production réussi
**GIVEN** `cacheComponents: true` et la lecture Prisma de la page
**WHEN** on exécute `pnpm build`
**THEN** le build aboutit
**AND** aucune erreur « Uncached data was accessed outside of `<Suspense>` » n'est levée

### Scénario 8 : Icône restreinte au registre
**GIVEN** le formulaire de création
**WHEN** on ouvre le sélecteur d'icône
**THEN** il ne propose que des clés résolvables par `resolveTagIcon`
**AND** une valeur absente du registre est refusée par la validation

### Scénario 9 : Action inatteignable sans session
**GIVEN** aucune session valide
**WHEN** la Server Action est appelée directement, sans passer par l'écran
**THEN** l'accès est refusé avant toute validation et toute écriture
**AND** aucune ligne n'est créée, modifiée ni supprimée

## Tests à écrire

### Unit

- `src/server/actions/tags.test.ts`, avec Prisma mocké :
  - un slug vide est refusé avant toute requête base
  - un nom français vide est refusé
  - un nom anglais vide est refusé
  - une catégorie absente de `TagKind` est refusée
  - une icône absente du registre est refusée
  - une icône vide est acceptée, le champ étant optionnel
  - un slug comportant des majuscules ou des espaces est refusé ou normalisé, selon la règle retenue
  - la création réussie invalide les étiquettes de cache `tags` **et** `projects`
  - une violation de contrainte d'unicité sur le slug est traduite en erreur de champ, non en erreur technique
  - une violation de contrainte de clé étrangère à la suppression est traduite en message explicite
  - les valeurs saisies sont retournées dans l'état en cas d'échec de validation
  - un appel sans session est refusé avant toute requête base, la garde précédant la validation

Aucun test n'est écrit sur le rendu des composants : monter une modale shadcn pour vérifier qu'elle s'ouvre relève du test de librairie. Les scénarios d'interface se vérifient manuellement.

## Edge cases

- **Slug non normalisé** : `React` et `react` produiraient deux tags distincts alors que le slug est un identifiant technique. La règle de normalisation doit être décidée et testée, pas laissée à la saisie
- **Icône silencieusement invalide** : c'est le piège principal de cette entité. `resolveTagIcon` retourne `null` sans rien signaler, donc un tag mal saisi s'afficherait simplement sans icône, et le défaut ne serait découvert qu'à l'œil sur le site public
- **`displayOrder` en doublon** : rien n'empêche deux tags de porter la même valeur. L'ordre est alors départagé par le tri secondaire déjà présent dans `findAllTags` (`slug` croissant), donc le comportement reste déterministe
- **Cache non invalidé** : une mutation qui oublie `updateTag('tags')` réussit en base sans que le site public ne change. Le symptôme ressemble à un échec d'enregistrement alors que la donnée est bien écrite
- **Invalidation partielle** : n'invalider que `tags` est plus vicieux qu'oublier les deux. `/a-propos` se met à jour, `/projets` non, parce que les tags y sont embarqués dans le cache `projects` via `PROJECT_INCLUDE`. On conclut à un cache mal purgé sur une page alors que la cause est une étiquette manquante
- **Requête Prisma hors `<Suspense>`** : le build échoue, il ne dégrade pas. Le message nomme le fichier, pas toujours l'appel fautif
- **Requête publique cachée** : `findAllTags` porte `'use cache'`. Réutilisée dans l'administration, elle servirait un instantané antérieur à la dernière mutation, qui passerait pour perdue
- **Suppression concurrente** : un tag rattaché à un projet entre l'affichage de la liste et la confirmation de suppression provoque une erreur de contrainte. C'est le comportement attendu, et le message doit rester compréhensible
