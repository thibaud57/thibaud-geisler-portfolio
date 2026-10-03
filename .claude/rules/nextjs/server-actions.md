---
paths:
  - "src/server/actions/**/*.ts"
---

# Next.js — Server Actions & Mutations

## À faire
- Déclarer `'use server'` en haut du fichier pour un module d'actions, ou inline dans un Server Component pour une action locale
- Envelopper le corps de chaque action dans **`createActionLogger(action, handler)`** (`src/lib/server-utils.ts`) : il fournit `log` et `ip`, et pose l'instrumentation Sentry, aucune action ne peut l'oublier. La garde d'authentification, elle, se place avant (cf. `nextjs/server-actions-security.md`)
- Valider toute entrée `FormData` par Zod `safeParse()` côté serveur, indépendamment de toute validation client : une action exportée est un endpoint public
- Retourner un état typé consommé par `useActionState` (`{ ok, errors, message }`) plutôt que de throw : le formulaire affiche les erreurs sans perdre sa saisie
- Appeler `redirect()` **hors** de tout `try/catch`, ou appeler `unstable_rethrow(error)` en tête du `catch` : sinon `redirect()`, `notFound()`, `unauthorized()` sont avalés en silence
- Invalider par `revalidatePath(path)` (layout ou page entière) ou `revalidateTag(tag, profile)` (par tag)
- Privilégier `updateTag(tag)` (read-your-writes) quand l'auteur doit voir sa modification immédiatement
- Passer des arguments supplémentaires par `bind()` (compatible progressive enhancement)

## À éviter
- `revalidateTag(tag)` avec un seul argument : **déprécié** Next 16, signature `revalidateTag(tag, profile)` où profile est `'max'`, `'hours'`, `'days'` ou `{ expire: 0 }`
- Lire un champ à valeurs multiples par `Object.fromEntries(formData)` : il ne garde que la dernière valeur, passer par `formData.getAll` (`stringValues` de `server-utils.ts`)

## Gotchas
- Pour vider un formulaire après succès, changer la `key` du `<form>` plutôt qu'appeler `form.reset()` (mieux compatible avec les composants contrôlés)
- `useActionState`, `useFormStatus`, `useOptimistic` côté client : voir `react/components.md`
- Authentification, rate limiting, fichiers et CSRF : voir `nextjs/server-actions-security.md`. Logging : `pino/usage.md`. Email : `nodemailer/sending.md`

## Exemples
```typescript
// ✅ Action enveloppée, validée, état structuré, redirect hors try/catch
'use server'
export async function submitForm(prev: FormState, formData: FormData): Promise<FormState> {
  return createActionLogger('submitForm', async ({ log }) => {
    const result = Schema.safeParse(Object.fromEntries(formData))
    if (!result.success) return { ok: false, errors: z.flattenError(result.error).fieldErrors, message: null }
    await save(result.data)
    log.info({ event: 'form:saved' })
    revalidatePath('/items')
    redirect('/items')
  })
}

// ❌ redirect dans un try/catch sans unstable_rethrow : avalé
try { redirect('/items') } catch (e) { return { error: 'Erreur' } }
```
