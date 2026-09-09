# Bascule du stockage des assets vers Cloudflare R2 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Servir les assets depuis le bucket R2 au lieu du volume Docker, sans changer une seule URL publique.

**Architecture:** La validation de chemin reste inchangée et son résultat devient une clé d'objet. La route remplace `readFile` par un `GetObjectCommand` dont le corps est relayé en flux. `resolveAssetPath` est supprimée, sa garde anti-remontée n'ayant plus d'objet sur une clé d'objet.

**Tech Stack:** `@aws-sdk/client-s3`, Cloudflare R2, Next.js 16 Route Handlers, Vitest.

**Spec:** `docs/superpowers/specs/espace-admin/09-stockage-assets-r2-design.md`

## Global Constraints

- **`/api/assets/[...path]` reste le seul point d'accès public** et le bucket demeure privé. Les **clés changent** en revanche : l'arborescence est réorganisée pendant la migration, les projets passant sous leur propre slug et les logos d'entreprise dans `portfolio-admin`. C'est le seul moment de l'epic où cela ne coûte rien, tous les fichiers changeant déjà d'adresse.
- **`requestChecksumCalculation: 'WHEN_REQUIRED'` sur le client S3.** Les versions récentes de `@aws-sdk/client-s3` calculent par défaut un checksum CRC32 que R2 ne supportait pas, ce qui faisait échouer `PutObject` et `UploadPart` avec un message peu parlant. Cloudflare a depuis annoncé l'incident comme résolu de son côté : le réglage n'est donc peut-être plus indispensable, mais il reste sans effet de bord et couvre le cas où la compatibilité régresserait. Le garder, et ne le retirer qu'après avoir constaté qu'un upload passe sans lui.
- `NoSuchKey` doit être traduit en 404. Sans cela, chaque asset manquant produit un 500 et pollue le monitoring.
- Aucune abstraction de stockage : une seule implémentation, écrite directement. La rule le pose déjà, « pas d'interface `AssetStorage` prématurée (YAGNI) ».
- R2 est utilisé en développement comme en production, mais sur des **buckets distincts** : `portfolio-assets` en production, `portfolio-assets-dev` en local, chacun avec son propre token. Même principe que la base de développement face à celle de production.
- **Ne retirer le volume qu'après vérification** : tant que la migration n'est pas constatée, il porte la seule copie des fichiers.
- Les en-têtes `Cache-Control` sont conservés à l'identique, distinction développement et production comprise.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Références :** `docs/knowledges/cloudflare-r2.md` (endpoint, classes d'opérations, limites), `.claude/rules/nextjs/assets.md`.

---

### Task 1 : Client R2 et variables d'environnement

**Files:**
- Modify: `package.json`
- Create: `src/lib/r2.ts`
- Modify: `src/env.ts` (quatre variables R2 ajoutées, `ASSETS_PATH` retirée)

> **Prérequis local : la CLI `aws`** (`winget install Amazon.AWSCLI` ou équivalent). Les Tasks 2 et 6 s'en servent pour lister, copier et déplacer des objets avec un token S3 donné, ce que Wrangler ne sait pas faire. Sur le VPS, la Task 2 passe par le conteneur `amazon/aws-cli`, rien n'y est installé.
- Modify: `.env.example`

**Interfaces:**
- Consomme : le bucket et le token créés au sub-project `01`.
- Produit : `r2` (client S3) et `R2_BUCKET`, consommés par la Task 3.

- [ ] **Step 1: Installer le SDK**

```bash
pnpm add @aws-sdk/client-s3
```

- [ ] **Step 2: Déclarer les variables**

Dans `src/env.ts`, section `server` :

```typescript
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET: z.string().min(1),
```

et dans `runtimeEnv`, en miroir :

```typescript
    R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET: process.env.R2_BUCKET,
```

**`ASSETS_PATH` n'est pas dans `src/env.ts`**, rien n'y est donc à retirer : elle est lue en direct dans `src/server/config/assets.ts`, et c'est cette lecture qui disparaît avec `resolveAssetPath` à la Task 3. Ses seules autres occurrences sont deux fichiers de test, `route.integration.test.ts` et `assets.test.ts`, qui la posent et la restaurent eux-mêmes : ils tombent avec la route de disque.

Ces variables sont **requises** et non optionnelles : sans elles, plus aucun asset ne peut être servi. `src/env.ts` étant fail-fast, l'application refusera de démarrer plutôt que de servir un site aux images manquantes.

