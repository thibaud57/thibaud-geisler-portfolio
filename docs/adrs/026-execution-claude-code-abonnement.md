---
title: "ADR-026 : Exécution de Claude Code sur l'abonnement"
status: "accepted"
description: "Décision actée : Claude Code s'exécute dans le service agent-os sur le VPS, sur l'abonnement et jamais l'API, avec l'environnement complet du propriétaire, déclenché uniquement par une action du propriétaire, attentes et fin de run signalées sur Telegram"
date: "2026-09-30"
keywords: ["architecture", "adr", "claude-code", "abonnement", "agent-os", "routines", "remote-control", "telegram"]
scope: ["docs", "architecture"]
technologies: ["Claude Code", "Claude Agent SDK", "Python", "Dokploy"]
---

# 🎯 Contexte

L'espace admin fait exécuter Claude Code par `agent-os` ([ADR-015](015-decoupage-services.md)) dans trois situations : les jobs des agents internes (pré-remplissage, enrichissement, rédaction, dont la rédaction assistée des publications), l'assistant interne et le cycle de développement (implémenter un sub-project spécifié, auditer un dépôt).

Contraintes :

- **Abonnement uniquement, jamais l'API** ([ADR-016](016-acces-llm.md)) : le plan Max est déjà payé
- **L'environnement complet du propriétaire** : sa configuration globale, versionnée dans le dépôt `.claude` (CLAUDE.md, commandes dont `implement-subproject`, skills, agents, hooks, plugins dont superpowers) ainsi que les skills freelance pour le domaine freelance. Un run qui ne verrait que la configuration du dépôt de code ne sait pas dérouler le workflow
- **Lancé sans surveillance** : le propriétaire lance plusieurs runs, depuis l'espace admin ou son téléphone, puis passe à autre chose. Il est prévenu quand un run attend un accord ou une réponse, ou se termine ; il répond depuis son téléphone
- **Un VPS de production partagé** avec le site public, n8n et un service interne de collecte de pages publiques

---

# 🧩 Problème

Où exécuter Claude Code pour que chaque run lancé par le propriétaire dispose de l'environnement complet, reste sur l'abonnement et puisse s'interrompre pour poser une question au propriétaire.

---

# 🛠️ Options Envisagées

## Option A : un service dédié, `agent-os`, sur le VPS

**Description :** `agent-os` pilote le binaire Claude Code dans son container, avec la configuration globale et le dépôt concerné. La mécanique de session (Agent SDK par `ai-kit` plutôt que `claude -p` relancé à chaque appel) est décidée dans l'ADR-002 d'`agent-os`.

**Avantages :**
- Environnement complet : le container porte la configuration globale et travaille dans le dépôt concerné
- Sur l'abonnement
- Questions et accords relayables jusqu'au téléphone, avec une attente longue
- Pilotable depuis l'admin, qui lance les runs et lit leur état

**Inconvénients :**
- Exécution sur la machine de production : limites de ressources et isolation du container à tenir
- Token d'abonnement présent sur le VPS
- Exposé au changement de facturation de l'usage programmatique mis en pause (cf. Notes)

**Coût estimé :** l'abonnement seul, un service à construire et à opérer.

## Option B : routines claude.ai déclenchées par API

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

## Option C : `claude-code-action` sur GitHub Actions

**Description :** une mention `@claude` ou un label sur une issue lance Claude Code sur un runner GitHub.

**Avantages :**
- Plugins installables par l'entrée `plugins`, token d'abonnement accepté
- Rien ne tourne sur le VPS

**Inconvénients :**
- Configuration user absente (commandes, CLAUDE.md global)
- Résultats en commentaires GitHub, aucun pilotage depuis l'admin
- Minutes GitHub Actions décomptées sur les dépôts privés
- Dans le périmètre du crédit séparé mis en pause

**Coût estimé :** l'abonnement et les minutes GitHub au-delà du quota gratuit.

## Option D : Remote Control

**Description :** une session Claude Code interactive, sur le poste ou en mode serveur sur le VPS, pilotée depuis claude.ai/code ou l'application mobile.

**Avantages :**
- Environnement complet, notifications push
- Usage interactif, hors du périmètre du crédit séparé mis en pause

**Inconvénients :**
- Aucune API pour ouvrir ou alimenter une session depuis l'admin ([claude-code #97482](https://github.com/anthropics/claude-code/issues/97482) ouverte, [#70546](https://github.com/anthropics/claude-code/issues/70546) fermée sans suite)
- Exige une connexion complète : le token de `claude setup-token` ne peut pas l'établir

**Coût estimé :** l'abonnement seul.

---

# 🎉 Décision

**Option A.** Claude Code s'exécute dans `agent-os`, sur l'abonnement, avec l'environnement complet du propriétaire.

Acté :

