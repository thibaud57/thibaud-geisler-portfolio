---
title: "ADR-009 — UI System : shadcn/ui hybride + effets visuels"
status: "accepted"
description: "Décision actée : shadcn/ui comme socle fonctionnel + Magic UI / Aceternity UI pour les effets visuels du portfolio"
date: "2026-03-31"
keywords: ["architecture", "adr", "ui", "shadcn", "magic-ui", "aceternity", "design"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "Tailwind CSS", "shadcn/ui", "Magic UI", "Aceternity UI"]
---

# 🎯 Contexte

Le portfolio doit avoir une identité visuelle forte pour crédibiliser le positionnement. Le choix du système UI impacte la vitesse de développement, la cohérence visuelle et la flexibilité du design.

---

# 🧩 Problème

Faut-il utiliser une bibliothèque de composants prête à l'emploi (shadcn/ui) ou concevoir entièrement un design custom pour se différencier ?

---

# 🛠️ Options Envisagées

## Option A : shadcn/ui + Tailwind CSS

**Description :** Composants copiables basés sur Radix UI + Tailwind, personnalisables à 100%.

**Avantages :**
- Composants accessibles (Radix UI) sans effort
- Personnalisation totale via Tailwind (pas de dépendance locked)
- Vitesse de développement élevée
- Dark/light mode natif

**Inconvénients :**
- Base visuelle reconnaissable, risque de ressembler à "un autre site shadcn"
- La différenciation visuelle demande un effort de personnalisation

**Coût estimé :** Faible

## Option B : Design entièrement custom (Tailwind uniquement)

**Description :** Composants écrits from scratch avec Tailwind, sans librairie de composants.

**Avantages :**
- Identité visuelle unique, différenciation maximale
- Contrôle total sur chaque pixel

**Inconvénients :**
- Temps de développement plus long (accessibilité, comportements, animations)
- Risque de dettes techniques sur les composants complexes (combobox, dialog, etc.)

**Coût estimé :** Significatif, plusieurs semaines supplémentaires

## Option C : shadcn/ui + personnalisation visuelle poussée (hybride)

**Description :** shadcn/ui comme socle de composants fonctionnels (dialog, combobox, etc.), avec une couche d'effets visuels et de design custom sur les éléments exposés (couleurs, typographie, animations, sections hero). La couche d'effets visuels est assurée par **Magic UI** et/ou **Aceternity UI**, deux bibliothèques copy-paste (même modèle que shadcn/ui : pas de dépendance package, on copie uniquement les effets nécessaires) compatibles et combinables sans conflit.

**Avantages :**
- Composants complexes (accessibilité, comportements) délégués à shadcn/Radix UI
- Identité visuelle différenciante via effets visuels (spotlight, glows, reveals, animations) sans réinventer les composants fonctionnels
- Magic UI et Aceternity UI combinables : on peut prendre un effet spotlight depuis Aceternity et un number ticker depuis Magic UI
- Équilibre vitesse/différenciation

**Inconvénients :**
- Cohérence visuelle à maintenir entre composants shadcn customisés et effets décoratifs
- La customisation poussée peut devenir chronophage

**Coût estimé :** Moyen

---

# 🎉 Décision

**Option C actée : shadcn/ui hybride avec effets visuels.**

shadcn/ui comme socle fonctionnel pour tous les composants complexes (dialog, combobox, select, tables, forms...). Couche d'effets visuels via Magic UI et/ou Aceternity UI (copy-paste, combinables) sur les surfaces marketing du site public (hero, cards projets, typographie, identité de marque). Les effets spécifiques à retenir sont à définir lors de l'implémentation UI.

---

# 🔄 Conséquences

## Positives

- Composants fonctionnels complexes (dialog, combobox, select, tables, forms) délégués à shadcn/Radix UI : accessibilité native, dark mode intégré, démarrage rapide
- Identité visuelle différenciante via Magic UI / Aceternity UI sans réinventer les composants fonctionnels
- Magic UI et Aceternity UI combinables (copy-paste) : flexibilité pour choisir les meilleurs effets de chaque lib

## Négatives

- Cohérence visuelle à maintenir entre composants shadcn customisés et effets décoratifs
- La personnalisation poussée peut devenir chronophage si le périmètre des effets n'est pas cadré dès le départ

---

# 📝 Notes complémentaires

Cette décision doit être prise avant de commencer le développement UI. Elle impacte l'ensemble de la base de composants.

L'Option C (hybride) est souvent le choix pragmatique en pratique : shadcn/ui pour les composants fonctionnels complexes, personnalisation visuelle poussée sur les sections marketing (hero, cards projets) et l'identité de marque.

**Magic UI et Aceternity UI** : bibliothèques copy-paste d'effets visuels (animations, glows, spotlight, reveals, bento grids...) conçues pour se greffer sur shadcn/ui. Pas de conflit entre elles, on copie uniquement les effets nécessaires depuis l'une ou l'autre. Exploration en cours pour définir les effets retenus pour le hero et les surfaces visuelles clés du portfolio. Ces deux libs sont les candidates pour la couche effets de l'Option C.

**Dashboard admin (post-MVP)** : shadcn/ui seul couvre la majorité des besoins (tables, forms, modales, KPI cards). Magic UI et Aceternity UI ne s'appliquent pas au dashboard, leur usage est réservé aux surfaces marketing du site public.

**Références :**
- [shadcn/ui](https://ui.shadcn.com)
- [Magic UI](https://magicui.design)
- [Aceternity UI](https://ui.aceternity.com)
- [Radix UI](https://www.radix-ui.com), primitives accessibles sous-jacentes à shadcn/ui
