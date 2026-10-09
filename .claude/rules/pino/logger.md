---
paths:
  - "src/lib/logger.ts"
  - "src/instrumentation.ts"
  - "next.config.ts"
---

# Pino — Setup du logger

## À faire
- Exporter un **logger singleton** depuis `src/lib/logger.ts`, protégé par `import 'server-only'`, et le réutiliser dans tout le code serveur
- Définir le niveau depuis `env` (`@/env`, t3-env) avec fallback `debug` en dev et `info` en prod : `level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info')`. Seul `NODE_ENV` se lit sur `process.env`, il n'est pas dans le schéma
- Activer le transport `pino-pretty` **uniquement en dev**, sortie JSON brute en prod (capturée par Dokploy sur stdout)
- Garder `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` dans `next.config.ts` : la liste d'opt-out par défaut de Next contient déjà les trois, la déclaration explicite documente la dépendance et survit à un retrait de cette liste
- Installer explicitement **`thread-stream`** en dépendance directe : Pino ne le résout pas toujours seul
- Charger le logger côté serveur uniquement via **`instrumentation.ts`** : `if (process.env.NEXT_RUNTIME === 'nodejs') await import('./lib/logger')` dans `register()`
- Utiliser `formatters.level` pour envoyer le **label texte** (`info`) au lieu du numéro (`30`)
- Définir `base: { service: 'thibaud-geisler-portfolio' }` pour nommer le service dans chaque ligne
- Activer `redact` avec `censor: '[REDACTED]'` sur les champs sensibles (`*.password`, `*.token`, `req.headers.authorization`, `req.headers.cookie`…) : la clé reste visible, ce qui prouve au débogage que le champ a été intercepté, là où `remove: true` le fait disparaître sans trace

## À éviter
- Importer Pino dans un Client Component : module serveur, dépend de `worker_threads`
- Activer `pino-pretty` en production : overhead, et format que Dokploy ne parse pas
- Créer plusieurs instances de `pino()` : multiplie les transports et fragmente la configuration

## Gotchas
- Les worker threads de Pino ne se bundlent pas sous Turbopack : c'est la liste `serverExternalPackages` (celle de Next ou celle du projet) qui les laisse en module externe
- Node.js ≥ 20 requis pour Pino 10
- Child loggers, niveaux et format des événements : voir `pino/usage.md`

## Exemples
```typescript
// ✅ Singleton, transport pretty en dev seulement, champs sensibles masqués
export const logger = pino({
  level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: 'thibaud-geisler-portfolio' },
  redact: { paths: ['*.password', 'req.headers.cookie'], censor: '[REDACTED]' },
  formatters: { level: (label) => ({ level: label }) },
  transport: isDev ? { target: 'pino-pretty' } : undefined,
})

// ❌ pino-pretty actif en prod
export const logger = pino({ transport: { target: 'pino-pretty' } })
```
