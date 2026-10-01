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

Les features sont numérotées dans l'ordre de priorité, chacune avec ses prérequis. L'espace admin (Feature 1), livré, est le prérequis commun de toutes celles qui ont un écran : il n'est cité que là où il est le seul. Chaque domaine livre ensemble son CRUD, ses outils pour les agents et ses jobs, sur le socle posé par les agents internes (Feature 3).

### Feature 1 : Espace admin

Interface privée **single-user**, en français uniquement, accessible au seul compte autorisé. Structure et authentification : [ADR-021](adrs/021-routing-espace-admin.md) et [ADR-002](adrs/002-auth-better-auth-google-oauth.md).

Elle pilote l'ensemble de l'écosystème, y compris ce qui s'exécute ailleurs :

* Créer et modifier les projets, les tags, les contenus et les assets du site
* Suivre les leads, les prospects, les contacts et la facturation
* Consulter l'audience du site
* Déclencher la rédaction assistée et consulter les brouillons produits
* Suivre le cycle de développement des projets et les audits automatisés

Reporté, écran de la maquette à l'appui :

* **Réglages** : modale de préférences de l'espace admin (thème, lignes par page par défaut, raccourcis clavier), écran `dlgSettings`

Prérequis : le MVP en production. Livrée en `v2.0.0` le 2026-09-25.

### Feature 2 : Domaine freelance CRM

Reprise du CRM tenu dans Notion : entreprises, leads, actions de prospection, contacts, missions proposées et leurs entretiens, revues hebdomadaires, signaux. Une personne n'existe qu'une fois : elle porte son identité et son opposition, et prospect (lead) ou relation durable (contact) sont ses rôles. La mission s'y arrête à l'opportunité, de sa proposition à son acceptation : son suivi une fois acceptée relève de la Feature 4.

Données et écrans **dans ce dépôt**, avec les jointures vers les projets que cela permet ([ADR-020](adrs/020-portfolio-bff.md)).

Ce qui relève du jugement (sourcing web, enrichissement, rédaction) part dans les agents internes (Feature 3) ; ce qui est déterministe (grille de qualification, indicateurs, échéances de conservation) reste du code TypeScript ici. La reprise des données Notion passe une fois les leads par une session Claude, comme le toolkit freelance aujourd'hui : le volet RGPD de ce passage par Anthropic se traite avec la Feature 3.

La maquette de l'espace admin dessine déjà ces écrans, et le CRUD des entreprises livré avant eux s'arrête au sous-ensemble que le schéma porte. Côté entreprises, cette feature reprend donc, écrans de la maquette à l'appui :

* **Fiche entreprise enrichie** : types, zones, statut de relation, notes ; la date de premier contact, « travaillée » et les clients finaux d'une ESN se déduisent des actions, des projets et des missions acceptées, jamais saisis. Les vues « Recrutement » et « Prospects » de la liste en dépendent, et restent désactivées jusque-là
* **Entité légale créée depuis la fiche** : raison sociale, forme juridique, SIRET, TVA, RCS, capital et adresse, en saisie manuelle ; sur la société du propriétaire, la date d'assujettissement à la TVA et le régime, dont dépendent les mentions légales du site
* **Panneau de détail** ouvert au clic sur une ligne de liste
* **Logo récupéré depuis le site de l'entreprise** ([ADR-023](adrs/023-source-logos-entreprise.md)) : un bouton lit l'icône déclarée à l'adresse du champ site web, ou sur la capture Wayback que l'admin y met quand le site a disparu, et la stocke dans le bucket d'assets ; le dépôt manuel écrase le fichier

Reportés, écrans de la maquette à l'appui :

* **Pré-remplissage de l'entité légale**, avec les agents internes (Feature 3) : bouton « Pré-remplir » de la card Entité légale, écran `isCompanyForm`
* **Qualification ICP**, avec les agents internes (Feature 3), qui en collectent les critères : le score du formulaire lead (`dlgLeadForm`, « le score se calcule ») reste saisi à la main d'ici là
* **Outils de saisie des temps** imposés par un client pour le CRA, avec le suivi de mission (Feature 4) : champ de la card Relation de `isCompanyForm`. Une liste fixe ne couvre pas les logiciels internes des entreprises, la forme se décide quand le CRA en aura besoin

Prérequis : l'espace admin (Feature 1).

### Feature 3 : Agents internes

Ce qui demande du jugement dans l'espace admin, exécuté sur l'abonnement Claude plutôt qu'au token ([ADR-016](adrs/016-acces-llm.md)). Chaque exécution est une session Claude Code lancée par le propriétaire dans `agent-os`, avec son environnement complet (configuration globale, toolkit freelance). L'admin affiche l'état des runs ; quand une session attend un accord ou une réponse, ou se termine, Telegram prévient le téléphone, d'où se donne la réponse ([ADR-026](adrs/026-execution-claude-code-abonnement.md)). Trois briques, de la plus simple à la plus ouverte :

