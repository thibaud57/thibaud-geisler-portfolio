# Proxy de détection automatique de locale: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurer le proxy Next.js 16+ pour la détection automatique de locale et la redirection vers /fr ou /en.

**Architecture:** Un seul fichier `src/proxy.ts` utilisant `createMiddleware(routing)` de next-intl avec un matcher strict excluant les assets statiques et les routes API.

**Tech Stack:** Next.js 16 App Router, next-intl 4.9.1

**Spec:** `docs/superpowers/specs/support-multilingue/02-proxy-detection-locale-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/proxy.ts` | Proxy i18n : détection locale, redirection, cookie |

---

### Task 1: Créer le proxy i18n

**Files:**
- Create: `src/proxy.ts`

**Docs:** `.claude/rules/nextjs/proxy.md`, `.claude/rules/next-intl/setup.md`

- [ ] **Step 1: Créer `src/proxy.ts`**

```typescript
import createMiddleware from 'next-intl/middleware'

import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

Points clés :
- `createMiddleware(routing)` : crée un handler qui détecte la locale (préfixe URL > cookie `NEXT_LOCALE` > header `Accept-Language` > `defaultLocale`) et redirige en 307
- `export default` : convention next-intl, compatible proxy.ts Next.js 16+
- Matcher `/((?!api|_next|_vercel|.*\\..*).*)` : negative lookahead excluant :
  - `api` : routes API Next.js
  - `_next` : assets statiques (`_next/static`, `_next/image`)
  - `_vercel` : fichiers Vercel
  - `.*\\..*` : tout fichier avec extension (favicon.ico, robots.txt, images, fonts)
- Import via alias `@/i18n/routing` (convention TypeScript du projet)

- [ ] **Step 2: Commit**

```bash
git add src/proxy.ts
git commit -m "feat(i18n): add locale detection proxy with next-intl middleware"
```

---

### Task 2: Vérification manuelle

- [ ] **Step 1: Démarrer le serveur de dev**

```bash
pnpm dev
```

Expected: le serveur démarre sans erreur.

- [ ] **Step 2: Tester la redirection racine**

Ouvrir `http://localhost:3000/` dans le navigateur.

Expected: redirection automatique vers `http://localhost:3000/fr` (si navigateur en français) ou `http://localhost:3000/en` (si navigateur en anglais). Code HTTP 307 visible dans l'onglet Network des DevTools.

- [ ] **Step 3: Tester une locale explicite**

Ouvrir `http://localhost:3000/en` directement.

Expected: pas de redirection, la page se charge sous `/en`.

- [ ] **Step 4: Tester l'exclusion des assets**

Ouvrir `http://localhost:3000/favicon.ico` dans le navigateur.

Expected: le favicon se charge normalement, pas de redirection vers `/fr/favicon.ico`.
