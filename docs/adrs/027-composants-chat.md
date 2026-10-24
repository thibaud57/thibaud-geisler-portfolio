---
title: "ADR-027 — Composants de chat : primitives shadcn/ui et flux d'événements propre au portfolio"
status: "accepted"
description: "Décision actée : l'assistant interne, le chatbot public et le créateur de specs partagent les composants de chat du registry shadcn/ui, alimentés par un lecteur SSE et un état écrits dans le portfolio ; les réponses en streaming se rendent par react-markdown avec réparation du markdown incomplet"
date: "2026-10-24"
keywords: ["architecture", "adr", "chat", "shadcn", "sse", "markdown", "streaming", "assistant", "chatbot"]
scope: ["docs", "architecture"]
technologies: ["shadcn/ui", "react-markdown", "remend", "Server-Sent Events"]
---

# 🎯 Contexte

Trois surfaces du portfolio affichent une conversation avec un agent dont la réponse arrive en streaming :

- l'assistant interne de l'espace admin (Feature 3), en fenêtre flottante déplaçable et redimensionnable, avec une page d'historique, servi par `agent-os` (Claude Agent SDK Python) ;
- le créateur de specs et de docs de la partie Dev (Feature 8), servi lui aussi par `agent-os` ;
- le chatbot public (Feature 10), bilingue et sans historique conservé, servi par `portfolio-chatbot` (PydanticAI).

Le portfolio porte tous les fronts ([ADR-020](020-portfolio-bff.md)) : les services Python n'ont aucune interface et ne sont joints que par le serveur Next, qui relaie leur flux au navigateur en Server-Sent Events ([ADR-019](019-communication-inter-services.md)). Le `BRAINSTORM.md` impose les mêmes composants de chat aux trois surfaces.

Besoins communs : fil de messages, saisie, réponse au fil de l'eau, rendu markdown, appels d'outils, questions à choix posées par l'agent (`AskUserQuestion` : 1 à 4 questions, 2 à 4 options, choix multiple, réponse libre), confirmation d'écriture ([ADR-025](025-acces-agents-app.md)).

Contraintes du projet :

- shadcn/ui en style `radix-nova`, composants copiés par la CLI shadcn ([ADR-009](009-ui-system.md)), icônes `lucide-react`, thème par la classe `.dark`
- politique de sécurité du site sans `'unsafe-eval'` en production : Zod 4 côté navigateur y déclenche une violation, d'où Zod exclu du bundle public
- bundle public léger, le LCP mobile étant déjà hors cible (`docs/baselines/`)
- `MarkdownContent` (`react-markdown`, `remark-gfm`, classes `prose`) rend le markdown sans HTML brut et neutralise les URL dangereuses
- licence libre, aucune fonction nécessaire derrière une offre payante

---

# 🧩 Problème

Avec quels composants afficher ces conversations, alimentées par des flux qui ne suivent aucun protocole commun ? Comment rendre proprement un markdown reçu par morceaux ?

---

# 🛠️ Options Envisagées

## Option A : composants de chat du registry shadcn/ui, lecteur SSE et état écrits dans le portfolio

**Description :** primitives de chat ajoutées au registry shadcn en 2026 (`Message`, `Bubble`, `MessageScroller`, `Marker`, `Attachment`, `Questionnaire`, `Trace`, `Code Block`) et patterns AI Elements de shadcn (`Chat`, `Prompt Input`, `Tool`, `Confirmation`), installés un par un. Le portfolio écrit le lecteur SSE et l'état des messages.

**Avantages :**
- Même registry, même style et même CLI que le reste de l'interface ; code possédé
- Aucune dépendance imposée : `@shadcn/react` n'a aucune dépendance et demande React 19 ; pas de Zod
- `Questionnaire` couvre `AskUserQuestion` : choix simple ou multiple, réponse libre, étapes
- `Trace` et `Tool` affichent les étapes et les appels d'outils, `Confirmation` les écritures à valider
- `MessageScroller` est accessible (`role="log"`, défilement ancré sur le tour en cours)
- Aucun protocole imposé aux services Python

**Inconvénients :**
- Des briques : lecteur SSE, état des messages, liste des conversations et fenêtre flottante restent à écrire
- `@shadcn/react` en 0.x, composants publiés entre juin et octobre 2026
- `Tool` et `Confirmation` attendent des états de la forme de l'AI SDK, à produire depuis les événements du portfolio
- Aucun rendu markdown fourni

