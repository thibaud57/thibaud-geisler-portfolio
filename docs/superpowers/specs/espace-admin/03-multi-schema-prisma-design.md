---
feature: "Feature 1 — Espace admin"
subproject: "multi-schema-prisma"
goal: "Activer le multi-schema Prisma, rattacher les modèles existants au schema public et déplacer Company dans freelance"
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-09-03"
---

# Passage du schéma Prisma en multi-schema

## Scope

Activer le multi-schema sur le datasource avec `schemas = ["public", "freelance"]`, annoter les 22 déclarations existantes, et déplacer `Company` et ses deux enums dans le schema `freelance`.

`Company` est une entité du CRM, pas de la vitrine : c'est le premier modèle du domaine freelance de l'ADR-018, et le site public ne s'en sert que pour afficher le nom du client d'un projet, par `ClientMeta.companyId`. Le déplacer maintenant évite une migration de table en production le jour où le CRM arrive, alors que la table est encore petite.

Exclut la création du schema `auth` : il appartient au sub-project `04`, qui l'ajoutera au datasource en même temps qu'il y posera les tables Better Auth. Une structure se crée quand quelque chose la remplit, et c'est bien pour ça que `freelance` naît ici, avec `Company` dedans. Exclut les schemas `dev` et `rag_public` de l'ADR-018, qui n'ont aucun modèle à porter aujourd'hui, et les rôles PostgreSQL par processus, qui ne se justifient qu'avec le premier service externe.

### État livré

À la fin de ce sub-project, on peut : lancer `prisma validate` sans erreur sur les 22 déclarations annotées, régénérer le client, constater que `Company` vit dans le schema `freelance` avec ses lignes intactes, et voir la suite d'intégration existante rester verte sur une base recréée depuis zéro.

## Dependencies

Aucune : ce sub-project est autoporté. Il conditionne le sub-project `04`, qui n'aura plus qu'à ajouter `"auth"` au tableau `schemas` et à y déclarer ses tables.

## Files touched

