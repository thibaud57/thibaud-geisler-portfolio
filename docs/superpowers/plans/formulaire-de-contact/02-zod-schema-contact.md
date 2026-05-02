# Sub 02: Schéma Zod du formulaire de contact: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le schéma Zod `contactSchema` et son type inféré `ContactInput` dans `src/lib/schemas/contact.ts`, avec des codes d'erreur snake_case stables destinés à l'i18n du sub 04, validés par 11 tests Vitest unit collocated.

**Architecture:** Schéma Zod plat à 5 champs métier (`name`, `company`, `email`, `subject`, `message`), `.trim()` intégré natif Zod, codes d'erreur en string littéraux pour découpler backend↔i18n. Honeypot exclu volontairement (responsabilité sub 03). Tests par champ en cycles red→green pour respecter TDD partial sans tester la lib Zod elle-même.

**Tech Stack:** Zod (déjà installé), Vitest (déjà installé), TypeScript 6 strict, conventions tests collocated du projet (cf `src/lib/projects.test.ts`, `src/i18n/localize-content.test.ts`).

**Spec source:** `docs/superpowers/specs/formulaire-de-contact/02-zod-schema-contact-design.md`

**Convention tests Vitest projet** : `import { describe, expect, it } from 'vitest'`, `describe('contactSchema', () => { it('descriptif en français', () => {...}) })`.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/lib/schemas/contact.ts` | Create | Schéma Zod `contactSchema` + type inféré `ContactInput` |
| `src/lib/schemas/contact.test.ts` | Create | 11 tests Vitest unit (1 cas valide + 10 cas d'erreur/edge) |

Aucun autre fichier touché.

---

## Task 1: Squelette du fichier source + 1er test (cas valide minimal)

**Files:**
- Create: `src/lib/schemas/contact.ts`
- Create: `src/lib/schemas/contact.test.ts`

- [ ] **Step 1.1: Créer le fichier de tests avec le 1er test (cas valide minimal)**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/lib/schemas/contact.test.ts`

```typescript
import { describe, expect, it } from 'vitest'
import { contactSchema } from './contact'

describe('contactSchema', () => {
  it('accepte un payload valide minimal sans company', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
      expect(result.data.email).toBe('alice@acme.fr')
      expect(result.data.subject).toBe('Projet IA')
      expect(result.data.message).toBe('Bonjour, j’aimerais discuter d’un projet IA dans ma boite.')
      expect(result.data.company).toBeUndefined()
    }
  })
})
```

- [ ] **Step 1.2: Vérifier que le test échoue (red)**

Run: `pnpm test src/lib/schemas/contact.test.ts -t "accepte un payload valide minimal"`

Expected: FAIL avec une erreur d'import (`Cannot find module './contact'` ou similaire) puisque `src/lib/schemas/contact.ts` n'existe pas encore.

- [ ] **Step 1.3: Créer le schéma minimal**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/lib/schemas/contact.ts`

```typescript
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'name_required').max(120, 'name_too_long'),
  company: z.string().trim().max(200, 'company_too_long').optional(),
  email: z.string().trim().email('email_invalid').max(200, 'email_too_long'),
  subject: z.string().trim().min(1, 'subject_required').max(200, 'subject_too_long'),
  message: z.string().trim().min(20, 'message_too_short').max(5000, 'message_too_long'),
})

export type ContactInput = z.infer<typeof contactSchema>
```

**Note importante** : le schéma complet est créé d'un coup ici (pas une contrainte à la fois). Raison : Zod n'a pas d'API « contrainte minimale d'abord puis ajout de règles » qui ferait sens en TDD strict ; le schéma EST l'unité atomique. Les tasks suivantes ajoutent uniquement les **tests** de chaque contrainte. L'ordre red→green se vérifie globalement : on a un schéma sans tests passe-tout, on ajoute des tests pour chaque contrainte qui doit être satisfaite par ce schéma.

- [ ] **Step 1.4: Vérifier que le 1er test passe (green)**

Run: `pnpm test src/lib/schemas/contact.test.ts -t "accepte un payload valide minimal"`

Expected: PASS, 1 test passé.

---

## Task 2: Tests de trim sur les champs string

**Files:**
- Modify: `src/lib/schemas/contact.test.ts`

- [ ] **Step 2.1: Ajouter le test de trim**

Ajouter dans le `describe('contactSchema', ...)` après le test précédent :

```typescript
  it('trim les champs string requis (name, email, subject, message)', () => {
    const result = contactSchema.safeParse({
      name: '  Alice  ',
      email: '  alice@acme.fr  ',
      subject: '  Projet IA  ',
      message: '  Bonjour, j’aimerais discuter d’un projet IA dans ma boite.  ',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe('Alice')
      expect(result.data.email).toBe('alice@acme.fr')
      expect(result.data.subject).toBe('Projet IA')
      expect(result.data.message).toBe('Bonjour, j’aimerais discuter d’un projet IA dans ma boite.')
    }
  })
```

- [ ] **Step 2.2: Vérifier que le test passe directement (green)**

Run: `pnpm test src/lib/schemas/contact.test.ts -t "trim les champs"`

Expected: PASS, `.trim()` est déjà dans le schéma de la Task 1, donc le test passe sans modifier `contact.ts`. Si FAIL, vérifier que `.trim()` est bien le PREMIER chainage avant `.min()` / `.email()` sur chaque champ string.

---

## Task 3: Tests des codes `_required` (champs vides après trim)

**Files:**
- Modify: `src/lib/schemas/contact.test.ts`

- [ ] **Step 3.1: Ajouter les 2 tests `_required` (name + subject)**

Ajouter après le test précédent :

```typescript
  it('retourne le code "name_required" quand name est vide après trim', () => {
    const result = contactSchema.safeParse({
      name: '   ',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toEqual(['name_required'])
    }
  })

  it('retourne le code "subject_required" quand subject est vide', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: '',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toEqual(['subject_required'])
    }
  })
