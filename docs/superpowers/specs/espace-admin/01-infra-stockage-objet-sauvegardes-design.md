---
feature: "Feature 1 — Espace admin"
subproject: "infra-stockage-objet-sauvegardes"
goal: "Provisionner Cloudflare R2 et mettre en place une sauvegarde de la base portfolio dont la restauration est vérifiée"
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-08-30"
---

# Infrastructure de stockage objet et sauvegardes vérifiées

## Scope

Provisionner un compte Cloudflare R2 avec trois buckets cloisonnés — `portfolio-backups`, `portfolio-assets` et `portfolio-assets-dev` — chacun servi par un token restreint à lui seul, puis configurer dans Dokploy une destination de sauvegarde et une sauvegarde quotidienne de la base `portfolio`, dont la restauration est effectivement vérifiée.

Les deux buckets d'assets sont créés ici mais restent vides : la bascule du stockage applicatif leur appartient au sub-project `09`. Ce sub-project ne touche à aucun code, n'ajoute aucune variable à `src/env.ts` et ne modifie que deux fichiers de documentation.

### État livré

À la fin de ce sub-project, on peut : constater qu'une sauvegarde automatique de la base `portfolio` est présente dans `portfolio-backups`, la restaurer depuis l'interface Dokploy vers une base jetable, et interroger cette base restaurée pour y retrouver les projets du site.

## Dependencies

Aucune — ce sub-project est autoporté.

## Files touched

