# Configuration fondation i18n next-intl — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre en place la fondation i18n next-intl : routing centralisé, chargement des messages par requête, augmentation TypeScript AppConfig, et plugin next.config.ts.

**Architecture:** Source unique de vérité dans `src/i18n/routing.ts` (defineRouting), chargement dynamique des messages par locale dans `src/i18n/request.ts` (getRequestConfig), type-safety via module augmentation dans `src/i18n/types.ts`. Le plugin next-intl wrappe la config Next.js existante.

**Tech Stack:** Next.js 16 App Router, next-intl 4.9.1, TypeScript 6 strict

**Spec:** `docs/superpowers/specs/support-multilingue/01-config-routing-types-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `messages/fr.json` | Messages français (squelette vide, référence pour les types) |
| Create | `messages/en.json` | Messages anglais (squelette vide) |
| Create | `src/i18n/routing.ts` | Source unique de vérité : locales, defaultLocale, localePrefix |
| Create | `src/i18n/request.ts` | Chargement des messages par requête via getRequestConfig |
| Create | `src/i18n/types.ts` | Module augmentation next-intl AppConfig (Locale + Messages) |
| Modify | `next.config.ts` | Ajout du plugin createNextIntlPlugin wrappant la config |

---

### Task 1: Créer les fichiers messages squelettes

**Files:**
- Create: `messages/fr.json`
- Create: `messages/en.json`

- [ ] **Step 1: Créer `messages/fr.json`**

```json
{}
```

Ce fichier est la référence pour le type `Messages` dans l'augmentation AppConfig. Il sera peuplé par le sub-project `messages-contenu`.

- [ ] **Step 2: Créer `messages/en.json`**

```json
{}
```

- [ ] **Step 3: Commit**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat(i18n): add skeleton message files for FR and EN locales"
```

---

### Task 2: Créer la configuration routing i18n

**Files:**
- Create: `src/i18n/routing.ts`

**Docs:** `.claude/rules/next-intl/setup.md` (defineRouting, localePrefix)

- [ ] **Step 1: Créer `src/i18n/routing.ts`**

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'always',
})
```

Points clés :
- `locales: ['fr', 'en']` : les deux langues supportées (FR = principale)
- `defaultLocale: 'fr'` : langue de fallback si détection échoue
- `localePrefix: 'always'` : préfixe explicite pour toutes les locales (`/fr/...`, `/en/...`)
- Pas de config `pathnames` : segments de route unifiés dans toutes les locales (décision actée dans le spec)

- [ ] **Step 2: Commit**

```bash
git add src/i18n/routing.ts
git commit -m "feat(i18n): add defineRouting config with fr/en locales"
```

---

### Task 3: Créer la configuration request i18n

**Files:**
- Create: `src/i18n/request.ts`

**Docs:** `.claude/rules/next-intl/setup.md` (getRequestConfig, hasLocale, requestLocale)

- [ ] **Step 1: Créer `src/i18n/request.ts`**

```typescript
import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from '@/i18n/routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
```

Points clés :
- `await requestLocale` : API next-intl 4 (argument `locale` déprécié)
- `hasLocale()` : type guard qui narrowe `string → Locale`, protège contre les locales arbitraires dans l'URL
- Import dynamique `messages/${locale}.json` : code-splitting automatique (bundle par locale)
- Fallback sur `routing.defaultLocale` (`'fr'`) si locale invalide
- Import via alias `@/i18n/routing` (convention `.claude/rules/typescript/conventions.md`)

- [ ] **Step 2: Commit**

```bash
git add src/i18n/request.ts
git commit -m "feat(i18n): add getRequestConfig with dynamic message loading"
```

---

### Task 4: Créer l'augmentation TypeScript AppConfig

**Files:**
- Create: `src/i18n/types.ts`

**Docs:** `.claude/rules/next-intl/setup.md` (AppConfig augmentation), `.claude/rules/typescript/conventions.md` (typeof, types déclaratifs)

- [ ] **Step 1: Créer `src/i18n/types.ts`**

```typescript
import type { routing } from '@/i18n/routing'
import type messages from '../../messages/fr.json'

declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages
  }
}
```

Points clés :
- `Locale` dérivé de `routing.locales` via `typeof` : si les locales changent dans `routing.ts`, le type suit automatiquement
- `Messages` dérivé de `messages/fr.json` via `typeof` : le fichier FR est la référence pour les types (autocomplete IDE sur les clés de traduction)
- Import relatif `../../messages/fr.json` pour le type car le fichier est hors du scope `src/` (l'alias `@/*` pointe vers `./src/*`)
- `import type` uniquement : pas d'import runtime, uniquement de l'augmentation de types

- [ ] **Step 2: Vérifier que `src/i18n/types.ts` est inclus dans la compilation TypeScript**

Le fichier doit être couvert par le `include` de `tsconfig.json`. Vérifier que le pattern `**/*.ts` ou `src/**/*.ts` est présent :

```bash
grep -n "include" tsconfig.json
```

Expected: un array `include` contenant `"**/*.ts"` ou `"src/**/*.ts"` (déjà présent dans un projet Next.js standard).

- [ ] **Step 3: Commit**

```bash
git add src/i18n/types.ts
git commit -m "feat(i18n): add TypeScript AppConfig augmentation for locale and message types"
```

---

### Task 5: Ajouter le plugin next-intl à next.config.ts

**Files:**
- Modify: `next.config.ts`

**Docs:** `.claude/rules/nextjs/configuration.md` (NextConfig, plugin wrapping)

- [ ] **Step 1: Ajouter l'import et le wrapper du plugin next-intl**

Ajouter en haut du fichier `next.config.ts` :

```typescript
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')
```

Puis wrapper l'export existant. Si la config actuelle est :

```typescript
const nextConfig: NextConfig = {
  // ... config existante
}

export default nextConfig
```

Remplacer l'export par :

```typescript
export default withNextIntl(nextConfig)
```

Si la config est déjà wrappée par un autre plugin (ex: `withPrisma`), chaîner :

```typescript
export default withNextIntl(withPrisma(nextConfig))
```

Le path `'./src/i18n/request.ts'` est passé explicitement au plugin pour pointer vers la config request (par défaut next-intl cherche `./i18n/request.ts` sans le `src/`).

- [ ] **Step 2: Commit**

```bash
git add next.config.ts
git commit -m "feat(i18n): add next-intl plugin to next.config.ts"
```

---

### Task 6: Vérification finale

- [ ] **Step 1: Exécuter le type-check TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur. Si des erreurs apparaissent :
- `Cannot find module '../../messages/fr.json'` → vérifier que `resolveJsonModule: true` est dans `tsconfig.json` (défaut Next.js)
- `Cannot find module 'next-intl'` → vérifier que `next-intl` est installé (`pnpm add next-intl`)
- `Cannot find module 'next-intl/routing'` → vérifier que `"type": "module"` est dans `package.json` (ESM-only depuis next-intl 4)

- [ ] **Step 2: Vérifier que le serveur de dev démarre**

```bash
pnpm dev
```

Expected: le serveur démarre sans erreur liée à next-intl. Les pages existantes continuent de fonctionner (le plugin est transparent tant que le middleware/proxy n'est pas configuré).

- [ ] **Step 3: Commit final si des ajustements ont été nécessaires**

```bash
git add -A
git commit -m "fix(i18n): resolve type-check issues in i18n config"
```

Ne créer ce commit que si des ajustements ont été faits lors des étapes 1-2. Si tout passe du premier coup, ne pas créer de commit vide.
