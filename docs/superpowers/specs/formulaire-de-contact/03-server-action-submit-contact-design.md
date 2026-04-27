---
feature: "Feature 4 — Formulaire de contact"
subproject: "server-action-submit-contact"
goal: "Implémenter la Server Action submitContact qui valide l'input via Zod, applique le rate limit IP, rejette les payloads honeypot, envoie l'email via le transporter nodemailer et loggue selon la politique RGPD du projet."
status: "implemented"
complexity: "M"
tdd_scope: "full"
depends_on: ["01-config-smtp-mailer-design.md", "02-zod-schema-contact-design.md"]
date: "2026-04-26"
---

# Server Action submitContact (Zod + rate limit + honeypot + nodemailer)

## Scope

Création de la Server Action `submitContact(prevState, formData)` dans `src/server/actions/contact.ts`, signature compatible `useActionState` du sub 04. Pipeline ordonné : (1) child logger Pino avec `requestId`, (2) extraction IP via `headers()` (`x-forwarded-for`), (3) check honeypot `formData.get('website')` avec succès silencieux factice, (4) rate limit IP 5 req / 10 min via le helper `checkRateLimit` créé dans ce même sub-project (`src/lib/rate-limiter.ts`), (5) validation Zod `contactSchema` (importé de sub 02), (6) `transporter.sendMail()` (importé de sub 01), (7) logs RGPD-compliant. Couverture TDD `full` selon la stratégie projet (Server Actions critiques exposées publiquement = full).

**Exclu** : branchement sur `ContactForm` côté UI (sub 04), ajout du champ honeypot caché dans le form (sub 04), persistence des messages en DB (PRODUCTION.md confirme : pas de stockage, l'email est l'archive), templates HTML/MJML (text plain simple suffit MVP), retry SMTP en cas d'échec, monitoring agrégé sur métriques chiffrées (PRODUCTION.md trace les seuils mais le hookage à un dashboard est post-MVP), CAPTCHA visible (honeypot suffit pour MVP, décidé dans `/decompose-feature`).

### État livré

À la fin de ce sub-project, on peut : appeler `submitContact(initialContactFormState, formData)` depuis un test Vitest avec un FormData valide → reçoit `{ ok: true, errors: {}, message: null }`, vérifie qu'`transporter.sendMail` (mocké) a bien été appelé avec `from=MAIL_FROM`, `to=MAIL_TO`, `replyTo=<email user>`, `subject="Contact: <name> — <subject>"` et un body text contenant les 4 champs ; les 15+ tests Vitest passent vert ; aucun log ne contient l'email ou le contenu du message en clair.

## Dependencies

- `01-config-smtp-mailer-design.md` (statut: `draft`) — fournit `transporter`, `MAIL_FROM`, `MAIL_TO` importés depuis `@/lib/mailer`.
- `02-zod-schema-contact-design.md` (statut: `draft`) — fournit `contactSchema` et `ContactInput` importés depuis `@/lib/schemas/contact`.

## Files touched

- **À créer** : `src/server/actions/contact.ts` (Server Action `submitContact` + type `ContactFormState` + constante `initialContactFormState` exportés)
- **À créer** : `src/server/actions/contact.test.ts` (tests Vitest unit avec mocks `vi.mock('@/lib/mailer')`, `vi.mock('@/lib/rate-limiter')`, `vi.mock('next/headers')`)
- **À créer** : `src/lib/rate-limiter.ts` (fonction pure `checkRateLimit(key, options)` + type `RateLimitResult`)
- **À créer** : `src/lib/rate-limiter.test.ts` (tests Vitest unit avec `vi.useFakeTimers()` pour le TTL)

## Architecture approach