**Coût estimé :** moyen

## Option B : assistant-ui

**Description :** bibliothèque complète, composants copiés par la CLI shadcn (registry `@assistant-ui`) et moteur de conversation dans le paquet npm `@assistant-ui/react`.

**Avantages :**
- Liste des conversations fournie, persistable sur les endpoints du portfolio sans Assistant Cloud
- Fil, outils, `ApprovalCard`, `QuestionFlow` et rendu markdown fournis
- Flux maison branché par un générateur async (`LocalRuntime`)

**Inconvénients :**
- Le comportement vit dans un moteur npm en 0.x, au rythme d'environ deux versions par semaine (0.15.28 le 2026-10-12, 0.15.31 le 2026-10-22)
- `AssistantModal` est un popover ancré, ni déplaçable ni redimensionnable
- `QuestionFlow` limite les réponses aux options fournies
- Une vingtaine de fichiers copiés pour le fil complet, plus `zustand` ; poids à mesurer pour le site public

**Coût estimé :** moyen

## Option C : AI SDK UI (`useChat`) avec les composants shadcn

**Description :** hook d'état et de streaming de Vercel, sans interface, avec un transport vers le relais du portfolio.

**Avantages :**
- Couche d'état éprouvée, parts typées (texte, outils, approbations)
- PydanticAI émet déjà son protocole par son adaptateur Vercel AI

**Inconvénients :**
- `ai` importe Zod à l'exécution pour valider chaque trame : exclu du bundle public, donc du chatbot
- `agent-os` devrait émettre ce protocole
- Ni interface ni liste des conversations

**Coût estimé :** moyen

## Option D : CopilotKit

**Description :** plateforme sur le protocole AG-UI, avec runtime Node et composants de chat.

**Avantages :**
- Intégrations documentées pour PydanticAI et le Claude Agent SDK Python
- Popup et sidebar fournis

**Inconvénients :**
- La liste et la reprise des conversations exigent l'offre payante CopilotKit Intelligence
- Runtime Node à monter en plus du relais du portfolio
- `@copilotkit/react-core` pèse 7,8 Mo décompressé ; télémétrie en `postinstall`

**Coût estimé :** élevé

---

# 🎉 Décision

**Option A actée : composants de chat du registry shadcn/ui, choisie par le propriétaire le 2026-10-24.**

