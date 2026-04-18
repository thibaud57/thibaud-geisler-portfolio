---
title: "ADR-014 — Rate limiting chatbot public"
status: "proposed"
description: "Décision ouverte : stratégie de rate limiting sur la route API du chatbot public sans authentification (post-MVP)"
date: "2026-03-31"
keywords: ["architecture", "adr", "rate-limiting", "chatbot", "security"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "PostgreSQL"]
---

# 🎯 Contexte

Le chatbot RAG public (post-MVP) est accessible sans authentification. Chaque requête déclenche un appel à une API LLM payante. Sans rate limiting, un utilisateur malveillant ou un bot peut générer des coûts API significatifs en quelques minutes. Le seul identifiant disponible côté serveur sans auth est l'adresse IP du client.

---

# 🧩 Problème

Comment implémenter un rate limiting efficace sur la route API du chatbot pour des utilisateurs non authentifiés, sans infrastructure supplémentaire et sans faux positifs excessifs ?

---

# 🛠️ Options Envisagées

## Option A — Rate limiting IP-based in-memory (middleware Next.js)

**Description :** Compteur par IP en mémoire Node.js (Map avec TTL), implémenté dans le middleware Next.js ou dans la route API. Fenêtre temporelle configurable (ex : 10 requêtes/heure/IP).

**Avantages :**
- Zéro infrastructure, zéro coût
- Zéro latence (pas de query BDD ou service externe)
- Implémentation simple (~30 lignes)
- Adapté à un déploiement single-instance (Dokploy)

**Inconvénients :**
- Compteurs perdus au redémarrage du container (acceptable pour un portfolio à faible trafic)
- Bypassable via VPN ou proxy (protection partielle mais suffisante pour dissuader les abus simples)

**Coût estimé :** Nul

## Option B — Rate limiting IP-based persisté en PostgreSQL

**Description :** Compteur par IP stocké en PostgreSQL avec horodatage, incrémenté à chaque requête chatbot et vérifié en amont de l'appel LLM.

**Avantages :**
- Persistance entre redémarrages du container
- Historique consultable (audit, détection d'abus répétés)
- PostgreSQL déjà présent dans l'infra — pas de nouveau service

**Inconvénients :**
- Latence ajoutée sur chaque requête chatbot (query BDD supplémentaire)
- Schéma BDD supplémentaire à maintenir (`rate_limit_entries`)
- Charge sur PostgreSQL proportionnelle au trafic chatbot

**Coût estimé :** Faible — quelques heures d'implémentation

## Option C — Upstash Rate Limit (@upstash/ratelimit)

**Description :** Service Redis-as-a-service cloud avec la librairie `@upstash/ratelimit`. Algorithme sliding window, SDK TypeScript officiel.

**Avantages :**
- Algorithme sliding window précis (versus fixed window des options A/B)
- SDK TypeScript mature, bien documenté
- Résistant à un déploiement multi-instance si besoin futur

**Inconvénients :**
- Dépendance à un service cloud externe
- Coût faible mais non nul
- Surdimensionné pour un portfolio single-instance à faible trafic

**Coût estimé :** ~0-5€/mois selon usage

---

# 🎉 Décision

**À décider** au moment de l'implémentation du chatbot (post-MVP). L'Option A (in-memory) est le candidat favori : adapté à un trafic faible, zéro coût, zéro latence — suffisant pour protéger contre les abus simples sur un portfolio single-instance.

---

# 🔄 Conséquences

## Positives

- Si Option A (in-memory) : implémentation minimale, zéro coût, zéro dépendance — suffisant pour dissuader les abus simples à faible trafic
- Si Option B (PostgreSQL) : persistance et auditabilité sans service supplémentaire — PostgreSQL déjà là
- Si Option C (Upstash) : robustesse maximale avec sliding window, résistant à la mise à l'échelle

## Négatives

- Si Option A : compteurs non persistés entre redémarrages, bypassable via VPN — protection partielle
- Si Option B : latence BDD sur chaque appel chatbot, schéma de compteurs à maintenir
- Si Option C : dépendance externe, coût variable, over-engineered pour ce contexte

---

# 📝 Notes complémentaires

Le rate limiting est indépendant du choix de l'API LLM (voir ADR-012). Quelle que soit l'option retenue, les paramètres à définir lors de l'implémentation sont : quota par IP (ex : 10 req/heure), message d'erreur utilisateur (HTTP 429), et stratégie de fenêtre (rolling ou fixed).

Approche complémentaire recommandée : quota global journalier côté provider LLM (alerte si seuil de dépense dépassé), indépendamment du rate limiting applicatif. Ces deux mécanismes sont cumulables.
