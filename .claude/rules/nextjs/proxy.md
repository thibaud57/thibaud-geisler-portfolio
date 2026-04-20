---
paths:
  - "src/proxy.ts"
  - "proxy.ts"
---

# Next.js — proxy.ts (ex-middleware)

## À faire
- Nommer le fichier `proxy.ts`. Pour un proxy **custom** (logique écrite à la main), exporter la fonction nommée `proxy` (Next 16 remplace `middleware.ts`)
- Pour un proxy **délégué à un handler tiers** (ex: `createMiddleware(routing)` de next-intl, `clerkMiddleware()` de Clerk), utiliser `export default handler` : pattern recommandé par ces librairies et supporté officiellement par Next 16 (`export default` OU named `proxy`, jamais les deux simultanément)
- Placer `proxy.ts` à la racine du projet ou dans `src/`, au même niveau que `app/`
- Runtime `nodejs` **implicite** (Edge runtime supprimé pour `proxy.ts` en Next 16). **Ne pas** déclarer `export const runtime = 'nodejs'` : Next rejette tout route segment config dans `proxy.ts` ("Route segment config is not allowed in Proxy file")
- Configurer un `matcher` strict pour exclure les assets statiques, sinon le proxy s'exécute sur **toutes** les routes (y compris `_next/static`, images, favicon) et dégrade les performances
- Garder la logique légère : vérification de cookie/JWT, redirect, rewrite, injection de headers
- Lire un cookie avec `request.cookies.get('name')?.value`, écrire via `NextResponse.next().cookies.set(...)`
- Utiliser `request.nextUrl.pathname` et `request.nextUrl.searchParams` pour parser l'URL courante

## À éviter
- Utiliser `middleware.ts` : déprécié Next 16, sera supprimé dans une version future
- Faire des appels DB dans le proxy, même si Node.js est disponible : le proxy est un point de passage de chaque requête, la validation DB se fait dans les Server Components/Actions
- Utiliser `skipMiddlewareUrlNormalize` : renommé **`skipProxyUrlNormalize`** en Next 16
- Omettre le matcher : dégrade les performances en exécutant le proxy sur les assets statiques

## Gotchas
- Next 16 : le runtime `edge` n'est plus supporté pour `proxy.ts`, utiliser `nodejs` exclusivement
- Codemod automatique dispo : `npx @next/codemod@canary middleware-to-proxy .`
- Le proxy s'exécute **avant** le rendering mais **après** les redirects statiques de `next.config.ts`
- Better Auth : protéger les routes `(admin)/` via check d'existence du cookie de session uniquement, la validation DB se fait dans le layout protégé ou la Server Action
- Next 16 refuse `export default` + `export const proxy` simultanément : un seul des deux par fichier (`"The file must export a single function, either as a default export or named proxy"`)

## Exemples
```typescript
// ✅ proxy.ts léger : check cookie + redirect, matcher strict
export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/protected')) {
    const session = request.cookies.get('session')?.value
    if (!session) return NextResponse.redirect(new URL('/login', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}

// ❌ middleware.ts (déprécié Next 16) ou appel DB dans le proxy
export async function middleware(request) {
  const user = await db.user.findUnique({ ... }) // jamais en proxy
}
```

```typescript
// ✅ Proxy délégué à next-intl : export default (convention officielle next-intl)
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}

// ❌ Double export rejeté par Next 16
export const proxy = createMiddleware(routing)
export default proxy
```
