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

## Notes

- Mettre à jour à chaque nouveau traitement (espace admin, chatbot, analytics).
- Les 180 jours des logs sont tenus par un `logrotate` sur le VPS, hors du dépôt : à revérifier après toute réinstallation du serveur. Mécanisme : [PRODUCTION.md](PRODUCTION.md) § Rétention.
