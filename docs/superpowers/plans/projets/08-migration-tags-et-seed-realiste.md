# Plan d'implémentation: `08-migration-tags-et-seed-realiste`

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter `Tag.displayOrder` et `Project.deliverablesCount` au schema Prisma, étoffer le seed tags (elasticsearch in, vercel out, ordre custom), définir le `deliverablesCount` par projet pour refléter la réalité du parcours, et mettre à jour les labels stats `/a-propos` ("clients accompagnés", chiffre projets via SUM).

**Architecture:** Migration Prisma combinée additive non-breaking (defaults 0 et 1). Update query `findPublishedTags` (sort multi-clés) + `countMissionsDelivered` (aggregate `_sum`). Renommage `countClientsServed` → `countClientsSupported` pour alignement label. Reseed complet via `pnpm prisma db seed` (wipe + recreate).

**Tech Stack:** Prisma 7, PostgreSQL 18, Next.js 16 (cache invalidation auto via reseed), next-intl 4.

**Spec de référence:** [`docs/superpowers/specs/projets/08-migration-tags-et-seed-realiste-design.md`](../../specs/projets/08-migration-tags-et-seed-realiste-design.md).

**Rappels projet:**
- `tdd_scope: none` → pas de tests à écrire (no-lib-test : migration de schéma + seed + plumbing query).
- Discipline commit CLAUDE.md : **aucun commit intermédiaire**. Proposer au user un commit final unique après Task 7 verte.
- Convention seed Prisma 7 : `pnpm prisma migrate dev` ne lance plus `prisma generate` automatiquement, lancer manuellement (cf. `.claude/rules/prisma/schema-migrations.md`).
- La DB doit être up pour `migrate dev` et `db seed` (`just docker-up` si pas déjà fait).
- `displayOrder` Tag en incréments de 1 (0, 1, 2, ...) pour lisibilité.
- `deliverablesCount` Project en valeur réelle (1 par défaut, override manuel selon mission).

---

## Décisions actées (toutes Open questions résolues)

- ✅ `vercel` → supprimer du seed
- ✅ `local`, `piagent`, `rag`, `spring`, `spring-boot` → conservés
- ✅ Positions actées (cf. spec § Open questions et Step 3.4 / Step 4.2 ci-dessous)
- ✅ Label "clients servis" → "clients accompagnés" / "clients supported"
- ✅ Compteur "projets clients livrés" reste, chiffre = SUM(deliverablesCount)
- ✅ Pas d'ajout de projets (option a)
- ✅ `php` (LANGUAGE) en queue (`displayOrder: 4`)
- ✅ `elasticsearch` à insérer entre `datadog` (5) et `sentry` (7), donc `elasticsearch: 6`
- ✅ Linker `elasticsearch` à `webapp-gestion-sinistres.tagSlugs`
- ✅ NE PAS ajouter `mcp` à `referent-ia-automatisation.tagSlugs` (laisser intact)
- ✅ `deliverablesCount` pour `referent-ia-automatisation` : `0` (conseil, rien en prod)

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `prisma/schema.prisma` | Ajouter `Tag.displayOrder` + `Project.deliverablesCount` | Modifier |
| `prisma/migrations/<timestamp>_add_tag_display_order_and_project_deliverables/migration.sql` | Migration combinée | Créer (via CLI) |
| `prisma/seed-data/tags.ts` | Type + entries + `displayOrder` + elasticsearch + vercel removal | Modifier |
| `prisma/seed-data/projects.ts` | Type + `deliverablesCount` sur chaque projet | Modifier |
| `prisma/seed.ts` | Passer `displayOrder` et `deliverablesCount` | Modifier |
| `src/server/queries/about.ts` | orderBy displayOrder + aggregate _sum + rename countClientsSupported | Modifier |
| `src/app/[locale]/(public)/a-propos/page.tsx` | Update import si rename de fonction | Modifier (1 ligne) |
| `messages/fr.json` | Label `clients accompagnés` | Modifier |
| `messages/en.json` | Label `clients supported` | Modifier |

---

## Task 1 : Migration Prisma combinée (`Tag.displayOrder` + `Project.deliverablesCount`)

**Files:**
- Modify: `prisma/schema.prisma`
- Create (via CLI): `prisma/migrations/<timestamp>_add_tag_display_order_and_project_deliverables/migration.sql`

- [ ] **Step 1.1 : Modifier `prisma/schema.prisma`**

