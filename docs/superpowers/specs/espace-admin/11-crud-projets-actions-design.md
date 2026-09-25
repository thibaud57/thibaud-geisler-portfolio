---
feature: "Feature 1 — Espace admin"
subproject: "crud-projets-actions"
goal: "Porter toute la logique de mutation d'un projet et de ses relations, sans interface"
status: "implemented"
complexity: "L"
tdd_scope: "full"
depends_on: ["07-crud-tags-design.md", "08-crud-entreprises-design.md"]
date: "2026-09-03"
---

# Server Actions des projets

## Scope

Créer, modifier et supprimer un projet avec ses relations : la méta client et les tags rattachés, écrits dans une même transaction. Schémas Zod couvrant les champs bilingues et les enums existants, et invalidation du cache.

L'ordre d'affichage des projets forme une suite continue de 1 à n sur l'ensemble des projets, client et personnels mélangés : c'est la même liste que sert la page publique `/projets`. La création, la modification et la suppression maintiennent cette suite, et une Server Action `reorderProjects` porte le glisser-déposer que le sub-project `12` câble sur sa vue « Tous ».

Aucun écran : la liste appartient au sub-project `12` et le formulaire au `13`. Leurs écrans de maquette (`isProjets`, `isForm`) servent seulement à vérifier que les données exposées ici suffisent à les rendre. C'est le sub-project le plus dense en règles de cohérence de toute la feature, d'où sa séparation d'avec l'interface.

Tout projet porte une méta rattachée à une entreprise, quel que soit son type : un projet personnel est rattaché à la société du propriétaire, qui remplace dans le seed et en base l'entreprise factice `personnel`.

Restent hors périmètre, faute de support en base : la phase du projet et la date de mise en production que montre la maquette, `docs/BRAINSTORM.md` Feature 6 « Suivi du cycle de développement » en porte la suite prévue. Reste aussi hors périmètre l'affichage public : `ProjectCard` et `CaseStudyHeader` montrent la société du propriétaire comme n'importe quelle entreprise, le choix de masquer ou d'adapter ce bandeau appartient à un sub-project d'interface.

### État livré

À la fin de ce sub-project, on peut : exécuter une suite de tests qui crée un projet client complet avec ses tags et sa méta client, le modifie, change son type, le supprime, réordonne l'ensemble des projets par glisser-déposer, et vérifie qu'aucune ligne orpheline ni aucun trou dans l'ordre d'affichage ne subsiste.

## Dependencies

- `07-crud-tags-design.md` (statut: draft) : les tags doivent exister pour être rattachés, et le pattern de Server Action vient de là.
- `08-crud-entreprises-design.md` (statut: draft) : un projet client référence une entreprise.

## Files touched

