## Contexte

Je maintiens un CRM de leads professionnels dans une **DB Notion** (statut, niveau d'intérêt, next step, notes, date de prochain message). Jusqu'ici : rédaction manuelle de chaque relance + ajout manuel d'une tâche TickTick de rappel. Répétitif, chronophage, risque d'oublis.

**Objectif business** : un seul geste (mettre à jour la date de prochain message dans Notion) déclenche automatiquement la rédaction d'un message personnalisé et la planification d'une tâche de rappel.

**Mon rôle** : conception et réalisation complète du workflow, de l'analyse du besoin au déploiement en production.

## Réalisations marquantes

### Automatisation de la relance CRM end-to-end

Workflow n8n event-driven qui écoute les mises à jour de la DB Notion et orchestre 3 étapes :
1. **Filtrage intelligent** des déclenchements (ne génère que si date de relance future, évite les appels LLM inutiles)
2. **Rédaction par agent IA** (Claude) d'un message de relance personnalisé et adapté au contexte du lead (statut, intérêt, historique)
3. **Planification automatique** d'une tâche TickTick rappelant la relance au bon moment

**Défis techniques** : générer des messages **réellement personnalisés** (ton, contexte, ancienneté de la relation) sans tomber dans les formules commerciales creuses.

**Solutions** : prompt engineering avancé (règles strictes sur ton, dates relatives, style bref), sortie structurée pour fiabilité.

### Pipeline Notion → Claude → TickTick sans doublons

Connexion **Notion ↔ Claude ↔ TickTick** dans un seul pipeline. Le Trigger Notion sur "Page Updated in Database" ne renvoie que les **propriétés DB** d'une row, jamais le body markdown. Or c'est dans le body que vit le contexte narratif riche d'un lead (mission, timeline des échanges, prochaine action).

**Solution** : MCP Server Notion attaché à l'agent IA via un node `MCP Client Tool`, qui appelle `notion-fetch` sur l'ID de page en début d'exécution pour récupérer le body markdown enrichi avant rédaction.

Gestion des cas limites : modifications répétées du même lead (pas de doublons), API TickTick sans upsert natif (match par titre → update ou create), erreurs réseau.

### Déploiement self-hosted

Workflow déployé sur n8n self-hosted (VPS + Dokploy) et versionné dans un repo dédié pour backup et traçabilité des évolutions. 
**Workflow d'alerting** dédié qui notifie en cas d'échec d'exécution (crash, timeout, erreur API).

## Résultats

- **Gain de temps** : relance automatique en ~ 30 secondes vs 3-5 minutes manuelles
- **Fin des oublis** : le rappel TickTick garantit qu'aucune relance planifiée n'est ratée
- **Qualité** : messages contextualisés, cohérents avec l'historique de la relation

## Apprentissages

- Prompt engineering avancé pour sorties IA fiables et contextualisées
- Orchestration multi-outils n8n (patterns upsert sans API native, filtrage)
- Conception d'outils internes qui font gagner du temps (approche ROI-first)