Ajouter `displayOrder Int @default(0)` au model `Tag` :
```prisma
model Tag {
  id           String       @id @default(uuid(7))
  slug         String       @unique
  nameFr       String
  nameEn       String
  kind         TagKind
  icon         String?
  displayOrder Int          @default(0)
  projects     ProjectTag[]
  createdAt    DateTime     @default(now()) @db.Timestamptz
  updatedAt    DateTime     @updatedAt @db.Timestamptz
}
```

Ajouter `deliverablesCount Int @default(1)` au model `Project` (après `displayOrder` existant) :
```prisma
model Project {
  // ... champs existants
  displayOrder        Int             @default(0)
  deliverablesCount   Int             @default(1)
  tags                ProjectTag[]
  // ... reste
}
```

- [ ] **Step 1.2 : Lancer la migration**

Commande : `pnpm prisma migrate dev --name add_tag_display_order_and_project_deliverables`

Attendu : SQL `ALTER TABLE "Tag" ADD COLUMN "displayOrder" INTEGER NOT NULL DEFAULT 0` + `ALTER TABLE "Project" ADD COLUMN "deliverablesCount" INTEGER NOT NULL DEFAULT 1`. Tous les rows existants ont les defaults.

- [ ] **Step 1.3 : Régénérer le client Prisma**

Commande : `pnpm prisma generate`

Attendu : types `Tag` et `Project` mis à jour avec les nouveaux champs.

- [ ] **Step 1.4 : Typecheck**

Commande : `pnpm exec tsc --noEmit`