- [ ] **Step 3: Documenter dans `.env.example`**

```bash
# Cloudflare R2 (assets — bucket privé, servi via /api/assets/[...path])
R2_ACCOUNT_ID=                      # Identifiant de compte Cloudflare
R2_ACCESS_KEY_ID=                   # Token Object Read & Write restreint au bucket de CET environnement
R2_SECRET_ACCESS_KEY=               # Secret du même token (affiché une seule fois à la création)
R2_BUCKET=                          # Dev : portfolio-assets-dev | Prod : portfolio-assets
```

Le bucket **et** le token diffèrent selon l'environnement. Un token local qui verrait le bucket de production annulerait la séparation : une variable `R2_BUCKET` mal renseignée suffirait à écrire au mauvais endroit.

- [ ] **Step 4: Écrire le client**

```typescript
import 'server-only'
import { S3Client } from '@aws-sdk/client-s3'

import { env } from '@/env'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
})

export const R2_BUCKET = env.R2_BUCKET
```

Trois points sur lesquels ne pas improviser. L'endpoint porte le segment `.eu.` parce que les buckets ont été créés en juridiction européenne au sub-project `01` : sans lui, le bucket est introuvable. `region: 'auto'` est la valeur attendue par R2. Et `requestChecksumCalculation: 'WHEN_REQUIRED'` est ce qui évite l'échec sur checksum CRC32.

`'server-only'` empêche tout import accidentel depuis un Client Component, ce fichier portant des credentials.

- [ ] **Step 5: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur. Un échec sur `requestChecksumCalculation` signalerait une version de SDK antérieure à son introduction.

---

### Task 2 : Migrer les fichiers existants et réorganiser l'arborescence

**Files:**
- Modify: `prisma/seed-data/projects.ts`
- Modify: `prisma/seed-data/companies.ts`
- Modify: les markdown de `prisma/seed-data/case-studies/` citant une capture
- Create: `prisma/migrations/<timestamp>_asset_keys/migration.sql`

**Interfaces:**
- Consomme : les buckets du sub-project `01`, les fichiers du volume Docker.
- Produit : les objets présents dans R2 sous leurs **nouvelles** clés, et une base qui les désigne, conditions de la Task 3.

> Cette tâche précède le changement de code. Basculer la lecture avant d'avoir migré rendrait le site sans images pendant l'intervalle.

> **Trois choses bougent ensemble : les objets, le seed, les colonnes.** Déplacer les fichiers sans migrer `Project.coverFilename` et `freelance.Company.logoFilename` fait disparaître toutes les images du site d'un coup en production, et le symptôme n'apparaît qu'au déploiement. C'est le défaut le plus coûteux du sub-project.

- [ ] **Step 0: Établir la table de correspondance**

L'arborescence actuelle porte deux conventions contradictoires. Un projet **client** range ses fichiers sous le slug de son **entreprise** (`projets/client/foyer/cover.webp` appartient au projet `webapp-gestion-sinistres`), un projet **personnel** sous le sien. Et le logo d'une société vit dans le dossier d'un projet, alors qu'une société peut en porter plusieurs.

Cible :

```
portfolio-assets
├── branding/<fichier>                          inchangé
├── documents/cv/<fichier>                      inchangé
└── projets/{client,personal}/<slug-projet>/    couverture, captures, vidéos

portfolio-admin
└── freelance/crm/entreprises/<slug>/logo.png
```

La correspondance ancien dossier vers nouveau **n'est pas déductible du nom de dossier** : le dossier porte le slug de l'entreprise, le nouveau celui du projet. Elle a été relevée dans `prisma/seed-data/projects.ts`, où chaque projet porte son `slug` et son `coverFilename`. **Vérifier ces cinq lignes contre le fichier avant de lancer quoi que ce soit**, un projet ajouté depuis la rédaction de ce plan s'y ajouterait :

| Dossier actuel | Slug du projet | Nouveau dossier |
|---|---|---|
| `projets/client/foyer/` | `webapp-gestion-sinistres` | `projets/client/webapp-gestion-sinistres/` |
| `projets/client/theodo-extend/` | `chatbot-agents-ia` | `projets/client/chatbot-agents-ia/` |
| `projets/client/wanted-design/` | `referent-ia-automatisation` | `projets/client/referent-ia-automatisation/` |
| `projets/client/paysystem/` | `saas-gestion-paie` | `projets/client/saas-gestion-paie/` |
| `projets/client/cloudsmart/` | `erp-odoo-android` | `projets/client/erp-odoo-android/` |

