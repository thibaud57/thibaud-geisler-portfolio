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
* CI/CD : GitHub Actions pour lint/tests uniquement — le déploiement est géré automatiquement par Dokploy via webhook GitHub sur merge
* Domaine & SMTP : IONOS

## Services Externes

* **SMTP IONOS** : envoi d'emails via formulaire de contact
* **Calendly** : prise de rendez-vous intégrée à la page Contact
* **API LLM** (post-MVP) : chatbot IA avec RAG
* **n8n** (post-MVP) : orchestration de workflows (automatisation leads, pipeline RAG, webhooks entre services) — self-hosted sur Dokploy
* **Umami** (post-MVP) : analytics self-hosted sur Dokploy, RGPD-friendly, sans cookies, compatible PostgreSQL
* **Indy API** (optionnel/tardif) : intégration comptabilité freelance
* **LinkedIn** (très tardif) : génération de contenu ou prospection — à étudier selon les contraintes API

---

# 🚀 Features

## MVP

### Feature 1 — Pages publiques portfolio

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
3. Formations IA en entreprise (présentiel, plusieurs niveaux — offre détaillée à définir)

### Feature 2 — Projets (liste + case studies)

Coeur du portfolio. Données stockées en base de données dès le MVP.

**Modèle BDD (4 tables Prisma) :**

`Project` (table principale) :
* `slug` (unique, URL-friendly, language-agnostic cf. ADR-010)
* `title`, `description` (teaser court affiché card + meta SEO)
* `type` : `ProjectType` (CLIENT / PERSONAL) — filtres sur la page liste
* `status` : `ProjectStatus` (DRAFT / PUBLISHED / ARCHIVED) — défaut DRAFT, seuls PUBLISHED visibles publiquement
* `formats` : `ProjectFormat[]` (API / WEB_APP / MOBILE_APP / DESKTOP_APP / CLI / IA) — multi-valeurs, nature technique du projet (affichée en badge outline à côté du titre)
* `startedAt`, `endedAt` (DateTime nullable) — début et fin de mission (CLIENT) ou début + date de MEP (PERSONAL)
* `githubUrl`, `demoUrl` (nullables — NDA / projet sans démo)
* `coverFilename`, `caseStudyMarkdown` (nullables)
* `displayOrder` (Int, défaut 0) — tri manuel ASC des projets sur la page liste (0 en premier). **Ne concerne pas l'ordre des tags du projet**, qui est porté par `ProjectTag.displayOrder`.
* relation m:n `tags` → `ProjectTag[]` via table de jointure explicite (mélange technos + infra + outils + expertises métier, distingués par `Tag.kind` ; ordre par-projet via `ProjectTag.displayOrder`)
* relation 1:1 optionnelle `clientMeta` → `ClientMeta?`

`ClientMeta` (métadonnées spécifiques aux missions clients, relation 1:1 optionnelle avec Project) :
* `teamSize` (Int nullable), `contractStatus` : `ContractStatus` (FREELANCE / CDI / STAGE / ALTERNANCE, nullable)
* `workMode` : `WorkMode` (PRESENTIEL / HYBRIDE / REMOTE) — required, info toujours connue
* relation N:1 required vers `Company` via `companyId` (une entreprise peut avoir plusieurs missions successives)
* Cascade delete avec le Project parent

`Company` (référentiel entreprises clientes, relation 1:N vers ClientMeta) :
* `slug` (unique, dérivé du nom), `name`
* `logoFilename` (nullable, image dans `/assets`), `websiteUrl` (nullable)
* `sectors` : `CompanySector[]` (Assurance / Fintech / SaaS / ... / Autre — 11 valeurs, multi)
* `size` : `CompanySize?` (TPE / PME / ETI / GROUPE)
* `locations` : `CompanyLocation[]` (Luxembourg / Paris / Grand_Est / France / Belgique / Suisse / Europe / Monde — multi)

`Tag` (référentiel unifié : technos / infra / outils / expertises métier) :
* `slug` (unique), `name`
* `kind` : `TagKind` (LANGUAGE / FRAMEWORK / DATABASE / INFRA / AI / EXPERTISE)
* `icon` (nullable, format `"<lib>:<slug>"` — ex `"simple-icons:react"` pour une techno, `"lucide:spider"` pour une expertise)
* **pas de `displayOrder` global** — l'ordre est par-projet via `ProjectTag.displayOrder`