- **Server Action `'use server'`** déclaré au top du fichier conformément à `.claude/rules/nextjs/server-actions.md`. Signature `(prevState: ContactFormState, formData: FormData) => Promise<ContactFormState>` compatible `useActionState`.
- **`ContactFormState` type explicite** :
  - `ok: boolean | null` — `null` initial, `true` succès, `false` échec
  - `errors: Partial<Record<'name'|'company'|'email'|'subject'|'message'|'_global', string[]>>` — codes par champ + clé `_global` pour les erreurs hors-formulaire (rate limit)
  - `message: string | null` — code top-level pour les **toasts globaux d'erreur uniquement** : `'rate_limit'` | `'smtp_error'` | `null` (au succès, à l'idle, ou quand seules des erreurs Zod par champ sont retournées). Reste un code (snake_case) que sub 04 mappe via i18n. Le toast success est piloté par `ok === true` indépendamment de `message`.
- **`initialContactFormState` constante exportée** : `{ ok: null, errors: {}, message: null }`. Sub 04 l'importera pour passer à `useActionState(submitContact, initialContactFormState)`.
- **Child logger Pino** : `const log = logger.child({ action: 'submitContact', requestId: crypto.randomUUID() })`. Conforme à `.claude/rules/pino/logger.md` ligne 56-65.
- **Extraction IP** : `await headers()` (Next 16 async) → header `x-forwarded-for`. Si présent, prendre la première valeur (chaîne reverse-proxy : `client-ip, proxy1, proxy2`). Fallback `'unknown'`. Conforme au gotcha de la rule server-actions (ligne 35).
- **`ip_hash`** : `crypto.createHash('sha256').update(ip).digest('hex').slice(0, 8)`. Stocké dans le contexte child logger pour qu'il apparaisse dans tous les logs sans répétition. Permet l'observabilité sans logger l'IP en clair (PII).
- **Honeypot** : `formData.get('website')` avant tout autre traitement. Si non-vide → log `info({ event: 'honeypot:caught' })` (ip_hash hérité) + return `{ ok: true, errors: {}, message: null }`. **Aucun appel sendMail, aucune incrémentation rate limit**. Le bot croit avoir réussi (sub 04 déclenche le toast success sur `ok === true`, indépendant du champ `message`).
- **Rate limit** : `checkRateLimit(ip, { max: 5, windowMs: 600_000 })`. Si `!allowed` → log `warn({ event: 'rate_limit:exceeded', retryAfterSeconds })` + return `{ ok: false, errors: { _global: ['rate_limit_exceeded'] }, message: 'rate_limit' }`.
- **Validation Zod** : `const result = contactSchema.safeParse(Object.fromEntries(formData))`. Si `!result.success` → return `{ ok: false, errors: result.error.flatten().fieldErrors, message: null }`. Pas de log (validation client-side aurait dû l'attraper, peu informatif). Conforme à `.claude/rules/zod/validation.md` lignes 12-13.
- **Envoi SMTP** : try/catch autour de `await transporter.sendMail({...})`. Conforme à `.claude/rules/nodemailer/email.md`. Args :
  - `from: MAIL_FROM`
  - `to: MAIL_TO`
  - `replyTo: result.data.email` — permet de répondre directement à l'expéditeur (rule nodemailer ligne 15)
  - `subject: \`Contact: ${result.data.name} — ${result.data.subject}\`` — format sobre suivant l'exemple de la rule
  - `text: <body plain text>` (voir Body email ci-dessous)
- **Body email** (text plain, pas HTML — YAGNI MVP) :
  ```
  De : ${name} <${email}>
  [Société : ${company}]    ← uniquement si company présente
  Sujet : ${subject}

  ${message}

  ---
  Reçu via thibaud-geisler.com (formulaire de contact)
  ```
- **Logs Pino RGPD** :
  - Succès : `log.info({ event: 'email:sent', has_company: Boolean(data.company), message_length: data.message.length })` — JAMAIS `email`, `name`, `subject`, `message` en clair (rule pino ligne 29 + rule nodemailer ligne 21).
  - Échec SMTP : `log.error({ err, event: 'email:failed' })` — Pino capture `message`, `stack`, `type` automatiquement via `err` en premier argument (rule pino ligne 16).
- **Server-only** : `import 'server-only'` au top de `src/server/actions/contact.ts` pour empêcher tout import accidentel côté client.
- **Conventions tests** : `.test.ts` (pas `.integration.test.ts`) puisque tous les services externes sont mockés (SMTP via `vi.mock('@/lib/mailer')`, rate-limiter via `vi.mock('@/lib/rate-limiter')`, headers via `vi.mock('next/headers')`). Aligné avec le pattern projet (cf `src/server/config/assets.test.ts`).
- **Rate-limiter pure-fonction** (`src/lib/rate-limiter.ts`) :
  - `Map<string, number[]>` module-level (timestamps des requêtes par key).
  - Signature : `checkRateLimit(key: string, options: { max: number; windowMs: number; cap?: number }): { allowed: boolean; retryAfterSeconds: number }`.
  - Algorithme : à chaque appel, filtre les timestamps de la key dans la fenêtre `windowMs`. Si la longueur ≥ `max` → `{ allowed: false, retryAfterSeconds: <secondes restantes avant que le plus ancien sorte de la fenêtre> }`. Sinon push `Date.now()` + return `{ allowed: true, retryAfterSeconds: 0 }`.
  - Cap LRU : si `Map.size > cap` (default 1000), supprimer la plus ancienne entrée (Map garde l'ordre d'insertion). Évite la fuite mémoire si trafic spam concentré sur des milliers d'IPs.
  - Pas de cleanup périodique : le filtrage à la lecture suffit pour un MVP single-instance. Le cap LRU borne la mémoire.
  - Conventions TypeScript : `.claude/rules/typescript/conventions.md` (export nommé, type `RateLimitResult`).

## Acceptance criteria

### Scénario 1 : payload valide, rate limit OK, SMTP succès
**GIVEN** un `FormData` avec `name="Alice"`, `company="Acme"`, `email="alice@acme.fr"`, `subject="Projet IA"`, `message="<≥20 chars>"`, sans `website`
**AND** la 1ère requête depuis l'IP `1.2.3.4`
**WHEN** `submitContact(initialState, formData)` est appelée
**THEN** `transporter.sendMail` est invoqué avec `from=MAIL_FROM`, `to=MAIL_TO`, `replyTo="alice@acme.fr"`, `subject="Contact: Alice — Projet IA"`, `text` contenant les 4 champs et le footer
**AND** un log `info` est émis avec `event: 'email:sent'`, `has_company: true`, `message_length: <int>`, `ip_hash: <8 chars hex>`
**AND** le log NE contient PAS `email`, `name`, `subject` ni `message` en clair
**AND** la fonction retourne `{ ok: true, errors: {}, message: null }`

### Scénario 2 : honeypot rempli (bot détecté)
**GIVEN** un `FormData` avec les 5 champs métier valides PLUS `website="spam.com"`
**WHEN** `submitContact(initialState, formData)` est appelée
**THEN** `transporter.sendMail` n'est PAS invoqué
**AND** `checkRateLimit` n'est PAS invoqué
**AND** un log `info` est émis avec `event: 'honeypot:caught'`, `ip_hash: <8 chars hex>`
**AND** la fonction retourne `{ ok: true, errors: {}, message: null }` (succès silencieux factice indistinguable d'un vrai succès côté bot)

### Scénario 3 : validation Zod échoue
**GIVEN** un `FormData` avec `email="pas-un-email"` (les autres champs valides)
**WHEN** `submitContact(initialState, formData)` est appelée
**THEN** `transporter.sendMail` n'est PAS invoqué
**AND** la fonction retourne `{ ok: false, errors: { email: ['email_invalid'] }, message: null }`
**AND** aucun log `info`/`warn`/`error` lié à l'envoi n'est émis (pas d'event email:*)

### Scénario 4 : rate limit dépassé
**GIVEN** une 6e soumission depuis l'IP `1.2.3.4` dans une fenêtre de 10 minutes (les 5 précédentes ont passé)
**WHEN** `submitContact(initialState, formData)` est appelée avec un payload valide
**THEN** `transporter.sendMail` n'est PAS invoqué
**AND** un log `warn` est émis avec `event: 'rate_limit:exceeded'`, `retryAfterSeconds: <int>`, `ip_hash: <8 chars hex>`
**AND** la fonction retourne `{ ok: false, errors: { _global: ['rate_limit_exceeded'] }, message: 'rate_limit' }`

### Scénario 5 : SMTP throw
**GIVEN** un payload valide, rate limit OK
**AND** `transporter.sendMail` mock throw avec `new Error('SMTP connection refused')`
**WHEN** `submitContact(initialState, formData)` est appelée
**THEN** un log `error` est émis avec `err: <Error>`, `event: 'email:failed'`, `ip_hash: <8 chars hex>` (Pino capture stack/type via `err` en premier arg)
**AND** la fonction retourne `{ ok: false, errors: {}, message: 'smtp_error' }`

### Scénario 6 : header `x-forwarded-for` absent
**GIVEN** `headers()` mock retourne un Headers sans `x-forwarded-for`
**WHEN** `submitContact(initialState, formData)` est appelée
**THEN** la key utilisée par `checkRateLimit` est `'unknown'` (string littérale)
**AND** `ip_hash` dans les logs est le hash SHA256 partiel de `'unknown'`

### Scénario 7 : header `x-forwarded-for` avec chaîne de proxies
**GIVEN** `headers()` mock retourne `x-forwarded-for: "1.2.3.4, 10.0.0.1, 172.16.0.1"`
**WHEN** `submitContact(initialState, formData)` est appelée
**THEN** la key utilisée par `checkRateLimit` est `'1.2.3.4'` (premier IP de la chaîne, vrai client)

### Scénario 8 : aucun PII dans les logs (RGPD)
**GIVEN** un payload valide envoyé avec succès
**WHEN** la suite de logs est inspectée (spy sur `logger.info`)
**THEN** aucun log ne contient les chaînes `'alice@acme.fr'`, `'Alice'`, `'Projet IA'` ni le contenu du message
**AND** seuls `event`, `has_company`, `message_length`, `ip_hash`, `requestId`, `action`, `service`, `level`, `time` sont présents

### Scénario 9 : `company` absente
**GIVEN** un payload valide sans la clé `company`
**WHEN** `submitContact(initialState, formData)` est appelée et SMTP réussit
**THEN** le `text` envoyé à `sendMail` ne contient PAS la ligne `Société : ...`
**AND** le log `info` `email:sent` contient `has_company: false`

### Scénario 10 : `initialContactFormState` exporté
**GIVEN** sub 04 importe `initialContactFormState` depuis `@/server/actions/contact`
**WHEN** sub 04 instancie `useActionState(submitContact, initialContactFormState)`
**THEN** la valeur initiale est `{ ok: null, errors: {}, message: null }` (idle state)
**AND** le typage TypeScript est `ContactFormState` (sans cast manuel requis)

## Tests à écrire

### Unit
- `src/server/actions/contact.test.ts` :
  - **Setup** : `vi.mock('@/lib/mailer', () => ({ transporter: { sendMail: vi.fn() }, MAIL_FROM: 'from@test', MAIL_TO: 'to@test' }))`, `vi.mock('@/lib/rate-limiter')`, `vi.mock('next/headers')`, helper `buildFormData(overrides)` pour générer un FormData valide par défaut
  - Cas valide → `sendMail` appelé avec args attendus + return `ok: true` (Scénario 1)
  - Cas valide → log `info email:sent` avec `has_company` et `message_length` mais sans PII (Scénario 1 + 8)
  - Honeypot rempli → return `ok: true` factice + log `info honeypot:caught` + `sendMail` jamais appelé + `checkRateLimit` jamais appelé (Scénario 2)
  - Email invalide Zod → return `errors: { email: ['email_invalid'] }` + `sendMail` jamais appelé (Scénario 3)
  - Plusieurs erreurs Zod en cascade (name vide + message court) → return `errors` avec les 2 codes (couvre `flatten().fieldErrors`)
  - Rate limit dépassé → return `errors._global: ['rate_limit_exceeded']` + log `warn rate_limit:exceeded` + `sendMail` jamais appelé (Scénario 4)
  - SMTP throw → return `message: 'smtp_error'` + log `error` avec `err` (Scénario 5)
  - Header `x-forwarded-for` absent → key = `'unknown'` (Scénario 6)
  - Header `x-forwarded-for` chaîne de proxies → key = première IP (Scénario 7)
  - `company` absente → text email sans ligne Société + log `has_company: false` (Scénario 9)
  - `initialContactFormState` exporté avec valeur correcte (Scénario 10)
  - **Anti-PII (transverse)** : tous les tests vérifient via `expect(spy).not.toHaveBeenCalledWith(expect.objectContaining({ email: '...' }))` que les PII ne fuient pas

- `src/lib/rate-limiter.test.ts` :
  - 1ère requête sur une nouvelle key → `allowed: true, retryAfterSeconds: 0`
  - 5e requête consécutive (mêmes options) → `allowed: true`
  - 6e requête → `allowed: false, retryAfterSeconds > 0`
  - Après `vi.advanceTimersByTime(windowMs)`, le compteur est reset → 1ère req re-passe
  - Cap LRU : remplir le Map avec 1001 keys distinctes, vérifier que la première key insérée est évincée (size === 1000)
  - Keys distinctes ne se polluent pas (req sur key A ne décompte pas sur key B)

## Edge cases

- **`x-forwarded-for` avec espace après virgule** : `"1.2.3.4 , 5.6.7.8"` → split par `,` puis `trim()` chaque segment.
- **`x-forwarded-for` vide string `""`** : traité comme absent → fallback `'unknown'`.
- **`crypto.randomUUID()` collision** : impossible en pratique (UUID v4), pas testé.
- **`Object.fromEntries(formData)` perd `website` ?** : non, `website` est une clé string normale (pas multi-value), sera dans l'objet. Mais le schéma sans `.strict()` l'ignore (déjà couvert sub 02). Donc le `formData.get('website')` AVANT le `safeParse` est obligatoire pour le honeypot check.
- **Plusieurs values pour `website` (cas extrême adversaire)** : `formData.get('website')` retourne la première valeur. `formData.getAll('website')` n'est pas utilisé. Acceptable, le check honeypot reste valable (toute valeur non vide trigger).
- **Très grand `message` (proche de 5000)** : Zod accepte (limite haute). `message_length` loggué comme entier. Pas de troncature à l'envoi (rule nodemailer accepte les body texte sans limite explicite, IONOS accepte typiquement 10 MB).
- **Caractères spéciaux dans `subject`** : injection CRLF possible avant nodemailer 8.0.5 (CVE), mitigée par le pin version (sub 01 vérifie `^8.0.5`). Aucun traitement supplémentaire requis.

## Architectural decisions

### Décision : `ContactFormState` verbeux vs minimal vs discriminated union

**Options envisagées :**
- **A. Verbeux `{ ok, errors, message }`** : 3 champs explicites, `ok: boolean | null` distingue idle/success/fail, `errors` map les codes par champ, `message` code top-level (rate_limit, smtp_error, success).
- **B. Minimal `{ success?, errors? }`** : style de l'exemple specs-doc. Pas d'état initial distinct, erreurs globales fourrées dans `errors._global`.
- **C. Discriminated union `{ status: 'idle' | 'success' | 'error', ... }`** : narrowing TypeScript parfait mais switch/case partout côté UI.

**Choix : A**

**Rationale :**
- Sub 04 doit afficher 3 cas distincts : idle (form vierge, pas de toast), success (toast vert + reset form), error (toast rouge + erreurs sous champs). A permet de tester `state.ok === null/true/false` directement en JSX sans switch.
- `errors._global` permet de gérer rate limit en restant dans le même type que les erreurs Zod (pas de cas particulier).
- `message` séparé permet d'afficher un toast indépendamment du fait qu'il y ait des erreurs par champ (cas SMTP : `errors: {}` mais `message: 'smtp_error'`).
- Cohérent avec les codes Zod sub 02 : `message` est un code snake_case mappé via i18n par sub 04. Pas de chaîne brute en français côté backend.

### Décision : honeypot loggé silently vs aucun log

**Options envisagées :**
- **A. Log `info honeypot:caught`** avec `ip_hash` mais sans contenu : observabilité sans PII, on peut compter le spam capturé.
- **B. Aucun log** : zéro overhead, mais perte d'info utile (combien de spam le honeypot bloque).

**Choix : A**

**Rationale :**
- Niveau `info` (pas `warn`) : c'est un comportement attendu, pas une dégradation.
- `ip_hash` (pas IP en clair) : conforme RGPD.
- Permet de monitorer si le honeypot devient inefficace (chute du `honeypot:caught`/heure alors que le trafic monte) — signal d'alerte pour passer à Turnstile.
- Coût négligeable (1 log par requête bot, le honeypot est censé bloquer ≥ 99% du spam).

### Décision : `ip_hash` SHA256 partiel vs IP brute vs aucun identifiant

**Options envisagées :**
- **A. `ip_hash` = SHA256(ip).slice(0, 8)** : 8 hex chars, observabilité (regrouper logs par hash) sans PII.
- **B. IP brute en clair** : viole RGPD (l'IP est PII selon CNIL/CJUE Breyer).
- **C. Aucun identifiant** : impossible de regrouper les logs d'une même session (debug et abuse detection compliqués).

**Choix : A**

**Rationale :**
- 8 hex chars = ~4 milliards de buckets, suffisant pour ne pas avoir trop de collisions sur le trafic d'un portfolio solo.
- Hash one-way : impossible de retrouver l'IP depuis le log.
- Standard reconnu pour les logs RGPD (cf bonnes pratiques CNIL pour analytics self-hosted).
- Le hash reste stable pour une même IP → permet de tracer un spam burst sans identifier la personne.

### Décision : rate-limiter pure-fonction vs class

**Options envisagées :**
- **A. Pure-fonction `checkRateLimit(key, options)`** : Map module-level, état caché derrière la fonction. Test simple via `import` et reset entre tests via `vi.resetModules()`.
- **B. Classe `RateLimiter`** : instanciée à l'import, `new RateLimiter(options)`. Plus orienté objet mais ajoute un niveau d'indirection inutile pour 1 seul use-case (1 seul endpoint rate-limité au MVP).

**Choix : A**

**Rationale :**
- YAGNI : 1 seul caller (Server Action contact). Pas besoin d'instancier plusieurs configurations.
- API plus simple côté caller : `checkRateLimit(ip, { max: 5, windowMs: 600_000 })` lisible immédiatement.
- Tests : `vi.useFakeTimers()` + appels successifs de la fonction. Reset du Map entre les `it()` via `beforeEach(async () => { vi.resetModules() })`.
- Migration future trivialement : si Upstash Ratelimit ou Arcjet (cf rule server-actions ligne 20) sont adoptés post-MVP, la signature reste compatible (fonction qui retourne `{ allowed, retryAfterSeconds }`).

### Décision : body email text plain vs HTML

**Options envisagées :**
- **A. Text plain** : 6 lignes simples, lisible dans tout client mail, zéro complexité.
- **B. HTML** : style cohérent avec la marque mais nécessite template engine (MJML, react-email) ou string concat verbeux.

**Choix : A**

**Rationale :**
- YAGNI MVP : tu reçois ces mails sur ta boîte perso, le text suffit.
- HTML non testable simplement : il faudrait snapshot le DOM du mail.
- Toutes les infos critiques (name, email, company, subject, message) sont dans 6 lignes. Pas de valeur ajoutée HTML.
- Migration future : sub 03 v2 pourra introduire un template HTML sans casser le contrat (ajout d'un champ `html` au call sendMail, le `text` reste fallback).
