# APIs de navigation localisées: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configurer les APIs de navigation localisées et remplacer tous les imports natifs Next.js par les versions localisées.

**Architecture:** `createNavigation(routing)` dans `src/i18n/navigation.ts` exporte `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname`. Tous les imports de `next/link` et `next/navigation` dans `src/` sont remplacés par `@/i18n/navigation`.

**Tech Stack:** Next.js 16 App Router, next-intl 4.9.1, TypeScript 6 strict

**Spec:** `docs/superpowers/specs/support-multilingue/04-navigation-localisee-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/i18n/navigation.ts` | Export des APIs navigation localisées |
| Modify | Fichiers utilisant `next/link` | Remplacement import Link |
| Modify | Fichiers utilisant `next/navigation` | Remplacement imports useRouter, usePathname, redirect |

---

### Task 1: Créer le module de navigation localisée

**Files:**
- Create: `src/i18n/navigation.ts`

**Docs:** `.claude/rules/next-intl/setup.md`

- [ ] **Step 1: Créer `src/i18n/navigation.ts`**

```typescript
import { createNavigation } from 'next-intl/navigation'

import { routing } from '@/i18n/routing'

export const { Link, redirect, useRouter, usePathname, getPathname } =
  createNavigation(routing)
```

Points clés :
- `createNavigation(routing)` génère des wrappers localisés qui injectent automatiquement le préfixe locale
- `Link` : remplace `next/link`, ajoute le préfixe locale aux `href` internes
- `redirect` : remplace `next/navigation.redirect`, redirige avec le préfixe locale
- `useRouter` : remplace `next/navigation.useRouter`, `router.push('/projets')` → `/fr/projets`
- `usePathname` : retourne le chemin sans le préfixe locale (`/projets` au lieu de `/fr/projets`)
- `getPathname` : version serveur de `usePathname`

- [ ] **Step 2: Commit**

```bash
git add src/i18n/navigation.ts
git commit -m "feat(i18n): create localized navigation APIs via createNavigation"
```

---

### Task 2: Identifier les fichiers à modifier

- [ ] **Step 1: Lister les fichiers importants next/link**

```bash
grep -rn "from ['\"]next/link['\"]" src/ --include="*.tsx" --include="*.ts"
```

Noter la liste des fichiers et les numéros de lignes.

- [ ] **Step 2: Lister les fichiers importants next/navigation (useRouter, usePathname, redirect)**

```bash
grep -rn "from ['\"]next/navigation['\"]" src/ --include="*.tsx" --include="*.ts" | grep -v "notFound\|useSearchParams"
```

Note : exclure `notFound` et `useSearchParams` du remplacement car ils ne sont PAS exportés par `createNavigation` et doivent rester importés depuis `next/navigation`.

---

### Task 3: Remplacer les imports next/link

**Files:**
- Modify: tous les fichiers identifiés en Task 2 Step 1

- [ ] **Step 1: Remplacer chaque import**

Pour chaque fichier utilisant `next/link` :

Remplacer :
```typescript
import Link from 'next/link'
```

Par :
```typescript
import { Link } from '@/i18n/navigation'
```

Note : `Link` passe d'un export default à un export nommé. Vérifier que l'usage dans le JSX reste `<Link href="...">` (pas de changement d'API côté consommateur).

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(i18n): replace next/link imports with localized Link"
```

---

### Task 4: Remplacer les imports next/navigation

**Files:**
- Modify: tous les fichiers identifiés en Task 2 Step 2

- [ ] **Step 1: Remplacer chaque import**

Pour chaque fichier utilisant `useRouter`, `usePathname`, ou `redirect` depuis `next/navigation` :

Remplacer :
```typescript
import { useRouter, usePathname } from 'next/navigation'
```

Par :
```typescript
import { useRouter, usePathname } from '@/i18n/navigation'
```

**Attention** : si le même import contient aussi `notFound`, `useSearchParams` ou d'autres APIs non localisées, séparer en deux imports :

```typescript
import { useRouter, usePathname } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "refactor(i18n): replace next/navigation imports with localized APIs"
```

---

### Task 5: Vérification finale

- [ ] **Step 1: Vérifier qu'aucun import next/link ne reste**

```bash
grep -rn "from ['\"]next/link['\"]" src/ --include="*.tsx" --include="*.ts"
```

Expected: aucun résultat.

- [ ] **Step 2: Vérifier que les imports next/navigation restants sont légitimes**

```bash
grep -rn "from ['\"]next/navigation['\"]" src/ --include="*.tsx" --include="*.ts"
```

Expected: seuls les imports de `notFound`, `useSearchParams`, ou autres APIs non localisées.

- [ ] **Step 3: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 4: Tester la navigation dans le navigateur**

Démarrer `pnpm dev`, naviguer entre les pages depuis `/fr` et depuis `/en`.

Expected: tous les liens internes préservent le préfixe locale dans l'URL. Cliquer sur un lien depuis `/fr/a-propos` mène à `/fr/projets` (pas `/projets` sans préfixe).
