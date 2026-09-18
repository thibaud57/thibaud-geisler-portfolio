---
feature: "Feature 1 — Espace admin"
subproject: "crud-tags"
goal: "Gérer les tags depuis l'espace admin et établir le pattern CRUD des entités légères"
status: "implemented"
complexity: "M"
tdd_scope: "full"
depends_on: ["06-shell-admin-design.md"]
date: "2026-09-03"
---

# CRUD des tags

## Scope

Créer, modifier et supprimer des tags depuis l'espace admin : Server Actions validées par Zod, écran de liste, formulaire en modale et confirmation de suppression. S'y ajoute le composant de table de liste partagé, écrit ici et réutilisé par les sub-projects `08` et `12`.

Ce sub-project établit le pattern que reprendront les entités légères suivantes, Entreprises au `08` et le reste de l'admin ensuite. Les tags se réordonnent par glisser-déposer à l'intérieur de leur catégorie ; `displayOrder` reste éditable au clavier dans le formulaire.

### État livré

À la fin de ce sub-project, on peut : créer un tag depuis l'écran d'administration et le voir apparaître sur les pages publiques après invalidation du cache, le modifier, et constater qu'un tag rattaché à un projet ne peut pas être supprimé.

## Dependencies

- `06-shell-admin-design.md` (statut: draft) : fournit le shell dans lequel l'écran s'insère, et la page d'attente `/admin/tags` que ce sub-project remplace.

## Références de design

- **Maquette** : l'écran Tags (`isTags` dans `Espace admin.dc.html`), le formulaire en modale (`dlgTagForm`) et la confirmation de suppression (`dlgDeleteTag`), qui porte déjà le cas du tag rattaché à un projet. La barre d'outils, l'en-tête de colonne triable et le pied paginé s'y lisent aussi : c'est de cet écran qu'est généralisée la table partagée reprise par les `08` et `12`.
- **Design system** : les fiches `.prompt.md` de `Table`, `Dialog`, `AlertDialog`, `Pagination`, `Select`, `Checkbox`, `Popover`, `Command` et `Tooltip`, les composants que ce sub-project emploie.
- Règle de lecture et liens des deux projets : `.claude/rules/design/claude-design.md`.

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
- **À créer** : `src/lib/reorder.ts` et `src/lib/reorder.test.ts` (calcul pur des positions : insertion, déplacement, retrait, glisser-déposer)
- **À modifier** : `prisma/schema.prisma`, une migration et `prisma/seed-data/tags.ts` (`displayOrder` commence à 1)
- **À créer** : `src/components/ui/` : `alert-dialog`, `dialog`, `select`, `pagination`, `checkbox`, `popover`, `command`, installés par le CLI shadcn **s'ils sont absents**
- **À modifier** : `docs/DESIGN.md` (§ Mapping Composants) : `Dialog`, `AlertDialog` et `Popover` rejoignent Overlays, `Select`, `Checkbox` et le Combobox rejoignent Formulaires, la table de liste et sa barre d'outils (filtres, groupes, glisser-déposer, pagination) sortent du post-MVP, les actions de ligne à infobulle rejoignent Actions ; seul le choix des colonnes reste post-MVP

## Architecture approach

**Le pattern des Server Actions suit celui de `submitContact`.** Signature `(prevState, formData)` compatible `useActionState`, retour d'un état typé portant `ok`, `errors` issus de `z.flattenError(...).fieldErrors` et `message` pour les erreurs non liées à un champ. Les directives `'use server'` et `'server-only'` en tête, et un logger obtenu par `createActionLogger`. L'état ne renvoie pas `values`, contrairement au contact : le formulaire n'est jamais réinitialisé, sa saisie reste dans le DOM (voir le paragraphe suivant).

**Les messages de validation sont en français, directement dans le schéma.** Le formulaire de contact renvoie des codes (`name_required`) parce que le site public est bilingue et que next-intl les traduit. L'espace admin étant monolingue par l'ADR-021, un code devrait être résolu par un mapping créé pour l'occasion, sans jamais traduire quoi que ce soit.

**Formulaires en `useActionState`**, sans librairie de formulaire, comme sur le site public. Les champs shadcn (`Input`, `Label`, `Select`) sont montés directement et les erreurs rendues sous chacun depuis l'état retourné.