Attendu : aucune erreur (sauf si fichiers consommateurs n'ont pas encore été mis à jour, ce qui est normal à ce stade, voir Tasks 2-3).

---

## Task 2 : Update queries `about.ts`

**Files:**
- Modify: `src/server/queries/about.ts`
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx` (import si rename)

- [ ] **Step 2.1 : Update `findPublishedTags`**

Remplacer :
```typescript
orderBy: { slug: 'asc' },
```

Par :
```typescript
orderBy: [{ displayOrder: 'asc' }, { slug: 'asc' }],
```

- [ ] **Step 2.2 : Update `countMissionsDelivered`**

Remplacer le `prisma.project.count(...)` par un `aggregate _sum` :

```typescript
export async function countMissionsDelivered(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  const result = await prisma.project.aggregate({
    _sum: { deliverablesCount: true },
    where: {
      status: 'PUBLISHED',
      type: 'CLIENT',
      endedAt: { not: null },
    },
  })
  return result._sum.deliverablesCount ?? 0
}
```

Notes :
- `_sum.deliverablesCount` peut être `null` si aucun projet ne match → fallback `?? 0` requis.
- Le label affiché côté UI reste `projets clients livrés`, mais le chiffre = somme des `deliverablesCount`.

- [ ] **Step 2.3 : Renommer `countClientsServed` → `countClientsSupported`**

Renommer la fonction dans `src/server/queries/about.ts` (1 occurrence).

- [ ] **Step 2.4 : Update import dans `page.tsx`**

Remplacer `countClientsServed` par `countClientsSupported` dans :
- L'import depuis `@/server/queries/about`
- L'appel dans `Promise.all` de `StatsAsync`

- [ ] **Step 2.5 : Typecheck**

Commande : `pnpm exec tsc --noEmit`

Attendu : aucune erreur. Si erreurs ailleurs (autres consommateurs de `countClientsServed`), grep pour identifier et corriger.

---

## Task 3 : Curation seed tags + ajout `elasticsearch` + `displayOrder`

**Files:**
- Modify: `prisma/seed-data/tags.ts`

- [ ] **Step 3.1 : Étendre le type `TagInput`**

Ajouter `displayOrder: number` :
```typescript
export type TagInput = {
  slug: string
  nameFr: string
  nameEn: string
  kind: TagKind
  icon: string | null
  displayOrder: number
}
```

- [ ] **Step 3.2 : Supprimer `vercel`**

Retirer l'entrée `vercel` du tableau `tags`. Vérifier qu'aucun projet ne le référence dans `tagSlugs` (`grep "'vercel'" prisma/seed-data/projects.ts`). S'il est référencé, le retirer aussi.

- [ ] **Step 3.3 : Ajouter `elasticsearch` (INFRA)**

Insérer dans la section INFRA, position 6 (entre `datadog` et `sentry`) :
```typescript
{ slug: 'elasticsearch', nameFr: 'Elasticsearch', nameEn: 'Elasticsearch', kind: 'INFRA', icon: 'simple-icons:elasticsearch', displayOrder: 6 },
```

Aussi : ajouter `'elasticsearch'` dans `webapp-gestion-sinistres.tagSlugs` (`prisma/seed-data/projects.ts`), pour qu'il apparaisse sur /a-propos via la query `findPublishedTags`.

- [ ] **Step 3.4 : Définir `displayOrder` sur tous les tags (incréments de 1)**

Ordre custom user, par TagKind. Valeurs proposées :

**AI** (5 tags) :
- `n8n` : 0
- `anthropic` (Claude) : 1
- `openai` (ChatGPT) : 2
- `perplexity` : 3
- `piagent` : 4 (en queue)

**EXPERTISE** (8 tags) :
- `agents-ia` : 0
- `automatisation` : 1
- `rag` : 2 (avant mcp)
- `mcp` : 3
- `skills` : 4
- `scraping` : 5
- `anonymisation` : 6
- `anti-bot` : 7

**LANGUAGE** (5 tags) :
- `typescript` : 0
- `scala` : 1
- `python` : 2
- `java` : 3
- `php` : 4 (en queue ; future feature de masquage envisagée pour `/a-propos`, hors scope ici)

**FRAMEWORK** (12 tags) :
- `angular` : 0
- `play` : 1
- `nodejs` : 2
- `express` : 3
- `nestjs` : 4
- `react` : 5
- `nextjs` : 6
- `fastapi` : 7
- `spring` : 8
- `spring-boot` : 9
- `android` : 10
- `odoo` : 11

**DATABASE** (2 tags) :
- `mongodb` : 0
- `postgresql` : 1

**INFRA** (10 tags après ajout elasticsearch + suppression vercel) :
- `kafka` : 0
- `docker` : 1
- `kubernetes` : 2
- `dokploy` : 3
- `github-actions` : 4
- `datadog` : 5
- `elasticsearch` : 6 (inséré entre Datadog et Sentry)
- `sentry` : 7
- `sonarqube` : 8
- `local` : 9 (en queue ; future feature de masquage envisagée pour `/a-propos`, hors scope ici)

- [ ] **Step 3.5 : Vérifier la cohérence du seed**

Tous les tags ont un `displayOrder` numérique. Pas de doublon `(kind, displayOrder)` au sein d'un même TagKind.

---

## Task 4 : Ajouter `deliverablesCount` sur chaque projet

**Files:**
- Modify: `prisma/seed-data/projects.ts`

- [ ] **Step 4.1 : Étendre le type `ProjectInput`**

Ajouter `deliverablesCount: number` :
```typescript
export type ProjectInput = {
  // ... champs existants
  displayOrder: number
  deliverablesCount: number
  tagSlugs: string[]
  // ...
}
```

- [ ] **Step 4.2 : Définir `deliverablesCount` sur chaque projet existant**

Valeurs par défaut :

| Project slug | `deliverablesCount` | Justification |
|--------------|---------------------|---------------|
| `webapp-gestion-sinistres` | **3** | Mission Foyer = 3 applications distinctes |
| `referent-ia-automatisation` | **0** | Mission de conseil chez Wanted Design, rien en prod à ce jour |
| `saas-gestion-paie` | **1** | Mission Paysystem = 1 livrable |
| `erp-odoo-android` | **2** | Mission Cloudsmart = ERP Odoo + App Android |
| `portfolio` | **1** | 1 livrable |
| `techno-scraper` | **1** | 1 livrable |
| `crm-leads-n8n` | **1** | 1 livrable |
| `flight-search-api` | **1** | 1 livrable |
| `skill-prof` | **1** | 1 livrable |

- [ ] **Step 4.3 : Mettre à jour les imports dans `prisma/seed.ts`**

Vérifier que le passage des nouveaux champs (`Tag.displayOrder`, `Project.deliverablesCount`) au `prisma.tag.create` et `prisma.project.create` est bien fait. Si seed.ts utilise un spread du `TagInput` / `ProjectInput`, c'est automatique. Sinon, ajouter explicitement.

---

## Task 5 : Update labels i18n

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 5.1 : `messages/fr.json`**

Remplacer :
```json
"clients": { "label": "clients servis" }
```

Par :
```json
"clients": { "label": "clients accompagnés" }
```

- [ ] **Step 5.2 : `messages/en.json`**

Remplacer :
```json
"clients": { "label": "clients served" }
```

Par :
```json
"clients": { "label": "clients supported" }
```

- [ ] **Step 5.3 : Vérifier validité JSON**

Commande : `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`

---

## Task 6 : Reseed + smoke test

- [ ] **Step 6.1 : Lancer le seed**

Commande : `pnpm prisma db seed`

Attendu : wipe + recreate avec les nouvelles valeurs (tags + displayOrder + deliverablesCount).

- [ ] **Step 6.2 : Smoke test `/a-propos`**

1. `just dev` (port 3000)
2. Ouvrir `http://localhost:3000/a-propos`
3. Stack technique : vérifier l'ordre custom (n8n avant Claude, RAG avant MCP, Spring/Spring-Boot avant Android, etc.)
4. Stats : vérifier compteur "**6** projets clients livrés" (3 + 1 + 2 = 6)
5. Stats : vérifier label "**clients accompagnés**" au lieu de "clients servis"
6. Console DevTools : aucune erreur, pas de hydration mismatch

- [ ] **Step 6.3 : Smoke test `/en/a-propos`**

1. Ouvrir `http://localhost:3000/en/a-propos`
2. Vérifier label "**clients supported**" en EN
3. Compteurs identiques (chiffres ne dépendent pas de la locale)

- [ ] **Step 6.4 : Smoke test `/projets`**

1. Ouvrir `http://localhost:3000/projets`
2. Vérifier que les cards des projets sont identiques à avant (pas de duplication, pas de disparition)
3. Vérifier que `vercel` n'apparaît plus dans les badges des cards (s'il était présent)

