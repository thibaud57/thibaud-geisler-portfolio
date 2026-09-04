---
title: "ADR-017 — Observabilité en cloud, pas en self-hosted"
status: "accepted"
description: "Décision actée : Sentry et Logfire ou Langfuse en cloud, self-hosting écarté sur critère de ressources"
date: "2026-08-29"
keywords: ["architecture", "adr", "observabilite", "monitoring", "sentry", "langfuse", "logfire", "opentelemetry"]
scope: ["docs", "architecture"]
technologies: ["Sentry", "Langfuse", "Logfire", "OpenTelemetry", "PydanticAI"]
---

# 🎯 Contexte

L'écosystème passe d'une application unique à cinq dépôts, dont trois services Python appelant des modèles de langage. Deux besoins d'observabilité distincts apparaissent : les erreurs applicatives classiques, et la traçabilité des appels LLM (prompts, réponses, appels d'outils, coûts).

La philosophie du projet privilégie le self-hosting, déjà appliquée à PostgreSQL, n8n et WireGuard, et prévue pour Umami. La question est de savoir si elle tient ici.

---

# 🧩 Problème

Où envoyer les traces et les erreurs, sachant que le VPS héberge déjà le site public en production ?

---

# 🛠️ Options Envisagées

## Option A : Tout en self-hosted

**Description :** Sentry et Langfuse déployés sur le VPS via Dokploy.

**Avantages :**
- Cohérence avec la philosophie du projet
- Données conservées sur l'infrastructure propre

**Inconvénients :**
- **Langfuse demande six conteneurs** (PostgreSQL, ClickHouse, Redis, stockage objet, web, worker). Un mainteneur chiffre le besoin réel à 16 Gi de RAM, en précisant que 8 Gi « may also work, but is really at the lower end »
- Sentry self-hosted est du même ordre de grandeur : son dépôt officiel annonce 16 Gi de RAM plus 16 Gi de swap en minimum, et recommande 32 Gi
- Le VPS dispose de 8 Gi au total, dont 2 à 3,5 Gi déjà consommés

**Coût estimé :** Une montée en gamme du VPS, pour un service qui ne produit pas de valeur métier

## Option B : Cloud sur les niveaux gratuits

**Description :** Sentry cloud pour les erreurs, Logfire ou Langfuse Cloud pour les traces LLM.

**Avantages :**
- Zéro RAM et zéro maintenance sur le VPS
- Niveaux gratuits largement dimensionnés pour le volume attendu
- PydanticAI émet nativement des traces OpenTelemetry, la destination n'est qu'une configuration

**Inconvénients :**
- Les traces transitent par un tiers
- Rétention limitée sur les niveaux gratuits

**Coût estimé :** Nul

## Option C : Pas d'observabilité LLM structurée

**Description :** Se contenter des logs Pino et de la console fournisseur.

**Avantages :**
- Rien à mettre en place

**Inconvénients :**
- Aucune visibilité sur les appels d'outils, la latence par étape, ni le coût par fonctionnalité
- Diagnostiquer un agent qui se comporte mal devient de l'archéologie de logs

**Coût estimé :** Nul immédiatement, élevé au premier incident

---

# 🎉 Décision

**Option B actée : observabilité en cloud.**

- **Sentry cloud** pour les erreurs applicatives, TypeScript comme Python
- **Logfire ou Langfuse Cloud** pour les traces LLM, au choix : les deux ingèrent de l'OpenTelemetry, changer de destination coûte une variable d'environnement
- **Aucun des deux en self-hosted**, la contrainte de mémoire est rédhibitoire sur ce VPS

L'instrumentation vit dans `ai-kit`, via une fonction `setup_telemetry()` que chaque service appelle au démarrage. PydanticAI produit déjà un span par appel de modèle et par appel d'outil, il n'y a rien à instrumenter à la main.

---

# 🔄 Conséquences

## Positives

- Le VPS reste dédié à ce qui produit de la valeur
- La traçabilité des appels d'outils est acquise sans effort, grâce à l'instrumentation native de PydanticAI
- Une seule ligne de configuration par service, centralisée dans le kit
- Changer de destination reste possible sans toucher au code applicatif, puisque tout passe par OpenTelemetry

## Négatives

- Les prompts et réponses transitent par un tiers. À proscrire pour `rag-documents` : ce service ne doit pas exporter le contenu de ses documents, seulement des métadonnées de performance
- La rétention des niveaux gratuits est courte, ce qui interdit les analyses rétrospectives lointaines
- Deux fournisseurs cloud de plus dans le registre des traitements

---

# 📝 Notes complémentaires

**La philosophie self-hosted n'est pas abandonnée**, elle est écartée ici sur un critère mesurable et non par principe. Base de données, automatisation et réseau privé restent auto-hébergés, et Umami le sera aussi, son empreinte étant sans commune mesure avec celle des plateformes d'observabilité (cf. [ADR-007](007-analytics-umami.md), qui écarte PostHog sur un besoin de ~4 Go quand Umami tourne sur un VPS d'entrée de gamme).

**Ce qui reste hors périmètre du kit** : les tableaux de bord, les seuils d'alerte et les politiques de rétention. Ce sont des choix d'exploitation, pas du code.

**Réévaluation.** Si un jour le volume de traces dépasse les niveaux gratuits, comparer le coût de l'abonnement à celui d'une montée en gamme du VPS avant de basculer en self-hosted.

**Sources :**

Relevées le 29 août 2026.

- [Langfuse, discussion « Requirements doubled from v2 to v3 »](https://github.com/orgs/langfuse/discussions/5785), réponse d'un mainteneur le 28 février 2025, sur Langfuse v3 : « you need something like a 4 CPU, 16 GiB memory instance to fully run it (8 GiB may also work, but is really at the lower end) »
- [Langfuse, tarifs](https://langfuse.com/pricing) : niveau Hobby gratuit, 50 000 unités par mois, 30 jours de rétention
- [Langfuse sur les passerelles LLM](https://langfuse.com/resources/engineering/llm-gateway) : le traçage se fait depuis l'application, pas par un proxy
- [Dokploy, installation](https://docs.dokploy.com/docs/core/installation) : « at least 2GB of RAM and 30GB of disk space ». La doc officielle ne donne pas de recommandation de production chiffrée
- [Sentry self-hosted](https://develop.sentry.dev/self-hosted/) : 4 cœurs, 16 Go de RAM plus 16 Go de swap en minimum, 32 Go recommandés

L'estimation de la consommation actuelle du VPS (2 à 3,5 Go) additionne les ordres de grandeur publiés pour Dokploy et Traefik, Next.js en production, PostgreSQL, n8n et wg-easy. À mesurer réellement avec `docker stats` avant toute décision de dimensionnement.
