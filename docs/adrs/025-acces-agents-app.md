---
title: "ADR-025 — Accès des agents à l'app"
status: "proposed"
description: "Décision ouverte : forme des outils que l'app expose aux agents (serveur MCP, CLI ou API appelée en direct) et leur authentification ; orientation provisoire vers un serveur MCP par domaine, authentifié par clé d'API"
date: "2026-09-28"
keywords: ["architecture", "adr", "mcp", "cli", "agents", "claude-code", "authentification", "agent-os"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "Model Context Protocol", "Claude Code", "Better Auth", "Zod"]
---

# 🎯 Contexte

La Feature 3 « Agents internes » de `BRAINSTORM.md` fait agir des agents sur l'app, dans trois situations :

- **Claude Code ou Claude Desktop sur le poste du propriétaire**, par internet, avec les skills du toolkit freelance, qui écrivent aujourd'hui dans Notion et s'y rebranchent
- **Les jobs d'`agent-os`**, qui exécutent Claude Code sur l'abonnement par l'Agent SDK ([ADR-016](016-acces-llm.md), [ADR-026](026-execution-claude-code-abonnement.md)), depuis le réseau Docker interne ([ADR-019](019-communication-inter-services.md))
- **L'assistant interne de l'espace admin**, qui tourne à travers `agent-os`

Le CRM (Feature 2) fournit les premiers outils. Chaque domaine suivant (Missions, Comptabilité, Finances, Publications LinkedIn) apporte les siens dans sa propre feature.

Contraintes :

- **Aucun agent n'écrit dans la base** ([ADR-018](018-cloisonnement-donnees.md)) : tout passe par l'app, sa validation Zod et ses règles métier (doublons, opposition RGPD)
- **Les Server Actions exigent la session de l'espace admin** (cookie Better Auth) : un agent ne peut pas les appeler, la logique métier doit donc être appelable par l'admin comme par l'entrée des agents
- **Jamais de gateway devant Claude Code** ([ADR-016](016-acces-llm.md))

---

# 🧩 Problème

Par quel moyen un agent découvre et appelle les actions de l'app, domaine par domaine, et comment l'app l'authentifie, sans lui donner plus que ce que son domaine demande.

---

# 🛠️ Options Envisagées

## Option A : serveur MCP exposé par l'app

**Description :** une route de l'app en Streamable HTTP, un serveur (ou un préfixe d'outils) par domaine (`crm`, `missions`, `compta`…). Les outils se déclarent sur les schémas Zod existants et appellent la même logique métier que les Server Actions.

