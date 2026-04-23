---
paths:
  - "src/i18n/**/*.ts"
  - "src/proxy.ts"
  - "proxy.ts"
  - "src/app/[locale]/**/layout.tsx"
  - "src/app/[locale]/**/page.tsx"
  - "next.config.ts"
---

# next-intl — Setup, routing & static rendering

## À faire
- Utiliser **`next-intl`** (≥ 4.4, **4.9.1 recommandé**) avec segment dynamique `[locale]` à la racine de `app/`
- Centraliser la config dans `src/i18n/routing.ts` via **`defineRouting()`** avec `locales: ['fr', 'en']`, `defaultLocale: 'fr'`
- Choisir le mode **`localePrefix`** dans `defineRouting()` selon la stratégie SEO : `'always'` (fr/en explicites dans l'URL) | `'as-needed'` (locale par défaut sans prefix) | `'never'` (cookie/header only)
- Appeler **`setRequestLocale(locale)` obligatoirement** dans chaque `layout.tsx` ET chaque `page.tsx` pour supporter le rendu statique (Next.js rend layouts et pages indépendamment)
- Utiliser **`hasLocale(routing.locales, value)`** comme type guard pour narrower `string → Locale` et appeler `notFound()` si invalide
- Importer les APIs navigation localisées via **`createNavigation(routing)`** : `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname`
- Déclarer `<html lang={locale}>` dans le root layout `app/[locale]/layout.tsx` pour l'accessibilité et le SEO
- Wrapper les enfants dans `<NextIntlClientProvider>` dans le layout (les messages sont **hérités automatiquement** depuis next-intl 4.0)
- **Typer les locales et messages** via l'augmentation `declare module 'next-intl' { interface AppConfig { Locale: ...; Messages: ... } }` pour autocomplete IDE et erreurs compile-time
- Ajouter **`openGraph.locale`** (`fr_FR`, `en_US`) dans la Metadata API pour les partages sociaux
- **Métadata localisée** : utiliser `getTranslations` dans `generateMetadata` pour titrer chaque page selon la locale

## À éviter
- Utiliser la config `i18n` dans `next.config.ts` : **Pages Router only**, provoque des bugs/warnings en App Router
- Utiliser **`localeDetection: false`** : déprécié next-intl 4.0, remplacer par `localeCookie: false`
- Oublier `setRequestLocale` dans un layout ou une page : casse le rendu statique par locale
- Passer explicitement `locale`, `messages`, `timeZone` en props à `<NextIntlClientProvider>` : hérités automatiquement depuis la 4.0

## Gotchas
- Next 15+ : `params` est async, `await params` obligatoire (hard error Next 16)
- **next-intl 4.9.1 + Next.js ≥ 16.2** obligatoire pour `use cache` (incompatibilité Next 16.0/16.1 résolue via root params API en 16.2)
- **Distribution ESM-only** depuis next-intl 4 (sauf `next-intl/plugin`) : `"type": "module"` dans `package.json` obligatoire
- **`getRequestConfig`** : argument `locale` déprécié → utiliser `await requestLocale` (next-intl 4)
- **Cookies de locale** : expiration **par session par défaut** depuis next-intl 4 (pas persistent comme avant)
- `createMessagesDeclaration` (type-safe arguments ICU) nécessite `allowArbitraryExtensions: true` dans `tsconfig.json`
- Ordre de détection de la locale : prefix URL → cookie `NEXT_LOCALE` → header `Accept-Language` → `defaultLocale`

## Exemples
```typescript
// ✅ defineRouting centralise la config (locales, defaultLocale, localePrefix)
export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  localePrefix: 'as-needed',
})
```

```typescript
// ✅ Layout [locale] avec setRequestLocale obligatoire + hasLocale type guard
export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export default async function LocaleLayout({ children, params }) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale) // OBLIGATOIRE pour SSG par locale

  return (
    <html lang={locale}>
      <body><NextIntlClientProvider>{children}</NextIntlClientProvider></body>
    </html>
  )
}

// ❌ oubli setRequestLocale → casse le rendu statique par locale
```

```typescript
// ✅ AppConfig augmentation pour type-safety locales + messages
declare module 'next-intl' {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: typeof messages
  }
}
```
