---
paths:
  - "src/lib/auth.ts"
  - "src/lib/auth-client.ts"
  - "src/lib/get-current-user.ts"
  - "src/app/admin/**/*.tsx"
  - "src/app/api/auth/**/*.ts"
  - "src/app/admin/unauthorized.tsx"
  - "src/app/admin/forbidden.tsx"
---

# Next.js — Authentification (Better Auth)

## À faire
- Utiliser Better Auth avec Google OAuth comme unique provider (version exacte : `docs/VERSIONS.md`) (whitelist email single-user via hook `databaseHooks.user.create.before`)
- Toujours définir les cookies de session avec `HttpOnly: true`, `Secure: true` (en prod), `SameSite: 'lax'`, `Path: '/'`, `Max-Age` fini
- Utiliser `jose` pour tout JWT (Edge-compatible), `jsonwebtoken` dépend de `crypto` Node.js et casse en Edge
- Centraliser la vérification de session dans un helper `getCurrentUser()` reutilisable dans Server Components / Server Actions / Route Handlers, enveloppé dans `cache()` de React : layout protégé et page l'appellent dans le même rendu, la session n'est lue qu'une fois
- Protéger les routes `admin/` par un layout protégé qui appelle `getCurrentUser()` en plus du check proxy, **et** rappeler `getCurrentUser()` dans chaque page du groupe comme en tête de chaque Server Action (cf. Gotchas)
- Utiliser `nextCookies()` comme **dernier** plugin dans la config Better Auth pour gérer automatiquement les `Set-Cookie` des Server Actions
- Pour Argon2id custom : config minimale OWASP 19 MiB memory, 2 iterations, parallelism 1
- Activer `experimental: { authInterrupts: true }` pour utiliser `unauthorized()` / `forbidden()` et les fichiers `unauthorized.tsx` / `forbidden.tsx`
- Activer `experimental: { taint: true }` dans `next.config.ts` pour pouvoir utiliser le Taint API
- Tainter `user` entier avec `experimental_taintObjectReference` et les tokens/hash avec `experimental_taintUniqueValue` dans le helper `getCurrentUser()` pour empêcher toute fuite vers un Client Component
- Régénérer le session ID après login et après élévation de privilèges (anti-session fixation)

## À éviter
- Utiliser Lucia Auth : **déprécié** mars 2025, ne pas utiliser pour de nouveaux projets
- Utiliser Auth.js (ex NextAuth) v5 : mode maintenance depuis septembre 2025, équipe absorbée par Better Auth
- Faire des appels DB dans `proxy.ts` : garder la logique légère (check existence du cookie de session), valider la DB dans le layout protégé ou la Server Action
- Hasher les mots de passe avec MD5, SHA-256, SHA-512 seuls (pas de salt, pas de cost factor)
- Utiliser bcrypt pour de nouveaux projets : pas memory-hard, vulnérable GPU. Préférer Argon2id
- Révéler si un email existe déjà lors du signup (anti-enumeration) : Better Auth gère via `requireEmailVerification: true`
- Passer `user` complet en prop à un Client Component : toujours picker les champs exposables (`name`, `email`), jamais `passwordHash` ni tokens

## Gotchas
- Better Auth + Next 16 : workaround `use cache` + `getServerSession` = extraire les cookies avant le scope cache et les passer en argument (Issue #5584, contrainte Next.js pas bug Better Auth)
- Better Auth + Prisma 7 : `prisma.config.ts` charge `.env` via `loadEnvConfig` (`@next/env`) pour la CLI Prisma, et `src/lib/prisma.ts` lit `env.DATABASE_URL` depuis `@/env` (`@t3-oss/env-nextjs`) au runtime Next. Sinon erreur P1010 "User was denied access"
- Refus dans un `databaseHooks` pendant le callback OAuth : lever `APIError` avec un `code` dans le body, sinon le callback relance l'erreur en 403 JSON au lieu de rediriger vers `onAPIError.errorURL` (voir `docs/VERSIONS.md` § Conflits Potentiels)
- `advanced.ipAddress.disableIpTracking` coupe aussi le rate limiting natif : pour ne pas persister l'IP, la retirer dans `databaseHooks.session.create.before` (voir `docs/VERSIONS.md` § Conflits Potentiels)
- **Un layout protégé ne protège pas le contenu de ses pages** : Next rend page et layout en parallèle, et sérialise le payload RSC de la page même quand le layout lève `unauthorized()`. Un cookie forgé, qui passe le proxy, reçoit alors le contenu. Chaque page appelle `getCurrentUser()` avant de lire ou rendre quoi que ce soit, sous la frontière `<Suspense>` d'un `loading.tsx` de son propre segment (sans elle, Next signale en dev un accès dynamique hors `<Suspense>` à la navigation). Celui de `(protected)/` ne couvre que la page du groupe : il appartient au layout partagé, qu'une navigation entre pages sœurs (`/admin/tags` → `/admin/projets`) ne traverse pas
- **Chaque segment de route protégé porte son `loading.tsx`**, une ligne qui réexporte celui de `(protected)/` : `getCurrentUser()` lit les en-têtes, donc rend la page dynamique, et sans frontière `<Suspense>` propre au segment Next lève « encountered uncached data during prerendering ». Celui du layout partagé ne couvre pas les segments imbriqués, que la navigation entre pages sœurs ne traverse pas. L'erreur n'apparaît qu'en dev sous session valide, le build reste vert
- La whitelist de `databaseHooks.user.create.before` ne s'exécute qu'à la création du compte : `getCurrentUser()` revérifie `isAdminEmail` sur chaque session, sinon un compte créé avant un changement d'`ADMIN_EMAIL` garde l'accès
- Cookies API Next 15+ : `const cookieStore = await cookies()` (async), hard error Next 16 si accès synchrone
- `SameSite: 'strict'` bloque aussi les navigations top-level cross-site (liens entrants) : utiliser `'lax'` sauf besoin spécifique

## Exemples
```typescript
// ✅ Better Auth avec hook databaseHooks.user.create.before (whitelist par ex.)
export const auth = betterAuth({
  database: { ... },
  socialProviders: { google: { ... } },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => { ... }, // logique whitelist / validation
      },
    },
  },
  plugins: [nextCookies()], // TOUJOURS en dernier
})

// ❌ nextCookies() pas en dernier → Set-Cookie non géré dans les Server Actions
plugins: [nextCookies(), otherPlugin()]
```

```typescript
// ✅ Helper getCurrentUser réutilisable (Server Components / Actions / Route Handlers)
export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) unauthorized()
  return session.user
}

// ✅ Layout protégé : double protection avec proxy
export default async function Layout({ children }) {
  await getCurrentUser()
  return <>{children}</>
}
```

```typescript
// ✅ Taint API dans getCurrentUser : bloque la fuite de session vers un Client Component
import { experimental_taintObjectReference, experimental_taintUniqueValue } from 'react'

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) unauthorized()
  experimental_taintObjectReference('No session leak to client', session)
  experimental_taintUniqueValue('No token leak', session, session.session.token)
  return session.user
}

// ❌ Passer la session entière en prop à un Client Component
<ClientComponent user={session.user} /> // contient potentiellement passwordHash, tokens
```
