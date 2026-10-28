---
paths:
  - "src/i18n/**/*.ts"
  - "src/proxy.ts"
  - "src/app/?locale?/**/{page,layout}.tsx"
  - "src/app/global-not-found.tsx"
  - "next.config.ts"
---

# next-intl : setup, routing et static rendering

## À faire
- Centraliser la config dans `src/i18n/routing.ts` via **`defineRouting()`** : `locales: ['fr', 'en']`, `defaultLocale: 'fr'`, `localePrefix: 'always'` (fr et en toujours explicites dans l'URL), `alternateLinks: false` (les hreflang viennent des métadonnées, cf. `nextjs/metadata-seo.md`)
- Déclarer `generateStaticParams` des locales sur le layout `[locale]` : avec `cacheComponents`, chaque root param doit avoir au moins une valeur, sinon le build échoue
- Résoudre la locale dans `src/i18n/request.ts` par **`locale` de `next/root-params`** (`rootLocale()`), avec repli sur `defaultLocale` quand elle est absente (hors du segment, ex. `global-not-found.tsx`) : elle est disponible au rendu statique sans être annoncée page par page
- Ouvrir chaque `layout.tsx` et `page.tsx` par **`setupLocalePage(params)`** (`src/i18n/locale-guard.ts`) et `generateMetadata` par **`setupLocaleMetadata(params)`** (`src/lib/seo.ts`) : ils valident la locale par `hasLocale` et appellent `notFound()` sinon
- Importer les APIs navigation localisées via **`createNavigation(routing)`** : `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname`
- Déclarer `<html lang={locale}>` dans le root layout `app/[locale]/layout.tsx`
- Wrapper les enfants dans `<NextIntlClientProvider>` dans le layout, sans props : messages, locale et fuseau sont hérités depuis next-intl 4.0
- **Typer les locales et messages** via l'augmentation `declare module 'next-intl' { interface AppConfig { Locale: ...; Messages: ... } }`
- Localiser les métadonnées : `getTranslations` dans `generateMetadata` et **`openGraph.locale`** (`fr_FR`, `en_US`) pour les partages sociaux

## À éviter
- Appeler **`setRequestLocale`** : abandonné par le projet au profit de `next/root-params`, il n'apporte plus rien
- Lire **`requestLocale`** dans `getRequestConfig` : déprécié, remplacé par `rootLocale()`
- Utiliser la config `i18n` dans `next.config.ts` : **Pages Router only**, provoque des bugs/warnings en App Router

## Gotchas
- `getTranslations()` sous `'use cache'` exige **Next.js >= 16.3** : c'est la 16.3.0 qui active les root params par défaut (`docs/VERSIONS.md` § next-intl)
- **Cookies de locale** : expiration par session par défaut depuis next-intl 4
- Ordre de détection de la locale : prefix URL → cookie `NEXT_LOCALE` → header `Accept-Language` → `defaultLocale`

## Exemples
```typescript
// ✅ request.ts : locale lue par root params, repli hors segment
export default getRequestConfig(async ({ locale: override }) => {
  const requested = override ?? (await rootLocale())
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  return { locale, messages: (await import(`../../messages/${locale}.json`)).default }
})
```

```typescript
// ✅ Layout [locale] : garde de locale, sans setRequestLocale
export default async function LocaleLayout({ children, params }) {
  const { locale } = await setupLocalePage(params)
  return (
    <html lang={locale}>
      <body><NextIntlClientProvider>{children}</NextIntlClientProvider></body>
    </html>
  )
}

// ❌ setRequestLocale : abandonné, la locale vient de next/root-params
setRequestLocale(locale)
```
