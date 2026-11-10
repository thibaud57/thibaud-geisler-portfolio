---
title: "Vitest : Framework de test"
version: "5.1.0"
description: "Référence technique pour Vitest 5 : config Next.js, mocks, coverage et Testing Library."
date: "2026-11-10"
keywords: ["vitest", "testing", "mocks", "coverage", "react"]
scope: ["docs"]
technologies: ["TypeScript", "Next.js", "React", "Testing Library"]
---

# Description

`Vitest` est le framework de test utilisé dans le portfolio pour les tests unitaires (fonctions pures, helpers, Server Actions critiques, schémas Zod) et d'intégration (formulaire contact avec SMTP mock, queries Prisma sur PostgreSQL de test). Intégration native avec Vite, support TypeScript, compatible Testing Library React et jsdom. La v4 apporte `test.extend` avec inférence automatique, et un reporter `agent` pour les AI coding agents. La v5 (3 septembre 2026) exige Vite >= 6.4 et Node.js >= 22.12, fait de `vite` une peer obligatoire et active `clearMocks` par défaut.

---

# Concepts Clés

## Configuration Vitest + Next.js

### Description

Configuration minimale pour tester une application Next.js avec React 19 et TypeScript. Utilise `jsdom` comme environnement, l'option native `resolve.tsconfigPaths` pour les alias `@/*` (aucun plugin `vite-tsconfig-paths`), et un fichier de setup pour charger les matchers Testing Library. Avec plusieurs projects (section suivante), l'environnement se pose par project, pas à la racine comme dans cet exemple minimal.

### Exemple

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Résolution des alias `@/*` par l'option native depuis Vitest 4, sans plugin dédié
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
})
```

```ts
// vitest.setup.ts (racine, référencé par setupFiles)
import '@testing-library/jest-dom/vitest'
```

### Points Importants

- `environment: 'jsdom'` pour les tests React DOM
- `globals: true` injecte `describe`/`it`/`expect` sans import
- Ajouter `"types": ["vitest/globals"]` dans `tsconfig.json`
- `@testing-library/jest-dom/vitest` étend `expect` avec `toBeInTheDocument`, etc. Il s'importe par ce chemin, pas par l'import standard
- `@testing-library/dom` est une peer **obligatoire** de `@testing-library/jest-dom` 7 : à déclarer en devDependency, faute de quoi elle n'arrive que par l'auto-install des peers de pnpm
- jsdom 31 réécrit son moteur CSS (styles calculés et sérialisation peuvent différer), met le parsing en pause aux scripts bloquants (`new JSDOM()` peut rendre un document partiel) et lit le canvas via `@napi-rs/canvas` : aucun effet sur la suite du projet, verte sans modification (notes de la 31.0.0, lues le 2026-11-10)

---

## Projects unit / server / integration et mock de server-only

### Description

`vitest.config.ts` sépare des projects par environnement (`extends: true`, donc `plugins`, `resolve` et `setupFiles` communs) : `unit` (jsdom) pour les composants et la logique, `server` (node) pour le code serveur, `integration` (node, sérialisé) pour les tests qui écrivent dans une base de test. Le module `server-only`, qui garde les modules serveur, n'a pas d'implémentation hors du bundler Next : il est remplacé par un module vide via un alias.

### Exemple

```ts
// vitest.config.ts (condensé)
export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: { 'server-only': new URL('./__mocks__/server-only.ts', import.meta.url).pathname },
  },
  test: {
    globals: true,
    setupFiles: ['./vitest.env-loader.ts', './vitest.setup.ts'],
    projects: [
      { extends: true, test: { name: 'unit', environment: 'jsdom', exclude: ['src/**/*.integration.test.{ts,tsx}', 'src/server/**'] } },
      { extends: true, test: { name: 'server', environment: 'node', include: ['src/server/**/*.test.{ts,tsx}'], exclude: ['src/**/*.integration.test.{ts,tsx}'] } },
      { extends: true, test: { name: 'integration', environment: 'node', include: ['src/**/*.integration.test.{ts,tsx}'], pool: 'forks', fileParallelism: false } },
    ],
  },
})
```

### Points Importants

- Sans l'alias, tout test qui importe une Server Action ou un module `import 'server-only'` échoue dès l'import
- Un project en `environment: 'node'` fait tourner le code serveur avec le `FormData`, le `File` et le `fetch` de Node, comme en production : jsdom les remplace par ses propres implémentations
- `fileParallelism: false` sur `integration` (il ramène à lui seul `maxWorkers` à 1) : les fichiers partagent une base, en parallèle ils se marchent dessus (truncate et insert concurrents)
- Un test d'intégration se nomme `*.integration.test.ts`, c'est ce suffixe qui l'oriente vers le bon project.
- Un paquet ESM seul qui importe `next/navigation` sans extension (next-intl) échoue sous Node strict : l'inliner par `server.deps.inline` (vercel/next.js#77200)
- `vitest.env-loader.ts` charge la configuration d'environnement via `@next/env`, avant tout import qui lit `process.env`

---

## Tests unitaires (fonctions et schémas)

### Description

Tests canoniques pour les fonctions pures (helpers, formatters) et les schémas Zod. Structure classique `describe`/`it` avec assertions `expect`. Vitest utilise `Object.is()` pour `toBe` (primitives) et comparaison récursive pour `toEqual` (objets).

### Exemple

```ts
// src/lib/schemas/contact.test.ts (test colocalisé)
import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { contactSchema } from './contact'

