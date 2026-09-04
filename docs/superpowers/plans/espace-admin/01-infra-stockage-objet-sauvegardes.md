# Infrastructure de stockage objet et sauvegardes vérifiées — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provisionner Cloudflare R2 avec trois buckets cloisonnés et obtenir une sauvegarde quotidienne de la base `portfolio` dont la restauration est effectivement vérifiée.

**Architecture:** Trois buckets en juridiction européenne, chacun servi par un token restreint à lui seul, de sorte qu'une compromission de l'application ne donne aucun accès aux sauvegardes et qu'une manipulation locale n'atteigne jamais les assets de production. La sauvegarde s'appuie sur le mécanisme natif Dokploy (`pg_dump` puis transfert rclone), en remplacement d'un script bash documenté mais jamais appliqué. La validation ne repose pas sur l'enregistrement réussi d'une configuration mais sur la présence réelle d'un objet dans le bucket et sur une restauration menée jusqu'à une requête SQL.

**Tech Stack:** Cloudflare R2, Wrangler CLI, Dokploy (S3 Destinations, Database Backups), PostgreSQL 18, rclone (embarqué par Dokploy).

**Spec:** `docs/superpowers/specs/espace-admin/01-infra-stockage-objet-sauvegardes-design.md`

## Global Constraints

- Buckets : `portfolio-backups`, `portfolio-assets` et `portfolio-assets-dev`, tous créés avec `--jurisdiction eu`. **La juridiction est définitive après création** : un bucket créé sans ce flag doit être détruit et recréé.
- Le free tier R2 est un **forfait d'usage mensuel** (10 Go-mois, 1 M d'opérations Class A, 10 M Class B, egress gratuit), que la grille tarifaire Cloudflare n'exprime jamais par bucket : trois buckets ne coûtent donc pas plus que deux. Il ne couvre que le stockage Standard, pas l'Infrequent Access.
- Le flag `--jurisdiction eu` (alias `--J`) doit être répété sur **chaque** commande Wrangler visant ces buckets, `info` et `lifecycle` compris. Sans lui, la commande cherche dans la juridiction par défaut et ne trouve rien.
- Endpoint S3 résultant : `https://<account-id>.eu.r2.cloudflarestorage.com`, sans nom de bucket.
- Trois tokens distincts en `Object Read & Write`, chacun restreint à un seul bucket. Les permissions `Admin` sont interdites ici : elles portent sur le compte entier et ne peuvent pas être restreintes.
- Rétention : le champ s'appelle **`Keep the latest`** (`keepLatestCount`) et compte des **sauvegardes, pas des jours** — sa description dit « only keeps the latest N backups in the cloud ». Avec la planification quotidienne retenue, `30` donne trente sauvegardes, donc trente jours : toute modification de la fréquence change la fenêtre réelle. Laisser le champ vide conserve tout. **Aucune lifecycle rule R2** ne doit être créée sur `portfolio-backups` : cumuler les deux mécanismes fait silencieusement gagner le plus court.
- Planification : `0 0 * * *` en UTC.
- Les buckets `portfolio-assets` et `portfolio-assets-dev` sont créés mais restent vides. Aucune variable d'environnement R2 n'est ajoutée à `src/env.ts`, qui est fail-fast et casserait le démarrage sans code consommateur. Ces deux points appartiennent au sub-project `09`.
- Le volume Docker `portfolio_assets` n'est pas sauvegardé. Risque temporaire assumé et documenté, ce volume disparaissant au sub-project `09`.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur, conformément à la discipline commit du projet.

