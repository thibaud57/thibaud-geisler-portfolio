---
title: "ADR-003 — Case studies en pages dédiées"
status: "accepted"
description: "Choix d'afficher les détails de projet dans des pages dédiées plutôt que dans des modales"
date: "2026-03-31"
keywords: ["architecture", "adr", "ux", "seo", "routing"]
scope: ["docs", "architecture"]
technologies: ["Next.js"]
---

# 🎯 Contexte

Les projets du portfolio nécessitent une présentation détaillée (contexte, défis, solution, captures d'écran, liens). La question est de savoir comment exposer ce contenu dans l'interface : via des pages dédiées accessibles par URL, ou via des modales/drawers au-dessus de la liste des projets.

---

# 🧩 Problème

Comment présenter le détail d'un projet de manière optimale pour le SEO, le partage de lien et la lisibilité ?

---

# 🛠️ Options Envisagées

## Option A : Pages dédiées `/projets/[slug]`

**Description :** Chaque projet a sa propre page Next.js avec une URL unique de type `/projets/mon-projet`.

**Avantages :**
- URL partageable et indexable par les moteurs de recherche
- Excellent pour le SEO (balises meta, Open Graph par projet)
- Structure de navigation claire (breadcrumb, retour en arrière natif)
- `generateStaticParams` pour pré-générer les pages à la build (performance)

**Inconvénients :**
- Nécessite un layout/template de page dédié

**Coût estimé :** Faible, une route dynamique Next.js standard

## Option B : Modales / Drawers

**Description :** Cliquer sur un projet ouvre une modale ou un drawer au-dessus de la liste.

**Avantages :**
- Expérience fluide sans changement de page
- Pas de route dédiée à gérer

**Inconvénients :**
- URL non partageable (ou URL avec hash/query param, complexe)
- Contenu non indexable par les moteurs de recherche
- Difficulté à afficher beaucoup de contenu (captures, texte long)

**Coût estimé :** Moyen, gestion d'état modale, UX complexe pour du contenu riche

---

# 🎉 Décision

**Option A : Pages dédiées `/projets/[slug]`.**

Le SEO et le partage de lien sont des critères primaires pour un portfolio professionnel. Chaque page projet doit être indexable et partageable individuellement pour maximiser la visibilité.

---

# 🔄 Conséquences

## Positives

- Chaque projet est indexable (Google, LinkedIn, etc.)
- URLs partageables directement dans les emails/propositions commerciales
- Metadata Open Graph personnalisée par projet

## Négatives

- Nécessite de maintenir un template de page case study cohérent

---

# 📝 Notes complémentaires

Les slugs sont dérivés du titre projet. `generateStaticParams` génère les pages statiquement à la build pour les projets existants. La stratégie de slug (language-agnostic vs localisé selon la locale) est une sous-question ouverte documentée dans ADR-010.