`ProjectTag` (table de jointure explicite Project ↔ Tag, porte l'ordre d'affichage par-projet) :
* `projectId` + `tagId` — clé primaire composite
* `displayOrder` (Int, défaut 0) — tri ASC des tags **de ce projet** sur la card liste et dans chaque groupe de la case study (0 en premier)
* Cascade delete côté Project (supprimer le projet retire ses liaisons), Restrict côté Tag (protège le référentiel)
* Index composite `(projectId, displayOrder)` pour accélérer la query `orderBy: { displayOrder: 'asc' }`

**Page `/projets` :**
* Liste avec filtres client / personnel
* Cards : titre, stack (badges), lien démo, lien GitHub

**Page `/projets/[slug]` (case study) :**
* Contexte et objectifs
* Défis principaux rencontrés
* Solution mise en place
* Captures d'écran ou schémas
* Lien GitHub et lien démo
* `generateStaticParams` pour pré-générer les slugs (SEO + perf)

Voir [ADR-003](adrs/003-case-studies-pages-dedicees.md) pour le choix pages dédiées vs modales.

### Feature 3 — Gestion et exposition des assets

Stockage et mise à disposition publique dès le MVP :

* CV téléchargeable (PDF)
* Images de projets (screenshots, schémas)
* Documents publics

Stratégie : volumes Docker pour le MVP, migration Cloudflare R2 au moment du dashboard upload. Assets servis exclusivement via route API catch-all `/api/assets/[...path]` (organisation en sous-dossiers `projets/{client,personal}/<slug>/<filename>`, voir ADR-011).

### Feature 4 — Formulaire de contact

* Envoi de message via SMTP IONOS (Server Action + Zod + nodemailer)
* Widget Calendly (prise de rendez-vous)
* Liens réseaux professionnels

### Feature 5 — SEO & Référencement

Transversal — à implémenter avant la mise en production :

* Metadata Open Graph par page (titre, description, image)
* `sitemap.xml` généré dynamiquement (inclut les slugs projets)
* `robots.txt`
* Structured data JSON-LD (optionnel, post-MVP si besoin)

### Feature 6 — Support multilingue (FR / EN)

Basculement entre français et anglais pour toucher des clients nationaux et internationaux.

* Langue principale : français
* Détection automatique de la langue du navigateur via middleware (redirection vers `/fr` ou `/en`)
* Librairie i18n : next-intl (acté, voir ADR-010)

**Important : à câbler dès le début du développement** — ajouter l'i18n après coup oblige à réécrire tout le contenu.

---

## Post-MVP

### Feature 1 — Dashboard personnel (espace admin)

Interface privée **single-user** — authentification via Better Auth + Google OAuth (Gmail pro avec 2FA, whitelist email unique), sans gestion multi-utilisateur. Permettant de :

