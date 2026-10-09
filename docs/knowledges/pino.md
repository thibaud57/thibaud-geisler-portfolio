---
title: "Pino — Logger JSON structuré"
version: "10.4.0"
description: "Référence technique pour Pino : logger JSON, child loggers, transports et intégration Next.js."
date: "2026-04-13"
keywords: ["pino", "logger", "json", "observability", "nextjs"]
scope: ["docs"]
technologies: ["Node.js", "Next.js", "TypeScript"]
---

# Description

`Pino` est le logger Node.js de référence pour l'output JSON structuré. Il est rapide, faible overhead, et bundlé avec ses types TypeScript nativement. Dans le portfolio, Pino écrit en stdout pour être capturé par Dokploy et consultable dans l'onglet Logs. Niveaux utilisés : `info`, `warn`, `error`. Les worker threads ne se bundlent pas : `pino`, `pino-pretty` et `thread-stream` restent des modules externes par `serverExternalPackages`, liste que Next fournit déjà et que `next.config.ts` redéclare.

---

# Concepts Clés

## Logger singleton

### Description

Pattern recommandé : créer une instance unique exportée depuis `src/lib/logger.ts` et la réutiliser dans tout le code serveur. Évite de multiplier les instances (et donc les transports sous-jacents) et assure une configuration cohérente. Le niveau par défaut vient d'une env var, `debug` en dev et `info` en prod.

### Exemple

```ts
// src/lib/logger.ts
import 'server-only'
import pino from 'pino'

import { env } from '@/env'

const isDev = process.env.NODE_ENV !== 'production'

export const logger = pino({
  level: env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  base: { service: 'thibaud-geisler-portfolio' },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
      }
    : undefined,
})
```

### Points Importants

- Un logger partagé, importé partout côté serveur, protégé par `server-only`
- `LOG_LEVEL` se lit par `env` (`@/env`, t3-env), comme toute variable d'environnement du projet
- En dev : transport `pino-pretty` pour la lisibilité
- En prod : output JSON brut vers stdout, capturé par Dokploy
- `formatters.level` envoie le label texte (`info`) au lieu du numéro (`30`)

---

## Child loggers (context propagation)

### Description

Un child logger hérite de la config du parent et ajoute des bindings statiques à chaque log. Pattern canonique : créer un child par requête avec `requestId`, `userId`, `route` pour tracer un flot d'exécution complet sans répéter ces champs manuellement.

### Exemple

```ts
// src/server/actions/contact.ts
'use server'
import { logger } from '@/lib/logger'

export async function submitContact(prev: unknown, formData: FormData) {
  const reqLogger = logger.child({
    action: 'submitContact',
    requestId: crypto.randomUUID(),
  })

  reqLogger.info('Processing contact form')

  try {
    // ... validation + envoi
    reqLogger.info('Contact form sent successfully')
    return { success: true }
  } catch (err) {
    reqLogger.error({ err }, 'Failed to send contact form')
    return { error: 'Erreur serveur' }
  }
}
```

### Points Importants

- Les bindings sont injectés automatiquement dans chaque log du child
- Créer un child par Server Action / requête pour la traçabilité
- `err` en premier argument : Pino capture automatiquement `message`, `stack`, `type`
- `logger.child()` n'entraîne quasiment aucun overhead

---

## Niveaux et filtrage

### Description

Pino expose les niveaux standard `trace` (10), `debug` (20), `info` (30), `warn` (40), `error` (50), `fatal` (60). Le niveau est filtré à l'instanciation : changer `level: 'warn'` empêche les logs `info` et `debug` d'être émis (coût quasi nul). Dans le portfolio, utiliser `info` pour les événements normaux, `warn` pour les situations dégradées, `error` pour les échecs.

### Exemple

```ts
logger.debug({ query, params }, 'Executing DB query')  // invisible en prod
logger.info('Server started', { port: 3000 })
logger.warn({ retryCount: 3 }, 'Retrying SMTP connection')
logger.error({ err, formData }, 'Form validation failed')
```

### Points Importants

- Le filtrage est lazy : rien n'est sérialisé pour les niveaux masqués
- Ne jamais logger de secrets (passwords, tokens, clés API) même en `debug`
- Utiliser `redact` pour masquer automatiquement des champs sensibles
- Passer l'objet en premier argument, le message en second (convention Pino)

---

## Integration Next.js (serverExternalPackages)

### Description

Pino utilise des worker threads via `thread-stream`, qui ne se bundlent pas. `pino`, `pino-pretty` et `thread-stream` figurent dans la liste `serverExternalPackages` par défaut de Next (`node_modules/next/dist/lib/server-external-packages.jsonc`), qui les traite donc déjà comme des modules Node.js externes. Le projet les redéclare dans `next.config.ts` pour documenter la dépendance et ne pas dépendre de cette liste.

### Exemple

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
}

export default nextConfig
```

### Points Importants

- Sans cette exclusion (la liste de Next ou celle du projet), erreur au démarrage ou à l'exécution
- `thread-stream` peut nécessiter une installation explicite (`pnpm add thread-stream`)
- Avec Turbopack : vérifier la version Next.js (bug corrigé en 16.1.0-canary.16+)
- Ne pas importer Pino côté client : module serveur uniquement

---

## Redact et sécurité

### Description

L'option `redact` masque automatiquement certaines propriétés dans les logs avant sérialisation. Plus performant que filtrer manuellement, et protection défensive contre les logs accidentels de données sensibles. `remove: true` supprime le champ au lieu de le remplacer par `[Redacted]`.

### Exemple

```ts
const logger = pino({
  level: 'info',
  redact: {
    paths: ['*.password', '*.pass', '*.secret', '*.token', '*.key', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
})
```

### Points Importants

- Supporte les wildcards pour matcher plusieurs propriétés
- Le projet remplace la valeur par `censor: '[REDACTED]'` plutôt que de supprimer le champ (`remove: true`) : un champ masqué reste visible dans le log, ce qui montre qu'il existait
- Compléter par une revue manuelle des logs avant la mise en prod
- Ne pas s'y fier à 100% : éviter par défaut de mettre des secrets dans les objets loggés

---

# Bonnes Pratiques

## ✅ Recommandations

- Exporter un logger singleton depuis `src/lib/logger.ts`
- Créer des child loggers par Server Action / requête pour la traçabilité
- Logger `err` en premier argument : `logger.error({ err }, 'message')`
- Ajouter `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` dans `next.config.ts`
- Activer `redact` pour les champs potentiellement sensibles
- Output JSON brut en prod, `pino-pretty` uniquement en dev

## ❌ Anti-Patterns

- Ne pas activer `pino-pretty` en production (overhead, format non parseable)
- Ne pas créer plusieurs instances de logger
- Ne pas logger d'objets contenant mots de passe ou tokens
- Ne pas importer Pino dans un composant client
- Ne pas utiliser `console.log` à la place de Pino (pas de structure, pas de niveaux)

---

# 🔗 Ressources

## Documentation Officielle

- [Pino : Site officiel](https://getpino.io)
- [Pino : API docs](https://github.com/pinojs/pino/blob/main/docs/api.md)
- [Pino : Transports](https://github.com/pinojs/pino/blob/main/docs/transports.md)

## Ressources Complémentaires

- [Next.js : serverExternalPackages](https://nextjs.org/docs/app/api-reference/config/next-config-js/serverExternalPackages)
- [pino-pretty](https://github.com/pinojs/pino-pretty)
- [Better Stack : Pino guide](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/)