- [ ] **Step 6.5 : Arrêter le serveur dev**

Commande : `just stop`

---

## Task 7 : Verification finale (lint + typecheck + build)

- [ ] **Step 7.1 : Lint**

Commande : `just lint`

Attendu : 0 errors.

- [ ] **Step 7.2 : Typecheck**

Commande : `just typecheck`

Attendu : 0 erreur.

- [ ] **Step 7.3 : Build**

Commande : `just build`

Attendu : build OK, route `/[locale]/a-propos` toujours en `◐ Partial Prerender` (la migration ne change pas la stratégie de cache).

- [ ] **Step 7.4 : Proposer le commit au user (discipline CLAUDE.md)**

Ne PAS commit automatiquement. Demander :

> "Verification complète OK (lint + typecheck + build + smoke FR/EN). Je peux committer ? Message suggéré : `feat(projets): Tag.displayOrder + Project.deliverablesCount + curation tags + label clients accompagnés`."

Attendre la validation explicite.

---

## Status du spec

La mise à jour du `status` du spec de `draft` vers `implemented` est déléguée au workflow parent `/implement-subproject`.

---

## Self-review

**Spec coverage** :
- Scénario 1 (migration appliquée) → Task 1
- Scénario 2 (reseed avec valeurs métier) → Task 3 + Task 4 + Task 6.1
- Scénario 3 (ordre custom /a-propos) → Task 2.1 + Task 3.4 + smoke 6.2
- Scénario 4 (compteurs mis à jour) → Task 2.2 + Task 4 + Task 5 + smoke 6.2
- Scénario 5 (signature query préservée) → Task 2.1 (pas de changement de signature)
- Edge cases couverts par l'architecture (`?? 0` fallback, defaults DB, filtre PUBLISHED).

**Placeholder scan** : seul `<TBD user>` dans Task 4.2 pour `referent-ia-automatisation.deliverablesCount` (Open question). Aucun TBD ailleurs.

**Type consistency** :
- `TagInput` (`tags.ts`) ↔ `prisma.tag.create({ data: ... })` (`seed.ts`) : ajout de `displayOrder: number` cohérent.
- `ProjectInput` (`projects.ts`) ↔ `prisma.project.create({ data: ... })` (`seed.ts`) : ajout de `deliverablesCount: number` cohérent.
- `Tag` / `Project` (Prisma generated) ↔ queries : signatures préservées sauf renommage `countClientsServed` → `countClientsSupported`.
- `findPublishedTags` return : `LocalizedTag<Tag>[]` inchangé.

Aucune divergence détectée.

---

## Execution Handoff

Plan sauvegardé dans [`docs/superpowers/plans/projets/08-migration-tags-et-seed-realiste.md`](./08-migration-tags-et-seed-realiste.md).

**Préalable obligatoire** : résoudre les 4 Open questions restantes avec le user (cf. spec § Open questions et top de ce plan) AVANT de lancer `/implement-subproject projets 08`.

Une fois ces points tranchés, l'implémentation peut démarrer via :
1. **Subagent-Driven (recommandé)**, `superpowers:subagent-driven-development` dispatch un subagent frais par task, review entre tasks. Aligne avec la commande projet `/implement-subproject` qui intègre `/simplify` et `code/code-reviewer` comme gates de sortie.
2. **Inline Execution**, `superpowers:executing-plans`, batch avec checkpoints dans la session courante.
