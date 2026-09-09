# Passage du schéma Prisma en multi-schema — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activer le multi-schema Prisma, rattacher les 22 déclarations existantes à leur schema, et déplacer `Company` dans `freelance`.

**Architecture:** Un champ `schemas` sur le datasource et un `@@schema(...)` sur chaque modèle et chaque enum. Pour 19 déclarations, l'annotation décrit un état déjà vrai et ne produit aucun diff. Pour `Company`, `CompanySize` et `CompanySector`, elle produit un déplacement réel, qui doit s'écrire en `ALTER ... SET SCHEMA` et jamais en recréation. C'est le seul endroit de ce sub-project où des données sont en jeu, et le SQL généré se lit avant de s'appliquer.

**Tech Stack:** Prisma 7, PostgreSQL 18, Vitest, Docker Compose, Just. Versions exactes : `docs/VERSIONS.md`.

**Spec:** `docs/superpowers/specs/espace-admin/03-multi-schema-prisma-design.md`

## Global Constraints

- `schemas = ["public", "freelance"]`. **Le schema `auth` n'est pas créé ici** : il appartient au sub-project `04`, qui l'ajoutera au datasource en même temps qu'il y déclarera les tables Better Auth.
- **Aucun `previewFeatures`** : `multiSchema` est stable en Prisma 7. Les guides antérieurs qui demandent `previewFeatures = ["multiSchema"]` sont obsolètes.
- Un `@@schema(...)` est obligatoire sur les **9 modèles ET les 13 enums**, soit 22 déclarations. Aucune valeur par défaut implicite n'existe.
- **Le déplacement de `Company` s'écrit en `ALTER ... SET SCHEMA`.** Une migration qui la supprimerait puis la recréerait perdrait les entreprises en production. Lire le SQL généré, le réécrire si nécessaire, ne jamais l'appliquer sans l'avoir lu.
- Depuis Prisma 7, `migrate dev` ne déclenche plus `prisma generate` : la régénération est explicite.
- `src/lib/prisma.ts` et `prisma.config.ts` restent inchangés, le client exposant toujours `prisma.company`. Aucun paramètre `search_path` n'est ajouté au `DATABASE_URL`.
- Aucun rôle PostgreSQL n'est créé : tous les schemas appartiennent au même processus Next.js. La règle est écrite dans l'ADR-018 et s'appliquera au premier service externe.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Liste exhaustive des 22 déclarations.**

| Schema | Déclarations |
|---|---|
| `public` | Modèles `Project`, `ClientMeta`, `Tag`, `ProjectTag`, `Address`, `LegalEntity`, `Publisher`, `DataProcessing` ; enums `ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `VatRegime`, `ProcessingKind`, `OutsideEuFramework`, `LegalBasis`, `DataCategory` |
| `freelance` | Modèle `Company` ; enums `CompanySize`, `CompanySector` |

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/client-setup.md`.

---

### Task 1 : Annoter le schéma et le valider

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Consomme : rien.
- Produit : un schéma en multi-schema validé, consommé par la Task 2.

- [ ] **Step 1: Vérifier que PostgreSQL est joignable**

```bash
just check
```

Si Docker ou PostgreSQL ne tournent pas :

```bash
just db
```

Cette recette démarre le conteneur Postgres puis applique les migrations existantes.

- [ ] **Step 2: Déclarer le schema sur le datasource**

Dans `prisma/schema.prisma`, remplacer le bloc datasource par :

```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["public", "freelance"]
}
```

Ne pas ajouter d'`url` : elle vient de `prisma.config.ts` depuis Prisma 7. Ne pas ajouter de `previewFeatures` au generator.

- [ ] **Step 3: Annoter les 13 enums**

Ajouter `@@schema(...)` en dernière ligne de chaque bloc enum. Exemple sur le premier :

```prisma
enum ProjectType {
  CLIENT
  PERSONAL

  @@schema("public")
}
```