**Le formulaire soumet par `onSubmit` et `startTransition`, pas par `<form action>`.** React réinitialise un formulaire à action après chaque envoi, et Radix Select répond à ce reset en rappelant `onValueChange` avec sa valeur du premier rendu : la catégorie et l'ordre saisis étaient effacés à la première erreur de validation, et en modification la catégorie revenait à l'ancienne. Sans reset, le `<select>` natif caché de Radix reste aussi aligné sur la valeur affichée.

**Les tags portent du contenu bilingue alors que l'interface ne l'est pas.** `nameFr` et `nameEn` sont deux champs du formulaire, parce qu'ils s'affichent sur un site public bilingue. L'admin est en français, ce qu'il édite ne l'est pas nécessairement.

**Le champ `icon` devient un Combobox, pas une saisie libre.** Son format est `<lib>:<slug>` avec `lib` valant `simple-icons` ou `lucide`, et `resolveTagIcon` retourne `null` **sans erreur** quand le slug est inconnu. Une faute de frappe produirait donc un tag sans icône, sans que rien ne le signale. Les clés étant connues à la compilation, le formulaire les propose et le schéma les valide. Combobox (`Popover` et `Command`) plutôt que `Select` : le registre dépasse largement la dizaine d'options au-delà de laquelle la fiche du design system demande une recherche.

**La suppression doit composer avec `onDelete: Restrict`.** La relation `ProjectTag` interdit de supprimer un tag rattaché à un projet : PostgreSQL lève une violation de contrainte que Prisma remonte en erreur connue. L'action l'intercepte et renvoie un message explicite plutôt que de laisser remonter une erreur technique.

**Chaque Server Action vérifie la session elle-même.** `await getCurrentUser()` ouvre chaque mutation, hors de tout `try/catch`. Le layout protège l'affichage des pages, il ne protège pas l'exécution des actions : une Server Action exportée est un endpoint HTTP que quiconque connaît l'identifiant peut appeler sans jamais charger l'écran. C'est la défense en profondeur qu'impose `.claude/rules/nextjs/server-actions.md`, qui écrit aussi bien « vérifier l'authentification dans chaque Server Action, même si le proxy protège déjà la route » que « ne pas dépendre uniquement du proxy : un matcher modifié peut supprimer la couverture ». L'appel précède le `try`, sinon le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique.

**Invalidation par `updateTag('tags')` et `updateTag('projects')`** après chaque mutation réussie. La première étiquette est celle des requêtes publiques de `src/server/queries/tags.ts`. La seconde est indispensable et facile à manquer : `PROJECT_INCLUDE` (`src/types/project.ts`) embarque les tags dans chaque projet caché sous l'étiquette `projects`, donc renommer un tag ou changer son icône laisse les cartes projet et les case studies afficher l'ancienne valeur jusqu'à expiration du `cacheLife('hours')`. Le scénario 7 passerait sur `/a-propos`, qui lit `findAllTags`, et échouerait sur `/projets`.

**La lecture des données de la page vit sous `<Suspense>`.** Avec `cacheComponents: true`, une requête Prisma sans `'use cache'` est un accès dynamique : appelée directement dans le composant de page, elle fait échouer le build sur « Uncached data was accessed outside of `<Suspense>` ». La page monte donc un sous-composant async sous `<Suspense>`, avec un `DataTableSkeleton` en fallback. Le bouton « Nouveau tag » de l'en-tête, hors de cette frontière, a besoin du nombre de tags par catégorie pour pré-remplir l'ordre : `countTagsByKind` porte `'use cache'` sous l'étiquette `tags`, que chaque mutation invalide. Point de vigilance propre au premier écran admin lisant Prisma sans cache : l'issue prisma#28588 (« used new Date() before accessing uncached data ») peut se manifester ici, sa mitigation est un `await connection()` en tête du sous-composant.

`updateTag` plutôt que `revalidateTag` : le premier fait attendre la requête suivante le temps de recharger, le second sert d'abord du contenu périmé. Comme on vérifie l'effet en consultant la page publique juste après la mutation, seule la première sémantique rend le critère observable. `updateTag` n'est utilisable que depuis une Server Action, ce qui est précisément le contexte ici.

