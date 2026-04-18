---
title: "ADR-013 — Blog : PostgreSQL"
status: "accepted"
description: "Décision actée : stockage des articles de blog en PostgreSQL, MDX et Redis écartés"
date: "2026-03-31"
keywords: ["architecture", "adr", "blog", "postgresql"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "PostgreSQL"]
---

# 🎯 Contexte

Post-MVP, un blog/section articles sera ajouté au portfolio pour le SEO et la crédibilité technique. Les articles prévus sont de nature technique : tutoriels, retours d'expérience, posts techniques avec blocs de code. La question est de savoir où stocker et gérer ces articles.

---

# 🧩 Problème

Faut-il stocker les articles de blog en base de données (via dashboard admin) ou en fichiers MDX dans le repo ?

---

# 🛠️ Options Envisagées

## Option A — Base de données PostgreSQL

**Description :** Articles stockés en BDD, gérés via le dashboard admin (CRUD avec éditeur Markdown).

**Avantages :**
- Cohérent avec la gestion des projets (même paradigme)
- Éditeur admin intégré au dashboard
- Pas de redéploiement nécessaire pour publier un article

**Inconvénients :**
- Éditeur Markdown à implémenter dans le dashboard (preview, upload images, gestion frontmatter) — chantier non trivial dans un contexte solo, d'autant que le dashboard admin lui-même est post-MVP
- Plus complexe à setup

**Coût estimé :** Élevé — éditeur à développer dans un dashboard qui n'existe pas encore

## Option B — Fichiers MDX dans le repo

**Description :** Articles écrits en MDX, versionnés dans le repo Git, rendus via `next-mdx-remote` ou similaire.

**Avantages :**
- Workflow de rédaction simple (éditeur local, Git commit)
- Versioning Git natif
- Composants React intégrables dans les articles

**Inconvénients :**
- Redéploiement nécessaire pour publier un article (automatique via Dokploy sur push `main`, mais contraignant si rédaction depuis une interface non-technique)
- Gestion des images et assets dans MDX complexe : chemins, optimisation `next/image`, stockage à gérer séparément (voir ADR-011)
- Moins adapté si la fréquence de publication est élevée

**Coût estimé :** Faible

---

# 🎉 Décision

**Option A — Base de données PostgreSQL.**

Décision actée. La Feature 6 (génération IA de contenu, brouillons `status: draft`) implique de toute façon un dashboard admin et une table `Article` en BDD. MDX est incompatible avec ce workflow (pas de commit Git pour des brouillons IA, redéploiement requis pour publier). La BDD est déjà présente, le paradigme est cohérent avec la gestion des projets.

---

# 🔄 Conséquences

## Positives

- Si Option A (BDD) : publication sans redéploiement ni accès Git — workflow accessible depuis n'importe quel appareil
- Si Option B (MDX) : versioning Git natif, composants React intégrables (blocs de code interactifs, démos inline) — adapté aux articles techniques
- Quelle que soit l'option : contenu indexable et favorable au SEO via `generateStaticParams` ou ISR

## Négatives

- Option A (BDD) : éditeur Markdown à implémenter dans le dashboard (lui-même post-MVP)
- Option B (MDX) : redéploiement requis pour publier, gestion des assets complexe

---

# 📝 Notes complémentaires

**Critères de décision à trancher lors de l'implémentation :**
- Workflow réel : rédaction dans l'éditeur de code (→ MDX) ou besoin d'une interface web (→ BDD) ?
- Type d'articles : blocs de code, démos React inline (→ MDX), ou contenu narratif simple (→ les deux conviennent) ?
- Fréquence de publication : rare (→ MDX suffisant) ou régulière sans accès Git systématique (→ BDD)

**Alternatives non retenues :** Contentlayer (MDX typé, mais projet moins maintenu), Keystatic (CMS Git-based avec UI admin, sans BDD — exclu : incompatible avec la Feature 6, brouillons IA non commitables dans Git), Notion headless via API (exclu : aucune API Notion dans le scope du projet, voir décision actée dans BRAINSTORM).

**Redis écarté pour les brouillons IA (Feature 6) :** Redis a été envisagé pour stocker temporairement les ébauches générées par l'IA avant publication, avec expiration automatique (TTL). Écarté : le volume est trop faible (~10 articles/semaine) pour justifier un service supplémentaire. PostgreSQL avec une colonne `status: draft | published | archived` couvre le besoin — les brouillons non retenus sont supprimés manuellement ou via un job de nettoyage périodique. Redis se justifie pour du stockage éphémère à très haute fréquence (cache sessions, pub/sub temps réel) : aucun de ces besoins n'est présent ici.

La cohérence avec ADR-004 (PostgreSQL dès le MVP) donne un avantage naturel à l'Option A — la BDD est déjà là.