Le `logo.png` de chacun de ces dossiers ne suit pas le projet : il part dans le bucket `portfolio-admin`, sous `freelance/crm/entreprises/<slug-entreprise>/logo.png`, en gardant donc le slug de l'entreprise.

Les six dossiers de `projets/personal/` ne bougent pas, leur nom étant déjà le slug du projet.

Une seule capture de case study est concernée, `webapp-gestion-sinistres-2.webp`, qui suit son dossier vers `projets/client/webapp-gestion-sinistres/`.

`personal` est conservé plutôt que `perso` : le segment porte alors le même mot que la valeur `PERSONAL` de l'enum `ProjectType`.

Les captures de case study ne sont ni dans `coverFilename` ni dans `logoFilename` mais en dur dans le markdown. Les trouver :

```bash
grep -rn "assets/projets/" prisma/seed-data/case-studies/
```

Une entreprise du seed porte `logoFilename: null` : rien à déplacer pour elle, et la migration de données ne doit pas lui inventer un chemin.

- [ ] **Step 1: Inventorier le contenu du volume**

Sur le VPS :

```bash
docker run --rm -v portfolio_assets:/data alpine find /data -type f | sort > /tmp/inventaire-volume.txt
wc -l /tmp/inventaire-volume.txt
```

Noter le nombre de fichiers : il sert de contrôle au Step 3.

- [ ] **Step 2: Copier vers R2**

Le transfert passe par un conteneur `amazon/aws-cli` jetable qui monte le volume directement. Rien n'est installé sur le VPS, et les fichiers ne transitent par aucune archive intermédiaire.

```bash
docker run --rm \
  -v portfolio_assets:/data \
  -e AWS_ACCESS_KEY_ID=<clé du token portfolio-assets> \
  -e AWS_SECRET_ACCESS_KEY=<secret du même token> \
  -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli s3 sync /data s3://portfolio-assets/ \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com
```

⚠️ **Ne pas chercher à utiliser `rclone` ici.** Le sub-project `01` s'appuie sur le rclone **embarqué par Dokploy**, qui n'est ni installé ni configuré sur le VPS ni en local : il n'existe aucun remote `r2:` à ce stade. Le CLI AWS est en revanche déjà celui qui a servi à vérifier le cloisonnement des tokens à la Task 2 du `01`, avec le même endpoint et la même paire de clés.

Le token utilisé est celui de `portfolio-assets`, jamais celui des sauvegardes : c'est précisément le cloisonnement posé au sub-project `01`.

`s3 sync` préserve l'arborescence sous `/data` sans préfixe ajouté : le bucket reçoit donc l'**ancienne** arborescence, que les deux steps suivants corrigent en place.

- [ ] **Step 2 bis: Renommer les dossiers de projet dans le bucket**

Pour chaque ligne de la table de correspondance du Step 0, un `mv` récursif côté R2 :

```bash
docker run --rm \
  -e AWS_ACCESS_KEY_ID=<clé du token portfolio-assets> \
  -e AWS_SECRET_ACCESS_KEY=<secret du même token> \
  -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli s3 mv \
  s3://portfolio-assets/projets/client/foyer/ \
  s3://portfolio-assets/projets/client/webapp-gestion-sinistres/ \
  --recursive --exclude "logo.png" \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com
```

`--exclude "logo.png"` laisse le logo derrière : il part dans l'autre bucket au Step 2 ter. Répéter pour chaque projet client. Les projets personnels ne bougent pas, leur dossier portait déjà le slug du projet.

- [ ] **Step 2 ter: Déplacer les logos d'entreprise vers `portfolio-admin`**

Le CLI ne peut pas copier d'un bucket à l'autre avec deux jeux de credentials différents : passer par un fichier local intermédiaire, ou par deux commandes successives avec le token adéquat.

```bash
# lecture avec le token portfolio-assets
aws s3 cp s3://portfolio-assets/projets/client/foyer/logo.png /tmp/foyer-logo.png \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com

# écriture avec le token portfolio-admin
aws s3 cp /tmp/foyer-logo.png \
  s3://portfolio-admin/freelance/crm/entreprises/foyer/logo.png \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com

# suppression de la source, une fois la copie vérifiée
aws s3 rm s3://portfolio-assets/projets/client/foyer/logo.png \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com
```

