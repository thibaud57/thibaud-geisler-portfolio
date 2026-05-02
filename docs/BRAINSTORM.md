---
title: "BRAINSTORM — Vision & Idéation Projet"
description: "Vision globale du portfolio personnel thibaud-geisler.com : plateforme de crédibilité, hub de démos et outils internes freelance."
date: "2026-03-31"
keywords: ["brainstorm", "portfolio", "freelance", "platform", "ia", "rag"]
scope: ["docs", "planning"]
technologies: ["Next.js", "PostgreSQL", "Prisma", "Docker", "Dokploy"]
---

# 🎯 Vision Projet

## Type de Projet

Plateforme web personnelle : portfolio professionnel + hub de démos d'applications + outils internes freelance (post-MVP)

## Nom du Projet

- **Nom lisible** : Thibaud Geisler Portfolio
- **Repository Git** : `thibaud-geisler-portfolio`
- **Domaine** : `thibaud-geisler.com`

## Description

Plateforme personnelle servant de vitrine professionnelle et de hub central pour présenter mes compétences, mes projets et mes services en IA, développement full-stack et formation. Conçue dès le départ pour évoluer vers une plateforme interne de gestion freelance (dashboard, CRM, outils), mais sans sur-ingénierie initiale.

Le site ne démo pas les applications lui-même : il sert de répertoire central pointant vers des démos autonomes hébergées sur leurs propres domaines.

## Problème Résolu

Les portfolios classiques montrent des screenshots et du code, mais ne permettent pas aux clients de juger concrètement le niveau technique, particulièrement en IA. La dispersion des outils (portfolio, CRM, notes, prospection) sur plusieurs services externes complique la gestion de l'activité freelance.

**Pain Points** :

* Difficulté pour les clients de juger le niveau réel d'un développeur, notamment en IA
* Manque de démonstrations interactives dans les portfolios traditionnels
* Multiplication des outils pour gérer clients, leads et projets
* Manque de cohérence entre image publique et outils internes utilisés au quotidien

**Solution** :

Une plateforme personnelle dynamique présentant services, projets et compétences, avec liens vers des démos live d'applications. À terme, intégration d'un chatbot IA (RAG) et d'un dashboard interne freelance, sans jamais devenir un produit SaaS ou multi-utilisateur.

---

# 🏗️ Architecture

## Type

Monolithe web fullstack avec séparation logique entre partie publique et dashboard privé.

## Organisation Code

Single repository, application unique. Tout le code (site public, routes admin futures, composants partagés) est dans un seul repo. Ce n'est **pas** un monorepo au sens architectural (pas de `packages/api`, `packages/ui`, etc.).

## Stratégie de démos

Le portfolio est un **hub** : chaque application développée (ex : app de gestion de label, flight scraper) a sa propre démo sur son propre domaine ou sous-domaine. Le portfolio se contente de lister les projets avec un lien `demo_url`.

---

# 🛠️ Stack Technique Envisagée

## Backend

* Langage : TypeScript
* Framework : Next.js (API routes / Server Actions)
* Database : PostgreSQL (introduite **dès le MVP**)
* ORM : Prisma

## Frontend

* Framework : Next.js (App Router, React)
* UI System : shadcn/ui hybride + Magic UI / Aceternity UI pour effets visuels (voir ADR-009)
* Dark/Light mode : prévu (contrainte UX, pas une feature produit)

## Infrastructure

* Hébergement : Dokploy (self-hosted)
* Conteneurisation : Docker + Docker Compose (PostgreSQL via volume Docker)
* CI/CD : GitHub Actions pour lint/tests uniquement, le déploiement est géré automatiquement par Dokploy via webhook GitHub sur merge
* Domaine & SMTP : IONOS

## Services Externes

* **SMTP IONOS** : envoi d'emails via formulaire de contact
* **Calendly** : prise de rendez-vous intégrée à la page Contact
* **API LLM** (post-MVP) : chatbot IA avec RAG
* **n8n** (post-MVP) : orchestration de workflows (automatisation leads, pipeline RAG, webhooks entre services), self-hosted sur Dokploy
* **Umami** (post-MVP) : analytics self-hosted sur Dokploy, RGPD-friendly, sans cookies, compatible PostgreSQL
* **Indy API** (optionnel/tardif) : intégration comptabilité freelance
* **LinkedIn** (très tardif) : génération de contenu ou prospection, à étudier selon les contraintes API

