---
title: "ADR-026 — Exécution de Claude Code sur l'abonnement"
status: "accepted"
description: "Décision actée : agent-os pilote le binaire Claude Code par l'Agent SDK Python, sur l'abonnement et jamais l'API, avec l'environnement complet du propriétaire, déclenché uniquement par une action du propriétaire, attentes et fin de run signalées sur Telegram"
date: "2026-09-30"
keywords: ["architecture", "adr", "claude-code", "agent-sdk", "abonnement", "agent-os", "routines", "remote-control", "telegram"]
scope: ["docs", "architecture"]
technologies: ["Claude Code", "Claude Agent SDK", "Python", "Dokploy"]
---

# 🎯 Contexte

L'espace admin fait exécuter Claude Code par `agent-os` ([ADR-015](015-decoupage-services.md)) dans trois situations : les jobs des agents internes (pré-remplissage, enrichissement, rédaction, dont la rédaction assistée des publications), l'assistant interne, et le cycle de développement (implémenter un sub-project spécifié, auditer un dépôt).

Contraintes :

- **Abonnement uniquement, jamais l'API** ([ADR-016](016-acces-llm.md)) : le plan Max est déjà payé
- **L'environnement complet du propriétaire** : sa configuration globale, versionnée dans le dépôt `.claude` (CLAUDE.md, commandes dont `implement-subproject`, skills, agents, hooks, plugins dont superpowers), et la configuration du dépôt `freelance-toolkit` pour le domaine freelance. Un run qui ne verrait que la configuration du dépôt de code ne sait pas dérouler le workflow
- **Lancé sans surveillance** : le propriétaire lance plusieurs runs, depuis l'espace admin ou son téléphone, puis passe à autre chose. Il est prévenu quand un run attend un accord ou une réponse, ou se termine, et répond depuis son téléphone
- **Un VPS de production partagé** avec le site public, n8n et le scraper

---

# 🧩 Problème

Où et comment exécuter Claude Code pour que chaque run lancé par le propriétaire dispose de l'environnement complet, reste sur l'abonnement et puisse s'interrompre pour poser une question au propriétaire.

---

# 🛠️ Options Envisagées

## Option A : Agent SDK Python dans `agent-os`, sur le VPS

**Description :** `agent-os` pilote le binaire Claude Code, que le paquet `claude-agent-sdk` embarque, dans son conteneur. Une session vivante par job, carte du kanban ou conversation.

**Avantages :**
- Environnement complet : le conteneur porte la configuration globale et travaille dans le dépôt concerné, avec un chargement déclaré explicitement (`setting_sources`) plutôt que laissé à une valeur par défaut
- Sur l'abonnement, au même titre que `claude -p`
- Questions et accords relayables : `AskUserQuestion` et les demandes de permission passent par le callback `can_use_tool`, qui « can stay pending indefinitely ». Pour une attente longue, un hook `PreToolUse` en `defer` libère le processus et la session reprend à la réponse
- Conversation sans redémarrage : un `ClaudeSDKClient` garde la même session d'un message à l'autre
- Messages typés et réponse au fil de l'eau (`include_partial_messages`)

