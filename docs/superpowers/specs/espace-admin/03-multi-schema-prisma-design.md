---
feature: "Feature 1 — Espace admin"
subproject: "multi-schema-prisma"
goal: "Activer le multi-schema Prisma et rattacher explicitement les modèles et enums existants au schema public"
status: "draft"
complexity: "S"
tdd_scope: "none"
depends_on: []
date: "2026-09-03"
---

# Passage du schéma Prisma en multi-schema

## Scope

Activer le multi-schema sur le datasource avec `schemas = ["public"]`, et annoter les 9 modèles et 13 enums existants d'un `@@schema("public")`.

Exclut la création du schema `auth` : il appartient au sub-project `04`, qui l'ajoutera au datasource en même temps qu'il y posera les tables Better Auth. Une structure se crée quand quelque chose la remplit. Exclut également les schemas `freelance`, `dev` et `rag_public` prévus par l'ADR-018, qui n'ont aucun modèle à porter aujourd'hui.

### État livré

À la fin de ce sub-project, on peut : lancer `prisma validate` sans erreur sur les 22 déclarations annotées, régénérer le client, et voir la suite d'intégration existante rester verte sur une base recréée depuis zéro.

## Dependencies

Aucune — ce sub-project est autoporté. Il conditionne le sub-project `04`, qui n'aura plus qu'à ajouter `"auth"` au tableau `schemas` et à y déclarer ses tables.

## Files touched

