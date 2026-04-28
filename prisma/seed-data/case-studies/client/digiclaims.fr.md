## Contexte

Mission longue durée chez **Foyer**, leader de l'assurance au Luxembourg, via **H2H Services**. Contribution au développement de deux applications stratégiques pour le marché belge en architecture microservices, avec un focus sur la qualité et le clean code.

**Mon rôle** : développeur fullstack.

## Réalisations marquantes

### Application de gestion des sinistres

Remplacement d'un système legacy par une application moderne permettant aux gestionnaires du marché belge de gérer leurs dossiers de sinistres. Automatisation de tâches répétitives, suivi complet des dossiers, intégration avec services externes sectoriels.

Participation active sur tous les modules : analyse technique et fonctionnelle, intégration d'APIs, production et consommation d'événements via Kafka, mise en prod et suivi.

**Défis techniques** : performance et scalabilité sur volumes importants, développement from scratch avec exigence **90%+** de coverage, intégration avec services externes legacy.

**Impact** : réduction significative du temps de traitement des dossiers, **4h ouvrables** pour le traitement complet d'un dossier.

### Application courtiers, création de sinistres

Plateforme permettant aux courtiers de créer des sinistres DAB ou Auto pour leurs clients, avec génération automatique d'une pièce jointe et création d'un dossier pré-rempli dans l'application de gestion des sinistres.

Contribution majeure sur l'ensemble du projet, du socle technique aux dernières features. Pilotage de la migration complexe **Angular 15 vers 17** (Signals, standalone components, remplacement de la lib de traduction par i18n natif).

**Défis techniques** : écrans évolutifs selon type de dossier (DAB/Auto), gestion multilingue (FR/NL), migration Angular 15 vers 17 avec Signals et standalone components.

**Impact** : **3 minutes** pour déclarer un sinistre auto, **+100 courtiers** actifs en croissance constante.

### Renfort ponctuel sur une autre équipe interne

Consommation d'événements Kafka avec filtrage puis transformation vers un format sectoriel legacy (sans JSON ni REST), génération et envoi de pièces jointes.

**Défis techniques** : intégration avec un service legacy sans JSON ni REST, autonomie importante sous contrainte de temps.

### Hackathon Foyer 2023

Participation en équipe et **victoire** au hackathon interne Foyer 2023 avec un projet de **chatbot IA et classification automatique**. Première exploration de l'IA appliquée dans un contexte métier assurance.

## Apprentissages

- Montée en compétence forte sur Scala et la programmation fonctionnelle
- Expérience concrète d'une architecture microservices event-driven (CQRS, Event Sourcing)
- Référent Angular (migration v15 → v17, reviews, support frontend), mentorat de stagiaires, participation aux décisions techniques et fonctionnelles
- Rigueur qualité : **90%+** de code coverage maintenu sur 3 ans, très peu de bugs P0 et hotfixes en production
- Tests complets : unitaires, intégration, charge

## Liens

- [LinkedIn : Hackathon Foyer 2023](https://www.linkedin.com/posts/hackathon2023-innovation-succaeys-ugcPost-7140709391946665984-Mxai)
- [LinkedIn : présentation vidéo Foyer Group](https://www.linkedin.com/posts/foyer-group_proximitaez-courtage-foyerbelgium-ugcPost-7376985940679983104-MX1X)
- [Assurances Foyer Belgique : outils digitaux pour courtiers](https://www.assurancesfoyer.be/fr/nos-services/nos-outils/)
