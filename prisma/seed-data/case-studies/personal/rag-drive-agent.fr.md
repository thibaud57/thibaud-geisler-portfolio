## Contexte

À l'achat de mon appartement (octobre 2024), je me retrouve avec un Google Drive saturé de papiers : acte notarié, crédit immobilier, contrats d'assurance, assemblées de copropriété, factures travaux. Retrouver une info précise ("quelle est la franchise dégât des eaux ?", "date de la prochaine AG ?") devient pénible : il faut ouvrir chaque PDF un par un et le parcourir à la main, sans garantie de trouver.

**Objectif** : un agent RAG conversationnel via Telegram qui interroge mes documents indexés et met à jour automatiquement la collection quand j'ajoute des fichiers dans Drive. Conçu **générique dès le départ** : 1 dossier Drive = 1 collection RAG paramétrée par nom. Aujourd'hui un dossier unique `rag_appart` qui regroupe tous les papiers de l'appart (crédit, assurance, AG copro, contrats, manuels) ; demain un `rag_societe` ou un autre contexte si besoin, sans refonte.

**Mon rôle** : conception et développement complet de l'architecture multi-workflow n8n (orchestrateur + 2 sous-workflows), déploiement self-hosted.

## Réalisations marquantes

### Orchestrateur Telegram (entrée multi-modale + routing IA)

Bot Telegram qui accepte texte ou audio (transcription LLM), avec un AI Agent routeur qui sélectionne dynamiquement entre 2 outils : recherche RAG ou indexation d'un nouveau dossier. Mémoire conversationnelle indexée par chat.

**Défis techniques** : entrée multi-modale (text + voice), routing fiable vers les bons sous-workflows selon la requête, mémoire stable par utilisateur sans fuite entre conversations.

**Solutions** : Switch n8n sur le type de message (text vs voice), AI Agent avec system prompt strict définissant les 2 outils + leurs cas d'usage, sous-workflows exposés comme tools n8n (`Tool Workflow`) callables comme des fonctions par l'agent.

### Pipeline d'ingestion Drive RAG idempotent

Workflow d'indexation avec **3 triggers** (formulaire, webhook, sub-workflow) qui scanne un dossier Google Drive, détecte les fichiers nouveaux/modifiés, les chunke, génère les embeddings et persiste dans Qdrant. Metadata enrichies par un summarizer LLM (theme, topics, painPoints, keywords).

**Défis techniques** : éviter le re-embedding inutile à chaque exécution (coût), gérer la suppression propre dans Qdrant quand un fichier est modifié, prendre en charge plusieurs formats (PDF, DOCX, Google Docs natifs), créer dynamiquement les tables Postgres et collections Qdrant par dossier.

**Solutions** : table Postgres metadata par collection avec dates de référence, **comparaison Drive vs Postgres → skip si inchangé**, sinon delete sur `metadata.fileId` dans Qdrant + reinsert ; switch sur `mimeType` pour brancher l'extracteur PDF ou DOCX ; chunking 800 / overlap 100 ; tables et collections nommées par dossier pour cloisonner les domaines.

### Agentic RAG (validation + recherche hybride metadata + sémantique)

Sous-workflow qui répond aux questions utilisateur en 2 étapes : d'abord **validation de la collection cible** (un mini-agent vérifie qu'elle existe, sinon demande à clarifier), ensuite **recherche hybride** (un agent principal interroge les metadata Postgres pour identifier les documents pertinents, puis fait la recherche sémantique Qdrant en filtrant sur les fileId retenus).

**Défis techniques** : éviter le bruit du RAG pur sémantique (extraits hors-sujet qui correspondent par embedding seul), garantir la **traçabilité des sources** dans la réponse, robustifier le format de sortie JSON malgré les hallucinations LLM.

**Solutions** : **pré-filtrage par metadata structurée** (theme/topics/keywords) avant la recherche sémantique, output structuré `{message, sources: {documents, themes, keywords}}` avec citation systématique des fichiers, **auto-fixing parser via le pattern LangChain `OutputFixingParser`** (LLM secondaire Claude Sonnet qui reformate l'output JSON quand le LLM principal sort un format invalide).

## Résultats

- **Collection `rag_appart`** : ~30 documents indexés (acte notarié, crédit immobilier, contrats d'assurance, AG copropriété, manuels électroménagers, factures travaux)
- **Coût d'embedding one-shot** : ~5-10 € pour l'indexation initiale, requêtes peu coûteuses (embeddings = poste de coût principal)
- **Indexation incrémentale** : un nouveau document Drive → 1 commande Telegram suffit pour mettre à jour la collection sans doublon
- **Recherche tracée** : chaque réponse cite ses sources (fileName + fileId), zéro information fabriquée
- **Usage réel** : POC personnel utilisé ponctuellement (quelques requêtes par mois), pas un usage intensif

## Apprentissages

- Architecture multi-workflow n8n (orchestrateur + sous-workflows réutilisables comme tools d'un AI Agent)
- **RAG hybride** (metadata structurée + recherche sémantique) plus fiable que le RAG pur sémantique
- Idempotence d'un pipeline d'ingestion (skip si inchangé, delete + reinsert si modifié) pour maîtriser les coûts d'embedding
- Output parsers structurés + auto-fixing avec un LLM secondaire pour fiabiliser la sortie JSON
- **Veille modèles LLM constante** : adapter le bon modèle au bon cas d'usage (routeur vs summarizer vs Q&A complexe), arbitrer entre coût et qualité, ré-évaluer à chaque sortie majeure
- Conception générique dès le départ : 1 dossier Drive = 1 collection Postgres + 1 collection Qdrant, paramétré par nom
- **n8n est excellent pour valider un POC RAG rapidement** (architecture multi-agents fonctionnelle en quelques heures), **mais pour une prod robuste à charge réelle** (faible latence, observabilité fine, tests automatisés), réécrire dans une vraie API reste préférable

## Évolutions prévues

- Reranking en aval du Qdrant pour améliorer la pertinence des extraits
- Exposition du RAG via un MCP Server (Claude Desktop, Cursor, agents IDE)
- Interface web de visualisation des collections et recherche hors Telegram
- Audit trail des requêtes en Postgres pour analyse d'usage
