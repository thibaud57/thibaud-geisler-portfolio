---
title: "Better Auth — Authentification Google OAuth single-user"
version: "1.7.5"
description: "Référence technique pour Better Auth : configuration, adaptateur Prisma sur schéma dédié, hooks de base, session en proxy et garde serveur."
date: "2026-09-24"
keywords: ["better-auth", "authentification", "oauth", "google", "session", "prisma"]
scope: ["docs"]
technologies: ["Next.js", "React", "Prisma", "PostgreSQL", "Zod"]
---

# Description

Better Auth est une bibliothèque d'authentification TypeScript qui s'auto-héberge : elle expose ses routes dans l'application et stocke ses données dans la base du projet, sans service tiers. Le portfolio l'emploie pour la seule surface qui en a besoin, l'espace admin, avec Google comme unique fournisseur et une whitelist d'un email. Il n'y a ni inscription, ni mot de passe, ni gestion multi-utilisateur (ADR-002).

Ses quatre tables vivent dans un schéma PostgreSQL dédié `auth`, séparé du contenu éditorial (ADR-018).

---

# Concepts Clés

## Configuration de l'instance

### Description

`betterAuth()` retourne l'instance unique qui porte la configuration, les routes et l'API serveur. Elle est construite une seule fois dans un module `server-only`, jamais atteignable depuis un Client Component : elle détient le secret de signature des sessions.

### Exemple

```ts
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
  },
  plugins: [nextCookies()],
})
```

### Points Importants

- `nextCookies()` se place **en dernier** dans `plugins` : il permet aux Server Actions de poser les cookies de session, ce qu'un React Server Component ne peut pas faire lui-même
- `baseURL` détermine l'URL de callback attendue par le fournisseur, `{baseURL}/api/auth/callback/google` : une valeur qui ne correspond pas à l'origine réelle fait échouer le retour OAuth sans message explicite
- `secret` signe les cookies de session : le changer invalide toutes les sessions en cours
- L'instance s'expose en HTTP par un seul route handler catch-all, `toNextJsHandler(auth)` sur `/api/auth/[...all]`

---

## Adaptateur Prisma sur un schéma dédié

### Description

`prismaAdapter` branche Better Auth sur le client Prisma du projet, donc sur la même connexion et le même pool que le reste de l'application. Le placement des tables dans un schéma PostgreSQL séparé relève de Prisma, pas de Better Auth.

### Exemple

```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["public", "freelance", "auth"]
}

model User {
  id    String @id
  email String @unique

  @@map("user")
  @@schema("auth")
}
```

### Points Importants

- `@@map` en minuscules est obligatoire : Better Auth interroge `user`, `session`, `account` et `verification`, quand Prisma nommerait les tables d'après ses modèles
- `@@schema("auth")` isole ces tables : un dump de données de développement peut alors exclure le schéma entier, les sessions et comptes OAuth n'ayant de sens que sur l'instance qui les a émis
- Les quatre modèles sont transcrits **à la main** depuis la documentation : `@better-auth/cli generate` réécrit tout `prisma/schema.prisma` sans jamais émettre `@@schema(...)` sur les modèles qu'il ajoute, ce qui les enverrait dans `public`
- `npx @better-auth/cli migrate` ne fonctionne que pour l'adaptateur Kysely intégré : avec Prisma, les migrations passent par `prisma migrate dev`
- `database.schemaName` (1.7.5) ne concerne que les connexions directes Kysely ou `pg`, il n'a aucun effet via l'adaptateur Prisma

---

## Hooks de base de données

### Description

`databaseHooks` intercepte les écritures sur `user`, `session`, `account` et `verification`. Un hook `before` peut refuser l'opération ou réécrire le payload avant insertion ; c'est le seul endroit où s'interposer entre le profil renvoyé par le fournisseur et sa persistance.

### Exemple

```ts
databaseHooks: {
  user: {
    create: {
      before: (user) => {
        if (!isAllowed(user.email)) throw new APIError('FORBIDDEN', { code: 'FORBIDDEN' })
        return Promise.resolve({ data: user })
      },
    },
  },
}
```

### Points Importants

- L'`APIError` levée doit porter un `code` pour que le callback OAuth redirige vers `onAPIError.errorURL` : sans lui, l'échec ne revient pas sur l'écran de connexion
- Le hook `user.create` ne s'exécute qu'à la **première** connexion d'un compte : un compte créé avant un changement de la whitelist garderait son accès, d'où un second contrôle à chaque lecture de session (cf. § Garde serveur)
- Un hook `session.create.before` sert à ne pas persister une donnée que le schéma accepterait, l'adresse IP par exemple : `disableIpTracking` la couperait aussi pour le rate limiting, qui la lit en mémoire sans l'écrire
- Le profil du fournisseur est récupéré une seule fois puis réutilisé pour la création du compte et celle de la session : aucun second appel réseau n'a lieu entre les deux hooks