- **À modifier** : `prisma/schema.prisma` (champ `schemas` sur le datasource, plus `@@schema(...)` sur 22 déclarations)
- **À créer** : une migration déplaçant `Company`, `CompanySize` et `CompanySector` vers `freelance`
- **À modifier** : `src/lib/prisma-test-setup.ts` (le `TRUNCATE` qualifie désormais `"freelance"."Company"`)
- **À modifier** : `docs/ARCHITECTURE.md` (§ Base de Données Principale : le découpage en schemas n'est plus annoncé au post-MVP pour ceux réellement créés)
- **À modifier** : `docs/adrs/018-cloisonnement-donnees.md` (le schema `freelance` existe et porte `Company` ; note sur les rôles PostgreSQL par processus, cf. Architecture approach)

`prisma/schema.prisma` est le seul fichier de code applicatif concerné : le client Prisma expose toujours `prisma.company`, un schema n'étant pas visible depuis l'API. `src/lib/prisma.ts` et `prisma.config.ts` restent inchangés.

## Architecture approach

**Aucun `previewFeatures` à déclarer.** Le multi-schema est stable en Prisma 7. Les guides antérieurs demandent `previewFeatures = ["multiSchema"]` : c'est obsolète et cela produirait un avertissement.

**L'annotation est obligatoire et exhaustive.** Dès que `schemas` figure dans le datasource, chaque modèle **et chaque enum** doit porter un `@@schema`, faute de quoi la validation échoue. Il n'existe pas de valeur par défaut implicite. Les 22 déclarations sont donc concernées, pas seulement les 9 modèles : c'est la principale source d'erreur de ce sub-project.

**L'annotation ne déplace rien, sauf pour `Company`.** Pour les 19 déclarations qui restent dans `public`, `@@schema("public")` décrit un état existant, les tables vivant déjà dans le schema par défaut de PostgreSQL. Seules `Company`, `CompanySize` et `CompanySector` changent réellement d'emplacement.

**Le déplacement se fait en `ALTER ... SET SCHEMA`, jamais en recréation.** C'est le point de vigilance du sub-project : une migration qui supprimerait puis recréerait la table perdrait les entreprises en production, et la contrainte `ClientMeta.companyId` avec elles. La migration est donc générée en `--create-only`, son SQL est lu, et s'il porte autre chose que ce qui suit il est réécrit à la main :

```sql
CREATE SCHEMA IF NOT EXISTS "freelance";
ALTER TABLE "public"."Company" SET SCHEMA "freelance";
ALTER TYPE "public"."CompanySize" SET SCHEMA "freelance";
ALTER TYPE "public"."CompanySector" SET SCHEMA "freelance";
```

`SET SCHEMA` déplace la table avec ses données, ses index et ses contraintes ; les clés étrangères qui la visent suivent automatiquement, PostgreSQL les résolvant par identifiant d'objet et non par nom qualifié.

**Deux relations traversent les schemas** après le déplacement : `public.ClientMeta` → `freelance.Company` et `freelance.Company` → `public.LegalEntity`. Prisma les gère nativement en multi-schema. L'ADR-018 met en garde contre les jointures entre schemas de propriétaires différents ; ici les deux appartiennent au portfolio, la mise en garde ne s'applique pas.

**Le reste de l'absence de migration se vérifie, il ne se présume pas.** Toute instruction touchant une table qui ne bouge pas signalerait une erreur d'annotation et non un comportement attendu.

**Le client doit être régénéré explicitement.** Depuis Prisma 7, `migrate dev` ne déclenche plus `prisma generate`. Sans cette étape, le client reste sur l'ancien schéma et les tests échouent pour une raison étrangère au changement.

**Le helper de test doit qualifier `Company`.** `src/lib/prisma-test-setup.ts` tronque neuf tables sans les qualifier, ce qui repose sur le `search_path` et ne trouve plus une table sortie de `public`. Seule la ligne `Company` change, en `"freelance"."Company"` ; les huit autres restent telles quelles. Le sub-project `04` fera de même pour les tables d'`auth`.

**Aucun paramètre `search_path` n'est ajouté au `DATABASE_URL`.** Prisma qualifie ses requêtes quand le multi-schema est actif, c'est précisément ce qui rend le déplacement transparent pour le code applicatif.

**Les rôles PostgreSQL ne sont pas créés ici.** L'ADR-018 écrit que « chaque service peut recevoir une chaîne de connexion restreinte à son schema » sans jamais l'imposer. Un schema sans rôle dédié n'est qu'un préfixe de table : l'étanchéité vient du rôle, pas du nommage. Mais tous les schemas existants appartiennent au même processus Next.js, qui lit une seule configuration d'environnement : un second rôle n'y protégerait de rien. La règle est à écrire dans l'ADR maintenant et à appliquer avec le premier service externe, `portfolio-chatbot` ou `agent-os`, premier à mériter un credential restreint.

Rules applicables : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/client-setup.md`.

Contexte d'architecture : l'ADR-018 fixe la cible à cinq schemas dans la base `portfolio`, avec un seul propriétaire par schema, et acte que « les migrations des schemas de `portfolio` sont couplées dans un seul `schema.prisma` ». Ce sub-project pose le premier jalon de cette trajectoire sans en anticiper les étapes.

## Acceptance criteria

### Scénario 1 : Validation du schéma
**GIVEN** le datasource déclarant `schemas = ["public", "freelance"]` et les 22 déclarations annotées
**WHEN** on exécute `prisma validate`
**THEN** la validation passe sans erreur
**AND** aucune déclaration ne fait l'objet d'un avertissement de `@@schema` manquant

### Scénario 2 : Migration limitée au déplacement
**GIVEN** le schéma modifié et la base à jour des migrations précédentes
**WHEN** on exécute `prisma migrate dev --create-only` puis qu'on lit le SQL généré
**THEN** il ne contient que la création du schema `freelance` et les trois `SET SCHEMA`
**AND** aucune instruction ne supprime ni ne recrée une table
**AND** aucune instruction ne touche les huit autres tables

### Scénario 3 : Données préservées par le déplacement
**GIVEN** la base de développement peuplée par le seed
**WHEN** on applique la migration
**THEN** `SELECT count(*) FROM "freelance"."Company"` retourne le même nombre qu'avant
**AND** une requête projet retourne toujours son entreprise, la relation `ClientMeta` → `Company` étant intacte

### Scénario 4 : Base recréée depuis zéro
**GIVEN** une base vide
**WHEN** on applique l'ensemble des migrations puis on régénère le client
**THEN** les 8 tables de la vitrine existent dans `public` et `Company` dans `freelance`
**AND** aucun autre schema applicatif n'a été créé

### Scénario 5 : Non-régression des accès existants
**GIVEN** le client régénéré
**WHEN** on exécute la suite d'intégration
**THEN** `src/server/queries/projects.integration.test.ts`, `legal.integration.test.ts` et `about.integration.test.ts` passent
**AND** le helper `resetDatabase()` tronque bien les neuf tables, `Company` étant désormais qualifiée

## Edge cases

- **Enums oubliés** : l'exigence de `@@schema` porte sur les enums autant que sur les modèles, alors qu'on pense spontanément aux seuls modèles. Les 13 enums sont la source d'échec la plus probable de ce sub-project
- **Migration recréant `Company` au lieu de la déplacer** : c'est le risque central. Prisma ne garantit pas d'émettre un `SET SCHEMA` pour un changement de `@@schema` ; un `DROP TABLE` suivi d'un `CREATE TABLE` viderait les entreprises en production. Lire le SQL généré, le réécrire à la main si nécessaire, et ne jamais appliquer sans l'avoir lu
- **Migration touchant une table qui ne bouge pas** : signal d'une annotation erronée, pas un effet de bord acceptable
- **Client non régénéré** : les tests échouent alors que la migration est correcte, avec un message qui n'oriente pas vers la cause réelle
- **`TRUNCATE` non qualifié** : `resetDatabase()` échouera avec « relation "Company" does not exist » si la ligne n'est pas mise à jour, et le message ne dira pas que c'est le `search_path` qui est en cause
- **Ordre du tableau `schemas`** : sans incidence fonctionnelle
- **Déploiement en production** : contrairement au reste du sub-project, le déplacement de `Company` touche des données réelles. Vérifier qu'une sauvegarde du sub-project `01` est présente avant d'appliquer, et relire le SQL de migration une dernière fois

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
- La vérification ne repose pas sur cette migration : `prisma validate` couvre l'exhaustivité des annotations, et la suite d'intégration couvre la non-régression des accès

### Décision : moment du déplacement de `Company` vers `freelance`

**Options envisagées :**
- **A. Déplacer `Company` ici, au `03`** : le schema `freelance` naît avec sa première table, la migration est écrite et vérifiée une fois, sur cinq lignes de données. Le sub-project cesse d'être une opération purement déclarative et touche des données de production.
- **B. Laisser `Company` dans `public` et la déplacer au `08`** : le CRUD entreprises la déplacerait en même temps qu'il l'édite. Mais le `08` porte déjà un écran, un formulaire, des Server Actions et leurs tests : y ajouter une migration de table déplace le risque au pire endroit.
- **C. Ne jamais la déplacer** : `Company` reste dans `public` et le schema `freelance` naît avec `Lead` ou `Invoice`. La table du CRM la plus liée au reste resterait alors du côté vitrine, et l'ADR-018 dirait une chose que la base ne fait pas.

**Choix : A**

**Rationale :**
- `Company` est une entité du CRM. La vitrine ne l'utilise que pour afficher le nom du client d'un projet, par une clé étrangère qui traverse les schemas sans difficulté
- Une migration de table est d'autant moins risquée que la table est petite : cinq entreprises aujourd'hui, un CRM alimenté plus tard
- Le sub-project est le seul de l'epic dont le périmètre est exclusivement structurel : c'est le bon endroit pour une opération de schema, et le mauvais pour la reporter
- Le principe « une structure se crée quand quelque chose la remplit » est respecté : `freelance` naît avec `Company` dedans, pas vide