`@@schema("public")` sur : `ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `VatRegime`, `ProcessingKind`, `OutsideEuFramework`, `LegalBasis`, `DataCategory`.

`@@schema("freelance")` sur `CompanySize` et `CompanySector`, qui n'ont d'autre consommateur que `Company` et la suivent.

Ce sont les enums qu'on oublie : l'attention se porte spontanément sur les modèles, et la validation échoue ensuite sur une déclaration à laquelle on n'avait pas pensé.

- [ ] **Step 4: Annoter les 9 modèles**

Ajouter `@@schema("public")` en dernière ligne de chaque bloc modèle, sauf `Company` qui prend `@@schema("freelance")` :

```prisma
model Project {
  id   String @id @default(uuid(7))
  slug String @unique
  // ... champs existants inchangés

  @@schema("public")
}
```

Pour `ProjectTag`, qui porte déjà des attributs de bloc, le `@@schema` s'**ajoute** à ceux-ci sans les remplacer :

```prisma
model ProjectTag {
  // ... champs existants inchangés

  @@id([projectId, tagId])
  @@index([projectId, displayOrder])
  @@schema("public")
}
```

`Company` est la seule à changer de camp :

```prisma
model Company {
  // ... champs existants inchangés

  @@schema("freelance")
}
```

Les deux relations qui la traversent, `ClientMeta` → `Company` et `Company` → `LegalEntity`, ne sont pas modifiées : Prisma gère les relations inter-schemas nativement.

- [ ] **Step 5: Valider le schéma**

```bash
pnpm prisma validate
```

Expected: validation réussie.

En cas d'échec, le message nomme la déclaration fautive, par exemple `Error validating model "Publisher": This model is missing an @@schema attribute`. Corriger et relancer jusqu'à ce que les 22 déclarations soient couvertes.

---

### Task 2 : Écrire la migration de déplacement et régénérer le client

**Files:**
- Create: `prisma/migrations/<timestamp>_multi_schema_freelance/migration.sql`

**Interfaces:**
- Consomme : le schéma validé de la Task 1.
- Produit : la migration appliquée et le client Prisma régénéré, consommés par la Task 3.

> Les 19 déclarations qui restent dans `public` ne produisent aucun diff : elles décrivent un état déjà vrai. Seule `Company` bouge, et c'est le seul endroit de ce sub-project où des données sont en jeu.

- [ ] **Step 1: Relever le nombre d'entreprises avant migration**

```sql
SELECT count(*) FROM "Company";
```

Noter le résultat, il sert de contrôle au Step 5.

- [ ] **Step 2: Demander à Prisma ce qu'il compte écrire**

```bash
pnpm prisma migrate dev --create-only --name multi_schema_freelance
```

`--create-only` est impératif : le SQL doit être lu avant d'être appliqué.

- [ ] **Step 3: Lire le SQL et le réécrire si nécessaire**

```bash
cat prisma/migrations/*_multi_schema_freelance/migration.sql
```

Le contenu attendu, et le seul acceptable :

```sql
CREATE SCHEMA IF NOT EXISTS "freelance";
ALTER TABLE "public"."Company" SET SCHEMA "freelance";
ALTER TYPE "public"."CompanySize" SET SCHEMA "freelance";
ALTER TYPE "public"."CompanySector" SET SCHEMA "freelance";
```

| Contenu généré | Interprétation | Action |
|---|---|---|
| Les quatre instructions ci-dessus | Attendu | Passer au Step 4 |
| `DROP TABLE` puis `CREATE TABLE "freelance"."Company"` | **Danger** | Remplacer intégralement le fichier par le SQL ci-dessus. Appliquer tel quel viderait les entreprises en production |
| Une instruction sur une table qui ne bouge pas | Annotation erronée | Ne pas appliquer, relire les 22 `@@schema` |

`SET SCHEMA` déplace la table avec ses données, ses index et ses contraintes. Les clés étrangères qui la visent depuis `public` suivent sans être touchées, PostgreSQL les résolvant par identifiant d'objet.

- [ ] **Step 4: Appliquer la migration**

```bash
pnpm prisma migrate dev
```

- [ ] **Step 5: Vérifier que les données ont suivi**

```sql
SELECT count(*) FROM "freelance"."Company";
```

Expected: le même nombre qu'au Step 1.

```sql
SELECT c.name FROM "public"."ClientMeta" cm JOIN "freelance"."Company" c ON c.id = cm."companyId" LIMIT 1;
```

Expected: une ligne. La relation inter-schemas fonctionne.

- [ ] **Step 6: Régénérer le client**

```bash
pnpm db:generate
```

Le Justfile n'expose pas de recette pour la génération : le script `db:generate` de `package.json` est le point d'entrée.

Depuis Prisma 7, `migrate dev` ne le fait plus. Sans cette étape, le client reste sur l'ancien schéma et la Task 3 échouera pour une raison sans rapport avec le changement.

- [ ] **Step 7: Vérifier que le typage tient**

```bash
just typecheck
```

Expected: aucune erreur. Le client régénéré expose les mêmes types qu'avant : `prisma.company` ne change pas de nom, un schema n'étant pas visible depuis l'API du client.

---

### Task 3 : Vérifier la non-régression sur une base recréée

**Files:**
- Modify: `src/lib/prisma-test-setup.ts`

**Interfaces:**
- Consomme : le client régénéré de la Task 2.
- Produit : la confirmation que le changement est neutre pour l'existant.

> Vérifier sur la base de développement courante ne suffit pas : elle porte déjà les tables, donc une erreur d'annotation pourrait passer inaperçue. La recréation depuis zéro est ce qui exerce réellement les migrations.

- [ ] **Step 1: Recréer la base de développement**

```bash
just db-reset
```

Cette recette demande confirmation, puis fait un drop, une recréation, applique les migrations et rejoue le seed.

Expected: toutes les migrations s'appliquent sans erreur.

- [ ] **Step 2: Vérifier l'emplacement des tables**

```bash
just db-studio
```

Ou directement en SQL sur la base :

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_name IN ('Project', 'Company', 'Tag')
ORDER BY table_name;
```

Expected: `Project` et `Tag` dans `public`, `Company` dans `freelance`.

- [ ] **Step 3: Vérifier qu'aucun schema applicatif superflu n'existe**

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg_%' AND schema_name <> 'information_schema';
```

Expected: `public` et `freelance`. La présence d'un schema `auth` signalerait que la contrainte de périmètre n'a pas été respectée : il appartient au sub-project `04`.

- [ ] **Step 4: Qualifier `Company` dans le helper de reset**

Dans `src/lib/prisma-test-setup.ts`, le `TRUNCATE` nomme neuf tables sans les qualifier, ce qui repose sur le `search_path` et ne trouve plus une table sortie de `public`. Seule la ligne `Company` change :

```
"Project", "ClientMeta", "freelance"."Company", "Tag", …
```

Les huit autres restent telles quelles : les qualifier toutes serait du bruit, `public` étant le `search_path`. Sans ce changement, `resetDatabase()` échoue sur « relation "Company" does not exist », message qui n'oriente pas vers la cause.

- [ ] **Step 5: Recréer la base de test et lancer la suite**

```bash
just db-test-reset
just test-integration
```

Expected: les tests d'intégration des queries (`projects`, `legal`, `about`) et ceux des routes (`api/assets`, `api/health`) passent.

Ces tests exercent le helper `resetDatabase()` et les queries qui joignent `Project` à `Company`. Leur réussite confirme que la relation inter-schemas fonctionne comme avant.

- [ ] **Step 6: Lancer la suite complète**

```bash
just test
```

Expected: tests unitaires et d'intégration verts.

- [ ] **Step 7: Mettre à jour `docs/ARCHITECTURE.md`**

§ Base de Données Principale annonce le découpage en schemas au post-MVP. Le réécrire au présent pour `public` et `freelance`, en gardant au futur `auth`, `dev` et `rag_public`.

- [ ] **Step 8: Compléter `docs/adrs/018-cloisonnement-donnees.md`**

Deux ajouts, sans toucher aux sections Options ni Décision :

1. Dans le bloc de la décision, `Company` rejoint la ligne du schema `freelance` et quitte celle de `public`, avec une note : le portfolio public ne la lit que par `ClientMeta`, pour afficher le nom du client d'un projet.
2. En Notes complémentaires, la règle des rôles PostgreSQL. L'ADR écrit aujourd'hui que « chaque service **peut** recevoir une chaîne de connexion restreinte à son schema » : c'est une possibilité, pas une consigne, et un schema sans rôle dédié n'est qu'un préfixe de table. Poser la cible : un rôle par processus, restreint à ses schemas (`portfolio_app` sur `public`, `auth` et `freelance` ; `chatbot_app` en lecture sur `public` et écriture sur `rag_public` ; `agent_os_app` sur `dev` ; `portfolio_migrate` propriétaire, réservé aux migrations), à créer avec le premier service externe. Et sa limite : à l'intérieur du monolithe, entre une page publique et une action admin, la séparation reste la discipline de code, puisque c'est le même processus lisant la même configuration d'environnement. C'est le prix du découpage acté en ADR-015, et il vaut d'être écrit plutôt que découvert.

- [ ] **Step 9: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
refactor(prisma): active le multi-schema et déplace Company dans freelance
```
