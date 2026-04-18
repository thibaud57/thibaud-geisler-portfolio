---
title: "ADR-012 — API LLM pour le chatbot RAG"
status: "proposed"
description: "Décision ouverte : choix de l'API LLM pour le chatbot IA public (post-MVP)"
date: "2026-03-31"
keywords: ["architecture", "adr", "llm", "rag", "chatbot", "ia"]
scope: ["docs", "architecture"]
technologies: ["PostgreSQL", "pgvector"]
---

# 🎯 Contexte

Post-MVP, un chatbot public IA (RAG) sera intégré au portfolio comme vitrine de compétences techniques. Il répondra aux questions sur le parcours, les projets et les compétences avec le tone of voice de Thibaud. Contraintes : coût API, latence, qualité des réponses, guardrails, rate limiting.

---

# 🧩 Problème

Quelle API LLM choisir pour alimenter le chatbot RAG du portfolio, en tenant compte du coût, de la latence, de la qualité et des limites ?

---

# 🛠️ Options Envisagées

## Option A — Anthropic Claude API

**Description :** API Claude d'Anthropic (modèle Haiku pour le coût, Sonnet pour la qualité).

**Avantages :**
- Excellent suivi d'instructions et gestion du tone of voice — idéal pour un chatbot à persona personnalisée
- Modèle Haiku : latence faible (Time-to-First-Token ~500ms), très bon rapport qualité/coût
- Anthropic SDK TypeScript mature, bien documenté

**Inconvénients :**
- Serveurs hors UE (AWS us-east) — DPA Anthropic à vérifier pour conformité RGPD
- Coût par token : ~$0.25/M tokens input (Haiku) — négligeable avec rate limiting

**Coût estimé :** ~$0.25/M tokens input (modèle économique) — quelques centimes/mois à faible trafic

## Option B — OpenAI GPT

**Description :** Modèle GPT-4o-mini pour le coût, GPT-4o pour la qualité.

**Avantages :**
- Écosystème large, documentation abondante
- GPT-4o-mini : bon rapport qualité/coût (~$0.15/M tokens input)

**Inconvénients :**
- Serveurs hors UE — DPA OpenAI à vérifier pour conformité RGPD
- Suivi du tone of voice légèrement inférieur à Claude pour des consignes précises
- Rate limits plus restrictifs en tier 1 (nouveaux comptes)

**Coût estimé :** ~$0.15/M tokens input (modèle économique)

## Option C — Mistral AI

**Description :** Mistral Small ou Medium via La Plateforme (hébergé en Europe).

**Avantages :**
- Fournisseur européen — données hébergées en France/UE, conformité RGPD native sans DPA supplémentaire
- Bon rapport qualité/coût, latence comparable aux options A et B

**Inconvénients :**
- Suivi d'instructions et gestion du tone of voice moins performants que Claude ou GPT sur des prompts complexes
- SDK TypeScript moins mature

**Coût estimé :** ~$0.20/M tokens input (modèle Small)

---

# 🎉 Décision

**À décider** au moment de l'implémentation du chatbot (post-MVP).

---

# 🔄 Conséquences

## Positives

- Chatbot IA public sur le portfolio = vitrine concrète de compétences techniques en IA
- Coût marginal très faible à faible trafic (quelques centimes/mois avec rate limiting)
- pgvector déjà prévu dans l'infra PostgreSQL — pas d'infrastructure supplémentaire pour le RAG

## Négatives

- Coût variable par token à surveiller — rate limiting obligatoire sur l'API route du chatbot (par IP, quotas journaliers)
- Dépendance à un service tiers externe (disponibilité, changements de pricing)
- Si Option A ou B : vérifier la conformité RGPD (DPA à signer avec Anthropic/OpenAI)

---

# 📝 Notes complémentaires

Le RAG sera basé sur pgvector dans PostgreSQL (déjà prévu dans l'infra). Le choix de l'API LLM est indépendant du pipeline RAG.

Voir [ADR-014](014-rate-limiting-chatbot.md) pour la stratégie de rate limiting sur la route API du chatbot — les deux décisions sont interdépendantes : le seuil de rate limiting doit être calibré en fonction du coût par token de l'API LLM retenue.

**Sécurité du chatbot (à formaliser avant l'implémentation) :**

- **Prompt injection** : vecteur d'attaque principal sur un chatbot public. L'input utilisateur va systématiquement dans le rôle `user`, jamais interpolé dans le `system` prompt (qui reste fixe).
- **Scope strict** : system prompt avec instructions explicites — répondre uniquement aux questions sur le parcours, les projets et les compétences, refuser toute autre demande.
- **Filtrage de l'input** : longueur maximale sur le message utilisateur + détection de patterns suspects avant envoi au LLM.
- **Filtrage de l'output** : bloquer les réponses reproduisant le contenu du system prompt ou sortant du scope défini.
- **Logging des échanges** : logger inputs/outputs (sans données personnelles) pour détecter les patterns d'abus post-déploiement.

Ces points sont à détailler dans un ADR dédié ou une section sécurité au moment où le chatbot entre en scope actif.
