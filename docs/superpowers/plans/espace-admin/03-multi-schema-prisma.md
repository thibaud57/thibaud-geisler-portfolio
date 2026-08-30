# Passage du schéma Prisma en multi-schema — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Activer le multi-schema Prisma et rattacher explicitement les 22 déclarations existantes au schema `public`.

**Architecture:** Un champ `schemas` sur le datasource et un `@@schema("public")` sur chaque modèle et chaque enum. L'annotation déclare un état déjà vrai — les tables vivent déjà dans `public` — donc aucune migration n'est attendue. Cette absence se vérifie en lisant ce que Prisma produit, elle ne se présume pas.

**Tech Stack:** Prisma 7.10, PostgreSQL 18, Vitest, Docker Compose, Just.

**Spec:** `docs/superpowers/specs/espace-admin/03-multi-schema-prisma-design.md`

## Global Constraints

- `schemas = ["public"]` uniquement. **Le schema `auth` n'est pas créé ici** : il appartient au sub-project `04`, qui l'ajoutera au datasource en même temps qu'il y déclarera les tables Better Auth.
- **Aucun `previewFeatures`** : `multiSchema` est stable depuis Prisma 6.13.0 et le projet est en 7.10. Les guides antérieurs qui demandent `previewFeatures = ["multiSchema"]` sont obsolètes.
- `@@schema("public")` est obligatoire sur les **9 modèles ET les 13 enums**, soit 22 déclarations. Aucune valeur par défaut implicite n'existe.
- Depuis Prisma 7, `migrate dev` ne déclenche plus `prisma generate` : la régénération est explicite.
- `src/lib/prisma.ts`, `prisma.config.ts` et `src/lib/prisma-test-setup.ts` restent inchangés. Aucun paramètre `search_path` n'est ajouté au `DATABASE_URL`.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Liste exhaustive des 22 déclarations.** Modèles : `Project`, `ClientMeta`, `Company`, `Tag`, `ProjectTag`, `Address`, `LegalEntity`, `Publisher`, `DataProcessing`. Enums : `ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `CompanySize`, `CompanySector`, `VatRegime`, `ProcessingKind`, `OutsideEuFramework`, `LegalBasis`, `DataCategory`.

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

Le diagnostic de démarrage a signalé Docker et PostgreSQL comme indisponibles. Si c'est encore le cas :

```bash
just db
```

Cette recette démarre le conteneur Postgres puis applique les migrations existantes.

- [ ] **Step 2: Déclarer le schema sur le datasource**

Dans `prisma/schema.prisma`, remplacer le bloc datasource par :

```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["public"]
}
```

Ne pas ajouter d'`url` : elle vient de `prisma.config.ts` depuis Prisma 7. Ne pas ajouter de `previewFeatures` au generator.

- [ ] **Step 3: Annoter les 13 enums**

Ajouter `@@schema("public")` en dernière ligne de chaque bloc enum. Exemple sur le premier :

```prisma
enum ProjectType {
  CLIENT
  PERSONAL

  @@schema("public")
}
```

À répéter sur : `ProjectType`, `ProjectStatus`, `ProjectFormat`, `ContractStatus`, `WorkMode`, `TagKind`, `CompanySize`, `CompanySector`, `VatRegime`, `ProcessingKind`, `OutsideEuFramework`, `LegalBasis`, `DataCategory`.

Ce sont les enums qu'on oublie : l'attention se porte spontanément sur les modèles, et la validation échoue ensuite sur une déclaration à laquelle on n'avait pas pensé.

- [ ] **Step 4: Annoter les 9 modèles**

Ajouter `@@schema("public")` en dernière ligne de chaque bloc modèle :

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

- [ ] **Step 5: Valider le schéma**

```bash
pnpm prisma validate
```

Expected: validation réussie.

En cas d'échec, le message nomme la déclaration fautive, par exemple `Error validating model "Publisher": This model is missing an @@schema attribute`. Corriger et relancer jusqu'à ce que les 22 déclarations soient couvertes.

---

### Task 2 : Constater l'absence de diff et régénérer le client

**Files:** aucun fichier supplémentaire, sauf si Prisma génère une migration — auquel cas elle est à examiner avant toute décision.

**Interfaces:**
- Consomme : le schéma validé de la Task 1.
- Produit : le client Prisma régénéré, consommé par la Task 3.

> L'annotation ne déplace aucune table : elle déclare que les tables sont dans `public`, ce qui est déjà le cas. Aucune migration n'est donc attendue. Mais c'est exactement le genre d'attente qu'il faut vérifier plutôt que supposer.

- [ ] **Step 1: Demander à Prisma ce qu'il compte écrire**

```bash
pnpm prisma migrate dev --create-only --name multi_schema
```

Expected: Prisma annonce qu'aucun changement de schéma n'est détecté et ne crée aucun fichier.

- [ ] **Step 2: Si un fichier de migration a été créé, lire son SQL**

```bash
cat prisma/migrations/*_multi_schema/migration.sql
```

Trois cas :

| Contenu | Interprétation | Action |
|---|---|---|
| Fichier absent ou SQL vide | Attendu | Supprimer le dossier s'il est vide, passer au Step 3 |
| Uniquement `CREATE SCHEMA` | Inattendu ici, `public` existant déjà | Vérifier qu'aucun schema autre que `public` n'est déclaré au datasource |
| `ALTER TABLE`, `DROP`, ou recréation de table | **Anomalie** | Ne pas appliquer. Une annotation est erronée : relire les 22 `@@schema`, tous doivent valoir `public` |

Le troisième cas est le seul vraiment dangereux, et c'est précisément pour lui que cette étape existe.

- [ ] **Step 3: Régénérer le client**

```bash
pnpm db:generate
```

Le Justfile n'expose pas de recette pour la génération : le script `db:generate` de `package.json` est le point d'entrée.

Depuis Prisma 7, `migrate dev` ne le fait plus. Sans cette étape, le client reste sur l'ancien schéma et la Task 3 échouera pour une raison sans rapport avec le changement.

- [ ] **Step 4: Vérifier que le typage tient**

```bash
just typecheck
```

Expected: aucune erreur. Le client régénéré expose les mêmes types qu'avant, l'annotation ne modifiant pas la forme des modèles.

---

### Task 3 : Vérifier la non-régression sur une base recréée

**Files:** aucun fichier du dépôt.

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

Expected: les trois tables sont dans le schema `public`.

- [ ] **Step 3: Vérifier qu'aucun schema applicatif superflu n'existe**

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT LIKE 'pg_%' AND schema_name <> 'information_schema';
```

Expected: `public` seul. La présence d'un schema `auth` signalerait que la contrainte de périmètre n'a pas été respectée — il appartient au sub-project `04`.

- [ ] **Step 4: Recréer la base de test et lancer la suite**

```bash
just db-test-reset
just test-integration
```

Expected: `projects.integration.test.ts`, `legal.integration.test.ts`, `about.integration.test.ts` et `route.integration.test.ts` passent.

Ces tests exercent le helper `resetDatabase()`, dont le `TRUNCATE` n'est pas qualifié. Leur réussite confirme que le `search_path` résout toujours les tables correctement, et qu'il n'y avait donc pas lieu de modifier ce helper.

- [ ] **Step 5: Lancer la suite complète**

```bash
just test
```

Expected: tests unitaires et d'intégration verts.

- [ ] **Step 6: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
refactor(prisma): active le multi-schema et rattache les modèles à public
```

Le type `refactor` est adapté : le comportement de l'application est inchangé, seule la déclaration du schéma évolue.
