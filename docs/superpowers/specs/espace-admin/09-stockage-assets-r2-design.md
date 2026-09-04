---
feature: "Feature 1 — Espace admin"
subproject: "stockage-assets-r2"
goal: "Basculer le stockage des assets du volume Docker vers Cloudflare R2, sans changer les URLs publiques"
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["01-infra-stockage-objet-sauvegardes-design.md"]
date: "2026-09-03"
---

# Bascule du stockage des assets vers Cloudflare R2

## Scope

Remplacer la lecture sur volume Docker par une lecture depuis le bucket `portfolio-assets`, migrer les fichiers existants, et retirer le volume devenu inutile.

Les URLs publiques ne changent pas : la route `/api/assets/[...path]` reste le seul point d'accès, le bucket demeurant privé. Exclut toute écriture : l'upload depuis l'espace admin appartient au sub-project `10`.

### État livré

À la fin de ce sub-project, on peut : consulter le site et retrouver toutes les images et le CV aux mêmes URLs qu'avant, servis depuis R2, et constater que le volume Docker n'est plus monté.

## Dependencies

- `01-infra-stockage-objet-sauvegardes-design.md` (statut: draft) — a créé le bucket `portfolio-assets` en juridiction `eu` et son token `Object Read & Write` restreint.

## Files touched

