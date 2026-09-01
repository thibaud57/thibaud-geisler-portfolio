## Contexte

Mission **freelance en cours** via **Theodo Extend**, au sein de l'équipe R&D d'un grand compte dans le domaine de la communication. L'équipe explore des usages de l'IA générative pour l'entreprise, avec deux objectifs : faire gagner du temps sur des process internes et **fiabiliser les chaînes LLM** en contrôlant les hallucinations.

Début en juin 2026, sur un module conversationnel embarqué dans un écosystème micro-frontend et micro-services déployé sur Google Cloud.

**Mon rôle** : responsable du périmètre conversationnel, de la logique d'agents jusqu'à l'interface, en binôme avec un autre développeur.

## Réalisations marquantes

### Systèmes multi-agents sur Vertex AI et Google ADK

Conception et industrialisation d'agents capables de raisonner sur des documents métier, d'appeler des outils et de produire des livrables exploitables. Les équipes d'agents sont **composées par l'utilisateur final** depuis l'interface, et non figées dans le code.

**Gestion des erreurs** : faire remonter l'erreur réelle plutôt que laisser l'agent improviser un fallback ou inventer une réponse, avec une distinction nette entre échec métier et échec technique.

**Défis techniques** : reproductibilité des résultats d'une session à l'autre, persistance de l'état à chaque tour de conversation, arbitrage entre déterminisme strict et souplesse conversationnelle selon les cas d'usage.

### Exécution de code en environnement isolé

Le code et les Skills produits par les agents s'exécutent dans une **sandbox hébergée sur Kubernetes (GKE)**, sans exposer l'infrastructure.

### Fiabilisation du socle technique

Passage des modèles de données et des schémas d'échange à **Pydantic** sur deux applications, avec introduction d'une couverture de tests, d'un linting et d'une chaîne d'intégration continue. Consolidation de l'architecture applicative, du système d'agents et de la chaîne de streaming.

**Défis techniques** : migrations de données à rejouer sur trois environnements à chaque évolution des modèles, refonte progressive sans interrompre les développements en cours, avec un risque de régression à contenir sur l'ensemble des modules.

### Module conversationnel

Réponses en choix multiples ou en texte libre, todo list dont chaque point progresse indépendamment, bouton d'arrêt d'une génération en cours. Streaming des réponses entre le service IA, le BFF et le front Angular, et montée de version continue des modèles et du framework d'agents.

**Défis techniques** : suivre un framework d'agents qui évolue vite, et arbitrer en permanence entre ce qu'il fournit nativement, ce qu'il faut surcoucher et ce qu'il faut réimplémenter.

### Outillage de développement

Construction d'un outillage personnel pour accélérer le delivery : scripts de démarrage de l'environnement, automatisation de la création de tickets via API, accès simplifié aux bases, documentation d'architecture servant de cartographie du code pour l'assistance IA.

## Apprentissages

- Conception et industrialisation d'agents sur **Vertex AI** et **Google ADK**, du prototype à la production
- Exécution de code d'agents en environnement isolé sur Kubernetes
- Contrôle et mesure des hallucinations sur des chaînes LLM métier
- Micro-frontends Angular avec shell NestJS dans un écosystème micro-services
- Introduction de pratiques de qualité (typage, tests, linting, CI) dans une base issue de prototypage
- Construction d'un outillage de delivery dans un cadre d'entreprise contraint : accès, sécurité, conventions de l'équipe et partage à d'autres développeurs
