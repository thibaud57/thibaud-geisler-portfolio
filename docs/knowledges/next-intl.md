---
title: "next-intl — Internationalisation Next.js"
version: "4.9.1"
description: "Référence technique pour next-intl : i18n App Router, locale routing, useTranslations et static rendering."
date: "2026-04-13"
keywords: ["next-intl", "i18n", "nextjs", "locale", "app-router"]
scope: ["docs"]
technologies: ["Next.js", "React", "TypeScript"]
---

# Description

`next-intl` est la librairie i18n de référence pour Next.js App Router. Elle gère le routing par locale, l'interpolation ICU, la pluralisation, le rich text, le static rendering et l'intégration avec les Server et Client Components. Dans le portfolio, elle sert les langues FR et EN avec le FR en défaut. La configuration passe par un segment dynamique `[locale]` et un middleware de détection automatique de langue.

---

# Concepts Clés

## defineRouting

### Description

Centralise la configuration du routing i18n : liste des locales supportées, locale par défaut, stratégie de détection. Source unique de vérité, réutilisée par le middleware, les navigations et la config de requête.

### Exemple

```ts
// src/i18n/routing.ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
})
```

### Points Importants

- Une seule source de vérité pour toutes les locales
- `defaultLocale` utilisé quand la détection échoue
- Passée au middleware et à la config de requête
- Typer les locales via l'augmentation `AppConfig`

---

## Middleware et routing

### Description

Le middleware `createMiddleware(routing)` intercepte toutes les requêtes, détecte la locale (cookie, header `Accept-Language`, ou défaut) et redirige vers le bon préfixe (`/fr/...` ou `/en/...`). Le matcher exclut les routes API, les fichiers statiques et `_next/*`.

### Exemple

```ts
// src/proxy.ts (Next 16+ : ex-middleware.ts)
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

### Points Importants

- Le matcher doit exclure `api/`, `_next/`, et les fichiers statiques
- La locale est stockée en cookie pour les visites suivantes
- Renommé `proxy.ts` en Next.js 16+ (au lieu de `middleware.ts`)
- Compatible App Router uniquement

---

## getRequestConfig

### Description

Fonction par requête qui charge les messages JSON pour la locale courante. Validation de la locale contre `routing.locales` avec le helper `hasLocale()`, fallback sur `defaultLocale` en cas d'invalide. Les messages sont importés dynamiquement (code-splitting automatique par locale).

### Exemple

```ts
// src/i18n/request.ts
import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
```

### Points Importants

- `hasLocale()` protège contre les locales arbitraires dans l'URL
- Messages JSON dans `messages/fr.json`, `messages/en.json`
- Dynamic import = code-splitting automatique (bundle par locale)
- Chaque locale est une entrée distincte dans le build

---

## useTranslations et getTranslations

### Description

`useTranslations` est le hook pour les Server Components synchrones et les Client Components. `getTranslations` est la fonction async, drop-in replacement pour les Server Components async, Server Actions et Route Handlers. Les deux acceptent un namespace optionnel.

### Exemple

```tsx
// src/app/[locale]/page.tsx — Server Component async
import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HomePage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('intro', { name: 'Thibaud' })}</p>
    </main>
  )
}
```

```tsx
// src/components/features/nav.tsx — Client Component
'use client'
import { useTranslations } from 'next-intl'

export function Nav() {
  const t = useTranslations('Nav')
  return (
    <nav>
      <a href="/projets">{t('projects')}</a>
      <a href="/contact">{t('contact')}</a>
    </nav>
  )
}
```

### Points Importants

- `getTranslations` dans les async Server Components, Server Actions
- `useTranslations` dans les Client Components et Server Components sync
- Le namespace scope les clés : `t('title')` → `HomePage.title`
- `t.rich()` pour interpoler du JSX, `t.has()` pour tester une clé

---

## Messages JSON et ICU

### Description

Les messages sont stockés en JSON hiérarchique par namespace. Supportent l'interpolation ICU (`{name}`), la pluralisation (`{count, plural, =0 {...} other {...}}`), les sélecteurs (`{gender, select, ...}`) et le rich text via `t.rich()`.

### Exemple

```json
// messages/fr.json
{
  "HomePage": {
    "title": "Thibaud Geisler — IA & Full-Stack",
    "intro": "Bonjour {name}, bienvenue sur mon portfolio.",
    "followers": "{count, plural, =0 {aucun abonné} =1 {un abonné} other {# abonnés}}",
    "terms": "Lire nos <link>conditions</link>."
  },
  "Nav": {
    "projects": "Projets",
    "contact": "Contact"
  }
}
```

```tsx
// Usage rich text
t.rich('terms', {
  link: (chunks) => <a href="/conditions">{chunks}</a>,
})
```

### Points Importants

- Structure hiérarchique par namespace
- Interpolation ICU : `{variable}`, `{count, plural, ...}`
- `t.rich()` pour injecter du JSX dans un message
- Les placeholders sont typés via l'augmentation `AppConfig`

---

## Static rendering et setRequestLocale

### Description

Pour que Next.js puisse pré-générer les pages en SSG, chaque layout et page doit appeler `setRequestLocale(locale)`. Combiner avec `generateStaticParams` qui retourne toutes les locales pour pré-générer les deux variantes de chaque page.

### Exemple

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

### Points Importants

- `setRequestLocale` obligatoire dans chaque layout et page pour le SSG
- `generateStaticParams` pré-génère les routes pour toutes les locales
- `NextIntlClientProvider` hérite automatiquement de la config serveur
- Combiner avec `suppressHydrationWarning` si `next-themes` est utilisé

---

# Bonnes Pratiques

## ✅ Recommandations

- Centraliser la config dans `src/i18n/routing.ts`
- Utiliser `hasLocale()` pour valider la locale en entrée
- Organiser les messages par namespace (HomePage, Nav, ContactForm)
- Appeler `setRequestLocale` dans tous les layouts et pages
- Typer les locales et messages via l'augmentation `AppConfig`
- Utiliser `t.rich()` pour les messages contenant du JSX

## ❌ Anti-Patterns

- Ne pas concaténer des strings pour construire un message (perd le support ICU)
- Ne pas hardcoder la locale dans le code : utiliser le param `[locale]`
- Ne pas oublier `setRequestLocale` : casse le static rendering
- Ne pas utiliser `useTranslations` dans un Server Component async (utiliser `getTranslations`)
- Ne pas mélanger les messages dans un seul namespace monolithique

---

# 🔗 Ressources

## Documentation Officielle

- [next-intl : Documentation](https://next-intl.dev/docs/getting-started/app-router)
- [i18n routing setup](https://next-intl.dev/docs/routing/setup)
- [Translations](https://next-intl.dev/docs/usage/translations)
- [TypeScript augmentation](https://next-intl.dev/docs/workflows/typescript)

## Ressources Complémentaires

- [next-intl 4.0 release](https://next-intl.dev/blog/next-intl-4-0)
- [Ahead-of-time compilation](https://next-intl.dev/blog/precompilation)
