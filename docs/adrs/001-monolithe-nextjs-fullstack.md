---
title: "ADR-001 — Monolithe Next.js fullstack"
status: "accepted"
description: "Choix d'une architecture monolithique Next.js plutôt qu'une séparation frontend/backend distincte"
date: "2026-03-31"
keywords: ["architecture", "adr", "nextjs", "monolith"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "TypeScript"]
---

# 🎯 Contexte

Projet portfolio personnel full-stack développé par une seule personne. Besoin d'un site public (présentation, projets, contact) et d'un dashboard admin futur (gestion contenu). Budget limité, priorité à la livraison rapide d'un MVP fonctionnel.

---

# 🧩 Problème

Quelle organisation architecturale choisir pour un projet fullstack solo, en termes de maintenabilité, vitesse de développement et cohérence technique ?

---

# 🛠️ Options Envisagées

## Option A — Monolithe Next.js (Server Actions + API Routes)

**Description :** Une seule application Next.js couvrant frontend (App Router), logique serveur (Server Actions), API (API Routes) et accès BDD (Prisma).

**Avantages :**
- Un seul repo, un seul déploiement, une seule base de code à maintenir
- Next.js App Router permet de coloquer composants, actions serveur et routes API
- Pas de problème CORS, pas de gestion de tokens inter-services
- TypeScript partagé nativement entre frontend et backend
- Déploiement simplifié (un seul container Docker)
- Vitesse de développement maximale pour un projet solo

**Inconvénients :**
- Couplage fort entre présentation et logique métier
- Scalabilité limitée si la partie backend devient très intensive (peu probable pour un portfolio)
- Moins adapté si plusieurs frontends devaient consommer la même API

**Coût estimé :** 0 — approche par défaut de Next.js

## Option B — Séparation frontend Next.js + backend Express/NestJS

**Description :** Deux applications distinctes : Next.js pour le frontend (SSR/SSG), un backend Express ou NestJS pour l'API REST.

**Avantages :**
- Séparation des responsabilités claire
- Le backend peut être consommé par d'autres clients

**Inconvénients :**
- Deux repos ou deux apps à maintenir, déployer et versionner
- Complexité ajoutée (CORS, JWT, deux Dockerfiles, deux services)
- Sur-ingénierie pour un projet solo à faible trafic

**Coût estimé :** Complexité et temps de setup significatifs sans bénéfice réel pour ce contexte

---

# 🎉 Décision

**Option A — Monolithe Next.js fullstack.**

Choix naturel pour un projet solo avec Next.js App Router. La colocation Server Actions/composants élimine la friction inter-services. Aucune complexité ajoutée sans bénéfice identifié.

---

# 🔄 Conséquences

## Positives

- Un seul déploiement Docker
- Développement rapide, zéro friction CORS
- Types TypeScript partagés nativement

## Négatives

- Couplage présentation/logique — à mitiger via organisation en `server/actions/` et `server/queries/`
- Si une API publique est un jour nécessaire, les routes API devront être exposées explicitement

---

# 📝 Notes complémentaires

La séparation logique est maintenue via les route groups `(public)/` et `(admin)/` et la structure `src/server/`. Cette architecture peut évoluer sans refonte si un backend séparé devenait nécessaire.