**La table de liste est un composant partagé, écrit une fois ici.** `docs/DESIGN.md` § Mapping Composants décrit le motif cible d'une table admin, et le design system rappelle que ce n'est pas un composant du registry mais un pattern en état local React, sans librairie de table à cette volumétrie. Il reproduit l'écran de la maquette : barre d'outils au-dessus de la card (recherche, filtres à compteurs facettés en `Popover`), table à colonnes de largeur fixe ouverte par une colonne d'ordre d'affichage, tri par colonne (cycle croissant, décroissant, ordre d'affichage, `aria-sort` sur le `th`), lignes de groupe et glisser-déposer dans la vue d'ordre d'affichage, et pied paginé sous la card. Les sub-projects `08` et `12` le réutilisent tel quel, ce qui fait que les trois écrans de liste se ressemblent dès le premier jour.

**La liste suit la maquette, y compris là où la rédaction initiale de cette spec s'en écartait.** Colonne Projets, lignes de groupe par catégorie, glisser-déposer et filtres facettés avaient d'abord été exclus ; l'écran livré sans eux ne ressemblait plus à la maquette, qui fait foi sur l'apparence de l'écran. Le choix des colonnes affichées, second `Popover` de la barre d'outils, n'apparaît pas sur l'écran des tags de la maquette : il n'est pas écrit ici, les écrans qui le portent l'ajoutent au composant partagé.

**La colonne Projets compte les rattachements de chaque tag.** Elle annonce, avant toute tentative, qu'un tag ne se supprimera pas.

**L'ordre d'affichage forme une suite continue 1..n dans chaque catégorie, maintenue par chaque mutation.** Aucune position n'est laissée en doublon ni en trou, quelle que soit l'opération :

- **Création** : le champ Ordre est pré-rempli à n+1 dès le choix de la catégorie (8 pour une catégorie de 7 tags). Saisir une position occupée y insère le tag et décale d'un cran ceux qui suivent ; une position au-delà de n+1 est ramenée à n+1
- **Modification dans la même catégorie** : le tag quitte sa position et prend celle saisie, les tags intermédiaires glissent d'un cran
- **Changement de catégorie** : l'ancienne catégorie se referme, le tag s'insère dans la nouvelle à la position saisie, pré-remplie à n+1 de la nouvelle catégorie
- **Suppression** : la catégorie est renumérotée dans la même transaction
- **Glisser-déposer** : le tag déposé prend la position qu'occupait la cible, comme s'il avait saisi cette position dans le champ Ordre

Le calcul des positions est une fonction pure de `src/lib/reorder.ts`, testée seule. Chaque action réécrit la ou les catégories concernées en entier, dans une transaction, ce qui referme aussi un trou déjà présent en base. La migration qui fait démarrer l'ordre à 1 décale les données existantes d'un cran ; la règle vaut pour tous les ordres d'affichage de l'admin, les projets et les tags d'un projet la reprendront dans leurs sub-projects.

**Le glisser-déposer réécrit l'ordre d'une catégorie entière.** `reorderTags` reçoit la catégorie et la liste complète de ses ids dans le nouvel ordre, et refuse d'écrire si cette liste ne correspond plus exactement aux tags de la catégorie en base : une création ou une suppression survenue entre l'affichage et le dépôt la rendrait périmée, et réécrire un sous-ensemble laisserait des ordres en doublon ou troués.

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
**AND** les valeurs saisies sont conservées dans le formulaire, catégorie et ordre compris

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
**WHEN** on ouvre sa confirmation de suppression
**THEN** le refus s'affiche dès l'ouverture, à la place du texte, avec le nombre de projets qui l'emploient
**AND** le bouton de suppression est désactivé
**AND** si le rattachement survient entre l'affichage et la confirmation, la contrainte de clé étrangère refuse la suppression côté serveur et le même refus s'affiche
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

### Scénario 12 : Réordonnancement dans une catégorie
**GIVEN** la liste en ordre d'affichage, sans tri, recherche ni filtre
**WHEN** on glisse un tag sur un autre tag de la même catégorie
**THEN** le tag déposé prend la position de la cible, l'ordre de la catégorie est réécrit de 1 à n et le site public le reflète
**AND** déposé sur la ligne suivante, le tag descend d'un cran
**AND** un tag ne peut pas être déposé dans une autre catégorie

### Scénario 13 : Ordre périmé
**GIVEN** un tag créé ou supprimé dans une catégorie depuis l'affichage de la liste
**WHEN** on dépose un tag de cette catégorie
**THEN** rien n'est écrit
**AND** un message invite à recharger la page

### Scénario 14 : Filtres et usage
**GIVEN** l'écran des tags
**WHEN** on coche une catégorie dans les filtres
**THEN** seuls ses tags restent affichés, et chaque compteur de filtre tient compte de la recherche en cours
**AND** la colonne Projets donne pour chaque tag le nombre de projets qui l'emploient

### Scénario 15 : Ordre à la création
**GIVEN** une catégorie de 7 tags et le formulaire de création
**WHEN** on choisit cette catégorie
**THEN** le champ Ordre vaut 8
**AND** si on saisit 5 et qu'on enregistre, le nouveau tag est en 5 et l'ancien 5 passe en 6, les suivants décalés d'un cran

### Scénario 16 : Ordre après suppression et changement de catégorie
**GIVEN** une catégorie numérotée de 1 à n
**WHEN** on supprime l'un de ses tags, ou on le déplace dans une autre catégorie
**THEN** la catégorie qu'il quitte est renumérotée de 1 à n-1, sans trou
**AND** la catégorie qui le reçoit reste continue

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
  - un ordre vide est refusé au lieu d'être converti en 0, un ordre inférieur à 1 aussi
  - la création à une position occupée réécrit toute la catégorie dans une transaction
  - la modification déplace le tag dans sa catégorie, ou referme l'ancienne et insère dans la nouvelle, dans une transaction
  - la suppression renumérote la catégorie dans la même transaction, et ne renumérote rien si la contrainte de clé étrangère l'a refusée
  - un appel sans session est refusé avant toute requête base, la garde précédant la validation
  - `reorderTags` refuse un appel sans session avant toute requête base
  - `reorderTags` refuse une liste d'ids en doublon sans rien écrire
  - `reorderTags` refuse une liste qui ne couvre pas exactement les tags de la catégorie, sans rien écrire
  - `reorderTags` réécrit `displayOrder` à partir de 1 dans l'ordre reçu, dans une transaction, puis invalide les caches
- `src/lib/reorder.test.ts`, fonctions pures :
  - insertion à une position occupée, en 1 et au-delà de la fin (ramenée à n+1), position inférieure à 1 ramenée à 1
  - déplacement vers le haut et vers le bas dans une même liste
  - retrait d'un id qui referme la liste
  - glisser-déposer : le déplacé prend la position de la cible dans les deux sens, y compris sur la ligne voisine

Aucun test n'est écrit sur le rendu des composants : monter une modale shadcn pour vérifier qu'elle s'ouvre relève du test de librairie. Les scénarios d'interface se vérifient manuellement.

## Edge cases

- **Garde par page** : la page appelle `await getCurrentUser()` avant tout rendu et garde le `loading.tsx` de son segment, posés au sub-project `06` (cf. `.claude/rules/nextjs/auth.md`)
- **Slug non normalisé** : `React` et `react` produiraient deux tags distincts alors que le slug est un identifiant technique. La règle de normalisation doit être décidée et testée, pas laissée à la saisie
- **Icône silencieusement invalide** : c'est le piège principal de cette entité. `resolveTagIcon` retourne `null` sans rien signaler, donc un tag mal saisi s'afficherait simplement sans icône, et le défaut ne serait découvert qu'à l'œil sur le site public
- **`displayOrder` en doublon ou troué** : les mutations de l'admin ne le produisent pas, mais aucune contrainte de base ne l'interdit (écriture SQL directe, seed modifié). L'ordre reste déterministe grâce au tri secondaire de `findAllTags` (`slug` croissant), et la prochaine mutation de la catégorie la renumérote entière
- **Glisser-déposer vers le bas** : insérer le déplacé à l'index de la cible calculé **après** l'avoir retiré de la liste le pose juste avant la cible, et le dépôt sur la ligne suivante ne fait alors rien. L'index de la cible se lit dans la liste d'origine
- **Cache non invalidé** : une mutation qui oublie `updateTag('tags')` réussit en base sans que le site public ne change. Le symptôme ressemble à un échec d'enregistrement alors que la donnée est bien écrite
- **Invalidation partielle** : n'invalider que `tags` est plus vicieux qu'oublier les deux. `/a-propos` se met à jour, `/projets` non, parce que les tags y sont embarqués dans le cache `projects` via `PROJECT_INCLUDE`. On conclut à un cache mal purgé sur une page alors que la cause est une étiquette manquante
- **Requête Prisma hors `<Suspense>`** : le build échoue, il ne dégrade pas. Le message nomme le fichier, pas toujours l'appel fautif
- **Requête publique cachée** : `findAllTags` porte `'use cache'`. Réutilisée dans l'administration, elle servirait un instantané antérieur à la dernière mutation, qui passerait pour perdue
- **Suppression concurrente** : un tag rattaché à un projet entre l'affichage de la liste et la confirmation de suppression provoque une erreur de contrainte. C'est le comportement attendu, et le message doit rester compréhensible
