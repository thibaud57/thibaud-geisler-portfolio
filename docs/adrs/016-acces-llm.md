---
title: "ADR-016 — Accès LLM : OpenRouter, sans gateway auto-hébergée"
status: "accepted"
description: "Décision actée : routeur cloud OpenRouter, provider Anthropic en direct sur le périmètre sensible, jamais de gateway devant Claude Code"
date: "2026-08-29"
keywords: ["architecture", "adr", "llm", "gateway", "openrouter", "anthropic", "couts"]
scope: ["docs", "architecture"]
technologies: ["OpenRouter", "Anthropic", "PydanticAI"]
---

# 🎯 Contexte

Quatre points d'appel LLM sont prévus : chatbot RAG public, génération de contenu depuis l'espace admin, RAG sur documents personnels, et automatisation du développement par agents Claude Code.

Contraintes : un VPS unique hébergeant déjà Next.js, PostgreSQL, n8n et WireGuard ; un budget serré ; un abonnement Claude Max déjà payé ; des documents personnels sensibles dans le périmètre.

---

# 🧩 Problème

Faut-il une AI gateway (passerelle LLM unifiée), et si oui, auto-hébergée ou managée ?

---

# 🛠️ Options Envisagées

## Option A : Gateway auto-hébergée (LiteLLM)

**Description :** Un conteneur proxy sur le VPS, avec sa base, ses clés virtuelles et ses budgets par application.

**Avantages :**
- Clé unique, quotas par application, cache et observabilité centralisés
- Aucune dépendance à un intermédiaire cloud

**Inconvénients :**
- La documentation officielle demande **1 vCPU et 4 Gi de RAM par worker**, avec la mention « 4Gi is a floor rather than a target ». C'est plus que l'application Next.js qu'elle servirait
- Quatre incidents de sécurité critiques en 2026 : compromission de la chaîne d'approvisionnement PyPI (sans impact sur l'image Docker officielle du proxy, qui épingle ses dépendances), contournement d'authentification OIDC, injection SQL pré-authentification exploitée dans les 36 h suivant sa divulgation, et une chaîne menant à une exécution de code à distance non authentifiée, inscrite au catalogue CISA des vulnérabilités activement exploitées
- Une fuite mémoire signalée en mai 2026, toujours ouverte, sans prise en charge annoncée. Un commentaire d'août 2026 la dit disparue en 1.94, sans confirmation des mainteneurs
- Stocke les prompts en clair dans sa base de logs, ce qui créerait une copie non chiffrée des documents personnels

**Coût estimé :** Une montée en gamme du VPS plus une charge de maintenance permanente

## Option B : Gateway managée (OpenRouter)

**Description :** Routeur cloud, un seul point d'accès pour l'ensemble des fournisseurs.

**Avantages :**
- Zéro markup sur l'inférence, 5,5 % sur les recharges uniquement
- Provider natif de première classe dans PydanticAI, avec les réglages de cache typés
- Budgets par clé avec réinitialisation **quotidienne**, ce qui est la bonne parade contre un abus sur un chatbot public
- Variantes `:batch` à moitié prix, pertinentes sur la génération de contenu, asynchrone par nature
- Aucune RAM consommée, aucune surface d'attaque ajoutée

