---
paths:
  - "src/lib/logger.ts"
  - "src/lib/logger/**/*.ts"
  - "instrumentation.ts"
  - "src/instrumentation.ts"
---

# Pino — Logger structuré

## À faire
- Exporter un **logger singleton** depuis `src/lib/logger.ts` et le réutiliser dans tout le code serveur (évite la multiplication des transports sous-jacents)
- Définir le niveau via env var avec fallback `debug` en dev et `info` en prod : `level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')`
- Activer le transport `pino-pretty` **uniquement en dev**, output JSON brut en prod (capturé par Dokploy stdout)
- Créer un **child logger par Server Action / requête** avec bindings statiques (`action`, `requestId: crypto.randomUUID()`) pour tracer le flow d'exécution
- Logger les erreurs avec `err` en **premier argument** : `logger.error({ err }, 'message')` — Pino capture automatiquement `message`, `stack`, `type`
- Respecter les niveaux : `info` événements normaux, `warn` dégradés non bloquants (rate limit, retry), `error` échecs bloquants
- Activer `redact: { paths: [...], remove: true }` pour masquer automatiquement les champs sensibles (`*.authorization`, `req.headers.cookie`, `smtp.pass`)
- Déclarer `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` dans `next.config.ts` : les 3 packages sont **obligatoires**, `thread-stream` est le worker thread sous-jacent que Next.js doit traiter comme module externe
- Installer explicitement **`thread-stream`** : `pnpm add thread-stream` (dépendance runtime de Pino, pas toujours résolue automatiquement)
- Charger le logger au démarrage côté serveur uniquement via **`instrumentation.ts`** : `if (process.env.NEXT_RUNTIME === 'nodejs') await import('./lib/logger')` dans `register()`
- Utiliser `formatters.level` pour envoyer le **label texte** (`info`) au lieu du numéro (`30`) — plus lisible dans les logs Dokploy
- Définir `base: { service: '<nom-app>' }` pour injecter automatiquement le nom du service dans chaque log

## À éviter
- Importer Pino dans un Client Component : module serveur uniquement, dépend de `worker_threads` Node.js
- Activer `pino-pretty` en production : overhead non négligeable et format non parseable par Dokploy/Datadog
- Créer plusieurs instances de `pino()` dans le code : multiplie les transports et fragmente la configuration
- Logger des secrets ou données sensibles même en `debug` (`SMTP_PASS`, `DATABASE_URL`, tokens d'auth, clés API)
- Utiliser `console.log` à la place de Pino : pas de structure, pas de niveaux, pas de filtrage, casse l'observabilité Dokploy
- Laisser le niveau `debug` en production : impact performance même filtré côté logger

## Gotchas
- Pino 10.3.1 + Next.js App Router : `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` est **obligatoire** sinon erreur de bundling au build/runtime (les worker threads ne peuvent pas être bundlés par Webpack/Turbopack)
- Pino 10.3.1 fixe un memory leak dans le transport avec `--import preload` (sanitisation `NODE_OPTIONS`) — upgrade obligatoire depuis < 10.3.1
- Node.js ≥ 20 requis pour Pino 10

## Exemples
```typescript
// ✅ Singleton avec transport conditionnel (pino-pretty en dev seulement)
const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  base: { service: '<nom-app>' },
  formatters: { level: (label) => ({ level: label }) },
  transport: isDev ? { target: 'pino-pretty' } : undefined,
})

// ❌ pino-pretty actif en prod (overhead + format non parseable)
export const logger = pino({ transport: { target: 'pino-pretty' } })
```

```typescript
// ✅ Child logger par Server Action avec bindings statiques + err en premier arg
export async function submitForm(prev: FormState, formData: FormData) {
  const log = logger.child({ action: 'submitForm', requestId: crypto.randomUUID() })
  log.info('Processing')
  try {
    // ...
    log.info('Success')
  } catch (err) {
    log.error({ err }, 'Failed') // Pino capture stack/type automatiquement
  }
}
```

```typescript
// ✅ instrumentation.ts : bootstrap Pino côté serveur uniquement
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./lib/logger')
  }
}
```

```typescript
// ✅ redact pour masquer automatiquement les champs sensibles
export const logger = pino({
  redact: {
    paths: ['*.authorization', 'req.headers.cookie', '*.password', 'smtp.pass'],
    remove: true,
  },
})
```