- **À modifier** : `docs/PRODUCTION.md` (réécriture complète de la section « Backup & Recovery », qui documente aujourd'hui une procédure par script bash et cron VPS jamais appliquée)
- **À modifier** : `docs/superpowers/specs/espace-admin/README.md` (la ligne « Aucune destination configurée à ce jour » de la section Infrastructure devient caduque)

Aucun autre fichier du dépôt n'est touché. Le reste des opérations vit hors du dépôt : console Cloudflare, CLI Wrangler, interface Dokploy.

## Architecture approach

**Trois buckets, trois tokens, aucun recouvrement.** `portfolio-backups` reçoit les dumps écrits par Dokploy, `portfolio-assets` recevra plus tard les fichiers écrits par l'application en production, et `portfolio-assets-dev` ceux du développement local. Chacun est servi par un token `Object Read & Write` restreint à son seul bucket, ce qui est le seul niveau de permission R2 à supporter le cloisonnement : les permissions `Admin` portent sur le compte entier. L'objectif est double, qu'une compromission de l'application ne donne aucun moyen d'effacer les sauvegardes, et qu'une manipulation locale ne puisse pas atteindre les assets de production.

Le free tier R2 est un forfait d'usage mensuel — 10 Go-mois, 1 M d'opérations Class A, 10 M Class B, egress gratuit — que la grille tarifaire de Cloudflare exprime sans jamais le rapporter à un bucket. Multiplier les buckets n'ouvre donc aucun quota supplémentaire mais n'en consomme pas non plus : la séparation ne coûte rien.

**Juridiction `eu` sur les trois buckets**, garantissant la résidence des données dans l'Union européenne. Ce choix est définitif après création et l'endpoint S3 devient `https://<account-id>.eu.r2.cloudflarestorage.com`. Le flag `--jurisdiction eu` doit être répété sur chaque commande Wrangler visant ces buckets, `info` et `lifecycle` compris. Détails dans `docs/knowledges/cloudflare-r2.md`.

**Provisionnement en CLI, sauf les tokens.** Wrangler couvre la création et l'inspection des buckets, mais ne sait pas créer de token API : cette étape reste au dashboard Cloudflare et constitue le seul passage manuel obligatoire.

**Sauvegarde par le mécanisme natif Dokploy**, qui exécute `pg_dump`, compresse en `.gz` et transfère via rclone. Aucun script maison sur le VPS, aucun fichier non versionné à maintenir, et surtout une restauration intégrée à l'interface qui demande le nom de la base cible, ce qui permet de tester sans toucher à la base de production. Procédure et champs attendus dans `docs/knowledges/dokploy.md`.

**Rétention portée d'un seul côté.** Le champ `retentionDays` de la sauvegarde Dokploy est fixé à 30. Aucune lifecycle rule R2 n'est posée sur `portfolio-backups` : cumuler les deux mécanismes ferait silencieusement gagner le plus court des deux.

**Planification à `0 0 * * *` en UTC**, soit 1h en heure d'hiver et 2h en heure d'été à Paris. Le planificateur Dokploy travaillant en UTC, cette dérive saisonnière est inévitable ; elle est sans conséquence puisque les deux horaires précèdent le scan antivirus du VPS, et qu'un dump de cette base se compte en secondes.

Rules applicables : `.claude/rules/nextjs/production-deployment.md` pour les conventions de déploiement et de secrets, `.claude/rules/docker-compose/compose.md` pour le volume d'assets qui reste en place jusqu'au sub-project `09`.

## Acceptance criteria

### Scénario 1 : Cloisonnement des tokens
**GIVEN** trois tokens R2 créés en `Object Read & Write`, restreints respectivement à `portfolio-backups`, `portfolio-assets` et `portfolio-assets-dev`
**WHEN** on tente de lister le contenu de `portfolio-backups` avec le token destiné aux assets de production
**THEN** l'opération est refusée
**AND** la même opération avec le token de sauvegarde réussit
**AND** le token de développement ne voit ni `portfolio-backups` ni `portfolio-assets`

### Scénario 2 : Juridiction effective
**GIVEN** les trois buckets créés avec `--jurisdiction eu`
**WHEN** on exécute `wrangler r2 bucket info` sur chacun d'eux en passant `--jurisdiction eu`
**THEN** les trois buckets sont trouvés et rapportent la juridiction européenne
**AND** la même commande sans le flag ne les trouve pas

### Scénario 3 : Destination Dokploy valide
**GIVEN** une Backup Destination renseignée avec l'endpoint `https://<account-id>.eu.r2.cloudflarestorage.com`, le bucket `portfolio-backups` et le token de sauvegarde
**WHEN** on déclenche le test de connexion avant enregistrement
**THEN** Dokploy rapporte un succès

### Scénario 4 : Sauvegarde effectivement écrite
**GIVEN** une sauvegarde planifiée sur la Database `portfolio`, `retentionDays` à 30 et le cron `0 0 * * *`
**WHEN** on déclenche une exécution manuelle depuis l'onglet Backup
**THEN** un objet compressé horodaté apparaît dans `portfolio-backups`
**AND** sa taille est non nulle

### Scénario 5 : Restauration vérifiée
**GIVEN** l'objet de sauvegarde présent dans le bucket
**WHEN** on lance une restauration depuis l'interface Dokploy en indiquant une base cible jetable, distincte de `portfolio`
**THEN** la restauration aboutit
**AND** un `SELECT` sur la table `Project` de cette base jetable retourne le même nombre de lignes que dans la base de production
**AND** la base `portfolio` est restée intacte

### Scénario 6 : Documentation alignée sur le réel
**GIVEN** la sauvegarde en place et la restauration vérifiée
**WHEN** on relit la section « Backup & Recovery » de `docs/PRODUCTION.md`
**THEN** elle décrit la voie Dokploy, sa planification, sa rétention et la procédure de restauration réellement testée
**AND** elle ne contient plus le script `/opt/backup.sh`, la configuration rclone manuelle ni la ligne de crontab
**AND** la ligne du README de l'espace admin signalant l'absence de destination a disparu

## Edge cases

- **Échec silencieux de la sauvegarde planifiée** : plusieurs incidents Dokploy propres à R2 ont été rapportés, dont des cas où la commande rclone passe manuellement mais échoue en automatique. Une destination qui s'enregistre correctement ne prouve donc rien : seule la présence d'un objet dans le bucket fait foi. Les références sont listées dans `docs/knowledges/cloudflare-r2.md`
- **Nom de container Dokploy suffixé** : la Database porte un `appName` avec suffixe généré. Contrairement au script bash qu'on remplace, la voie native n'a pas à le connaître, ce qui supprime une cause de casse silencieuse lors d'un redéploiement
- **Volume d'assets non sauvegardé** : le script documenté couvrait aussi le volume `portfolio_assets`, ce que la sauvegarde de base Dokploy ne fait pas. Risque temporaire accepté, le volume étant retiré au sub-project `09` au profit de R2 qui devient la source de vérité. Monter une sauvegarde de volume pour un composant dont le retrait est planifié n'est pas justifié
- **Première sauvegarde d'une base déjà en production** : l'opération est en lecture seule sur `portfolio`, mais reste à déclencher hors des heures de déploiement pour éviter toute contention
- **Bucket `portfolio-assets` vide pendant plusieurs sub-projects** : c'est attendu. Il est créé maintenant parce que sa juridiction est définitive et qu'un seul passage dans la console Cloudflare vaut mieux que deux

## Architectural decisions

### Décision : mécanisme de sauvegarde

**Options envisagées :**
- **A. Script `/opt/backup.sh` avec rclone et cron VPS** : c'est la procédure déjà écrite dans `docs/PRODUCTION.md`, jamais appliquée. Elle couvre la base et le volume d'assets en une seule passe et ne dépend pas de Dokploy. En contrepartie, le script vit hors du dépôt, n'est pas versionné, dépend de noms de containers suffixés qui changent au redéploiement, et sa restauration est entièrement manuelle.
- **B. Mécanisme natif Dokploy** : destination et planification dans l'interface, `pg_dump` et transfert rclone pris en charge, restauration depuis l'interface avec choix de la base cible. Ne couvre pas le volume d'assets dans la même opération, et ajoute une dépendance au bon fonctionnement de Dokploy.

**Choix : B**

**Rationale :**
- La restauration intégrée permet de viser une base jetable, donc de vérifier une sauvegarde sans risque pour la production. C'est précisément ce qui manque le plus aujourd'hui, davantage que la sauvegarde elle-même
- Le script de l'option A dépend d'un `appName` Dokploy suffixé, que sa propre documentation invite à vérifier avant de figer : une sauvegarde qui casse silencieusement au premier redéploiement est pire qu'une absence de sauvegarde, parce qu'elle donne l'illusion d'être protégé
- Un script non versionné sur le VPS échappe à toute revue et à toute reprise après réinstallation
- Le seul avantage réel de A, la couverture du volume d'assets, disparaît au sub-project `09`