---

## Session en proxy et garde serveur

### Description

Deux contrôles de nature différente se succèdent. Le proxy ne vérifie que la présence d'un cookie pour rediriger tôt, sans requête en base. La garde serveur valide réellement la session et décide de l'accès.

### Exemple

```ts
// Proxy : redirection optimiste, aucune requête en base
if (!getSessionCookie(request)) return NextResponse.redirect(loginUrl)

// Page ou Server Action : le contrôle qui fait autorité
const session = await auth.api.getSession({ headers: await headers() })
if (!session || !isAllowed(session.user.email)) unauthorized()
```

### Points Importants

- **`getSessionCookie()` ne prouve rien** : la documentation officielle la qualifie de « NOT SECURE », elle teste l'existence du cookie sans en vérifier la signature. Un cookie forgé la franchit, et c'est la garde serveur qui doit le refuser
- Chaque Server Action rappelle donc la garde elle-même : une Server Action exportée est un endpoint HTTP joignable sans passer par la page qui l'affiche
- `getSessionCookie()` ne lit pas la configuration de l'instance : un `cookieName` ou un `cookiePrefix` personnalisés se repassent explicitement en argument
- `auth.api.getSession()` touche la base à chaque appel : l'envelopper dans le `cache()` de React évite de la relire plusieurs fois dans un même rendu, un layout et sa page l'appelant tous deux
- `getCookieCache()` emploie une API Node absente du runtime Edge : la validation complète de session exige un proxy en runtime Node

---

# Commandes Clés

## Schéma et diagnostic

### Description

La CLI sert ici au diagnostic et à la génération du secret. Ni `generate` ni `migrate` n'entrent dans le workflow du projet.

### Syntaxe

```bash
npx @better-auth/cli check schema                # compare la config à la base réelle
npx @better-auth/cli secret                      # génère une valeur pour BETTER_AUTH_SECRET
npx @better-auth/cli info --json                 # diagnostic, secrets remplacés par [REDACTED]
```

### Points Importants

- `generate` est **proscrit** : il réécrit tout `prisma/schema.prisma` et perd les `@@schema("auth")`, ce qui déplacerait les quatre tables dans `public`
- `migrate` ne s'applique qu'à l'adaptateur Kysely intégré : avec Prisma, c'est `prisma migrate dev` qui crée la migration
- La CLI exige Node.js 22.12 ou plus en 1.7.x
- `create-admin` suppose le plugin Admin et un fournisseur par mot de passe : sans objet pour une whitelist Google

---

# Bonnes Pratiques

## ✅ Recommandations

- Traiter la vérification du proxy comme un confort d'affichage, et faire porter la décision d'accès par la garde serveur, appelée dans chaque page protégée et chaque Server Action
- Contrôler l'appartenance à la whitelist **à chaque lecture de session**, et pas seulement dans le hook de création : le hook ne se rejoue jamais pour un compte déjà créé
- Marquer l'objet `user` et le token de session avec le Taint API de React, pour qu'une fuite vers un Client Component échoue au rendu plutôt qu'en silence
- Exclure le schéma `auth` des dumps de données de développement
- Vérifier la valeur de `BETTER_AUTH_URL` avant de déboguer un retour OAuth : une origine qui ne correspond pas produit des échecs sans message clair

## ❌ Anti-Patterns

- Protéger une route par le seul `getSessionCookie()` du proxy : un cookie forgé le franchit
- Supposer qu'un `layout.tsx` qui lève `unauthorized()` protège le contenu de ses pages : Next les rend en parallèle et sérialise la page malgré tout, seul un contrôle dans la page empêche la fuite dans le payload
- Placer `nextCookies()` ailleurs qu'en dernier dans `plugins`
- Lancer `@better-auth/cli generate` sur ce projet : il réécrit le schéma Prisma entier et perd les `@@schema("auth")`
- Exposer l'instance `auth` hors d'un module `server-only` : elle porte le secret de signature
- Persister l'adresse IP d'une session sans l'inscrire au registre des traitements

---

# 🔗 Ressources

## Documentation Officielle

- [Better Auth](https://better-auth.com/docs)
- [Adaptateur Prisma](https://better-auth.com/docs/adapters/prisma)
- [Intégration Next.js](https://better-auth.com/docs/integrations/next)
- [Google OAuth](https://better-auth.com/docs/authentication/google)
- [Hooks de base de données](https://better-auth.com/docs/concepts/hooks)
- [Cookies et sessions](https://better-auth.com/docs/concepts/cookies)
- [CLI](https://better-auth.com/docs/concepts/cli)

## Ressources Complémentaires

- [Guide de montée en 1.7](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/1-7-upgrade-guide.mdx)
- [Multi-schema Prisma](https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema)
- [Plugin testUtils](https://better-auth.com/docs/plugins/test-utils), employé par `just dev-login` pour ouvrir une session de développement sans passer par Google
