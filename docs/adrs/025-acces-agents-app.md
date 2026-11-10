---
title: "ADR-025 : Accès des agents à l'app"
status: "accepted"
description: "Un serveur MCP servi par l'app (SDK TypeScript v2, une adresse par domaine, outils génériques), authentifié par une clé d'API Better Auth par usage ; conditions mesurées par le prototype le 2026-11-06"
date: "2026-11-06"
keywords: ["architecture", "adr", "mcp", "cli", "agents", "claude-code", "authentification", "agent-os", "api-key"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "Model Context Protocol", "Claude Code", "Better Auth", "Zod"]
---

# 🎯 Contexte

La Feature 3 « Outils de l'app pour les agents » de `BRAINSTORM.md` fait agir des agents sur l'app, dans trois situations :

- **Claude Code sur le poste du propriétaire**, par internet, avec les skills freelance, qui écrivent aujourd'hui dans Notion et s'y rebranchent à leur bascule (Feature 4)
- **Les jobs d'`agent-os`** (Feature 4), qui exécutent Claude Code sur l'abonnement par l'Agent SDK ([ADR-016](016-acces-llm.md), [ADR-026](026-execution-claude-code-abonnement.md)), depuis le réseau Docker interne ([ADR-019](019-communication-inter-services.md))
- **L'assistant interne de l'espace admin** (Feature 4), qui tourne à travers `agent-os`

Le CRM (Feature 2) fournit les premiers outils. Chaque domaine suivant (Missions, Comptabilité, Finances, Publications LinkedIn) apporte les siens dans sa propre feature.

Contraintes :

