# Sub 03 — Server Action submitContact (Zod + rate limit + honeypot + nodemailer) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter la Server Action `submitContact` qui valide via Zod, applique le rate limit IP, rejette les payloads honeypot, envoie l'email via le transporter sub 01 et loggue selon la politique RGPD du projet, plus le helper pure-fonction `checkRateLimit` qui supporte le rate limit.

**Architecture:** Pipeline ordonné dans la Server Action (logger → IP → honeypot → rate limit → Zod → SMTP) avec retour `{ ok, errors, message }` typé `ContactFormState` consommable par `useActionState`. Rate-limiter pure-fonction `Map<key, timestamps[]>` module-level, cleanup à la lecture (filtrage par fenêtre TTL) + cap LRU 1000 entrées. Aucun side-effect non testé : tous les externes (mailer, headers, rate-limiter) sont mockés.

**Tech Stack:** Next.js 16 Server Actions + TypeScript 6 strict + Zod (schéma sub 02) + nodemailer (transporter sub 01) + Pino (logger projet existant) + Vitest avec `vi.useFakeTimers()` + `vi.mock(...)`.

**Spec source:** `docs/superpowers/specs/formulaire-de-contact/03-server-action-submit-contact-design.md`

**Stratégie TDD `full`** : red→green par groupe cohérent (tests qui vérifient une responsabilité distincte du pipeline). Aucun test ne tape SMTP réel ni n'appelle `headers()` Next réel — tout est mocké. Les commits sont laissés à la discrétion du user (pas de `git commit` automatique).

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/lib/rate-limiter.ts` | Create | Fonction pure `checkRateLimit(key, options)` + types `RateLimitOptions` / `RateLimitResult` + helper `__resetRateLimiter` (test-only) |
| `src/lib/rate-limiter.test.ts` | Create | 6 tests unit avec `vi.useFakeTimers()` |
| `src/server/actions/contact.ts` | Create | Server Action `submitContact` + types `ContactFormState` + constante `initialContactFormState` |
| `src/server/actions/contact.test.ts` | Create | ~12 tests unit avec `vi.mock` sur mailer / rate-limiter / next/headers / logger |

Aucun autre fichier touché. Logger Pino, mailer (sub 01) et schéma Zod (sub 02) déjà en place.

---

# Bloc 1 — Rate-limiter (autoporté, plus simple)

## Task 1: Squelette `rate-limiter.ts` + premier test (1ère requête autorisée)

**Files:**
- Create: `src/lib/rate-limiter.ts`
- Create: `src/lib/rate-limiter.test.ts`

- [ ] **Step 1.1: Créer le fichier de tests avec le 1er test**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/lib/rate-limiter.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetRateLimiter, checkRateLimit } from './rate-limiter'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-26T12:00:00Z'))
    __resetRateLimiter()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('autorise la première requête sur une nouvelle key', () => {
    const result = checkRateLimit('1.2.3.4', { max: 5, windowMs: 600_000 })

    expect(result.allowed).toBe(true)
    expect(result.retryAfterSeconds).toBe(0)
  })
})
```

- [ ] **Step 1.2: Vérifier que le test échoue (red)**

Run: `pnpm test src/lib/rate-limiter.test.ts`

Expected: FAIL avec `Cannot find module './rate-limiter'`.

- [ ] **Step 1.3: Implémenter le rate-limiter complet**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/lib/rate-limiter.ts`

```typescript
export type RateLimitOptions = {
  max: number
  windowMs: number
  cap?: number
}

export type RateLimitResult = {
  allowed: boolean
  retryAfterSeconds: number
}

const DEFAULT_CAP = 1000
const buckets = new Map<string, number[]>()

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { max, windowMs, cap = DEFAULT_CAP } = options
  const now = Date.now()
  const cutoff = now - windowMs
  const timestamps = (buckets.get(key) ?? []).filter((t) => t > cutoff)

  if (timestamps.length >= max) {
    const oldest = timestamps[0] ?? now
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000))
    buckets.set(key, timestamps)
    return { allowed: false, retryAfterSeconds }
  }

  timestamps.push(now)
  buckets.set(key, timestamps)

  if (buckets.size > cap) {
    const firstKey = buckets.keys().next().value
    if (firstKey !== undefined && firstKey !== key) {
      buckets.delete(firstKey)
    }
  }

  return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * Reset interne du Map. À utiliser uniquement dans les tests via le préfixe `__`.
 */