**Références à consulter, pas à recopier :** `docs/knowledges/cloudflare-r2.md` (juridiction, tokens, classes d'opérations, limites), `docs/knowledges/dokploy.md` § « Sauvegardes et destinations S3 » (champs de la destination, rclone, API). Rules applicables : `.claude/rules/nextjs/production-deployment.md`, `.claude/rules/docker-compose/compose.md`.

---

### Task 1 : Créer les trois buckets R2 en juridiction européenne

**Files:** aucun fichier du dépôt. Opérations en CLI sur le compte Cloudflare.

**Interfaces:**
- Consomme : un compte Cloudflare actif.
- Produit : les buckets `portfolio-backups`, `portfolio-assets` et `portfolio-assets-dev` en juridiction `eu`, et l'**account ID** Cloudflare, nécessaire à la Task 3 pour construire l'endpoint.

- [ ] **Step 1: Installer Wrangler et s'authentifier**

```bash
pnpm add -g wrangler
wrangler login
```

`wrangler login` ouvre un flux OAuth dans le navigateur. Ce flux est distinct des tokens R2 créés en Task 2 : il authentifie le CLI, il ne sert pas aux applications.

- [ ] **Step 2: Créer les trois buckets**

```bash
wrangler r2 bucket create portfolio-backups     --jurisdiction eu
wrangler r2 bucket create portfolio-assets      --jurisdiction eu
wrangler r2 bucket create portfolio-assets-dev  --jurisdiction eu
```

Les sauvegardes, les assets de production, et les assets de développement. Séparer les deux derniers suit le principe déjà appliqué à PostgreSQL, où le développement tourne sur sa propre base et non sur celle de production. Le forfait gratuit étant exprimé en usage mensuel et non par bucket, cette séparation ne coûte rien.

- [ ] **Step 3: Vérifier que les buckets existent bien en juridiction eu**

```bash
wrangler r2 bucket info portfolio-backups     --jurisdiction eu
wrangler r2 bucket info portfolio-assets      --jurisdiction eu
wrangler r2 bucket info portfolio-assets-dev  --jurisdiction eu
```

Attendu : les trois commandes retournent les informations du bucket.

- [ ] **Step 4: Vérifier que l'omission du flag ne les trouve pas**

```bash
wrangler r2 bucket info portfolio-backups
```

Attendu : échec ou bucket introuvable. Ce comportement est normal et confirme que la juridiction est bien appliquée. Si cette commande **réussit**, le bucket a été créé sans juridiction : le détruire avec `wrangler r2 bucket delete portfolio-backups` et reprendre au Step 2.

- [ ] **Step 5: Relever l'account ID**

L'account ID est visible dans le dashboard Cloudflare, page R2, ou dans la sortie de :

```bash
wrangler whoami
```

Le noter : il compose l'endpoint `https://<account-id>.eu.r2.cloudflarestorage.com` utilisé en Task 3.

---

### Task 2 : Créer trois tokens API cloisonnés

**Files:** aucun fichier du dépôt. Opération manuelle au dashboard Cloudflare.

**Interfaces:**
- Consomme : les trois buckets de la Task 1.
- Produit : trois paires Access Key ID / Secret Access Key. Celle du bucket de sauvegardes est consommée par la Task 3 ; celles des assets sont mises de côté pour le sub-project `09`.

> Wrangler ne sait pas créer de token R2. Les flags `--token` des commandes consomment un token existant, ils n'en produisent pas. Cette étape est le seul passage manuel obligatoire du sub-project.

- [ ] **Step 1: Créer le token de sauvegarde**

Dans le dashboard Cloudflare : **R2** → **Manage API tokens** → **Create User API Token**.

- Permission : **Object Read & Write**
- Portée : **Apply to specific buckets only** → sélectionner **uniquement** `portfolio-backups`
- TTL : laisser « Forever »

**La Secret Access Key ne s'affiche qu'une seule fois.** La copier immédiatement dans le gestionnaire de secrets avant de fermer la page. Elle n'est pas récupérable ensuite, seule une rotation est possible.

- [ ] **Step 2: Créer les deux tokens applicatifs**

Répéter l'opération deux fois, avec la permission **Object Read & Write** :

| Token | Portée | Usage |
|---|---|---|
| production | **uniquement** `portfolio-assets` | variables Dokploy |
| développement | **uniquement** `portfolio-assets-dev` | `.env` local |

Deux tokens et non un seul couvrant les deux buckets : un token local capable d'atteindre la production annulerait la séparation, puisqu'une variable `R2_BUCKET` mal renseignée suffirait alors à écrire au mauvais endroit.

Ces tokens ne seront utilisés qu'au sub-project `09`. Les créer maintenant évite un second passage dans la console.

- [ ] **Step 3: Vérifier le cloisonnement**

Configurer temporairement le CLI AWS ou tout client S3 avec le token **assets**, puis tenter de lister le bucket de sauvegardes :

```bash
AWS_ACCESS_KEY_ID=<clé du token assets> \
AWS_SECRET_ACCESS_KEY=<secret du token assets> \
aws s3 ls s3://portfolio-backups \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com \
  --region auto
```

Attendu : **refus d'accès**. C'est le critère du scénario 1 du spec.

- [ ] **Step 4: Vérifier que le bon token fonctionne**

```bash
AWS_ACCESS_KEY_ID=<clé du token backups> \
AWS_SECRET_ACCESS_KEY=<secret du token backups> \
aws s3 ls s3://portfolio-backups \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com \
  --region auto
```

Attendu : succès, avec un listing vide puisque aucune sauvegarde n'a encore été écrite.

---

### Task 3 : Configurer la destination et la sauvegarde dans Dokploy

**Files:** aucun fichier du dépôt. Opérations dans l'interface Dokploy.

**Interfaces:**
- Consomme : l'account ID de la Task 1, la paire de clés du token `portfolio-backups` de la Task 2.
- Produit : une Backup Destination nommée et une sauvegarde planifiée sur la Database `portfolio`, consommées par la Task 4.

- [ ] **Step 1: Créer la Backup Destination**

Dans Dokploy : **Settings** → **S3 Destinations** (`/dashboard/settings/destinations`) → **Add Destination**.

| Champ | Valeur |
|---|---|
| Name | `cloudflare-r2-backups` |
| Provider | `Cloudflare R2 Storage` |
| Access Key Id | clé du token `portfolio-backups` |
| Secret Access Key | secret du même token |
| Bucket | `portfolio-backups` |
| Region | `auto` |
| Endpoint | `https://<account-id>.eu.r2.cloudflarestorage.com` |

L'endpoint ne porte **pas** le nom du bucket, qui est un champ distinct. Le select `Provider` a une entrée dédiée à R2 : ne pas retomber sur `Amazon Web Services (AWS) S3`.

> **Sur le champ Region** : R2 ignore la région, et `auto` est la valeur canonique côté client S3. La documentation Dokploy évoque de son côté des codes régionaux (`WEUR`, `ENAM`…). Commencer par `auto` et ne basculer sur `WEUR` que si le test de connexion du Step 2 échoue sur ce champ. À ne pas confondre avec la juridiction, qui est un mécanisme distinct déjà fixé à la création du bucket.

- [ ] **Step 2: Tester la connexion avant d'enregistrer**

Utiliser le bouton de test de connexion de Dokploy. Attendu : message de succès.

C'est le seul retour immédiat disponible. Une destination invalide enregistrée sans test ne se signalera qu'à l'échec de la première sauvegarde planifiée, potentiellement le lendemain.

Si le test échoue, vérifier dans l'ordre : l'endpoint contient bien `.eu.` (juridiction européenne), le nom du bucket n'a pas été collé dans l'endpoint, la clé utilisée est celle du token `portfolio-backups` et non celle des assets.

- [ ] **Step 3: Planifier la sauvegarde de la base**

Ouvrir la Database `portfolio` dans Dokploy, onglet **Backup**, puis créer une sauvegarde :

| Champ | Valeur |
|---|---|
| Destination | `cloudflare-r2-backups` |
| Schedule | `0 0 * * *` |
| Database | `portfolio` |
| Keep the latest | `30` |

Le planificateur Dokploy travaille en UTC : `0 0 * * *` correspond à 1h du matin à Paris en heure d'hiver et 2h en heure d'été. Cette dérive saisonnière est sans conséquence, les deux horaires précédant le scan antivirus du VPS programmé à 3h.

- [ ] **Step 4: Ne créer aucune lifecycle rule sur le bucket**

Vérifier qu'aucune règle n'existe :

```bash
wrangler r2 bucket lifecycle list portfolio-backups --jurisdiction eu
```

Attendu : aucune règle. La rétention est portée par `Keep the latest` côté Dokploy uniquement. En ajouter une ici ferait doublon, et la plus courte des deux l'emporterait sans avertissement.

---

### Task 4 : Vérifier la sauvegarde et la restauration

**Files:** aucun fichier du dépôt.

**Interfaces:**
- Consomme : la sauvegarde planifiée de la Task 3.
- Produit : la preuve que la chaîne fonctionne de bout en bout. C'est le livrable central du sub-project.

> Plusieurs incidents Dokploy propres à R2 ont été rapportés, dont des cas où la commande rclone passe manuellement mais échoue en automatique. Une configuration qui s'enregistre ne prouve rien : seule la présence d'un objet fait foi. Références dans `docs/knowledges/cloudflare-r2.md`.

- [ ] **Step 1: Déclencher une sauvegarde manuelle**

Onglet **Backup** de la Database, bouton d'exécution manuelle.

- [ ] **Step 2: Vérifier qu'un objet a réellement été écrit**

```bash
AWS_ACCESS_KEY_ID=<clé du token backups> \
AWS_SECRET_ACCESS_KEY=<secret du token backups> \
aws s3 ls s3://portfolio-backups --recursive \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com \
  --region auto
```

Attendu : un objet compressé horodaté, **de taille non nulle**. Une taille de zéro octet signale un `pg_dump` qui a échoué mais dont le fichier a quand même été transféré.

Si aucun objet n'apparaît alors que Dokploy annonce un succès, consulter les logs du conteneur Dokploy pour la sortie rclone avant de poursuivre.

- [ ] **Step 3: Relever le nombre de lignes de référence**

Depuis la Database `portfolio` :

```sql
SELECT count(*) FROM "Project";
```

Noter le résultat, il sert de contrôle au Step 5.

- [ ] **Step 4: Restaurer vers une base jetable**

Onglet **Backup** → bouton **Restore**.

- Bucket : `portfolio-backups`
- Fichier : sélectionner l'objet du Step 2 (l'autocomplétion gère les dossiers imbriqués)
- Database cible : `portfolio_restore_test`