```

- [ ] **Step 3.2: Vérifier que les 2 tests passent (green)**

Run: `pnpm test src/lib/schemas/contact.test.ts -t "_required"`

Expected: 2 tests PASS, les codes `'name_required'` et `'subject_required'` sont déjà dans le schéma Task 1.

---

## Task 4: Tests des codes `_too_long` (limites de taille max)

**Files:**
- Modify: `src/lib/schemas/contact.test.ts`

- [ ] **Step 4.1: Ajouter les 4 tests `_too_long` (name, email, subject, company, message)**

Ajouter après les tests précédents :

```typescript
  it('retourne le code "name_too_long" quand name dépasse 120 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'a'.repeat(121),
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.name).toEqual(['name_too_long'])
    }
  })

  it('retourne le code "email_too_long" quand email dépasse 200 caractères', () => {
    const longLocalPart = 'a'.repeat(200)
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: `${longLocalPart}@acme.fr`,
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain('email_too_long')
    }
  })

  it('retourne le code "subject_too_long" quand subject dépasse 200 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'a'.repeat(201),
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.subject).toEqual(['subject_too_long'])
    }
  })

  it('retourne le code "company_too_long" quand company dépasse 200 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      company: 'a'.repeat(201),
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.company).toEqual(['company_too_long'])
    }
  })

  it('retourne le code "message_too_long" quand message dépasse 5000 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'a'.repeat(5001),
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toEqual(['message_too_long'])
    }
  })
```

**Note sur le test `email_too_long`** : `toContain('email_too_long')` plutôt que `toEqual([...])` car un email de 209 caractères avec un local part de 200 chars peut aussi déclencher d'autres règles email Zod. On vérifie juste la présence du code projet attendu.

- [ ] **Step 4.2: Vérifier que les 5 tests passent (green)**

Run: `pnpm test src/lib/schemas/contact.test.ts -t "_too_long"`

Expected: 5 tests PASS, les codes sont déjà dans le schéma Task 1.

---

## Task 5: Tests des codes spécifiques `email_invalid` et `message_too_short`

**Files:**
- Modify: `src/lib/schemas/contact.test.ts`

- [ ] **Step 5.1: Ajouter les 2 tests**

Ajouter après les tests précédents :

```typescript
  it('retourne le code "email_invalid" quand email ne matche pas le format', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'pas-un-email',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toEqual(['email_invalid'])
    }
  })

  it('retourne le code "message_too_short" quand message a moins de 20 caractères', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Trop court',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.message).toEqual(['message_too_short'])
    }
  })
