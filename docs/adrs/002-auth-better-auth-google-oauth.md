---
title: "ADR-002 — Authentification Better Auth + Google OAuth"
status: "accepted"
description: "Décision actée : Better Auth avec Google OAuth comme unique provider, whitelist email single-user"
date: "2026-04-09"
keywords: ["architecture", "adr", "auth", "better-auth", "oauth", "google"]
scope: ["docs", "architecture"]
technologies: ["Better Auth", "Next.js", "Google OAuth"]
---

# 🎯 Contexte

Le dashboard admin est un espace privé single-user. Le site est self-hosted sur un VPS. L'utilisateur est Thibaud Geisler, qui dispose d'un compte Google professionnel (Gmail pro) avec 2FA activée, un seul compte autorisé, jamais de multi-utilisateur prévu.

Contexte écosystème (avril 2026) : Auth.js (ex-NextAuth.js) est désormais maintenu par l'équipe Better Auth en mode security-only. La v5 de NextAuth est restée en beta indéfiniment. Better Auth est devenu la solution d'authentification de référence pour Next.js App Router.

---

# 🧩 Problème

Quel mécanisme d'authentification mettre en place pour protéger le dashboard admin, en minimisant la surface d'attaque tout en garantissant la sécurité d'un compte unique ?

---

# 🛠️ Options Envisagées

## Option A : Better Auth + Google OAuth uniquement

**Description :** Better Auth avec Google comme unique provider social. Whitelist email via un hook `databaseHooks.user.create.before` qui rejette toute création de compte dont l'email ne correspond pas au Gmail pro autorisé. Aucun provider Credentials activé.

**Avantages :**
- Brute force éliminé : aucun endpoint de login direct à attaquer, l'authentification est déléguée à Google
- Aucun credential stocké en BDD : une fuite de la base expose au pire un `accountId` Google inutilisable seul
- 2FA héritée du compte Google, protection renforcée sans effort supplémentaire
- Phishing réduit : un attaquant devrait reproduire une fausse page Google crédible ET contourner le redirect URI whitelist de la Google Cloud Console
- Better Auth : version stable 1.6+, TypeScript natif, adaptateur Prisma first-class, écosystème actif en 2026
- Setup simple pour un cas single-user

**Inconvénients :**
- Dépendance à Google pour la connexion : si Google est inaccessible ou le compte suspendu, accès admin bloqué (acceptable pour un outil personnel)
- Nécessite de configurer un projet dans la Google Cloud Console (OAuth client ID + secret)

**Coût estimé :** Faible, quelques heures d'intégration et configuration Google Cloud

## Option B : Better Auth Credentials (email/mot de passe)

**Description :** Better Auth avec le provider `emailAndPassword`, credentials stockés en variable d'environnement ou en BDD (hash bcrypt/scrypt).

**Avantages :**
- Aucune dépendance externe : fonctionne hors ligne, pas de compte tiers
- Contrôle total sur le flow d'authentification

**Inconvénients :**
- Surface d'attaque brute force : endpoint de login exposé, nécessite rate limiting strict
- Hash du mot de passe stocké localement : une fuite de la BDD ou des variables d'environnement expose un vecteur d'attaque par dictionnaire
- Pas de 2FA native sans configuration supplémentaire (plugin Better Auth requis)
- Responsabilité de la gestion/rotation du mot de passe côté utilisateur

**Coût estimé :** Faible, équivalent à l'Option A

## Option C : Magic link (email token)

**Description :** Better Auth avec un provider d'email OTP/magic link, un lien de connexion envoyé à chaque tentative via SMTP IONOS.

**Avantages :**
- Pas de mot de passe à gérer
- Sécurité conditionnée à l'accès à la boîte mail

**Inconvénients :**
- Dépendance directe à IONOS SMTP pour se connecter : si l'email est indisponible, accès admin bloqué
- Latence à chaque connexion (attente de l'email)
- Surface d'attaque sur le SMTP et sur la boîte mail (moins protégée qu'un compte Google avec 2FA avancée)

**Coût estimé :** Moyen, dépendance SMTP non négligeable

---

# 🎉 Décision

**Option A actée : Better Auth + Google OAuth uniquement.**

Pour un dashboard single-user protégeant un compte admin unique, déléguer l'authentification à Google est objectivement plus sécurisé qu'une implémentation locale : brute force éliminé, aucun credential stocké localement, 2FA Google héritée. Better Auth est la librairie de référence en 2026 (Auth.js v5 est en beta indéfinie et maintenu en mode security-only par la même équipe).

Aucun provider Credentials n'est activé en fallback : garder un second provider reviendrait à conserver la surface d'attaque que l'on cherche à éliminer. En cas de perte d'accès au compte Google, un accès manuel via SSH Dokploy + requête SQL directe reste possible en dernier recours.

---

# 🔄 Conséquences

## Positives

- Surface d'attaque minimale : pas d'endpoint de login local, pas de credential stocké
- 2FA héritée du compte Google, protection renforcée sans code supplémentaire
- DX TypeScript excellente avec Better Auth (inférence complète, adaptateur Prisma natif)
- Whitelist email single-user garantie par hook de création de compte
- Écosystème de plugins Better Auth disponible si besoins futurs (sessions avancées, audit, etc.)

## Négatives

- Dépendance à Google pour la connexion admin (risque acceptable pour un outil personnel)
- Configuration initiale supplémentaire : créer un projet Google Cloud Console, activer l'API OAuth, gérer les redirect URIs par environnement
- Variables d'environnement supplémentaires à gérer dans Dokploy (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`, `ADMIN_EMAIL`)

---

# 📝 Notes complémentaires

Cette décision s'applique uniquement au dashboard admin (post-MVP). Les pages publiques restent sans authentification.

**Whitelist email single-user :** implémentée via le hook `databaseHooks.user.create.before` de Better Auth. Toute tentative de création de compte dont l'email diffère de celui stocké dans `ADMIN_EMAIL` est rejetée. Cela garantit qu'un seul compte peut exister dans la base, même si un autre utilisateur tente de s'authentifier via le flow Google OAuth.

**Tables BDD créées par Better Auth :** `user`, `session`, `account`, `verification`. Générées automatiquement via la CLI Better Auth (`npx @better-auth/cli generate`). Cohabitent avec les tables applicatives (`Project`, `Asset`) dans la même base PostgreSQL.

**Historique de la décision :** la version précédente de cet ADR (datée 2026-03-31) avait acté NextAuth.js Credentials provider. Révision en avril 2026 pour deux raisons : (1) changement d'écosystème, Auth.js passé sous maintenance Better Auth, (2) analyse de sécurité, OAuth Google objectivement plus sûr qu'un hash bcrypt local pour un compte admin unique. Better Auth + Google OAuth remplace NextAuth.js Credentials comme choix retenu.
