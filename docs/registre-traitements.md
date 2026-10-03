---
title: "Registre des traitements"
description: "Registre des activités de traitement de données personnelles (RGPD art. 30)."
date: "2026-05-19"
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
| Sécurité | HTTPS/TLS, validation des champs du formulaire côté serveur, limitation à 5 envois par adresse IP sur 10 minutes, SMTP chiffré |

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
| Conservation | Fixée par Calendly, sans durée chiffrée : tant que nécessaire au service et aux obligations légales, suppression à la demande du compte ou à sa fermeture ([Privacy Notice](https://calendly.com/legal/privacy-notice), [DPA](https://calendly.com/legal/data-processing-addendum)). Un rendez-vous et ses données se suppriment depuis le compte ([procédure](https://help.calendly.com/hc/en-us/articles/4412601189911-Deleting-personal-data-in-Calendly)) |
| Sécurité | Widget chargé après consentement (CMP c15t), HTTPS |

## Traitement 4 : erreurs applicatives (Sentry)

| Champ | Détail |
|---|---|
| Finalité | Diagnostic et correction des erreurs applicatives |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Visiteurs du site déclenchant une erreur applicative |
| Données | Trace technique de l'erreur : message, pile d'appels, URL et méthode de la requête. Identité, adresse IP, cookies, en-têtes et contenu des requêtes sont exclus, et une adresse email citée dans un message d'erreur est masquée avant envoi. Sentry déduit de l'adresse IP de connexion une localisation approximative (pays, ville) sans conserver l'adresse : pour une erreur survenue dans le navigateur, c'est celle du visiteur |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Sentry (Functional Software, Inc.) |
| Transferts hors UE | Aucun : organisation `tg-ws` en région européenne, ingestion `de.sentry.io` (Francfort) |
| Conservation | 30 jours (plan Developer), géré par Sentry |
| Sécurité | Collecte restreinte à la source par la configuration du SDK, masquage des emails avant envoi (erreurs et logs), stockage des adresses IP désactivé côté Sentry, HTTPS/TLS. Détail technique : [knowledges/sentry.md](knowledges/sentry.md#données-personnelles-et-rgpd) |

## Traitement 5 : hébergement des assets du site (Cloudflare R2)

| Champ | Détail |
|---|---|
| Finalité | Stockage et diffusion des assets publics du site (CV, portrait, visuels de projets) |
| Base légale | Intérêt légitime (art. 6.1.f) |
| Personnes concernées | Thibaud Geisler (CV, portrait) |
| Données | CV PDF, photo de portrait, visuels de projets et de marque |
| Destinataire | Thibaud Geisler |
| Sous-traitant | Cloudflare, Inc. (bucket `portfolio-assets`) |
| Transferts hors UE | Aucun : bucket en juridiction `eu` |
| Conservation | Durée de vie du site, fichier remplacé à chaque mise à jour |
| Sécurité | Bucket privé sans adresse publique, servi par le seul site avec une clé d'accès limitée à ce bucket, HTTPS/TLS |

## Traitement 6 : authentification de l'administrateur (Better Auth)

| Champ | Détail |
|---|---|
| Finalité | Contrôle d'accès à l'espace d'administration |
| Base légale | Intérêt légitime (art. 6.1.f), le responsable de traitement étant aussi l'unique personne concernée |
| Personnes concernées | Thibaud Geisler, seul compte Google autorisé par la whitelist |
| Données | Email, nom et photo de profil renvoyés par Google, données techniques de session (dont le navigateur utilisé) et liaison avec le compte Google |
| Destinataire | Thibaud Geisler |
| Sous-traitant | IONOS (hébergeur du VPS). Google agit en responsable de traitement indépendant pour les données du compte Google ([Controller-Controller Data Protection Terms](https://business.safety.google/controllerterms/)) |
| Transferts hors UE | Aucun : données conservées sur le VPS IONOS |
| Conservation | Durée de vie du compte, les sessions expirent d'elles-mêmes |
| Sécurité | Connexion par Google uniquement, aucun mot de passe stocké. Seul l'email autorisé peut créer un compte, tout autre est rejeté avant création. Aucune adresse IP conservée : lue en mémoire pour limiter les tentatives, retirée avant l'écriture de la session, comme pour le formulaire de contact (Traitement 1). Détail technique : [knowledges/better-auth.md](knowledges/better-auth.md) |

## Notes

- Mettre à jour à chaque nouveau traitement (espace admin, chatbot, analytics).
- Les 180 jours des logs sont tenus par un `logrotate` sur le VPS, hors du dépôt : à revérifier après toute réinstallation du serveur. Mécanisme : [PRODUCTION.md](PRODUCTION.md) § Rétention.
