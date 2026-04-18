---
title: "nodemailer — SMTP Email"
version: "8.0.5"
description: "Référence technique pour nodemailer : SMTP, Server Actions Next.js et sécurité pour le formulaire de contact."
date: "2026-04-13"
keywords: ["nodemailer", "smtp", "email", "nextjs", "server-action"]
scope: ["docs"]
technologies: ["Node.js", "Next.js", "TypeScript"]
---

# Description

`nodemailer` est la librairie de référence Node.js pour l'envoi d'emails via SMTP. Utilisée dans le portfolio pour envoyer les soumissions du formulaire de contact vers la boîte mail professionnelle via le relais SMTP IONOS. Exclusivement côté serveur : import strictement interdit dans les composants client ou l'Edge Runtime. La v8.0.5 corrige deux CVE critiques de type CRLF injection (GHSA-vvjj-xcjg-gr5g et GHSA-c7w3-x93f-qmm8).

---

# Concepts Clés

## Transport SMTP

### Description

Le transporter est un objet réutilisable qui gère la connexion au serveur SMTP. Dans le portfolio, il pointe vers IONOS avec STARTTLS (port 587, `secure: false`). Le transporter doit être instancié une fois au chargement du module et réutilisé pour chaque envoi, pas créé à chaque requête.

### Exemple

```ts
// src/lib/mailer.ts
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

export const transporter: Transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT ?? '587', 10),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})
```

### Points Importants

- Port 587 + `secure: false` = STARTTLS (cas IONOS)
- Port 465 + `secure: true` = TLS direct
- Créer le transport au niveau module, pas dans la Server Action
- Jamais exposer `SMTP_USER`/`SMTP_PASS` côté client : utiliser des variables d'env sans préfixe `NEXT_PUBLIC_`

---

## Envoi avec sendMail

### Description

`transporter.sendMail(options)` retourne une promesse avec les métadonnées d'envoi (`messageId`, `response`). Dans le portfolio, appelé depuis une Server Action après validation Zod. L'option `from` doit correspondre à une adresse autorisée par le relais IONOS (sinon rejet côté serveur SMTP).

### Exemple

```ts
// src/server/actions/contact.ts
'use server'
import { z } from 'zod'
import { transporter } from '@/lib/mailer'

const ContactSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  message: z.string().min(1),
})

export async function sendContact(prevState: unknown, formData: FormData) {
  const result = ContactSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  const { name, email, message } = result.data

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.CONTACT_TO,
    replyTo: email,
    subject: `Contact portfolio — ${name}`,
    text: message,
  })

  return { success: true }
}
```

### Points Importants

- Utiliser `replyTo: email` pour pouvoir répondre directement à l'expéditeur
- Le champ `from` doit être une adresse du domaine `thibaud-geisler.com` (imposé par IONOS)
- Toujours valider les entrées avec Zod avant de passer à `sendMail`
- `sendMail` est `async` : toujours `await` dans une Server Action

---

## Server Action Next.js (App Router)

### Description

Nodemailer utilise les APIs Node.js (`net`, `tls`, `dns`) non disponibles dans l'Edge Runtime. Dans le portfolio (App Router), il s'utilise exclusivement dans des Server Actions (`'use server'`) ou des Route Handlers. Interdit d'importer dans un Client Component, sous peine d'erreurs de bundling.

### Exemple

```ts
// Appel depuis un Client Component
'use client'
import { useActionState } from 'react'
import { sendContact } from '@/server/actions/contact'

export function ContactForm() {
  const [state, formAction, pending] = useActionState(sendContact, null)

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit" disabled={pending}>Envoyer</button>
      {state?.errors && <p>Erreurs de validation</p>}
      {state?.success && <p>Message envoyé</p>}
    </form>
  )
}
```

### Points Importants

- Nodemailer importé uniquement dans des fichiers serveur (`'use server'` ou `route.ts`)
- Ne jamais ajouter `runtime = 'edge'` à une route qui importe nodemailer
- Le Client Component appelle la Server Action, l'action importe le transporter
- La validation Zod protège contre les données malformées côté client

---

## Sécurité CRLF & variables d'env

### Description

Les versions antérieures à 8.0.5 contenaient une faille CRLF permettant d'injecter des en-têtes SMTP supplémentaires via le champ `name` du transport ou `envelope.size`. La v8.0.5 sanitise ces champs. Pour renforcer encore, ne jamais passer de valeur user-controlled dans les options de transport.

### Exemple

```bash
# .env.local (jamais committé)
SMTP_HOST=smtp.ionos.fr
SMTP_PORT=587
SMTP_USER=contact@thibaud-geisler.com
SMTP_PASS=••••••••••
SMTP_FROM="Portfolio <contact@thibaud-geisler.com>"
CONTACT_TO=thibaud@thibaud-geisler.com
```

### Points Importants

- Fixer nodemailer à `^8.0.5` minimum pour bénéficier des correctifs CRLF
- Ne jamais passer `req.body.*` dans les options du transport (host, name, auth)
- Les valeurs sensibles passent par Dokploy en prod, `.env.local` en dev
- Placer `.env.local` dans `.gitignore`

---

# Bonnes Pratiques

## ✅ Recommandations

- Instancier le transport une seule fois au niveau module (`src/lib/mailer.ts`)
- Valider toutes les entrées avec Zod avant `sendMail`
- Utiliser `replyTo` pour rediriger les réponses vers l'expéditeur du formulaire
- Mocker le transport dans les tests (jamais d'envoi réel en CI)
- Fixer au minimum `nodemailer@^8.0.5` pour les correctifs CRLF
- Wrapper `sendMail` dans un try/catch au niveau Server Action et logger avec Pino

## ❌ Anti-Patterns

- Ne pas importer nodemailer dans un Client Component
- Ne pas utiliser nodemailer dans une route avec `runtime = 'edge'`
- Ne pas concaténer des valeurs user-controlled dans les options du transport
- Ne pas recréer un transport à chaque appel de Server Action
- Ne pas committer `.env.local` ni les credentials IONOS

---

# 🔗 Ressources

## Documentation Officielle

- [nodemailer — Documentation](https://nodemailer.com/)
- [SMTP transport](https://nodemailer.com/smtp)
- [GitHub — nodemailer](https://github.com/nodemailer/nodemailer)

## Ressources Complémentaires

- [Advisory GHSA-vvjj-xcjg-gr5g](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-vvjj-xcjg-gr5g)
- [Next.js + nodemailer guide — Mailtrap](https://mailtrap.io/blog/nextjs-send-email/)