describe('contactSchema', () => {
  it('valide un input correct', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Un message de test suffisamment long',
    })
    expect(result.success).toBe(true)
  })

  it('rejette un email invalide', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'pas-un-email',
      message: 'Un message',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.email).toBeDefined()
    }
  })
})
```

### Points Importants

- `toBe` pour primitives, `toEqual` pour objets
- `toStrictEqual` pour comparaison stricte (types + `undefined`)
- `toThrow(/pattern/)` pour les erreurs (wrap dans arrow function)
- Pour async : `await expect(promise).rejects.toThrow('msg')`. Le `await` est obligatoire : depuis Vitest 5, une assertion `resolves` ou `rejects` non attendue fait échouer le test (simple warning avant)

---

## Tests de composants React

### Description

Tests de composants avec `@testing-library/react` et `@testing-library/user-event`. Pattern : `render` le composant, récupérer les éléments via `screen.getByRole`, simuler des interactions avec `userEvent`.

### Exemple

```tsx
// src/components/features/public/contact/ContactForm.test.tsx (à écrire : test colocalisé, jamais de dossier __tests__)
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from './ContactForm'

vi.mock('@/server/actions/contact', () => ({
  submitContact: vi.fn().mockResolvedValue({ ok: true, errors: {}, message: null }),
}))

describe('ContactForm', () => {
  it('affiche les champs requis', () => {
    render(<ContactForm />)
    expect(screen.getByRole('textbox', { name: /nom/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /envoyer/i })).toBeInTheDocument()
  })

  it('désactive le bouton pendant l\'envoi', async () => {
    const user = userEvent.setup()
    render(<ContactForm />)
    await user.type(screen.getByRole('textbox', { name: /nom/i }), 'Alice')
    // ... assertions
  })
})
```

### Points Importants

- Toujours créer `userEvent.setup()` AVANT chaque `render`
- Préférer `getByRole` (accessibilité) à `getByTestId`
- Mocker les Server Actions via `vi.mock`
- Les async Server Components Next.js ne sont pas testables avec Vitest → tests E2E

---

## Mocks : vi.fn, vi.spyOn, vi.mock

### Description

Trois niveaux de mocking : `vi.fn()` pour créer une fonction mock, `vi.spyOn()` pour remplacer une méthode existante sans changer son comportement (sauf avec `.mockImplementation`), `vi.mock()` pour remplacer un module entier. `vi.mock` est hoisted en haut du fichier (exécuté avant les imports).

### Exemple

```ts
import { describe, it, expect, vi } from 'vitest'

// Mock module entier (hoisted)
vi.mock('@/lib/mailer', () => ({
  transporter: {
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
  },
}))

import { transporter } from '@/lib/mailer'
import { submitContact } from '@/server/actions/contact'

