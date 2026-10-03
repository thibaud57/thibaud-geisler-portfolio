---
paths:
  - "src/server/actions/**/*.ts"
---

# nodemailer — Envoi depuis une Server Action

## À faire
- Valider les entrées avec **Zod** avant `sendMail()` : toute Server Action exportée est un endpoint public
- Utiliser **`replyTo: <email-utilisateur>`** pour répondre directement à l'expéditeur du formulaire
- Envoyer depuis **`MAIL_FROM`**, une adresse autorisée par le relais SMTP : toute autre est rejetée côté serveur
- Toujours **`await transporter.sendMail()`** : sinon l'action retourne avant l'envoi
- Envelopper `sendMail()` dans un try/catch et logger `email:sent` / `email:failed` **sans le contenu du message** (cf. `pino/usage.md`)
- **Mocker** le transporter dans les tests : jamais d'envoi réel, ni en CI ni en dev

## À éviter
- Logger le **contenu** d'un message de contact, même en `debug` : données personnelles
- Committer les credentials SMTP ou un fichier de configuration qui les porte

## Gotchas
- Un rejet SMTP embarque souvent l'adresse du destinataire dans son message d'erreur : le filtre Sentry la masque (`src/lib/sentry-scrub.ts`), le log Pino local la garde
- Transporter, credentials et version : voir `nodemailer/email.md`

## Exemples
```typescript
// ✅ Validation, replyTo, await, événements sans contenu
const result = Schema.safeParse(Object.fromEntries(formData))
if (!result.success) return { ok: false, errors: z.flattenError(result.error).fieldErrors }

try {
  await transporter.sendMail({ from: MAIL_FROM, to: MAIL_TO, replyTo: result.data.email, subject, text })
  log.info({ event: 'email:sent' })
} catch (err) {
  log.error({ err, event: 'email:failed' })
}

// ❌ Envoi non attendu, contenu loggé
transporter.sendMail(options)
log.info({ message: result.data.message })
```
