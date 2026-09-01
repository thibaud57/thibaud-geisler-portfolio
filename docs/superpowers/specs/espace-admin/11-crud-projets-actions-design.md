---
feature: "Feature 1 — Espace admin"
subproject: "crud-projets-actions"
goal: "Porter toute la logique de mutation d'un projet et de ses relations, sans interface"
status: "draft"
complexity: "L"
tdd_scope: "full"
depends_on: ["07-crud-tags-design.md", "08-crud-entreprises-design.md"]
date: "2026-08-30"
---

# Server Actions des projets

## Scope

Créer, modifier et supprimer un projet avec ses relations : la méta client et les tags rattachés, écrits dans une même transaction. Schémas Zod couvrant les champs bilingues et les enums existants, et invalidation du cache.

Aucun écran : la liste appartient au sub-project `12` et le formulaire au `13`. C'est le sub-project le plus dense en règles de cohérence de toute la feature, d'où sa séparation d'avec l'interface.

### État livré

À la fin de ce sub-project, on peut : exécuter une suite de tests qui crée un projet client complet avec ses tags et sa méta client, le modifie, change son type, le supprime, et vérifie qu'aucune ligne orpheline ne subsiste.

## Dependencies

- `07-crud-tags-design.md` (statut: draft) — les tags doivent exister pour être rattachés, et le pattern de Server Action vient de là.
- `08-crud-entreprises-design.md` (statut: draft) — un projet client référence une entreprise.

## Files touched