describe('submitContact', () => {
  it('appelle sendMail avec les bons params', async () => {
    const formData = new FormData()
    formData.set('name', 'Alice')
    formData.set('email', 'alice@example.com')
    formData.set('message', 'Un message de test')

    await submitContact(null, formData)

    expect(transporter.sendMail).toHaveBeenCalledOnce()
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'alice@example.com' }),
    )
  })
})
```

### Points Importants

- `vi.mock` est hoisted : pas besoin de le mettre avant les imports dans le texte
- `vi.mock` reste au top-level du fichier : appelé dans une fonction, un bloc ou un callback `describe`/`it`, il lève une erreur depuis Vitest 5 (simple warning avant)
- Pour mock partiel : `vi.mock('./module', async (orig) => ({ ...(await orig()), fn: vi.fn() }))`
- **`clearMocks: true` par défaut depuis Vitest 5** : l'historique d'appels de chaque mock est vidé avant chaque test, un `vi.clearAllMocks()` en `afterEach` devient redondant. Les implémentations posées par `mockResolvedValue` restent en place, seul `mockReset` les retire
- `vi.spyOn` moins invasif que `vi.mock` quand possible

---

## Coverage (v8 provider)

### Description

Vitest utilise V8 nativement pour la couverture de code, sans instrumentation. Plus rapide qu'Istanbul. Configuration dans `vitest.config.ts`, exécution via `vitest run --coverage`.

> ℹ️ **Activée dans ce projet** : périmètre dans `vitest.config.ts`, plancher dans `just test` ([ARCHITECTURE.md § Coverage](../ARCHITECTURE.md)). L'exemple ci-dessous est une référence générique de l'API.

### Exemple

```ts
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/test/**',
        'src/**/*.stories.{ts,tsx}',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
})
```

```bash
pnpm exec vitest run --coverage
```

### Points Importants

- `provider: 'v8'` par défaut (plus rapide qu'Istanbul)
- Exige le paquet `@vitest/coverage-v8`, à la même version que `vitest`
- `/* v8 ignore next -- raison */` pour ignorer ponctuellement
- Reporters multiples pour HTML local + lcov pour CI

---

# Commandes Clés

## Exécution et watch

### Description

Les commandes courantes pour lancer les tests en dev (watch mode) ou en CI (run mode). Vitest détecte automatiquement le mode selon la variable `CI`.

### Syntaxe

```bash
pnpm exec vitest               # watch mode (dev)
pnpm exec vitest run           # passe unique (CI)
pnpm exec vitest --coverage    # avec coverage
pnpm exec vitest related src/lib/mailer.ts  # tests couvrant ce fichier
pnpm exec vitest -t "submitContact"  # filtrer par nom de test
```

### Points Importants

- `vitest` sans arg = watch mode en dev, run en CI
- `vitest run` pour forcer le mode unique
- `--ui` ouvre l'interface web de debug
- `related` utile dans les hooks pre-commit (lint-staged)

---

# Bonnes Pratiques

## ✅ Recommandations

- Installer `@testing-library/jest-dom/vitest` pour les matchers React
- Créer `userEvent.setup()` avant chaque `render`
- Mocker les Server Actions et nodemailer (jamais d'envoi réel en test)
- Utiliser `getByRole` (accessibilité) à la place de `getByTestId`
- Laisser `clearMocks` à son défaut `true` (Vitest 5) plutôt que d'appeler `vi.clearAllMocks()` dans chaque fichier
- Maintenir une DB de test séparée pour les tests d'intégration Prisma

## ❌ Anti-Patterns

- Ne pas tester les async Server Components avec Vitest (limitation React, utiliser E2E)
- Ne pas utiliser `jsdom` pour des tests de logique pure (utiliser `node`)
- Ne pas oublier de mocker SMTP (jamais d'envoi réel)
- Ne pas partager l'état de mocks entre tests (pollution)
- Ne pas appeler `vi.mock` dans un `describe`, un `it` ou une fonction : erreur depuis Vitest 5
- Ne pas viser 100% de coverage au détriment de la pertinence des tests

---

# 🔗 Ressources

## Documentation Officielle

- [Vitest : Guide](https://vitest.dev/guide/)
- [Vitest : Migration Guide](https://vitest.dev/guide/migration/)
- [Vitest 5.0](https://vitest.dev/blog/vitest-5.html)
- [Vitest : API expect](https://vitest.dev/api/expect.html)
- [Vitest : Mocking](https://vitest.dev/guide/mocking)

## Ressources Complémentaires

- [Next.js + Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