- **Aucun agent n'écrit dans la base** ([ADR-018](018-cloisonnement-donnees.md)) : tout passe par l'app, sa validation Zod et ses règles métier (doublons, opposition RGPD)
- **Les Server Actions exigent la session de l'espace admin** (cookie Better Auth) : un agent ne peut pas les appeler, la logique métier doit donc être appelable par l'admin comme par l'entrée des agents
- **Jamais de gateway devant Claude Code** ([ADR-016](016-acces-llm.md))
- **Les sessions d'`agent-os` tournent sans accord d'outil** (`bypassPermissions`, ADR-002 d'`agent-os`) : une confirmation ne peut venir que de l'app ou du relais Telegram, jamais d'une règle de permission de Claude Code

---

# 🧩 Problème

Par quel moyen un agent découvre et appelle les actions de l'app, domaine par domaine, et comment l'app l'authentifie, sans lui donner plus que ce que son domaine demande.

---

# 🛠️ Options Envisagées

## Option A : serveur MCP servi par l'app

**Description :** une route de l'app en Streamable HTTP, une adresse par domaine (`crm`, `missions`, `compta`…). Les outils se déclarent sur les schémas Zod existants et appellent la même logique métier que les Server Actions.

**Avantages :**
- Standard des clients visés : Claude Code, l'Agent SDK et les connecteurs claude.ai parlent MCP. Le protocole est confié à l'Agentic AI Foundation de la Linux Foundation, annoncée le 2025-12-09 ([communiqué](https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-Agentic-ai-foundation), consulté le 2026-11-06)
- Sans état par conception depuis la révision 2026-07-28 de la spec : « Remove protocol-level sessions and the `Mcp-Session-Id` header » ([changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog), consulté le 2026-11-06). Une route Next.js suffit, sans stockage de session
- Chargement à la demande : « MCP tool definitions are deferred by default, so only tool names and server instructions enter context until Claude uses a specific tool » ([Claude Code, Costs](https://code.claude.com/docs/en/costs), consulté le 2026-11-06)
- Découpage par domaine natif : un agent reçoit un serveur entier par `mcp__<serveur>__*` ([Claude Code, Subagents](https://code.claude.com/docs/en/sub-agents), consulté le 2026-09-28)
- Schémas Zod réutilisés : le SDK v2 `@modelcontextprotocol/server` dépend de `zod ^4.2.0` (registre npm, version 2.4.0 du 2026-10-23, consulté le 2026-11-06)

**Inconvénients :**
- Écosystème jeune : la ligne v2 du SDK TypeScript est stable depuis le 2026-07-27 (release `@modelcontextprotocol/server@2.0.0`). La ligne v1 (`@modelcontextprotocol/sdk` 1.32.2) garde en mode sans état la régression [typescript-sdk #1994](https://github.com/modelcontextprotocol/typescript-sdk/issues/1994), ouverte au 2026-11-06
- Anthropic reste explicite sur le contexte : « Prefer CLI tools when available: Tools like `gh`, `aws`, `gcloud`, and `sentry-cli` are still more context-efficient than MCP servers because they don't add any per-tool listing » ([Claude Code, Costs](https://code.claude.com/docs/en/costs))
- `destructiveHint` n'est pas pris en compte par Claude Code, seul `readOnlyHint` l'est ([Claude Code, MCP](https://code.claude.com/docs/en/mcp), consulté le 2026-11-06) : une confirmation d'écriture ne repose jamais sur une annotation

**Coût estimé :** une route MCP et la déclaration des outils de chaque domaine, plus la logique métier sortie des Server Actions pour servir aux deux entrées.

## Option B : CLI appelant des routes d'API authentifiées

**Description :** des routes d'API par domaine dans l'app, et un CLI (`app crm …`, `app compta …`) installé sur le poste et dans `agent-os`, documenté par `--help` et par un skill par domaine.

**Avantages :**
- Le plus économe en contexte, selon la même page d'Anthropic
- Découpage par domaine trivial, par sous-commandes
- Même comportement en interactif et en headless

**Inconvénients :**
- Deux briques à écrire et maintenir : les routes d'API et le CLI (arguments, sortie, erreurs, installation sur chaque machine)
- Découverte par `--help` et par un skill écrit à la main, sans schéma poussé au modèle
- Pas de permission par outil nommé pour confirmer une écriture
- Inutilisable depuis Claude Desktop, qui n'a pas de shell

**Coût estimé :** les routes d'API, le CLI et un skill par domaine.

## Option C : routes d'API appelées en direct

**Description :** seulement des routes d'API, que l'agent appelle par `curl` depuis son shell.

**Avantages :**
- Une seule brique
- Aucun contexte consommé par des définitions d'outils

**Inconvénients :**
- L'agent reconstitue la syntaxe et l'authentification à chaque appel : erreurs de format, aucune confirmation structurée d'une écriture
- Le jeton se manipule en clair dans les commandes

**Coût estimé :** les routes seules, la fiabilité reportée sur les prompts.

## Authentification, quelle que soit l'option

- **Clé d'API par usage**, générée et révocable depuis l'espace admin, envoyée en en-tête `Authorization: Bearer`. La spec rend l'autorisation facultative : « Authorization is **OPTIONAL** for MCP implementations » ([MCP, Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization), consulté le 2026-11-06). Claude Code et l'Agent SDK l'acceptent en en-tête fixe, et l'Agent SDK ne mène aucun flux OAuth : « The SDK doesn't open a browser or run an interactive OAuth flow » ([Agent SDK, MCP](https://code.claude.com/docs/en/agent-sdk/mcp), consulté le 2026-11-06). Le plugin `@better-auth/api-key` couvre la génération, la révocation, l'expiration (`expiresIn`), des `permissions` par ressource et un rate limit par clé ([Better Auth, API Key](https://better-auth.com/docs/plugins/api-key), consulté le 2026-11-06)
- **OAuth 2.1**, l'app devenant serveur d'autorisation par le plugin `@better-auth/mcp` (OAuth 2.1, Client ID Metadata Documents), le login Google et sa whitelist restant l'étape d'identification ([Better Auth, MCP](https://better-auth.com/docs/plugins/mcp), consulté le 2026-11-06). La spec déprécie l'enregistrement dynamique des clients : « is deprecated and retained for backwards compatibility » ([MCP, Authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)). Seul client qui l'exige : les connecteurs claude.ai et Claude Desktop, dont l'en-tête fixe (`static_headers`) est en bêta « for a limited set of organizations » et qui se connectent depuis l'infrastructure d'Anthropic, donc à une adresse publique ([Claude, connecteurs personnalisés](https://claude.com/docs/connectors), consulté le 2026-11-06)
- **Jamais la session de l'espace admin** ni un jeton émis pour un autre service : « MCP servers MUST NOT accept any tokens that were not explicitly issued for the MCP server » ([MCP, Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices), consulté le 2026-09-28)

---

# 🎉 Décision

**Option A**, authentifiée par une clé d'API par usage.

Pourquoi cette option, dans ce projet :

- **Le client MCP existe déjà.** Claude Code et les sessions d'`agent-os` parlent MCP nativement : l'app n'écrit que le serveur. Le CLI demande d'écrire les deux côtés, des routes REST dans l'app et un programme client installé sur le poste et dans l'image d'`agent-os`, tenu à jour à chaque évolution de l'app
- **Aucune route d'API à ajouter.** L'app n'en a pas pour ses domaines, tout passe par des Server Actions. Les outils MCP appellent la même logique métier qu'elles, sortie une fois pour servir aux deux entrées
- **L'avantage du CLI est neutralisé.** Avec le chargement à la demande, seuls les noms d'outils d'un domaine restent en contexte tant qu'ils ne servent pas
- **Pas les deux.** Empiler MCP et CLI ferait entretenir les outils, les routes REST et le programme à chaque nouvelle action
- **Pas de serveur MCP dans un service Python.** Placé dans `ai-kit` ou `agent-os`, il ne serait qu'un proxy vers une API REST du portfolio à écrire en plus, la validation Zod dupliquée en Pydantic. `ai-kit` et `agent-os` restent clients. Seul un domaine dont les données vivent hors du portfolio, comme les documents personnels de `rag-documents` ([ADR-018](018-cloisonnement-donnees.md)), sert son MCP depuis son propre service

Retenu pour l'implémentation :

- **SDK** : `@modelcontextprotocol/server` (ligne v2) et son `createMcpHandler`, qui rend un handler `Request → Response` ; ni la ligne v1, ni `mcp-handler`, ni framework dédié. Spec 2026-07-28, le handler gardant son mode par défaut qui sert sans session les clients des révisions 2025 : Claude Code 2.1.310 et le CLI 2.1.317 embarqué par `claude-agent-sdk` 0.2.177 parlent déjà la 2026-07-28 (relevé le 2026-11-06), et rien ne justifie de couper un client 2025
- **Une adresse par domaine** (`/api/mcp/<domaine>`) plutôt qu'un préfixe d'outils sur une adresse commune : une session d'`agent-os` ne déclare que le serveur de son domaine, et la clé se vérifie contre le domaine de l'adresse
- **Outils génériques par domaine** : recherche tolérante, lecture d'une fiche et de ses liens, requête filtrée et paginée, création, modification, l'entité désignée par un discriminant (union Zod par entité du domaine) ; aucune suppression par défaut. Un même générique, enregistré une fois par domaine. Écartés : un outil par entité et par opération (« A common error we've observed is tools that merely wrap existing software functionality or API endpoints », [Anthropic, Writing effective tools for agents](https://www.anthropic.com/engineering/writing-tools-for-agents), consulté le 2026-11-06) et un jeu global à tous les domaines (union de toutes les entités dans chaque schéma, aucune permission ni restriction possible par domaine). Un outil propre à une tâche s'ajoute quand le générique ne suffit pas
- **Authentification** : `@better-auth/api-key`, une clé par usage (poste, `agent-os`), ses `permissions` limitées à ses domaines. Pas d'OAuth : claude.ai et Claude Desktop restent un cas de test, `@better-auth/mcp` en réserve si un usage réel l'exige

Acté dès maintenant, quelle que soit l'option retenue :

- aucun agent n'écrit dans la base : tout passe par la logique métier de l'app, commune à l'espace admin et aux agents
- les outils se découpent par domaine, chaque agent ne recevant que ceux du sien
- aucun agent n'utilise la session de l'espace admin ; un jeton par usage, révocable
- la confirmation d'une écriture se décide outil par outil, au spec du domaine ; depuis `agent-os`, elle parvient au propriétaire comme toute attente d'une session ([ADR-026](026-execution-claude-code-abonnement.md))

Conditions de l'acceptation, mesurées le 2026-11-06 par le prototype qui ouvre la Feature 3 (route `/api/mcp/crm`, outil `crm_fetch`) :

1. **Le serveur MCP de son domaine est servi correctement à une session d'`agent-os`, sans être exposé hors de la clé du domaine.** Trois faits distincts :
   - **Mesuré le 2026-11-06** : sur le CLI 2.1.317 embarqué par `claude-agent-sdk` 0.2.177, la version qu'épingle `ai-kit`, sous `--strict-mcp-config`, le message `system/init` ne liste que `crm` (`connected`) et le seul outil `mcp__crm__crm_fetch`, sans serveur user, de plugin ni connecteur claude.ai. Conforme à la référence de l'Agent SDK Python (« ignore project `.mcp.json`, user settings, plugin-provided MCP servers, and claude.ai connectors », [Agent SDK, Python](https://code.claude.com/docs/en/agent-sdk/python), consulté le 2026-11-06). Cette mesure est une propriété du CLI sous ce drapeau : elle prouve que le serveur du domaine est servi correctement, pas le périmètre d'une session d'`agent-os`
   - **Décidé** : une session d'`agent-os` passe `strict_mcp_config=False`, en parité avec le poste (décision d'`agent-os` et d'`ai-kit` du 2026-11-06, ADR-002 d'`agent-os` et ADR-004 d'`ai-kit`). Les plugins avec leurs serveurs MCP et les connecteurs claude.ai du compte sont chargés
   - **À vérifier, non mesuré** : qu'en session non stricte ni un connecteur ni les settings globaux n'exposent le MCP de l'app hors de la clé du domaine, et que les connecteurs se chargent avec le token d'abonnement (spike d'`agent-os`, [ADR-026](026-execution-claude-code-abonnement.md) § Notes complémentaires)
2. **Un serveur MCP minimal dans Next.js 16, sur le SDK v2 avec Zod 4, répond de façon stable en production standalone et refuse une requête sans clé.** Sur l'image de prod construite en local (Next.js 16.4.3, `@modelcontextprotocol/server` 2.4.0, Zod 4.6.7) : 60 appels `crm_fetch` sans erreur autour d'un redémarrage du container, 401 sans clé avant et après, aucune ligne `error` dans les logs
3. **Le contexte consommé par les outils d'un domaine reste faible.** `/context` dans Claude Code, serveur `crm` connecté : environ 100 tokens d'`instructions` du serveur, le schéma de `crm_fetch` (196 tokens) n'entrant qu'au chargement de l'outil pour un appel. Claude Code lit l'union racine `{ entity, id }` sans erreur

---

# 🔄 Conséquences

## Positives
- Une seule brique à construire, qui sert les trois usages : poste, `agent-os`, assistant interne
- Les skills freelance peuvent passer du MCP Notion à celui de l'app : ceux du CRM à la bascule qui ouvre la Feature 4, ceux des domaines suivants dans leur feature
- Un nouveau domaine n'écrit que ses schémas et sa logique : les outils viennent du générique

## Négatives
- Dépendance à un SDK dont la ligne v2 a moins de six mois au 2026-11-06, à revérifier à chaque montée
- La logique métier doit sortir des Server Actions pour servir aux deux entrées
- Une clé d'API de longue durée à protéger et à faire tourner, stockée hachée en SHA-256 par `@better-auth/api-key` (`defaultKeyHasher`, tag v1.7.14)
- Sans OAuth, claude.ai et Claude Desktop n'accèdent au serveur que si l'en-tête fixe des connecteurs est ouvert au compte
- Une session d'`agent-os` non stricte charge la configuration MCP du poste : l'exposition du serveur de l'app hors de la clé du domaine reste à mesurer (condition 1)

---

# 📝 Notes complémentaires

Remplace la note « Serveur MCP » de l'[ADR-020](020-portfolio-bff.md) et la question ouverte du README de l'epic espace admin.

Chaque domaine déclare ses outils dans sa propre feature (`BRAINSTORM.md`, Features 2, 5, 6, 7 et 8), sur le socle posé par la Feature 3.

**Pièges de Claude Code relevés au prototype** (2026-11-06) :

- En `-p`, le message `system/init` peut lister `mcp_servers: []` parce que les serveurs se connectent après la construction des outils ([claude-code #102804](https://github.com/anthropics/claude-code/issues/102804)) ; contournement cité : `MCP_CONNECTION_NONBLOCKING=0`
- `--mcp-config` est variadique et avale un prompt qui le suit : le séparer par `--` ou le passer sur l'entrée standard ([claude-code #5593](https://github.com/anthropics/claude-code/issues/5593))
- `claude mcp list` ne reflète pas une session lancée avec `--mcp-config` et peut bloquer un serveur du même nom par son cache d'authentification ([claude-code #80635](https://github.com/anthropics/claude-code/issues/80635))
- `--tools ""` retire la recherche d'outils : tous les outils MCP entrent alors en contexte ([claude-code #106413](https://github.com/anthropics/claude-code/issues/106413))
- Dans `url` et `headers` d'un serveur distant, Claude Code lit certaines variables d'identifiants comme vides au lieu de les développer ([Claude Code, MCP](https://code.claude.com/docs/en/mcp)) : le nom de la variable qui porte la clé se teste
- Sous Windows, le CLI et l'extension VS Code indexent le même projet sous `C:/` et `c:/` dans `~/.claude.json` : un serveur ajouté en scope `local` depuis un terminal reste invisible de l'extension (constaté sur 2.1.310). Le déclarer depuis la session qui l'utilisera, ou en scope `user`