Ne supprimer la source qu'après avoir constaté la présence de la copie : les fichiers du volume restent la seule autre copie tant que la Task 5 ne l'a pas retiré.

`Company` étant une entité du CRM (ADR-018, schema `freelance`), son logo n'a rien à faire dans le bucket que sert une route publique. La conséquence est assumée : le badge entreprise des pages publiques n'affichera plus que le nom, ce que la Task 2 quinquies applique.

- [ ] **Step 2 quater: Mettre le seed et la base en accord**

Trois écritures, dans cet ordre :

1. `prisma/seed-data/projects.ts` : les 11 `coverFilename` suivent la nouvelle arborescence.
2. `prisma/seed-data/companies.ts` : les 5 `logoFilename` deviennent `freelance/crm/entreprises/<slug>/logo.png`. Celui qui vaut `null` reste `null`.
3. Les markdown de case study repérés au Step 0.

Puis une migration de données, sans laquelle la production pointerait dans le vide :

```sql
UPDATE "public"."Project"
SET "coverFilename" = replace("coverFilename", 'projets/client/foyer/', 'projets/client/webapp-gestion-sinistres/')
WHERE "coverFilename" LIKE 'projets/client/foyer/%';
-- … une instruction par correspondance

UPDATE "freelance"."Company"
SET "logoFilename" = 'freelance/crm/entreprises/' || slug || '/logo.png'
WHERE "logoFilename" IS NOT NULL;

UPDATE "public"."Project"
SET "caseStudyMarkdownFr" = replace("caseStudyMarkdownFr", 'projets/client/foyer/', 'projets/client/webapp-gestion-sinistres/'),
    "caseStudyMarkdownEn" = replace("caseStudyMarkdownEn", 'projets/client/foyer/', 'projets/client/webapp-gestion-sinistres/');
```

Vérifier ensuite qu'aucune valeur ne pointe plus vers l'ancienne arborescence :

```sql
SELECT count(*) FROM "public"."Project" WHERE "coverFilename" LIKE 'projets/client/foyer/%';
```

Expected: `0`.

- [ ] **Step 2 quinquies: Retirer le logo du badge entreprise public**

Le logo n'est plus servi par la route publique : le composant du badge entreprise ne doit plus tenter de l'afficher, sinon les cartes projet et les case studies porteront une image cassée. Ne garder que le nom.

`logoFilename` reste en base et n'est pas supprimé du modèle : le sub-project `13` le rend éditable depuis l'admin, qui le lit par sa propre route authentifiée.

- [ ] **Step 3: Vérifier l'inventaire**

```bash
docker run --rm \
  -e AWS_ACCESS_KEY_ID=<clé du token portfolio-assets> \
  -e AWS_SECRET_ACCESS_KEY=<secret du même token> \
  -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli s3 ls s3://portfolio-assets/ --recursive \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com | wc -l
```

Expected: le nombre du Step 1, **moins** les logos d'entreprise partis dans `portfolio-admin`. Compter ces derniers séparément :

```bash
aws s3 ls s3://portfolio-admin/freelance/crm/entreprises/ --recursive \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com | wc -l
```

La somme des deux doit égaler l'inventaire du volume. Un écart signalerait une migration incomplète, dont le symptôme serait une image absente sur une page peu consultée.

Vérifier aussi qu'aucun `logo.png` ne subsiste dans `portfolio-assets` :

```bash
aws s3 ls s3://portfolio-assets/ --recursive \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com | grep logo.png
```

Expected: aucun résultat.

- [ ] **Step 4: Vérifier un objet nominal**

```bash
docker run --rm \
  -e AWS_ACCESS_KEY_ID=<clé du token portfolio-assets> \
  -e AWS_SECRET_ACCESS_KEY=<secret du même token> \
  -e AWS_DEFAULT_REGION=auto \
  amazon/aws-cli s3 cp s3://portfolio-assets/documents/cv/cv-thibaud-geisler-fr.pdf - \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com | head -c 4
```

Expected: `%PDF`. Un contenu vide ou tronqué indiquerait un transfert défaillant malgré un compte de fichiers correct.

---

### Task 3 : Basculer la lecture

