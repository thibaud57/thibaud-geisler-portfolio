---
title: "Vitest — Framework de test"
version: "4.1.4"
description: "Référence technique pour Vitest 4 : config Next.js, mocks, coverage et Testing Library."
date: "2026-04-13"
keywords: ["vitest", "testing", "mocks", "coverage", "react"]
scope: ["docs"]
technologies: ["TypeScript", "Next.js", "React", "Testing Library"]
---

# Description

`Vitest` est le framework de test utilisé dans le portfolio pour les tests unitaires (fonctions pures, helpers, Server Actions critiques, schémas Zod) et d'intégration (formulaire contact avec SMTP mock, queries Prisma sur PostgreSQL de test). Intégration native avec Vite, support TypeScript, compatible Testing Library React et jsdom. La v4 apporte Vite 8, `test.extend` avec inférence automatique, et un reporter `agent` pour les AI coding agents.

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
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
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
// src/test/setup.ts
import '@testing-library/jest-dom/vitest'
```

### Points Importants

- `environment: 'jsdom'` pour les tests React DOM
- `globals: true` injecte `describe`/`it`/`expect` sans import
- Ajouter `"types": ["vitest/globals"]` dans `tsconfig.json`
- `@testing-library/jest-dom/vitest` étend `expect` avec `toBeInTheDocument`, etc.

---

## Tests unitaires (fonctions et schémas)

### Description

Tests canoniques pour les fonctions pures (helpers, formatters) et les schémas Zod. Structure classique `describe`/`it` avec assertions `expect`. Vitest utilise `Object.is()` pour `toBe` (primitives) et comparaison récursive pour `toEqual` (objets).

### Exemple

```ts
// src/lib/schemas/__tests__/contact.test.ts
import { describe, it, expect } from 'vitest'
import { ContactSchema } from '../contact'

describe('ContactSchema', () => {
  it('valide un input correct', () => {
    const result = ContactSchema.safeParse({
      name: 'Alice',
      email: 'alice@example.com',
      message: 'Un message de test suffisamment long',
    })
    expect(result.success).toBe(true)
  })

  it('rejette un email invalide', () => {
    const result = ContactSchema.safeParse({
      name: 'Alice',
      email: 'pas-un-email',
      message: 'Un message',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toBeDefined()
    }
  })
})
```

### Points Importants

- `toBe` pour primitives, `toEqual` pour objets
- `toStrictEqual` pour comparaison stricte (types + `undefined`)
- `toThrow(/pattern/)` pour les erreurs (wrap dans arrow function)
- Pour async : `await expect(promise).rejects.toThrow('msg')`

---

## Tests de composants React

### Description

Tests de composants avec `@testing-library/react` et `@testing-library/user-event`. Pattern : `render` le composant, récupérer les éléments via `screen.getByRole`, simuler des interactions avec `userEvent`.

### Exemple

```tsx
// src/components/features/__tests__/contact-form.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ContactForm } from '../contact-form'

vi.mock('@/server/actions/contact', () => ({
  sendContact: vi.fn().mockResolvedValue({ success: true }),
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
import { describe, it, expect, vi, afterEach } from 'vitest'

// Mock module entier (hoisted)
vi.mock('@/lib/mailer', () => ({
  transporter: {
    sendMail: vi.fn().mockResolvedValue({ messageId: 'test' }),
  },
}))

import { transporter } from '@/lib/mailer'
import { sendContact } from '@/server/actions/contact'

describe('sendContact', () => {
  afterEach(() => vi.clearAllMocks())

  it('appelle sendMail avec les bons params', async () => {
    const formData = new FormData()
    formData.set('name', 'Alice')
    formData.set('email', 'alice@example.com')
    formData.set('message', 'Un message de test')

    await sendContact(null, formData)

    expect(transporter.sendMail).toHaveBeenCalledOnce()
    expect(transporter.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ replyTo: 'alice@example.com' }),
    )
  })
})
```

### Points Importants

- `vi.mock` est hoisted : pas besoin de le mettre avant les imports dans le texte
- Pour mock partiel : `vi.mock('./module', async (orig) => ({ ...(await orig()), fn: vi.fn() }))`
- `vi.clearAllMocks()` dans `afterEach` pour éviter la pollution
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

Installation de Vitest dans un projet Next.js 16 avec Testing Library. 6 packages à installer : core Vitest, plugin React Vite, résolution des alias TypeScript, jsdom pour le DOM, puis la suite Testing Library (React + jest-dom + user-event). Versions compatibles Vitest 4.x confirmées en mars 2026.

### Syntaxe

```bash
# 1. Core Vitest + plugin React + alias TypeScript
pnpm add -D vitest @vitejs/plugin-react vite-tsconfig-paths

# 2. Testing Library (pour tester les composants React)
pnpm add -D jsdom \
  @testing-library/react \
  @testing-library/dom \
  @testing-library/jest-dom \
  @testing-library/user-event
```

### Points Importants

- Versions compatibles Vitest 4.x confirmées : `@testing-library/react ^16.3.2`, `@testing-library/jest-dom ^6.9.1`, `@testing-library/user-event ^14.6.1`
- `jsdom` requis pour tester les composants React (DOM simulé)
- Alternative plus rapide : `happy-dom` à la place de `jsdom`
- `@testing-library/jest-dom` s'importe via `'@testing-library/jest-dom/vitest'` dans le fichier setup (pas l'import standard)
- Les **async Server Components Next.js ne sont pas testables** avec Vitest : utiliser Playwright/Cypress pour ces cas

---

## Initialisation (browser mode uniquement)

### Description

`vitest init` existe mais **uniquement** pour le browser mode (valeur supportée : `browser`). Pas de commande `init` générique pour la config standard — il faut créer `vitest.config.mts` manuellement.

### Syntaxe

```bash
# Pour browser mode uniquement (pas utilisé dans le portfolio)
pnpm exec vitest init browser
```

### Points Importants

- Pour le portfolio (tests React + unit), `vitest init` n'est **pas nécessaire** : créer `vitest.config.mts` manuellement
- Le fichier `vitest.config.mts` doit déclarer `plugins: [tsconfigPaths(), react()]` + `test.environment: 'jsdom'`
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
pnpm exec vitest -t "sendContact"  # filtrer par nom de test
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
- Exécuter `vi.clearAllMocks()` dans `afterEach`
- Maintenir une DB de test séparée pour les tests d'intégration Prisma

## ❌ Anti-Patterns

- Ne pas tester les async Server Components avec Vitest (limitation React, utiliser E2E)
- Ne pas utiliser `jsdom` pour des tests de logique pure (utiliser `node`)
- Ne pas oublier de mocker SMTP (jamais d'envoi réel)
- Ne pas partager l'état de mocks entre tests (pollution)
- Ne pas viser 100% de coverage au détriment de la pertinence des tests

---

# 🔗 ressources

## Documentation Officielle

- [Vitest — Guide](https://vitest.dev/guide/)
- [Vitest — API expect](https://vitest.dev/api/expect.html)
- [Vitest — Mocking](https://vitest.dev/guide/mocking)

## Ressources Complémentaires

- [Next.js + Vitest](https://nextjs.org/docs/app/guides/testing/vitest)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
