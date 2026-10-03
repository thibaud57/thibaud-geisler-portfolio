---
paths:
  - "src/lib/{auth*,get-current-user}.ts"
  - "src/app/admin/**/*.tsx"
  - "src/app/api/auth/**/*.ts"
---

# Next.js — Authentification (Better Auth)

## À faire
- Utiliser Better Auth avec Google OAuth comme unique provider (version exacte : `docs/VERSIONS.md`), whitelist email single-user dans `databaseHooks.user.create.before`
- Définir les cookies de session avec `HttpOnly: true`, `Secure: true` (en prod), `SameSite: 'lax'`, `Path: '/'`, `Max-Age` fini
- Centraliser la vérification de session dans `getCurrentUser()`, enveloppé dans `cache()` de React : layout protégé et page l'appellent dans le même rendu, la session n'est lue qu'une fois
- Protéger `admin/` par un layout protégé qui appelle `getCurrentUser()` en plus du proxy, **et** rappeler `getCurrentUser()` dans chaque page du groupe comme en tête de chaque Server Action (cf. Gotchas)
- Placer `nextCookies()` en **dernier** plugin de la config Better Auth : il gère les `Set-Cookie` des Server Actions
- Activer `experimental: { authInterrupts: true }` pour `unauthorized()` et son fichier `unauthorized.tsx`
- Activer `experimental: { taint: true }` et tainter dans `getCurrentUser()` l'objet `user` (`experimental_taintObjectReference`) et les tokens (`experimental_taintUniqueValue`) : aucune fuite vers un Client Component
- Régénérer l'identifiant de session après login et après élévation de privilèges (anti-session fixation)

## À éviter
- Lucia Auth (déprécié mars 2025) et Auth.js v5 (mode maintenance depuis septembre 2025, équipe absorbée par Better Auth)
- Valider la session en base dans `proxy.ts` : il ne teste que la présence du cookie (cf. `nextjs/proxy.md`)
- Passer `user` complet en prop à un Client Component : choisir les champs exposables (`name`, `email`), jamais les tokens

## Gotchas
- Better Auth + Next 16 : `use cache` + `getServerSession` = extraire les cookies avant le scope cache et les passer en argument (Issue #5584, contrainte Next.js pas bug Better Auth)
- Better Auth + Prisma 7 : l'erreur P1010 « User was denied access » vient d'une `DATABASE_URL` non chargée (voir `prisma/client-setup.md`)
- Refus dans un `databaseHooks` pendant le callback OAuth : lever `APIError` avec un `code` dans le body, sinon le callback relance l'erreur en 403 JSON au lieu de rediriger vers `onAPIError.errorURL` (`docs/VERSIONS.md` § Conflits Potentiels)
- `advanced.ipAddress.disableIpTracking` coupe aussi le rate limiting natif : pour ne pas persister l'IP, la retirer dans `databaseHooks.session.create.before` (`docs/VERSIONS.md` § Conflits Potentiels)
- **Un layout protégé ne protège pas le contenu de ses pages** : Next rend page et layout en parallèle et sérialise le payload RSC de la page même quand le layout lève `unauthorized()`. Un cookie forgé, qui passe le proxy, reçoit alors le contenu. Chaque page appelle `getCurrentUser()` avant de lire ou rendre quoi que ce soit
- **Chaque segment protégé porte son `loading.tsx`**, une ligne qui réexporte celui de `(protected)/` : `getCurrentUser()` lit les en-têtes, donc rend la page dynamique, et sans frontière `<Suspense>` propre au segment Next lève « encountered uncached data during prerendering ». Celui du layout partagé ne couvre pas les segments imbriqués, qu'une navigation entre pages sœurs ne traverse pas. L'erreur n'apparaît qu'en dev sous session valide
- La whitelist de `databaseHooks.user.create.before` ne s'exécute qu'à la création du compte : `getCurrentUser()` revérifie `isAdminEmail` sur chaque session, sinon un compte créé avant un changement d'`ADMIN_EMAIL` garde l'accès
- `SameSite: 'strict'` bloque aussi les navigations top-level cross-site (liens entrants) : garder `'lax'`

## Exemples
```typescript
// ✅ Helper de session : lu une fois par rendu, objet tainté
export const getCurrentUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) unauthorized()
  experimental_taintObjectReference('No session leak to client', session)
  return session.user
})

// ✅ nextCookies() toujours en dernier
plugins: [otherPlugin(), nextCookies()]

// ❌ Session entière passée à un Client Component
<ClientComponent user={session.user} />
```
