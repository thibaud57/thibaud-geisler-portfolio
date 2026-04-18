---
title: "React — Librairie UI"
version: "19.2.5"
description: "Référence technique pour React 19 : Server Components, Actions, hooks modernes et patterns Next.js."
date: "2026-04-13"
keywords: ["react", "server-components", "actions", "hooks", "nextjs"]
scope: ["docs"]
technologies: ["Next.js", "TypeScript"]
---

# Description

`React` 19 est la version utilisée par Next.js 16 dans le portfolio. Elle introduit les Server Components stables, les Actions (mutations via formulaires), le hook `use()`, et simplifie les patterns historiques (ref comme prop, Context comme Provider direct). Utilisée principalement via App Router : composants serveur par défaut, îlots clients marqués `'use client'` pour l'interactivité.

---

# Concepts Clés

## Server Components

### Description

Par défaut dans l'App Router. Exécutés côté serveur, zéro JS envoyé au client. Idéaux pour le data fetching direct (queries Prisma), l'accès aux secrets et la réduction du bundle. Dans le portfolio, les pages publiques (`/projets`, `/projets/[slug]`) sont des Server Components qui appellent Prisma directement.

### Exemple

```tsx
// src/app/(public)/projets/[slug]/page.tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await prisma.project.findUnique({ where: { slug } })
  if (!project) notFound()

  return (
    <article>
      <h1>{project.title}</h1>
      <p>{project.description}</p>
    </article>
  )
}
```

### Points Importants

- Les Server Components peuvent être `async` (pas les Client Components)
- Aucun hook React (`useState`, `useEffect`) ni handler d'événement
- Import `server-only` pour garantir qu'un module ne leak pas côté client
- Zéro bundle JS client pour les parties purement serveur

---

## Client Components et îlots

### Description

Marqués avec `'use client'` en haut du fichier. Nécessaires pour l'interactivité (useState, useEffect, onClick, APIs browser). Pattern : isoler les îlots clients le plus bas possible dans l'arbre pour maximiser la part Server Component. Un Server Component peut passer des Server Components en `children` à un Client Component (composition de slots).

### Exemple

```tsx
// src/components/features/like-button.tsx
'use client'
import { useState } from 'react'

export function LikeButton({ initial }: { initial: number }) {
  const [count, setCount] = useState(initial)
  return <button onClick={() => setCount((c) => c + 1)}>{count} likes</button>
}
```

### Points Importants

- Le `'use client'` en haut du fichier marque la frontière serveur/client
- Les Server Components peuvent importer et rendre des Client Components (pas l'inverse)
- Les Client Components reçoivent les props sérialisées (pas de fonctions non-action)
- Isoler au plus bas dans l'arbre : un Layout peut être serveur, un bouton peut être client

---

## Actions et useActionState

### Description

Les Actions sont des fonctions serveur async invoquées depuis un `<form action={...}>` ou un handler. Le hook `useActionState` gère l'état pending, les erreurs et les valeurs de retour. Pattern canonique pour le formulaire de contact : action serveur validée avec Zod, remontée via `useActionState` dans le Client Component.

### Exemple

```tsx
'use client'
import { useActionState } from 'react'
import { sendContact } from '@/server/actions/contact'

export function ContactForm() {
  const [state, action, pending] = useActionState(sendContact, null)

  return (
    <form action={action}>
      <input name="name" required />
      <input name="email" type="email" required />
      <textarea name="message" required />
      <button type="submit" disabled={pending}>
        {pending ? 'Envoi...' : 'Envoyer'}
      </button>
      {state?.errors && <p>Erreurs de validation</p>}
      {state?.success && <p>Message envoyé</p>}
    </form>
  )
}
```

### Points Importants

- `useActionState(action, initialState)` retourne `[state, formAction, pending]`
- L'action reçoit `(prevState, formData)` et retourne le nouvel état
- `useFormStatus()` donne accès au pending depuis un composant enfant du form
- Combiner avec `useOptimistic` pour des updates optimistes

---

## ref comme prop (v19)

### Description

En v19, `ref` est transmis comme prop standard sans `forwardRef`. Les function components peuvent déclarer `ref` dans leurs props et le transmettre à un élément DOM.

### Exemple

```tsx
// Avant v19
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => (
  <input ref={ref} {...props} />
))

// v19
function Input({ ref, ...props }: Props & { ref?: React.Ref<HTMLInputElement> }) {
  return <input ref={ref} {...props} />
}
```

### Points Importants

- `forwardRef` déprécié, codemod disponible pour la migration
- `ref` est une prop standard comme les autres
- Les callback refs peuvent retourner une cleanup function
- Simplifie grandement les librairies de composants

---

## Context comme Provider direct

### Description

En v19, `<Context>` peut être utilisé directement comme provider sans la syntaxe `<Context.Provider>`. Plus concis et plus cohérent avec les autres APIs React.

### Exemple

```tsx
// Avant v19
<ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>

// v19
<ThemeContext value="dark">{children}</ThemeContext>
```

### Points Importants

- Plus besoin de `.Provider`, le Context lui-même est callable
- `<Context.Provider>` reste fonctionnel (pas de breaking change immédiat)
- Garder les Context Providers dans des Client Components wrappant `{children}`
- `use(Context)` (nouveau hook) fonctionne même après early return

---

# Bonnes Pratiques

## ✅ Recommandations

- Server Components par défaut, Client Components pour les îlots interactifs
- Isoler `'use client'` le plus bas possible dans l'arbre
- Utiliser `useActionState` pour les formulaires avec Server Actions
- `import 'server-only'` dans les modules sensibles (credentials, secrets)
- Préférer `ref` comme prop, migrer `forwardRef` via codemod
- Passer les promises via `use()` pour les lectures asynchrones dans les Client Components

## ❌ Anti-Patterns

- Ne pas marquer un layout entier `'use client'` à cause d'un bouton
- Ne pas importer de modules serveur (Prisma, nodemailer) dans des Client Components
- Ne pas oublier `disabled={pending}` sur les boutons de soumission
- Ne pas utiliser `useState` pour des données serveur (passer par Server Component + props)
- Ne pas passer des fonctions non-action en props à un Client Component

---

# 🔗 Ressources

## Documentation Officielle

- [React — Documentation](https://react.dev)
- [React 19 Release](https://react.dev/blog/2024/12/05/react-19)
- [Server Components](https://react.dev/reference/rsc/server-components)

## Ressources Complémentaires

- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [React 19.2](https://react.dev/blog/2025/10/01/react-19-2)
