---
title: "Better Auth : Authentification Google OAuth single-user"
version: "1.7.18"
description: "Référence technique pour Better Auth : configuration, adaptateur Prisma sur schéma dédié, hooks de base, session en proxy et garde serveur, clés d'API des agents et OAuth MCP en réserve."
date: "2026-11-10"
keywords: ["better-auth", "authentification", "oauth", "google", "session", "prisma", "api-key", "mcp"]
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
- `BetterAuthError: You are using the default secret` dans les logs de `next build` est attendu : le secret n'est injecté qu'au runtime, et le build aboutit quand même
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

## Clés d'API (plugin `@better-auth/api-key`)

### Description

Le plugin ajoute des clés d'API rattachées à un utilisateur : création, liste, modification, révocation et vérification par l'API serveur, avec des permissions, une expiration et un rate limit par clé. Il sert ici à authentifier les agents sur le serveur MCP de l'app, une clé par usage, sans jamais leur ouvrir de session ([ADR-025](../adrs/025-acces-agents-app.md)).

### Exemple

```ts
import { apiKey } from '@better-auth/api-key'

export const auth = betterAuth({
  // ...
  plugins: [
    apiKey({
      defaultPrefix: 'app_',
      enableMetadata: true,
      rateLimit: { enabled: true, maxRequests: 1000, timeWindow: 60 * 60 * 1000 },
    }),
    nextCookies(),
  ],
})

// Création depuis une Server Action, après la garde de session : sans `headers`
const created = await auth.api.createApiKey({
  body: { userId: user.id, name: 'Poste', expiresIn: 90 * 24 * 60 * 60, permissions: { orders: ['read', 'write'] } },
})

// Vérification dans un route handler, une seule fois par requête, sans permissions :
// le handler compare lui-même le domaine aux permissions de la clé pour répondre 403 plutôt que 401
const { valid, error, key } = await auth.api.verifyApiKey({ body: { key: bearer } })
const allowed = valid && (key?.permissions?.orders?.length ?? 0) > 0
```

### Points Importants

- Paquet séparé, importé depuis `@better-auth/api-key` (client : `@better-auth/api-key/client`), à installer **à la même version** que `better-auth`
- La clé est hachée au repos par défaut, en SHA-256 encodé base64url (`defaultKeyHasher`, `@better-auth/api-key` 1.7.18, `dist/index.mjs`, relevé le 2026-11-10) ; la valeur en clair n'est renvoyée qu'une fois, par `createApiKey`. `disableKeyHashing` existe et ne s'active jamais
- `start` garde en clair les 6 premiers caractères, préfixe compris, pour reconnaître une clé dans une liste ; le préfixe accepte `[a-zA-Z0-9_-]` et se termine de préférence par `_`
- `permissions`, `rateLimit*`, `refill*`, `remaining` et `enabled` sont **server-only** : un appel qui passe `headers` est traité comme client et lève `SERVER_ONLY_PROPERTY`. La création avec permissions se fait donc sans `headers`, avec `body.userId` lu après la garde de session
- Le rate limit est actif par défaut, à 10 requêtes par 24 h d'après le code lu au 2026-11-06 : un serveur d'outils le règle explicitement, sinon il bloque dès le onzième appel. Le réglage du plugin est copié dans chaque clé à sa création
- Ce rate limit n'est pas une fenêtre fixe (`evaluateRateLimit`, code 1.7.18) : chaque requête acceptée incrémente le compteur et met à jour `lastRequest` ; le compteur ne repart à zéro que si l'écart avec `lastRequest` dépasse la fenêtre ; au-delà du maximum, refus `RATE_LIMITED` jusqu'à une fenêtre après la dernière requête acceptée. Avec 1 000 par heure, un usage continu sans pause d'une heure se bloque après 1 000 requêtes cumulées
- Le refus `RATE_LIMITED` de `verifyApiKey` porte `error.details.tryAgainIn` (millisecondes), absent des types publics : la route MCP en tire `Retry-After` (`evaluateRateLimit` et `catch` de `verifyApiKey`, qui étale `error.body`, `@better-auth/api-key` 1.7.18, `dist/index.mjs`, constaté le 2026-11-10)
- `verifyApiKey` ne lève pas : il renvoie `{ valid: false, error: { code, message } }`. Des permissions insuffisantes reviennent en `KEY_NOT_FOUND`, sans code dédié. Chaque appel consomme le rate limit : une vérification par requête
- Toute erreur interne de `verifyApiKey` (base en panne comprise) revient en `INVALID_API_KEY`, le code d'une clé inconnue. Le logger de Better Auth écrit une ligne `error` « Failed to validate API key » à chaque refus, clé inconnue, expirée ou en rate limit comprise (`catch` de `verifyApiKey`, code 1.7.18) : elle ne signale pas la panne
- `verifyApiKey` supprime la clé expirée qu'il vérifie et répond `KEY_EXPIRED` ; la purge des autres clés expirées part de `createApiKey`, en tâche de fond non attendue, au plus une fois toutes les 10 s
- `expiresIn` est en secondes, borné par défaut entre 1 jour et 365 jours (`keyExpiration`) ; une clé sans expiration omet le champ
- Une clé n'ouvre une session que si `enableSessionForAPIKeys` est activé (défaut `false`) : ne pas l'activer, sinon une clé fuitée donne la session du propriétaire sur tous les endpoints Better Auth
- Le modèle `apikey` (21 champs, index sur `configId`, `referenceId` et `key`, sans clé étrangère) se transcrit à la main avec `@@schema("auth")`, comme les quatre modèles de base ; `referenceId` remplace `userId` depuis la 1.7
- Le modèle Prisma se nomme `Apikey` (client `prisma.apikey`) : l'adaptateur Prisma appelle `db[model]` avec le nom `apikey` (`@better-auth/prisma-adapter`, 1.7.18) et `ApiKey` (client `prisma.apiKey`) lève « Model apikey does not exist ». Better Auth contrôle le schéma au démarrage par défaut (`advanced.database.validateSchema`) et logge un `SchemaMismatchError` sur un écart
- Le plugin lit par défaut l'en-tête `x-api-key` pour ses propres hooks : une route qui lit `Authorization: Bearer` extrait la clé elle-même avant `verifyApiKey`

