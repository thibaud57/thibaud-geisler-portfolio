---
title: "BRAINSTORM — Vision & Idéation Projet"
description: "Vision globale du portfolio personnel thibaud-geisler.com : plateforme de crédibilité, hub de démos et outils internes freelance."
date: "2026-08-29"
keywords: ["brainstorm", "portfolio", "freelance", "platform", "ia", "rag", "admin"]
scope: ["docs", "planning"]
technologies: ["Next.js", "PostgreSQL", "Prisma", "Docker", "Dokploy", "Python"]
---

# 🎯 Vision Projet

## Type de Projet

Plateforme web personnelle : portfolio professionnel + hub de démos d'applications + outils internes freelance (post-MVP)

## Nom du Projet

- **Nom lisible** : Thibaud Geisler Portfolio
- **Repository Git** : `thibaud-geisler-portfolio`
- **Domaine** : `thibaud-geisler.com`

## Description

Plateforme personnelle servant de vitrine professionnelle et de hub central pour présenter mes compétences, mes projets et mes services en IA, développement full-stack et formation. Conçue dès le départ pour évoluer vers une plateforme interne de gestion freelance (espace admin, CRM, outils), mais sans sur-ingénierie initiale.

Le site ne démo pas les applications lui-même : il sert de répertoire central pointant vers des démos autonomes hébergées sur leurs propres domaines.

## Problème Résolu

Les portfolios classiques montrent des screenshots et du code, mais ne permettent pas aux clients de juger concrètement le niveau technique, particulièrement en IA. La dispersion des outils (portfolio, CRM, notes, prospection) sur plusieurs services externes complique la gestion de l'activité freelance.

**Pain Points** :

* Difficulté pour les clients de juger le niveau réel d'un développeur, notamment en IA
* Manque de démonstrations interactives dans les portfolios traditionnels
* Multiplication des outils pour gérer clients, leads et projets
* Manque de cohérence entre image publique et outils internes utilisés au quotidien

**Solution** :

Une plateforme personnelle dynamique présentant services, projets et compétences, avec liens vers des démos live d'applications. À terme, intégration d'un chatbot IA (RAG) et d'un espace admin interne freelance, sans jamais devenir un produit SaaS ou multi-utilisateur.

---

# 🏗️ Architecture

## Type

Monolithe web fullstack avec séparation logique entre partie publique et espace admin privé.

## Organisation Code

Single repository pour l'application Next.js : site public, espace admin, composants partagés. Ce n'est **pas** un monorepo (pas de `packages/api`, `packages/ui`).

Post-MVP, les traitements longs et l'IA sortent dans des dépôts voisins, découpés par frontière d'exécution et non par domaine métier ([ADR-015](adrs/015-decoupage-services.md)).

## Stratégie de démos

Le portfolio est un **hub** : chaque application développée a sa propre démo sur son propre domaine ou sous-domaine. Le portfolio se contente de lister les projets avec un lien `demo_url`.

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
* Conteneurisation : Docker + Docker Compose. PostgreSQL provisionné comme Dokploy Database autonome, joint par le réseau interne
* CI/CD : GitHub Actions porte lint, tests et build de l'image, poussée sur GHCR. Dokploy est en pull-only, déclenché par les tags de release
* Domaine & SMTP : IONOS

## Services Externes

* **SMTP IONOS** : envoi d'emails via formulaire de contact
* **Calendly** : prise de rendez-vous intégrée à la page Contact
* **API LLM** (post-MVP) : chatbot IA avec RAG, accès tranché par [ADR-016](adrs/016-acces-llm.md)
* **Umami** (post-MVP) : analytics self-hosted sur Dokploy, service séparé dont le portfolio n'embarque que le script de suivi
* **Sentry**, **Logfire ou Langfuse** (post-MVP) : erreurs et traces, en cloud ([ADR-017](adrs/017-observabilite-cloud.md))
* **n8n** (post-MVP) : self-hosted sur Dokploy, réservé à l'ingestion via API tierces en OAuth
* **Indy API**, **LinkedIn** (tardifs) : à étudier selon le besoin réel

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
* Pages rendues à la demande au premier hit puis servies depuis le Data Cache, `generateStaticParams` restant optionnel (voir ARCHITECTURE.md § Use-case 3)

