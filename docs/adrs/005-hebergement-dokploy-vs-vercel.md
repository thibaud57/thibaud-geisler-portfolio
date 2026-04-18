---
title: "ADR-005 — Hébergement Dokploy self-hosted vs Vercel"
status: "accepted"
description: "Choix d'héberger l'application sur un VPS via Dokploy plutôt que sur Vercel"
date: "2026-03-31"
keywords: ["architecture", "adr", "infrastructure", "dokploy", "vercel", "self-hosted"]
scope: ["docs", "architecture"]
technologies: ["Dokploy", "Docker"]
---

# 🎯 Contexte

Portfolio personnel avec budget mensuel limité, hébergé sur un VPS IONOS. Le projet inclut PostgreSQL (requiert un serveur persistant) et potentiellement plusieurs services post-MVP (n8n, Umami). Le domaine est sur IONOS.

---

# 🧩 Problème

Quelle plateforme d'hébergement choisir pour déployer l'application Next.js avec PostgreSQL, en tenant compte du budget, du contrôle et de l'évolutivité ?

---

# 🛠️ Options Envisagées

## Option A — Dokploy self-hosted (VPS IONOS)

**Description :** Dokploy (PaaS self-hosted open-source) installé sur un VPS IONOS. Déploiement automatique via webhook GitHub sur merge sur `main`. Docker Compose pour orchestrer les services.

**Avantages :**
- Coût fixe et prévisible (VPS IONOS déjà payé)
- Contrôle total sur les données et l'infrastructure
- Support natif Docker Compose — Next.js + PostgreSQL + Umami + n8n dans la même infra
- HTTPS automatique (Let's Encrypt intégré)
- Interface Dokploy pour logs, déploiements, variables d'env

**Inconvénients :**
- Maintenance infra à la charge du développeur (mises à jour, sécurité)
- Pas de scaling automatique

**Coût estimé :** VPS IONOS déjà inclus dans le budget existant

## Option B — Vercel

**Description :** Déploiement Next.js directement sur Vercel (plateforme officielle Next.js).

**Avantages :**
- Déploiement zéro-config pour Next.js
- Edge network global, performance optimale
- Preview deployments automatiques sur PR

**Inconvénients :**
- PostgreSQL doit être hébergé séparément (Neon, Supabase) — coût supplémentaire
- Limites du plan gratuit (bande passante, storage, exécution)
- Contrôle limité sur l'infrastructure
- Coût mensuel potentiellement élevé si le trafic augmente

**Coût estimé :** 20-40€/mois selon usage (PostgreSQL externe + Vercel Pro éventuel)

---

# 🎉 Décision

**Option A — Dokploy self-hosted.**

Le VPS IONOS est déjà payé. Dokploy permet d'héberger l'ensemble de la stack (Next.js, PostgreSQL, Umami, n8n) à coût nul supplémentaire, avec un contrôle total. L'overhead de maintenance est acceptable pour un projet solo.

---

# 🔄 Conséquences

## Positives

- Coût marginal nul (VPS déjà payé)
- Toute la stack (app + BDD + analytics + workflows) sur la même infra
- Indépendance vis-à-vis des plateformes tierces

## Négatives

- Responsabilité de la sécurité et des mises à jour infra
- Pas de CDN global (performance potentiellement moindre hors Europe)

---

# 📝 Notes complémentaires

GitHub Actions est utilisé uniquement pour lint/tests. Dokploy gère entièrement le déploiement via webhook.
