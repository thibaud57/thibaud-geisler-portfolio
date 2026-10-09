---
title: "Vitest — Framework de test"
version: "5.0.3"
description: "Référence technique pour Vitest 5 : config Next.js, mocks, coverage et Testing Library."
date: "2026-10-03"
keywords: ["vitest", "testing", "mocks", "coverage", "react"]
scope: ["docs"]
technologies: ["TypeScript", "Next.js", "React", "Testing Library"]
---

# Description

`Vitest` est le framework de test utilisé dans le portfolio pour les tests unitaires (fonctions pures, helpers, Server Actions critiques, schémas Zod) et d'intégration (formulaire contact avec SMTP mock, queries Prisma sur PostgreSQL de test). Intégration native avec Vite, support TypeScript, compatible Testing Library React et jsdom. La v4 apporte Vite 8, `test.extend` avec inférence automatique, et un reporter `agent` pour les AI coding agents. La v5 (3 septembre 2026) exige Vite >= 6.4 et Node.js >= 22.12, fait de `vite` une peer obligatoire et active `clearMocks` par défaut.

---

# Concepts Clés

## Configuration Vitest + Next.js

### Description

Configuration minimale pour tester une application Next.js avec React 19 et TypeScript. Utilise `jsdom` comme environnement, `tsconfig-paths` pour les alias `@/*`, et un fichier `setup.ts` pour charger les matchers Testing Library.

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
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/test/**'],
    },
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
- `@testing-library/jest-dom/vitest` étend `expect` avec `toBeInTheDocument`, etc.

---

## Projects unit / integration et mock de server-only

### Description

`vitest.config.ts` sépare deux projects : `unit` (jsdom, parallèle) pour les composants et la logique, `integration` (node, sérialisé) pour les tests qui écrivent dans le Postgres de test. Le module `server-only`, qui garde les modules serveur, n'a pas d'implémentation hors du bundler Next : il est remplacé par un module vide via un alias.

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
      { extends: true, test: { name: 'unit', environment: 'jsdom', exclude: ['src/**/*.integration.test.{ts,tsx}'] } },
      { extends: true, test: { name: 'integration', environment: 'node', include: ['src/**/*.integration.test.{ts,tsx}'], pool: 'forks', fileParallelism: false } },
    ],
  },
})
```

### Points Importants

- Sans l'alias, tout test qui importe une Server Action ou un module `import 'server-only'` échoue dès l'import
- `fileParallelism: false` sur `integration` (il ramène à lui seul `maxWorkers` à 1) : les fichiers partagent une base, en parallèle ils se marchent dessus (truncate et insert concurrents)
- Un test d'intégration se nomme `*.integration.test.ts`, c'est ce suffixe qui l'oriente vers le bon project
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
// src/components/features/contact/ContactForm.test.tsx (à écrire : test colocalisé, jamais de dossier __tests__)
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
- Pas d'objectif de coverage strict pour le MVP du portfolio
- `/* v8 ignore next -- raison */` pour ignorer ponctuellement
- Reporters multiples pour HTML local + lcov pour CI

---

# Commandes Clés

## Installation (Next.js + React)

### Description

Installation de Vitest dans un projet Next.js 16 avec Testing Library : core Vitest, plugin React Vite, jsdom pour le DOM, puis la suite Testing Library (React + jest-dom + user-event). Les alias TypeScript ne demandent plus de paquet depuis Vitest 4, et `vite`, peer obligatoire de Vitest 5, est installé seul par pnpm.

### Syntaxe

```bash
# 1. Core Vitest + plugin React (les alias `@/*` passent par resolve.tsconfigPaths, natif depuis Vitest 4)
pnpm add -D vitest @vitejs/plugin-react

# 2. Testing Library (pour tester les composants React)
pnpm add -D jsdom \
  @testing-library/react \
  @testing-library/dom \
  @testing-library/jest-dom \
  @testing-library/user-event
```

### Points Importants

- Versions en place avec Vitest 5.0.3, suite verte le 9 octobre 2026 : `@testing-library/react ^16.3.3`, `@testing-library/dom ^10.4.2`, `@testing-library/jest-dom ^7.0.1`, `@testing-library/user-event ^14.6.6`, `jsdom ^30.1.2`
- `@testing-library/dom` est une peer **obligatoire** de `@testing-library/jest-dom` 7 : déclarée en devDependency le 9 octobre 2026, elle n'arrivait avant que par l'auto-install des peers de pnpm
- `jsdom` requis pour tester les composants React (DOM simulé)
- Alternative plus rapide : `happy-dom` à la place de `jsdom`
- `@testing-library/jest-dom` s'importe via `'@testing-library/jest-dom/vitest'` dans le fichier setup (pas l'import standard)
- Les **async Server Components Next.js ne sont pas testables** avec Vitest : utiliser Playwright/Cypress pour ces cas

---

## Initialisation (browser mode uniquement)

### Description

`vitest init` existe mais **uniquement** pour le browser mode (valeur supportée : `browser`). Pas de commande `init` générique pour la config standard, il faut créer le fichier de configuration manuellement.

### Syntaxe

```bash
# Pour browser mode uniquement (pas utilisé dans le portfolio)
pnpm exec vitest init browser
```

### Points Importants

- Pour le portfolio (tests React + unit), `vitest init` n'est **pas nécessaire** : le projet a un `vitest.config.ts` écrit à la main
- Le fichier de config doit déclarer `plugins: [react()]`, `resolve.tsconfigPaths: true` et `test.environment: 'jsdom'` (le projet utilise `vitest.config.ts`)
- Créer aussi `vitest.setup.ts` avec `import '@testing-library/jest-dom/vitest'` pour les matchers étendus

---

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