**Avantages :**
- Découverte automatique des outils, avec des schémas structurés. Claude Code les charge à la demande : « MCP tool definitions are deferred by default, so only tool names and server instructions enter context until Claude uses a specific tool » ([Claude Code, Costs](https://code.claude.com/docs/en/costs), consulté le 2026-09-28)
- Découpage par domaine natif : le champ `tools` d'un agent accepte un serveur entier, « Both fields accept MCP server-level patterns in addition to exact tool names: `mcp__<server>` or `mcp__<server>__*` » ([Claude Code, Subagents](https://code.claude.com/docs/en/sub-agents), consulté le 2026-09-28)
- Même accès depuis Claude Code, Claude Desktop (connecteurs personnalisés) et les sessions d'`agent-os`, sans rien installer sur le poste
- Schémas Zod réutilisés : le SDK officiel `@modelcontextprotocol/sdk` 1.30.1 déclare `"zod": "^3.25 || ^4.0"` en dépendance paire (registre npm, consulté le 2026-09-28)
- Permission par outil dans Claude Code : une écriture peut passer par une confirmation

**Inconvénients :**
- Deux voies d'implémentation d'âge différent : le SDK officiel, à brancher à la main, avec une régression signalée en mode sans état ([typescript-sdk #1994](https://github.com/modelcontextprotocol/typescript-sdk/issues/1994), statut non vérifié) ; `mcp-handler` 2.x, prêt pour Next.js, mais bâti sur la ligne « SDK v2 » dont le premier paquet date du 2026-07-29
- La restriction des serveurs en headless repose sur `--mcp-config` et `--strict-mcp-config`, dont un bug signale qu'ils seraient « completely ignored » ([claude-code #10787](https://github.com/anthropics/claude-code/issues/10787), ouvert en novembre 2025, fermé comme doublon, correctif non vérifié au 2026-09-30). Les connecteurs claude.ai du compte se coupent à part, par `ENABLE_CLAUDEAI_MCP_SERVERS=false` ([Claude Code, MCP](https://code.claude.com/docs/en/mcp))
- Le champ `allowed-tools` d'un skill pré-approuve sans restreindre, « It does not restrict which tools are available » ([Claude Code, Skills](https://code.claude.com/docs/en/skills), consulté le 2026-09-28) : la restriction passe par les agents ou les règles de permission
- Anthropic reste explicite sur le contexte : « Prefer CLI tools when available: Tools like `gh`, `aws`, `gcloud`, and `sentry-cli` are still more context-efficient than MCP servers because they don't add any per-tool listing » ([Claude Code, Costs](https://code.claude.com/docs/en/costs))

**Coût estimé :** une route MCP et la déclaration des outils de chaque domaine, plus la logique métier sortie des Server Actions pour servir aux deux entrées.

## Option B : CLI appelant des routes d'API authentifiées

**Description :** des routes d'API par domaine dans l'app, et un CLI (`app crm …`, `app compta …`) installé sur le poste et dans `agent-os`, documenté par `--help` et par un skill par domaine.

**Avantages :**
- Le plus économe en contexte, selon la même page d'Anthropic
- Découpage par domaine trivial, par sous-commandes
- Aucune dépendance à un SDK récent, même comportement en interactif et en headless

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

- **Clé d'API par usage** (poste, `agent-os`), voire par domaine, générée et révocable depuis l'espace admin, envoyée en en-tête. Elle fonctionne en headless et dans Claude Code (`claude mcp add --transport http <nom> <url> --header "Authorization: Bearer <clé>"`, [Claude Code, MCP](https://code.claude.com/docs/en/mcp))
- **OAuth**, l'app devenant serveur d'autorisation par le plugin MCP de Better Auth, déjà présent dans la version installée : il « lets your app act as an OAuth authorization server and protected resource for Model Context Protocol clients » ([Better Auth, plugin MCP](https://raw.githubusercontent.com/better-auth/better-auth/refs/heads/main/docs/content/docs/plugins/mcp.mdx), consulté le 2026-09-28). Le login Google et sa whitelist restent l'étape d'identification. Le flux demande un navigateur : inadapté à `agent-os`, utile pour Claude Desktop si ses connecteurs n'acceptent pas d'en-tête fixe (non confirmé par une source de premier rang)
- **Jamais la session de l'espace admin** ni un jeton émis pour un autre service : « MCP servers MUST NOT accept any tokens that were not explicitly issued for the MCP server » ([MCP, Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security_best_practices), consulté le 2026-09-28)

---

# 🎉 Décision

**Décision ouverte.** Orientation provisoire : **Option A**, un serveur MCP par domaine (ou un préfixe par domaine), authentifié par une clé d'API par usage ; OAuth seulement si un client l'exige.

Pourquoi cette orientation, dans ce projet :

- **Le client MCP existe déjà.** Claude Code, Claude Desktop et les sessions d'`agent-os` parlent MCP nativement : l'app n'écrit que le serveur, une route qui déclare les outils et appelle la logique métier commune. Le CLI demande d'écrire les deux côtés : des routes REST dans l'app, et un programme client à part (arguments, aide, sorties, erreurs, stockage de la clé), installé sur le poste et dans l'image d'`agent-os`, tenu à jour à chaque évolution de l'app
- **Aucune route d'API à ajouter.** L'app n'en a pas pour ses domaines, tout passe par des Server Actions. Les outils MCP appellent la même logique métier qu'elles, sortie une fois pour servir aux deux entrées ; les règles (validation, doublons, opposition RGPD) ne s'écrivent qu'une fois
- **Ce que le CLI n'offre pas** : des schémas structurés que l'agent voit, une permission par outil pour confirmer une écriture, l'accès depuis Claude Desktop
- **L'avantage du CLI est réel mais réduit.** Il ne consomme rien tant qu'il ne sert pas, là où le MCP garde en contexte les noms des outils de son domaine ; en usage, la sortie de `--help` ou le skill qui l'explique pèse autant qu'un schéma. La condition 3 le mesure
- **Pas les deux.** Empiler MCP et CLI ferait entretenir les outils, les routes REST et le programme à chaque nouvelle action

Acté dès maintenant, quelle que soit l'option retenue :

- aucun agent n'écrit dans la base : tout passe par la logique métier de l'app, commune à l'espace admin et aux agents
- les outils se découpent par domaine, chaque agent ne recevant que ceux du sien
- aucun agent n'utilise la session de l'espace admin ; un jeton par usage, révocable
- toute écriture destructive se confirme avant de s'exécuter ; depuis `agent-os`, la confirmation parvient au propriétaire comme toute attente d'une session ([ADR-026](026-execution-claude-code-abonnement.md))

Conditions pour passer en `accepted`, levées par un prototype au début de la Feature 3 :

1. Une session d'`agent-os` ne charge, parmi les outils de l'app, que le serveur MCP de son domaine ; parmi les autres serveurs, que ceux prévus pour son type de run (Playwright pour la vérification, Jina pour le sourcing) ; et aucun connecteur claude.ai du compte. Vérifié sur la version de Claude Code épinglée dans `agent-os`
2. Un serveur MCP minimal dans Next.js 16, en mode sans état et avec Zod 4, répond de façon stable (SDK officiel ou `mcp-handler` 2.x)
3. Le contexte consommé par les outils d'un domaine reste faible avec le chargement à la demande (mesure par `/context`)

Si la condition 1 échoue, l'Option B reprend l'avantage pour `agent-os`.

---

# 🔄 Conséquences

## Positives
- Une seule brique à construire au lieu de deux (orientation A)
- Les skills du toolkit passent du MCP Notion à celui de l'app, domaine par domaine
- Le même accès sert les trois usages : poste, `agent-os`, assistant interne
- Le découpage par domaine limite ce qu'un agent peut faire à ce dont il a besoin

## Négatives
- Dépendance à un écosystème MCP récent et mouvant, à revérifier au moment d'implémenter
- La logique métier doit sortir des Server Actions pour servir aux deux entrées
- Une clé d'API de longue durée à protéger et à faire tourner
- Tant qu'il reste `proposed`, la décomposition de la Feature 3 le signalera comme bloquant

---

# 📝 Notes complémentaires

Remplace la note « Serveur MCP » de l'[ADR-020](020-portfolio-bff.md) et la question ouverte du README de l'epic espace admin.

Chaque domaine déclare ses outils dans sa propre feature (`BRAINSTORM.md`, Features 2, 4, 5, 6 et 7), sur le socle posé par la Feature 3.