**Inconvénients :**
- Un contrat de sous-traitance signé et opposable est réservé aux clients enterprise
- Accord de rachat par Stripe annoncé le 19 août 2026, sans annonce tarifaire à ce jour
- Support client critiqué de façon récurrente sur les problèmes de facturation (retours d'utilisateurs, non sourcé)

**Coût estimé :** Environ 9 $/mois pour le seul usage qui en dépend

## Option C : provider fournisseur en direct partout

**Description :** PydanticAI avec le provider Anthropic en direct, sans routeur intermédiaire.

**Avantages :**
- Un seul sous-traitant identifié, avec un contrat standard disponible pour tous les clients API
- Retry natif, prompt caching, streaming, aucune traduction de protocole

**Inconvénients :**
- Enferme sur un fournisseur unique, tester un autre modèle demande de réécrire
- Nécessite de gérer les budgets côté console fournisseur

**Coût estimé :** Nul en infrastructure

---

# 🎉 Décision

**Aucune gateway auto-hébergée. Le choix se fait par périmètre.**

| Périmètre | Accès | Motif |
|---|---|---|
| `portfolio-chatbot` | **OpenRouter** | Principal poste facturé au token, bénéficie du batch, des budgets quotidiens et du provider PydanticAI |
| `rag-documents` | **`claude -p`** depuis Claude Code, **PydanticAI + provider Anthropic** depuis l'écran admin, fournisseur d'embeddings **à trancher** | Deux chemins d'interrogation : par Claude Code, donc sur l'abonnement ; par l'API interne que consomme l'écran admin, donc au token et sans routeur intermédiaire. L'indexation exige en plus un fournisseur d'embeddings, **qu'Anthropic ne propose pas** |
| `agent-os` | **Abonnement Claude, jamais de routeur** | Cf. ci-dessous |
| Génération de contenu | **Abonnement Claude via `claude -p`** | Déclenchée par une personne identifiée. Le CLI, et non PydanticAI : Claude Code n'est pas une API de modèle mais un agent complet, seul l'appel du binaire charge hooks, skills, MCP et `CLAUDE.md` |

**Règle absolue : jamais de gateway devant Claude Code.** La documentation Anthropic est explicite : passer par une gateway avec un credential facture l'usage au tarif API et **désactive l'abonnement** pour cette session. Router l'orchestrateur reviendrait à transformer un forfait déjà payé en facturation à l'acte.

**Discipline d'implémentation.** Partout où un modèle est appelé **par API**, le framework est **PydanticAI** et seul le provider change. Ce qui passe par l'abonnement emprunte le CLI, pas PydanticAI. Aucune application ne code un provider en dur. Tout passe par `base_url` et `api_key` venant de la configuration, via `ai-kit`. Basculer de routeur, ou vers une gateway auto-hébergée si un déclencheur se réalise, reste alors un changement de variable d'environnement.

---

# 🔄 Conséquences

## Positives

- Zéro RAM et zéro surface d'attaque ajoutées sur le VPS
- Le périmètre le plus sensible n'a aucun intermédiaire
- L'orchestrateur reste intégralement sur le forfait, ce qui est le poste de dépense le plus important
- `ai-kit` joue le rôle d'une gateway en version bibliothèque : configuration unique, observabilité unifiée, garde-fous partagés, sans latence ni point de panne

## Négatives

- Deux configurations d'accès à maintenir plutôt qu'une
- Dépendance à OpenRouter pour le chatbot, avec une incertitude tarifaire post-rachat
- Les budgets doivent être posés à deux endroits : côté routeur et côté fournisseur
- **Le fournisseur d'embeddings de `rag-documents` reste à trancher**, Anthropic n'en proposant pas. Un fournisseur tiers ferait un second sous-traitant sur le périmètre le plus sensible, ce qui affaiblit l'argument de sous-traitance unique fondant cette ligne de la décision

---

# 📝 Notes complémentaires

**Piège du prompt caching.** `claude-haiku-4.5` dispose de huit points d'accès chez OpenRouter (Anthropic, Vertex, Azure, Bedrock). Un cache écrit sur l'un est illisible depuis les autres, et un cache manqué coûte une dizaine de fois le prix d'une lecture en cache. Épingler systématiquement `{'order': ['anthropic'], 'allow_fallbacks': False}` et vérifier empiriquement que `cache_read_input_tokens` est non nul au second appel.

**Déclencheurs de réévaluation.** Basculer vers une gateway si et seulement si : la facture dépasse 150 $ par mois pendant trois mois consécutifs, un client tiers doit être refacturé à l'usage, ou un point d'appel hors monolithe manipulant des données sensibles apparaît sans contournement possible.

**Ce qui n'est pas un déclencheur :** le nombre de points d'appel. Tous les appels par API passent par la configuration unique d'`ai-kit`, les autres empruntent le CLI sur l'abonnement : ce n'est pas quatre frontières mais une.

**Sources :**

Relevées le 29 août 2026.

- [LiteLLM, dimensionnement production](https://docs.litellm.ai/docs/proxy/prod) : « Give each pod 1 vCPU and 4Gi of memory », « 4Gi is a floor rather than a target »
- [LiteLLM, compromission PyPI de mars 2026](https://docs.litellm.ai/blog/security-update-march-2026) et [injection SQL pré-authentification](https://docs.litellm.ai/blog/cve-2026-42208-litellm-proxy-sql-injection)
- [Claude Code, gateways](https://code.claude.com/docs/en/gateways) : « usage is billed to your organization's provider account at API rates, and their claude.ai subscriptions aren't used or charged »
- [OpenRouter, FAQ](https://openrouter.ai/docs/faq) : « We pass through the pricing of the underlying providers without any markup », et « 5.5% ($0.80 minimum) » sur les recharges par carte
- [Tarifs Claude](https://platform.claude.com/docs/en/about-claude/pricing) : Haiku 4.5 à 1 $ et 5 $ par million de jetons, lecture en cache à 0,10 $
- [Workspaces Anthropic](https://platform.claude.com/docs/en/manage-claude/workspaces) : plafonds de dépense par workspace, workspace Claude Code créé automatiquement
- [PydanticAI, provider OpenRouter](https://pydantic.dev/docs/ai/models/openrouter/) : `openrouter_cache_instructions` et `openrouter_provider`, avec la recommandation d'épingler le provider
- [LiteLLM, chiffrement et stockage](https://docs.litellm.ai/docs/proxy/security_encryption_faq) : `LiteLLM_SpendLogs` classé « NOT Encrypted », « Contains request/response data », `disable_spend_logs` pour couper
- [LiteLLM, divulgations et durcissement d'avril 2026](https://docs.litellm.ai/blog/security-hardening-april-2026) pour le contournement d'authentification OIDC, et [chaîne vers RCE non authentifiée, CVE-2026-42271](https://horizon3.ai/attack-research/vulnerabilities/cve-2026-42271-chained-with-cve-2026-48710/), inscrite au [catalogue CISA KEV](https://thehackernews.com/2026/06/litellm-flaw-cve-2026-42271-exploited.html), qui donne aussi l'exploitation de CVE-2026-42208 « within 36 hours of the bug becoming public knowledge »
- [LiteLLM, fuite mémoire](https://github.com/BerriAI/litellm/issues/27954) : issue ouverte le 14 mai 2026, toujours ouverte au 29 août 2026. 11 commentaires, dont un contributeur relayant vers l'équipe le 19 mai et un utilisateur la disant résolue en 1.94 le 22 août
- [Stripe, rachat d'OpenRouter](https://stripe.com/newsroom/news/stripe-agrees-to-acquire-openrouter) : « Stripe agrees to acquire OpenRouter », communiqué du 19 août 2026
- [OpenRouter, DPA et RGPD](https://openrouter.zendesk.com/hc/en-us/articles/47828437697051-How-do-I-get-OpenRouter-s-Data-Processing-Agreement-DPA-for-GDPR-compliance) : contrat signé et opposable réservé aux comptes enterprise
- [OpenRouter, clés provisionnées](https://openrouter.ai/docs/features/provisioning-api-keys) : `limit_reset` en `daily`, `weekly` ou `monthly`
- [OpenRouter, Batch API](https://openrouter.ai/docs/batch-quickstart) : variantes `:batch` à 50 % du tarif par jeton
- [OpenRouter, endpoints de `claude-haiku-4.5`](https://openrouter.ai/api/v1/models/anthropic/claude-haiku-4.5/endpoints) : huit endpoints relevés le 29 août 2026

L'estimation de ~9 $/mois repose sur des hypothèses de trafic explicites (500 conversations mensuelles de 4 tours, 6 000 jetons d'entrée dont 5 000 en cache, 300 jetons de sortie) appliquées aux tarifs ci-dessus. À revalider avec du trafic réel.
