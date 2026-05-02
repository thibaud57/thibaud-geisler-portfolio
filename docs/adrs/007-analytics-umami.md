---
title: "ADR-007 — Analytics : Umami self-hosted"
status: "accepted"
description: "Décision actée : Umami self-hosted post-MVP — RGPD-friendly, zéro coût, compatible PostgreSQL"
date: "2026-03-31"
keywords: ["architecture", "adr", "analytics", "umami", "rgpd"]
scope: ["docs", "architecture"]
technologies: ["Umami", "PostgreSQL"]
---

# 🎯 Contexte

Le portfolio nécessitera des analytics pour suivre le trafic et le comportement des visiteurs. Contraintes : RGPD-friendly, budget limité, self-hosted préféré, compatible avec l'infra PostgreSQL existante.

---

# 🧩 Problème

Quelle solution d'analytics choisir en accord avec les contraintes RGPD, le budget et l'infrastructure self-hosted existante ?

---

# 🛠️ Options Envisagées

## Option A : Umami self-hosted

**Description :** Umami est un outil d'analytics open-source léger, RGPD-friendly (sans cookies, sans collecte de données personnelles), compatible PostgreSQL.

**Avantages :**
- Open-source et self-hosted, pas de coût, données sur le VPS
- Sans cookies, pas de bannière RGPD nécessaire
- Compatible PostgreSQL, peut utiliser la même infrastructure existante
- Interface simple et claire
- Script analytics léger (< 2kb)

**Inconvénients :**
- Un service de plus à déployer et maintenir sur Dokploy
- Moins riche fonctionnellement que des solutions payantes

**Coût estimé :** Nul (inclus dans VPS)

## Option B : Plausible (cloud)

**Description :** Solution analytics RGPD-friendly cloud, sans cookies.

**Avantages :**
- Zéro maintenance infra
- Interface claire et efficace

**Inconvénients :**
- 9-19€/mois (cloud), coût non négligeable pour un portfolio
- Données hébergées chez un tiers
- Plausible self-hosted existe (open-source) mais est plus complexe à opérer qu'Umami (configuration, maintenance)

**Coût estimé :** ~9-19€/mois (cloud) / 0€ self-hosted mais overhead opérationnel réel

## Option C : PostHog

**Description :** Analytics + product analytics, open-source.

**Avantages :**
- Très riche en fonctionnalités (replay sessions, A/B tests, funnels, etc.)

**Inconvénients :**
- Beaucoup trop lourd pour les besoins d'un portfolio
- Self-hosted nécessite ~4 GB RAM minimum, incompatible avec un VPS entrée de gamme

**Coût estimé :** ~0€ cloud jusqu'à 1M événements/mois, mais self-hosted = ressources VPS importantes

---

# 🎉 Décision

**Option A actée : Umami self-hosted (post-MVP).**

La combinaison self-hosted + RGPD-friendly + compatible PostgreSQL en fait le choix idéal. Plausible est trop cher en cloud et plus complexe à opérer en self-hosted. PostHog est surdimensionné pour un portfolio et trop gourmand en RAM.

---

# 🔄 Conséquences

## Positives

- Zéro coût supplémentaire (partage du PostgreSQL existant, inclus dans le VPS)
- RGPD-compliant sans effort (pas de cookies, pas de bannière de consentement)
- Données sur le VPS, indépendance totale vis-à-vis des services tiers

## Négatives

- Service supplémentaire à déployer et maintenir sur Dokploy (post-MVP)

---

# 📝 Notes complémentaires

Umami est prévu post-MVP. Déploiement via Docker Compose sur Dokploy, partage possible du cluster PostgreSQL.
