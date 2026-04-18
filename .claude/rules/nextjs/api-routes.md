---
paths:
  - "src/app/api/**/route.ts"
---

# Next.js — API Route Handlers

## À faire
- Exporter des fonctions nommées par méthode HTTP (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`, `OPTIONS`) dans `route.ts`
- Toujours `await params` dans les route handlers dynamiques (`[id]`) : `Promise` obligatoire
- Utiliser `NextResponse.json(data, { status })` pour retourner du JSON avec un status HTTP
- Extraire le body manuellement via `await request.json()`, `await request.formData()` ou `await request.text()` selon le `Content-Type`
- Opt-in explicite au cache sur `GET` avec `export const dynamic = 'force-static'` ou `'use cache'` (Cache Components Next 16)
- Retourner `export const runtime = 'nodejs'` pour les routes qui touchent Prisma (Node runtime requis pour le driver PG)
- Centraliser les headers CORS dans un objet réutilisable et créer un handler `OPTIONS` pour les requêtes préflight
- Valider toute entrée utilisateur avec Zod avant usage (mêmes règles que les Server Actions)
- Écouter `request.signal` (abort event) pour nettoyer les streams quand le client se déconnecte

## À éviter
- Créer un `route.ts` et un `page.tsx` au même niveau de route (conflit de résolution)
- Accéder synchronement à `params` : hard error Next 16
- Combiner `Access-Control-Allow-Origin: *` avec `Access-Control-Allow-Credentials: true` (incompatibles, CORS bloqué)
- `await` la boucle dans le `start()` d'un `ReadableStream` pour SSE : bloque le retour de la réponse, lancer le travail async en background

## Gotchas
- Next 15 breaking change : les `GET` route handlers ne sont **plus cachés par défaut**, opt-in explicite requis
- SSE derrière Nginx : `X-Accel-Buffering: no` obligatoire dans les headers pour désactiver le buffering du proxy
- `cookies()` / `headers()` de `next/headers` sont async dans les route handlers (hard error Next 16 si sync)

## Exemples
```typescript
// ✅ GET dynamique avec params async (Next 16 hard error si sync)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  return NextResponse.json({ id })
}

// ❌ accès synchrone à params (hard error Next 16)
export async function GET(request, { params }: { params: { id: string } }) {
  return NextResponse.json({ id: params.id })
}
```

```typescript
// ✅ SSE : ne pas await la boucle dans start(), écouter request.signal pour cleanup
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      const interval = setInterval(() => { ... }, 1000)
      request.signal.addEventListener('abort', () => clearInterval(interval))
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no', // Nginx
    },
  })
}
```
