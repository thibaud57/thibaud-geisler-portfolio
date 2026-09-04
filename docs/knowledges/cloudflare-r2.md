---
title: "Cloudflare R2 — Stockage objet S3-compatible"
version: "n/a (service managé, sans versioning)"
description: "Référence technique pour Cloudflare R2 : buckets, endpoint S3, tokens scopés, classes d'opérations et lifecycle."
date: "2026-09-03"
keywords: ["cloudflare", "r2", "stockage-objet", "s3", "assets", "sauvegardes"]
scope: ["docs"]
technologies: ["AWS SDK for JavaScript v3", "Dokploy", "rclone", "Next.js", "PostgreSQL"]
---

# Description

`Cloudflare R2` est le stockage objet S3-compatible retenu par [ADR-011](../adrs/011-stockage-assets.md) pour remplacer le volume Docker des assets, et par la stratégie de sauvegarde pour recevoir les dumps PostgreSQL. Son intérêt décisif face à S3 est l'absence de frais d'egress : servir des images publiquement ne coûte que le stockage et les opérations de lecture.

Le portfolio en fait **deux usages qui ne se ressemblent pas** :

| Usage | Qui écrit | Comment | Bucket |
|---|---|---|---|
| Sauvegardes PostgreSQL | Dokploy, seul | rclone, configuré en UI, zéro code dans le dépôt | dédié aux sauvegardes |
| Assets applicatifs | l'application Next.js | SDK S3 côté serveur, streamé par `/api/assets/[...path]` | dédié aux assets |

Ces deux usages ne partagent que le compte Cloudflare. Buckets distincts, tokens distincts, pour qu'une compromission de l'application ne donne aucun accès aux sauvegardes.

> La procédure de configuration côté Dokploy (Backup Destination, planification, restauration) vit dans [dokploy.md](dokploy.md). Cette fiche ne couvre que R2.

---

# Concepts Clés

## Buckets, emplacement et classes de stockage

### Description

Un bucket se crée avec un nom, un emplacement optionnel et une juridiction. Deux de ces trois choix sont **définitifs**, ce qui en fait les seules décisions irréversibles de la mise en place.

La juridiction (`default`, `eu`, `fedramp`) ne peut plus changer après création. Le location hint (`apac`, `eeur`, `enam`, `weur`, `wnam`, `oc`) n'est honoré qu'à la toute première création d'un nom de bucket : recréer un bucket supprimé sous le même nom réutilise l'emplacement d'origine, sans tenir compte du nouveau hint.

### Exemple

```bash
# --jurisdiction (alias --J) garantit la résidence des données
wrangler r2 bucket create portfolio-assets  --jurisdiction eu
wrangler r2 bucket create portfolio-backups --jurisdiction eu

# le flag doit être répété sur CHAQUE commande visant ces buckets
wrangler r2 bucket info portfolio-assets --jurisdiction eu
```

### Points Importants

- Nom : minuscules, chiffres et tirets uniquement, 3 à 63 caractères, ni tiret initial ni tiret final
- **Juridiction définitive** : un bucket créé en `default` ne peut pas passer en `eu` après coup, il faut recréer et recopier
- Une juridiction non `default` change l'endpoint S3, qui devient `https://<ACCOUNT_ID>.<JURISDICTION>.r2.cloudflarestorage.com`
- `--jurisdiction` (alias `--J`) doit être répété sur **chaque** commande Wrangler visant un bucket à juridiction, `info` et `lifecycle` compris : sans lui, la commande cherche dans la juridiction par défaut et ne trouve rien
- Juridiction et location hint sont deux choses distinctes : la première est une garantie de résidence, la seconde une simple suggestion de placement
- Seule limitation documentée d'une juridiction assignée : Logpush ne s'y applique pas. Lifecycle, CORS, domaines personnalisés et accès S3 fonctionnent normalement
- Classe `Standard` : aucune durée minimale de stockage, aucun frais de récupération. Classe `Infrequent Access` : 30 jours de stockage facturés même si l'objet est supprimé avant, plus 0,01 $/Go récupéré
- Le passage `Infrequent Access` → `Standard` **n'est pas** possible par lifecycle rule, uniquement `Standard` → `Infrequent Access`. Le retour se fait manuellement par `CopyObject` avec l'en-tête `x-amz-storage-class`
- Les deux classes ont un egress gratuit

---