- **À créer** : `src/lib/schemas/project.ts`
- **À créer** : `src/server/actions/projects.ts`
- **À créer** : `src/server/actions/projects.test.ts`
- **À créer** : `src/server/actions/projects.types.ts`
- **À modifier** : `src/server/queries/projects.ts` (requête d'administration)
- **À modifier** : `prisma/schema.prisma` (`Project.displayOrder` et `ProjectTag.displayOrder` en `@default(1)`)
- **À créer** : une migration Prisma qui décale d'un cran les valeurs existantes de ces deux colonnes
- **À créer** : une migration Prisma de données qui renomme l'entreprise `personnel` en société du propriétaire, sans changer son identifiant
- **À modifier** : `prisma/seed-data/companies.ts` (l'entreprise `personnel` devient `thibaud-geisler`, rattachée à l'entité légale `thibaud`)
- **À modifier** : `prisma/seed-data/projects.ts` (`displayOrder` de 1 à n, rattachement des projets personnels à la nouvelle entreprise)
- **À modifier** : `prisma/seed.ts` (`ProjectTag.displayOrder` en `index + 1`)

## Architecture approach

**Tout projet exige une méta, quel que soit son type.** Entreprise et mode de travail sont requis pour un projet `CLIENT` comme pour un projet `PERSONAL` : un projet personnel est une réalisation de la société du propriétaire, il s'y rattache comme un projet client se rattache à son client. `type` ne porte plus que la distinction d'affichage entre les deux. Cette obligation ne peut pas être exprimée par le modèle Prisma, où `clientMeta` est simplement optionnel : elle relève du schéma Zod. C'est la principale règle métier du sub-project.

**La société du propriétaire remplace l'entreprise factice `personnel`.** Le seed rattachait les projets personnels à une entreprise sans logo, sans site ni entité légale, qui ne correspond à rien de réel. Elle devient `thibaud-geisler`, rattachée à l'entité légale `thibaud` déjà présente dans `prisma/seed-data/legal.ts`. Une migration de données renomme la ligne existante plutôt que d'en créer une seconde : l'identifiant ne change pas, les `ClientMeta` déjà en base restent rattachés, et le seed, qui procède par `upsert` sur le slug, retrouve ensuite la même ligne.

**Chaque Server Action vérifie la session elle-même.** `await getCurrentUser()` ouvre chaque mutation, hors de tout `try/catch`. Le layout protège l'affichage des pages, il ne protège pas l'exécution des actions : une Server Action exportée est un endpoint HTTP que quiconque connaît l'identifiant peut appeler sans jamais charger l'écran. C'est la défense en profondeur qu'impose `.claude/rules/nextjs/server-actions.md`, qui écrit aussi bien « vérifier l'authentification dans chaque Server Action, même si le proxy protège déjà la route » que « ne pas dépendre uniquement du proxy : un matcher modifié peut supprimer la couverture ». L'appel précède le `try`, sinon le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique.

**Tout passe par une transaction.** Créer un projet écrit trois tables : `Project`, `ClientMeta` et une ligne de `ProjectTag` par tag. Une écriture partielle laisserait un projet sans sa méta, donc invalide au regard de la règle ci-dessus, sans qu'aucune contrainte de base ne s'y oppose.

**Le changement de type ne détruit rien.** Passer un projet de `CLIENT` à `PERSONAL`, ou l'inverse, réécrit sa méta avec les valeurs soumises, comme toute modification : la méta est créée si elle manquait, mise à jour sinon, jamais supprimée.

**Les tags sont remplacés intégralement à chaque modification.** Calculer un différentiel entre l'ancien et le nouveau jeu serait plus économe mais introduirait une logique de rapprochement pour un gain nul à cette échelle : un projet porte quelques tags. La suppression puis la recréation, dans la transaction, donne le même résultat avec moins de code susceptible de se tromper.

**L'ordre des tags est porté par `ProjectTag.displayOrder`, en base 1.** Il vient de la position dans la liste soumise, `index + 1` et non `index`, cohérent avec la suite 1..n posée au sub-project `07` pour `Tag.displayOrder`. Le remplacement intégral du jeu à chaque modification rend cette suite triviale à garder continue : il n'y a jamais d'insertion à une position occupée à gérer ici, contrairement à l'ordre des projets ci-dessous.

**`Project.displayOrder` forme une seule suite continue de 1 à n, sur l'ensemble des projets.** Contrairement aux tags, dont l'ordre se scope par catégorie, les projets n'ont pas d'axe qui partitionnerait la suite : un projet client et un projet personnel se disputent la même numérotation, parce que la page publique `/projets` les affiche dans une seule liste. Le sub-project `12` restreint le glisser-déposer à sa vue « Tous » ; ses vues « Client » et « Perso » affichent ce même numéro global sans permettre de le changer, elles ne réordonnent pas une sous-suite qui leur serait propre.

**La création, la modification et la suppression maintiennent cette suite, par réutilisation directe de `src/lib/reorder.ts` et du motif `renumberTags` de `src/server/actions/tags.ts`.** Une création à une position occupée décale d'un cran tous les projets à partir de cette position ; une modification qui change la position déplace le projet et referme l'ancienne ; une suppression renumérote ce qui reste. Les trois passent par `computeIdsAtPosition` et `removeId`, comme pour les tags, à la différence que la liste de référence couvre tous les projets et non une catégorie : pas de `findCategoryIds`, une seule liste d'identifiants triée par `displayOrder`. Chaque opération réécrit cette liste en entier dans la transaction déjà ouverte pour le reste du projet (méta client, tags), ce qui referme aussi un trou préexistant.

**`reorderProjects` est symétrique de `reorderTags`, sans le paramètre de catégorie.** Elle reçoit la liste complète des identifiants de projet dans le nouvel ordre et refuse d'écrire si cette liste ne correspond plus exactement à l'ensemble des projets en base (`sameIdSet`) : une création ou une suppression survenue entre l'affichage de la liste et le dépôt du glisser-déposer la rendrait périmée. Le sub-project `12` ne l'appelle que depuis sa vue « Tous ».

**La migration qui fait démarrer `Project.displayOrder` et `ProjectTag.displayOrder` à 1 décale les données existantes d'un cran**, du même geste que la migration `20260917151326_tag_display_order_from_one` pour `Tag.displayOrder`. Elle précède tout seed ou donnée réelle de projet.

**`formats` est un tableau d'enum**, lu avec `getAll` comme les secteurs d'entreprise au sub-project `08`. Même piège : une lecture par `get` ne conserverait que la première valeur.

**Les dates sont optionnelles et peuvent être incohérentes.** Rien n'empêche en base une date de fin antérieure à la date de début. Le schéma le refuse, la base ne le ferait pas.

**`demoUrl` et `githubUrl` n'acceptent que `http` et `https`.** `z.url()` valide par `new URL()`, qui accepte `javascript:alert(1)` : ces deux champs finissent dans un `href` de page publique, c'est-à-dire un XSS stocké. `docs/PRODUCTION.md` § Checklist Pré-MEP les nomme avec `Company.websiteUrl` et demande de les corriger « avant le premier formulaire d'édition de l'espace admin » ; le sub-project `08` a traité le troisième, celui-ci ferme les deux derniers. Le schéma pose `z.url({ protocol: /^https?$/ })`, avec un cas de test. `src/lib/url.ts` porte bien un `safeExternalUrl`, mais il ne filtre qu'au rendu du case study, pas à l'écriture ni sur les cartes projet.

**`deliverablesCount` a besoin d'une valeur par défaut côté formulaire.** Le champ est `Int @default(1)` en base et validé par `min(1)`. Un champ numérique vidé produit `Number('')`, soit `0`, refusé avec un message qui n'oriente pas vers la cause. Le formulaire du sub-project `13` pose donc `defaultValue={1}`.

**Invalidation par `updateTag('projects')`**, l'étiquette portée par les requêtes publiques de `src/server/queries/projects.ts`. `updateTag` et non `revalidateTag` : il fait attendre la requête suivante plutôt que de servir du contenu périmé, ce qui rend immédiatement visible un projet passé en publié. **Elle ne suffit pas côté administration** : ces écrans lisent sans cache, donc sans étiquette. Chaque mutation appelle aussi `revalidatePath` sur l'écran concerné, faute de quoi la liste continue d'afficher ce qui vient d'être supprimé.

**La requête d'administration ignore le statut.** `findManyPublished` filtre sur `PUBLISHED` et applique `'use cache'` : l'administration doit voir les brouillons et les archivés, sans cache. Même raisonnement qu'aux sub-projects `07` et `08`.

Rules applicables : `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/vitest/setup.md`, `.claude/rules/nextjs/tests.md`.

## Acceptance criteria

### Scénario 1 : Création d'un projet personnel
**GIVEN** des données valides de type `PERSONAL` avec la société du propriétaire et un mode de travail
**WHEN** l'action de création s'exécute
**THEN** le projet est créé avec ses tags
**AND** sa méta est créée et rattachée à cette société

### Scénario 2 : Création d'un projet client
**GIVEN** des données valides de type `CLIENT` avec une entreprise et un mode de travail
**WHEN** l'action de création s'exécute
**THEN** le projet, sa méta client et ses tags sont créés
**AND** les trois écritures ont eu lieu dans la même transaction

### Scénario 3 : Projet sans entreprise
**GIVEN** des données de type `CLIENT` ou `PERSONAL` sans entreprise renseignée
**WHEN** l'action s'exécute
**THEN** aucune écriture n'a lieu
**AND** l'erreur porte sur le champ d'entreprise

### Scénario 4 : Projet sans mode de travail
**GIVEN** des données de type `CLIENT` ou `PERSONAL` sans mode de travail
**WHEN** l'action s'exécute
**THEN** aucune écriture n'a lieu
**AND** l'erreur porte sur le champ de mode de travail

### Scénario 5 : Changement de type
**GIVEN** un projet client existant avec sa méta
**WHEN** on le passe en `PERSONAL` en le rattachant à la société du propriétaire
**THEN** la méta est conservée et porte la nouvelle entreprise
**AND** aucune méta n'est supprimée

### Scénario 6 : Projet existant sans méta
**GIVEN** un projet en base dépourvu de méta
**WHEN** on le modifie avec une entreprise et un mode de travail
**THEN** une méta est créée et rattachée

### Scénario 7 : Remplacement des tags
**GIVEN** un projet portant trois tags
**WHEN** on le modifie avec un jeu de deux tags différents
**THEN** le projet porte exactement ces deux tags
**AND** aucune ligne de rattachement orpheline ne subsiste

### Scénario 8 : Ordre des tags conservé
**GIVEN** un jeu de tags soumis dans un ordre donné
**WHEN** le projet est enregistré
**THEN** l'ordre de rattachement reflète celui de la soumission

### Scénario 9 : Dates incohérentes
**GIVEN** une date de fin antérieure à la date de début
**WHEN** l'action s'exécute
**THEN** aucune écriture n'a lieu
**AND** l'erreur est portée par le champ de date de fin

### Scénario 10 : Suppression
**GIVEN** un projet client avec sa méta et ses tags
**WHEN** on le supprime
**THEN** le projet, sa méta et ses rattachements disparaissent
**AND** ni les tags ni l'entreprise ne sont supprimés

### Scénario 11 : Slug déjà pris
**GIVEN** un projet portant le slug `portfolio`
**WHEN** on tente d'en créer un second avec ce slug
**THEN** aucune écriture n'a lieu
**AND** le message apparaît sous le champ slug

### Scénario 12 bis : URL restreintes à http et https
**GIVEN** les Server Actions de création et de modification
**WHEN** on soumet `javascript:alert(1)` en URL de dépôt ou de démonstration
**THEN** la validation le refuse
**AND** aucune ligne n'est écrite

### Scénario 12 : Action inatteignable sans session
**GIVEN** aucune session valide
**WHEN** la Server Action est appelée directement, sans passer par l'écran
**THEN** l'accès est refusé avant toute validation et toute écriture
**AND** aucune ligne n'est créée, modifiée ni supprimée

### Scénario 13 : Création à une position occupée
**GIVEN** une suite de projets numérotés de 1 à n
**WHEN** on crée un projet à une position déjà occupée
**THEN** le nouveau projet prend cette position
**AND** les projets suivants décalent d'un cran, dans la même transaction

### Scénario 14 : Déplacement par modification
**GIVEN** un projet en position p
**WHEN** on le modifie avec une position différente
**THEN** il quitte sa position et prend la nouvelle, les projets intermédiaires glissant d'un cran
**AND** la suite reste continue de 1 à n

### Scénario 15 : Suppression et renumérotation
**GIVEN** une suite de projets numérotés de 1 à n
**WHEN** on en supprime un
**THEN** les projets restants forment une suite continue de 1 à n-1, sans trou

### Scénario 16 : Glisser-déposer global
**GIVEN** la liste complète des projets, sans tri actif
**WHEN** on dépose un projet sur un autre
**THEN** le déposé prend la position de la cible
**AND** l'ordre de l'ensemble est réécrit de 1 à n

### Scénario 17 : Ordre périmé
**GIVEN** un projet créé ou supprimé depuis l'affichage de la liste
**WHEN** on dépose un projet par glisser-déposer
**THEN** rien n'est écrit
**AND** un message invite à recharger la page

### Scénario 18 : Tags d'un projet numérotés depuis 1
**GIVEN** un jeu de tags soumis pour un projet
**WHEN** le projet est enregistré
**THEN** le premier tag porte `displayOrder` 1, pas 0
**AND** l'ordre de rattachement suit celui de la soumission

## Tests à écrire

### Unit

- `src/server/actions/projects.test.ts`, avec Prisma mocké :
  - un slug vide est refusé avant toute écriture
  - un titre français vide est refusé, un titre anglais vide également
  - un type absent de `ProjectType` est refusé
  - un statut absent de `ProjectStatus` est refusé
  - un format absent de `ProjectFormat` est refusé
  - plusieurs formats soumis sont tous conservés
  - un projet sans entreprise est refusé quel que soit son type, l'erreur portant sur le champ d'entreprise
  - un projet sans mode de travail est refusé quel que soit son type, ce champ étant requis en base
  - un projet `PERSONAL` crée sa méta comme un projet `CLIENT`
  - une date de fin antérieure à la date de début est refusée
  - des dates absentes sont acceptées, les deux champs étant optionnels
  - une URL de dépôt ou de démonstration invalide est refusée, une valeur vide est enregistrée en `null`
  - une URL en `javascript:` est refusée sur les deux champs, `z.url()` nu l'acceptant
  - la création d'un projet ouvre une transaction
  - la modification crée ou met à jour la méta, sans jamais la supprimer, changement de type compris
  - la modification remplace intégralement le jeu de tags
  - l'ordre de rattachement des tags suit l'ordre soumis
  - la création réussie invalide l'étiquette `projects`
  - une violation d'unicité sur le slug est traduite en erreur sous ce champ
  - les valeurs saisies sont retournées dans l'état en cas d'échec
  - un appel sans session est refusé avant l'ouverture de la transaction
  - la création à une position occupée décale les projets suivants, dans une transaction
  - la modification qui change de position déplace le projet et referme l'ancienne, dans une transaction
  - la suppression renumérote la suite restante de 1 à n-1, dans la même transaction
  - le premier tag rattaché porte `displayOrder` 1, pas 0
  - `reorderProjects` refuse un appel sans session, avant toute requête base
  - `reorderProjects` refuse une liste d'ids en doublon sans rien écrire
  - `reorderProjects` refuse une liste qui ne couvre pas exactement l'ensemble des projets, sans rien écrire
  - `reorderProjects` réécrit `displayOrder` à partir de 1 dans l'ordre reçu, dans une transaction, puis invalide les caches

## Edge cases

- **Écriture partielle sans transaction** : un projet créé sans sa méta serait invalide au regard de la règle métier, alors qu'aucune contrainte de base ne s'y oppose. C'est le risque principal de ce sub-project
- **Projet hérité sans méta** : rien en base n'interdit un projet dépourvu de `ClientMeta`. La modification le répare par `upsert`, la validation exigeant entreprise et mode de travail
- **Seed rejoué après une édition dans l'admin** : le seed procède par `upsert` sur le slug, il écraserait une modification faite depuis l'espace admin. Il reste un jeu de données de développement, de test et de CI
- **`workMode` requis** : contrairement à `teamSize` et `contractStatus`, ce champ n'est pas nullable dans `ClientMeta`. L'oublier dans le schéma produirait une erreur de base au lieu d'un message de formulaire
- **`formats` lu avec `get`** : seule la première valeur serait conservée, silencieusement. Même piège qu'avec les secteurs d'entreprise
- **Dates au fuseau** : les colonnes sont en `Timestamptz`. Une date saisie sans heure est interprétée à minuit, ce qui peut décaler d'un jour selon le fuseau. Sur des dates de début et de fin de mission, l'effet reste sans conséquence, mais il explique un affichage parfois surprenant
- **Suppression et cascades** : `ClientMeta` et `ProjectTag` sont en `Cascade` sur le projet, donc supprimés automatiquement. Ni les tags ni l'entreprise ne le sont, leurs relations portant `Restrict`
- **`coverFilename` non vérifié** : rien ne garantit que le fichier référencé existe dans le bucket. Le formulaire du sub-project `13` le choisira parmi les assets réels, ce qui rend le cas improbable sans le rendre impossible
- **`displayOrder` en doublon ou troué** : rien en base ne l'interdit hors des mutations de l'admin (écriture directe, seed modifié). Comme pour les tags, la prochaine mutation renumérote l'ensemble et referme le trou
- **Ordre périmé pendant le glisser-déposer global** : une création ou une suppression de projet entre l'affichage de la vue « Tous » et le dépôt rend l'ordre reçu périmé ; `reorderProjects` le refuse plutôt que d'écrire un sous-ensemble incomplet

## Architectural decisions

### Décision : gestion des tags à la modification

**Options envisagées :**
- **A. Remplacement intégral** : supprimer tous les rattachements du projet puis recréer ceux du nouveau jeu, dans la transaction.
- **B. Différentiel** : comparer l'ancien et le nouveau jeu, ne supprimer que les retirés et n'ajouter que les nouveaux.

**Choix : A**

**Rationale :**
- Un projet porte quelques tags : l'économie d'écritures de l'option B est nulle à cette échelle
- Le différentiel demande une logique de rapprochement, donc un endroit de plus où se tromper, pour un résultat identique
- Le remplacement rend l'ordre trivial à recalculer, alors que le différentiel imposerait de réajuster les `displayOrder` des rattachements conservés
- Les deux options s'exécutent dans la même transaction, donc sans différence de sûreté

### Décision : méta des projets personnels

**Options envisagées :**
- **A. Méta requise pour tous les types** : entreprise et mode de travail obligatoires, un projet personnel se rattache à la société du propriétaire.
- **B. Méta réservée aux projets client** : un projet `PERSONAL` n'en a pas, et la bascule de `CLIENT` vers `PERSONAL` la supprime.

**Choix : A** (décision du propriétaire, 2026-09-21)

**Rationale :**
- Le seed rattache déjà chaque projet personnel à une méta, que `CaseStudyHeader` affiche et que `src/server/queries/about.ts` agrège : l'option B effacerait ces données à la première modification d'un projet personnel depuis l'admin
- Un projet personnel est une réalisation de la société du propriétaire, une vraie entreprise avec son entité légale, utile ensuite au suivi commercial et à la facturation
- Une seule règle de validation pour les deux types, sans branche conditionnelle ni suppression destructrice à la bascule

### Décision : portée de l'ordre d'affichage des projets

**Options envisagées :**
- **A. Suite globale** : `Project.displayOrder` forme une seule suite 1..n sur l'ensemble des projets, tous types confondus.
- **B. Suite par type** : une suite 1..n pour les projets `CLIENT`, une autre pour les `PERSONAL`, sur le modèle de `Tag.displayOrder` scopé par `kind`.

**Choix : A**

**Rationale :**
- La page publique `/projets` affiche tous les projets dans une seule liste : une suite globale reflète directement cet ordre, une suite par type imposerait un tri secondaire à la lecture publique
- Le sub-project `12` expose une vue « Tous » précisément pour porter cet ordre global ; ses vues « Client » et « Perso » n'en présentent qu'un sous-ensemble, sans réordonnancement qui leur serait propre
- Une suite par type dupliquerait le motif de catégorie des tags sans qu'aucun écran n'ait besoin de réordonner les projets client indépendamment des personnels
