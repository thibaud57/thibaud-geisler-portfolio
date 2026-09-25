---
feature: "Feature 1 — Espace admin"
subproject: "infra-stockage-objet-sauvegardes"
goal: "Provisionner Cloudflare R2 et mettre en place une sauvegarde de la base portfolio dont la restauration est vérifiée"
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-09-03"
---

# Infrastructure de stockage objet et sauvegardes vérifiées

## Scope

Provisionner un compte Cloudflare R2 avec cinq buckets cloisonnés (`portfolio-backups`, `portfolio-assets`, `portfolio-assets-dev`, `portfolio-admin` et `portfolio-admin-dev`), chacun servi par un token restreint à lui seul, puis configurer dans Dokploy une destination de sauvegarde et une sauvegarde quotidienne de la base `portfolio`, dont la restauration est effectivement vérifiée.

Les quatre buckets applicatifs sont créés ici mais restent vides : la bascule de la vitrine vers `portfolio-assets` appartient au sub-project `09`, la première écriture dans `portfolio-admin` au sub-project `10`. Ce sub-project ne touche à aucun code, n'ajoute aucune variable à `src/env.ts` et ne modifie que trois fichiers de documentation.

### État livré

À la fin de ce sub-project, on peut : constater qu'une sauvegarde automatique de la base `portfolio` est présente dans `portfolio-backups`, la restaurer depuis l'interface Dokploy vers une base jetable, et interroger cette base restaurée pour y retrouver les projets du site.

## Dependencies

Aucune : ce sub-project est autoporté.

## Files touched