## Endpoint S3 et client Node.js

### Description

R2 expose une API S3 sur un endpoint dérivé de l'account ID. Le SDK AWS v3 s'y connecte tel quel, à deux ajustements près : la région vaut `auto` (le SDK l'exige, R2 l'ignore) et le calcul de checksum par défaut doit être désactivé.

Ce second point est un piège réel : depuis `@aws-sdk/client-s3` 3.729.0, le SDK calcule un checksum CRC32 par défaut sur `PutObject` et `UploadPart`, que R2 ne supporte pas. Les uploads échouent sans que le message d'erreur ne soit parlant.

### Exemple

```typescript
import 'server-only'
import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
})
```

### Points Importants

- Endpoint standard : `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, l'account ID se lit dans le dashboard Cloudflare
- `region: 'auto'` est la valeur documentée. Les outils qui refusent `auto` acceptent une chaîne vide ou `us-east-1`, R2 n'en tient pas compte
- `requestChecksumCalculation: 'WHEN_REQUIRED'` est **obligatoire** avec un SDK ≥ 3.729.0, sinon les écritures cassent. Source : [Cloudflare Community](https://community.cloudflare.com/t/aws-sdk-client-s3-v3-729-0-breaks-uploadpart-and-putobject-r2-s3-api-compatibility/758637), corroborée par une issue du dépôt `aws-sdk-js-v3`. Ce n'est pas documenté côté Cloudflare
- Les deux styles d'adressage fonctionnent : virtual-hosted (`<bucket>.<account-id>.r2.cloudflarestorage.com`) et path-style (`<account-id>.r2.cloudflarestorage.com/<bucket>`)
- Le client doit importer `'server-only'` : il porte des credentials, il ne doit jamais être atteignable depuis un Client Component

---

## Compatibilité S3 : ce qui manque

### Description

La couverture des opérations **objet** est quasi complète, celle des opérations **bucket** ne l'est pas du tout. Plus de quarante opérations de gestion de bucket ne sont pas implémentées. Ce qui compte pour le portfolio, c'est que rien d'utile ne manque : lire, écrire, lister, supprimer et le multipart sont tous là.

### Exemple

```typescript
// ✅ Supporté : tout ce dont la route assets a besoin
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

const object = await r2.send(new GetObjectCommand({ Bucket: 'portfolio-assets', Key: 'projets/client/foyer/logo.png' }))

// ❌ Non supporté : le tagging d'objet n'existe pas sur R2
// await r2.send(new PutObjectTaggingCommand({ ... }))
```

### Points Importants

- Opérations objet supportées : `HeadObject`, `GetObject`, `PutObject`, `ListObjects`, `ListObjectsV2`, `DeleteObject`, `DeleteObjects`, `CopyObject`, `UploadPartCopy` et le multipart complet
- **Non supporté côté objet** : `GetObjectTagging`, `PutObjectTagging`, `DeleteObjectTagging`. Si un besoin de classement apparaît, il passe par le préfixe de clé, pas par des tags
- Opérations bucket supportées : `ListBuckets`, `HeadBucket`, `CreateBucket`, `DeleteBucket`, CORS, lifecycle, `GetBucketLocation`, `GetBucketEncryption`
- **Non supporté côté bucket** : ACL, versioning, réplication, hébergement de site, object lock, bucket policies, logging, analytics
- Absent également : les checksums CRC32, les uploads POST façon formulaire S3, la validation de bucket owner
- Préférer `ListObjectsV2` à `ListObjects` dans du code neuf

---

## Tokens API et cloisonnement

### Description

R2 propose quatre niveaux de permission, dont deux seulement peuvent être restreints à des buckets précis. C'est ce qui permet de tenir la règle du projet : le token de l'application ne doit jamais voir le bucket de sauvegarde.

| Permission | Scopable à un bucket |
|---|---|
| Admin Read & Write | non, portée compte |
| Admin Read only | non, portée compte |
| **Object Read & Write** | **oui** |
| **Object Read only** | **oui** |

> « If you select the **Object Read and Write** or **Object Read** permissions, you can scope your token to a set of buckets. »

### Exemple

```
Token « portfolio-app »       Object Read & Write   → portfolio-assets   uniquement
Token « dokploy-backups »     Object Read & Write   → portfolio-backups  uniquement
```

### Points Importants

- La **Secret Access Key ne s'affiche qu'une fois** à la création. Non récupérable ensuite, seule la rotation reste possible
- Wrangler **ne crée pas** de token R2 : cette étape se fait au dashboard (R2 → Manage API tokens). Les flags `--token` des commandes consomment un token existant, ils n'en produisent pas
- Token de compte (créé sous Manage Account, réservé aux Super Administrators) : survit aux changements d'équipe, valide jusqu'à révocation. C'est celui qui convient à un service comme l'application ou Dokploy
- Token utilisateur : lié à une personne, devient inactif si elle quitte le compte. À réserver au cas où un même token doit combiner des permissions compte (R2) et zone (DNS)
- TTL par défaut « Forever », modifiable à la création
- La propagation d'un changement de permission peut prendre jusqu'à une minute, contrairement au reste de R2 qui est immédiatement cohérent

---

## Tarification et classes d'opérations

### Description

Le coût réel ne se joue pas sur le stockage mais sur la **classe** des opérations. Les écritures et les listings sont en Class A, douze fois plus chers que les lectures en Class B. Savoir quelle opération tombe dans quelle classe est ce qui permet d'estimer une facture.

### Exemple

```
Free tier mensuel (Standard uniquement)
  stockage    10 Go-mois
  Class A      1 000 000 requêtes
  Class B     10 000 000 requêtes
  egress      gratuit, sans plafond

