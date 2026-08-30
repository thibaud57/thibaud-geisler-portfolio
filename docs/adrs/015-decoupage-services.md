---
title: "ADR-015 — Découpage en services par frontière d'exécution"
status: "accepted"
description: "Décision actée : découper l'écosystème selon ce qui ne peut pas partager le même processus, et non selon les domaines métier"
date: "2026-08-29"
keywords: ["architecture", "adr", "services", "decoupage", "python", "monolithe"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "Python", "Docker", "Dokploy"]
---

# 🎯 Contexte

L'espace admin post-MVP dépasse largement la gestion de contenu du portfolio. Quatre besoins distincts sont apparus : piloter le contenu du site et son chatbot, gérer l'activité freelance (CRM, comptabilité, publications LinkedIn), interroger des documents personnels sensibles, et automatiser le cycle de développement via des agents Claude Code.

Contraintes structurantes : un seul développeur, un seul VPS, une préférence affirmée pour Python et PydanticAI sur tout ce qui touche à l'IA, et un site public déjà en production sur la même machine.

---

# 🧩 Problème

Selon quel critère découper : un dépôt unique, un dépôt par domaine métier, ou un autre axe ?

---

# 🛠️ Options Envisagées

## Option A : Tout dans le monolithe Next.js

**Description :** CRUD, IA, RAG et orchestration réécrits en TypeScript dans l'application portfolio.

**Avantages :**
- Un seul déploiement, un seul langage, jointures SQL partout
- Aucune API interne à écrire

**Inconvénients :**
- L'orchestrateur Claude Code s'y prête mal : processus longs, worktrees git, exécution shell
- Un crash de ces traitements emporterait le site public
- Renonce à PydanticAI et à l'écosystème Python pour l'IA
- Le chatbot public partagerait son processus avec les documents personnels sensibles

**Coût estimé :** Faible à court terme, élevé en risque opérationnel

## Option B : Un dépôt par domaine métier

**Description :** `portfolio`, `freelance`, `rag`, `dev`. Chaque domaine autonome avec sa base, son API, sa doc.

**Avantages :**
- Frontières métier lisibles
- Cycles de vie indépendants

**Inconvénients :**
- Le CRUD freelance devrait s'écrire en API REST complète, avec validation dupliquée et contrats OpenAPI, pour ce qu'une Server Action fait en dix lignes
- Aucune jointure SQL possible entre un `Lead` et un `Project`
- Quatre fronts à construire et maintenir, ou un front qui ne parle qu'à des APIs
- Coût récurrent en Dockerfile, CI, migrations et secrets, pour un développeur seul

**Coût estimé :** Élevé et permanent

## Option C : Découpage par frontière d'exécution

**Description :** Le critère n'est pas le domaine mais **ce qui ne peut pas partager le même processus** : langage différent, cycle de vie différent, profil de ressources différent, ou profil de risque différent.

**Avantages :**
- Le CRUD synchrone (portfolio et freelance) reste ensemble, avec ses jointures et son typage bout en bout
- Ce qui est long, Python, ou risqué sort du conteneur qui sert le site public
- Le nombre de services reste minimal

**Inconvénients :**
- La frontière demande d'être explicitée, elle n'est pas déductible du seul nom d'un domaine
- Les services Python ne peuvent pas joindre les tables du portfolio en SQL

**Coût estimé :** Modéré, proportionné au besoin réel

---

# 🎉 Décision

**Option C actée : découpage par frontière d'exécution.**

Cinq dépôts :

| Dépôt | Rôle | Langage |
|---|---|---|
| `thibaud-geisler-portfolio` | site public, espace admin, tous les fronts, auth, CRUD | TypeScript |
| `ai-kit` | socle IA partagé, backends interchangeables. **Package installé par les trois autres, pas un service** | Python |
| `agent-os` | exécute `claude -p` : cycle de dev et jobs de l'espace admin | Python |
| `portfolio-chatbot` | RAG public, principal consommateur d'API au token | Python |
| `rag-documents` | documents personnels, base isolée | Python |

Le domaine freelance n'a **pas** de dépôt : ce n'est pas un produit, c'est un domaine de l'espace admin. Ses données et son CRUD vivent avec l'auth et les fronts, sa partie IA vit avec les autres traitements longs.

---

# 🔄 Conséquences

## Positives

- Les jointures SQL entre le CRM et les projets restent possibles, ce qui était le principal risque de l'Option B
- Le site public ne partage son processus ni avec l'exécution d'agents, ni avec le RAG sur documents sensibles
- Chaque dépôt porte sa propre documentation, cohérente avec son périmètre
- Le nombre de services reste au minimum justifiable

## Négatives

- Les services Python ne peuvent pas joindre les tables du portfolio, toute corrélation passe par HTTP puis un rapprochement en mémoire
- La règle de découpe doit être rappelée, sans quoi un futur besoin sera découpé par domaine par réflexe

---

# 📝 Notes complémentaires

**Point de bascule.** Si le domaine freelance devenait un produit détachable et vendable, son extraction serait nécessaire et coûteuse. Tant qu'il s'agit d'un outil personnel, l'intégration reste le bon choix.

Voir [ADR-020](020-portfolio-bff.md) pour le rôle du portfolio comme Backend For Frontend, et [ADR-018](018-cloisonnement-donnees.md) pour la répartition des bases, des schemas et la règle « un seul propriétaire par schema ».