- **Composants** : installés à l'unité par la CLI shadcn, au fil des sub-projects qui en ont besoin. Les mêmes servent l'assistant interne, le créateur de specs et le chatbot public, dont les libellés passent en props (français en dur dans l'admin, next-intl sur le site public).
- **Flux** : le relais Next traduit le flux d'`agent-os` et celui de `portfolio-chatbot` vers un format d'événements propre au portfolio, que lit un lecteur SSE écrit ici. Aucun protocole de chat n'est imposé aux services.
- **Questions de l'agent** : une question en attente s'affiche par `Questionnaire`. Une réponse tapée dans le champ du chat repart comme `response` vers la question en attente, plutôt que comme un nouveau message.
- **Écrit dans le portfolio** : la fenêtre flottante déplaçable et redimensionnable ; la page d'historique, écran de l'admin sur les conversations stockées côté portfolio.
- **Markdown en streaming** : un composant de bulle sur `react-markdown` et `remark-gfm`. Avant le rendu, `remend` ferme le markdown incomplet ; un découpage par blocs mémoïsé évite de re-rendre les blocs déjà complets. Il garde les garanties de `MarkdownContent` (HTML brut échappé, `defaultUrlTransform`). `MarkdownContent` reste le rendu de tout markdown complet.
- **Sécurité du chatbot public** : images refusées hors d'une liste d'origines autorisées, liens limités à `http`, `https` et `mailto`, aucun HTML brut. La politique du site (`img-src 'self' data: https:`) ne bloque pas une image d'exfiltration vers un domaine https : le filtrage se fait dans le composant de rendu.

Le chatbot public charge ses composants à l'ouverture seulement, hors du bundle initial des pages.

---

# 🔄 Conséquences

## Positives

- Un seul jeu de composants, au style du design system, pour trois surfaces
- Bundle public sans Zod ni moteur tiers
- Comportement entièrement maîtrisé : routage des réponses, reprise d'une conversation commencée sur Telegram, affichage des étapes
- Services Python libres de leur protocole

## Négatives

- Lecteur SSE, état des messages, fenêtre flottante et page d'historique à écrire et à maintenir
- `@shadcn/react` en 0.x : une montée de version peut demander des retouches
- Mapping des événements vers les états attendus par `Tool` et `Confirmation`
- `remend` et `marked` entrent dans le bundle du chat
- Rendu des tableaux partiels et des blocs de code ouverts à vérifier par un prototype avant de figer le composant de bulle

---

# 📝 Notes complémentaires

**Rendu markdown en streaming.** Aucun des services ne traite le markdown : l'adaptateur AG-UI de PydanticAI émet des événements `TEXT_MESSAGE_*`, son adaptateur Vercel AI des événements texte ; le Claude Agent SDK émet des événements bruts (« raw Claude API events, not accumulated text »). Le portfolio accumule, répare et rend. L'alternative écartée est Streamdown 2.7.1 (Apache-2.0, 2026-10-19) : réparation intégrée, mais HTML brut rendu après sanitization (`rehype-raw`), liens, protocoles et images de toute origine autorisés par défaut (issue 640, ouverte au 2026-10-24) ; son échelle typographique lui est propre. Il reste le repli si le prototype montre que `remend` ne suffit pas, avec ces réglages resserrés.

**Écartées sans option détaillée.** Vercel AI Elements : dépréciation annoncée pour fin novembre 2026 au profit d'AI Elements de shadcn. prompt-kit : dernier ajout de code en novembre 2025, ni questions ni confirmation, recouvert par l'Option A. shadcn-chatbot-kit, LlamaIndex chat-ui, chatscope : sans activité depuis 2025 ou début 2026. MUI X Chat : préversion, second design system.

**Sources**, consultées le 2026-10-24 sauf mention :

- shadcn/ui : [annonce des composants de chat](https://ui.shadcn.com/docs/changelog/2026-06-chat-components), [Questionnaire](https://ui.shadcn.com/docs/components/radix/questionnaire), [Trace](https://ui.shadcn.com/docs/components/radix/trace), [Message Scroller](https://ui.shadcn.com/docs/components/radix/message-scroller), [AI Elements](https://ui.shadcn.com/docs/ai-elements), [annonce AI Elements](https://ui.shadcn.com/docs/changelog/2026-10-ai-elements) ; `@shadcn/react` 0.3.1 sur npm
- assistant-ui : [installation](https://www.assistant-ui.com/docs/installation.md), [threads](https://www.assistant-ui.com/docs/runtimes/concepts/threads.md), [AssistantModal](https://www.assistant-ui.com/docs/primitives/assistant-modal.md), [Question flow](https://www.assistant-ui.com/elements/question-flow) ; `@assistant-ui/react` 0.15.31 du 2026-10-22 sur npm
- AI SDK : [transport](https://ai-sdk.dev/docs/ai-sdk-ui/transport), [protocole de flux](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol) ; import de `zod/v4` lu dans `ai@7.0.152/dist/index.js`
- CopilotKit : [headless threads](https://docs.copilotkit.ai/headless-threads), [tarifs](https://www.copilotkit.ai/pricing)
- Vercel AI Elements : [dépôt](https://github.com/vercel/ai-elements)
- Claude Agent SDK : [streaming output](https://code.claude.com/docs/en/agent-sdk/streaming-output) ; [approvals and user input](https://code.claude.com/docs/en/agent-sdk/user-input), consultée le 2026-10-15 (champ `response` : « Optional freeform reply the user typed instead of answering the structured questions »)
- PydanticAI : [AG-UI](https://pydantic.dev/docs/ai/integrations/ui/ag-ui/), [Vercel AI](https://pydantic.dev/docs/ai/integrations/ui/vercel-ai/)
- Rendu : [Streamdown, sécurité](https://streamdown.ai/docs/security), [issue 640](https://github.com/vercel/streamdown/issues/640), [remend](https://github.com/vercel/streamdown/tree/main/packages/remend), [pattern mémoïsé de l'AI SDK](https://ai-sdk.dev/v5/cookbook/next/markdown-chatbot-with-memoization)
