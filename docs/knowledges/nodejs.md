---
title: "Node.js — Runtime JavaScript"
version: "24.14.1"
description: "Référence technique pour Node.js 24 : runtime, TypeScript natif, test runner, env files."
date: "2026-04-13"
keywords: ["nodejs", "runtime", "typescript", "esm"]
scope: ["docs"]
technologies: ["TypeScript", "pnpm", "Next.js"]
---

# Description

`Node.js` 24 est le runtime JavaScript utilisé dans le portfolio, en LTS Active. La v24 apporte TypeScript natif via type stripping, le chargement natif des `.env` via `--env-file`, un test runner mature, `URLPattern` global, et V8 13.6 (Float16Array, RegExp.escape, using keyword). Node.js 20 passe en EOL le 30 avril 2026, d'où la migration vers v24.

---

# Concepts Clés

## TypeScript natif

### Description

Depuis v22.18.0+, Node.js exécute nativement les fichiers `.ts` en supprimant les annotations de types (type stripping via Amaro). Pas besoin de `tsc`, `ts-node` ou `tsx` pour un script simple. Garder `tsc --noEmit` en CI pour la vérification des types.

### Exemple

```bash
node server.ts                              # exécution directe
node --experimental-strip-types script.ts   # flag explicite (versions antérieures)
node --experimental-transform-types app.ts  # pour enums / namespaces
```

### Points Importants

- Pas de vérification de types à l'exécution (utiliser `tsc --noEmit` en CI)
- Les enums et namespaces nécessitent `--experimental-transform-types`
- Next.js gère son propre pipeline TypeScript (Turbopack), ce flag concerne surtout les scripts CLI
- Utile pour `prisma/seed.ts`, scripts de migration, tâches one-shot

---

## .env natif via --env-file

### Description

Node.js 20+ supporte nativement le chargement des fichiers `.env` via `--env-file`. Plus besoin de la librairie `dotenv` pour les scripts autonomes. Next.js charge ses propres `.env.*` indépendamment.

### Exemple

```bash
node --env-file=.env.local scripts/seed.ts
node --env-file-if-exists=.env.local scripts/migrate.ts
```

### Points Importants

- Flag `--env-file-if-exists` : ne lève pas d'erreur si le fichier est absent
- Pour Next.js : le framework charge automatiquement `.env.local`, `.env.development`, etc.
- Pour les scripts Prisma : utiliser `--env-file=.env` si appelé hors Next.js
- Pas besoin d'installer `dotenv` pour les scripts utilitaires

---

## Test runner intégré

### Description

Le test runner `node:test` est suffisant pour des tests simples (fonctions pures, helpers). Pour le portfolio, Vitest reste préféré pour les tests de composants React et l'intégration avec Testing Library, mais `node:test` peut servir pour des scripts ou helpers backend purs.

### Exemple

```ts
// scripts/hash.test.ts
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { hashPassword } from './hash'

describe('hashPassword', () => {
  test('produit un hash différent de l\'input', async () => {
    const hash = await hashPassword('secret')
    assert.notEqual(hash, 'secret')
    assert.ok(hash.startsWith('$2b$'))
  })
})

// Exécution : node --test scripts/hash.test.ts
```

### Points Importants

- Pas de configuration : `import { test } from 'node:test'` suffit
- `--test` : mode runner qui détecte automatiquement les fichiers `*.test.ts`
- `--experimental-test-coverage` : coverage natif
- Vitest reste préférable pour les tests React (meilleure intégration Testing Library)

---

## using et Symbol.dispose

### Description

V8 13.6 apporte `using` (Explicit Resource Management), qui garantit la libération des ressources à la sortie du scope. Pattern utile pour les connexions de base de données, handles de fichiers, verrous.

### Exemple

```ts
class DatabaseConnection {
  constructor(public client: PrismaClient) {}
  [Symbol.dispose]() {
    this.client.$disconnect()
  }
}

async function processBatch() {
  using conn = new DatabaseConnection(new PrismaClient())
  const users = await conn.client.user.findMany()
  // conn[Symbol.dispose]() appelé automatiquement à la sortie du scope
}
```

### Points Importants

- `using` pour les ressources synchrones (`Symbol.dispose`)
- `await using` pour les ressources asynchrones (`Symbol.asyncDispose`)
- Idiomatique pour les cas try/finally de cleanup
- Support TypeScript 5.2+

---

# Commandes Clés

## Exécution

### Description

Les commandes principales du CLI `node` pour exécuter des scripts, lancer des tests, activer le watch mode ou charger des variables d'environnement.

### Syntaxe

```bash
node script.ts                         # exécution TypeScript native
node --watch script.ts                 # redémarrage automatique sur changement
node --env-file=.env.local script.ts   # chargement .env natif
node --test                            # lance les tests *.test.*
node -e "console.log('inline')"        # eval inline
node -v                                # version courante
```

### Points Importants

- `--watch` utile pour les scripts dev (seed, workers locaux)
- `--import` pour précharger un module ESM (ex: `--import tsx`)
- `--inspect` pour activer l'inspecteur V8 (debug DevTools)
- Les flags expérimentaux deviennent stables au fil des versions (ex: `--permission` stable en v24)

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser Node.js 24 LTS (v20 en EOL le 30 avril 2026)
- Exécuter les scripts TypeScript directement via `node script.ts`
- Charger les env vars via `--env-file=.env.local` dans les scripts standalone
- Garder `tsc --noEmit` dans le CI pour valider les types
- Préférer `node:test` pour des utilitaires backend purs, Vitest pour React

## ❌ Anti-Patterns

- Ne pas rester sur Node.js 20 après le 30 avril 2026 (EOL)
- Ne pas installer `dotenv` pour des scripts standalone (utiliser `--env-file`)
- Ne pas compter sur le type checking au runtime (Node.js fait du stripping seul)
- Ne pas utiliser `ts-node` si `node script.ts` suffit
- Ne pas mélanger ESM et CJS sans raison (le projet est ESM strict via `"type": "module"`)

---

# 🔗 Ressources

## Documentation Officielle

- [Node.js v24 : Documentation](https://nodejs.org/docs/latest-v24.x/api/index.html)
- [Command-line API](https://nodejs.org/docs/latest-v24.x/api/cli.html)
- [TypeScript natif](https://nodejs.org/learn/typescript/run-natively)

## Ressources Complémentaires

- [Node.js 24 release](https://nodejs.org/en/blog/release/v24.0.0)
- [AppSignal, What's new in Node.js 24](https://blog.appsignal.com/2025/05/09/whats-new-in-nodejs-24.html)