Au-delà (Standard)
  stockage    0,015 $/Go-mois
  Class A     4,50 $/million
  Class B     0,36 $/million
```

### Points Importants

- **Class A** (écritures et listings) : `PutObject`, `CopyObject`, `ListObjects`, `ListBuckets`, `PutBucket`, `CreateMultipartUpload`, `UploadPart`, `UploadPartCopy`, `CompleteMultipartUpload`, `ListMultipartUploads`, `ListParts`, `LifecycleStorageTierTransition`, `PutBucketCors`, `PutBucketEncryption`, `PutBucketLifecycleConfiguration`
- **Class B** (lectures) : `GetObject`, `HeadObject`, `HeadBucket`, `UsageSummary`, `GetBucketCors`, `GetBucketEncryption`, `GetBucketLocation`, `GetBucketLifecycleConfiguration`
- **Gratuit, non compté** : `DeleteObject`, `DeleteBucket`, `AbortMultipartUpload`
- Pour le portfolio : chaque asset servi par la route catch-all est un `GetObject`, donc du Class B. Chaque upload depuis l'admin est un `PutObject`, donc du Class A, mais en volume négligeable pour un usage single-user
- `Infrequent Access` n'a **aucun free tier** et ses opérations coûtent le double : 9,00 $/million en Class A, 0,90 $/million en Class B
- L'egress reste gratuit dans les deux classes de stockage, c'est la différence structurelle avec S3

---

## Accès public et bucket privé

### Description

R2 propose deux façons d'exposer un bucket publiquement, et Cloudflare en déconseille une explicitement. Le portfolio n'utilise ni l'une ni l'autre : les fichiers transitent par une route API Next.js qui les lit avec le token scopé, donc **les deux buckets restent privés**.

### Exemple

```
Navigateur
    │  GET /api/assets/projets/client/foyer/logo.png
    ▼
Route catch-all Next.js         ← valide le chemin, applique Cache-Control
    │  GetObjectCommand (token scopé, serveur à serveur)
    ▼
Bucket R2 privé                  ← jamais joignable directement
```

### Points Importants

- Le domaine `r2.dev` est **rate-limité et réservé au développement**. Cloudflare le formule ainsi et recommande un domaine personnalisé en production. Le chiffre exact du rate limit n'est pas publié dans la doc
- Poser un CNAME vers `r2.dev` est explicitement déconseillé
- Un domaine personnalisé débloque WAF, cache, Bot Management et Zero Trust Access, indisponibles via `r2.dev`
- Garder le bucket privé conserve la validation de chemin déjà en place (`.claude/rules/nextjs/assets.md` : regex par segment, whitelist d'extensions, profondeur maximale, garde anti-traversal), qu'une exposition directe court-circuiterait
- CORS n'est pas nécessaire tant que les appels sont serveur à serveur. Il ne le deviendrait qu'avec un upload direct navigateur vers R2 par URL présignée

---

## Lifecycle rules et rétention

### Description

Les lifecycle rules purgent ou déclassent automatiquement les objets selon leur âge et leur préfixe. C'est le mécanisme qui borne la croissance du bucket de sauvegardes.

### Exemple

```bash
wrangler r2 bucket lifecycle add portfolio-backups \
  --name expire-anciens-dumps \
  --prefix "" \
  --expire-days 30
