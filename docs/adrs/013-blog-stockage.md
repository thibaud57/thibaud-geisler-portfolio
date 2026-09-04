---
title: "ADR-013 — Blog : PostgreSQL"
status: "deprecated"
description: "Sans objet : la feature blog est retirée du périmètre du projet (août 2026)"
date: "2026-03-31"
keywords: ["architecture", "adr", "blog", "postgresql"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "PostgreSQL"]
---

> **Sans objet depuis août 2026.** La feature « Section Blog / Articles » est retirée du périmètre : l'effort de rédaction régulière ne se justifie pas face aux autres chantiers, et le SEO du portfolio repose sur les case studies de projets. Cet ADR est conservé pour la trace du raisonnement, notamment sur le rejet de MDX et de Redis, qui reste valable si la question se repose un jour.

# 🎯 Contexte

Post-MVP, un blog/section articles devait être ajouté au portfolio pour le SEO et la crédibilité technique. Les articles prévus sont de nature technique : tutoriels, retours d'expérience, posts techniques avec blocs de code. La question est de savoir où stocker et gérer ces articles.

---

# 🧩 Problème

Faut-il stocker les articles de blog en base de données (via l'espace admin) ou en fichiers MDX dans le repo ?

---

# 🛠️ Options Envisagées

## Option A : Base de données PostgreSQL

**Description :** Articles stockés en BDD, gérés via l'espace admin (CRUD avec éditeur Markdown).

**Avantages :**
- Cohérent avec la gestion des projets (même paradigme)
- Éditeur intégré à l'espace admin
- Pas de redéploiement nécessaire pour publier un article

**Inconvénients :**
- Éditeur Markdown à implémenter dans l'espace admin (preview, upload images, gestion frontmatter), chantier non trivial dans un contexte solo, d'autant que l'espace admin lui-même est post-MVP
- Plus complexe à setup

**Coût estimé :** Élevé, éditeur à développer dans un espace admin qui n'existe pas encore

## Option B : Fichiers MDX dans le repo

**Description :** Articles écrits en MDX, versionnés dans le repo Git, rendus via `next-mdx-remote` ou similaire.

**Avantages :**
- Workflow de rédaction simple (éditeur local, Git commit)
- Versioning Git natif
- Composants React intégrables dans les articles

**Inconvénients :**
- Redéploiement nécessaire pour publier un article (déclenché par un tag de release, donc contraignant)
- Gestion des images et assets dans MDX complexe : chemins, optimisation `next/image`, stockage à gérer séparément (cf. [ADR-011](011-stockage-assets.md))
- Moins adapté si la fréquence de publication est élevée

**Coût estimé :** Faible

---

# 🎉 Décision

**Option A : Base de données PostgreSQL.**

Décision actée à l'époque. La génération de contenu assistée impliquait de toute façon un espace admin et une table `Article` en BDD. MDX est incompatible avec ce workflow (pas de commit Git pour des brouillons IA, redéploiement requis pour publier). La BDD est déjà présente, le paradigme est cohérent avec la gestion des projets.

---

# 🔄 Conséquences

## Positives

- Publication sans redéploiement ni accès Git, workflow accessible depuis n'importe quel appareil
- Contenu indexable et favorable au SEO via `generateStaticParams` ou ISR

## Négatives

- Éditeur Markdown à implémenter dans un espace admin lui-même post-MVP, ce qui a finalement pesé dans l'abandon de la feature

---

# 📝 Notes complémentaires

**Alternatives non retenues :** Contentlayer (MDX typé, mais projet moins maintenu), Keystatic (CMS Git-based avec UI admin, sans BDD, exclu : brouillons générés par IA non commitables dans Git), Notion headless via API (exclu : aucune API Notion dans le scope du projet, cf. décision actée dans BRAINSTORM).

**Redis écarté pour les brouillons générés par IA :** Redis a été envisagé pour stocker temporairement les ébauches générées par l'IA avant publication, avec expiration automatique (TTL). Écarté : le volume envisagé était trop faible pour justifier un service supplémentaire. PostgreSQL avec une colonne `status: draft | published | archived` couvre le besoin, les brouillons non retenus sont supprimés manuellement ou via un job de nettoyage périodique. Redis se justifie pour du stockage éphémère à très haute fréquence (cache sessions, pub/sub temps réel) : aucun de ces besoins n'est présent ici.
