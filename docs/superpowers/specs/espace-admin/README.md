---
title: "Espace admin — récap de conception"
description: "Contexte de conception de l'epic espace admin. Ce n'est pas une spec de sub-project : les décisions font foi dans les ADR-015 à 021, les specs d'implémentation viendront à côté sous NN-<slug>-design.md."
date: "2026-09-03"
keywords: ["admin", "espace-admin", "architecture", "ecosysteme", "freelance"]
scope: ["docs", "architecture"]
---

# Espace admin — Récap de conception

> Base de travail pour générer les mises à jour de `BRAINSTORM.md`, `ARCHITECTURE.md` et les ADRs. Ce n'est pas la documentation finale.

## L'écosystème

Cinq dépôts, découpés **par nature d'exécution** et non par domaine métier. Le critère : ce qui ne peut pas partager le même processus (langage différent, cycle de vie différent, profil de ressources différent, risque différent).

| Dépôt | Rôle | Langage |
|---|---|---|
| **thibaud-geisler-portfolio** | site public, espace admin, tous les fronts, auth, CRUD | TypeScript |
| `ai-kit` | socle IA partagé, backends interchangeables | Python |
| `agent-os` | exécute `claude -p` : cycle de dev et jobs de l'espace admin | Python |
| `portfolio-chatbot` | RAG public, principal consommateur d'API au token | Python |
| `rag-documents` | documents personnels, base isolée | Python |

Le portfolio porte **tous les fronts**, y compris ceux des services Python. C'est un pattern BFF : le portfolio porte l'expérience, les services portent le métier long ou risqué.

```
┌─ thibaud-geisler.com ────── Next.js, 1 conteneur ────────────┐
│  (public)   portfolio, projets, UI du chatbot                │
│  /admin     Better Auth, un seul shell, une seule nav        │
│    ├─ contenu    Server Actions + Prisma    schema public    │
│    ├─ freelance  CRM, compta, LinkedIn      schema freelance │
│    ├─ dev        kanban, lit GitHub + runs  schema dev       │
│    └─ rag        UI seule, proxy HTTP  ──┐                   │
└──────────────────────────────────────────┼───────────────────┘
       réseau Docker interne, pas de Traefik, pas d'Internet
   ┌───────────────────────────────────────┴──────────────────┐
   │ agent-os          cron + file de jobs, forfait Claude    │
   │ portfolio-chatbot RAG public, OpenRouter                 │
   │ rag-documents     base isolée, provider Anthropic direct │
   └──────────────────────────────────────────────────────────┘
```

## Ce que porte le portfolio

**Fronts, auth, et tout le CRUD synchrone.** Y compris le domaine freelance, qui n'a pas de dépôt propre : ce n'est pas un produit, c'est un domaine de l'espace admin.

```
schema public     Project, Company, Tag, LegalEntity…   existant
schema auth       user, session, account, verification  Better Auth
schema freelance  Lead, Contact, Facture, PostLinkedIn  migration Notion
schema dev        Run, Finding, Repo                    alimenté par agent-os
```

Reste **en TypeScript** parce que c'est déterministe et que le langage n'apporte rien de plus :

- Le **scoring ICP** : 4 piliers, seuils chiffrés, score 0-10, mapping vers un statut. Une fonction pure, testable, instantanée, gratuite. Aujourd'hui un agent LLM applique cette grille arithmétique, c'est un gain net de fiabilité et de coût de le remettre en code.
- Toute la **comptabilité** : cotisations, TVA, provision d'impôt, et surtout la numérotation séquentielle légale, mieux garantie par une contrainte transactionnelle que par la vigilance.
- Les **KPI et agrégats**, qui sont du SQL.

Part **en IA** ce qui demande du jugement : rédaction de posts, critique de contenu, sourcing web, enrichissement.

### Le coût accepté

Le domaine freelance vivant dans le portfolio, les jointures SQL entre `Lead` et `Project` restent possibles. C'est ce qui a fait retenir cette option plutôt qu'un service freelance autonome, qui aurait imposé d'écrire une API REST complète et des contrats OpenAPI pour du `SELECT`.

**Point de bascule** : si le domaine freelance devait un jour devenir un produit détachable, il faudrait l'extraire, et ce serait coûteux. Tant que c'est un outil personnel, l'intégration est le bon choix.

## L'espace admin

Sidebar shadcn, sections, pages et sous-pages. Un seul layout, un seul login, une seule navigation.