export function __resetRateLimiter(): void {
  buckets.clear()
}
```

**Notes pour le worker** :
- `__resetRateLimiter` est exporté volontairement avec le préfixe `__` pour signaler qu'il s'agit d'une API test-only. Pas d'`if (process.env.NODE_ENV === 'test')` autour : la fonction est triviale et n'a pas d'impact en prod si non appelée.
- Le `cap` LRU n'évince jamais la key qui vient d'être insérée (`firstKey !== key`) — protège contre le cas pathologique où une seule key spam exactement `cap` requêtes différentes.

- [ ] **Step 1.4: Vérifier que le test passe (green)**

Run: `pnpm test src/lib/rate-limiter.test.ts -t "autorise la première"`

Expected: PASS — 1 test.

---

## Task 2: Tests compteur (5e req OK, 6e req rejected, reset après TTL)

**Files:**
- Modify: `src/lib/rate-limiter.test.ts`

- [ ] **Step 2.1: Ajouter 3 tests sur le compteur**

Ajouter dans le `describe('checkRateLimit', ...)` après le 1er test :

```typescript
  it('autorise la 5e requête consécutive (max=5)', () => {
    const opts = { max: 5, windowMs: 600_000 }

    for (let i = 0; i < 4; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    const fifth = checkRateLimit('1.2.3.4', opts)

    expect(fifth.allowed).toBe(true)
    expect(fifth.retryAfterSeconds).toBe(0)
  })

  it('rejette la 6e requête (rate limit) avec retryAfterSeconds > 0', () => {
    const opts = { max: 5, windowMs: 600_000 }

    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    const sixth = checkRateLimit('1.2.3.4', opts)

    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterSeconds).toBeGreaterThan(0)
    expect(sixth.retryAfterSeconds).toBeLessThanOrEqual(600)
  })

  it('reset le compteur après que la fenêtre TTL expire', () => {
    const opts = { max: 5, windowMs: 600_000 }

    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    expect(checkRateLimit('1.2.3.4', opts).allowed).toBe(false)

    vi.advanceTimersByTime(600_001) // 10 min + 1ms

    const afterReset = checkRateLimit('1.2.3.4', opts)
    expect(afterReset.allowed).toBe(true)
    expect(afterReset.retryAfterSeconds).toBe(0)
  })
```

- [ ] **Step 2.2: Vérifier que les 3 tests passent (green)**

Run: `pnpm test src/lib/rate-limiter.test.ts`

Expected: 4 tests PASS.

---

## Task 3: Tests cap LRU + isolation des keys

**Files:**
- Modify: `src/lib/rate-limiter.test.ts`

- [ ] **Step 3.1: Ajouter 2 tests**

Ajouter après les tests précédents :

```typescript
  it('isole les keys distinctes (req sur A ne décompte pas sur B)', () => {
    const opts = { max: 5, windowMs: 600_000 }

    for (let i = 0; i < 5; i++) {
      checkRateLimit('1.2.3.4', opts)
    }
    expect(checkRateLimit('1.2.3.4', opts).allowed).toBe(false)

    const otherIp = checkRateLimit('5.6.7.8', opts)
    expect(otherIp.allowed).toBe(true)
  })

  it('respecte le cap LRU : évince la plus ancienne entrée au-delà du cap', () => {
    const opts = { max: 1, windowMs: 600_000, cap: 3 }

    checkRateLimit('key-1', opts)
    checkRateLimit('key-2', opts)
    checkRateLimit('key-3', opts)
    // À ce stade : 3 keys dans le Map, cap atteint
    checkRateLimit('key-4', opts)
    // key-1 doit avoir été évincée → une nouvelle req sur key-1 est autorisée
    const result = checkRateLimit('key-1', opts)
    expect(result.allowed).toBe(true)
  })
```

- [ ] **Step 3.2: Vérifier que les 2 tests passent (green)**

Run: `pnpm test src/lib/rate-limiter.test.ts`

Expected: 6 tests PASS.

- [ ] **Step 3.3: Lint + typecheck du module rate-limiter**

Run: `pnpm typecheck && pnpm lint`

Expected: aucune erreur sur `src/lib/rate-limiter.ts` et `src/lib/rate-limiter.test.ts`.

---

# Bloc 2 — Server Action `submitContact`

## Task 4: Squelette `contact.ts` + types exportés + 1er test (idle state)

**Files:**
- Create: `src/server/actions/contact.ts`
- Create: `src/server/actions/contact.test.ts`

- [ ] **Step 4.1: Créer le fichier de tests avec setup mocks + 1er test**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/server/actions/contact.test.ts`