- **À modifier** : `prisma/schema.prisma` (champ `schemas` sur le datasource, plus `@@schema("public")` sur 22 déclarations)
- **À modifier** : `docs/ARCHITECTURE.md` (§ Base de Données Principale : le découpage en schemas n'est plus annoncé au post-MVP pour ceux réellement créés)

`prisma/schema.prisma` est le seul fichier de code concerné. Aucune migration n'est attendue, l'annotation ne modifiant rien physiquement — mais cette absence se constate, elle ne se suppose pas (voir Architecture approach).

`src/lib/prisma.ts`, `prisma.config.ts` et `src/lib/prisma-test-setup.ts` restent inchangés.

## Architecture approach

**Aucun `previewFeatures` à déclarer.** Le multi-schema est stable en Prisma 7. Les guides antérieurs demandent `previewFeatures = ["multiSchema"]` : c'est obsolète et cela produirait un avertissement.

**L'annotation est obligatoire et exhaustive.** Dès que `schemas` figure dans le datasource, chaque modèle **et chaque enum** doit porter un `@@schema`, faute de quoi la validation échoue. Il n'existe pas de valeur par défaut implicite. Les 22 déclarations sont donc concernées, pas seulement les 9 modèles — c'est la principale source d'erreur de ce sub-project.

**L'annotation ne déplace rien.** Les tables vivent déjà dans `public`, schema par défaut de PostgreSQL. `@@schema("public")` déclare un état existant plutôt qu'il ne le change. C'est ce qui rend l'opération sûre malgré son étendue.

**L'absence de migration se vérifie, elle ne se présume pas.** Le changement ne devrait produire aucun diff, mais c'est précisément ce qu'il faut confirmer : un `prisma migrate dev --create-only` révèle ce que Prisma compte écrire. Si un fichier est généré, son SQL est lu avant toute application. Toute instruction touchant les tables existantes — `ALTER TABLE`, `DROP`, recréation — signalerait une erreur d'annotation et non un comportement attendu.

**Le client doit être régénéré explicitement.** Depuis Prisma 7, `migrate dev` ne déclenche plus `prisma generate`. Sans cette étape, le client reste sur l'ancien schéma et les tests échouent pour une raison étrangère au changement.

**Le helper de test reste en l'état.** `src/lib/prisma-test-setup.ts` tronque des tables sans les qualifier, ce qui repose sur le `search_path`. Les tables ne quittant pas `public`, le comportement est inchangé. La qualification deviendra nécessaire au sub-project `04`, lorsque des tables vivront dans `auth` et devront entrer dans le reset.

**Aucun paramètre `search_path` n'est ajouté au `DATABASE_URL`.** `public` est déjà le schema par défaut, et Prisma qualifie ses requêtes quand le multi-schema est actif.

Rules applicables : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/client-setup.md`.

Contexte d'architecture : l'ADR-018 fixe la cible à cinq schemas dans la base `portfolio`, avec un seul propriétaire par schema, et acte que « les migrations des schemas de `portfolio` sont couplées dans un seul `schema.prisma` ». Ce sub-project pose le premier jalon de cette trajectoire sans en anticiper les étapes.

## Acceptance criteria

### Scénario 1 : Validation du schéma
**GIVEN** le datasource déclarant `schemas = ["public"]` et les 22 déclarations annotées
**WHEN** on exécute `prisma validate`
**THEN** la validation passe sans erreur
**AND** aucune déclaration ne fait l'objet d'un avertissement de `@@schema` manquant

### Scénario 2 : Absence de diff sur l'existant
**GIVEN** le schéma modifié et la base à jour des migrations précédentes
**WHEN** on exécute `prisma migrate dev --create-only`
**THEN** aucune migration n'est générée, ou la migration générée est vide
**AND** aucune instruction ne touche les tables existantes

### Scénario 3 : Base recréée depuis zéro
**GIVEN** une base vide
**WHEN** on applique l'ensemble des migrations puis on régénère le client
**THEN** les 9 tables existent dans le schema `public`
**AND** aucun autre schema applicatif n'a été créé

### Scénario 4 : Non-régression des accès existants
**GIVEN** le client régénéré
**WHEN** on exécute la suite d'intégration
**THEN** `src/server/queries/projects.integration.test.ts`, `legal.integration.test.ts` et `about.integration.test.ts` passent
**AND** le helper `resetDatabase()` continue de tronquer les tables sans modification

## Edge cases

- **Enums oubliés** : l'exigence de `@@schema` porte sur les enums autant que sur les modèles, alors qu'on pense spontanément aux seuls modèles. Les 13 enums sont la source d'échec la plus probable de ce sub-project
- **Migration générée alors qu'aucune n'était attendue** : ce n'est pas un signal à ignorer. Lire le SQL avant d'appliquer, une instruction sur une table existante trahissant une annotation erronée
- **Client non régénéré** : les tests échouent alors que la migration est correcte, avec un message qui n'oriente pas vers la cause réelle
- **Ordre du tableau `schemas`** : sans incidence fonctionnelle ici, un seul schema étant déclaré
- **Rien à appliquer en production** : ce sub-project ne modifie que des déclarations. Le déploiement ne porte donc aucun risque pour les données

## Architectural decisions

### Décision : moment de création du schema `auth`

**Options envisagées :**
- **A. Créer le schema `auth` vide dès ce sub-project** : le `03` livrerait une migration réelle et observable, et le `04` n'aurait plus qu'à y poser ses tables. Mais cela produit un espace de nommage dont personne ne se sert pendant un sub-project entier, et impose potentiellement d'écrire le `CREATE SCHEMA` à la main, un schema vide ne générant pas nécessairement de diff.
- **B. Laisser le `04` créer `auth` avec ses tables** : le `03` se limite à l'activation du multi-schema et aux annotations. Rien n'est créé avant d'être utilisé. En contrepartie, ce sub-project ne produit aucune migration et son état livré repose sur la validation, la régénération du client et la non-régression des tests.

**Choix : B**

**Rationale :**
- Une structure de base de données se crée au moment où quelque chose la remplit. Un schema vide en attente n'apporte rien et invite à se demander à quoi il sert
- Ajouter `"auth"` au tableau `schemas` relève de la même unité de travail que déclarer les tables qui y vivent : les séparer coupe un changement cohérent en deux
- La séparation des causes d'échec, seul argument sérieux en faveur de A, est préservée : ce sub-project ne touche qu'à la structure et à ses 22 annotations, le `04` ne touche qu'à l'authentification
- L'absence de migration ne prive pas ce sub-project de vérification : `prisma validate` couvre l'exhaustivité des annotations, et la suite d'intégration couvre la non-régression des accès
