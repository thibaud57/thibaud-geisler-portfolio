---
paths:
  - "src/lib/mailer.ts"
---

# nodemailer — Transporter SMTP

## À faire
- Instancier le **transporter une seule fois au niveau module** (`src/lib/mailer.ts`) et le réutiliser à chaque envoi
- Charger les credentials SMTP via l'objet `env` de `@/env` (t3-env, validé au boot), jamais en littéral ni par `process.env`. Le module exporte aussi `MAIL_FROM` et `MAIL_TO`
- Port **587 + `secure: false`** = STARTTLS (cas IONOS), port **465 + `secure: true`** = TLS direct : `secure: env.SMTP_PORT === 465`
- Annoter le transporter par le type `Transporter`, importé de `'nodemailer'`
- Importer nodemailer **uniquement** dans des fichiers serveur (`'use server'`, `route.ts`, modules `server-only`)
- Pin **`nodemailer@^10.0.11`** minimum (majeure installée) : les 10.0.0 à 10.0.10 cassaient l'entrée CommonJS et la forme des types. La validation TLS par défaut des requêtes HTTPS que nodemailer émet lui-même (pièce jointe distante, token OAuth2, proxy) date de la v9

## À éviter
- Importer nodemailer dans un Client Component : dépend de `net`, `tls`, `dns`, casse au build
- Utiliser nodemailer dans une route `runtime = 'edge'` : APIs Node.js indisponibles
- Recréer un transporter à chaque appel : connexion SMTP réinitialisée, overhead, rate limit du relais
- Concaténer des valeurs **user-controlled** dans les options du transport (`host`, `name`, `auth`) : risque d'injection CRLF
- Préfixer `NEXT_PUBLIC_` les variables SMTP : exposerait les credentials au bundle client

## Gotchas
- nodemailer < 8.0.4/8.0.5 : faille **CRLF injection** (GHSA-c7w3-x93f-qmm8 corrigée en 8.0.4, GHSA-vvjj-xcjg-gr5g corrigée en 8.0.5)
- **Types embarqués depuis la v10** (réécriture TypeScript) : ne jamais réinstaller `@types/nodemailer`, que DefinitelyTyped n'a publié ni en 9.x ni en 10.x
- Node.js ≥ 20 requis (`engines` de la v10)
- Envoi depuis une Server Action, logs et tests : voir `nodemailer/sending.md`

## Exemples
```typescript
// ✅ Singleton au niveau module, typé, credentials validés
export const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
})

// ❌ Transporter recréé à chaque appel
export async function action() {
  const transporter = nodemailer.createTransport({ ... })
}
```
