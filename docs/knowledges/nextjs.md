---
title: "Next.js — Framework full-stack"
version: "16.3.3"
description: "Référence technique pour Next.js 16 : App Router, Server Components, Server Actions, caching opt-in."
date: "2026-04-13"
keywords: ["nextjs", "app-router", "server-components", "server-actions", "turbopack"]
scope: ["docs"]
technologies: ["React", "TypeScript", "Prisma", "Tailwind CSS"]
---

# Description

`Next.js` 16 est le framework fullstack du portfolio. La v16 rend Turbopack par défaut en dev et build, renomme `middleware.ts` en `proxy.ts`, impose des params async obligatoires (plus de sync access), et active Partial Prerendering via `cacheComponents: true`. Utilisé en monolithe : pages publiques en Server Components, formulaire de contact en Server Action, espace admin futur via le segment `admin/`.

---

# Concepts Clés

## App Router et conventions

### Description

Le routing est basé sur le système de fichiers dans `src/app/`. Chaque dossier = segment d'URL, les fichiers spéciaux (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`) définissent l'UI. Le route group `(public)/` organise le code sans impacter les URLs ; `admin/` est un segment réel qui produit `/admin`.

### Exemple

```
src/app/
├── [locale]/                             segment de locale, site public bilingue
│   ├── layout.tsx
│   └── (public)/                         route group, ne produit aucun segment
│       ├── page.tsx                      → /fr, /en
│       ├── services/page.tsx             → /fr/services
│       ├── projets/
│       │   ├── page.tsx                  → /fr/projets
│       │   └── [slug]/page.tsx           → /fr/projets/[slug]
│       └── contact/page.tsx              → /fr/contact
├── admin/                                segment réel, hors [locale] (post-MVP, ADR-021)
│   └── page.tsx                          → /admin
├── api/
│   └── assets/[...path]/route.ts         → /api/assets/projets/client/foyer/logo.png
└── layout.tsx                            root layout
```

`localePrefix: 'always'` dans `src/i18n/routing.ts` : le préfixe de locale est toujours présent, `/` redirige vers la locale négociée (`localeDetection` vaut `true` par défaut). L'asymétrie entre `[locale]/` et `admin/` est voulue, l'espace admin n'étant pas localisé.

### Points Importants

- Le root `layout.tsx` est obligatoire et doit contenir `<html>` et `<body>`
- Les route groups `(name)/` sont exclus de l'URL finale
- `loading.tsx` affiche un fallback Suspense pendant le chargement
- `error.tsx` crée un Error Boundary (nécessite `'use client'`)

---

## Server Components et data fetching

### Description

Par défaut, les composants de l'App Router sont des Server Components. Ils peuvent être `async` et faire du data fetching direct (Prisma, fetch). Pas de bundle JS côté client pour ces composants.

### Exemple

```tsx
// src/app/[locale]/(public)/projets/[slug]/page.tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const project = await prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
  })
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

- `params` est désormais une `Promise` en v16 (await obligatoire)
- `generateStaticParams` pré-génère les routes dynamiques au build (non utilisé sur `[slug]` ici : le premier hit rend au runtime, les suivants sortent du Data Cache)
- `notFound()` retourne une 404 propre (rendue par `not-found.tsx`)
- Les composants `async` ne peuvent être que serveur (pas client)

---

## Server Actions

### Description

Fonctions async côté serveur marquées `'use server'`, invoquées depuis des formulaires ou des Client Components. Remplacent les API routes pour les mutations. Utilisées dans le portfolio pour le formulaire de contact et les CRUD de l'espace admin (post-MVP).

### Exemple

```ts
// src/server/actions/contact.ts
'use server'
import { contactSchema } from '@/lib/schemas/contact'
import { transporter } from '@/lib/mailer'
import { logger } from '@/lib/logger'

export async function submitContact(_prev: unknown, formData: FormData) {
  const result = contactSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors }
  }

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: process.env.MAIL_TO,
      replyTo: result.data.email,
      subject: `Contact portfolio — ${result.data.name}`,
      text: result.data.message,
    })
    return { success: true }
  } catch (err) {
    logger.error({ err }, 'Failed to send contact')
    return { error: 'Erreur serveur' }
  }
}
```

### Points Importants

- Directive `'use server'` en haut du fichier (module) ou inline dans une fonction
- Toujours valider les entrées avec Zod avant mutation
- Retourner un objet `{ errors | success | error }` pour `useActionState`
- Vérifier l'auth dans chaque action (sécurité défense en profondeur)

---

## proxy.ts (ex-middleware.ts)

### Description

En v16, le fichier `middleware.ts` est renommé en `proxy.ts` et la fonction exportée s'appelle `proxy`. S'exécute avant le rendu de chaque route. Utilisé pour le routing i18n (next-intl) et la protection des routes admin. Les headers de sécurité sont dans `next.config.ts`.

### Exemple

```ts
// src/proxy.ts
import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