Voir [ADR-003](adrs/003-case-studies-pages-dedicees.md) pour le choix pages dédiées vs modales.

### Feature 3 : Gestion et exposition des assets

Stockage et mise à disposition publique dès le MVP :

* CV téléchargeable (PDF)
* Images de projets (screenshots, schémas)
* Documents publics

Stratégie : volumes Docker pour le MVP, migration Cloudflare R2 au moment de l'upload depuis l'espace admin. Assets servis exclusivement via route API catch-all `/api/assets/[...path]` (organisation en sous-dossiers `projets/{client,personal}/<slug>/<filename>`, voir ADR-011).

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
* Détection automatique de la langue du navigateur via le proxy (redirection vers `/fr` ou `/en`)
* Librairie i18n : next-intl (acté, voir ADR-010)

**Important : à câbler dès le début du développement**, ajouter l'i18n après coup oblige à réécrire tout le contenu.

### Feature 7 : Conformité légale

Pages légales et consentement cookies obligatoires avant mise en production publique. Bloquante légalement (LCEN France, loi e-commerce Luxembourg, RGPD, directive ePrivacy).

* Page `/mentions-legales` (identification responsable + hébergeur, base légale LCEN art 6-III)
* Page `/confidentialite` (politique RGPD art 13/14, traitement du formulaire de contact, base légale intérêt légitime art 6-1-f, rétention 3 ans maximum, droits utilisateur, transfert hors UE Calendly via Data Privacy Framework)
* Bandeau consentement cookies (`@c15t/nextjs` v2 mode offline, MIT, React Provider natif, theming CSS vars, conformité CNIL out-of-the-box), conforme CNIL 2025 : Accept all / Reject all même niveau visuel (override CSS pour symétrie 2020-092), opt-in granulaire par finalité, durée cookie 13 mois max, retrait aussi simple que l'acceptation
* Gating du script Calendly inline (Feature 1 sub 04) : `widget.js` ne charge qu'après consentement de la catégorie marketing (Calendly pose des cookies tiers Segment, Google Analytics, Google Ads, Hotjar, LinkedIn Insight Tag, Facebook Pixel)
* CSP (Content-Security-Policy) finalisé en synchronisation avec le gating cookies : `*.calendly.com` autorisé seulement après consentement marketing. Umami, sans cookies, n'exige aucun consentement et sera simplement ajouté à la CSP post-MVP
* Banner cookies non-bloquant pour les Core Web Vitals : lazy load après FCP, position `fixed` pour CLS = 0, contenu indexable servi avant consentement (Googlebot ne consent jamais)
* Extension du footer (Feature 1 sub 05) : décommenter la nav légale dans la row bottom déjà préparée (Mentions légales, Politique de confidentialité, Gérer mes cookies)

Justification positionnement MVP : le formulaire de contact (Feature 4) collecte des données personnelles dès le 1er visiteur EU → politique de confidentialité obligatoire. Calendly inline embed (Feature 1 sub 04) pose des cookies tiers marketing → bandeau consentement obligatoire. Risque CNIL jusqu'à 20 M€ ou 4 % CA.

Exclu MVP : CGV (pas de vente en ligne), CGU (pas de compte utilisateur).

Registre des traitements (RGPD art. 30) : obligatoire, la dispense < 250 salariés ne couvre pas les traitements réguliers, et le formulaire de contact + les logs en sont. Doc interne (non publique, non bloquante pour la prod) → à formaliser post-launch.

---

## Post-MVP