* **Jobs déclenchés depuis l'admin** : l'IA propose, l'admin valide. L'espace admin dépose un job sur l'API interne d'`agent-os` ([ADR-015](adrs/015-decoupage-services.md), [ADR-019](adrs/019-communication-inter-services.md)), qui exécute Claude Code et rend un résultat ; l'app l'affiche et l'enregistre après validation, seule à écrire dans ses schemas. Premiers usages : les reports de la Feature 2 (pré-remplissage de l'entité légale, qualification ICP), l'enrichissement des fiches, la rédaction des messages de prospection et un sourcing qui dépose des candidats à trier
* **Outils de l'app pour les agents** : les actions de chaque domaine exposées aux agents (créer un lead, lister les leads sans signal récent, ajouter un signal…), découpées par domaine, pour qu'un agent lise et agisse sur l'app sans toucher la base, avec les mêmes règles de validation que l'admin. Les skills du toolkit freelance s'y rebranchent. Leur forme (serveur MCP ou CLI) et leur authentification se tranchent dans [ADR-025](adrs/025-acces-agents-app.md)
* **Assistant interne** : un chat ouvert par un bouton de l'espace admin, en fenêtre flottante que l'admin déplace et redimensionne pour ne jamais masquer la page, qui connaît la page en cours ; une page Assistant garde l'historique des conversations. Il tourne sur l'abonnement via `agent-os`, garde sa session d'un message à l'autre, pilote l'app par ces outils et fait confirmer chaque écriture, par exemple pour discuter chaque candidat du sourcing avant de le garder. Le bot Telegram d'`agent-os` en est une seconde interface, pour les ordres rapides depuis le téléphone (créer un ticket) : un seul assistant, dont une conversation commencée d'un côté se reprend de l'autre. Telegram vient d'abord ; la fenêtre de l'admin suit quand le travail de fond la justifie, pour la page en cours et l'affichage riche

Données personnelles : dès qu'un agent traite des leads, Anthropic devient destinataire de ces données, et Telegram aussi quand une alerte en porte. Le spec de cette feature met à jour le registre des traitements, la politique de confidentialité et l'évaluation d'impact, et fixe la durée de conservation des conversations et des sessions.

Écrans à maquetter : la fenêtre de l'assistant et sa page d'historique. Rien de public : le chatbot du site et ses crédits au token restent la Feature 10.

Prérequis : le CRM (Feature 2) pour les premiers outils ; `ai-kit` et `agent-os` implémentés dans leurs dépôts pour les jobs et le chat.

### Feature 4 : Domaine freelance Missions

Suivi d'une mission une fois acceptée, écran `isMissions` de la maquette. Prolonge la mission du CRM (Feature 2), sans nouveau modèle de mission :

* **Phases contractuelles** : période, TJM, jours, montant et contrat de chaque phase ; le TJM d'une facture vient de sa phase
* **Chantiers** : ce que le client demande pendant la mission (statut, type, priorité, estimation), en tableau ou en board, avec leurs tâches, livrables et points ouverts
* **CRA** : un compte-rendu d'activité par mois, avec les jours travaillés, la date d'envoi, les pièces déposées (document et relevés de temps des outils imposés par le client) et la facture liée
* **Menu** : une entrée par mission active dans le groupe « Suivi mission »
* **Accueil** (`isHome`) : actions du jour, une card de suivi par mission active et agenda, comme la maquette les dessine ; leur contenu se tranche au spec

Côté agents (Feature 3) : revue du matin et bilan du soir des chantiers, pré-remplissage du CRA depuis les chantiers de la semaine.

Prérequis : le CRM (Feature 2), dont la mission acceptée ; les agents internes (Feature 3) pour ses outils et ses jobs.

### Feature 5 : Domaine freelance Comptabilité

Facturation et déclarations du freelance, écrans du groupe « Comptabilité » de la maquette :

* **Facturation** (`isFacturation`) : une facture par mission et par mois, TJM de la phase et quantité du CRA, numérotation légale continue, statuts jusqu'au paiement avec une vue des retards ; TVA, cotisations, provision d'impôt et net réel calculés ; totaux facturé, encaissé et en attente
* **Déclarations** (`isDeclarations`) : URSSAF, dont le CA encaissé et les cotisations dues se calculent depuis les factures payées ; TVA, avec base encaissée, TVA collectée, déductible et à reverser
* **Régime de TVA de l'éditeur** : la date d'assujettissement et le régime d'imposition (réel simplifié ou réel normal) se saisissent dès le CRM (Feature 2), sur la fiche de sa société, parce que les mentions légales du site en dépendent. La comptabilité les lit pour savoir quelles déclarations produire (CA12 annuelle et acomptes au réel simplifié, CA3 au réel normal) ; la périodicité des CA3 et la TVA de chaque facture, décidée facture par facture, restent à cette feature