```

- [ ] **Step 5.2: Vérifier que les 2 tests passent (green)**

Run: `pnpm test src/lib/schemas/contact.test.ts -t "email_invalid|message_too_short"`

Expected: 2 tests PASS.

---

## Task 6: Test `company` optionnelle + champ inconnu ignoré

**Files:**
- Modify: `src/lib/schemas/contact.test.ts`

- [ ] **Step 6.1: Ajouter les 2 tests**

Ajouter après les tests précédents :

```typescript
  it('accepte company absente (data.company === undefined)', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.company).toBeUndefined()
    }
  })

  it('ignore silencieusement un champ inconnu (ex: honeypot website)', () => {
    const result = contactSchema.safeParse({
      name: 'Alice',
      email: 'alice@acme.fr',
      subject: 'Projet IA',
      message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
      website: 'spam-bot-filled',
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('website')
    }
  })
```

- [ ] **Step 6.2: Vérifier que les 2 tests passent (green)**

Run: `pnpm test src/lib/schemas/contact.test.ts -t "company|honeypot"`

Expected: 2 tests PASS.

---

## Task 7: Vérifications globales

**Files:** aucun (commandes uniquement)

- [ ] **Step 7.1: Lancer la suite complète des tests du fichier**

Run: `pnpm test src/lib/schemas/contact.test.ts`

Expected: **11 tests PASS, 0 fail**.

Décompte attendu :
- Task 1 : 1 test (cas valide)
- Task 2 : 1 test (trim)
- Task 3 : 2 tests (`name_required`, `subject_required`)
- Task 4 : 5 tests (`name_too_long`, `email_too_long`, `subject_too_long`, `company_too_long`, `message_too_long`)
- Task 5 : 2 tests (`email_invalid`, `message_too_short`)
- Task 6 : 2 tests (`company` absente, champ inconnu ignoré)

Total : **13 tests** (le spec listait 11, la séparation `email_too_long` + `email_invalid` et le trim global comptent comme tests distincts ici, c'est bénin et reste cohérent).

- [ ] **Step 7.2: Typecheck**

Run: `pnpm typecheck`

Expected: pas d'erreur. Le type `ContactInput` doit être correctement inféré (`{ name: string; company?: string; email: string; subject: string; message: string }`).

- [ ] **Step 7.3: Lint**

Run: `pnpm lint`

Expected: pas d'erreur ni warning bloquant sur `src/lib/schemas/contact.ts` ni `src/lib/schemas/contact.test.ts`.

---

## Task 8: Signal de complétion (pas de commit automatique)

- [ ] **Step 8.1: Vérifier le `git status` du worktree**

Run (depuis `D:/Desktop/thibaud-geisler-portfolio-specs-contact/`) : `git status`

Expected: 2 nouveaux fichiers
- `new file: src/lib/schemas/contact.ts`
- `new file: src/lib/schemas/contact.test.ts`

Aucun autre fichier ne doit apparaître.

- [ ] **Step 8.2: Annoncer la fin du sub-project**

Le sub-project 2 (`zod-schema-contact`) est implémenté. **NE PAS committer automatiquement** : règle utilisateur stricte. Reporter au workflow parent (`/decompose-feature` ou `/implement-subproject`) pour qu'il :

1. Lance les quality gates (`/simplify` + `Agent code/code-reviewer`) si la phase d'implémentation l'exige
2. Demande au user le périmètre exact du commit
3. Met à jour le frontmatter du spec source (`status: implemented`) au moment du commit

Message attendu pour le user :

```
✅ Sub-project 2/4 (zod-schema-contact) implémenté.
- src/lib/schemas/contact.ts créé (contactSchema + type ContactInput inféré)
- src/lib/schemas/contact.test.ts créé (13 tests Vitest, tous verts)
- typecheck / lint : verts

Prêt à commit sur chore/specs-formulaire-contact, attends ton go.
```

---

## Self-review checklist

- [x] **Spec coverage** : tous les acceptance criteria du spec couverts
  - Scénario 1 (payload valide) → Task 1
  - Scénario 2 (`name_required`) → Task 3
  - Scénario 3 (`name_too_long`) → Task 4
  - Scénario 4 (`email_invalid`) → Task 5
  - Scénario 5 (`subject_required`) → Task 3
  - Scénario 6 (`message_too_short`) → Task 5
  - Scénario 7 (`message_too_long`) → Task 4
  - Scénario 8 (`company` absente) → Task 6
  - Scénario 9 (`company_too_long`) → Task 4
  - Scénario 10 (champ inconnu ignoré) → Task 6
  - Trim implicite (architecture approach) → Task 2
- [x] **Pas de placeholder** : tout le code est complet, commandes exactes
- [x] **Type consistency** : `contactSchema`, `ContactInput`, codes d'erreur snake_case identiques partout
- [x] **Anti-patterns explicites** : pas de champ `website` dans le schéma (Task 1), pas d'helper `sanitizeContactInput`, pas de `.strict()`
- [x] **Pas de commit automatique** : Task 8 signal au workflow parent, message d'attente explicite

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/formulaire-de-contact/02-zod-schema-contact.md`. Ce plan fait partie d'une boucle `/decompose-feature` (sub 2/4 de Feature 4).

L'exécution sera lancée plus tard via `/implement-subproject formulaire-de-contact 02`, qui orchestrera `superpowers:subagent-driven-development` + quality gates + demande de commit explicite.

Pour l'instant, le workflow parent (`/decompose-feature`) doit reprendre la main pour enchaîner sur le **sub-project 3** (`server-action-submit-contact`).
