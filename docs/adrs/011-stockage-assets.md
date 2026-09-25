---
title: "ADR-011 — Stockage assets : volumes Docker (MVP) → Cloudflare R2 (post-MVP)"
status: "accepted"
description: "Décision actée : volumes Docker pour le MVP, migration vers Cloudflare R2 lors de l'implémentation de l'upload depuis l'espace admin"
date: "2026-03-31"
keywords: ["architecture", "adr", "storage", "assets", "docker", "cloudflare-r2"]
scope: ["docs", "architecture"]
technologies: ["Docker", "Next.js", "Cloudflare R2"]
---

# 🎯 Contexte

Le portfolio expose des assets publics : CV PDF téléchargeable, images de projets, documents publics. Ces fichiers doivent être accessibles via l'application Next.js.

**Contrainte actée (indépendante du choix de stockage) :** les assets ne sont jamais servis depuis le dossier `public/` du repo Git. Ce dossier est copié dans le container au moment du build et ne supporte pas le contenu dynamique (nouvelle version du CV = commit + redéploiement). Les assets sont systématiquement servis via une route API dédiée (`/api/assets/[...path]`), qui lit le fichier depuis le backend (volume ou bucket selon l'option retenue).

---

# 🧩 Problème

Où stocker les assets publics du portfolio, en tenant compte du budget, de la simplicité et de l'évolutivité ?

---

# 🛠️ Options Envisagées

## Option A : Volumes Docker (MVP)

**Description :** Assets stockés dans un volume Docker persistant, montés dans le container Next.js. Servis exclusivement via route API (`/api/assets/[...path]` → lecture fs → stream de la réponse).

**Avantages :**
- Zéro coût supplémentaire
- Simple à mettre en place sur Dokploy (volume déclaré dans Docker Compose)
- Suffisant pour le volume d'assets du MVP (quelques dizaines de fichiers)
- Cohérent avec la philosophie self-hosted du projet

**Inconvénients :**
- Non adapté si le volume de fichiers grossit significativement
- Pas de CDN, performance dégradée pour des assets lourds servis depuis le VPS IONOS
- Upload d'assets via l'espace admin nécessite la gestion du volume Docker (montage, chemins)
- Backup à gérer manuellement, si le volume est perdu (crash disque, manipulation), les assets sont irrécupérables sans stratégie de sauvegarde explicite
- Incompatible avec un déploiement multi-instance (volumes non partagés entre replicas)

**Coût estimé :** Nul

## Option B : Cloudflare R2 (object storage cloud)

**Description :** Assets stockés dans un bucket Cloudflare R2. Accès via SDK S3-compatible depuis la route API Next.js. CDN Cloudflare inclus.

**Avantages :**
- CDN global, performances optimales
- Scalable à l'infini
- Indépendant du serveur applicatif (haute dispo)
- Zero egress cost (spécificité R2 vs S3)

**Inconvénients :**
- Dépendance à un service cloud externe (philosophie self-hosted partiellement rompue)
- Coût faible mais non nul (~0.015$/Go/mois)
- Surdimensionné pour quelques dizaines de fichiers MVP

**Coût estimé :** ~0-3€/mois selon usage

## Option C : Minio self-hosted (object storage sur VPS)

**Description :** Instance Minio déployée sur le même VPS IONOS via Dokploy. Interface S3-compatible, accès via SDK depuis la route API Next.js.

**Avantages :**
- Zéro coût cloud, tout sur le VPS IONOS existant
- Cohérent avec la philosophie self-hosted (Dokploy, PostgreSQL, n8n)
- API S3-compatible, migration vers R2 possible sans changer le code applicatif
- Interface admin Minio pour gérer les fichiers sans dashboard custom

**Inconvénients :**
- Service supplémentaire à opérer et maintenir sur le VPS
- Ressources VPS partagées (RAM, CPU) avec Next.js + PostgreSQL
- Pas de CDN natif, même limitation de performance que l'Option A pour les assets lourds
- Backup toujours à gérer (les données Minio sont sur le VPS, pas sauvegardées automatiquement)

**Coût estimé :** Nul (inclus dans le VPS IONOS existant)

---

# 🎉 Décision

**Option A actée pour le MVP : Volumes Docker.**

Zéro coût, zéro service supplémentaire, suffisant pour les assets du MVP (CV PDF, screenshots projets). Cohérent avec la philosophie self-hosted.

**Migration post-MVP vers Option B (Cloudflare R2) :** déclenchée par l'implémentation de l'upload d'assets depuis l'espace admin. À ce moment, la gestion des chemins de volume Docker devient complexe et R2 (SDK S3-compatible, free tier 10 Go, zéro frais de sortie) est la solution naturelle. L'Option C (Minio self-hosted) reste envisageable mais R2 est préféré : zéro opération supplémentaire sur le VPS, free tier largement suffisant.

---

# 🔄 Conséquences

## Positives

- Zéro coût et zéro infrastructure supplémentaire pour le MVP
- Volume persistant entre les redéploiements, sans opération supplémentaire sur le VPS
- La contrainte "route API uniquement" (pas de `public/`) étant actée, une migration ultérieure ne touche que la couche d'accès au fichier

## Négatives

- Backup du volume Docker à mettre en place manuellement (risque de perte)
- Pas de CDN, performance moindre pour des assets lourds servis hors Europe
- Migration vers R2 à prévoir dès l'upload depuis l'espace admin, avec sa dépendance cloud et son coût variable

---

# 📝 Notes complémentaires

**Pattern commun aux trois options :** route API `/api/assets/[...path]` → stream du fichier depuis le backend (fs pour A, SDK S3 pour B et C). Le code applicatif diffère uniquement dans la couche d'accès au fichier : un chemin disque configuré par `ASSETS_PATH` pour l'Option A, des credentials et un fetch signé pour B et C.

**Workflow dev local / prod de l'Option A, remplacé au sub-project `espace-admin/09` (cf. dernière note) :**
- Dev local : dossier `./assets/` à la racine du projet (gitignored), `ASSETS_PATH=./assets` dans `.env`
- Prod Docker : volume `portfolio_assets` monté sur `/app/assets` dans le container, `ASSETS_PATH=/app/assets` fixé dans `compose.yaml`
- Le volume Docker persiste entre les redéploiements, remplacer le container ne supprime pas les fichiers

**Trigger migration vers R2 :** dès l'implémentation de l'upload depuis l'espace admin. R2 est préféré à Minio : zéro service à opérer, free tier 10 Go, zéro frais de sortie (egress), SDK S3-compatible.

Cf. [ADR-005](005-hebergement-dokploy-vs-vercel.md) pour le contexte infrastructure Dokploy (même contrainte d'absence de CDN global).

**Évolution post-implémentation, route catch-all + sous-dossiers :** la route a été refactorée de `/api/assets/[filename]` (flat, single-segment) vers `/api/assets/[...path]` (catch-all, segments multiples validés individuellement). L'organisation sur disque compte trois racines : `projets/{client,personal}/<slug>/<filename>` où `<slug>` correspond au slug DB (Company.slug pour les CLIENT, Project.slug pour les PERSONAL), `documents/cv/` (CV PDF par locale) et `branding/` (logo, portrait). Motivation : lisibilité filesystem quand le volume grossit (covers + logos + screenshots case-study), cohérence avec les slugs DB, mêmes garanties sécurité (Zod par segment, path traversal check, profondeur max 5 segments). Détails : `.claude/rules/nextjs/assets.md`.

**Cinq buckets R2 provisionnés au sub-project `espace-admin/01` :** `portfolio-backups` (sauvegardes base de données, sans rapport avec les assets), `portfolio-assets` / `portfolio-assets-dev` (vitrine, migration effective au sub-project `09`), `portfolio-admin` / `portfolio-admin-dev` (back-office, première écriture au sub-project `10`). Chacun servi par un token `Object Read & Write` restreint à lui seul.

**Critère du partage vitrine / back-office :** pas « qui édite », l'espace admin écrit dans les deux, mais « servi par une route publique ou non ». `portfolio-assets` couvre tout ce que `/api/assets` sert sans authentification ; `portfolio-admin` tout ce qui n'est lu qu'authentifié.

**Miroir avec les schemas de la base ([ADR-018](018-cloisonnement-donnees.md)) :** `public` ↔ `portfolio-assets`, `freelance` ↔ `portfolio-admin/freelance/`, sous-dossier par domaine (`crm`, `administration`, `vente`) ajouté quand le besoin arrive. Une clé d'objet dit alors à elle seule quel schema la référence, quel bucket la porte, quelle route la sert et quel token y accède.

**À venir avec le domaine freelance, bucket `documents-prives` :** pendant de la base du même nom, token détenu par le seul service `rag-documents`, dépôt depuis l'admin via l'API interne du service.

**Le RAG lit en place :** token lecture seule et liste de préfixes autorisés, clé + ETag + date d'indexation en base. Pas de dossier `rag/`, pas de copie : une copie diverge de son original et « ce qui est indexé » est une décision, pas un emplacement.

**Migration vers R2 réalisée (2026-09-14, sub-project `espace-admin/09`) :** la lecture bascule du volume Docker vers le bucket `portfolio-assets`, juridiction `eu`. Le bucket reste privé, servi exclusivement par la route `/api/assets/[...path]`, aucun domaine public n'étant configuré. L'arborescence change avec elle : les fichiers d'un projet client passent sous le slug du projet, les logos d'entreprise partent dans `portfolio-admin` sous `freelance/crm/entreprises/<slug>/`. En développement, `portfolio-assets-dev` joue le même rôle avec son propre token. Le volume Docker devient mort et se retire après quelques jours d'observation.

**Exception pour le logo d'entreprise (2026-09-22, amendement du sub-project `espace-admin/09`) :** le logo reste dans `portfolio-admin`, sous `freelance/crm/entreprises/<slug>/`, comme donnée du CRM, mais la page publique d'un projet client l'affiche : `/api/assets/[...path]` sert ces seules clés depuis le bucket admin, sans session et sans cache, et seulement si l'entreprise a un projet publié : le logo d'un prospect du CRM reste invisible. Le critère « servi par une route publique ou non » se lit donc au dossier, plus au bucket, pour cette seule exception. Un projet personnel, rattaché à l'entreprise du freelance lui-même, ne montre jamais cette fiche : un badge « Projet personnel » la remplace.

**Route de lecture du back-office (2026-09-21, sub-project `espace-admin/10`) :** `portfolio-admin` se lit par `/admin/api/assets/[...path]`, sous la garde de session de l'espace admin et avec son propre token. Elle répond toujours `no-cache, no-store, must-revalidate`, un fichier du back-office se remplaçant sur sa clé quand un asset public change de nom à chaque version et se sert `immutable`. Une image affichée depuis cette route passe `unoptimized` à `next/image` : l'optimiseur rejoue la requête sans cookie et se ferait refuser.