```
Portfolio     Projets · Tags · Assets
Freelance     Leads · Contacts · Factures · LinkedIn
Dev           Kanban · Audits
Documents     Recherche
```

**Responsive dès le départ**, ce n'est pas optionnel : l'espace admin remplace Notion, donc il doit être utilisable au téléphone. Une table de leads et un kanban mobiles se conçoivent dès les premiers écrans, pas après dix pages en desktop-first.

## Coûts LLM : l'essentiel sur le forfait

La frontière n'est pas « application égale payant ». Elle est : *est-ce une personne identifiée qui déclenche, via un client officiel ?*

| Usage | Exécution | Coût |
|---|---|---|
| Audits, cycle de dev | `claude -p` | forfait |
| Génération de publications | `claude -p` déclenché par l'espace admin | forfait |
| RAG documents personnels, **interrogation** depuis Claude Code | CLI du service via `claude -p` | forfait |
| RAG documents personnels, **interrogation** depuis l'écran admin | API interne, PydanticAI + provider Anthropic | au token |
| RAG documents personnels, **indexation** | fournisseur d'embeddings à trancher | au token |
| Chatbot public | OpenRouter | estimation dans ADR-016 |

`rag-documents` porte deux opérations distinctes. L'**interrogation** emprunte deux chemins : depuis Claude Code elle passe par le CLI du service, donc par le forfait ; depuis l'écran de recherche de l'espace admin elle passe par l'API interne, donc au token et sans routeur intermédiaire (ADR-016). L'**indexation** est programmatique et ne peut pas transiter par Claude Code. Elle exige un fournisseur d'embeddings, **qu'Anthropic ne propose pas** : ce choix reste ouvert et pèse sur l'argument de sous-traitance unique qui fonde le choix du fournisseur pour ce périmètre (voir ADR-016).

L'espace admin déclenche Claude Code plutôt que d'appeler une API : le bouton envoie un job, `agent-os` lance `claude -p`, le résultat revient. C'est exactement l'usage actuel en terminal, avec une interface par-dessus. Asynchrone par nature, donc file de jobs et polling, pas de réponse synchrone.

L'abonnement ne couvre **pas** les appels SDK depuis le code : il ne délivre pas de clé API, seulement des credentials OAuth destinés aux clients officiels. Le corollaire documenté par Anthropic est qu'une gateway portant un credential facture au tarif API et désactive l'abonnement pour la session (voir ADR-016 et ses sources).

## Décisions transverses

À formaliser en ADRs dans ce dépôt, les autres y renvoient par lien plutôt que par copie.

1. **Découpage par frontière d'exécution.** La décision structurante, celle qui justifie tout le reste.
2. **Accès LLM.** OpenRouter pour ce qui est facturé au token, PydanticAI avec le provider Anthropic en direct pour `rag-documents` (contrat de sous-traitance article 28), jamais de gateway devant Claude Code. Pas de gateway auto-hébergée : LiteLLM demande 4 Gi de RAM par worker selon sa propre doc et a connu quatre incidents de sécurité critiques en 2026.
3. **Observabilité.** Sentry et Logfire ou Langfuse en cloud. Jamais en self-hosted : Langfuse demande six conteneurs, et ses mainteneurs chiffrent le besoin réel à 16 Gi, 8 Gi étant « vraiment à la limite basse ».
4. **Cloisonnement des données.** Base `portfolio` conservée avec des schemas par domaine, base séparée pour les documents personnels. Un seul propriétaire par schema.
5. **Communication inter-services.** HTTP interne sur le réseau Docker, jamais exposé par Traefik. Un jeton de service suffit tant que le réseau n'est pas public.
6. **Le portfolio comme BFF.** Fronts et auth ici, métier long ailleurs.

## Migration Notion

Le `freelance-toolkit` ne contient **aucun code** : 87 fichiers markdown de skills et commandes Claude Code, 14 JSON qui sont des schémas descriptifs de bases Notion, et des assets de carrousel. La donnée vit à 100 % dans Notion.

Ces 14 schémas sont une spec Prisma quasi directe : types, enums complets, relations et cardinalités déjà tranchés.

**Par domaine, pas d'un coup :**

1. **Comptabilité.** Calculs purs, peu d'édition en mobilité, et c'est là que PostgreSQL apporte le plus. Peu de risque, valeur immédiate.
2. **LinkedIn.** Peu de relations, beaucoup de calcul. Les design tokens de carrousel sont déjà en convention shadcn, réutilisables tels quels.
3. **CRM.** Le plus relationnel, le plus utilisé en déplacement, et celui dont le contenu ne se réduit pas à des colonnes : les fiches Lead portent des sections markdown (`Signal`, `Hypothèse`, `Timeline`) qui demandent une vraie modélisation, champ texte ou tables filles.

