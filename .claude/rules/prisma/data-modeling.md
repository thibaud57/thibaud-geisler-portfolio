---
paths:
  - "prisma/schema.prisma"
  - "prisma/migrations/**"
---

# Prisma 7 — Modélisation des données

## À faire
- Utiliser **`@default(uuid(7))`** pour les IDs : UUID v7 est ordonné temporellement, meilleure localité B-tree que cuid/uuid v4
- Préférer **`TEXT`** à `VARCHAR(n)` et **`TIMESTAMPTZ`** à `TIMESTAMP`
- **Contenu bilingue** : pour un champ texte éditorial traduisible (titre, description, markdown long, nom de tag affiché), utiliser des **colonnes jumelées `<champ>Fr` + `<champ>En`** (`titleFr`/`titleEn`, `caseStudyMarkdownFr`/`caseStudyMarkdownEn`), et passer le résultat Prisma par `localizeProject` / `localizeTag` (`src/i18n/localize-content.ts`)
- Imbriquer les transactions quand il le faut : leurs rollbacks passent par des savepoints depuis Prisma 7.5.0
- Pour pgvector (post-MVP) : `Unsupported("vector")` dans le schéma, migration SQL manuelle (`CREATE EXTENSION IF NOT EXISTS vector`) et TypedSQL pour les requêtes

## À éviter
- Jumeler Fr/En les enums, les slugs, les noms de marque (`Company.name`) et les identifiants techniques : ils restent mono-valeur
- Attendre un support natif de pgvector : partiel en v7, sans GA, passer par `Unsupported`

## Gotchas
- pgvector 0.8.2 + PostgreSQL 18 : compatible, image Docker `pgvector/pgvector:pg18`
- CVE-2026-3172 : buffer overflow dans les index HNSW parallèles, corrigé en pgvector 0.8.2

## Exemples
```prisma
// ✅ UUID v7, contenu éditorial jumelé, slug mono-valeur
model Project {
  id      String @id @default(uuid(7))
  slug    String @unique
  titleFr String
  titleEn String
  @@schema("public")
}

// ❌ Slug traduit : deux URLs pour une même ressource
model Project {
  slugFr String
  slugEn String
}
```