Saisir impérativement un nom distinct de `portfolio`. Ce champ existe précisément pour éviter d'écraser la base source.

- [ ] **Step 5: Interroger la base restaurée**

```sql
SELECT count(*) FROM "Project";
```

Exécuté sur `portfolio_restore_test`. Attendu : le même nombre qu'au Step 3.

- [ ] **Step 6: Vérifier que la base de production est intacte**

Rejouer la requête du Step 3 sur `portfolio`. Attendu : résultat inchangé.

- [ ] **Step 7: Supprimer la base jetable**

```sql
DROP DATABASE portfolio_restore_test;
```

---

### Task 5 : Mettre la documentation en accord avec le réel

**Files:**
- Modify: `docs/PRODUCTION.md` (section « 💾 Backup & Recovery »)
- Modify: `docs/superpowers/specs/espace-admin/README.md` (section Infrastructure)

**Interfaces:**
- Consomme : la configuration réelle des Tasks 1 à 4. La documentation décrit ce qui a été fait et vérifié, pas ce qui était prévu.
- Produit : deux fichiers versionnés à jour.

> ⚠️ **Relire `docs/PRODUCTION.md` avant d'écrire quoi que ce soit.** La section « 💾 Backup & Recovery » a été réécrite le 2026-09-03, hors de ce sub-project : elle annonce déjà le backup natif Dokploy vers R2 avec 30 jours de rétention, et porte des procédures de restauration et de perte VPS plus récentes que celles rédigées ici. **Compléter, jamais remplacer** : coller un bloc entier ferait régresser la procédure de perte VPS (elle mentionnerait un webhook GitHub là où le mécanisme réel est l'appel `compose.redeploy` de `deploy.yml`). Ce qui manque à la section actuelle est la configuration concrète, ci-dessous.

