---
title: "Zod — Validation & Inference"
version: "4.3.6"
description: "Référence technique pour Zod v4 : schémas, safeParse, inference TS et intégration Server Actions."
date: "2026-04-13"
keywords: ["zod", "validation", "typescript", "server-action", "form"]
scope: ["docs"]
technologies: ["TypeScript", "Next.js", "React"]
---

# Description

`Zod` est une librairie de validation de schémas TypeScript-first. Utilisée dans le portfolio comme source unique de vérité pour la validation des Server Actions (formulaire contact), la validation des variables d'environnement, et éventuellement celle des payloads API post-MVP. La v4 apporte un gain de performance massif (14x string, 7x array) et déplace les validateurs de format string en top-level (`z.email()`, `z.url()` au lieu de `z.string().email()`).

---

# Concepts Clés

## Schéma et inference de types

### Description

Définir un schéma Zod fournit à la fois un validateur runtime et un type TypeScript via `z.infer`. Pattern canonique : déclarer le schéma une fois au niveau module, en dériver le type, et le réutiliser partout. Source unique de vérité pour les formes de données.

### Exemple

```ts
// src/lib/schemas/contact.ts
import { z } from 'zod'

export const ContactSchema = z.object({
  name: z.string().min(1, 'Nom requis').max(100),
  email: z.email('Email invalide'),
  message: z.string().min(10, 'Message trop court').max(5000),
})

export type ContactInput = z.infer<typeof ContactSchema>
```

### Points Importants

- Déclarer les schémas au niveau module, pas dans une fonction
- `z.infer<typeof Schema>` extrait le type TypeScript
- `z.input` et `z.output` distinguent avant/après transformation
- Les schémas sont réutilisables client et serveur

---

## safeParse et gestion d'erreurs

### Description

`safeParse` retourne une union discriminée `{ success: true, data } | { success: false, error }` au lieu de lever une exception. À privilégier dans les Server Actions pour un contrôle fin du flot d'erreurs, avec `error.flatten().fieldErrors` pour obtenir un objet prêt à afficher côté formulaire.

### Exemple

```ts
// src/server/actions/contact.ts
'use server'
import { ContactSchema } from '@/lib/schemas/contact'
import { transporter } from '@/lib/mailer'

export async function sendContact(_prev: unknown, formData: FormData) {
  const result = ContactSchema.safeParse(Object.fromEntries(formData))

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: process.env.CONTACT_TO,
    replyTo: result.data.email,
    subject: `Contact portfolio — ${result.data.name}`,
    text: result.data.message,
  })

  return { success: true }
}
```

### Points Importants

- Préférer `safeParse` à `parse` pour éviter try/catch dans les Server Actions
- `error.flatten().fieldErrors` renvoie `{ champ: string[] }`, utilisable tel quel dans l'UI
- Le type de `result.data` est automatiquement typé après narrowing
- `safeParseAsync` pour les schémas contenant des refinements asynchrones

---

## Validators top-level (v4)

### Description

En v4, les validateurs de format string sont promus en schémas indépendants top-level. `z.string().email()` devient `z.email()`, plus tree-shakable et plus rapide. Attention : `z.uuid()` en v4 applique RFC 4122 strict, utiliser `z.guid()` pour l'équivalent v3.

### Exemple

```ts
const ContactSchema = z.object({
  email: z.email(),              // ex z.string().email()
  website: z.url().optional(),
  userId: z.uuid(),              // RFC 4122 strict
  avatarUrl: z.url().optional(),
  createdAt: z.iso.datetime(),
})
```

### Points Importants

- `z.email()`, `z.url()`, `z.uuid()`, `z.iso.datetime()` remplacent les formes chaînées
- `z.uuid()` ≠ `z.string().uuid()` v3 : version stricte, utiliser `z.guid()` si besoin
- Les anciennes formes chaînées sont dépréciées mais encore fonctionnelles en v4
- Meilleur tree-shaking : seuls les validateurs utilisés sont bundlés

---

## Validation des variables d'environnement

### Description

Pattern fail-fast : valider `process.env` au démarrage de l'application pour détecter immédiatement les variables manquantes ou invalides. Évite les erreurs tardives en production quand une variable est mal configurée.

### Exemple

```ts
// src/lib/env.ts
import { z } from 'zod'

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  CONTACT_TO: z.email(),
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

export const env = EnvSchema.parse(process.env)
```

### Points Importants

- `z.coerce.number()` convertit les strings en nombres (toutes les env vars sont des strings)
- Utiliser `parse` (pas `safeParse`) ici : on veut crasher au démarrage si invalide
- Ne jamais typer `process.env` à la main : laisser Zod inferer
- Pour le portfolio : placer dans `src/lib/env.ts`, importer partout où des env vars sont lues

---

## Refinements et transformations

### Description

`.refine()` ajoute une validation custom mono-champ, `.superRefine()` gère les validations cross-champs ou multi-erreurs. `.transform()` convertit la donnée après validation (trim, lowercase, parse JSON). `z.input` et `z.output` permettent de typer séparément l'entrée et la sortie.

### Exemple

```ts
const EmailSchema = z
  .email()
  .transform((v) => v.toLowerCase().trim())

const PasswordSchema = z
  .object({
    password: z.string().min(8),
    confirm: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirm) {
      ctx.addIssue({
        path: ['confirm'],
        code: 'custom',
        message: 'Les mots de passe ne correspondent pas',
      })
    }
  })

type EmailInput = z.input<typeof EmailSchema>   // string
type EmailOutput = z.output<typeof EmailSchema> // string (lowercased)
```

### Points Importants

- `.refine()` pour validation simple, `.superRefine()` pour logique cross-champ
- `.transform()` modifie la donnée, `.refine()` valide uniquement
- `z.input` = avant transformation, `z.output` = après transformation
- `z.infer` est un alias de `z.output`

---

# Bonnes Pratiques

## ✅ Recommandations

- Déclarer les schémas au niveau module et dériver les types via `z.infer`
- Partager les schémas entre client et serveur dans `src/lib/schemas/`
- Utiliser `safeParse` dans les Server Actions, `parse` au démarrage pour les env vars
- Préférer les validators top-level v4 (`z.email()`, `z.url()`)
- Utiliser `error.flatten().fieldErrors` pour alimenter l'UI de formulaire
- `z.coerce.number()` pour convertir les valeurs `FormData` ou env vars

## ❌ Anti-Patterns

- Ne pas dupliquer les types à la main : toujours passer par `z.infer`
- Ne pas utiliser `parse` dans une Server Action (exception non gérée propre)
- Ne pas valider uniquement côté client : toujours revalider côté serveur
- Ne pas utiliser `z.any()` ou `z.unknown()` pour contourner la validation
- Ne pas mélanger `z.uuid()` v4 (strict RFC 4122) et l'ancien `z.string().uuid()` sans vérification

---

# 🔗 Ressources

## Documentation Officielle

- [Zod — Documentation](https://zod.dev/)
- [Zod v4 — Changelog](https://zod.dev/v4)
- [Basic usage](https://zod.dev/basics)

## Ressources Complémentaires

- [Zod + Next.js Server Actions — freeCodeCamp](https://www.freecodecamp.org/news/handling-forms-nextjs-server-actions-zod/)
- [Migrating to Zod 4](https://dev.to/pockit_tools/migrating-to-zod-4-the-complete-guide-to-breaking-changes-performance-gains-and-new-features-3ll0)