Les calculs sont déterministes et restent du code TypeScript ici ; les agents (Feature 3) n'y interviennent que pour l'aide à la saisie, précisée au spec.

Prérequis : les missions (Feature 4), dont la phase porte le TJM et le CRA la quantité facturée ; les agents internes (Feature 3).

### Feature 6 : Finances

Pilotage de l'argent, professionnel et personnel, écrans du groupe « Finances » de la maquette :

* **Trésorerie** : comptes et soldes, part à isoler (cotisations, TVA, impôt), disponible réel, runway, encours client, seuils d'alerte
* **Prévisionnel** : CA produit contre CA encaissé mois par mois, plafond du régime, scénarios pour l'année suivante
* **Budget** : dépenses récurrentes perso et pro, coût mensuel et annuel, minimum vital
* **Investissement** : portefeuille, répartition cible, versements mensuels programmés, relevés annuels

Aucun schéma existant à reprendre : le domaine se conçoit de zéro.

Prérequis : la comptabilité (Feature 5) pour la trésorerie et le prévisionnel, qui lisent factures et déclarations ; l'espace admin seul (Feature 1) pour le budget et l'investissement.

### Feature 7 : Publications LinkedIn

Posts LinkedIn de l'idée à la publication, écran `isLinkedin` : pipeline, calendrier, piliers, formats et angles, métriques saisies (réactions, commentaires, reposts, impressions) et vue Performance.

Rédaction assistée : veille de sujets, rédaction à partir d'un sujet, d'un projet ou d'une URL, relecture critique avant le brouillon, jamais de publication automatique. L'écran de commande et le stockage des brouillons sont ici, l'exécution passe par les jobs `agent-os`, donc sur l'abonnement plutôt qu'à l'acte.

Prérequis : l'espace admin seul (Feature 1) pour les posts et leurs métriques ; les agents internes (Feature 3) pour la rédaction assistée.

### Feature 8 : Suivi du cycle de développement

Kanban des chantiers de développement, en base, chaque carte liée à une spec ou à un plan du dépôt. Depuis une carte, le propriétaire lance une session Claude Code avec son workflow complet (commandes, skills, superpowers) puis passe à autre chose, prévenu et débloqué sur Telegram comme pour tout run (Feature 3). La carte reste un ticket : état du run et lien de la PR, sans fil de conversation. La session ouvre une PR sans jamais la merger, et la carte avance avec l'état de la PR. Une carte se crée depuis l'admin, le bot Telegram ou le MCP de l'app depuis un autre client Claude Code. Les audits de dépôts se lancent de la même façon, jamais par planification ([ADR-026](adrs/026-execution-claude-code-abonnement.md)). Les issues Sentry peuvent alimenter le kanban en cartes, sans lancement automatique.

Vue et déclenchement ici, exécution dans `agent-os` : cloner des dépôts et lancer des builds n'a pas sa place dans le conteneur qui sert le site public.

En viennent aussi deux champs que la maquette montre sur un projet et que le CRUD des projets n'implémente pas : l'étape de développement (à venir, en cours, terminé), distincte du statut de publication, et la date de mise en production.

Prérequis : `agent-os`, construit avec les agents internes (Feature 3).

### Feature 9 : Analytics

Savoir quelles pages fonctionnent, d'où viennent les visiteurs et quels projets sont consultés. **Umami**, self-hosted sur Dokploy ([ADR-007](adrs/007-analytics-umami.md)).

* Service déployé séparément, le portfolio n'embarque que le script de suivi
* Sans cookies, donc aucun consentement requis
* **Restitution dans l'espace admin** : pages les plus vues, projets les plus consultés, sources de trafic, évolution dans le temps. Les données sont lues via l'API Umami, plutôt que d'imposer un aller-retour vers une console tierce

Placée avant le chatbot public : tout ce qui précède est interne, et le chatbot est le premier investissement public, facturé au token ; une mesure d'audience avant lui permet de juger son effet après.

Écran à maquetter : la restitution dans l'espace admin, avec les composants de graphiques déjà présents dans le design system.

Prérequis : aucun pour l'ingestion ; l'espace admin (Feature 1) pour la restitution.

### Feature 10 : Chatbot IA public

Chatbot sur le site public, vitrine de compétence technique, répondant sur le parcours, les projets et les compétences.

