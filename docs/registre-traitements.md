---
title: "Registre des traitements"
description: "Registre des activités de traitement de données personnelles (RGPD art. 30)."
date: "2026-10-03"
keywords: ["rgpd", "registre des traitements", "données personnelles", "cnil", "conformité"]
scope: ["docs", "legal"]
---

# Registre des traitements

> Document interne, non publié. Tenu au titre du RGPD art. 30, présenté à la CNIL sur demande lors d'un contrôle.

## Responsable de traitement

| Champ | Valeur |
|---|---|
| Identité | Thibaud Geisler |
| SIRET | 880 419 122 00036 |
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
| Sécurité | HTTPS/TLS, validation Zod, rate limiting (5 / 10 min par IP), SMTP chiffré |

## Traitement 2 : logs serveur

| Champ | Détail |
|---|---|
| Finalité | Sécurité, détection d'abus, débogage |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Visiteurs du site |
| Données | Empreinte hachée de l'IP (SHA-256 salé, jamais en clair), événements techniques |
| Destinataire | Thibaud Geisler |
| Sous-traitant | IONOS (hébergeur du VPS) |
| Transferts hors UE | Aucun |
| Conservation | 180 jours maximum |
| Sécurité | IP pseudonymisée, aucun secret journalisé. Ni le contenu des messages ni l'identité de leur auteur, hors message d'erreur d'un rejet SMTP |

## Traitement 3 : prise de rendez-vous (Calendly)

| Champ | Détail |
|---|---|
| Finalité | Réservation d'un créneau via le widget Calendly |
| Base légale | Consentement (art. 6.1.a) |
| Personnes concernées | Visiteurs réservant un créneau |
| Données | Nom, email, informations saisies dans Calendly |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Calendly LLC |
| Transferts hors UE | États-Unis (EU-US Data Privacy Framework) |
| Conservation | Gérée par Calendly |
| Sécurité | Widget chargé après consentement (CMP c15t), HTTPS |

## Traitement 4 : erreurs applicatives (Sentry)

