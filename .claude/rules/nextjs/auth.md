---
paths:
  - "src/lib/auth.ts"
  - "src/lib/auth-client.ts"
  - "src/lib/get-current-user.ts"
  - "src/app/(admin)/**/*.tsx"
  - "src/app/api/auth/**/*.ts"
  - "src/app/unauthorized.tsx"
  - "src/app/forbidden.tsx"
---

# Next.js — Authentification (Better Auth)

## À faire
- Utiliser Better Auth 1.6.x avec Google OAuth comme unique provider (whitelist email single-user via hook `databaseHooks.user.create.before`)
- Toujours définir les cookies de session avec `HttpOnly: true`, `Secure: true` (en prod), `SameSite: 'lax'`, `Path: '/'`, `Max-Age` fini
- Utiliser `jose` pour tout JWT (Edge-compatible), `jsonwebtoken` dépend de `crypto` Node.js et casse en Edge
- Centraliser la vérification de session dans un helper `getCurrentUser()` reutilisable dans Server Components / Server Actions / Route Handlers
- Protéger les routes `(admin)/` par un layout protégé qui appelle `getCurrentUser()` en plus du check proxy (double protection)
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
- Better Auth 1.6 + Next 16 : workaround `use cache` + `getServerSession` = extraire les cookies avant le scope cache et les passer en argument (Issue #5584, contrainte Next.js pas bug Better Auth)
- Better Auth + Prisma 7 : charger `.env` explicitement au runtime via `dotenv.config()` ou `prisma.config.ts`, sinon erreur P1010 "User was denied access"
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
