---
title: "ADR-006 — Stratégie démos : hub pointant vers domaines autonomes"
status: "accepted"
description: "Choix d'héberger les démos d'applications sur leurs propres domaines, le portfolio servant de hub central"
date: "2026-03-31"
keywords: ["architecture", "adr", "demos", "strategy"]
scope: ["docs", "architecture"]
technologies: ["Next.js"]
---

# 🎯 Contexte

Thibaud développe plusieurs applications (gestion de label, flight scraper, etc.) qu'il souhaite présenter dans son portfolio. La question est de savoir comment intégrer ces démos dans la plateforme.

---

# 🧩 Problème

Faut-il héberger et intégrer les démos directement dans le portfolio, ou laisser chaque application sur son propre domaine et pointer vers elles depuis le portfolio ?

---

# 🛠️ Options Envisagées

## Option A — Hub : portfolio pointe vers démos autonomes

**Description :** Chaque application est hébergée sur son propre domaine/sous-domaine. Le portfolio liste les projets avec un champ `demo_url` pointant vers la démo externe.

**Avantages :**
- Chaque application est indépendante (stack, déploiement, domaine propres)
- Le portfolio n'est pas alourdi par des applications tierces
- Les démos peuvent être partagées indépendamment du portfolio
- Architecture découplée — une démo down n'impacte pas le portfolio

**Inconvénients :**
- Expérience de navigation fragmentée (ouverture de nouveaux onglets)
- Coût potentiel si plusieurs sous-domaines nécessitent des certificats TLS séparés

**Coût estimé :** Faible — chaque démo gère sa propre infra

## Option B — Démos intégrées dans le portfolio (iframes, sous-routes)

**Description :** Les démos sont embarquées dans le portfolio (iframes, sous-routes, ou déploiements dans la même infra).

**Avantages :**
- Expérience utilisateur unifiée
- Tout au même endroit

**Inconvénients :**
- Couplage fort — le portfolio doit héberger des stacks potentiellement très différentes
- Complexité de déploiement et maintenance
- Performances impactées par les applications embarquées

**Coût estimé :** Élevé — maintenance et infra significativement plus complexes

---

# 🎉 Décision

**Option A — Hub pointant vers démos autonomes.**

Le portfolio est un répertoire central. Chaque application démo a sa propre logique, son propre cycle de vie et potentiellement sa propre stack. Le découplage est la bonne approche architecturale.

---

# 🔄 Conséquences

## Positives

- Portfolio léger et rapide
- Applications indépendantes (cycle de vie, déploiement, stack)
- Partage direct des démos possible

## Négatives

- Le champ `demo_url` peut être nul si la démo n'est pas encore disponible

---

# 📝 Notes complémentaires

Le modèle `Project` en BDD inclut un champ `demo_url` nullable pour gérer le cas des projets sans démo live.
