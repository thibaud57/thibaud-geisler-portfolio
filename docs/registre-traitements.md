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
| Conservation | À définir |
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
| Conservation | 12 mois maximum |
| Sécurité | IP pseudonymisée, aucun secret ni contenu de message journalisé |

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

## Notes

- Mettre à jour à chaque nouveau traitement (dashboard, chatbot, analytics).
- Durées « À définir » à fixer par le responsable de traitement.
