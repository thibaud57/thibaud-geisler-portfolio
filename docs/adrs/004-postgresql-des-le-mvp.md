---
title: "ADR-004 — PostgreSQL dès le MVP"
status: "accepted"
description: "Choix d'introduire PostgreSQL et Prisma dès le MVP plutôt que de démarrer avec une solution file-based"
date: "2026-03-31"
keywords: ["architecture", "adr", "database", "postgresql", "prisma"]
scope: ["docs", "architecture"]
technologies: ["PostgreSQL", "Prisma"]
---

# 🎯 Contexte

Le portfolio nécessite du contenu dynamique (projets, assets) dès le MVP. La question est de savoir à quel moment introduire une vraie base de données relationnelle.

---

# 🧩 Problème

Faut-il introduire PostgreSQL + Prisma dès le MVP, ou démarrer avec une solution plus simple (SQLite, fichiers JSON, MDX) et migrer plus tard ?

---

# 🛠️ Options Envisagées

## Option A — PostgreSQL + Prisma dès le MVP

**Description :** PostgreSQL conteneurisé (Docker), Prisma comme ORM, migrations versionnées dès le premier commit.

**Avantages :**
- Pas de migration de données à faire plus tard
- Prisma impose un schéma typé dès le départ
- PostgreSQL est la DB cible finale de toute façon (dashboard, CRM, chatbot RAG avec pgvector)
- Docker Compose simplifie la mise en place locale

**Inconvénients :**
- Légèrement plus lourd à setup qu'une solution file-based
- Requiert un container Docker en plus en dev et prod

**Coût estimé :** Faible — quelques heures de setup initial, évité ensuite

## Option B — SQLite pour le MVP, migration plus tard

**Description :** SQLite (via Prisma) pour le MVP, migration vers PostgreSQL pour le dashboard/chatbot.

**Avantages :**
- Zero infrastructure, fichier local
- Démarrage ultra-rapide

**Inconvénients :**
- Migration inévitable vers PostgreSQL — coût différé mais certain
- SQLite ne supporte pas pgvector (chatbot RAG futur)
- Comportements légèrement différents entre SQLite et PostgreSQL (à tester deux fois)

**Coût estimé :** Migration future non négligeable

---

# 🎉 Décision

**Option A — PostgreSQL + Prisma dès le MVP.**

Le contenu dynamique (projets) est nécessaire dès le MVP. PostgreSQL est la DB cible finale (dashboard, pgvector pour RAG). Introduire SQLite puis migrer serait un coût différé sans bénéfice réel.

---

# 🔄 Conséquences

## Positives

- Pas de migration à gérer ultérieurement
- Schéma évolutif via Prisma Migrate dès le début
- PostgreSQL prêt pour pgvector (chatbot RAG post-MVP)

## Négatives

- Un container Docker de plus en dev (mitiger avec Docker Compose)

---

# 📝 Notes complémentaires

PostgreSQL est également utilisé par Umami (analytics post-MVP), permettant potentiellement de partager le même cluster.
