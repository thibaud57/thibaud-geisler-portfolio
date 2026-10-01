---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "rgpd-prospection"
goal: "Mettre le registre des traitements et la politique de confidentialité en règle pour la prospection et le réseau professionnel, avant que la base stocke des personnes."
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-09-26"
---

# Déclaration RGPD de la prospection et du réseau professionnel

## Scope

Déclare au registre un traitement unique « relations professionnelles », couvrant les prospects (leads) et le réseau professionnel (contacts), et en informe publiquement dans la politique de confidentialité FR et EN, avec la phrase type à glisser dans le premier message de prospection. Aucun consentement ni message préalable : la prospection B2B repose sur l'intérêt légitime. Exclut l'état « ne plus contacter », porté par `07-leads-donnees-design.md`, la date du dernier contact émanant d'un lead, déduite des actions de prospection (`09`), ainsi que toute purge automatisée.

### État livré

À la fin de ce sub-project, on peut : ouvrir `/fr/confidentialite` et `/en/confidentialite` et y lire la finalité « prospection et relations professionnelles » avec ses données, ses sources, ses durées et le moyen de s'y opposer, trouver le Traitement 7 complet dans `docs/registre-traitements.md` et lire dans `docs/PRODUCTION.md` la procédure des demandes RGPD.

## Dependencies

Aucune : ce sub-project est autoporté.

## Files touched