```typescript
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { headers } from 'next/headers'
import { transporter } from '@/lib/mailer'
import { checkRateLimit, __resetRateLimiter } from '@/lib/rate-limiter'
import { logger } from '@/lib/logger'

vi.mock('@/lib/mailer', () => ({
  transporter: { sendMail: vi.fn() },
  MAIL_FROM: 'from@test.local',
  MAIL_TO: 'to@test.local',
}))

vi.mock('@/lib/rate-limiter', async () => {
  const actual = await vi.importActual<typeof import('@/lib/rate-limiter')>('@/lib/rate-limiter')
  return {
    ...actual,
    checkRateLimit: vi.fn(),
  }
})

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('@/lib/logger', () => {
  const child = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
  return {
    logger: {
      child: vi.fn(() => child),
    },
  }
})

import { initialContactFormState, submitContact } from './contact'

const buildFormData = (overrides: Record<string, string> = {}): FormData => {
  const fd = new FormData()
  const defaults: Record<string, string> = {
    name: 'Alice',
    company: 'Acme',
    email: 'alice@acme.fr',
    subject: 'Projet IA',
    message: 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.',
  }
  for (const [key, value] of Object.entries({ ...defaults, ...overrides })) {
    fd.append(key, value)
  }
  return fd
}

describe('submitContact', () => {
  beforeEach(() => {
    vi.mocked(checkRateLimit).mockReturnValue({ allowed: true, retryAfterSeconds: 0 })
    vi.mocked(headers).mockResolvedValue(new Headers({ 'x-forwarded-for': '1.2.3.4' }))
    vi.mocked(transporter.sendMail).mockResolvedValue(undefined as never)
    __resetRateLimiter()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('exporte un initialContactFormState idle (ok=null, errors vides, message null)', () => {
    expect(initialContactFormState).toEqual({
      ok: null,
      errors: {},
      message: null,
    })
  })
})
```

- [ ] **Step 4.2: Vérifier que le test échoue (red)**

Run: `pnpm test src/server/actions/contact.test.ts`

Expected: FAIL avec `Cannot find module './contact'`.

- [ ] **Step 4.3: Créer le squelette de la Server Action**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/server/actions/contact.ts`

```typescript
'use server'

import 'server-only'
import { createHash, randomUUID } from 'node:crypto'
import { headers } from 'next/headers'

import { logger } from '@/lib/logger'
import { MAIL_FROM, MAIL_TO, transporter } from '@/lib/mailer'
import { checkRateLimit } from '@/lib/rate-limiter'
import { contactSchema } from '@/lib/schemas/contact'

export type ContactFormState = {
  ok: boolean | null
  errors: Partial<
    Record<'name' | 'company' | 'email' | 'subject' | 'message' | '_global', string[]>
  >
  message: string | null
}

export const initialContactFormState: ContactFormState = {
  ok: null,
  errors: {},
  message: null,
}

const RATE_LIMIT_MAX = 5
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000

function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown'
  const first = forwardedFor.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}

function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 8)
}

function buildEmailBody(data: {
  name: string
  company?: string
  email: string
  subject: string
  message: string
}): string {
  const lines = [
    `De : ${data.name} <${data.email}>`,
    ...(data.company ? [`Société : ${data.company}`] : []),
    `Sujet : ${data.subject}`,
    '',
    data.message,
    '',
    '---',
    'Reçu via thibaud-geisler.com (formulaire de contact)',
  ]
  return lines.join('\n')
}