Ce matcher est celui du code actuel, où `/admin` n'existe pas encore. ADR-021 impose de l'exclure du routing i18n au moment d'implémenter l'espace admin, faute de quoi `createMiddleware` redirigerait `/admin` vers `/fr/admin`.

### Points Importants

- `proxy.ts` à la racine ou dans `src/`
- Runtime Node.js uniquement (pas d'Edge en v16)
- Codemod disponible : `npx @next/codemod@canary middleware-to-proxy .`
- Combiner avec l'auth dans chaque route handler (pas de sécurité uniquement via proxy)

---

## Caching opt-in et cacheComponents

### Description

En v16, les pages sont dynamiques par défaut. Activer `cacheComponents: true` pour opter dans le Partial Prerendering (PPR) et utiliser la directive `'use cache'` qui autorise le caching granulaire avec `cacheLife` et `cacheTag`.

### Exemple

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
}

export default nextConfig
```

```tsx
// src/server/queries/projects.ts
import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

export async function findManyPublished() {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: { displayOrder: 'asc' },
  })
}
```

### Points Importants

- `cacheComponents: true` active PPR et la directive `'use cache'`
- `cacheLife('hours' | 'days' | 'max')` définit la durée de vie
- `cacheTag('projects')` permet l'invalidation granulaire
- `revalidateTag('projects', 'max')` invalide dans une Server Action

---

# Commandes Clés

## Initialisation

### Description

Commande officielle pour scaffolder un nouveau projet Next.js 16 via `create-next-app`. Turbopack, TypeScript et Tailwind CSS sont activés par défaut en v16. Le flag `--agents-md` (défaut) génère `AGENTS.md` et `CLAUDE.md` pour les coding agents.

### Syntaxe

```bash
# Création standard (Turbopack + TS + Tailwind + App Router + ESLint)
pnpm create next-app my-app

# Bootstrap explicite recommandé pour le portfolio (src/ + alias @/*)
pnpm create next-app my-app \
  --ts \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --turbopack \
  --import-alias "@/*" \
  --use-pnpm

# Projet vide minimal
pnpm create next-app my-app --empty

# Projet API-only (route handlers uniquement, nouveau v16)
pnpm create next-app my-api --api
```

### Points Importants

- `--ts`, `--tailwind`, `--app`, `--turbopack` sont **activés par défaut** en v16 ; utiliser `--no-ts`, `--no-tailwind` pour désactiver
- `--src-dir` place le code dans `src/` (convention du portfolio, voir `ARCHITECTURE.md`)
- `--import-alias "@/*"` crée l'alias TypeScript pour imports propres (`@/lib/...`, `@/components/...`)
- `--use-pnpm` force pnpm comme package manager (cohérent avec le stack)
- `--agents-md` (défaut) génère `AGENTS.md` + `CLAUDE.md` pour les coding agents
- `--biome` ou `--no-linter` en alternative à ESLint
- `--yes` pour utiliser les préférences précédentes sans prompt (utile en CI)

---

## Développement et build

### Description

Les commandes principales pour développer, construire et démarrer une application Next.js. Turbopack est le défaut en v16 (plus besoin du flag `--turbo`).

### Syntaxe

```bash
pnpm dev                              # dev server (Turbopack)
pnpm build                            # build production (Turbopack)
pnpm start                            # serve le build en prod
pnpm typegen                          # génère PageProps / LayoutProps / RouteContext
pnpm exec next info                   # infos système pour bug reports
```

### Points Importants

- `next dev` utilise Turbopack par défaut (sortie dans `.next/dev/`)
- `next build` utilise Turbopack par défaut (sortie dans `.next/`)
- `--webpack` pour forcer Webpack (nécessaire si config custom)
- `next typegen` en CI pour typer `params`/`searchParams` automatiquement

---

# Bonnes Pratiques

## ✅ Recommandations

- Organiser les routes par route group `(public)/`, et par segment réel `admin/`
- Toujours `await params` et `await searchParams` en v16
- Utiliser Server Components par défaut, Client Components pour les îlots
- Valider toutes les entrées Server Action avec Zod
- Renommer `middleware.ts` en `proxy.ts` (v16)
- Ajouter `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']`

## ❌ Anti-Patterns

- Ne pas accéder synchronement à `params` ou `searchParams` (v16 impose async)
- Ne pas faire confiance uniquement au proxy pour l'auth : revérifier dans chaque action
- Ne pas marquer toute une page `'use client'` à cause d'un bouton
- Ne pas importer Prisma dans un Client Component
- Ne pas oublier `default.tsx` dans les parallel routes (v16 impose)

---

# 🔗 Ressources

## Documentation Officielle

- [Next.js : Documentation](https://nextjs.org/docs/app)
- [App Router fundamentals](https://nextjs.org/docs/app/getting-started/layouts-and-pages)
- [Upgrade to v16](https://nextjs.org/docs/app/guides/upgrading/version-16)

## Ressources Complémentaires

- [Next.js 16 blog](https://nextjs.org/blog/next-16)
- [Next.js 16.2](https://nextjs.org/blog/next-16-2)