---

# 🚀 Features

## MVP

### Feature 1 : Pages publiques portfolio

Ordre narratif de la nav : Accueil → Services → Projets → À propos → Contact. L'offre d'abord, la preuve ensuite, la personne en dernier avant l'action.

**`/` Accueil**
- Hero : nom, positionnement IA, accroche forte
- Teaser services (3 offres résumées)
- 2-3 projets récents mis en avant
- CTA : prendre un appel / voir les projets

**`/services`**
- IA & Automatisation (détail de l'offre)
- Développement Full-Stack
- Formation IA en entreprise
- CTA par service

**`/projets`**
- Liste avec filtres client / personnel
- Chaque card : titre, stack (badges), lien démo, lien GitHub
- Clic sur un projet → `/projets/[slug]` (case study complet)

**`/a-propos`**
- Parcours et positionnement
- Stack technique (validée par les projets vus juste avant)
- Approche de travail / personnalité
- CV téléchargeable (bouton principal) + lien discret dans le footer et sur `/contact`
- Quelques chiffres clés (années d'expérience, projets livrés...)

**`/contact`**
- Formulaire de contact
- Widget Calendly
- Liens réseaux professionnels
- Lien CV téléchargeable (discret)

Présentation du positionnement par ordre de priorité :

1. Intelligence Artificielle & Automatisation
2. Développement Full-Stack
3. Formations IA en entreprise (présentiel, plusieurs niveaux, offre détaillée à définir)

### Feature 2 : Projets (liste + case studies)

Coeur du portfolio. Données stockées en base de données dès le MVP.

Chaque projet porte : un titre, une description courte, une stack technique (badges), des liens GitHub et démo, un type (client / personnel), un statut de publication, un format (API, Web App, CLI, IA...) et des métadonnées contextuelles pour les missions clients (entreprise, mode de travail, type de contrat). Le schéma BDD détaillé est dans [ARCHITECTURE.md](ARCHITECTURE.md).

**Page `/projets` :**
* Liste avec filtres client / personnel
* Cards : titre, format, stack (badges avec icônes), lien démo, lien GitHub

**Page `/projets/[slug]` (case study) :**
* Contexte et objectifs
* Défis principaux rencontrés
* Solution mise en place
* Captures d'écran ou schémas
* Lien GitHub et lien démo
* `generateStaticParams` pour pré-générer les slugs (SEO + perf)

Voir [ADR-003](adrs/003-case-studies-pages-dedicees.md) pour le choix pages dédiées vs modales.

### Feature 3 : Gestion et exposition des assets

Stockage et mise à disposition publique dès le MVP :

* CV téléchargeable (PDF)
* Images de projets (screenshots, schémas)
* Documents publics

Stratégie : volumes Docker pour le MVP, migration Cloudflare R2 au moment du dashboard upload. Assets servis exclusivement via route API catch-all `/api/assets/[...path]` (organisation en sous-dossiers `projets/{client,personal}/<slug>/<filename>`, voir ADR-011).

### Feature 4 : Formulaire de contact

* Envoi de message via SMTP IONOS (Server Action + Zod + nodemailer)
* Widget Calendly inline (lib `react-calendly`)
* Liens réseaux professionnels

### Feature 5 : SEO & Référencement

Transversal, à implémenter avant la mise en production :

* Metadata Open Graph + Twitter Cards par page (titre, description, hreflang FR/EN, noindex auto hors prod)
* OG images dynamiques 1200×630 (ImageResponse Next.js)
* `sitemap.xml` généré dynamiquement (slugs projets + alternates hreflang)
* `robots.txt`
* JSON-LD `ProfilePage` + `Person` (Wikidata `knowsAbout`) + `BreadcrumbList` (best practice 2026 pour Knowledge Panel + rich results E-E-A-T)
* `llms.txt` pour AI engines (ChatGPT, Perplexity, Claude search, GEO 2026)

### Feature 6 : Support multilingue (FR / EN)

Basculement entre français et anglais pour toucher des clients nationaux et internationaux.

* Langue principale : français
* Détection automatique de la langue du navigateur via middleware (redirection vers `/fr` ou `/en`)
* Librairie i18n : next-intl (acté, voir ADR-010)

**Important : à câbler dès le début du développement**, ajouter l'i18n après coup oblige à réécrire tout le contenu.

### Feature 7 : Conformité légale

Pages légales et consentement cookies obligatoires avant mise en production publique. Bloquante légalement (LCEN France, loi e-commerce Luxembourg, RGPD, directive ePrivacy).

* Page `/mentions-legales` (identification responsable + hébergeur, base légale LCEN art 6-III)
* Page `/confidentialite` (politique RGPD art 13/14, traitement du formulaire de contact, base légale intérêt légitime art 6-1-f, rétention 3 ans maximum, droits utilisateur, transfert hors UE Calendly via Data Privacy Framework)
* Bandeau consentement cookies (`@c15t/nextjs` v2 mode offline, MIT, React Provider natif, theming CSS vars, conformité CNIL out-of-the-box), conforme CNIL 2025 : Accept all / Reject all même niveau visuel (override CSS pour symétrie 2020-092), opt-in granulaire par finalité, durée cookie 13 mois max, retrait aussi simple que l'acceptation
* Gating du script Calendly inline (Feature 1 sub 04) : `widget.js` ne charge qu'après consentement de la catégorie marketing (Calendly pose des cookies tiers Segment, Google Analytics, Google Ads, Hotjar, LinkedIn Insight Tag, Facebook Pixel)
* CSP (Content-Security-Policy) finalisé en synchronisation avec le gating cookies (origines `*.calendly.com` MVP + Umami post-MVP autorisées seulement après consentement marketing)
* Banner cookies non-bloquant pour les Core Web Vitals : lazy load après FCP, position `fixed` pour CLS = 0, contenu indexable servi avant consentement (Googlebot ne consent jamais)
* Extension du footer (Feature 1 sub 05) : décommenter la nav légale dans la row bottom déjà préparée (Mentions légales, Politique de confidentialité, Gérer mes cookies)

Justification positionnement MVP : le formulaire de contact (Feature 4) collecte des données personnelles dès le 1er visiteur EU → politique de confidentialité obligatoire. Calendly inline embed (Feature 1 sub 04) pose des cookies tiers marketing → bandeau consentement obligatoire. Risque CNIL jusqu'à 20 M€ ou 4 % CA.

Exclu MVP : CGV (pas de vente en ligne), CGU (pas de compte utilisateur), registre des traitements formel (optionnel < 250 salariés).

---

## Post-MVP

### Feature 1 : Dashboard personnel (espace admin)

Interface privée **single-user**, authentification via Better Auth + Google OAuth (Gmail pro avec 2FA, whitelist email unique), sans gestion multi-utilisateur. Permettant de :

* Créer et modifier les projets
* Gérer les contenus et assets du site
* Gérer les articles de blog (CRUD, éditeur Markdown, publication)
* Générer du contenu IA (Feature 6, brouillons d'articles et déclinaisons réseaux)
* Suivre les leads entrants

### Feature 2 : Chatbot IA (RAG), Moyen terme

Chatbot **public** sur le site, vitrine de compétences techniques, capable de répondre aux questions sur mon parcours, mes projets et mes compétences avec mon tone of voice.

Basé sur un RAG alimenté par des documents personnels (CV, projets, articles). À étudier : choix de l'API LLM, implémentation pgvector dans PostgreSQL.

Contraintes techniques à gérer : guardrails, rate limiting, coût API.

### Feature 3 : Mini-CRM interne

Évolution vers un outil de suivi leads pour remplacer progressivement Notion :

* Fiches prospects
* Statut (prospect, en discussion, client)
* Historique des échanges

### Feature 4 : Intégrations externes

Possibles intégrations à étudier selon le besoin réel :

* n8n (workflows d'automatisation self-hosted), couche d'intégration universelle pour les workflows futurs (contenu, leads, RAG). Toute intégration avec des services externes (Notion inclus) passe par n8n, jamais par une API directe dans le code du portfolio.
* Umami (analytics self-hosted)
* Indy (facturation freelance)
* LinkedIn (génération de contenu ou prospection, API très limitée et surveillée)

**Note Notion :** Notion sert de carnet de notes brouillon (projets, CRM actuel). La migration vers le portfolio se fait manuellement en one-shot au moment de l'implémentation du dashboard. Aucune synchro automatique, aucune API Notion dans le code.

### Feature 5 : Section Blog / Articles

Articles rédigés (tutoriels, retours d'expérience, posts techniques) pour renforcer le SEO et la crédibilité.

Stockage : **PostgreSQL** (voir ADR-013). Articles gérés via le dashboard admin (CRUD, éditeur Markdown). Pas de MDX : incompatible avec le workflow dashboard et avec la Feature 6 (brouillons générés par IA).

Activera les schémas JSON-LD `Article`/`BlogPosting` (rich results SERPs) et l'inclusion des slugs articles dans le `sitemap.xml` existant (extension de la query Prisma du sub-project 03 `sitemap-dynamique`).

### Feature 6 : Génération IA de contenu

Outil interne dans le dashboard permettant de générer des ébauches d'articles et de déclinaisons réseaux sociaux à partir d'un input (sujet, projet existant, URL).

Workflow :
* L'utilisateur fournit un input (sujet, projet, URL source)
* L'IA génère plusieurs ébauches (`status: draft`)
* L'utilisateur choisit, édite et publie les retenues (`status: published`)
* Les ébauches non retenues sont supprimées manuellement ou via un job de nettoyage périodique

Stockage : table `Article` dans PostgreSQL standard (même base), colonne `status: draft | published | archived`. Pas de Redis (overkill pour ce volume et cet usage).

---

# ⚠️ Contraintes

## Business

* Budget mensuel : faible, priorité aux solutions self-hosted
* Timeline MVP : quelques semaines, priorité à un portfolio fonctionnel et crédible rapidement
* Équipe : 1 personne (développement, design, contenu)

## Technique

* Performance : temps de chargement rapide pour les pages publiques (SEO-friendly)
* Scalabilité : trafic initial faible, mais architecture pouvant évoluer
* Sécurité : pages publiques open, dashboard privé protégé, chatbot futur soumis à rate limiting

---

# ❓ Questions Ouvertes

## Techniques

* **API LLM** : quelle API choisir pour le chatbot RAG (coût, latence, qualité, limites) ?
* **Rate limiting chatbot** : quelle implémentation pour un chatbot public sans auth ?
* **LinkedIn** : quelles sont les limites réelles de l'API officielle pour publication et prospection ?
* **Indy API** : quel est le scope exact de l'API (lecture seule ? facturation ?) ?

## Business

* Quelle part de l'activité sera orientée formation IA à moyen terme ?
* Est-ce que certains outils internes mériteront d'être transformés en produits séparés ?
* À quel moment le CRM Notion actuel migre-t-il vers la plateforme interne ? (migration one-shot manuelle, pas de synchro API)

---

# 📝 Notes & Décisions

**Décisions actées :**

- **Décision Architecture** : Monolithe Next.js vs Séparation frontend/backend (simplicité de maintenance, projet solo, voir ADR-001)
- **Décision Auth** : Better Auth + Google OAuth (Gmail pro, whitelist email unique), surface d'attaque minimale, 2FA Google héritée, zéro credential stocké localement (voir ADR-002, révisé avril 2026)
- **Décision Page Formations** : Intégrée dans `/services` vs Sous-page dédiée (MVP : offre non stabilisée, sous-page si l'offre grossit)
- **Décision Case Studies** : Pages dédiées `/projets/[slug]` vs Modales (SEO, partage de lien, Open Graph, voir ADR-003)
- **Décision Base de données** : PostgreSQL dès le MVP vs SQLite temporaire (DB cible finale, pgvector prévu post-MVP, voir ADR-004)
- **Décision Infrastructure** : Dokploy self-hosted vs Vercel (VPS déjà payé, contrôle total, stack complète sur même infra, voir ADR-005)
- **Décision Périmètre** : Single-user toujours vs Multi-tenant (outil personnel, pas un SaaS)
- **Décision Démos** : Hub vers domaines autonomes vs Intégration dans le portfolio (découplage, indépendance de stack, voir ADR-006)
- **Décision Chatbot RAG** : Post-MVP vs MVP (priorité au portfolio fonctionnel, chatbot = vitrine compétence non critique au lancement)
- **Décision Positionnement** : IA & Automatisation en premier vs Full-Stack en premier (différenciation principale, marché plus porteur)
- **Décision Analytics** : Umami self-hosted vs Plausible vs PostHog (RGPD-friendly, zéro coût, compatible PostgreSQL, voir ADR-007)
- **Décision Notion API** : Hors scope, aucune synchro directe. Notion = carnet de brouillon personnel. Migration CRM/projets : one-shot manuelle au moment du dashboard. Intégrations futures : via n8n uniquement.
- **Décision Blog stockage** : PostgreSQL (Option A de l'ADR-013), dashboard admin requis de toute façon pour Feature 6 (génération IA), MDX incompatible avec ce workflow.
- **Décision Brouillons IA** : PostgreSQL standard (colonne `status: draft | published | archived`), pas Redis, volume trop faible pour justifier un service supplémentaire.
- **Décision UI System** : shadcn/ui hybride (Option C), shadcn/ui comme socle fonctionnel, Magic UI + Aceternity UI pour les effets visuels du site public (copy-paste, combinables), voir ADR-009.
- **Décision i18n** : next-intl, standard de facto pour App Router, type safety des clés, middleware de routing intégré, voir ADR-010.
- **Décision Stockage assets** : volumes Docker pour le MVP, migration vers Cloudflare R2 au moment de l'implémentation du dashboard upload (free tier 10 Go, zéro egress), voir ADR-011.

**Ordre de développement MVP :**

| Étape | Contenu | Pourquoi cet ordre |
|-------|---------|-------------------|
| 1 | Setup infra : Next.js, Docker, PostgreSQL, Prisma schema | Fondation de tout le reste |
| 2 | Feature 6 : i18n (next-intl) | À câbler avant d'écrire le moindre contenu |
| 3 | Feature 2 : Projets (BDD + liste + case studies) | Coeur du portfolio, démontre la valeur |
| 4 | Feature 3 : Assets (volumes Docker + route API + CV + images) | Nécessaire pour les projets et l'accueil |
| 5 | Feature 1 : Pages publiques statiques (accueil, services, a-propos, contact) | S'appuie sur les projets déjà en BDD |
| 6 | Feature 4 : Formulaire de contact (Server Action + SMTP) + widget Calendly | Dernière pièce fonctionnelle |
| 7 | Feature 5 : SEO (metadata, sitemap, robots.txt) | Avant mise en prod, pas avant |
| 8 | Feature 7 : Conformité légale (mentions, confidentialité, bandeau cookies + gating Calendly) | **Bloquante avant prod publique**, LCEN + RGPD + directive ePrivacy (risque CNIL). Passe par les tests de l'étape 9 |
| 9 | Tests, perf, polish | Smoke test, Core Web Vitals, vérif headers, couvre tout le code livré étapes 1 à 8 |
| 10 | Mise en production | Dokploy + DNS + smoke test final |

**Principes directeurs :**

* Ce site n'est pas un SaaS, ni une plateforme multi-utilisateur : outil personnel qui peut évoluer
* Pas de sur-ingénierie initiale : chaque complexité ajoutée uniquement si le besoin réel apparaît
* Le portfolio est un hub de crédibilité technique, pas une simple vitrine statique
* Les applications futures (gestion de label, flight scraper, etc.) auront chacune leur propre démo et leur propre logique
* La complexité (auth avancée, multi-user, storage objet) sera ajoutée uniquement si le besoin se confirme