> Le post-MVP dépasse le périmètre de ce dépôt. Le portfolio porte **les interfaces, l'authentification et le CRUD synchrone** ; les traitements longs, l'IA et l'exécution d'agents vivent dans des dépôts voisins. Le découpage et son critère sont actés dans [ADR-015](adrs/015-decoupage-services.md), la répartition des responsabilités dans [ADR-020](adrs/020-portfolio-bff.md).

### Feature 1 : Espace admin

Interface privée **single-user**, en français uniquement, accessible au seul compte autorisé. Structure et authentification : [ADR-022](adrs/022-routing-espace-admin.md) et [ADR-002](adrs/002-auth-better-auth-google-oauth.md).

Elle pilote l'ensemble de l'écosystème, y compris ce qui s'exécute ailleurs :

* Créer et modifier les projets, les tags, les contenus et les assets du site
* Suivre les leads, les prospects, les contacts et la facturation
* Consulter l'audience du site
* Déclencher la rédaction assistée et consulter les brouillons produits
* Suivre le cycle de développement des projets et les audits automatisés

### Feature 2 : Analytics

Savoir quelles pages fonctionnent, d'où viennent les visiteurs et quels projets sont consultés. **Umami**, self-hosted sur Dokploy ([ADR-007](adrs/007-analytics-umami.md)).

* Service déployé séparément, le portfolio n'embarque que le script de suivi
* Sans cookies, donc aucun consentement requis
* **Restitution dans l'espace admin** : pages les plus vues, projets les plus consultés, sources de trafic, évolution dans le temps. Les données sont lues via l'API Umami, plutôt que d'imposer un aller-retour vers une console tierce

L'ingestion est indépendante du reste, la restitution suppose l'espace admin en place.

### Feature 3 : Domaine freelance

Reprise de l'activité aujourd'hui pilotée depuis Notion : prospects, contacts, entreprises, actions de prospection, facturation, déclarations, publications LinkedIn, entretiens.

Données et écrans **dans ce dépôt**, avec les jointures vers les projets que cela permet. Migration domaine par domaine, comptabilité en premier ([ADR-021](adrs/021-notion-vers-postgresql.md)).

Ce qui relève du jugement (sourcing web, enrichissement, rédaction) part dans un service voisin ; ce qui est déterministe (grille de qualification, calculs de cotisations et de TVA, indicateurs) reste du code TypeScript ici.

### Feature 4 : Chatbot IA public

Chatbot sur le site public, vitrine de compétence technique, répondant sur le parcours, les projets et les compétences.

Interface et pilotage ici, RAG et appel au modèle dans un service dédié. C'est le principal poste facturé au token de l'écosystème, aux côtés de l'écran de recherche documentaire et du fournisseur d'embeddings ; ce qu'une personne déclenche passe par l'abonnement ([ADR-016](adrs/016-acces-llm.md)).

Contraintes : garde-fous contre l'injection de prompt, rate limiting applicatif, plafond de dépense.

### Feature 5 : Génération de contenu assistée

Rédaction de publications et de déclinaisons réseaux à partir d'un sujet, d'un projet ou d'une URL.

L'écran de commande et le stockage des brouillons sont ici, l'exécution passe par un service voisin qui appelle Claude Code, donc sur l'abonnement plutôt qu'à l'acte.

### Feature 6 : Suivi du cycle de développement

Tableau de suivi des projets et des audits automatisés, alimenté par GitHub et par un orchestrateur qui exécute des agents de code.

Vue et déclenchement ici, exécution ailleurs : cloner des dépôts et lancer des builds n'a pas sa place dans le conteneur qui sert le site public.

### Feature 7 : Documents personnels

Recherche dans des documents privés (contrats, administratif). Deux chemins d'interrogation : depuis Claude Code sur l'abonnement, et depuis l'écran admin via l'API interne du service, au token ([ADR-016](adrs/016-acces-llm.md)). Base isolée avec ses propres credentials, service séparé du chatbot public ([ADR-018](adrs/018-cloisonnement-donnees.md)).

L'écran de recherche est ici, les données jamais.

### Feature 8 : Intégrations externes

