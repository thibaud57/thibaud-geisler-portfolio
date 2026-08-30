---
title: "ADR-019 — Communication inter-services : HTTP interne, jamais exposé"
status: "accepted"
description: "Décision actée : appels HTTP sur réseau Docker interne, contrats OpenAPI, aucun service Python exposé par Traefik"
date: "2026-08-29"
keywords: ["architecture", "adr", "reseau", "docker", "traefik", "dokploy", "securite", "api"]
scope: ["docs", "architecture"]
technologies: ["Docker", "Traefik", "Dokploy", "FastAPI", "Next.js"]
---

# 🎯 Contexte

Le découpage acté en [ADR-015](015-decoupage-services.md) fait cohabiter une application Next.js et trois services Python sur le même VPS Dokploy. Le portfolio porte tous les fronts et doit appeler ces services.

Quatre projets Dokploy existent déjà : Portfolio, Scrappers, VPN et Automation. Deux domaines sont en service : `thibaud-geisler.com` pour la vitrine, `empiricmind.fr` pour les outils d'infrastructure.

---

# 🧩 Problème

Comment ces services communiquent-ils, et lesquels doivent être joignables depuis internet ?

---

# 🛠️ Options Envisagées

## Option A : Tous les services exposés par Traefik

**Description :** Un sous-domaine par service, chacun protégé par sa propre authentification.

**Avantages :**
- Accessibles depuis n'importe où, y compris hors du VPS
- Débogage direct depuis un navigateur

**Inconvénients :**
- Multiplie la surface d'attaque pour aucun besoin réel : ces services détiennent les clés LLM et les documents personnels
- Impose d'implémenter une authentification dans chaque service
- Certificats TLS et sous-domaines à gérer pour des composants purement internes

**Coût estimé :** Faible en mise en œuvre, élevé en risque

## Option B : Réseau Docker interne, aucune exposition

**Description :** Les services Python sont joignables par leur nom de conteneur depuis le portfolio, et par personne d'autre.

**Avantages :**
- Surface d'attaque nulle depuis internet
- Aucun certificat, aucun sous-domaine, aucune authentification externe à écrire
- Un jeton de service suffit, le réseau n'étant pas public

**Inconvénients :**
- Le débogage passe par `docker exec` ou par un tunnel
- Un consommateur hors du VPS deviendrait impossible sans changement

**Coût estimé :** Nul

## Option C : File de messages plutôt qu'appels directs

**Description :** Communication asynchrone via une file, sans appels HTTP.

**Avantages :**
- Découplage fort, résilience aux redémarrages

**Inconvénients :**
- Sur-ingénierie pour un appel synchrone comme une requête au chatbot
- La file existe déjà pour ce qui est vraiment asynchrone, dans `agent-os`

**Coût estimé :** Complexité disproportionnée

---

# 🎉 Décision

**Option B actée : HTTP interne sur réseau Docker, aucune exposition publique.**

```
Internet
   │
   ▼
Traefik
   ├── thibaud-geisler.com    portfolio (public + /admin)   seul point sous l'auth du portfolio
   ├── n8n.empiricmind.fr     n8n            authentification propre
   ├── vpn.empiricmind.fr     wg-easy        authentification propre
   └── techno-scraper.empiricmind.fr            clé d'API en en-tête

Réseau Docker interne, ni Traefik, ni domaine, ni internet
   ├── portfolio-chatbot:8000
   ├── rag-documents:8000
   └── agent-os                 API interne de dépôt de jobs
```

**Un conteneur peut appartenir à plusieurs réseaux.** Les projets Dokploy sont un regroupement visuel, pas une frontière réseau : un réseau Docker externe partagé permet à des services de projets différents de se parler sans aucune exposition.

**Contrats d'API.** Les services Python exposent un schéma OpenAPI généré par FastAPI, dont un client TypeScript est dérivé. Le portfolio ne connaît pas les types internes de ces services, seulement leur contrat.

**Authentification de service.** Un jeton partagé, injecté par variable d'environnement, suffit tant que le réseau n'est pas exposé. Il protège d'un conteneur tiers compromis sur le même réseau, pas d'internet, qui n'y a pas accès.

**Domaines et session.** Le cookie de session Better Auth est posé sur `thibaud-geisler.com` et ne traverse pas vers `empiricmind.fr`, faute de racine commune. **Tout ce qui est protégé par l'authentification de l'espace admin reste sur le domaine du portfolio.** Une future interface authentifiée séparée serait un sous-domaine de `thibaud-geisler.com`, jamais sur l'autre domaine.

---

# 🔄 Conséquences

## Positives

- Les services détenant les clés LLM et les documents personnels n'ont aucune surface d'attaque depuis internet
- Aucune authentification externe à écrire dans les services Python
- Un contrat OpenAPI typé de bout en bout, sans duplication manuelle de types
- Le partage de réseau reste disponible si une application future doit consommer ces services

## Négatives

- Le débogage d'un service interne impose de passer par le VPS
- Un consommateur externe futur exigerait de revoir cette décision, avec authentification et exposition contrôlée
- Le jeton de service est un secret de plus à gérer et à faire tourner

---

# 📝 Notes complémentaires

**Un projet Dokploy n'est pas une frontière réseau.** Dokploy injecte `dokploy-network` dans les Applications créées depuis son UI, mais un compose déployé manuellement atterrit sur son propre réseau : il faut y déclarer `dokploy-network` en réseau externe et l'attacher explicitement. C'est l'anti-pattern relevé dans [knowledges/dokploy.md](../knowledges/dokploy.md) § Anti-Patterns ; la marche à suivre détaillée y reste à écrire au moment de déployer le premier service Python.

**Limites de ressources par conteneur**, en particulier sur `agent-os` dont les pics pendant les builds peuvent dégrader le site public qui tourne sur la même machine.

**Partage de code plutôt que de service.** Ce qui se partage entre applications sans état commun (configuration LLM, patterns d'agents, télémétrie) passe par le package `ai-kit`, pas par un service réseau. Un service partagé ne se justifie que lorsque de la donnée ou un état doivent l'être.
