---
title: "PostgreSQL — Base de données relationnelle"
version: "18.3"
description: "Référence technique pour PostgreSQL 18 : types, indexes, transactions et Docker."
date: "2026-04-13"
keywords: ["postgresql", "database", "sql", "indexes", "jsonb"]
scope: ["docs"]
technologies: ["Prisma", "Docker"]
---

# Description

`PostgreSQL` 18 est la base de données du portfolio, conteneurisée via Docker avec volume persistant. La v18 active les data checksums par défaut, introduit `uuidv7()` natif (meilleur pour les index B-tree), les colonnes générées virtuelles par défaut, OLD/NEW dans RETURNING, et l'AIO pour les scans séquentiels. Accessible via Prisma 7 + `@prisma/adapter-pg`. Pgvector prévu post-MVP pour le RAG du chatbot.

---

# Concepts Clés

## Types essentiels

### Description

PostgreSQL offre des types riches : UUID (avec `uuidv7()` en v18), JSONB (binaire indexable), arrays, `timestamptz` (avec timezone), `text` (sans limite de longueur, préféré à `varchar`). Pour le portfolio : UUID v7 pour les IDs (ordre temporel), `text` pour les contenus, `text[]` pour les stacks, `timestamptz` pour les dates.

### Exemple

```sql
CREATE TABLE projects (
  id          UUID DEFAULT uuidv7() PRIMARY KEY,
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  stack       TEXT[] NOT NULL DEFAULT '{}',
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Points Importants

- `uuidv7()` (v18 natif) : UUID ordonné par timestamp → meilleure localité B-tree
- `TEXT` préféré à `VARCHAR(n)` (pas de limite arbitraire)
- `JSONB` indexable via GIN, préféré à `JSON` (binaire décomposé)
- `TIMESTAMPTZ` toujours (jamais `TIMESTAMP` sans timezone)
- `TEXT[]` natif pour les listes de strings (ex: stack techno)

---

## Index B-tree et GIN

### Description

B-tree est l'index par défaut : couvre égalité, plages, tri, `LIKE 'foo%'`. GIN sert pour JSONB, recherche full-text, tableaux. En v18, B-tree supporte le skip scan : un index `(a, b)` est utilisable pour `WHERE b = 42` même sans contrainte sur `a`.

### Exemple

```sql
-- B-tree pour les recherches fréquentes
CREATE INDEX idx_projects_slug ON projects (slug);
CREATE INDEX idx_projects_type_date ON projects (type, created_at DESC);

-- GIN sur JSONB pour le containment
CREATE INDEX idx_projects_metadata ON projects USING GIN (metadata);

-- GIN sur TEXT[] pour les recherches de tags
CREATE INDEX idx_projects_stack ON projects USING GIN (stack);

-- Partial index pour les projets actifs uniquement
CREATE INDEX idx_active_projects ON projects (created_at DESC) WHERE status = 'published';

-- Création en ligne (sans lock exclusif) : requis en prod
CREATE INDEX CONCURRENTLY idx_projects_title ON projects (title);
```

### Points Importants

- `CREATE INDEX CONCURRENTLY` obligatoire en prod (pas de lock exclusif)
- GIN pour JSONB avec opérateurs `@>`, `?`, `?|`
- `jsonb_path_ops` : variante GIN plus petite et rapide pour `@>` uniquement
- Partial index : réduit la taille pour des filtres sélectifs
- BRIN pour les tables append-only très grandes (logs)

---

## JSONB et opérateurs

### Description

`JSONB` stocke les documents JSON en format binaire décomposé. Plus lent à l'insertion, beaucoup plus rapide en lecture et indexable. Opérateurs clés : `->` (valeur jsonb), `->>` (valeur text), `@>` (containment), `?` (existence de clé).

### Exemple

```sql
-- Insertion
INSERT INTO projects (slug, title, description, metadata)
VALUES ('portfolio', 'Portfolio', 'Description', '{"tags": ["web", "ia"], "featured": true}');

-- Recherche par containment
SELECT * FROM projects WHERE metadata @> '{"featured": true}';

-- Accès à une clé
SELECT metadata->>'tags' FROM projects;

-- Existence d'une clé
SELECT * FROM projects WHERE metadata ? 'featured';

