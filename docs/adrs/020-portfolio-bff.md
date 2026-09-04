---
title: "ADR-020 — Le portfolio comme Backend For Frontend"
status: "accepted"
description: "Décision actée : tous les fronts et tout le CRUD synchrone dans Next.js, le métier long et risqué dans les services"
date: "2026-08-29"
keywords: ["architecture", "adr", "bff", "nextjs", "server-actions", "crud", "admin"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "Prisma", "Server Actions", "Python"]
---

# 🎯 Contexte

Le découpage acté en [ADR-015](015-decoupage-services.md) place trois services Python à côté de l'application Next.js. Reste à définir ce que porte exactement le portfolio, en particulier pour le domaine freelance (CRM, comptabilité, publications) qui n'a pas de dépôt propre.

---

# 🧩 Problème

Le CRUD des domaines métier vit-il dans Next.js ou dans des services dédiés ?

---

# 🛠️ Options Envisagées

## Option A : Un service par domaine, Next.js réduit aux fronts

**Description :** Un service Python `freelance` porte les tables, le CRUD, la qualification et la comptabilité. Next.js n'affiche que des écrans consommant son API.

**Avantages :**
- Chaque domaine totalement autonome
- Cohérence avec « tous les projets IA en Python »

**Inconvénients :**
- Impose d'écrire une API REST complète pour `Lead`, `Contact`, `Facture` et `PostLinkedIn`, avec validation côté service **et** côté formulaire, sérialisation, contrat OpenAPI et client généré, pour ce qu'une Server Action fait en dix lignes
- Supprime toute jointure SQL entre un lead et un projet du portfolio
- Le typage ne traverse plus jusqu'au composant React sans génération intermédiaire

**Coût estimé :** Élevé et récurrent

## Option B : Le portfolio porte les fronts et le CRUD synchrone

**Description :** Next.js porte tous les écrans, l'authentification, et le CRUD de tous les domaines synchrones. Les services Python portent ce qui est long, risqué, ou nécessite leur écosystème.

**Avantages :**
- Les Server Actions couvrent le CRUD sans API intermédiaire
- Le typage traverse de Prisma jusqu'au composant
- Les jointures entre domaines restent possibles
- Un seul design system, une seule navigation, un seul login

**Inconvénients :**
- Le portfolio grossit, en écrans surtout
- Il devient le propriétaire de schemas qui ne concernent pas le site public

**Coût estimé :** Faible

---

# 🎉 Décision

**Option B actée : le portfolio est un Backend For Frontend.**

| Dans le portfolio | Dans les services |
|---|---|
| Tous les fronts, public et admin | Aucune interface |
| Authentification et sessions | — |
| CRUD des schemas `public`, `auth`, `freelance` | Traitements longs, IA, exécution shell |
| Scoring ICP, calculs comptables, agrégats | Rédaction, sourcing web, RAG |

**Ce qui reste en TypeScript parce que c'est déterministe :**

- Le **scoring ICP** : quatre piliers, seuils chiffrés, score de 0 à 10, correspondance vers un statut. Une fonction pure, testable, instantanée et gratuite. Aujourd'hui un agent applique cette grille arithmétique, ce qui coûte un appel de modèle et introduit une variabilité pour un résultat qui devrait être constant.
- Toute la **comptabilité** : cotisations, TVA, provision d'impôt, et surtout la numérotation séquentielle légale, mieux garantie par une contrainte transactionnelle que par de la vigilance.
- Les **indicateurs et agrégats**, qui sont des requêtes SQL.

**Ce qui part dans les services parce que cela demande du jugement** : rédaction de publications, critique de contenu, sourcing web, enrichissement de prospects, recherche documentaire.

**Règle de persistance.** Les services ne persistent rien dans un schema qu'ils ne possèdent pas : ce qu'ils calculent pour le portfolio, ils le retournent, et c'est le portfolio qui l'écrit. Chacun reste propriétaire du sien, `dev` pour `agent-os` et `rag_public` pour `portfolio-chatbot` ([ADR-018](018-cloisonnement-donnees.md)).

---

# 🔄 Conséquences

## Positives

- Le CRUD s'écrit en Server Actions, sans couche d'API à maintenir
- La validation Zod est unique, partagée entre le formulaire et l'action
- Les corrélations entre domaines restent des jointures SQL
- Un seul endroit pour l'authentification, le thème, la navigation et les composants

## Négatives

- Le portfolio devient volumineux, principalement en nombre d'écrans. À contenir par une structure par domaine dans `src/components/features/` et des route groups
- Détacher un domaine plus tard serait coûteux
- Le nom du dépôt devient partiellement trompeur, puisqu'il porte davantage que le portfolio

---

# 📝 Notes complémentaires

**Serveur MCP.** Le CRUD vivant dans Next.js, exposer un serveur MCP au-dessus des Server Actions devient peu coûteux : une route qui transforme les actions en outils, permettant de piloter le CRM depuis Claude Code. À évaluer face à un CLI, qui consomme nettement moins de contexte pour un usage répétitif, un serveur MCP chargeant la définition de tous ses outils à chaque tour.

**Espace admin hors `[locale]/`**, cf. [ADR-021](021-routing-espace-admin.md).