| Champ | Détail |
|---|---|
| Finalité | Diagnostic et correction des erreurs applicatives |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Visiteurs du site déclenchant une erreur applicative |
| Données | Stack trace et contexte technique de l'erreur (requête, composant). `email` et `ip_address` de `event.user` retirés avant envoi, et toute adresse email détectée dans un message d'exception (ex: rejet SMTP) est masquée. Le filtrage couvre les **deux** canaux alimentés par l'intégration Pino : les issues (`beforeSend`) et les logs (`beforeSendLog`), ce dernier masquant aussi les emails imbriqués dans l'objet `err` sérialisé (`src/lib/sentry-scrub.ts`) |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Sentry (Functional Software, Inc.) |
| Transferts hors UE | Aucun : organisation `tg-ws` en région européenne, ingestion `de.sentry.io` (Francfort) |
| Conservation | 30 jours (plan Developer), géré par Sentry |
| Sécurité | Filtrage `email` et `ip_address` avant envoi sur les deux canaux (`beforeSend` pour les issues, `beforeSendLog` pour les logs), HTTPS/TLS. Détail technique : [knowledges/sentry.md](knowledges/sentry.md#données-personnelles-et-rgpd) |

## Traitement 5 : hébergement des assets du site (Cloudflare R2)

| Champ | Détail |
|---|---|
| Finalité | Stockage et diffusion des assets publics du site (CV, portrait, visuels de projets) via la route `/api/assets/[...path]` |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Thibaud Geisler (CV, portrait) |
| Données | CV PDF, photo de portrait, visuels de projets et de marque |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Cloudflare, Inc. (bucket `portfolio-assets`) |
| Transferts hors UE | Aucun : bucket en juridiction `eu` |
| Conservation | Durée de vie du site, fichier remplacé à chaque mise à jour |
| Sécurité | Bucket privé, aucun domaine public configuré, accès exclusif via la route API avec token scopé, HTTPS/TLS |

## Traitement 6 : authentification de l'administrateur (Better Auth)

| Champ | Détail |
|---|---|
| Finalité | Contrôle d'accès à l'espace d'administration |
| Base légale | Intérêt légitime (art. 6.1.f), le responsable de traitement étant aussi l'unique personne concernée |
| Personnes concernées | Thibaud Geisler, seul compte Google autorisé par la whitelist |
| Données | Email, nom et URL de la photo de profil renvoyés par Google (`auth.user`), plus les lignes techniques de session (dont le user-agent du navigateur) et de compte OAuth (`auth.session`, `auth.account`) |
| Destinataire | Thibaud Geisler |
| Sous-traitant | IONOS (hébergeur du VPS). Google agit en responsable de traitement indépendant pour les données du compte Google ([Controller-Controller Data Protection Terms](https://business.safety.google/controllerterms/)) |
| Transferts hors UE | Aucun : données conservées sur le VPS IONOS |
| Conservation | Durée de vie du compte, les sessions expirent d'elles-mêmes |
| Sécurité | Google comme unique provider, aucun mot de passe stocké. Whitelist par email via le hook `databaseHooks.user.create.before`, tout autre compte rejeté avant création. Aucune adresse IP conservée : lue en mémoire pour le rate limiting de Better Auth, retirée de la session avant écriture (`databaseHooks.session.create.before`), aligné sur la politique déjà appliquée au formulaire de contact (Traitement 1) |

## Traitement 7 : relations professionnelles (prospection et réseau)

| Champ | Détail |
|---|---|
| Finalité | Prospection commerciale des services du freelance et suivi de son réseau professionnel, depuis l'espace admin |
| Base légale | Intérêt légitime (art. 6.1.f) : développer l'activité en proposant ses services à des professionnels, la sollicitation restant en rapport avec leur profession ([CNIL, prospection par courrier électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel)) |
| Personnes concernées | Leads : prospects et auteurs de demandes entrantes. Contacts : réseau professionnel (anciens collègues, clients, partenaires). Entité légale d'un prospect ou d'un client individuel : nom et adresse de l'entreprise ; la personne physique derrière cette entité a les mêmes droits qu'un lead |
| Données | Identité, poste, entreprise, coordonnées professionnelles (email, téléphone), profil LinkedIn, notes d'échange, historique des actions de prospection et des entretiens |
| Sources | Profils professionnels publics (LinkedIn, site de l'entreprise), candidatures et plateformes de mission, recommandations, événements professionnels, échanges directs |
| Destinataire | Thibaud Geisler |
| Sous-traitants | IONOS (hébergeur du VPS et de la base), Cloudflare (bucket `portfolio-backups` des sauvegardes de la base, juridiction `eu`) |
| Transferts hors UE | Aucun |
| Conservation | Prospect : 3 ans à compter de la collecte ou du dernier contact émanant de lui, puis relance pour savoir s'il souhaite rester, suppression sans réponse positive ([délibération CNIL n° 2021-131 du 23 septembre 2021](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045538574)). Personne qui s'est opposée : email et profil LinkedIn seuls, conservés 3 ans, durée minimale recommandée par la CNIL, pour la seule gestion de l'opposition ([CNIL, liste repoussoir](https://www.cnil.fr/fr/comment-utiliser-une-liste-repoussoir-pour-respecter-lopposition-la-prospection-commerciale), consultée le 2026-09-26). Réseau : durée de la relation, suppression à la demande de la personne ; aucune durée CNIL n'existe hors prospection, choix du responsable |
| Information des personnes | Au plus tard au premier message (art. 14.3.b), en couches : le message, signé et motivé, nomme ou rend évidente la source (profil ou publication consultés) et se termine par une invitation claire à dire non, présentée séparément du reste (art. 21.4), en langage courant ; le lien vers la [politique de confidentialité](https://thibaud-geisler.com/fr/confidentialite) figure dans la section Infos du profil LinkedIn et dans la signature email, la politique portant le détail (source, durées, droits). Personne jamais contactée : exception d'effort disproportionné (art. 14.5.b), l'information étant rendue publique par la politique |
| Stockage | Base PostgreSQL, schema `freelance`, joignable du seul réseau Docker interne |
| Sécurité | Espace admin single-user derrière Google OAuth et whitelist (Traitement 6), HTTPS/TLS |
| Analyse d'intérêt légitime | Tenue en interne (mise en balance des intérêts), revue à chaque nouvelle source, nouveau canal ou changement d'outil |
| AIPD | Non nécessaire à cette échelle : aucune donnée sensible, aucune décision automatisée à effet juridique. À réévaluer si les agents internes se mettent à noter les personnes |

## Notes

- Mettre à jour à chaque nouveau traitement (espace admin, chatbot, analytics).
- Les 180 jours des logs sont tenus par un `logrotate` sur le VPS, hors du dépôt : à revérifier après toute réinstallation du serveur. Mécanisme : [PRODUCTION.md](PRODUCTION.md) § Rétention.