- **À modifier** : `package.json` (dépendance `@aws-sdk/client-s3`)
- **À créer** : `src/lib/r2.ts` (client S3 configuré)
- **À modifier** : `src/server/config/assets.ts` (la résolution de chemin devient une clé d'objet)
- **À modifier** : `src/server/config/assets.test.ts` (adaptation des cas existants)
- **À modifier** : `src/app/api/assets/[...path]/route.ts` (lecture par le SDK au lieu de `readFile`)
- **À modifier** : `src/app/api/assets/[...path]/route.integration.test.ts`
- **À modifier** : `src/env.ts` (variables R2)
- **À modifier** : `.env.example`
- **À modifier** : `compose.yaml` (retrait du volume `portfolio_assets`)
- **À modifier** : `compose.override.yaml` (retrait du bind-mount de développement `./assets:/app/assets:ro`)
- **À modifier** : `.claude/rules/nextjs/assets.md`
- **À modifier** : `docs/adrs/011-stockage-assets.md` (la migration est faite)
- **À modifier** : `docs/ARCHITECTURE.md` (§ Files / Assets Storage, mais aussi les quatre autres passages qui décrivent encore un volume Docker : § Composants Principaux, § Backend > API, § Approche Modélisation et le diagramme Runtime)
- **À modifier** : `docs/PRODUCTION.md` (variables d'environnement)

## Architecture approach

**La validation de chemin ne change pas.** `validateAssetPath` conserve son schéma Zod par segment, sa liste blanche d'extensions et sa profondeur maximale. C'est la seule logique propre au projet dans cette chaîne, et elle reste pertinente : le chemin validé devient la clé d'objet R2 au lieu d'un chemin de fichier.

**`resolveAssetPath` disparaît.** Sa raison d'être était la garde contre la remontée de répertoire après `path.resolve`. Une clé d'objet R2 n'est pas un chemin de système de fichiers : il n'y a pas de répertoire parent à remonter, et le motif de segment déjà en place rejette `..` puisqu'il impose de commencer par un caractère alphanumérique. Supprimer cette fonction plutôt que la vider évite de laisser une indirection qui ne protège plus de rien.

**Aucune abstraction de stockage n'est introduite.** `.claude/rules/nextjs/assets.md` l'anticipait déjà : « pas d'interface `AssetStorage` prématurée (YAGNI) ». Il n'y a qu'une implémentation, elle s'écrit directement.

**R2 est utilisé en développement comme en production, mais sur des buckets distincts.** `portfolio-assets` en production, `portfolio-assets-dev` en local, chacun servi par son propre token. C'est exactement la logique déjà appliquée à PostgreSQL : un vrai serveur plutôt qu'un substitut, mais des instances séparées (container local en développement, Dokploy Database en production, base dédiée pour les tests). Un défaut propre à R2 se manifeste ainsi pendant le développement, sans qu'une manipulation locale puisse atteindre les données de production.

Le free tier R2 est un forfait d'usage mensuel, exprimé par la grille tarifaire sans référence au bucket : cette séparation ne coûte rien. Le bucket de développement se peuple par une copie depuis la production quand on veut des données représentatives.

**Le client S3 doit désactiver le calcul de checksum.** Les versions récentes de `@aws-sdk/client-s3` calculent un CRC32 par défaut que R2 ne supporte pas. `requestChecksumCalculation: 'WHEN_REQUIRED'` est obligatoire. Ce point n'est documenté ni par Cloudflare ni par AWS, seulement dans leur forum et une issue du SDK, et il produit des échecs au message peu parlant. Détails dans `docs/knowledges/cloudflare-r2.md`.

**La réponse relaie le corps de l'objet en flux.** `GetObjectCommand` retourne un corps en flux, transmis directement à la `Response` plutôt que chargé en mémoire. Le CV en PDF étant le plus lourd des assets, cela évite de le tamponner entièrement à chaque requête.

**Le code d'erreur change de nature.** L'absence de fichier ne se signale plus par `ENOENT` mais par une erreur `NoSuchKey` du SDK. La traduction en 404 doit suivre, faute de quoi tout asset manquant produirait une erreur 500.

**Les en-têtes de cache sont conservés à l'identique**, y compris la distinction entre production et développement. C'est ce qui garantit que la bascule est invisible pour les navigateurs.

**Le bucket reste privé.** Aucun domaine public n'est configuré : les fichiers ne sont accessibles que par la route, qui applique la validation et la politique de cache. Cloudflare déconseille par ailleurs le domaine `r2.dev` en production.

Rules applicables : `.claude/rules/nextjs/assets.md`, `.claude/rules/nextjs/api-routes.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/docker-compose/compose.md`, `.claude/rules/nextjs/production-deployment.md`, `.claude/rules/vitest/setup.md`.

## Acceptance criteria

### Scénario 1 : URLs publiques inchangées
**GIVEN** les assets migrés dans le bucket
**WHEN** on consulte une page affichant une image de projet et le lien de téléchargement du CV
**THEN** les deux se chargent aux mêmes URLs qu'avant la bascule
**AND** le type de contenu retourné est correct pour chacun

### Scénario 2 : Chemin invalide toujours rejeté
**GIVEN** la route d'assets
**WHEN** on demande un chemin comportant une extension non autorisée ou plus de segments que la limite
**THEN** la réponse est un 400
**AND** aucune requête n'a été émise vers R2

### Scénario 3 : Asset absent
**GIVEN** un chemin valide ne correspondant à aucun objet
**WHEN** on le demande
**THEN** la réponse est un 404 et non un 500

### Scénario 4 : Politique de cache préservée
**GIVEN** l'application en production
**WHEN** on inspecte les en-têtes d'une réponse d'asset
**THEN** `Cache-Control` vaut `public, max-age=31536000, immutable`
**AND** en développement, il désactive le cache

### Scénario 5 : Bucket non exposé
**GIVEN** le bucket `portfolio-assets`
**WHEN** on tente d'accéder à un objet sans passer par la route
**THEN** l'accès est refusé, aucun domaine public n'étant configuré

### Scénario 6 : Volume retiré
**GIVEN** la configuration Docker après bascule
**WHEN** on inspecte `compose.yaml`
**THEN** le volume `portfolio_assets` n'y figure plus
**AND** l'application démarre sans lui

## Tests à écrire

### Unit

- `src/server/config/assets.test.ts`, cas existants conservés et adaptés :
  - un chemin à segment unique valide est accepté
  - une extension hors liste blanche est refusée
  - un segment ne commençant pas par un caractère alphanumérique est refusé, ce qui couvre `..`
  - un chemin dépassant la profondeur maximale est refusé
  - le type de contenu est correctement déduit de l'extension
  - les cas portant sur la résolution de chemin de fichier sont supprimés avec la fonction

### Integration

- `src/app/api/assets/[...path]/route.integration.test.ts`, avec le client S3 mocké :
  - un chemin invalide retourne 400 sans appeler R2
  - une clé absente retourne 404, l'erreur `NoSuchKey` étant traduite
  - une lecture réussie retourne 200 avec le bon type de contenu
  - les en-têtes de cache correspondent à l'environnement

La migration des fichiers ne fait l'objet d'aucun test automatisé : elle s'exécute une fois et se vérifie par comparaison du nombre d'objets et par le chargement effectif des pages.

## Edge cases

- **Checksum CRC32** : sans `requestChecksumCalculation: 'WHEN_REQUIRED'`, les opérations échouent avec un message qui n'oriente pas vers la cause. C'est le piège le plus coûteux de cette bascule
- **`NoSuchKey` non traduit** : chaque asset manquant produirait un 500 au lieu d'un 404, ce qui polluerait le monitoring d'erreurs installé au sub-project `02`
- **Migration incomplète** : un asset oublié ne se manifeste que par une image absente sur une page peu visitée. La vérification doit comparer les inventaires, pas se fier à un coup d'œil
- **Suppression prématurée du volume** : ne retirer le volume qu'après avoir constaté que les pages se chargent depuis R2. Les fichiers du volume sont la seule copie tant que la migration n'est pas vérifiée
- **`ASSETS_PATH` résiduelle** : elle n'est pas déclarée dans la validation d'environnement, seulement lue en direct dans `src/server/config/assets.ts`, plus deux fichiers de test qui la posent eux-mêmes. Cette lecture disparaît, et la rule doit suivre, sans quoi elle décrirait un mécanisme qui n'existe plus
- **Coût des opérations** : chaque asset servi devient un `GetObject`, facturé en Class B. Le plan gratuit couvre 10 millions de requêtes mensuelles, largement au-delà du trafic du site, mais la politique de cache d'un an reste ce qui maintient ce nombre bas
- **Latence ajoutée** : la lecture passe d'un accès disque local à un appel réseau. Sur des assets servis avec un cache d'un an, l'effet reste marginal, mais le premier chargement d'une page est concerné
