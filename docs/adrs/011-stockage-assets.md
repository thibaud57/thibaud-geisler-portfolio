---
title: "ADR-011 — Stockage assets : volumes Docker (MVP) → Cloudflare R2 (post-MVP)"
status: "accepted"
description: "Décision actée : volumes Docker pour le MVP, migration vers Cloudflare R2 lors de l'implémentation du dashboard upload"
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
- Upload d'assets via dashboard admin nécessite la gestion du volume Docker (montage, chemins)
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

**Migration post-MVP vers Option B (Cloudflare R2) :** déclenchée par l'implémentation de l'upload d'assets depuis le dashboard admin. À ce moment, la gestion des chemins de volume Docker devient complexe et R2 (SDK S3-compatible, free tier 10 Go, zéro frais de sortie) est la solution naturelle. L'Option C (Minio self-hosted) reste envisageable mais R2 est préféré : zéro opération supplémentaire sur le VPS, free tier largement suffisant.

---

# 🔄 Conséquences

## Positives

- Si Option A (Volumes Docker) : zéro coût et zéro infrastructure supplémentaire pour le MVP
- Si Option B (Cloudflare R2) : CDN global, performances optimales, scalabilité infinie
- Si Option C (Minio) : self-hosted complet, API S3-compatible facilitant une future migration vers R2
- Quelle que soit l'option : la contrainte "route API uniquement" (pas de `public/`) est déjà actée, l'implémentation applicative est identique pour toutes les options

## Négatives

- Si Option A : backup des volumes Docker à mettre en place manuellement (risque de perte)
- Si Option A : pas de CDN, performance moindre pour des assets lourds servis hors Europe
- Si Option B : dépendance cloud externe, coût variable
- Si Option C : service supplémentaire à opérer, ressources VPS partagées

---

# 📝 Notes complémentaires

**Pattern commun aux trois options :** route API `/api/assets/[...path]` → stream du fichier depuis le backend (fs pour A, SDK S3 pour B et C). Le code applicatif diffère uniquement dans la couche d'accès au fichier, configurée via une variable d'environnement `ASSETS_PATH`.

**Workflow dev local / prod :**
- Dev local : dossier `./assets/` à la racine du projet (gitignored), `ASSETS_PATH=./assets` dans `.env.local`
- Prod Docker : volume `assets_data` monté sur `/app/assets` dans le container, `ASSETS_PATH=/app/assets` dans les variables Dokploy
- Le volume Docker persiste entre les redéploiements, remplacer le container ne supprime pas les fichiers

**Trigger migration vers R2 :** dès l'implémentation de l'upload depuis le dashboard admin. R2 est préféré à Minio : zéro service à opérer, free tier 10 Go, zéro frais de sortie (egress), SDK S3-compatible.

Voir ADR-005 pour le contexte infrastructure Dokploy (même contrainte d'absence de CDN global).

**Évolution post-implémentation, route catch-all + sous-dossiers :** la route a été refactorée de `/api/assets/[filename]` (flat, single-segment) vers `/api/assets/[...path]` (catch-all, segments multiples validés individuellement). L'organisation sur disque suit la convention `projets/{client,personal}/<slug>/<filename>` où `<slug>` correspond au slug DB (Company.slug pour les CLIENT, Project.slug pour les PERSONAL). Motivation : lisibilité filesystem quand le volume grossit (covers + logos + screenshots case-study), cohérence avec les slugs DB, mêmes garanties sécurité (Zod par segment, path traversal check, profondeur max 5 segments). Détails : `.claude/rules/nextjs/assets.md`.