- [ ] **Step 1: Compléter la section « Backup & Recovery » de `docs/PRODUCTION.md`**

Ajouter, après la table de stratégie existante, le bloc de configuration ci-dessous. Les trois encadrés (juridiction, rétention portée d'un seul côté, assets) sont à vérifier avant ajout : si la section les porte déjà, ne pas les dupliquer.

````markdown
> **Rétention portée d'un seul côté** : la purge est assurée par le champ `Keep the latest` de Dokploy, qui compte des sauvegardes et non des jours. Aucune lifecycle rule n'est configurée sur le bucket R2. Cumuler les deux mécanismes ferait silencieusement gagner le plus court des deux.

> **Juridiction** : les buckets sont créés en juridiction `eu`, ce qui garantit la résidence des données dans l'Union européenne. Ce paramètre est définitif après création. Détails dans [knowledges/cloudflare-r2.md](knowledges/cloudflare-r2.md).

## Configuration Backup

La sauvegarde s'appuie sur le mécanisme natif Dokploy, sans script ni cron sur le VPS.

### 1. Buckets Cloudflare R2

```bash
wrangler r2 bucket create portfolio-backups     --jurisdiction eu
wrangler r2 bucket create portfolio-assets      --jurisdiction eu
wrangler r2 bucket create portfolio-assets-dev  --jurisdiction eu
```

> Trois buckets : les sauvegardes, les assets de production, les assets de développement. Le développement écrit dans son propre bucket comme il tourne déjà sur sa propre base et non sur celle de production. Le forfait gratuit étant exprimé en usage mensuel et non par bucket, cette séparation ne coûte rien.

> Le flag `--jurisdiction eu` doit être répété sur **chaque** commande visant ces buckets, `info` et `lifecycle` compris.

### 2. Tokens API

Trois tokens créés au dashboard Cloudflare (R2 → Manage API tokens), Wrangler ne sachant pas en produire :

| Token | Permission | Portée |
|---|---|---|
| Sauvegardes | Object Read & Write | `portfolio-backups` uniquement |
| Application (production) | Object Read & Write | `portfolio-assets` uniquement |
| Application (développement) | Object Read & Write | `portfolio-assets-dev` uniquement |

> Le token de l'application ne doit jamais voir le bucket de sauvegardes : une compromission du site ne doit pas permettre d'effacer les backups. Le token de développement ne doit jamais voir le bucket de production : une variable `R2_BUCKET` mal renseignée suffirait sinon à écrire au mauvais endroit. La Secret Access Key ne s'affiche qu'une fois à la création.

### 3. Destination Dokploy

`Settings → S3 Destinations → Add Destination` :

| Champ | Valeur |
|---|---|
| Name | `cloudflare-r2-backups` |
| Provider | `Cloudflare R2 Storage` |
| Access Key Id / Secret Access Key | token `portfolio-backups` |
| Bucket | `portfolio-backups` |
| Region | `auto` |
| Endpoint | `https://<account-id>.eu.r2.cloudflarestorage.com` |

Le bouton `Test Connection` avant d'enregistrer : c'est le seul retour immédiat, une destination invalide ne se signale sinon qu'à l'échec de la première sauvegarde planifiée.

### 4. Planification

Database `portfolio` → onglet `Backups` → `Create Backup` : `Destination` = `cloudflare-r2-backups`, `Database` = `portfolio`, `Schedule` = `0 0 * * *`, `Keep the latest` = `30`, `Enabled` coché.

> `Keep the latest` compte des **sauvegardes**, pas des jours : trente sauvegardes quotidiennes font trente jours, une autre fréquence changerait la fenêtre.

> Le planificateur Dokploy travaille en UTC, soit 1h à Paris en hiver et 2h en été.

### 5. Vérifier le setup

Ne pas se fier à l'enregistrement de la configuration : déclencher une sauvegarde manuelle et confirmer qu'un objet horodaté de taille non nulle apparaît dans le bucket. Des incidents Dokploy propres à R2 ont été rapportés, où la commande rclone passe manuellement mais échoue en automatique.
````

- [ ] **Step 2: Reprendre les trois points que la section actuelle porte différemment**

Les procédures de restauration et de perte VPS **existent déjà** et sont plus à jour que ce sub-project : ne pas les réécrire. Trois points seulement sont à traiter :

1. **Restauration vers une base jetable** : ajouter à la procédure de restauration existante le passage par une base de contrôle (`portfolio_restore_test`) avant d'écraser la base réelle, c'est ce que la Task 4 a vérifié et le champ « base cible » de Dokploy existe pour ça.
2. **Recréation de la Backup Destination** dans la procédure de perte VPS : les tokens Cloudflare survivent à la perte du VPS, la destination Dokploy non.
3. **Volume assets : tranché le 2026-09-03, non couvert.** Les assets migrent vers R2 au sub-project `09` et le volume Docker disparaît alors : configurer une sauvegarde de volume pour la démonter ensuite serait du travail à faire puis à défaire. Jusque-là, la source reste le dossier `assets/` local, celui qui a servi à remplir le volume. `docs/PRODUCTION.md` porte déjà cette décision et sa justification, ne pas la rouvrir ici.

Vérifier ensuite qu'aucune trace de l'ancienne procédure par script ne subsiste :

```bash
grep -n "backup.sh\|rclone config\|crontab" docs/PRODUCTION.md
```

Attendu : aucun résultat. La section Ressources peut conserver le lien vers la documentation rclone, qui reste pertinent puisque Dokploy s'en sert en interne.

- [ ] **Step 3: Mettre à jour le README de l'espace admin**

Dans `docs/superpowers/specs/espace-admin/README.md`, section Infrastructure, remplacer :

```markdown
- Dokploy gère nativement les sauvegardes (`backup`, `destination` S3). ⚠️ **Aucune destination configurée à ce jour** : soit le cron manuel du VPS tourne, soit il n'y a aucune sauvegarde. À vérifier en priorité.
```

par :

```markdown
- Sauvegardes en place depuis le sub-project `01` : destination Cloudflare R2 (`portfolio-backups`, juridiction `eu`), sauvegarde quotidienne de la base `portfolio` avec 30 jours de rétention, restauration vérifiée vers une base jetable. Le volume d'assets n'est pas couvert, il disparaît au sub-project `09`. Voir [PRODUCTION.md](../../../PRODUCTION.md).
```

- [ ] **Step 4: Mettre à jour `docs/ARCHITECTURE.md`**

Dans le diagramme « Livraison et sauvegarde », le nœud R2 porte `(portfolio-backups, post-MVP)`. Retirer la mention post-MVP, la sauvegarde étant en service à l'issue de ce sub-project.

- [ ] **Step 5: Relire la cohérence des trois fichiers**

Vérifier que la rétention est annoncée partout comme « 30 sauvegardes quotidiennes, soit 30 jours », que plus aucune mention de lifecycle rule R2 ne subsiste, et que les noms des trois buckets sont identiques d'un document à l'autre.

- [ ] **Step 6: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message, conformément à la discipline commit du projet. Message proposé :

```
docs(admin): sauvegardes R2 vérifiées et procédure Dokploy
```