- **Déclenchement uniquement par une action du propriétaire** : depuis l'espace admin (bouton d'un job, carte du kanban, message à l'assistant), ou par un message au bot Telegram. Aucun cron, aucun lancement sur événement. Chaque run part d'une action du propriétaire
- **Jamais l'API** : aucune API key dans l'environnement qui exécute Claude Code, authentification par token d'abonnement, dépassement payant désactivé sur le compte. Un quota épuisé suspend les runs au lieu de les facturer
- **Environnement complet, sans duplication** : la configuration globale vient du dépôt `.claude`, celle d'un domaine vient du dépôt où la session travaille (les skills freelance pour le freelance, le dépôt de code pour le cycle de développement). Une session est non stricte (`strict_mcp_config=False`, ADR-002 d'`agent-os`) : plugins avec leurs serveurs MCP et connecteurs claude.ai du compte sont chargés comme sur le poste. Réserve, à valider au spike d'`agent-os` : le token de `claude setup-token` ne récupère pas les connecteurs claude.ai (source `Authentication` ci-dessous)
- **Le téléphone remplace le terminal, l'admin sert de cockpit** : quand une session attend un accord ou une réponse, ou se termine, `agent-os` prévient le propriétaire par Telegram. L'admin lance les runs et affiche leur état sur les cartes et les jobs, sans fil de conversation ; seul l'assistant interne y reste une conversation (amendement du 2026-10-24 : le créateur de specs et de docs de la Feature 9 aussi, [ADR-027](027-composants-chat.md)). Les règles de la configuration globale, comme la validation avant commit, s'appliquent telles quelles
- **Un seul bot Telegram, tenu par `agent-os`** : alertes, réponses et messages libres qui ouvrent une session de l'assistant avec le MCP de l'app. Réception par long polling, le service n'ayant ni domaine ni port public ([ADR-019](019-communication-inter-services.md))
- **Des PR, jamais de merge** : le propriétaire merge

Le fonctionnement interne d'`agent-os` vit dans ses ADR : mécanique de session et résultats du prototype (ADR-002), isolation et relevés du VPS (ADR-004), relais Telegram (ADR-007), cycle de dev (ADR-008).

Les autres options : B et C n'ont pas l'environnement global et ne se pilotent pas depuis l'admin ; D ne se déclenche pas par programme.

**D reste le plan B.** Si le crédit séparé revient et ne suffit plus, les sessions lourdes passent en interactif par Remote Control, dont l'usage reste sur les limites normales.

---

# 🔄 Conséquences

## Positives
- Un seul coût, l'abonnement déjà payé
- Le workflow complet (commandes, skills, superpowers, skills freelance) sans rien recopier dans les dépôts
- Des runs lancés sans rien surveiller : le téléphone prévient et débloque, l'admin donne la vue d'ensemble
- Le moteur ne dépend d'aucune fonctionnalité en research preview

## Négatives
- Claude Code tourne sur le VPS de production : limites de ressources et isolation du container à tenir ([ADR-019](019-communication-inter-services.md))
- Compromettre le container livre le token d'abonnement : token dédié, révocable, seul secret Anthropic du VPS
- Un service à construire : relais des questions et des accords vers Telegram, état des runs dans l'admin, reprise de session
- Le texte des alertes transite par Telegram, sans chiffrement de bout en bout pour un bot : une question qui porte une donnée de lead fait de Telegram un destinataire, à inscrire au registre des traitements avec les agents internes
- Exposé à la politique de facturation de l'usage programmatique d'Anthropic, suspendue et non abandonnée
- Les transcripts de sessions restent sur le VPS et portent des données de leads : leur durée de conservation se fixe avec les agents internes

---

# 📝 Notes complémentaires

**Environnements self-hosted.** Ils combineraient déclenchement par API et exécution sur le VPS, mais « Self-hosted environments are in public beta on Team and Enterprise plans » : hors de portée d'un plan Max.

**Sources**, consultées le 2026-09-30 :

- [Support Anthropic, Use the Claude Agent SDK with your Claude plan](https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan) : « We're pausing the changes to Claude Agent SDK usage described below. For now, nothing has changed: Claude Agent SDK, `claude -p`, and third-party app usage still draw from your subscription's usage limits. » Le changement suspendu, prévu au 15 juin 2026, créait selon l'article un crédit mensuel séparé (20 $ en Pro, 100 $ en Max 5x, 200 $ en Max 20x) pour l'Agent SDK, `claude -p`, les GitHub Actions et les applications tierces, Claude Code interactif restant sur les limites normales. Mise à jour du 7 octobre 2026, relevée le 2026-11-05 : « when you're signed in with your Claude plan, the Claude Agent SDK and `claude -p` still draw from your subscription limits »
- [Claude Code, Legal and compliance](https://code.claude.com/docs/en/legal-and-compliance) : « Advertised usage limits for Pro and Max plans assume ordinary, individual usage of Claude Code and the Agent SDK »
- [Claude Code, Authentication](https://code.claude.com/docs/en/authentication) : « In non-interactive mode (`-p`), the key is always used when present » ; le token de `claude setup-token` « can only make model requests, so it can't establish Remote Control sessions or fetch claude.ai connectors »
- [Claude Code, Settings in cloud sessions](https://code.claude.com/docs/en/settings#settings-in-cloud-sessions) : « User and project local settings (`~/.claude/settings.json` and `.claude/settings.local.json`): not read » ; [Configure cloud environments](https://code.claude.com/docs/en/cloud-environments) : « A cloud session doesn't install the plugins a repository turns on »
- [Claude Code, Routines](https://code.claude.com/docs/en/routines) : « Routines draw down subscription usage the same way interactive sessions do »
- [Claude Code, Remote Control](https://code.claude.com/docs/en/remote-control) : « available on Pro, Max, Team, and Enterprise plans. API keys are not supported »
- [Claude Code, Self-hosted environments](https://code.claude.com/docs/en/self-hosted-environments), pour la citation ci-dessus
- [TechCrunch, 28 juillet 2025](https://techcrunch.com/2025/07/28/anthropic-unveils-new-rate-limits-to-curb-claude-code-power-users/) : annonce des limites hebdomadaires d'usage de Claude Code