- **À créer** : `src/lib/schemas/project.ts`
- **À créer** : `src/server/actions/projects.ts`
- **À créer** : `src/server/actions/projects.test.ts`
- **À créer** : `src/server/actions/projects.types.ts`
- **À modifier** : `src/server/queries/projects.ts` (requête d'administration)

## Architecture approach

**Le type du projet commande la présence de la méta client.** Un projet `CLIENT` exige un `ClientMeta` rattaché à une entreprise ; un projet `PERSONAL` n'en a pas. Cette dépendance ne peut pas être exprimée par le modèle Prisma, où `clientMeta` est simplement optionnel : elle relève du schéma Zod, sous forme de validation conditionnelle. C'est la principale règle métier du sub-project.

**Chaque Server Action vérifie la session elle-même.** `await getCurrentUser()` ouvre chaque mutation, hors de tout `try/catch`. Le layout protège l'affichage des pages, il ne protège pas l'exécution des actions : une Server Action exportée est un endpoint HTTP que quiconque connaît l'identifiant peut appeler sans jamais charger l'écran. C'est la défense en profondeur qu'impose `.claude/rules/nextjs/server-actions.md`, qui écrit aussi bien « vérifier l'authentification dans chaque Server Action, même si le proxy protège déjà la route » que « ne pas dépendre uniquement du proxy : un matcher modifié peut supprimer la couverture ». L'appel précède le `try`, sinon le `catch` avalerait l'interruption `unauthorized()` et la présenterait comme une erreur technique.

**Tout passe par une transaction.** Créer un projet client écrit trois tables : `Project`, `ClientMeta` et une ligne de `ProjectTag` par tag. Une écriture partielle laisserait un projet sans sa méta, donc un projet client invalide au regard de la règle ci-dessus, sans qu'aucune contrainte de base ne s'y oppose.

**Le changement de type est autorisé mais destructeur.** Passer un projet de `CLIENT` à `PERSONAL` supprime sa méta client : entreprise, mode de travail, taille d'équipe et nombre de livrables sont perdus. L'action le fait dans la transaction, et le formulaire du sub-project `13` devra avertir avant. L'alternative, interdire le changement, obligerait à recréer le projet et à ressaisir tout le reste pour une correction de type.

**Les tags sont remplacés intégralement à chaque modification.** Calculer un différentiel entre l'ancien et le nouveau jeu serait plus économe mais introduirait une logique de rapprochement pour un gain nul à cette échelle : un projet porte quelques tags. La suppression puis la recréation, dans la transaction, donne le même résultat avec moins de code susceptible de se tromper.

**L'ordre des tags est porté par `ProjectTag.displayOrder`.** Il vient de la position dans la liste soumise, ce qui permettra au formulaire de laisser réordonner sans champ supplémentaire.

**`formats` est un tableau d'enum**, lu avec `getAll` comme les secteurs d'entreprise au sub-project `08`. Même piège : une lecture par `get` ne conserverait que la première valeur.

**Les dates sont optionnelles et peuvent être incohérentes.** Rien n'empêche en base une date de fin antérieure à la date de début. Le schéma le refuse, la base ne le ferait pas.

**Invalidation par `updateTag('projects')`**, l'étiquette portée par les requêtes publiques de `src/server/queries/projects.ts`. `updateTag` et non `revalidateTag` : il fait attendre la requête suivante plutôt que de servir du contenu périmé, ce qui rend immédiatement visible un projet passé en publié.

**La requête d'administration ignore le statut.** `findManyPublished` filtre sur `PUBLISHED` et applique `'use cache'` : l'administration doit voir les brouillons et les archivés, sans cache. Même raisonnement qu'aux sub-projects `07` et `08`.

Rules applicables : `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/vitest/setup.md`, `.claude/rules/nextjs/tests.md`.

## Acceptance criteria

### Scénario 1 : Création d'un projet personnel
**GIVEN** des données valides de type `PERSONAL`
**WHEN** l'action de création s'exécute
**THEN** le projet est créé avec ses tags
**AND** aucune méta client n'est créée

### Scénario 2 : Création d'un projet client
**GIVEN** des données valides de type `CLIENT` avec une entreprise et un mode de travail
**WHEN** l'action de création s'exécute
**THEN** le projet, sa méta client et ses tags sont créés
**AND** les trois écritures ont eu lieu dans la même transaction

### Scénario 3 : Projet client sans entreprise
**GIVEN** des données de type `CLIENT` sans entreprise renseignée
**WHEN** l'action s'exécute
**THEN** aucune écriture n'a lieu
**AND** l'erreur porte sur le champ d'entreprise

### Scénario 4 : Projet personnel avec méta client
**GIVEN** des données de type `PERSONAL` accompagnées d'une entreprise
**WHEN** l'action s'exécute
**THEN** la méta client est ignorée ou refusée, selon la règle retenue
**AND** aucun `ClientMeta` n'est créé

### Scénario 5 : Bascule de client vers personnel
**GIVEN** un projet client existant avec sa méta
**WHEN** on le passe en `PERSONAL`
**THEN** la méta client est supprimée
**AND** le projet subsiste avec ses autres champs intacts

### Scénario 6 : Bascule de personnel vers client
**GIVEN** un projet personnel existant
**WHEN** on le passe en `CLIENT` avec une entreprise et un mode de travail
**THEN** une méta client est créée et rattachée

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

### Scénario 12 : Action inatteignable sans session
**GIVEN** aucune session valide
**WHEN** la Server Action est appelée directement, sans passer par l'écran
**THEN** l'accès est refusé avant toute validation et toute écriture
**AND** aucune ligne n'est créée, modifiée ni supprimée

## Tests à écrire

### Unit

- `src/server/actions/projects.test.ts`, avec Prisma mocké :
  - un slug vide est refusé avant toute écriture
  - un titre français vide est refusé, un titre anglais vide également
  - un type absent de `ProjectType` est refusé
  - un statut absent de `ProjectStatus` est refusé
  - un format absent de `ProjectFormat` est refusé
  - plusieurs formats soumis sont tous conservés
  - un projet `CLIENT` sans entreprise est refusé, l'erreur portant sur le champ d'entreprise
  - un projet `CLIENT` sans mode de travail est refusé, ce champ étant requis en base
  - un projet `PERSONAL` avec une entreprise ne crée aucune méta client
  - une date de fin antérieure à la date de début est refusée
  - des dates absentes sont acceptées, les deux champs étant optionnels
  - une URL de dépôt ou de démonstration invalide est refusée, une valeur vide est enregistrée en `null`
  - la création d'un projet client ouvre une transaction
  - le passage de `CLIENT` à `PERSONAL` supprime la méta client
  - le passage de `PERSONAL` à `CLIENT` crée la méta client
  - la modification remplace intégralement le jeu de tags
  - l'ordre de rattachement des tags suit l'ordre soumis
  - la création réussie invalide l'étiquette `projects`
  - une violation d'unicité sur le slug est traduite en erreur sous ce champ
  - les valeurs saisies sont retournées dans l'état en cas d'échec
  - un appel sans session est refusé avant l'ouverture de la transaction

## Edge cases

- **Écriture partielle sans transaction** : un projet client créé sans sa méta serait invalide au regard de la règle métier, alors qu'aucune contrainte de base ne s'y oppose. C'est le risque principal de ce sub-project
- **Perte silencieuse de la méta client** : la bascule vers `PERSONAL` supprime des données saisies. L'action l'assume, mais le formulaire du sub-project `13` doit avertir, sans quoi la perte serait découverte plus tard
- **`workMode` requis** : contrairement à `teamSize` et `contractStatus`, ce champ n'est pas nullable dans `ClientMeta`. L'oublier dans le schéma produirait une erreur de base au lieu d'un message de formulaire
- **`formats` lu avec `get`** : seule la première valeur serait conservée, silencieusement. Même piège qu'avec les secteurs d'entreprise
- **Dates au fuseau** : les colonnes sont en `Timestamptz`. Une date saisie sans heure est interprétée à minuit, ce qui peut décaler d'un jour selon le fuseau. Sur des dates de début et de fin de mission, l'effet reste sans conséquence, mais il explique un affichage parfois surprenant
- **Suppression et cascades** : `ClientMeta` et `ProjectTag` sont en `Cascade` sur le projet, donc supprimés automatiquement. Ni les tags ni l'entreprise ne le sont, leurs relations portant `Restrict`
- **`coverFilename` non vérifié** : rien ne garantit que le fichier référencé existe dans le bucket. Le formulaire du sub-project `13` le choisira parmi les assets réels, ce qui rend le cas improbable sans le rendre impossible

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