export async function submitContact(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const requestId = randomUUID()
  const headersList = await headers()
  const ip = extractClientIp(headersList.get('x-forwarded-for'))
  const ip_hash = hashIp(ip)
  const log = logger.child({ action: 'submitContact', requestId, ip_hash })

  const honeypot = formData.get('website')
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    log.info({ event: 'honeypot:caught' })
    return { ok: true, errors: {}, message: null }
  }

  const rateLimit = checkRateLimit(ip, {
    max: RATE_LIMIT_MAX,
    windowMs: RATE_LIMIT_WINDOW_MS,
  })
  if (!rateLimit.allowed) {
    log.warn({ event: 'rate_limit:exceeded', retryAfterSeconds: rateLimit.retryAfterSeconds })
    return {
      ok: false,
      errors: { _global: ['rate_limit_exceeded'] },
      message: 'rate_limit',
    }
  }

  const result = contactSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ContactFormState['errors'],
      message: null,
    }
  }

  try {
    await transporter.sendMail({
      from: MAIL_FROM,
      to: MAIL_TO,
      replyTo: result.data.email,
      subject: `Contact: ${result.data.name} — ${result.data.subject}`,
      text: buildEmailBody(result.data),
    })
    log.info({
      event: 'email:sent',
      has_company: Boolean(result.data.company),
      message_length: result.data.message.length,
    })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: 'email:failed' })
    return { ok: false, errors: {}, message: 'smtp_error' }
  }
}
```

**Notes pour le worker** :
- L'implémentation est livrée d'un coup (pas test par test) car le pipeline est un seul flux ordonné. Les tasks suivantes ajoutent les TESTS qui valident chaque étape du pipeline déjà en place.
- `import 'server-only'` au top — empêche tout import accidentel côté client.
- Le cast `as ContactFormState['errors']` sur `flatten().fieldErrors` est nécessaire car Zod retourne un type plus large (`Record<string, string[] | undefined>`). Le cast est sûr puisque les clés correspondent au schéma sub 02.

- [ ] **Step 4.4: Vérifier que le 1er test passe (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "exporte un initialContactFormState"`

Expected: PASS — 1 test (idle state).

---

## Task 5: Test cas valide complet (sendMail appelé + log info + return ok:true)

**Files:**
- Modify: `src/server/actions/contact.test.ts`

- [ ] **Step 5.1: Ajouter le test du cas valide**

Ajouter dans le `describe('submitContact', ...)` après le test précédent :

```typescript
  it('envoie l\'email et retourne ok:true sur payload valide + rate limit OK', async () => {
    const result = await submitContact(initialContactFormState, buildFormData())

    expect(transporter.sendMail).toHaveBeenCalledWith({
      from: 'from@test.local',
      to: 'to@test.local',
      replyTo: 'alice@acme.fr',
      subject: 'Contact: Alice — Projet IA',
      text: expect.stringContaining('De : Alice <alice@acme.fr>'),
    })
    const callArg = vi.mocked(transporter.sendMail).mock.calls[0]?.[0]
    expect(callArg?.text).toContain('Société : Acme')
    expect(callArg?.text).toContain('Sujet : Projet IA')
    expect(callArg?.text).toContain('Bonjour, j’aimerais discuter')
    expect(callArg?.text).toContain('Reçu via thibaud-geisler.com')

    expect(result).toEqual({ ok: true, errors: {}, message: null })

    const childLog = vi.mocked(logger.child).mock.results[0]?.value
    expect(childLog.info).toHaveBeenCalledWith({
      event: 'email:sent',
      has_company: true,
      message_length: expect.any(Number),
    })
  })
```

- [ ] **Step 5.2: Vérifier que le test passe (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "envoie l'email"`

Expected: PASS — implémentation déjà en place via Task 4.3.

---

## Task 6: Test honeypot rempli (succès silencieux factice)

**Files:**
- Modify: `src/server/actions/contact.test.ts`

- [ ] **Step 6.1: Ajouter le test honeypot**

```typescript
  it('détecte le honeypot et retourne ok:true factice sans envoyer (sendMail jamais appelé)', async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ website: 'https://spam.com' }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(checkRateLimit).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, errors: {}, message: null })

    const childLog = vi.mocked(logger.child).mock.results[0]?.value
    expect(childLog.info).toHaveBeenCalledWith({ event: 'honeypot:caught' })
  })
```

- [ ] **Step 6.2: Vérifier que le test passe (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "honeypot"`

Expected: PASS.

---

## Task 7: Tests validation Zod (email invalide + erreurs en cascade)

**Files:**
- Modify: `src/server/actions/contact.test.ts`

- [ ] **Step 7.1: Ajouter 2 tests Zod**