**Inconvénients :**
- Exécution sur la machine de production : limites de ressources et isolation du conteneur à tenir
- Jeton d'abonnement présent sur le VPS
- Fuites mémoire signalées sur les sessions longues ([claude-code #85015](https://github.com/anthropics/claude-code/issues/85015))
- Exposé comme `claude -p` au changement de facturation mis en pause (cf. Notes)

**Coût estimé :** l'abonnement seul, un conteneur.

## Option B : `claude -p` relancé à chaque appel dans `agent-os`

**Description :** même emplacement, un processus par appel, la conversation reprise par `--resume`.

**Avantages :**
- Le plus simple à écrire
- Même environnement, même abonnement, même statut que l'Option A : la documentation traite `claude -p` comme l'Agent SDK en ligne de commande

**Inconvénients :**
- Démarrage complet à chaque message : configuration, plugins, serveurs MCP
- Aucune question ne peut attendre une réponse : en exécution sans surveillance, une demande de permission est refusée et `AskUserQuestion` est retiré
- Le multi-tour sur un seul processus (`--input-format stream-json`) n'a pas de format d'entrée documenté ([claude-code #24594](https://github.com/anthropics/claude-code/issues/24594))

**Coût estimé :** l'abonnement seul.

## Option C : routines claude.ai déclenchées par API

**Description :** l'admin appelle l'endpoint `/fire` d'une routine ; Anthropic ouvre une session cloud qui clone le dépôt, travaille et ouvre une PR.

**Avantages :**
- Mécanisme officiel sur Pro et Max, sur l'abonnement
- Rien ne tourne sur le VPS ; Docker et PostgreSQL sont disponibles dans la VM

**Inconvénients :**
- Aucune configuration globale : les réglages user ne sont pas lus et les plugins ne sont pas installés, même déclarés dans le dépôt. Il faudrait recopier commandes, skills et règles dans chaque dépôt
- Aucune question en cours de route : la routine s'exécute sans demander d'approbation
- Aucune API de lecture d'état ni notification de fin : le seul retour fiable est la PR
- Fonctionnalité en research preview

**Coût estimé :** l'abonnement seul.

## Option D : `claude-code-action` sur GitHub Actions

**Description :** une mention `@claude` ou un label sur une issue lance Claude Code sur un runner GitHub.

**Avantages :**
- Plugins installables par l'entrée `plugins`, jeton d'abonnement accepté
- Rien ne tourne sur le VPS

**Inconvénients :**
- Configuration user absente (commandes, CLAUDE.md global)
- Résultats en commentaires GitHub, aucun pilotage depuis l'admin
- Minutes GitHub Actions décomptées sur les dépôts privés
- Dans le périmètre du crédit séparé mis en pause

**Coût estimé :** l'abonnement et les minutes GitHub au-delà du quota gratuit.

## Option E : Remote Control

**Description :** une session Claude Code interactive, sur le poste ou en mode serveur sur le VPS, pilotée depuis claude.ai/code ou l'application mobile.

**Avantages :**
- Environnement complet, notifications push
- Usage interactif, hors du périmètre du crédit séparé mis en pause

**Inconvénients :**
- Aucune API pour ouvrir ou alimenter une session depuis l'admin ([claude-code #97482](https://github.com/anthropics/claude-code/issues/97482) ouverte, [#70546](https://github.com/anthropics/claude-code/issues/70546) fermée sans suite)
- Exige une connexion complète : le jeton de `claude setup-token` ne peut pas l'établir

**Coût estimé :** l'abonnement seul.

---

# 🎉 Décision

**Option A.** `agent-os` pilote le binaire Claude Code par l'Agent SDK Python, sur l'abonnement, avec l'environnement complet du propriétaire.

Acté :

- **Déclenchement uniquement par une action du propriétaire** : depuis l'espace admin (bouton d'un job, carte du kanban, message à l'assistant), ou par un message au bot Telegram. Aucun cron, aucun lancement sur événement. Chaque run part d'une action du propriétaire, ce qui le garde dans l'usage ordinaire et individuel que supposent les limites des plans Pro et Max
- **Jamais l'API** : aucune clé API dans l'environnement qui exécute Claude Code, authentification par jeton d'abonnement, dépassement payant désactivé sur le compte. Un quota épuisé suspend les runs au lieu de les facturer
- **Environnement complet, sans duplication** : la configuration globale vient du dépôt `.claude`, celle d'un domaine vient du dépôt où la session travaille (`freelance-toolkit` pour le freelance, le dépôt de code pour le cycle de développement). Les connecteurs claude.ai du compte ne sont pas chargés
- **Le téléphone remplace le terminal, l'admin sert de cockpit** : quand une session attend un accord ou une réponse, ou se termine, `agent-os` prévient le propriétaire par Telegram. Un accord se donne par boutons, une question par un bouton par option ou une réponse libre, la fin porte le lien de la PR. L'admin lance les runs et affiche leur état sur les cartes et les jobs, sans fil de conversation ; seul l'assistant interne y reste une conversation. Les règles de la configuration globale, comme la validation avant commit, s'appliquent telles quelles
- **Un seul bot Telegram, tenu par `agent-os`** : alertes, réponses, et messages libres qui ouvrent une session de l'assistant avec le MCP de l'app, par exemple pour créer un ticket. Réception par long polling, le service n'ayant ni domaine ni port public ([ADR-019](019-communication-inter-services.md)). Telegram n'acceptant qu'un lecteur par bot, celui-ci ne sert qu'à `agent-os`
- **Des PR, jamais de merge** : le propriétaire merge
- **Version épinglée**, montée par PR après contrôle de ce que la session charge

Les autres options : B paie un démarrage à chaque message et ne sait pas relayer une question ; C et D n'ont pas l'environnement global et ne se pilotent pas depuis l'admin ; E ne se déclenche pas par programme.

**E reste le plan B.** Si le crédit séparé revient et ne suffit plus, les sessions lourdes passent en interactif par Remote Control, dont l'usage reste sur les limites normales.

---

# 🔄 Conséquences

## Positives
- Un seul coût, l'abonnement déjà payé
- Le workflow complet (commandes, skills, superpowers, toolkit freelance) sans rien recopier dans les dépôts
- Des runs lancés sans rien surveiller : le téléphone prévient et débloque, l'admin donne la vue d'ensemble
- Le moteur ne dépend d'aucune fonctionnalité en research preview

## Négatives
- Claude Code tourne sur le VPS de production : limites de ressources et isolation du conteneur à tenir ([ADR-019](019-communication-inter-services.md))
- Compromettre le conteneur livre le jeton d'abonnement : jeton dédié, révocable, seul secret Anthropic du VPS
- Un chantier à construire : relais des questions et des accords vers Telegram, état des runs dans l'admin, reprise de session
- Le texte des alertes transite par Telegram, sans chiffrement de bout en bout pour un bot : une question qui porte une donnée de lead fait de Telegram un destinataire, à inscrire au registre des traitements avec les agents internes
- Exposé à la politique de facturation de l'usage programmatique d'Anthropic, suspendue et non abandonnée
- Les transcripts de sessions restent sur le VPS et portent des données de leads : leur durée de conservation se fixe avec les agents internes (réglage `cleanupPeriodDays`, 30 jours par défaut)

---

# 📝 Notes complémentaires

**À vérifier par un prototype en sandbox avant l'implémentation :**

1. Une session charge la configuration globale et les plugins attendus, contrôlé par l'événement `system/init`
2. Aucune facturation API : la consommation apparaît sur l'usage de l'abonnement
3. Une question et une demande d'accord partent sur Telegram, attendent et reprennent à la réponse
4. Latence du premier message et tenue mémoire d'une session longue
5. L'isolation de chaque session : micro-VM [Docker Sandboxes](https://docs.docker.com/ai/sandboxes/), avec son propre noyau et son propre démon Docker, ou conteneur unique. La sandbox Bash de Claude Code et le sandbox runtime d'Anthropic reposent sur bubblewrap, que le VPS bloque en mode normal : seul le mode affaibli `enableWeakerNestedSandbox` y fonctionnerait, que la documentation réserve aux cas où une autre isolation est en place

**Constats sur le VPS**, relevés le 2026-10-01 : `/dev/kvm` présent (AMD-V), donc les micro-VM sont possibles ; `kernel.unprivileged_userns_clone = 0` et `kernel.apparmor_restrict_unprivileged_userns = 1`, donc bubblewrap seulement en mode affaibli ; 7,7 Gio de RAM dont 2,9 disponibles, donc une session à la fois tant que la RAM n'est pas augmentée.

**Socket Docker de l'hôte, jamais.** La documentation de la sandbox de Claude Code le rappelle : « allowing access to `/var/run/docker.sock` effectively grants access to the host system through the Docker socket » ([Claude Code, Sandboxing](https://code.claude.com/docs/en/sandboxing)).

**Pourquoi pas le plugin Telegram des channels.** Il relaie les accords d'outils avec des boutons, mais « Relay covers tool-use approvals like `Bash`, `Write`, and `Edit` » ([Channels reference](https://code.claude.com/docs/en/channels-reference), consultée le 2026-10-01) : les questions à choix n'y passent pas. Il exige aussi une session `claude --channels` ouverte en permanence, et « Telegram allows exactly one getUpdates consumer per token » ([code du plugin officiel](https://github.com/anthropics/claude-plugins-official/tree/main/external_plugins/telegram), relevé le 2026-10-01) : un bot par session. Le relais part donc du callback `can_use_tool` d'`agent-os`, qui reçoit les deux.

**Environnements self-hosted.** Ils combineraient déclenchement par API et exécution sur le VPS, mais « Self-hosted environments are in public beta on Team and Enterprise plans » : hors de portée d'un plan Max.

**Sources**, consultées le 2026-09-30 :

- [Support Anthropic, Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) : « We're pausing the changes to Claude Agent SDK usage described below. For now, nothing has changed: Claude Agent SDK, `claude -p`, and third-party app usage still draw from your subscription's usage limits. » Le changement suspendu, prévu au 15 juin 2026, créait selon l'article un crédit mensuel séparé (20 $ en Pro, 100 $ en Max 5x, 200 $ en Max 20x) pour l'Agent SDK, `claude -p`, les GitHub Actions et les applications tierces, Claude Code interactif restant sur les limites normales
- [Claude Code, Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) : « Advertised usage limits for Pro and Max plans assume ordinary, individual usage of Claude Code and the Agent SDK »
- [Claude Code, Run Claude Code programmatically](https://code.claude.com/docs/en/headless) : « This page covers using the Agent SDK via the CLI (`claude -p`) » ; « `--bare` is the recommended mode for scripted and SDK calls, and will become the default for `-p` in a future release » ; « In bare mode, Claude Code never reads OAuth credentials or the system keychain »
- [Claude Code, Authentication](https://code.claude.com/docs/en/authentication) : « In non-interactive mode (`-p`), the key is always used when present » ; le jeton de `claude setup-token` « can only make model requests, so it can't establish Remote Control sessions or fetch claude.ai connectors »
- [claude-agent-sdk-python, README](https://github.com/anthropics/claude-agent-sdk-python) : « The Claude Code CLI is automatically bundled with the package »
- [Agent SDK, Handle approvals and user input](https://code.claude.com/docs/en/agent-sdk/user-input) : « The callback can stay pending indefinitely »
- [Claude Code, Settings in cloud sessions](https://code.claude.com/docs/en/settings#settings-in-cloud-sessions) : « User and project local settings (`~/.claude/settings.json` and `.claude/settings.local.json`): not read » ; [Configure cloud environments](https://code.claude.com/docs/en/cloud-environments) : « A cloud session doesn't install the plugins a repository turns on »
- [Claude Code, Routines](https://code.claude.com/docs/en/routines) : « Routines draw down subscription usage the same way interactive sessions do »
- [Claude Code, Remote Control](https://code.claude.com/docs/en/remote-control) : « available on Pro, Max, Team, and Enterprise plans. API keys are not supported »
- [Claude Code, Self-hosted environments](https://code.claude.com/docs/en/self-hosted-environments), pour la citation ci-dessus
- [TechCrunch, 28 juillet 2025](https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/) : les limites hebdomadaires visent les abonnés qui font tourner Claude Code « continuously in the background, 24/7 », raison de l'absence de cron