-- Mise à jour via subscript (v18+)
UPDATE projects SET metadata['status'] = '"archived"' WHERE id = $1;
```

### Points Importants

- `->` retourne du JSONB, `->>` retourne du TEXT
- `@>` pour containment, `?` pour existence de clé
- Index GIN avec `jsonb_path_ops` pour optimiser `@>`
- Préférer des colonnes typées pour les champs fréquemment interrogés (modèle hybride)

---

## Transactions et niveaux d'isolation

### Description

PostgreSQL supporte READ COMMITTED (défaut), REPEATABLE READ, SERIALIZABLE. SERIALIZABLE utilise Serializable Snapshot Isolation (non-bloquant, détection de prédicats). Pour les mutations critiques, préférer `SERIALIZABLE` avec retry sur erreur 40001.

### Exemple

```ts
// Via Prisma : transaction interactive
await prisma.$transaction(async (tx) => {
  const project = await tx.project.create({ data: { /* ... */ } })
  await tx.asset.createMany({ data: assets.map((a) => ({ ...a, projectId: project.id })) })
})

// Via Prisma : batch simple
await prisma.$transaction([
  prisma.project.delete({ where: { id } }),
  prisma.asset.deleteMany({ where: { projectId: id } }),
])
```

### Points Importants

- `READ COMMITTED` suffit pour 95% des cas (OLTP standard)
- `SERIALIZABLE` garantit l'équivalence à une exécution séquentielle
- Les séquences (`SERIAL`, `IDENTITY`) ne sont PAS rollbackées (IDs consommés)
- Minimiser la durée des transactions (pas de traitement applicatif long dans)

---

## Docker volume v18

### Description

En v18, l'image Docker `postgres:18` change la convention de volume. `PGDATA` passe de `/var/lib/postgresql/data` à `/var/lib/postgresql/18/docker`. Le volume déclaré passe de `/var/lib/postgresql/data` à `/var/lib/postgresql`. Changer `postgres:17` en `postgres:18` en réutilisant l'ancien mount cassera le conteneur.

### Exemple

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:18.3
    environment:
      POSTGRES_USER: portfolio
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: portfolio
    volumes:
      - pgdata:/var/lib/postgresql   # v18 : pas /var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U portfolio -d portfolio"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

### Points Importants

- Mount : `/var/lib/postgresql` (pas `/var/lib/postgresql/data`)
- Le répertoire de données réel est dans `pgdata/18/docker/`
- Permet de migrer entre versions via `pg_upgrade --link` sur le même volume parent
- `pg_isready` pour le healthcheck Docker Compose

---

# Commandes Clés

## psql et pg_dump

### Description

`psql` pour les sessions interactives ou l'exécution de scripts SQL, `pg_dump` pour les sauvegardes cohérentes. Essentiels pour le backup post-MVP et les diagnostics ponctuels.

### Syntaxe

```bash
# Connexion psql
psql -h localhost -U portfolio -d portfolio

# Exécution d'un script
psql -h localhost -U portfolio -d portfolio -f migrations/001_init.sql

# Export en format custom compressé
pg_dump -Fc -h localhost -U portfolio portfolio > backup.dump

# Restore depuis un dump custom
pg_restore -d portfolio_restored backup.dump

# Dump schema uniquement
pg_dump -s -h localhost portfolio > schema.sql
```

### Points Importants

- `pg_dump` est non-bloquant (transaction cohérente, pas de lock exclusif)
- Format `-Fc` (custom) recommandé : compressé + restore flexible
- `\dt` liste les tables, `\d projects` décrit la table `projects`
- `\q` pour quitter, `\c dbname` pour changer de base

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser `uuidv7()` pour les clés primaires (natif v18)
- Préférer `TEXT` à `VARCHAR(n)`, `TIMESTAMPTZ` à `TIMESTAMP`
- Créer les index en prod avec `CREATE INDEX CONCURRENTLY`
- Configurer le mount Docker sur `/var/lib/postgresql` (v18)
- Activer les data checksums (défaut v18)
- Utiliser `pg_isready` pour les healthchecks Docker Compose
- Sauvegarder régulièrement via `pg_dump -Fc` vers Cloudflare R2 post-MVP

## ❌ Anti-Patterns

- Ne pas utiliser `VARCHAR(n)` sans raison (pas de gain, limite arbitraire)
- Ne pas stocker des booléens en `INT` ou `TEXT`
- Ne pas créer d'index sans `CONCURRENTLY` en production
- Ne pas monter `/var/lib/postgresql/data` avec `postgres:18` (cassure v18)
- Ne pas utiliser MD5 pour les mots de passe (migrer vers SCRAM-SHA-256)

---

# 🔗 Ressources

## Documentation Officielle

- [PostgreSQL 18 : Documentation](https://www.postgresql.org/docs/18/)
- [Release notes 18](https://www.postgresql.org/docs/current/release-18.html)
- [JSON Types](https://www.postgresql.org/docs/current/datatype-json.html)

## Ressources Complémentaires

- [Docker Hub : postgres](https://hub.docker.com/_/postgres/)
- [Crunchy Data : Checksums v18](https://www.crunchydata.com/blog/postgres-18-new-default-for-data-checksums-and-how-to-deal-with-upgrades)