```

### Points Importants

- Jusqu'à 1000 règles par bucket, filtrables par préfixe
- Deux effets possibles : transition de classe de stockage, ou expiration (suppression)
- Si une règle de transition et une règle d'expiration tombent dans la même fenêtre de 24 h, **l'expiration l'emporte**
- L'application n'est pas instantanée : compter environ 24 h après le déclenchement
- Une rétention côté Dokploy (`Keep the latest` sur la sauvegarde, qui compte des sauvegardes et non des jours) et une lifecycle rule côté R2 font le même travail. En choisir **une seule**, sinon la plus courte gagne silencieusement
- Une règle implicite d'expiration des multipart uploads incomplets après 7 jours est mentionnée par des résultats de recherche mais n'a pas été confirmée sur une page officielle

---

## Cohérence et limites

### Description

R2 se décrit comme fortement cohérent, ce qui évite toute la classe de bugs liés à la cohérence à terme d'S3 historique : un `GET` qui suit un `PUT` voit toujours la dernière version, partout.

### Points Importants

- Read-after-write immédiat et global, mise à jour de métadonnées immédiate, `DELETE` suivi d'un `GET` renvoie tout de suite l'absence, un `LIST` reflète l'état exact au moment de l'appel
- Deux exceptions : la propagation des permissions de token (jusqu'à une minute) et le cache edge d'un domaine personnalisé, qui relâche nécessairement la cohérence
- Taille maximale d'un objet : 5 TiB. Upload en une seule requête : 5 GiB maximum
- Multipart : 10 000 parts au maximum. La taille minimale de 5 MiB par part (dernière exceptée) provient d'une source tierce, non reconfirmée sur la page officielle des extensions S3
- Clé d'objet : 1024 octets maximum. Métadonnées : 8192 octets
- Aucune limite sur le nombre d'objets par bucket. 1 000 000 buckets par compte
- Une seule écriture concurrente par seconde sur une même clé d'objet
- L'API REST Cloudflare est limitée à 1200 requêtes par tranche de 5 minutes, toutes opérations R2 confondues
- La propagation d'un changement de policy CORS peut prendre jusqu'à 30 secondes

---

# Commandes Clés

## Wrangler

### Description

`wrangler` est le CLI officiel Cloudflare. Il couvre la création de buckets, les lifecycle rules, CORS, les domaines personnalisés et la manipulation d'objets. Seule la création des tokens API lui échappe et reste au dashboard.

### Syntaxe

```bash
pnpm add -g wrangler                 # ou pnpm dlx wrangler, sans installation globale
wrangler login

# Buckets
wrangler r2 bucket create <nom> --location weur
wrangler r2 bucket info <nom>
wrangler r2 bucket list
wrangler r2 bucket delete <nom>

# Rétention
wrangler r2 bucket lifecycle list <nom>
wrangler r2 bucket lifecycle add <nom> --name <règle> --prefix "" --expire-days 30

# CORS, domaine personnalisé
wrangler r2 bucket cors set <nom> --file cors.json
wrangler r2 bucket domain add <nom> --domain <fqdn>

