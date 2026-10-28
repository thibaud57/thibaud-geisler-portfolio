---
paths:
  - "src/proxy.ts"
  - "proxy.ts"
---

# Next.js : proxy.ts (ex-middleware)

## À faire
- Nommer le fichier `proxy.ts` (Next 16 remplace `middleware.ts`) et exporter la fonction par défaut ou sous le nom `proxy` : le build n'échoue que si aucun des deux n'existe. Un handler tiers (`createMiddleware(routing)` de next-intl) s'exporte par défaut
- Placer `proxy.ts` à la racine du projet ou dans `src/`, au même niveau que `app/`
- Runtime `nodejs` **implicite** (Edge runtime supprimé pour `proxy.ts` en Next 16). **Ne pas** déclarer `export const runtime = 'nodejs'` : Next rejette tout route segment config dans `proxy.ts` ("Route segment config is not allowed in Proxy file")
- Configurer un `matcher` strict pour exclure les assets statiques, sinon le proxy s'exécute sur **toutes** les routes (y compris `_next/static`, images, favicon) et dégrade les performances

## À éviter
- Utiliser `middleware.ts` : déprécié Next 16, sera supprimé dans une version future
- Faire des appels DB dans le proxy, même si Node.js est disponible : le proxy est un point de passage de chaque requête, la validation DB se fait dans les Server Components/Actions. Seule exception : le check d'existence avant stream décrit en Gotchas, rien d'autre ne justifie d'y lire la base
- Utiliser `skipMiddlewareUrlNormalize` : renommé **`skipProxyUrlNormalize`** en Next 16

## Gotchas
- Le proxy s'exécute **avant** le rendering mais **après** les redirects statiques de `next.config.ts`
- Better Auth : protéger les routes `admin/` via check d'existence du cookie de session uniquement, par `getSessionCookie(request)` de `better-auth/cookies`. Il ne lit pas la config de `auth.ts` : un nom ou un préfixe de cookie personnalisé se repasse en options. La validation DB se fait dans le layout protégé ou la Server Action
- **Le proxy n'est pas une frontière d'autorisation** : un matcher qui exclut un chemin l'exclut aussi pour les Server Functions de ce chemin et un bypass du proxy reste possible tant que Next n'est pas patché. Chaque page et chaque Server Function vérifie elle-même (cf. `nextjs/server-actions-security.md`)
- **Exception étroite à l'interdiction d'appel DB** : sans `generateStaticParams`, une route dynamique part sans vérifier qu'elle existe, le statut HTTP se fige à 200 et `notFound()` ne peut plus le changer une fois le stream commencé ([ADR-022](../../../docs/adrs/022-rendu-public-sans-donnee-au-build.md)). Le seul remède est un check avant stream, que seul le proxy exécute assez tôt. L'exception se limite au motif d'URL des pages projet (`/<locale>/projets/<slug>`), à un `select` d'un seul champ sans contenu, non caché, puis à un repli qui laisse passer la requête si la base ne répond pas (en loggant l'échec via Pino, jamais un `catch` muet) plutôt que de fabriquer un faux 404. Rien d'autre dans ce projet ne justifie un appel DB en proxy

## Exemples
```typescript
// ✅ proxy.ts léger : check cookie + redirect, matcher strict
export default function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/protected')) {
    if (!getSessionCookie(request)) return NextResponse.redirect(new URL('/login', request.url))
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
// ✅ Exception étroite : check d'existence avant stream, select minimal, repli qui laisse passer
const match = new RegExp(`^/(${locales.join('|')})/items/([^/]+)$`).exec(pathname)
if (match) {
  try {
    const item = await db.item.findFirst({ where: { slug: match[2] }, select: { id: true } })
    if (!item) return NextResponse.rewrite(new URL('/unmatched-slug', request.url))
  } catch (err) {
    // panne DB : laisser passer plutôt que de transformer une page valide en 404, mais la tracer
    logger.warn({ err, event: 'proxy:item_lookup_failed' })
  }
}

// ❌ Aucun export de fonction : le build échoue
const handler = createMiddleware(routing)
```