---

## OAuth pour clients MCP (plugin `@better-auth/mcp`)

### Description

Le plugin fait de l'app un serveur d'autorisation OAuth 2.1 et une ressource protégée (RFC 9728) pour des clients MCP qui exigent OAuth, comme les connecteurs claude.ai. Il reste en réserve : l'app authentifie ses agents par clé d'API, et aucun client utilisé ne l'impose ([ADR-025](../adrs/025-acces-agents-app.md)).

### Exemple

```ts
// Route MCP enveloppée : JWT vérifié localement, 401 ou 403 insufficient_scope sinon
export const POST = requireMcpAuth(auth, mcpHandler, { resource: 'https://app.example.com/api/mcp' })
```

### Points Importants

- Il demande le plugin `jwt` (signature, JWKS) et recommande `@better-auth/cimd` (Client ID Metadata Documents, profil `mcp-2026-07-28`), en plus du SDK MCP v2
- Il remplace `oauthProvider()` : ne jamais enregistrer les deux dans la même instance
- L'enregistrement dynamique des clients n'est jamais activé implicitement, la spec MCP le dépréciant
- Le login Google et sa whitelist restent l'étape d'identification du flux OAuth

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
- Une clé d'API par usage, limitée à ses domaines par ses `permissions`, créée et révoquée depuis l'espace admin, sa valeur affichée une seule fois
- Régler le rate limit du plugin `api-key` à la création de l'instance, au lieu de subir son défaut

## ❌ Anti-Patterns

- Protéger une route par le seul `getSessionCookie()` du proxy : un cookie forgé le franchit
- Supposer qu'un `layout.tsx` qui lève `unauthorized()` protège le contenu de ses pages : Next les rend en parallèle et sérialise la page malgré tout, seul un contrôle dans la page empêche la fuite dans le payload
- Placer `nextCookies()` ailleurs qu'en dernier dans `plugins`
- Lancer `@better-auth/cli generate` sur ce projet : il réécrit le schéma Prisma entier et perd les `@@schema("auth")`
- Exposer l'instance `auth` hors d'un module `server-only` : elle porte le secret de signature
- Persister l'adresse IP d'une session sans l'inscrire au registre des traitements
- Activer `enableSessionForAPIKeys` : une clé d'agent ouvrirait alors la session du propriétaire
- Passer `headers` à `createApiKey` en même temps que des `permissions` : l'appel est traité comme client et refusé
- Désactiver le hachage des clés (`disableKeyHashing`)

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
- [Plugin API Key](https://better-auth.com/docs/plugins/api-key) et sa [référence](https://better-auth.com/docs/plugins/api-key/reference)
- [Plugin MCP](https://better-auth.com/docs/plugins/mcp)

## Ressources Complémentaires

- [Guide de montée en 1.7](https://github.com/better-auth/better-auth/blob/main/docs/content/docs/guides/1-7-upgrade-guide.mdx)
- [Multi-schema Prisma](https://www.prisma.io/docs/orm/prisma-schema/data-model/multi-schema)
- [Plugin testUtils](https://better-auth.com/docs/plugins/test-utils), employé par `just dev-login` pour ouvrir une session de développement sans passer par Google