# Objets
wrangler r2 object put <bucket>/<clé> --file ./local.png
wrangler r2 object get <bucket>/<clé>
wrangler r2 object delete <bucket>/<clé>
```

### Points Importants

- **Wrangler ne crée pas de token R2** : passer par le dashboard (R2 → Manage API tokens → Object Read & Write, restreint aux buckets voulus)
- `wrangler login` ouvre un flux OAuth navigateur, distinct des tokens R2 utilisés par les applications
- Le CLI convient au provisionnement initial et aux opérations ponctuelles, pas à la migration en masse d'un volume : pour ça, `rclone` traite l'arborescence en une commande
- `wrangler r2 object` manipule un objet à la fois, sans récursion sur un préfixe

---

# Bonnes Pratiques

## ✅ Recommandations

- **Un bucket par usage, un token par bucket**, chacun en `Object Read & Write` restreint à son seul bucket : une compromission de l'application ne doit pas permettre d'effacer les sauvegardes, et une manipulation locale ne doit pas atteindre la production. Le découpage retenu par le projet est de trois buckets (`portfolio-backups`, `portfolio-assets`, `portfolio-assets-dev`), décidé dans `docs/superpowers/specs/espace-admin/01-infra-stockage-objet-sauvegardes-design.md` : le forfait gratuit étant mensuel et non par bucket, la séparation ne coûte rien
- **Garder les buckets privés** : les assets transitent par `/api/assets/[...path]`, qui conserve la validation de chemin et la politique de cache déjà en place
- Fixer `requestChecksumCalculation: 'WHEN_REQUIRED'` sur le client S3 dès la première ligne écrite, avant de perdre du temps sur des uploads qui échouent
- Choisir la juridiction à la création en connaissance de cause : c'est le seul paramètre définitivement figé
- Rester en classe `Standard` : sans free tier et avec 30 jours de stockage minimum facturés, `Infrequent Access` coûterait plus cher que `Standard` sur le volume du portfolio
- Placer la rétention des sauvegardes **d'un seul côté**, Dokploy ou lifecycle rule, et documenter lequel
- Sauvegarder la Secret Access Key au moment de sa création, elle ne sera plus jamais affichée
- Vérifier une restauration réelle après la première sauvegarde : une sauvegarde jamais restaurée n'est pas une sauvegarde

## ❌ Anti-Patterns

- **Ne pas utiliser un token `Admin`** pour l'application : cette permission porte sur tout le compte et ne peut pas être restreinte à un bucket
- **Ne pas exposer un bucket via `r2.dev`** en production : Cloudflare le rate-limite et le réserve explicitement au développement
- Ne pas poser de CNAME vers `r2.dev`, explicitement déconseillé
- Ne pas compter sur le tagging d'objet : `PutObjectTagging` n'existe pas sur R2, organiser par préfixe de clé
- Ne pas laisser le SDK AWS ≥ 3.729.0 dans sa configuration de checksum par défaut, les écritures échoueraient
- Ne pas supprimer les fichiers du volume Docker avant d'avoir vérifié que les objets sont lisibles depuis R2
- Ne pas cumuler une rétention Dokploy et une lifecycle rule sur le même bucket : la plus courte gagne, silencieusement

---

# 🔗 Ressources

## Documentation Officielle

- [Cloudflare R2](https://developers.cloudflare.com/r2/)
- [Créer un bucket](https://developers.cloudflare.com/r2/buckets/create-buckets/)
- [Emplacement des données](https://developers.cloudflare.com/r2/reference/data-location/)
- [Classes de stockage](https://developers.cloudflare.com/r2/buckets/storage-classes/)
- [Compatibilité API S3](https://developers.cloudflare.com/r2/api/s3/api/)
- [Tokens API](https://developers.cloudflare.com/r2/api/tokens/)
- [Tarification](https://developers.cloudflare.com/r2/pricing/)
- [Buckets publics](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Lifecycle des objets](https://developers.cloudflare.com/r2/buckets/object-lifecycles/)
- [CORS](https://developers.cloudflare.com/r2/buckets/cors/)
- [Modèle de cohérence](https://developers.cloudflare.com/r2/reference/consistency/)
- [Limites de la plateforme](https://developers.cloudflare.com/r2/platform/limits/)
- [Exemple AWS SDK for JavaScript v3](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/)
- [Commandes Wrangler R2](https://developers.cloudflare.com/r2/reference/wrangler-commands/)

## Ressources Complémentaires

- [Dokploy — Cloudflare R2](https://docs.dokploy.com/docs/core/cloudflare-r2) : procédure de configuration de la destination de sauvegarde
- [Cloudflare Community — rupture checksum SDK 3.729.0](https://community.cloudflare.com/t/aws-sdk-client-s3-v3-729-0-breaks-uploadpart-and-putobject-r2-s3-api-compatibility/758637)
- Issues Dokploy relatives à R2, à consulter si une sauvegarde échoue : [#1263](https://github.com/Dokploy/dokploy/issues/1263) (rclone `Failed to ls`), [#1943](https://github.com/Dokploy/dokploy/issues/1943) (échec en automatique alors que rclone manuel passe, corrigée par la PR #1954), [#2676](https://github.com/Dokploy/dokploy/issues/2676) (403 sur serveurs distants, fermée en doublon de #2616). Leur statut courant n'a pas été revérifié à la date de cette fiche