Interface et pilotage ici, RAG et appel au modèle dans un service dédié. C'est le principal poste facturé au token de l'écosystème, aux côtés de l'écran de recherche documentaire et du fournisseur d'embeddings ; ce qu'une personne déclenche passe par l'abonnement ([ADR-016](adrs/016-acces-llm.md)).

Contraintes : garde-fous contre l'injection de prompt, rate limiting applicatif, plafond de dépense.

L'interface reprend les composants de chat de l'assistant interne (Feature 3) : messages, saisie, réponse affichée au fil de l'eau, rendu markdown. Seuls changent l'habillage du site public, bilingue, sans historique conservé ni action proposée, et le service appelé derrière.

Prérequis : `ai-kit` et le service `portfolio-chatbot` ; les composants de chat de l'assistant interne (Feature 3) ; l'analytics (Feature 9) en place pour mesurer son effet.

### Feature 11 : Documents personnels

Recherche dans des documents privés (contrats, administratif). Deux chemins d'interrogation : depuis Claude Code sur l'abonnement, et depuis l'écran admin via l'API interne du service, au token ([ADR-016](adrs/016-acces-llm.md)). Base isolée avec ses propres credentials, service séparé du chatbot public ([ADR-018](adrs/018-cloisonnement-donnees.md)).

Écrans de la maquette : `isBibliotheque` (dépôt des documents et état de leur indexation) et `isRecherche` (question, réponse et sources citées). Les écrans sont ici, les données jamais.

Prérequis : `ai-kit` et le service `rag-documents`, dont le fournisseur d'embeddings reste à trancher ([ADR-016](adrs/016-acces-llm.md)).

### Feature 12 : Intégrations externes

Capacités produit à étudier selon le besoin réel :

* **LinkedIn** : publication assistée et prospection. API officielle limitée et surveillée, faisabilité à valider avant de s'engager
* **Indy** : déclarations et export comptable. La facturation elle-même étant tenue en interne, cette intégration ne couvrirait que le déclaratif

Prérequis : les publications LinkedIn (Feature 7) pour LinkedIn ; la comptabilité (Feature 5) pour Indy.

> La supervision technique (erreurs, traces LLM) n'est pas une feature produit : voir [ARCHITECTURE.md](ARCHITECTURE.md) § Observabilité. L'analytics, elle, est la Feature 9 ci-dessus.

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
- **Décision Notion API** : hors scope, aucune synchro ni API Notion dans le code de ce dépôt.
- **Décision Agents internes** : feature dédiée (jobs `agent-os`, outils de l'app pour les agents, assistant interne) sur l'abonnement Claude vs rattachement au chatbot public (dépôts, facturation et exposition différents, voir ADR-015 et ADR-016). Les jobs d'abord : l'IA propose, l'app enregistre après validation ; les outils pour qu'un agent agisse lui-même sur l'app, leur forme (MCP ou CLI) tranchée par ADR-025.
- **Décision Exécution des agents** : Agent SDK dans `agent-os`, sur l'abonnement, lancé par le propriétaire vs routines claude.ai, `claude-code-action` ou Remote Control (seule option qui garde l'environnement global complet et relaie questions et accords, voir ADR-026). Aucun cron : chaque run part d'une action du propriétaire.
- **Décision Canal des attentes** : bot Telegram tenu par `agent-os` vs fil de conversation dans l'admin ou plugin Telegram des channels (runs lancés sans surveillance, signalés et débloqués depuis le téléphone ; le plugin ne relaie pas les questions à choix et n'accepte qu'une session par bot, voir ADR-026).
- **Décision Interfaces de l'assistant** : Telegram d'abord, fenêtre de l'admin ensuite vs fenêtre de l'admin seule (Telegram couvre le téléphone et les ordres rapides pour peu de travail ; l'admin apporte la page en cours et l'affichage riche, utiles au travail de fond comme le tri du sourcing).
- **Décision Source du kanban dev** : base vs GitHub Issues (les cartes suivent les specs et plans écrits par les skills, une issue par carte alourdirait le workflow ; l'état des PR remonte par le webhook du dépôt).
- **Décision Découpage du domaine freelance** : trois features (CRM, Missions, Comptabilité), les Finances et les Publications LinkedIn à part, vs un seul epic (plus de quarante sub-projects, aucune mise en production avant la fin). Chaque domaine livre son CRUD, ses outils et ses jobs, et reprend ses propres données Notion à la fin de son epic.
- **Décision Personne unique** : un modèle personne qui porte l'identité et l'opposition, lead et contact en rôles, vs deux fiches séparées (une seule opposition, un seul email par personne, un interlocuteur d'entretien hors du pipeline). Même logique pour l'entreprise : ce qui se déduit des projets, des missions et des actions n'est jamais saisi.
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
