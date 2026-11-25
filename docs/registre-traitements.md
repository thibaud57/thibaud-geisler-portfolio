---
title: "Registre des traitements"
description: "Registre des activités de traitement de données personnelles (RGPD art. 30)."
date: "2026-11-25"
keywords: ["rgpd", "registre des traitements", "données personnelles", "cnil", "conformité"]
scope: ["docs", "legal"]
---

# Registre des traitements

> Document interne. Tenu au titre du RGPD art. 30, présenté à la CNIL sur demande lors d'un contrôle.

## Responsable de traitement

| Champ | Valeur |
|---|---|
| Identité | Thibaud Geisler |
| SIRET | <SIRET> |
| Contact | contact@thibaud-geisler.com |
| Coordonnées complètes | voir les [mentions légales](https://thibaud-geisler.com/fr/mentions-legales) |
| Délégué à la protection des données | Non désigné (non obligatoire) |

## Traitement 1 : demandes de contact

| Champ | Détail |
|---|---|
| Finalité | Répondre aux demandes envoyées via le formulaire de contact |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Visiteurs utilisant le formulaire de contact |
| Données | Nom, email, entreprise (optionnel), sujet, message |
| Destinataire | Thibaud Geisler |
| Sous-traitant | IONOS (acheminement email SMTP) |
| Transferts hors UE | Aucun |
| Conservation | Boîte du destinataire, sans purge automatisée. Aucune copie côté site |
| Stockage | Aucune persistance en base, données acheminées par email |
| Sécurité | HTTPS/TLS, validation des champs du formulaire côté serveur, limitation à 5 soumissions par adresse IP sur 10 minutes, SMTP chiffré |

## Traitement 2 : logs serveur

| Champ | Détail |
|---|---|
| Finalité | Sécurité, détection d'abus, débogage |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Visiteurs du site |
| Données | Empreinte de l'IP (SHA-256 salé et tronqué, jamais en clair), événements techniques |
| Destinataire | Thibaud Geisler |
| Sous-traitant | IONOS (hébergeur du VPS) |
| Transferts hors UE | Aucun |
| Conservation | 180 jours maximum, tenus par un `logrotate` du VPS |
| Sécurité | IP pseudonymisée, aucun secret journalisé. Ni le contenu des messages de contact ni l'identité de leur auteur ne sont journalisés, hors message d'erreur d'un rejet SMTP |

## Traitement 3 : prise de rendez-vous (Calendly)

| Champ | Détail |
|---|---|
| Finalité | Réservation d'un créneau via le widget Calendly |
| Base légale | Consentement (art. 6.1.a) |
| Personnes concernées | Visiteurs réservant un créneau |
| Données | Nom, email, informations saisies dans Calendly, adresse IP et données techniques de connexion collectées par Calendly au chargement du widget |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Calendly LLC |
| Transferts hors UE | États-Unis (EU-US Data Privacy Framework) |
| Conservation | Fixée par Calendly, sans durée chiffrée : tant que nécessaire au service et aux obligations légales, suppression à la demande du compte ou à sa fermeture ([Privacy Notice](https://calendly.com/legal/privacy-notice), [DPA](https://calendly.com/legal/data-processing-addendum)). Un rendez-vous et ses données se suppriment depuis le compte ([procédure](https://calendly.com/help/how-to-delete-personal-data-in-calendly)) |
| Sécurité | Widget chargé après consentement (CMP c15t), HTTPS |

## Traitement 4 : erreurs applicatives (Sentry)

| Champ | Détail |
|---|---|
| Finalité | Diagnostic et correction des erreurs applicatives |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Visiteurs du site déclenchant une erreur applicative |
| Données | Trace technique de l'erreur : message, pile d'appels, URL et méthode de la requête ; journaux d'avertissement et d'erreur du serveur (empreinte d'IP comprise) ; traces de performance des requêtes. Identité, adresse IP, cookies, en-têtes et contenu des requêtes sont exclus, et une adresse email citée dans un message d'erreur est masquée avant envoi. Sentry déduit de l'adresse IP de connexion une localisation approximative (pays, ville) sans conserver l'adresse : pour une erreur survenue dans le navigateur, c'est celle du visiteur |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Sentry (Functional Software, Inc.) |
| Transferts hors UE | Événements stockés en région européenne (organisation `<org>`, ingestion `de.sentry.io`, Francfort). Functional Software, Inc. étant établie aux États-Unis, un accès depuis les États-Unis reste possible, encadré par l'EU-US Data Privacy Framework (puis clauses contractuelles types) selon le [DPA Sentry](https://sentry.io/legal/dpa/) |
| Conservation | 30 jours (plan Developer), géré par Sentry |
| Sécurité | Collecte restreinte à la source par la configuration du SDK, masquage des emails avant envoi (erreurs et logs), stockage des adresses IP désactivé côté Sentry, HTTPS/TLS |

## Traitement 5 : hébergement des assets du site (Cloudflare R2)

| Champ | Détail |
|---|---|
| Finalité | Stockage et diffusion des assets publics du site (CV, portrait, visuels de projets) |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Thibaud Geisler (CV, portrait) |
| Données | CV PDF, photo de portrait, visuels de projets et de marque |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Cloudflare, Inc. (bucket `portfolio-assets`) |
| Transferts hors UE | Stockage dans l'UE : bucket en juridiction `eu` |
| Conservation | Durée de vie du site, fichier remplacé à chaque mise à jour |
| Sécurité | Bucket privé sans adresse publique, servi par le seul site avec une clé d'accès limitée à ce bucket, HTTPS/TLS |

## Traitement 6 : authentification de l'administrateur (Better Auth)

| Champ | Détail |
|---|---|
| Finalité | Contrôle d'accès à l'espace d'administration et au serveur MCP par lequel les agents agissent sur l'app |
| Base légale | Intérêt légitime (art. 6.1.f), le responsable de traitement étant aussi l'unique personne concernée |
| Personnes concernées | Thibaud Geisler, seul compte Google autorisé par la whitelist |
| Données | Email, nom et photo de profil renvoyés par Google, données techniques de session (dont le user-agent du navigateur), jetons OAuth du compte Google. Clés d'API des agents : nom, préfixe, empreinte, domaines autorisés, dernière utilisation |
| Destinataire | Thibaud Geisler |
| Sous-traitants | IONOS (hébergeur du VPS), Cloudflare (bucket `portfolio-backups` des sauvegardes de la base, juridiction `eu`). Google Ireland Limited reste responsable du traitement des données du compte Google ([règles de confidentialité](https://policies.google.com/privacy)) |
| Transferts hors UE | Aucun : données conservées sur le VPS IONOS, sauvegardes en juridiction `eu` |
| Conservation | Durée de vie du compte, les sessions expirent d'elles-mêmes |
| Sécurité | Connexion par Google uniquement, aucun mot de passe stocké. Seul l'email autorisé peut créer un compte, tout autre est rejeté avant création. Aucune adresse IP conservée : lue en mémoire pour limiter les tentatives, retirée avant l'écriture de la session, comme pour le formulaire de contact (Traitement 1). Agents : une clé d'API par usage, stockée hachée, limitée à ses domaines et révocable depuis l'espace admin |

## Traitement 7 : relations professionnelles (prospection et réseau)

| Champ | Détail |
|---|---|
| Finalité | Prospection commerciale des services du freelance et suivi de son réseau professionnel, depuis l'espace admin |
| Base légale | Intérêt légitime (art. 6.1.f) : développer l'activité en proposant ses services à des professionnels, la sollicitation restant en rapport avec leur profession ([CNIL, prospection par courrier électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel)) |
| Personnes concernées | Leads : prospects et auteurs de demandes entrantes. Contacts : réseau professionnel (anciens collègues, clients, partenaires). Entité légale d'un prospect ou d'un client individuel : nom, identifiants légaux (SIRET, TVA, RCS), adresse et téléphone de l'entreprise ; la personne physique derrière cette entité a les mêmes droits qu'un lead |
| Données | Identité, poste, entreprise, zone géographique, coordonnées professionnelles (email, téléphone), profil LinkedIn, date de rencontre, signaux d'activité professionnelle (publications, commentaires, présence en conférence, interactions directes), notes d'échange, score de qualification saisi à la main, historique des actions de prospection (message envoyé et réponse reçue) et des entretiens |
| Sources | Profils professionnels publics (LinkedIn, site de l'entreprise), candidatures et plateformes de mission (dont leurs alertes d'offres reçues dans la boîte Gmail du propriétaire et lues par le job de sourcing d'`agent-os`), recommandations, événements professionnels, échanges directs |
| Destinataires | Thibaud Geisler, directement ou par `agent-os`, son service d'agents hébergé sur le VPS du site, qui exécute les jobs et l'assistant de l'espace admin en sessions Claude Code. Responsables de traitement distincts : Anthropic Ireland, Limited (assistant IA Claude), quand le propriétaire consulte ou met à jour les fiches par l'assistant ou qu'une session d'`agent-os` les traite, y compris lors des reprises de données depuis Notion (chargement du 2026-10-14, puis instantané de la bascule) ; Telegram Messenger Inc. (bot qui relaie au propriétaire les questions, accords et alertes des sessions), quand l'un d'eux porte une donnée de lead ([politique de confidentialité](https://telegram.org/privacy)) |
| Sous-traitants | IONOS (hébergeur du VPS et de la base), Cloudflare (bucket `portfolio-backups` des sauvegardes de la base, juridiction `eu`). Pour les sessions d'`agent-os` : OpenRouter, Inc. (criblage des résultats web, [DPA](https://openrouter.ai/data-processing-agreement)), qui appelle le modèle Jev de TypeSafe AI, Inc. ; Jina AI GmbH, groupe Elastic (recherche et lecture de pages web des jobs et de l'assistant, DPA Elastic selon ses [conditions](https://jina.ai/legal)) ; Bright Data Ltd. (pages web des mêmes sessions, [DPA](https://brightdata.com/static/web/Bright-Data-Data-Protection-Agreement.pdf)), que ses [conditions](https://brightdata.com/license) autorisent aussi à conserver et réutiliser pour ses propres fins les données collectées par son navigateur de scraping |
| Transferts hors UE | Aucun depuis le site. Anthropic, établi en Irlande, transfère vers les États-Unis et d'autres pays hors EEE, sur décision d'adéquation ou clauses contractuelles types, selon sa [politique de confidentialité](https://www.anthropic.com/legal/privacy). Telegram : données d'un compte inscrit depuis l'EEE stockées aux Pays-Bas, partageables avec les sociétés de son groupe (îles Vierges britanniques, Dubaï) sous clauses contractuelles types. OpenRouter : États-Unis, clauses contractuelles types (module 2) ; TypeSafe : États-Unis, Jev étant absent du routage européen d'OpenRouter. Jina : États-Unis, Belgique et Singapour (recherche), proxy de lecture au lieu non publié, EU-US Data Privacy Framework et clauses contractuelles types. Bright Data : Israël (décision d'adéquation de la Commission européenne), mécanisme de transfert approuvé, dont les clauses contractuelles types, vers les autres pays. Conditions des fournisseurs d'`agent-os` relevées le 2026-11-25 |
| Conservation | Prospect : 3 ans à compter de la collecte ou du dernier contact émanant de lui (réponse, call ou entretien qu'il a tenu), puis relance pour savoir s'il souhaite rester, suppression sans réponse positive ([délibération CNIL n° 2021-131 du 23 septembre 2021](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045538574)). Personne qui s'est opposée : son identité se réduit à l'email et au profil LinkedIn, son rôle de prospect (statut, intérêt, canal, score) et sa place d'apporteur d'une opportunité restant, conservés 3 ans, durée minimale recommandée par la CNIL, pour la seule gestion de l'opposition ([CNIL, liste repoussoir](https://www.cnil.fr/fr/comment-utiliser-une-liste-repoussoir-pour-respecter-lopposition-la-prospection-commerciale), consultée le 2026-09-26). Ses signaux d'activité sont supprimés dès l'opposition, leur seule finalité étant la prospection. L'historique de ses échanges (actions de prospection) est conservé sans être réutilisé jusqu'au terme de sa durée de conservation, et supprimé dès qu'elle en demande l'effacement : l'opposition (art. 21) n'emporte pas l'effacement (art. 17), qui reste une demande distincte. Réseau : durée de la relation, suppression à la demande de la personne ; aucune durée CNIL n'existe hors prospection, choix du responsable. Chez Anthropic : selon ses conditions. Sessions d'`agent-os` : transcripts 30 jours, résultats d'outils mis en cache compris (durée par défaut de Claude Code, `cleanupPeriodDays`) ; texte des sessions en base (runs et événements de run) 30 jours. Une donnée supprimée de la base subsiste jusqu'à 30 jours dans ses sauvegardes quotidiennes. Chez les fournisseurs des sessions : Telegram garde l'historique du chat jusqu'à sa suppression ou 18 mois d'inactivité du compte ; OpenRouter ne stocke ni entrées ni sorties, hors obligation légale ou détection d'abus, la clé d'`agent-os` ayant la journalisation désactivée et n'étant routée que vers des fournisseurs sans conservation, dont le point d'accès ZDR de TypeSafe (réglages relevés le 2026-11-25) ; Jina les garde le temps nécessaire au service, sans durée chiffrée ; Bright Data, cf. Sous-traitants |
| Information des personnes | Au plus tard au premier message (art. 14.3.b), en couches : le message, signé et motivé, nomme ou rend évidente la source (profil ou publication consultés) et se termine par une invitation claire à dire non, présentée séparément du reste (art. 21.4), en langage courant ; le lien vers la [politique de confidentialité](https://thibaud-geisler.com/fr/confidentialite) figure dans la section Infos du profil LinkedIn et dans la signature email, la politique portant le détail (source, durées, droits). Le recours à l'assistant et son destinataire figurent dans la politique (puce « Prospection » et tableau des destinataires). Personne jamais contactée : exception d'effort disproportionné (art. 14.5.b), l'information étant rendue publique par la politique |
| Stockage | Base PostgreSQL, schemas `freelance` (CRM) et `public` (entités légales et adresses), joignable du seul réseau Docker interne. Sessions d'`agent-os` : schema `dev` de la même base, volume des transcripts sur le VPS, exclu des sauvegardes |
| Sécurité | Espace admin single-user derrière Google OAuth et whitelist, accès des agents par clé d'API limitée au domaine `crm` (Traitement 6), HTTPS/TLS. Sessions d'`agent-os` : résultats web criblés contre l'injection de prompt, personnes en opposition masquées aux agents par les outils de l'app |
| Analyse d'intérêt légitime | Tenue en interne (mise en balance des intérêts), revue à chaque nouvelle source, nouveau canal ou changement d'outil |
| AIPD | Non nécessaire à cette échelle : aucune donnée sensible, aucune décision automatisée n'évalue les personnes, l'assistant ne calcule pas de score. À réévaluer avec les agents internes (Feature 4) : sourcing, enrichissement et qualification par agent |