**Files:**
- Modify: `src/server/config/assets.ts`
- Modify: `src/app/api/assets/[...path]/route.ts`

**Interfaces:**
- Consomme : `r2` et `R2_BUCKET` (Task 1), les objets migrés (Task 2).
- Produit : une route servant depuis R2, consommée par le sub-project `10`.

- [ ] **Step 1: Supprimer la résolution de chemin**

Dans `src/server/config/assets.ts`, retirer la fonction `resolveAssetPath` ainsi que l'import de `node:path` s'il ne sert plus. Conserver `CONTENT_TYPE_MAP`, `AssetPathSchema`, `validateAssetPath` et `getContentType`.

`getContentType` utilise encore `path.extname` : garder l'import si c'est le cas.

Cette suppression n'affaiblit rien. La garde qu'elle portait protégeait d'une remontée de répertoire après `path.resolve`, ce qui n'a pas de sens pour une clé d'objet. Le motif de segment déjà en place rejette `..`, puisqu'il impose de commencer par un caractère alphanumérique.

- [ ] **Step 2: Réécrire la route**

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { logger } from '@/lib/logger'
import { r2, R2_BUCKET } from '@/lib/r2'
import { getContentType, validateAssetPath } from '@/server/config/assets'

const log = logger.child({ route: '/api/assets/[...path]' })

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { path: raw } = await context.params

  const validation = validateAssetPath(raw)
  if (!validation.ok) {
    log.warn({ raw, error: validation.error }, 'assets: invalid path')
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const object = await r2.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: validation.joined }),
    )

    if (!object.Body) {
      log.debug({ path: validation.joined }, 'assets: empty body')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers: {
        'Content-Type': getContentType(validation.joined),
        // En prod les assets sont immutables (convention : renommer le fichier pour invalider).
        // En dev, revalider à chaque requête sinon Chrome garde 1 an le premier fichier servi → galère au moindre remplacement local.
        'Cache-Control':
          process.env.NODE_ENV === 'production'
            ? 'public, max-age=31536000, immutable'
            : 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    if ((err as { name?: string }).name === 'NoSuchKey') {
      log.debug({ path: validation.joined }, 'assets: not found')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    log.error({ err, path: validation.joined }, 'assets: unexpected error')
    throw err
  }
}
```

Trois changements par rapport à la version précédente, et rien d'autre. La lecture passe par le SDK, `transformToWebStream()` relaie le corps sans le charger en mémoire, et `NoSuchKey` remplace `ENOENT` dans la détection du 404.

Les en-têtes et le commentaire qui les explique sont conservés mot pour mot : c'est ce qui rend la bascule invisible côté navigateur.

- [ ] **Step 3: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur. Une erreur sur `resolveAssetPath` signalerait un appel résiduel à la fonction supprimée.

---

### Task 4 : Adapter les tests

**Files:**
- Modify: `src/server/config/assets.test.ts`
- Modify: `src/app/api/assets/[...path]/route.integration.test.ts`

**Interfaces:**
- Consomme : le code de la Task 3.
- Produit : une suite verte reflétant le nouveau comportement.

- [ ] **Step 1: Nettoyer les tests de configuration**

Dans `src/server/config/assets.test.ts`, supprimer les cas portant sur `resolveAssetPath`, qui n'existe plus. Conserver ceux qui couvrent :

- un chemin à segment unique valide accepté
- une extension hors liste blanche refusée
- un segment ne commençant pas par un caractère alphanumérique refusé, ce qui couvre `..`
- un chemin dépassant la profondeur maximale refusé
- le type de contenu déduit de l'extension

Ces cas restent pertinents : ils couvrent la seule logique propre au projet de cette chaîne.

- [ ] **Step 2: Adapter les tests d'intégration de la route**

Remplacer le mock du système de fichiers par un mock du client S3 :

```typescript
vi.mock('@/lib/r2', () => ({
  r2: { send: vi.fn() },
  R2_BUCKET: 'test-bucket',
}))
```

Quatre cas à couvrir :

- un chemin invalide retourne 400 **sans** que `r2.send` ait été appelé
- une erreur portant `name: 'NoSuchKey'` retourne 404
- une lecture réussie retourne 200 avec le bon `Content-Type`
- les en-têtes de cache correspondent à l'environnement

Le premier est le plus important : il vérifie que la validation reste en amont de tout appel réseau, donc qu'un chemin hostile ne consomme pas d'opération facturée.

- [ ] **Step 3: Lancer la suite**

```bash
just test
```

Expected: tous les tests verts.

---

### Task 5 : Retirer le volume et mettre à jour la documentation

**Files:**
- Modify: `compose.yaml`
- Modify: `compose.override.yaml`
- Modify: `.claude/rules/nextjs/assets.md`
- Modify: `docs/adrs/011-stockage-assets.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PRODUCTION.md`

**Interfaces:**
- Consomme : la bascule vérifiée.
- Produit : une configuration et une documentation conformes au réel.

> Cette tâche vient **après** la vérification de la Task 6. Retirer le volume avant d'avoir constaté que R2 sert les fichiers supprimerait la seule copie disponible.

- [ ] **Step 1: Retirer le volume des deux compose**

Dans `compose.yaml` : supprimer la ligne `- portfolio_assets:/app/assets` du service, la variable `ASSETS_PATH` si elle y figure, et l'entrée `portfolio_assets` de la section `volumes`.

Dans `compose.override.yaml` : supprimer le bind-mount de développement `- ./assets:/app/assets:ro`. Oublié, il survit à la bascule et pointe vers un dossier devenu mort, ce qui donne un développement qui lit encore le disque là où la production lit R2.

Ne pas supprimer le volume Docker lui-même sur le VPS avant plusieurs jours de fonctionnement : il reste une sauvegarde gratuite le temps de s'assurer que rien ne manque.

- [ ] **Step 2: Mettre à jour la rule des assets**

Dans `.claude/rules/nextjs/assets.md` :

- remplacer la lecture du système de fichiers par la lecture R2 dans les règles et l'exemple de code
- supprimer la règle sur `ASSETS_PATH` et son fallback, cette variable n'existant plus. C'était une exception documentée à la validation par `src/env.ts`, elle disparaît avec elle
- supprimer le gotcha sur `fs.readFile` et `ENOENT`, remplacé par `NoSuchKey`
- supprimer la mention « Migration future R2 » des gotchas : elle est faite
- supprimer l'exemple `compose.yaml` du volume
- conserver toutes les règles de validation de chemin, qui n'ont pas changé
- retirer `assets/**` du champ `paths:` de son frontmatter : ce dossier n'a plus de raison d'exister, et la rule ne doit plus s'auto-injecter sur lui

- [ ] **Step 3: Acter la migration dans l'ADR-011**

Ajouter une note d'évolution indiquant que la migration vers R2 est réalisée, avec la juridiction européenne retenue et le fait que le bucket reste privé, servi exclusivement par la route. Ne pas réécrire la décision d'origine, qui reste l'historique de ce choix.

- [ ] **Step 4: Mettre à jour ARCHITECTURE.md**

Dans la section Files / Assets Storage, remplacer la description du volume Docker par R2, en conservant la convention de chemins qui n'a pas bougé.

- [ ] **Step 5: Mettre à jour PRODUCTION.md**

Ajouter les quatre variables R2 aux Variables Secrets, et retirer `ASSETS_PATH` des Variables Communes.

Retirer également la mention d'`ASSETS_PATH` du chapeau « Validation runtime » du paragraphe Variables d'Environnement, qui la présente comme une exception à `src/env.ts` : cette exception disparaît avec la variable, les quatre variables R2 passant toutes par la validation. C'est la seconde occurrence dans le fichier, et celle qu'on oublie, puisqu'elle n'est pas dans un bloc de code.

Compléter la liste des secrets à ne jamais logger avec `R2_SECRET_ACCESS_KEY`.

- [ ] **Step 6: Vérifier qu'aucune référence résiduelle ne subsiste**

```bash
grep -rn "ASSETS_PATH\|portfolio_assets\|resolveAssetPath" src/ docs/ .claude/ compose.yaml compose.override.yaml Dockerfile
```

Expected: aucun résultat, hors mentions historiques assumées dans l'ADR.

Le volume Docker du VPS devient mort et se supprime une fois la migration vérifiée. **Le dossier `assets/` local, lui, se garde** : R2 n'a ni versioning ni corbeille (`knowledges/cloudflare-r2.md`) et le bucket `portfolio-assets` n'est sauvegardé par rien, alors que le sub-project `10` ouvre la suppression d'assets depuis l'admin. Cette copie ne coûte rien, elle est déjà là et gitignorée. Elle se périme au premier upload fait depuis l'admin, ce qui est acceptable : elle couvre la fenêtre où le risque est le plus élevé.

---

### Task 6 : Vérifier de bout en bout

**Files:** aucun fichier du dépôt.

> À exécuter **avant** la Task 5, dont l'étape de retrait du volume dépend de ces constats.

- [ ] **Step 1: Vérifier en développement**

```bash
just dev
```

Peupler d'abord le bucket de développement depuis celui de production. L'opération se fait **en deux temps**, et ce n'est pas un détail de forme : chaque token étant restreint à un seul bucket, aucun ne voit la source et la destination à la fois, donc aucune copie de bucket à bucket n'est possible. C'est le prix, assumé, du cloisonnement posé au sub-project `01`.

```bash
# 1. Descendre depuis la production, avec le token portfolio-assets
AWS_ACCESS_KEY_ID=<clé prod> AWS_SECRET_ACCESS_KEY=<secret prod> AWS_DEFAULT_REGION=auto \
  aws s3 sync s3://portfolio-assets/ /tmp/assets-copie/ \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com

# 2. Remonter vers le développement, avec le token portfolio-assets-dev
AWS_ACCESS_KEY_ID=<clé dev> AWS_SECRET_ACCESS_KEY=<secret dev> AWS_DEFAULT_REGION=auto \
  aws s3 sync /tmp/assets-copie/ s3://portfolio-assets-dev/ \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com

rm -rf /tmp/assets-copie
```

Consulter ensuite la page d'accueil, `/fr/projets`, une page de projet et le lien de téléchargement du CV.

Expected: toutes les images et le PDF se chargent. Un bucket de développement vide produirait des 404 partout, ce qui ne signalerait pas un défaut de code mais une copie non faite.

- [ ] **Step 2: Vérifier les types de contenu**

Dans l'onglet réseau, inspecter une image et le PDF.

Expected: `image/webp` ou équivalent pour les images, `application/pdf` pour le CV.

- [ ] **Step 3: Vérifier le 404**

Demander `/api/assets/projets/client/inexistant/rien.png`.

Expected: un 404. Un 500 signalerait que `NoSuchKey` n'est pas intercepté.

- [ ] **Step 4: Vérifier le 400**

Demander `/api/assets/fichier.exe`.

Expected: un 400, et aucune requête émise vers R2.

- [ ] **Step 5: Vérifier la nouvelle arborescence et le badge entreprise**

Sur `/fr/projets` et sur une page de case study :

Expected: les couvertures et les captures se chargent depuis leurs **nouvelles** clés, sous le slug du projet. Le badge entreprise porte le nom seul, sans image et sans emplacement vide.

Inspecter l'onglet réseau : aucune requête vers `/api/assets/` ne doit viser un `logo.png`. Une 404 sur un logo signalerait que le badge n'a pas été nettoyé au Step 2 quinquies.

- [ ] **Step 6: Vérifier que les buckets ne sont pas exposés**

Tenter d'accéder à un objet de `portfolio-assets` par une URL publique R2, puis à un logo de `portfolio-admin` par la route `/api/assets/freelance/crm/entreprises/foyer/logo.png`.

Expected: accès refusé dans le premier cas, aucun domaine public n'ayant été configuré. Dans le second, une erreur : le client de la route publique ne détient que le token de `portfolio-assets`, il ne peut pas lire l'autre bucket. C'est ce qui garantit qu'un logo d'entreprise ne fuitera pas par la route publique.

- [ ] **Step 7: Inscrire les vérifications de production dans la Checklist Release**

Deux constats exigent un déploiement, et la production ne se déploie qu'au tag release-please (`docs/PRODUCTION.md` § Workflow Release) : ils ne peuvent pas être des critères de fin de sub-project. Les ajouter à la Checklist Release de `docs/PRODUCTION.md`, à cocher au premier tag qui embarque ce sub-project :

1. `curl -sI https://<domaine>/api/assets/documents/cv/cv-thibaud-geisler-fr.pdf | grep -i cache-control` retourne `public, max-age=31536000, immutable`.
2. Les pages publiques affichent toutes leurs images depuis les nouvelles clés, et aucun badge entreprise ne porte d'image cassée. Un défaut ici signalerait une migration de données non appliquée en production.

- [ ] **Step 8: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(assets): sert les assets depuis Cloudflare R2
```
