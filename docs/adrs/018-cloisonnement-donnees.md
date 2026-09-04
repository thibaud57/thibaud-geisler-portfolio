---
title: "ADR-018 — Cloisonnement des données : deux bases, schemas par domaine"
status: "accepted"
description: "Décision actée : base portfolio découpée en schemas, base séparée pour les documents personnels sensibles"
date: "2026-08-29"
keywords: ["architecture", "adr", "postgresql", "schema", "isolation", "securite", "rgpd"]
scope: ["docs", "architecture"]
technologies: ["PostgreSQL", "Prisma", "pgvector", "Dokploy"]
---

# 🎯 Contexte

Une base PostgreSQL `portfolio` existe déjà, provisionnée comme Dokploy Database, et porte les modèles du site public. L'espace admin y ajoute quatre domaines : authentification, freelance (CRM et comptabilité), suivi de développement, et un RAG sur documents personnels comprenant contrats d'assurance et documents immobiliers.

Les profils de sensibilité sont radicalement différents. Le chatbot public est ouvert et non authentifié, donc exposé à l'injection de prompt. Les documents personnels sont la donnée la plus sensible de l'écosystème.

---

# 🧩 Problème

Une base unique, une base par domaine, ou un découpage intermédiaire ?

---

# 🛠️ Options Envisagées

## Option A : Une base unique, un seul schema

**Description :** Toutes les tables dans `public`, comme aujourd'hui.

**Avantages :**
- Aucune configuration supplémentaire
- Jointures libres partout

**Inconvénients :**
- Aucun cloisonnement : une injection SQL sur le site public atteint les contrats d'assurance
- Impossible de restreindre les credentials d'un service à son périmètre
- Lisibilité dégradée à mesure que les tables s'accumulent

**Coût estimé :** Nul en mise en œuvre, inacceptable en risque

## Option B : Une base par domaine

**Description :** Cinq bases distinctes dans la même instance PostgreSQL.

**Avantages :**
- Isolation maximale
- Cycles de migration totalement indépendants

**Inconvénients :**
- **Interdit toute jointure SQL** entre domaines, y compris entre un `Lead` et un `Project`, ce qui était l'argument principal du découpage retenu en [ADR-015](015-decoupage-services.md)
- Autant de sauvegardes et de chaînes de connexion à gérer

**Coût estimé :** Élevé, et contradictoire avec le découpage acté

## Option C : Deux bases, schemas par domaine

**Description :** La base `portfolio` conservée, découpée en schemas. Une seconde base isolée pour les documents personnels.

**Avantages :**
- Les jointures restent possibles à l'intérieur de `portfolio`
- Une seule sauvegarde et une seule connexion pour l'essentiel
- Le seul périmètre qui justifie vraiment l'isolation l'obtient réellement, avec ses propres credentials

**Inconvénients :**
- Les migrations des schemas de `portfolio` restent couplées dans un seul fichier Prisma
- Deux sauvegardes à configurer

**Coût estimé :** Faible

---

# 🎉 Décision

**Option C actée.**

```
Base "portfolio"                  Dokploy Database existante, nom conservé
├── schema public       Project, Company, Tag, LegalEntity…
├── schema auth         user, session, account, verification
├── schema freelance    Lead, Contact, Facture, PostLinkedIn…
├── schema dev          Run, Finding, Repo            propriété d'agent-os
└── schema rag_public   documents, chunks, embeddings  propriété de portfolio-chatbot

Base "documents-prives"           nouvelle, credentials distincts
└── pgvector : contrats d'assurance, immobilier, administratif
```

**Le nom `portfolio` n'est pas renommé.** Il n'apparaît que dans les chaînes de connexion, renommer imposerait une interruption de service pour un gain purement cosmétique.

**Un seul propriétaire par schema.** Les services qui calculent et retournent ne persistent rien dans un schema qu'ils ne possèdent pas. Le portfolio est propriétaire de `public`, `auth` et `freelance` ; `agent-os` de `dev` ; `portfolio-chatbot` de `rag_public` ; `rag-documents` de sa base entière.

---

# 🔄 Conséquences

## Positives

- Les jointures entre le CRM et les projets du portfolio restent triviales
- Une compromission du site public ou du chatbot n'atteint pas les documents personnels : base distincte, credentials distincts, processus distinct
- Chaque service peut recevoir une chaîne de connexion restreinte à son schema
- Une seule sauvegarde couvre l'essentiel du système

## Négatives

- Les migrations des schemas de `portfolio` sont couplées dans un seul `schema.prisma`
- Deux politiques de sauvegarde à maintenir, celle des documents personnels méritant une rétention et un chiffrement propres
- Le nom `portfolio` devient partiellement trompeur puisque la base porte davantage que le portfolio

---

# 📝 Notes complémentaires

**Pourquoi l'isolation des documents personnels n'est pas négociable.** Le reste de l'architecture peut tomber sans conséquence hors ligne. Ici une fuite a des effets réels et irréversibles. L'isolation est appliquée à trois niveaux : base distincte, processus distinct de `portfolio-chatbot`, et aucune exposition hors du réseau Docker interne, où seul le portfolio le joint ([ADR-019](019-communication-inter-services.md)).

**Sauvegardes.** Deux bases signifient deux sauvegardes, celle des documents personnels méritant une rétention et un chiffrement propres. La stratégie opérationnelle appartient à [PRODUCTION.md](../PRODUCTION.md) § Backup & Recovery.

**pgvector** est requis sur les deux bases : `rag_public` pour le chatbot, la base isolée pour les documents personnels.

**Réversibilité.** Extraire un schema vers sa propre base reste possible tant que le code ne dépend pas de jointures inter-schemas. Éviter donc les jointures entre `freelance` et `dev`, dont les propriétaires diffèrent.
