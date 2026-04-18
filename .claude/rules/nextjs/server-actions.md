---
paths:
  - "src/server/actions/**/*.ts"
---

# Next.js — Server Actions & Mutations

## À faire
- Déclarer `'use server'` en haut du fichier pour un module d'actions réutilisables, ou inline dans un Server Component pour une action locale
- Valider systématiquement toute entrée `FormData` avec Zod `safeParse()` côté serveur avant usage, indépendamment de toute validation client
- Retourner un objet `{ message, errors }` via `useActionState` plutôt que throw, pour afficher les erreurs dans le form sans perdre l'état
- Appeler `redirect()` **hors** de tout `try/catch`, sinon l'erreur interne de redirection est silencieusement capturée
- Utiliser `unstable_rethrow(error)` dans les `catch` qui pourraient avaler `redirect()`, `notFound()`, `unauthorized()`, `forbidden()`
- Utiliser `revalidatePath(path)` pour invalider un layout/page entier, `revalidateTag(tag, profile)` pour invalider par tag
- Privilégier `updateTag(tag)` (read-your-writes) quand l'utilisateur doit voir sa propre modification immédiatement
- Vérifier l'authentification/autorisation dans **chaque** Server Action, même si le proxy protège déjà la route (défense en profondeur)
- Valider taille et type MIME des fichiers `FormData` côté serveur (ne pas se fier au `accept` HTML)
- Configurer `serverActions.allowedOrigins` dans `next.config.ts` si l'app tourne derrière un reverse proxy (Dokploy)
- Utiliser `bind()` pour passer des arguments supplémentaires aux actions (compatible progressive enhancement)
- Implémenter un **rate limiting** sur toutes les Server Actions exposées publiquement (formulaire contact MVP, chatbot post-MVP) : compteur IP in-memory simple suffit pour le MVP single-instance, passer à Upstash Ratelimit ou Arcjet en multi-replicas
- Pour le logging structuré dans une Server Action (child logger avec `requestId`, niveaux cohérents, capture d'erreur via `err` en premier argument) : voir `pino/logger.md`
- Pour l'envoi d'email transactionnel (formulaire contact via SMTP IONOS, transporter singleton, `replyTo`, version pin sécurité) : voir `nodemailer/email.md`

## À éviter
- Mettre `redirect()` dans un `try/catch` sans `unstable_rethrow` : la redirection est avalée silencieusement
- Utiliser `revalidateTag(tag)` avec un seul argument : **déprécié** Next 16, nouvelle signature `revalidateTag(tag, profile)` où profile est `'max'`, `'hours'`, `'days'` ou `{ expire: 0 }`
- Faire confiance au `FormData` sans validation Zod : toute action exportée est un endpoint public invocable par quiconque
- Stocker des fichiers uploadés sur le filesystem local en production : éphémère en serverless, non partagé entre replicas, utiliser un volume Docker dédié ou Cloudflare R2
- Utiliser `useFormState` de `react-dom` : **déprécié** R19, utiliser `useActionState` de `react`
- Appeler `useFormStatus()` dans le même composant qui rend le `<form>` : doit être dans un composant **enfant** du form
- Dépendre uniquement du proxy pour la protection auth : un matcher modifié peut supprimer la couverture, toujours re-vérifier dans l'action

## Gotchas
- CSRF auto : Next.js compare `Origin` vs `Host`, pas de token CSRF explicite nécessaire (comme Spring Security)
- Derrière Nginx ou un reverse proxy qui réécrit `Host` : configurer `proxy_set_header X-Forwarded-Host $host` côté reverse proxy
- `useOptimistic` rollback automatiquement si la Server Action échoue ou retourne une valeur différente
- Key reset : pour vider un form après succès, changer la `key` du `<form>` plutôt que `form.reset()` (mieux compatible composants contrôlés)

## Exemples

```typescript
// ✅ Action avec validation Zod + retour structuré
'use server'
export async function submitForm(prev: FormState, formData: FormData): Promise<FormState> {
  const result = Schema.safeParse(Object.fromEntries(formData))
  if (!result.success) return { errors: result.error.flatten().fieldErrors }
  await save(result.data)
  revalidatePath('/items')
  redirect('/items') // HORS du try/catch
}
```

```typescript
// ❌ redirect dans try/catch sans unstable_rethrow (avalé silencieusement)
try {
  await deleteItem(id)
  redirect('/items')
} catch (e) { return { error: 'Erreur' } }

// ✅ Avec unstable_rethrow
try {
  await deleteItem(id)
  redirect('/items')
} catch (e) {
  unstable_rethrow(e)
  return { error: 'Erreur' }
}
```

```typescript
// ✅ useFormState (déprécié R19) → useActionState (de 'react')
const [state, formAction] = useActionState(submitForm, initialState)

// ❌ useFormState de 'react-dom' (déprécié)
const [state, formAction] = useFormState(submitForm, initialState)
```
