---
title: "ADR-012 — API LLM pour le chatbot RAG"
status: "proposed"
description: "Décision ouverte : choix du modèle pour le chatbot RAG public, le mode d'accès étant tranché par l'ADR-016 (post-MVP)"
date: "2026-03-31"
keywords: ["architecture", "adr", "llm", "rag", "chatbot", "ia"]
scope: ["docs", "architecture"]
technologies: ["PostgreSQL", "pgvector"]
---

# 🎯 Contexte

Post-MVP, un chatbot public IA (RAG) servira de vitrine de compétences techniques. Écrit quand il devait être une route API de ce dépôt, cet ADR lui est antérieur au découpage : [ADR-015](015-decoupage-services.md) l'a depuis placé dans le service Python `portfolio-chatbot`, dont le portfolio ne porte que l'interface. Il répondra aux questions sur le parcours, les projets et les compétences avec le tone of voice de Thibaud. Contraintes : coût API, latence, qualité des réponses, guardrails, rate limiting.

---

# 🧩 Problème

Quelle API LLM choisir pour alimenter le chatbot RAG du portfolio, en tenant compte du coût, de la latence, de la qualité et des limites ?

---

# 🛠️ Options Envisagées

> Les tarifs de cette section ont été relevés le 31/03/2026 et portent sur des générations de modèles antérieures. Ils sont **périmés** et servent d'ordre de grandeur comparatif, pas de base de chiffrage : le coût réel est estimé dans [ADR-016](016-acces-llm.md) § Notes complémentaires. À revalider contre les grilles tarifaires du jour avant de trancher.

## Option A : Anthropic Claude API

**Description :** API Claude d'Anthropic (modèle Haiku pour le coût, Sonnet pour la qualité).

**Avantages :**
- Excellent suivi d'instructions et gestion du tone of voice, idéal pour un chatbot à persona personnalisée
- Modèle Haiku : latence faible (Time-to-First-Token ~500ms), très bon rapport qualité/coût
- Anthropic SDK TypeScript mature, bien documenté

**Inconvénients :**
- Serveurs hors UE (AWS us-east), DPA Anthropic à vérifier pour conformité RGPD
- Coût par token du modèle économique de la gamme, négligeable avec rate limiting (Haiku 4.5 est à 1 $/MTok en entrée et 5 $ en sortie au 29/08/2026)

**Coût estimé :** quelques centimes par mois à très faible trafic. Sur les hypothèses de trafic d'[ADR-016](016-acces-llm.md) (500 conversations mensuelles), le poste tourne autour de 9 $/mois

## Option B : OpenAI GPT

**Description :** Modèle GPT-4o-mini pour le coût, GPT-4o pour la qualité.

**Avantages :**
- Écosystème large, documentation abondante
- GPT-4o-mini : bon rapport qualité/coût (~$0.15/M tokens input)

**Inconvénients :**
- Serveurs hors UE, DPA OpenAI à vérifier pour conformité RGPD
- Suivi du tone of voice légèrement inférieur à Claude pour des consignes précises
- Rate limits plus restrictifs en tier 1 (nouveaux comptes)

**Coût estimé :** ~$0.15/M tokens input (modèle économique)

## Option C : Mistral AI

**Description :** Mistral Small ou Medium via La Plateforme (hébergé en Europe).

**Avantages :**
- Fournisseur européen, données hébergées en France/UE, conformité RGPD native sans DPA supplémentaire
- Bon rapport qualité/coût, latence comparable aux options A et B

**Inconvénients :**
- Suivi d'instructions et gestion du tone of voice moins performants que Claude ou GPT sur des prompts complexes
- SDK TypeScript moins mature

**Coût estimé :** ~$0.20/M tokens input (modèle Small)

---

# 🎉 Décision

**Périmètre réduit par [ADR-016](016-acces-llm.md).** Le *mode d'accès* est tranché : le chatbot public passe par OpenRouter, les documents personnels par le provider Anthropic en direct, et tout ce qui est déclenché manuellement par l'abonnement Claude via `claude -p`. Partout où un modèle est appelé par API, le framework est PydanticAI et le provider vient de la configuration du package `ai-kit`. Ce qui passe par l'abonnement emprunte le CLI.

Ce qu'il reste à décider ici : **le choix du modèle** pour le chatbot. OpenRouter les rend tous accessibles derrière la même interface, ce qui rend l'arbitrage réversible en une chaîne de caractères.

Les arguments comparatifs ci-dessus restent valables sur la qualité et le coût par modèle. Celui portant sur la maturité du SDK TypeScript est en revanche caduc : le chatbot est un service Python utilisant PydanticAI (voir [ADR-015](015-decoupage-services.md)).

---

# 🔄 Conséquences

## Positives

- Chatbot IA public sur le portfolio = vitrine concrète de compétences techniques en IA
- Coût marginal très faible à faible trafic (quelques centimes/mois avec rate limiting)
- pgvector déjà prévu dans l'infra PostgreSQL, pas d'infrastructure supplémentaire pour le RAG

## Négatives

- Coût variable par token à surveiller, rate limiting obligatoire côté service chatbot (par IP, quotas journaliers)
- Dépendance à un service tiers externe (disponibilité, changements de pricing)
- **Conformité RGPD à traiter avec OpenRouter**, qui devient le sous-traitant direct du chatbot ([ADR-016](016-acces-llm.md)), quel que soit le modèle retenu. Un contrat de sous-traitance signé et opposable y est réservé aux clients enterprise : arbitrage à documenter dans le [registre des traitements](../registre-traitements.md)

---

# 📝 Notes complémentaires

Le RAG sera basé sur pgvector dans PostgreSQL (déjà prévu dans l'infra). Le choix de l'API LLM est indépendant du pipeline RAG.

Voir [ADR-014](014-rate-limiting-chatbot.md) pour la stratégie de rate limiting du chatbot, les deux décisions sont interdépendantes : le seuil de rate limiting doit être calibré en fonction du coût par token de l'API LLM retenue.

**Sécurité du chatbot (à formaliser avant l'implémentation) :**

- **Prompt injection** : vecteur d'attaque principal sur un chatbot public. L'input utilisateur va systématiquement dans le rôle `user`, jamais interpolé dans le `system` prompt (qui reste fixe).
- **Scope strict** : system prompt avec instructions explicites, répondre uniquement aux questions sur le parcours, les projets et les compétences, refuser toute autre demande.
- **Filtrage de l'input** : longueur maximale sur le message utilisateur + détection de patterns suspects avant envoi au LLM.
- **Filtrage de l'output** : bloquer les réponses reproduisant le contenu du system prompt ou sortant du scope défini.
- **Logging des échanges** : logger inputs/outputs (sans données personnelles) pour détecter les patterns d'abus post-déploiement.

Ces points sont à détailler dans un ADR dédié ou une section sécurité au moment où le chatbot entre en scope actif.