Chaque domaine migré est utilisable immédiatement, Notion reste en place pour les autres pendant la transition.

⚠️ `dentsu.md` contient des données nominatives de tiers et du profilage d'équipe cliente. À ne pas migrer vers une base applicative exposée.

## Écarts doc / code à traiter avant de commencer

Un audit a relevé 58 écarts, dont 7 bloquants pour cette feature.

| Écart | État |
|---|---|
| Route group `(admin)/` documenté partout, inexistant | ✅ **Tranché : segment réel `admin/`, hors `[locale]/`** ([ADR-021](../../../adrs/021-routing-espace-admin.md)), renvoi ajouté dans l'ADR-010 |
| `components.json` est en `radix-nova`, six documents disent `new-york` | ✅ **Tranché : Nova conservé**, doc corrigée (VERSIONS, knowledges, rule, DESIGN) |
| `experimental.authInterrupts` non activé | ⬜ À activer **dans le commit qui introduit `unauthorized()`**, pas avant. Validé sur la version de Next installée au moment du relevé |
| `experimental.taint` non activé | ⬜ À activer **dans le commit qui introduit `getCurrentUser()`**, pas avant. Validé sur la version de Next installée au moment du relevé |
| `src/proxy.ts` ne protège rien | ⬜ À faire à l'implémentation : envelopper le handler `next-intl` dans une fonction qui teste le préfixe `/admin` avant de vérifier le cookie de session |
| Variables `BETTER_AUTH_*`, `GOOGLE_*`, `ADMIN_EMAIL` absentes de `src/env.ts` et `.env.example` | ⬜ `env.ts` est fail-fast, à ajouter dans le même commit que l'installation de `better-auth` |
| Tables Better Auth absentes du schéma | ⬜ Première migration à écrire. Le modèle `Asset` fantôme de l'ADR-002 est corrigé |

## Infrastructure

Quatre projets Dokploy existants : Portfolio (un service Compose plus une Database Dokploy, Postgres n'étant pas dans le compose applicatif), Scrappers, VPN (wg-easy), Automation (n8n). Un seul serveur.

- Dokploy gère nativement les sauvegardes (`backup`, `destination` S3). ⚠️ **Rien n'est sauvegardé à ce jour** : relevé du 2026-09-03, aucune destination, aucune sauvegarde de base, aucun volume backup. Toute perte de la Database est définitive tant que le sub-project `01` n'est pas livré.
- Un conteneur peut appartenir à plusieurs réseaux Docker, donc des services de projets Dokploy différents peuvent se parler sans aucune exposition publique.
- Le cookie de session est posé sur `thibaud-geisler.com` et ne traverse pas vers `empiricmind.fr`. **Tout ce qui est authentifié reste sur le domaine du portfolio.** `empiricmind.fr` garde les outils d'infrastructure avec leur propre authentification.
- Pas de Redis : les files de jobs tiennent en PostgreSQL via `procrastinate`. Le rate limiting du formulaire de contact reste en mémoire (`src/lib/rate-limiter.ts`) : c'est une décision d'implémentation sans ADR dédié (voir ARCHITECTURE.md § Sécurité). [ADR-014](../../../adrs/014-rate-limiting-chatbot.md), encore au statut `proposed`, ne couvre que le chatbot public.
- Limites mémoire explicites par conteneur, saisies en octets bruts dans Dokploy.

## Priorités

1. **Auth plus CRUD contenu portfolio.** Fondation obligatoire, ne dépend presque d'aucune décision restante.
2. Migration comptabilité, puis LinkedIn, puis CRM.
3. Kanban dev et `agent-os`.
4. Chatbot public.
5. RAG documents personnels.

## Questions ouvertes

- Source de vérité du kanban : GitHub Issues, avec l'espace admin en simple vue, ou base locale avec synchronisation ? La première évite un chantier de synchronisation bidirectionnelle.
- Les leads du formulaire de contact ne sont pas persistés aujourd'hui (envoi d'email seul). Les stocker pour le CRM implique de mettre à jour la politique de confidentialité et le registre des traitements.
- Faut-il un serveur MCP au-dessus des Server Actions du portfolio, pour piloter le CRM depuis Claude Code ? Techniquement peu coûteux, mais un CLI consomme nettement moins de contexte qu'un MCP à usage répétitif.
