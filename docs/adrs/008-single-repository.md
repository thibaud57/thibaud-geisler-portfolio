---
title: "ADR-008 — Single repository (monolithe)"
status: "accepted"
description: "Choix d'un single repository plutôt qu'un monorepo Turborepo pour ce projet"
date: "2026-03-31"
keywords: ["architecture", "adr", "monorepo", "repository"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "pnpm"]
---

# 🎯 Contexte

Projet portfolio personnel développé par une seule personne. Une seule application Next.js, pas de packages partagés entre plusieurs applications distinctes.

---

# 🧩 Problème

Faut-il structurer le projet comme un monorepo (Turborepo/pnpm workspaces) ou comme un single repository monolithique ?

---

# 🛠️ Options Envisagées

## Option A : Single repository (monolithe)

**Description :** Un seul `package.json` à la racine, une seule application Next.js, pas de workspace.

**Avantages :**
- Simplicité maximale, pas de tooling monorepo à configurer
- Pas d'overhead de build (Turborepo cache, pipelines)
- Adapté à une seule application sans packages partagés

**Inconvénients :**
- Si des applications séparées sont créées plus tard, refactoring nécessaire

**Coût estimé :** Nul

## Option B : Monorepo Turborepo

**Description :** Structure monorepo avec `packages/ui`, `packages/api`, etc.

**Avantages :**
- Réutilisation de code entre apps/packages
- Build incrémentiel (cache Turborepo)

**Inconvénients :**
- Overhead de configuration (Turborepo, workspaces, paths)
- Inutile pour une seule application sans packages partagés
- Sur-ingénierie évidente pour ce contexte

**Coût estimé :** Plusieurs heures de setup, maintenance continue

---

# 🎉 Décision

**Option A : Single repository.**

Un seul repo pour une seule application Next.js. Aucun avantage du monorepo ne s'applique ici. Les applications démos futures auront leurs propres repos (voir ADR-006).

---

# 🔄 Conséquences

## Positives

- Structure simple, zéro overhead
- Configuration CI/CD et Docker simplifiée

## Négatives

- Migration vers monorepo si des packages partagés apparaissent (improbable)

---

# 📝 Notes complémentaires

Les applications démos futures (gestion de label, flight scraper, etc.) ont chacune leur propre repository distinct, cohérent avec [ADR-006](006-strategie-demos-hub.md) (démos hébergées sur des domaines autonomes, cycle de vie indépendant).

pnpm est le package manager retenu pour sa rapidité d'installation et son efficacité de stockage (liens symboliques vs duplication de `node_modules`).
