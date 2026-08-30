---
paths:
  - "src/lib/mailer.ts"
  - "src/lib/mailer/**/*.ts"
---

# nodemailer — Email transactionnel SMTP

## À faire
- Instancier le **transporter une seule fois au niveau module** (`src/lib/mailer.ts`) et le réutiliser à chaque envoi (évite de réinitialiser la connexion SMTP)
- Charger les credentials SMTP via l'objet `env` de `@/env` (t3-env, validé au boot), jamais de littéral en code ni de lecture directe sur `process.env`. Le module exporte aussi `MAIL_FROM` et `MAIL_TO` pour que les appelants n'aient pas à relire la config
- Port **587 + `secure: false`** = STARTTLS (cas SMTP IONOS). Port **465 + `secure: true`** = TLS direct
- Annoter le transporter avec le type `Transporter` importé depuis `'nodemailer'` pour la type-safety
- Toujours valider les entrées avec **Zod** avant d'appeler `sendMail()` : toute Server Action exportée est un endpoint public
- Utiliser **`replyTo: <email-utilisateur>`** pour rediriger les réponses directement vers l'expéditeur du formulaire
- Le champ **`from`** doit correspondre à une adresse autorisée par le relais SMTP (sinon rejet côté serveur)
- Toujours **`await transporter.sendMail()`** dans une Server Action : l'opération est async, sinon l'action retourne avant l'envoi
- Importer nodemailer **uniquement** dans des fichiers serveur (`'use server'`, `route.ts`, `instrumentation.ts`)
- Pin **`nodemailer@^8.0.5`** minimum dans `package.json` pour bénéficier des correctifs CVE CRLF
- **Mocker** le transporter dans les tests (jamais d'envoi réel en CI/dev)
- Wrapper `sendMail()` dans un try/catch et logger les événements `email:sent` / `email:failed` **sans le contenu du message** (RGPD) — cf. `pino/logger.md` pour le pattern child logger

## À éviter
- Importer nodemailer dans un Client Component : dépend de `net`, `tls`, `dns` Node.js, casse au build
- Utiliser nodemailer dans une route avec `runtime = 'edge'` : APIs Node.js non disponibles
- Recréer un transporter à chaque appel de Server Action : connexion SMTP réinitialisée à chaque envoi (overhead, peut déclencher le rate limit du relais SMTP)
- Concaténer des valeurs **user-controlled** dans les options du transport (`host`, `name`, `auth`) : risque d'injection CRLF même avec 8.0.5+
- Préfixer `NEXT_PUBLIC_` les variables SMTP : exposerait les credentials au bundle client
- Logger le **contenu** des messages contact : données personnelles, RGPD, jamais en logs même en `debug`
- Committer `.env.local` ou les credentials SMTP dans le dépôt

## Gotchas
- nodemailer < 8.0.5 : faille **CRLF injection** (CVE GHSA-vvjj-xcjg-gr5g + GHSA-c7w3-x93f-qmm8) — pinner `>=8.0.5` obligatoire dans `package.json`
- TypeScript : `@types/nodemailer@^8.0.0` requis avec **`esModuleInterop: true`** dans `tsconfig.json` (sinon erreurs d'import du namespace)
- Node.js ≥ 20 requis (compatible depuis nodemailer v6.0.0)

## Exemples
```typescript
// ✅ Singleton au niveau module avec type Transporter
import { env } from '@/env'

export const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465, // STARTTLS sur 587, TLS direct sur 465
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
})

// ❌ Recréer le transporter à chaque appel (connexion SMTP réinitialisée à chaque envoi)
export async function action() {
  const transporter = nodemailer.createTransport({ ... })
  await transporter.sendMail({ ... })
}
```

```typescript
// ✅ Validation Zod avant sendMail + replyTo pour rediriger les réponses
'use server'

export async function submitContact(prev: FormState, formData: FormData) {
  const result = Schema.safeParse(Object.fromEntries(formData))
  if (!result.success) return { errors: result.error.flatten().fieldErrors }

  await transporter.sendMail({
    from: MAIL_FROM,
    to: MAIL_TO,
    replyTo: result.data.email, // permet de répondre directement à l'expéditeur
    subject: `Contact: ${result.data.name}`,
    text: result.data.message,
  })
}
```

```typescript
// ❌ Import nodemailer dans un Client Component (casse au build : net/tls/dns)
'use client'
import nodemailer from 'nodemailer'

// ❌ Edge runtime (APIs Node.js non disponibles)
export const runtime = 'edge'
import nodemailer from 'nodemailer'
```