Capacités produit à étudier selon le besoin réel :

* **LinkedIn** : publication assistée et prospection. API officielle limitée et surveillée, faisabilité à valider avant de s'engager
* **Indy** : déclarations et export comptable. La facturation elle-même est internalisée ([ADR-021](adrs/021-notion-vers-postgresql.md)), cette intégration ne couvrirait que le déclaratif
* **n8n** : réservé à l'ingestion de prospects passant par des API tierces en OAuth, là où réécrire la gestion des jetons ne se justifie pas. Aucune logique d'agent ni conversationnelle, qui se font en code

> La supervision technique (erreurs, traces LLM) n'est pas une feature produit : voir [ARCHITECTURE.md](ARCHITECTURE.md) § Observabilité. L'analytics, elle, est la Feature 2 ci-dessus.

**Note Notion :** la migration se fait manuellement, domaine par domaine, sans synchro ni API dans le code ([ADR-021](adrs/021-notion-vers-postgresql.md)).

> **Blog abandonné.** La Feature « Section Blog / Articles » est retirée du périmètre : l'effort de rédaction régulière ne se justifie pas face aux autres chantiers, et le SEO du portfolio repose sur les case studies de projets. [ADR-013](adrs/013-blog-stockage.md) est marqué `deprecated`.

---

# ⚠️ Contraintes

## Business

* Budget mensuel : faible, priorité aux solutions self-hosted
* Timeline MVP : quelques semaines, priorité à un portfolio fonctionnel et crédible rapidement
* Équipe : 1 personne (développement, design, contenu)

## Technique

* Performance : temps de chargement rapide pour les pages publiques (SEO-friendly)
* Scalabilité : trafic initial faible, mais architecture pouvant évoluer
* Sécurité : pages publiques open, espace admin privé protégé, chatbot futur soumis à rate limiting

---

# ❓ Questions Ouvertes

## Techniques

* **Modèle LLM** : quel modèle pour le chatbot RAG (coût, latence, qualité) ? Le mode d'accès est tranché par l'ADR-016, il ne reste que ce choix
* **Rate limiting chatbot** : quelle implémentation pour un chatbot public sans auth ?
* **LinkedIn** : quelles sont les limites réelles de l'API officielle pour publication et prospection ?
* **Indy API** : quel est le scope exact de l'API (lecture seule ? facturation ?) ?

## Business

* Quelle part de l'activité sera orientée formation IA à moyen terme ?
* Est-ce que certains outils internes mériteront d'être transformés en produits séparés ?

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
- **Décision Notion API** : Hors scope, aucune synchro directe. Migration manuelle domaine par domaine (comptabilité, publications, CRM), voir ADR-021. n8n reste cantonné à l'ingestion de prospects via des API tierces en OAuth.
- **Décision Blog** : feature retirée du périmètre (août 2026) vs section d'articles en PostgreSQL (effort de rédaction non justifié, le SEO repose sur les case studies). ADR-013 marqué `deprecated`.
- **Décision Brouillons IA** : PostgreSQL standard plutôt que Redis, volume trop faible pour justifier un service supplémentaire. La table `Article` qui portait cette décision a disparu avec le blog, le principe reste valable pour les contenus générés de l'espace admin.
- **Décision UI System** : shadcn/ui hybride (Option C), shadcn/ui comme socle fonctionnel, Magic UI + Aceternity UI pour les effets visuels du site public (copy-paste, combinables), voir ADR-009.
- **Décision i18n** : next-intl, standard de facto pour App Router, type safety des clés, middleware de routing intégré, voir ADR-010.
- **Décision Stockage assets** : volumes Docker pour le MVP, migration vers Cloudflare R2 au moment de l'implémentation de l'upload depuis l'espace admin (free tier 10 Go, zéro egress), voir ADR-011.

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
* Les applications futures auront chacune leur propre démo et leur propre logique
* La complexité (auth avancée, multi-user, storage objet) sera ajoutée uniquement si le besoin se confirme
