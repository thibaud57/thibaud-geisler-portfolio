---
paths:
  - "src/server/**/*.ts"
  - "src/lib/server-utils.ts"
  - "src/app/**/route.ts"
---

# Pino — Usage dans le code serveur

## À faire
- Obtenir le logger d'une Server Action par **`createActionLogger(action, handler)`** (`src/lib/server-utils.ts`) : il crée un child logger lié à `action`, `requestId` et `ip_hash`, et pose l'instrumentation Sentry
- Nommer chaque ligne par un champ **`event`** stable (`email:sent`, `tag:created`, `rate_limit:exceeded`) : c'est lui qu'on filtre dans Dokploy, pas le message
- Logger une erreur avec **`err` comme clé** : `log.error({ err, event: 'email:failed' })`. Pino sérialise `message`, `stack` et `type`
- Respecter les niveaux : `info` événements normaux, `warn` dégradés non bloquants (rate limit, retry), `error` échecs bloquants
- Hacher l'IP avant de la logger (`ip_hash`, SHA-256 salé), jamais en clair

## À éviter
- Logger des secrets ou des données personnelles, même en `debug` (`SMTP_PASS`, `DATABASE_URL`, tokens, contenu d'un message de contact)
- Utiliser `console.log` à la place de Pino : ni structure, ni niveaux, ni filtrage dans Dokploy
- Laisser le niveau `debug` en production : coût même filtré

## Gotchas
- `pinoIntegration` de Sentry intercepte tout `logger.error()` du process : un `logger.error` qui suit un `captureException` de la même erreur crée une issue en double (voir `sentry/instrumentation.md`)
- Setup du singleton, transports et `serverExternalPackages` : voir `pino/logger.md`

## Exemples
```typescript
// ✅ child logger fourni par le wrapper, événement nommé, err en clé
export async function submitForm(prev: FormState, formData: FormData) {
  return createActionLogger('submitForm', async ({ log }) => {
    try {
      // ...
      log.info({ event: 'form:sent' })
    } catch (err) {
      log.error({ err, event: 'form:failed' })
    }
  })
}

// ❌ console.log : rien de structuré, rien de filtrable
console.log('form failed', err)
```
