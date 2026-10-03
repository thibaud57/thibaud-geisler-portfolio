---
paths:
  - "src/server/actions/**/*.ts"
  - "next.config.ts"
---

# Next.js — Sécurité des Server Actions

## À faire
- Vérifier l'authentification dans **chaque** Server Action exportée de l'espace admin par `await getCurrentUser()`, en première ligne et **hors** de `createActionLogger` : dans l'instrumentation, `unauthorized()` serait avalé et masqué en `unknown_error`. Même si le proxy protège la route, un matcher modifié peut retirer la couverture sans bruit
- Valider taille et type MIME des fichiers `FormData` côté serveur, sans se fier à l'attribut `accept` du champ
- Écrire les fichiers reçus dans le bucket Cloudflare R2 concerné, jamais sur le filesystem du conteneur, éphémère et non partagé (cf. `nextjs/assets.md`)
- Limiter le débit des actions publiques (formulaire de contact) : compteur par IP en mémoire, suffisant en instance unique, à remplacer par un store partagé (Upstash Ratelimit, Arcjet) en multi-replicas

## À éviter
- Dépendre du seul proxy pour protéger une action : une action est appelable directement, sans passer par la page

## Gotchas
- **CSRF** : Next.js compare `Origin` et `Host`, sans token explicite. Derrière Traefik (Dokploy), le reverse proxy doit transmettre l'hôte d'origine (`X-Forwarded-Host`), configuré hors dépôt
- `serverActions.allowedOrigins` n'est pas posé dans `next.config.ts` : il ne devient nécessaire que si une erreur « Invalid Server Action request » apparaît en production, signe que l'origine et l'hôte vus par Next divergent
- Les deux refus se distinguent : sans cookie, le proxy répond **307** avant l'action ; avec un cookie forgé, c'est la garde `getCurrentUser()` de l'action qui répond **401**. Seul le second prouve que l'action se protège elle-même

## Exemples
```typescript
// ✅ Garde en première ligne, hors de l'instrumentation
export async function deleteItem(id: string) {
  await getCurrentUser()
  return createActionLogger('deleteItem', async () => {
    await prisma.item.delete({ where: { id } })
  })
}

// ❌ Garde dans l'instrumentation : unauthorized() avalé, masqué en unknown_error
export async function deleteItem(id: string) {
  return createActionLogger('deleteItem', async () => {
    await getCurrentUser()
  })
}
```