* Créer et modifier les projets
* Gérer les contenus et assets du site
* Gérer les articles de blog (CRUD, éditeur Markdown, publication)
* Générer du contenu IA (Feature 6 — brouillons d'articles et déclinaisons réseaux)
* Suivre les leads entrants

### Feature 2 — Chatbot IA (RAG) — Moyen terme

Chatbot **public** sur le site, vitrine de compétences techniques, capable de répondre aux questions sur mon parcours, mes projets et mes compétences avec mon tone of voice.

Basé sur un RAG alimenté par des documents personnels (CV, projets, articles). À étudier : choix de l'API LLM, implémentation pgvector dans PostgreSQL.

Contraintes techniques à gérer : guardrails, rate limiting, coût API.

### Feature 3 — Mini-CRM interne

Évolution vers un outil de suivi leads pour remplacer progressivement Notion :

* Fiches prospects
* Statut (prospect, en discussion, client)
* Historique des échanges

### Feature 4 — Intégrations externes

Possibles intégrations à étudier selon le besoin réel :

* n8n (workflows d'automatisation self-hosted) — couche d'intégration universelle pour les workflows futurs (contenu, leads, RAG). Toute intégration avec des services externes (Notion inclus) passe par n8n, jamais par une API directe dans le code du portfolio.
* Umami (analytics self-hosted)
* Indy (facturation freelance)
* LinkedIn (génération de contenu ou prospection — API très limitée et surveillée)

**Note Notion :** Notion sert de carnet de notes brouillon (projets, CRM actuel). La migration vers le portfolio se fait manuellement en one-shot au moment de l'implémentation du dashboard. Aucune synchro automatique, aucune API Notion dans le code.

### Feature 5 — Section Blog / Articles

Articles rédigés (tutoriels, retours d'expérience, posts techniques) pour renforcer le SEO et la crédibilité.

Stockage : **PostgreSQL** (voir ADR-013). Articles gérés via le dashboard admin (CRUD, éditeur Markdown). Pas de MDX : incompatible avec le workflow dashboard et avec la Feature 6 (brouillons générés par IA).

### Feature 6 — Génération IA de contenu

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
* Timeline MVP : quelques semaines — priorité à un portfolio fonctionnel et crédible rapidement
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

- **Décision Architecture** : Monolithe Next.js vs Séparation frontend/backend (simplicité de maintenance, projet solo — voir ADR-001)
- **Décision Auth** : Better Auth + Google OAuth (Gmail pro, whitelist email unique) — surface d'attaque minimale, 2FA Google héritée, zéro credential stocké localement (voir ADR-002, révisé avril 2026)
- **Décision Page Formations** : Intégrée dans `/services` vs Sous-page dédiée (MVP : offre non stabilisée, sous-page si l'offre grossit)
- **Décision Case Studies** : Pages dédiées `/projets/[slug]` vs Modales (SEO, partage de lien, Open Graph — voir ADR-003)
- **Décision Base de données** : PostgreSQL dès le MVP vs SQLite temporaire (DB cible finale, pgvector prévu post-MVP — voir ADR-004)
- **Décision Infrastructure** : Dokploy self-hosted vs Vercel (VPS déjà payé, contrôle total, stack complète sur même infra — voir ADR-005)
- **Décision Périmètre** : Single-user toujours vs Multi-tenant (outil personnel, pas un SaaS)
- **Décision Démos** : Hub vers domaines autonomes vs Intégration dans le portfolio (découplage, indépendance de stack — voir ADR-006)
- **Décision Chatbot RAG** : Post-MVP vs MVP (priorité au portfolio fonctionnel, chatbot = vitrine compétence non critique au lancement)
- **Décision Positionnement** : IA & Automatisation en premier vs Full-Stack en premier (différenciation principale, marché plus porteur)
- **Décision Analytics** : Umami self-hosted vs Plausible vs PostHog (RGPD-friendly, zéro coût, compatible PostgreSQL — voir ADR-007)
- **Décision Notion API** : Hors scope — aucune synchro directe. Notion = carnet de brouillon personnel. Migration CRM/projets : one-shot manuelle au moment du dashboard. Intégrations futures : via n8n uniquement.
- **Décision Blog stockage** : PostgreSQL (Option A de l'ADR-013) — dashboard admin requis de toute façon pour Feature 6 (génération IA), MDX incompatible avec ce workflow.
- **Décision Brouillons IA** : PostgreSQL standard (colonne `status: draft | published | archived`), pas Redis — volume trop faible pour justifier un service supplémentaire.
- **Décision UI System** : shadcn/ui hybride (Option C) — shadcn/ui comme socle fonctionnel, Magic UI + Aceternity UI pour les effets visuels du site public (copy-paste, combinables) — voir ADR-009.
- **Décision i18n** : next-intl — standard de facto pour App Router, type safety des clés, middleware de routing intégré — voir ADR-010.
- **Décision Stockage assets** : volumes Docker pour le MVP, migration vers Cloudflare R2 au moment de l'implémentation du dashboard upload (free tier 10 Go, zéro egress) — voir ADR-011.

**Ordre de développement MVP :**

| Étape | Contenu | Pourquoi cet ordre |
|-------|---------|-------------------|
| 1 | Setup infra : Next.js, Docker, PostgreSQL, Prisma schema (`Project`, `Asset`) | Fondation de tout le reste |
| 2 | Feature 6 — i18n (next-intl) | À câbler avant d'écrire le moindre contenu |
| 3 | Feature 2 — Projets (BDD + liste + case studies) | Coeur du portfolio, démontre la valeur |
| 4 | Feature 3 — Assets (volumes Docker + route API + CV + images) | Nécessaire pour les projets et l'accueil |
| 5 | Feature 1 — Pages publiques statiques (accueil, services, a-propos, contact) | S'appuie sur les projets déjà en BDD |
| 6 | Feature 4 — Formulaire de contact (Server Action + SMTP) | Dernière pièce fonctionnelle |
| 7 | Feature 5 — SEO (metadata, sitemap, robots.txt) | Avant mise en prod, pas avant |
| 8 | Tests, perf, polish | Smoke test, Core Web Vitals, vérif headers |
| 9 | Mise en production | Dokploy + DNS + smoke test final |

**Principes directeurs :**

* Ce site n'est pas un SaaS, ni une plateforme multi-utilisateur : outil personnel qui peut évoluer
* Pas de sur-ingénierie initiale : chaque complexité ajoutée uniquement si le besoin réel apparaît
* Le portfolio est un hub de crédibilité technique, pas une simple vitrine statique
* Les applications futures (gestion de label, flight scraper, etc.) auront chacune leur propre démo et leur propre logique
* La complexité (auth avancée, multi-user, storage objet) sera ajoutée uniquement si le besoin se confirme