```typescript
  it('rejette un email invalide avec errors.email = ["email_invalid"] et n\'envoie pas', async () => {
    const result = await submitContact(
      initialContactFormState,
      buildFormData({ email: 'pas-un-email' }),
    )

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.errors.email).toEqual(['email_invalid'])
    expect(result.message).toBeNull()
  })

  it('retourne plusieurs erreurs Zod en cascade (name vide + message court)', async () => {
    const fd = new FormData()
    fd.append('name', '')
    fd.append('email', 'alice@acme.fr')
    fd.append('subject', 'Projet IA')
    fd.append('message', 'Trop court')

    const result = await submitContact(initialContactFormState, fd)

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result.ok).toBe(false)
    expect(result.errors.name).toEqual(['name_required'])
    expect(result.errors.message).toEqual(['message_too_short'])
  })
```

- [ ] **Step 7.2: Vérifier que les 2 tests passent (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "email invalide|cascade"`

Expected: 2 tests PASS.

---

## Task 8: Test rate limit dépassé

**Files:**
- Modify: `src/server/actions/contact.test.ts`

- [ ] **Step 8.1: Ajouter le test rate limit**

```typescript
  it('rejette quand checkRateLimit retourne allowed:false (errors._global + log warn)', async () => {
    vi.mocked(checkRateLimit).mockReturnValue({
      allowed: false,
      retryAfterSeconds: 240,
    })

    const result = await submitContact(initialContactFormState, buildFormData())

    expect(transporter.sendMail).not.toHaveBeenCalled()
    expect(result).toEqual({
      ok: false,
      errors: { _global: ['rate_limit_exceeded'] },
      message: 'rate_limit',
    })

    const childLog = vi.mocked(logger.child).mock.results[0]?.value
    expect(childLog.warn).toHaveBeenCalledWith({
      event: 'rate_limit:exceeded',
      retryAfterSeconds: 240,
    })
  })
```

- [ ] **Step 8.2: Vérifier que le test passe (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "rate limit"`

Expected: PASS.

---

## Task 9: Test SMTP throw

**Files:**
- Modify: `src/server/actions/contact.test.ts`

- [ ] **Step 9.1: Ajouter le test SMTP error**

```typescript
  it('retourne smtp_error quand transporter.sendMail throw', async () => {
    const smtpError = new Error('SMTP connection refused')
    vi.mocked(transporter.sendMail).mockRejectedValueOnce(smtpError)

    const result = await submitContact(initialContactFormState, buildFormData())

    expect(result).toEqual({ ok: false, errors: {}, message: 'smtp_error' })

    const childLog = vi.mocked(logger.child).mock.results[0]?.value
    expect(childLog.error).toHaveBeenCalledWith({
      err: smtpError,
      event: 'email:failed',
    })
  })
```

- [ ] **Step 9.2: Vérifier que le test passe (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "smtp_error"`

Expected: PASS.

---

## Task 10: Tests headers IP (absent + chaîne de proxies)

**Files:**
- Modify: `src/server/actions/contact.test.ts`

- [ ] **Step 10.1: Ajouter 2 tests sur l'extraction IP**

```typescript
  it('utilise "unknown" comme key quand x-forwarded-for est absent', async () => {
    vi.mocked(headers).mockResolvedValue(new Headers())

    await submitContact(initialContactFormState, buildFormData())

    expect(checkRateLimit).toHaveBeenCalledWith('unknown', {
      max: 5,
      windowMs: 600_000,
    })
  })

  it('extrait la première IP de la chaîne x-forwarded-for', async () => {
    vi.mocked(headers).mockResolvedValue(
      new Headers({ 'x-forwarded-for': '1.2.3.4, 10.0.0.1, 172.16.0.1' }),
    )

    await submitContact(initialContactFormState, buildFormData())

    expect(checkRateLimit).toHaveBeenCalledWith('1.2.3.4', {
      max: 5,
      windowMs: 600_000,
    })
  })
```

- [ ] **Step 10.2: Vérifier que les 2 tests passent (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "x-forwarded-for|unknown"`

Expected: 2 tests PASS.

---

## Task 11: Tests company absente + Anti-PII (transverse)

**Files:**
- Modify: `src/server/actions/contact.test.ts`

- [ ] **Step 11.1: Ajouter 2 tests**

```typescript
  it('omet la ligne Société et log has_company:false quand company est absente', async () => {
    const fd = new FormData()
    fd.append('name', 'Alice')
    fd.append('email', 'alice@acme.fr')
    fd.append('subject', 'Projet IA')
    fd.append('message', 'Bonjour, j’aimerais discuter d’un projet IA dans ma boite.')

    await submitContact(initialContactFormState, fd)

    const callArg = vi.mocked(transporter.sendMail).mock.calls[0]?.[0]
    expect(callArg?.text).not.toContain('Société :')

    const childLog = vi.mocked(logger.child).mock.results[0]?.value
    expect(childLog.info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'email:sent',
        has_company: false,
      }),
    )
  })

  it('ne loggue jamais email/name/subject/message en clair (RGPD)', async () => {
    await submitContact(initialContactFormState, buildFormData())

    const childLog = vi.mocked(logger.child).mock.results[0]?.value
    const allLogPayloads = [
      ...childLog.info.mock.calls.map((c: unknown[]) => c[0]),
      ...childLog.warn.mock.calls.map((c: unknown[]) => c[0]),
      ...childLog.error.mock.calls.map((c: unknown[]) => c[0]),
    ]

    for (const payload of allLogPayloads) {
      const json = JSON.stringify(payload ?? {})
      expect(json).not.toContain('alice@acme.fr')
      expect(json).not.toContain('Alice')
      expect(json).not.toContain('Projet IA')
      expect(json).not.toContain('Bonjour, j’aimerais discuter')
    }
  })
```

- [ ] **Step 11.2: Vérifier que les 2 tests passent (green)**

Run: `pnpm test src/server/actions/contact.test.ts -t "company|RGPD"`

Expected: 2 tests PASS.

---

## Task 12: Vérifications globales

**Files:** aucun (commandes uniquement)

- [ ] **Step 12.1: Lancer la suite complète des tests**

Run: `pnpm test src/lib/rate-limiter.test.ts src/server/actions/contact.test.ts`

Expected: **6 + 11 = 17 tests PASS, 0 fail**.

Décompte attendu :
- Rate-limiter (Tasks 1-3) : 6 tests
- Server Action (Tasks 4-11) : 11 tests (1 idle + 1 valide + 1 honeypot + 2 Zod + 1 rate-limit + 1 SMTP + 2 headers + 2 company/RGPD)

- [ ] **Step 12.2: Typecheck global**

Run: `pnpm typecheck`

Expected: pas d'erreur. Le type `ContactFormState` doit être correctement inféré, les imports `transporter`, `MAIL_FROM`, `MAIL_TO`, `contactSchema`, `checkRateLimit`, `logger` résolus.

- [ ] **Step 12.3: Lint**

Run: `pnpm lint`

Expected: pas d'erreur ni warning bloquant sur les 4 nouveaux fichiers.

- [ ] **Step 12.4: Vérification side-effect côté client (optionnel)**

Run: `pnpm build`

Expected: build réussit. Comme `src/server/actions/contact.ts` n'est pas encore importé par un Client Component (sub 04 le fera), aucun warning de bundling client. Si erreur sur `net`/`tls`/`dns` ou `crypto` côté client → un import accidentel s'est glissé, à corriger avant de continuer.

**Note** : si `pnpm build` échoue parce que les vars `.env.local` ne sont pas définies (sub 01 a un schéma Zod fail-fast au top du module mailer), c'est attendu. Le build ne peut s'exécuter qu'avec un environnement valide. Pour tester ce sub-project sans `.env.local`, ne pas exécuter `pnpm build` à cette étape — les tests Vitest mockent déjà le module `mailer`.

---

## Task 13: Test manuel optionnel d'envoi SMTP réel (recommandé avant clôture)

**Files:** aucun fichier permanent (script jetable)

- [ ] **Step 13.1: Vérifier la présence de `.env.local` complet**

Le fichier `.env.local` à la racine du worktree doit contenir les 6 vars du sub 01 (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `MAIL_TO`) avec des valeurs IONOS réelles.

- [ ] **Step 13.2: Créer un script jetable**

Chemin : `scripts/check-contact.ts` (à supprimer après usage)

```typescript
import { initialContactFormState, submitContact } from '../src/server/actions/contact'

async function main() {
  const fd = new FormData()
  fd.append('name', 'Test Manuel')
  fd.append('email', 'tibo57350@gmail.com')
  fd.append('subject', 'Test sub 03 sub-project')
  fd.append('message', 'Ceci est un test manuel du sub-project 03 server-action-submit-contact.')

  const result = await submitContact(initialContactFormState, fd)
  console.log('Result:', result)
}

main().catch(console.error)
```

- [ ] **Step 13.3: Exécuter et vérifier l'envoi**

Run: `pnpm tsx scripts/check-contact.ts` (depuis `D:/Desktop/thibaud-geisler-portfolio-specs-contact/`)

Expected:
- Sortie console : `Result: { ok: true, errors: {}, message: null }`
- Email reçu sur la boîte `MAIL_TO` configurée, avec sujet `Contact: Test Manuel — Test sub 03 sub-project` et le body text attendu (4 champs visibles).

**Note importante** : `headers()` Next.js 16 ne fonctionne PAS hors d'un contexte Server (route handler ou page render). Si le script échoue avec une erreur du genre `headers can only be called in a Server Component`, il faut soit :
- (a) Skipper ce test manuel et se baser uniquement sur les tests Vitest mockés (acceptable, sub 04 fera le test end-to-end avec un vrai render).
- (b) Adapter le script en passant un `mockHeaders` via `vi.mock()` (compliqué hors Vitest, pas recommandé).

L'option (a) est suggérée. Si le script crash, supprimer simplement et passer à Task 14.

- [ ] **Step 13.4: Supprimer le script jetable**

Run: `rm scripts/check-contact.ts`

Vérifier `git status` : aucun fichier `scripts/check-contact.ts` ne doit traîner.

---

## Task 14: Signal de complétion (pas de commit automatique)

- [ ] **Step 14.1: Vérifier le `git status` du worktree**

Run (depuis `D:/Desktop/thibaud-geisler-portfolio-specs-contact/`) : `git status`

Expected: 4 nouveaux fichiers
- `new file: src/lib/rate-limiter.ts`
- `new file: src/lib/rate-limiter.test.ts`
- `new file: src/server/actions/contact.ts`
- `new file: src/server/actions/contact.test.ts`

Aucun autre fichier (en particulier pas de `scripts/check-contact.ts`).

- [ ] **Step 14.2: Annoncer la fin du sub-project**

Le sub-project 3 (`server-action-submit-contact`) est implémenté. **NE PAS committer automatiquement** : règle utilisateur stricte.

Message attendu pour le user :

```
✅ Sub-project 3/4 (server-action-submit-contact) implémenté.
- src/lib/rate-limiter.ts + .test.ts créés (6 tests verts, fonction pure + cap LRU)
- src/server/actions/contact.ts + .test.ts créés (11 tests verts, pipeline complet : honeypot → rate limit → Zod → SMTP)
- typecheck / lint : verts
- 17 tests verts au total

Prêt à commit sur chore/specs-formulaire-contact, attends ton go.
```

---

## Self-review checklist

- [x] **Spec coverage** : tous les acceptance criteria du spec couverts
  - Scénario 1 (payload valide + log info + sendMail args) → Task 5
  - Scénario 2 (honeypot → success factice) → Task 6
  - Scénario 3 (Zod email invalide) → Task 7
  - Scénario 4 (rate limit dépassé) → Task 8
  - Scénario 5 (SMTP throw) → Task 9
  - Scénario 6 (x-forwarded-for absent → 'unknown') → Task 10
  - Scénario 7 (chaîne de proxies → 1ère IP) → Task 10
  - Scénario 8 (no PII in logs) → Task 11
  - Scénario 9 (company absente) → Task 11
  - Scénario 10 (initialContactFormState exporté) → Task 4
  - Tests rate-limiter listés au spec → Tasks 1-3 (1ère req, 5e/6e, TTL reset, isolation keys, cap LRU)
- [x] **Pas de placeholder** : tout le code est complet, commandes exactes
- [x] **Type consistency** : `ContactFormState`, `initialContactFormState`, `submitContact`, `checkRateLimit`, `RateLimitOptions`, `RateLimitResult` cohérents partout
- [x] **Anti-patterns explicites** : `import 'server-only'` présent (Task 4.3), child logger instancié dans la Server Action (pas en module-level), pas de SMTP réel en CI (mocks), pas de cleanup périodique du rate-limiter
- [x] **Pas de commit automatique** : Task 14 signal au workflow parent, message d'attente explicite

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/formulaire-de-contact/03-server-action-submit-contact.md`. Ce plan fait partie d'une boucle `/decompose-feature` (sub 3/4 de Feature 4).

L'exécution sera lancée plus tard via `/implement-subproject formulaire-de-contact 03`, qui orchestrera `superpowers:subagent-driven-development` + quality gates + demande de commit explicite.

Pour l'instant, le workflow parent (`/decompose-feature`) doit reprendre la main pour enchaîner sur le **sub-project 4** (`branchement-contact-form-action`) — le dernier de la boucle.