- **À modifier** : `docs/registre-traitements.md` (Traitement 7, date du frontmatter)
- **À modifier** : `content/legal/fr/confidentialite-intro.md` (finalité prospection et relations professionnelles)
- **À modifier** : `content/legal/en/confidentialite-intro.md` (même finalité en anglais)
- **À modifier** : `messages/fr.json` (`PrivacyPolicy.rights.body` : droit de s'opposer à la prospection ; `PrivacyPolicy.lastUpdated`)
- **À modifier** : `messages/en.json` (mêmes clés)
- **À modifier** : `docs/ARCHITECTURE.md` (§ Protection Données, renvoi au Traitement 7)
- **À modifier** : `docs/PRODUCTION.md` (rubrique « Demandes RGPD » : accès, rectification, opposition et effacement via l'écran, journal hors dépôt, rejeu après restauration)

## Architecture approach

- **Registre** : Traitement 7 au format des six existants (tableau `Champ | Détail`), avec deux lignes de plus que les autres, `Sources` et `Information des personnes`, qu'exige l'article 14 RGPD pour des données non collectées auprès de la personne. Contenu :
  - **Finalité** : prospection commerciale des services du freelance et suivi de son réseau professionnel
  - **Base légale** : intérêt légitime (art. 6.1.f), la sollicitation restant en rapport avec la profession de la personne, condition que pose la CNIL pour la prospection entre professionnels
  - **Personnes concernées** : prospects et auteurs de demandes entrantes (leads) ; réseau professionnel, anciens collègues, clients, partenaires (contacts) ; le nom et l'adresse d'une entreprise individuelle chez un prospect ou un client (entité légale, `05`), ceux d'une personne physique, avec les mêmes droits qu'un lead
  - **Données** : identité, poste, entreprise, coordonnées professionnelles, profil LinkedIn, notes d'échange, historique des actions de prospection et des entretiens
  - **Sources** : profils professionnels publics (LinkedIn, site de l'entreprise), candidatures et plateformes de mission, recommandations, événements professionnels, échanges directs
  - **Destinataire** : Thibaud Geisler
  - **Sous-traitants** : IONOS (hébergeur du VPS et de la base), Cloudflare (bucket `portfolio-backups` des sauvegardes de la base, juridiction `eu`)
  - **Transferts hors UE** : aucun
  - **Conservation** : prospect, 3 ans à compter de la collecte ou du dernier contact émanant de lui, puis relance pour savoir s'il souhaite rester ou suppression ; personne qui s'est opposée, email et profil LinkedIn seuls conservés 3 ans, durée minimale recommandée par la CNIL, pour la seule gestion de l'opposition ; réseau, durée de la relation, suppression à la demande de la personne
  - **Information des personnes** : phrase type dans le premier message (texte fixé en Décision ci-dessous) ; pour une personne jamais contactée, exception d'effort disproportionné (art. 14.5.b), l'information étant rendue publique par la politique de confidentialité
  - **Stockage** : base PostgreSQL, schema `freelance`, joignable du seul réseau Docker interne
  - **Sécurité** : espace admin single-user derrière Google OAuth et whitelist (Traitement 6), HTTPS/TLS
  - **AIPD** : non nécessaire à cette échelle (aucune donnée sensible, aucune décision automatisée à effet juridique), à réévaluer si les agents internes se mettent à noter les personnes
- **Sources des durées**, citées dans le Traitement 7 : délibération CNIL n° 2021-131 du 23 septembre 2021, référentiel « gestion des activités commerciales » (« trois ans à compter de leur collecte par le responsable de traitement ou du dernier contact émanant du prospect ») ; page CNIL « Comment utiliser une liste repoussoir » (« au minimum 3 ans »), consultée le 2026-09-26. Aucune durée CNIL n'existe pour un réseau professionnel hors prospection, la durée de la relation est un choix du propriétaire documenté ici
- **Politique publique** : la finalité s'ajoute en troisième puce de la section « 2. Finalités et bases légales » du markdown `confidentialite-intro.md`, au format des deux puces existantes, et porte elle-même ses durées, ses sources, l'intérêt légitime poursuivi, le moyen de s'opposer et la possibilité de demander l'effacement complet de l'historique des échanges. Aucune ligne `DataProcessing` n'est créée ni modifiée (Décision ci-dessous)
- **Droits** : `PrivacyPolicy.rights.body` gagne une phrase sur le droit de s'opposer à la prospection à tout moment, sans justification (art. 21.2), en conservant les balises `<mail>` et `<cnil>` interprétées par `t.rich`
- **Cache** : le markdown est lu par `loadLegalContent` (`'use cache'`, `cacheLife("days")`, tag `legal-content`) et les messages sont embarqués au build : le changement devient visible au déploiement suivant, sans invalidation manuelle
- **Rules** : `.claude/rules/next-intl/translations.md` (parité des clés FR et EN, `t.rich`), `.claude/rules/nextjs/rendering-caching.md` (cache du contenu légal)

## Acceptance criteria

### Scénario 1 : finalité affichée en français
**GIVEN** le site déployé avec ce sub-project
**WHEN** un visiteur ouvre `/fr/confidentialite`
**THEN** la section « 2. Finalités et bases légales du traitement » compte trois puces, dont « Prospection et relations professionnelles »
**AND** cette puce nomme les données, les sources, l'intérêt légitime poursuivi, les durées (3 ans pour un prospect, durée de la relation pour le réseau), le moyen de s'y opposer et la possibilité de demander l'effacement complet de l'historique des échanges

### Scénario 2 : finalité affichée en anglais
**GIVEN** le site déployé avec ce sub-project
**WHEN** un visiteur ouvre `/en/confidentialite`
**THEN** la même finalité apparaît en anglais, avec les mêmes durées et le même moyen d'opposition

### Scénario 3 : droit d'opposition à la prospection
**GIVEN** la section « Vos droits » de la politique, en français comme en anglais
**WHEN** un visiteur la lit
**THEN** elle mentionne le droit de s'opposer à tout moment, sans justification, à la prospection
**AND** le lien email et le lien CNIL fonctionnent comme avant

### Scénario 4 : date de mise à jour
**GIVEN** la politique modifiée
**WHEN** un visiteur ouvre la page dans l'une ou l'autre langue
**THEN** le sous-titre porte la date de livraison de ce sub-project

### Scénario 5 : registre complet
**GIVEN** `docs/registre-traitements.md`
**WHEN** on lit le Traitement 7
**THEN** il renseigne finalité, base légale, les catégories de personnes (leads, contacts et l'entreprise individuelle d'un prospect ou d'un client), données, sources, destinataire, sous-traitants, transferts hors UE (aucun), conservation par catégorie avec ses sources CNIL, information des personnes avec la phrase type FR et EN, stockage, sécurité et l'AIPD

### Scénario 6 : prérequis levé dans l'architecture
**GIVEN** `docs/ARCHITECTURE.md` § Protection Données
**WHEN** on lit la ligne sur les données personnelles de tiers
**THEN** elle renvoie au Traitement 7 du registre et à la politique de confidentialité, sans plus présenter ces mises à jour comme restant à faire

### Scénario 7 : procédure des demandes RGPD documentée
**GIVEN** `docs/PRODUCTION.md`
**WHEN** on lit sa rubrique « Demandes RGPD »
**THEN** elle décrit la procédure d'accès, de rectification, d'opposition et d'effacement des échanges (à tout moment après le stop) via l'écran, la date de chacune tracée sur la personne, le journal des demandes tenu hors du dépôt et l'étape de rejeu des oppositions, effacements et rectifications après une restauration de sauvegarde

## Edge cases

- **Adresse générique** (`contact@`, `info@`) : pas une donnée personnelle selon la CNIL, hors du traitement, aucune mention à ajouter
- **Prospect qui répond après deux ans** : sa réponse est un contact émanant de lui, les 3 ans repartent de cette date
- **Personne du réseau qui devient prospect**, ou l'inverse : une seule personne, rangée dans la catégorie de son usage du moment, la durée suit la catégorie

## Architectural decisions

### Décision : un traitement ou deux

**Options envisagées :**
- **A. Un traitement « relations professionnelles »** à deux catégories de personnes : une seule fiche, une seule puce publique, des durées par catégorie
- **B. Deux traitements** (prospection, réseau) : finalités séparées, mais deux fiches et deux puces pour des données, sources et sous-traitants identiques

**Choix : A**

**Rationale :**
- Choix du propriétaire, qui voulait simplifier
- Le registre admet une durée par catégorie de personnes ; seule la durée distingue les deux publics
- Le référentiel CNIL de gestion commerciale traite déjà clients et prospects dans un même traitement

### Décision : où publier la durée et les sous-traitants

**Options envisagées :**
- **A. Dans la puce markdown** de la finalité : texte seul, aucune donnée à migrer
- **B. Dans les tables lues en base** (`DataProcessing`) : la ligne `ionos-hosting` déclare aujourd'hui `IP_ADDRESS` et `TECHNICAL_LOGS` ; y ajouter les catégories du CRM demande une migration de données en production, faute d'écran d'administration des traitements

**Choix : A**

**Rationale :**
- Aucun nouveau sous-traitant : IONOS et Cloudflare servent déjà le site, la puce dit où les données sont hébergées
- La table « Durées de conservation » est indexée par sous-traitant, pas par finalité : une durée par catégorie de personne n'y trouve pas sa place
- Pas de migration de données pour un texte

### Décision : phrase type du premier message

**Options envisagées :**
- **A. Une phrase courte** avec le lien vers la politique et le droit de dire stop, séparé du reste
- **B. Le détail complet de l'article 14** dans chaque message

**Choix : A**

**Rationale :**
- L'article 14.3.b autorise l'information au plus tard à la première communication, l'article 21.4 exige que le droit d'opposition y soit présenté clairement et séparément : le lien renvoie au détail, la phrase isole l'opposition
- Texte retenu, consigné au Traitement 7 :
  - FR : « Je vous contacte à titre professionnel. Vos coordonnées sont traitées selon ma politique de confidentialité : https://thibaud-geisler.com/fr/confidentialite. Vous pouvez vous y opposer à tout moment : un simple « stop » en réponse suffit. »
  - EN : « I am contacting you in a professional capacity. Your contact details are processed under my privacy policy: https://thibaud-geisler.com/en/confidentialite. You can object at any time: simply reply "stop". »