- **À modifier** : `docs/PRODUCTION.md` (compléter la section « Backup & Recovery » avec la configuration réelle : buckets, tokens, destination Dokploy, planification. La section a été réécrite le 2026-09-03 hors de ce sub-project et annonce déjà la voie Dokploy vers R2 ; ses procédures de restauration et de perte VPS y sont plus à jour que celles rédigées ici, ne pas les écraser)
- **À modifier** : `docs/superpowers/specs/espace-admin/README.md` (la ligne « Rien n'est sauvegardé à ce jour » de la section Infrastructure devient caduque)

- **À modifier** : `docs/ARCHITECTURE.md` (diagramme « Livraison et sauvegarde » : le bucket `portfolio-backups` n'est plus post-MVP ; diagramme Runtime : le nœud R2 nomme `portfolio-assets` et `portfolio-admin`)
- **À modifier** : `docs/registre-traitements.md` (Cloudflare R2 devient sous-traitant : sauvegardes de la base `portfolio`, qui contient les données d'authentification et, plus tard, celles du CRM. Juridiction `eu`, rétention 30 jours)
- **À modifier** : `docs/adrs/011-stockage-assets.md` (section Notes complémentaires : nommer les cinq buckets, poser le partage vitrine / back-office et son critère, « servi sans authentification ou non », le miroir schema ↔ bucket, et la règle « le RAG lit en place, jamais de copie » pour le bucket `documents-prives` à venir)

Aucun autre fichier du dépôt n'est touché. Le reste des opérations vit hors du dépôt : console Cloudflare, CLI Wrangler, interface Dokploy.

## Architecture approach

**Cinq buckets, cinq tokens, aucun recouvrement.** `portfolio-backups` reçoit les dumps écrits par Dokploy. `portfolio-assets` recevra la vitrine, tout ce que la route publique `/api/assets` sert sans authentification. `portfolio-admin` recevra le back-office, tout ce qui n'est lu qu'authentifié : le logo d'une entreprise dès cet epic, puis les documents du domaine freelance. `portfolio-assets-dev` et `portfolio-admin-dev` sont leurs jumeaux de développement local. Le partage entre les deux buckets applicatifs suit celui des schemas de la base, ADR-011 et ADR-018 : `public` ↔ `portfolio-assets`, `freelance` ↔ `portfolio-admin/freelance/`. Le schema qui possède la ligne possède le préfixe.

Chaque bucket est servi par un token `Object Read & Write` restreint à lui seul, ce qui est le seul niveau de permission R2 à supporter le cloisonnement : les permissions `Admin` portent sur le compte entier, et un token permanent se restreint à un bucket, jamais à un préfixe (le scoping par préfixe n'existe que pour les credentials temporaires). Un bucket par environnement plutôt qu'un préfixe `dev/` en découle. L'objectif est triple : qu'une compromission de l'application ne donne aucun moyen d'effacer les sauvegardes, qu'une manipulation locale ne puisse pas atteindre les données de production, et que la route publique ne détienne jamais un token capable de lire le back-office.

Le free tier R2 est un forfait d'usage mensuel (10 Go-mois, 1 M d'opérations Class A, 10 M Class B, egress gratuit) que la grille tarifaire de Cloudflare exprime sans jamais le rapporter à un bucket. Multiplier les buckets n'ouvre donc aucun quota supplémentaire mais n'en consomme pas non plus : la séparation ne coûte rien.

**Juridiction `eu` sur les cinq buckets**, garantissant la résidence des données dans l'Union européenne. Ce choix est définitif après création et l'endpoint S3 devient `https://<account-id>.eu.r2.cloudflarestorage.com`. Le flag `--jurisdiction eu` doit être répété sur chaque commande Wrangler visant ces buckets, `info` et `lifecycle` compris. Détails dans `docs/knowledges/cloudflare-r2.md`.

**Provisionnement en CLI, sauf les tokens.** Wrangler couvre la création et l'inspection des buckets, mais ne sait pas créer de token API : cette étape reste au dashboard Cloudflare et constitue le seul passage manuel obligatoire.

**Sauvegarde par le mécanisme natif Dokploy**, qui exécute `pg_dump`, compresse en `.gz` et transfère via rclone. Aucun script maison sur le VPS, aucun fichier non versionné à maintenir, et surtout une restauration intégrée à l'interface qui demande le nom de la base cible, ce qui permet de tester sans toucher à la base de production. Procédure et champs attendus dans `docs/knowledges/dokploy.md`.

**Rétention portée d'un seul côté.** Le champ `Keep the latest` de la sauvegarde Dokploy est fixé à 30. Aucune lifecycle rule R2 n'est posée sur `portfolio-backups` : cumuler les deux mécanismes ferait silencieusement gagner le plus court des deux.

**Planification à `0 0 * * *` en UTC**, soit 1h en heure d'hiver et 2h en heure d'été à Paris. Le planificateur Dokploy travaillant en UTC, cette dérive saisonnière est inévitable ; elle est sans conséquence puisque les deux horaires précèdent le scan antivirus du VPS, et qu'un dump de cette base se compte en secondes.

Rules applicables : `.claude/rules/nextjs/production-deployment.md` pour les conventions de déploiement et de secrets, `.claude/rules/docker-compose/compose.md` pour le volume d'assets qui reste en place jusqu'au sub-project `09`.

## Acceptance criteria

### Scénario 1 : Cloisonnement des tokens
**GIVEN** cinq tokens R2 créés en `Object Read & Write`, restreints respectivement à `portfolio-backups`, `portfolio-assets`, `portfolio-assets-dev`, `portfolio-admin` et `portfolio-admin-dev`
**WHEN** on tente de lister le contenu de `portfolio-backups` avec le token destiné aux assets de production
**THEN** l'opération est refusée
**AND** la même opération avec le token de sauvegarde réussit
**AND** le token `portfolio-assets` ne voit pas `portfolio-admin`
**AND** les tokens de développement ne voient aucun bucket de production ni `portfolio-backups`

### Scénario 2 : Juridiction effective
**GIVEN** les cinq buckets créés avec `--jurisdiction eu`
**WHEN** on exécute `wrangler r2 bucket info` sur chacun d'eux en passant `--jurisdiction eu`
**THEN** les cinq buckets sont trouvés et rapportent la juridiction européenne
**AND** la même commande sans le flag ne les trouve pas

### Scénario 3 : Destination Dokploy valide
**GIVEN** une Backup Destination renseignée avec l'endpoint `https://<account-id>.eu.r2.cloudflarestorage.com`, le bucket `portfolio-backups` et le token de sauvegarde
**WHEN** on déclenche le test de connexion avant enregistrement
**THEN** Dokploy rapporte un succès

### Scénario 4 : Sauvegarde effectivement écrite
**GIVEN** une sauvegarde planifiée sur la Database `portfolio`, `Keep the latest` à 30 et le cron `0 0 * * *`
**WHEN** on déclenche une exécution manuelle depuis l'onglet Backups
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
**AND** elle nomme les buckets, la destination Dokploy, la planification et la rétention réellement configurées, et ne renvoie plus à aucun script ni cron sur le VPS
**AND** la ligne du README de l'espace admin signalant l'absence de destination a disparu

## Edge cases

- **Échec silencieux de la sauvegarde planifiée** : plusieurs incidents Dokploy propres à R2 ont été rapportés, dont des cas où la commande rclone passe manuellement mais échoue en automatique. Une destination qui s'enregistre correctement ne prouve donc rien : seule la présence d'un objet dans le bucket fait foi. Les références sont listées dans `docs/knowledges/cloudflare-r2.md`
- **Nom de container Dokploy suffixé** : la Database porte un `appName` avec suffixe généré. Contrairement au script bash qu'on remplace, la voie native n'a pas à le connaître, ce qui supprime une cause de casse silencieuse lors d'un redéploiement
- **Volume d'assets non sauvegardé** : le script documenté couvrait aussi le volume `portfolio_assets`, ce que la sauvegarde de base Dokploy ne fait pas. Risque temporaire accepté, le volume étant retiré au sub-project `09` au profit de R2 qui devient la source de vérité. Monter une sauvegarde de volume pour un composant dont le retrait est planifié n'est pas justifié
- **Première sauvegarde d'une base déjà en production** : l'opération est en lecture seule sur `portfolio`, mais reste à déclencher hors des heures de déploiement pour éviter toute contention
- **Buckets applicatifs vides pendant plusieurs sub-projects** : c'est attendu. Ils sont créés maintenant parce que leur juridiction est définitive et qu'un seul passage dans la console Cloudflare vaut mieux que trois
- **CLI `aws` requise en local** pour les vérifications de cloisonnement et de présence d'objet : Wrangler ne sait pas lister un bucket avec un token S3 donné. L'installer avant de commencer (`winget install Amazon.AWSCLI` ou équivalent), elle ne sert qu'aux vérifications

## Architectural decisions

### Décision : mécanisme de sauvegarde

**Options envisagées :**
- **A. Script `/opt/backup.sh` avec rclone et cron VPS** : c'est la procédure qu'a longtemps décrite `docs/PRODUCTION.md` sans jamais être appliquée, et qui en a été retirée depuis. Elle couvre la base et le volume d'assets en une seule passe et ne dépend pas de Dokploy. En contrepartie, le script vit hors du dépôt, n'est pas versionné, dépend de noms de containers suffixés qui changent au redéploiement, et sa restauration est entièrement manuelle.
- **B. Mécanisme natif Dokploy** : destination et planification dans l'interface, `pg_dump` et transfert rclone pris en charge, restauration depuis l'interface avec choix de la base cible. Ne couvre pas le volume d'assets dans la même opération, et ajoute une dépendance au bon fonctionnement de Dokploy.

**Choix : B**

**Rationale :**
- La restauration intégrée permet de viser une base jetable, donc de vérifier une sauvegarde sans risque pour la production. C'est précisément ce qui manque le plus aujourd'hui, davantage que la sauvegarde elle-même
- Le script de l'option A dépend d'un `appName` Dokploy suffixé, que sa propre documentation invite à vérifier avant de figer : une sauvegarde qui casse silencieusement au premier redéploiement est pire qu'une absence de sauvegarde, parce qu'elle donne l'illusion d'être protégé
- Un script non versionné sur le VPS échappe à toute revue et à toute reprise après réinstallation
- Le seul avantage réel de A, la couverture du volume d'assets, disparaît au sub-project `09`
