---
paths:
  - "src/app/[locale]/**/*.tsx"
  - "src/components/**/*.tsx"
  - "messages/**/*.json"
---

# next-intl — Traductions, ICU & formatage

## À faire
- Utiliser **`useTranslations(namespace)`** dans les composants sync (Server ou Client), **`getTranslations({ locale, namespace })`** en async côté serveur (Server Components async, Server Actions, Route Handlers, `generateMetadata`)
- Stocker les messages dans `messages/fr.json` et `messages/en.json` avec **namespaces imbriqués** (HomePage, Nav, ContactForm) — le caractère `.` accède au nesting (`t('form.placeholder')`)
- **Un seul `useTranslations` / `getTranslations` par composant si tous les keys vivent sous le même parent**. Accéder aux sous-namespaces via dot notation (`t(\`contractStatus.${value}\`)`, `t('stats.years.label')`) plutôt que d'instancier N hooks (`useTranslations('Foo.bar')` + `useTranslations('Foo.baz')` est verbeux et redondant). N hooks autorisés uniquement si les namespaces top-level diffèrent (ex: `'ErrorPage'` + `'Common'`)
- Pour les messages ICU avec pluriels : utiliser les tags `zero`, `one`, `two`, `few`, `many`, `other` (seul `other` obligatoire), `#` insère la valeur numérique
- **`t.rich(key, tags)`** pour interpoler du JSX dans un message (ex: footer avec liens vers les CGV, mentions légales)
- **`useFormatter()` / `getFormatter()`** pour formater dates et nombres selon la locale : `format.dateTime`, `format.number`, `format.relativeTime`, `format.list` — basé sur l'API `Intl` native du navigateur
- **Séparer UI chrome et content DB** : les labels d'interface (nav, boutons, titres de page statiques, enums bornés) vivent dans `messages/{fr,en}.json` et sont consommés via `useTranslations` / `getTranslations`. Le **content éditorial long** stocké en BDD (titres de projets, descriptions, markdown case study, noms de tags affichés) passe par des **colonnes jumelées Prisma `<champ>Fr`/`<champ>En`** et un helper pur `localize*(entity, locale)` qui résout le bon champ avant render (cf. `src/i18n/localize-content.ts`). Ne jamais dupliquer du content éditorial dans `messages/*.json`

## À éviter
- Concaténer des strings pour construire un message : perd le support ICU (interpolation, plurals, rich text)
- Faire confiance à un fallback automatique vers une autre locale si traduction manquante : pas de mécanisme built-in, fusionner les messages dans `request.ts` ou utiliser `getMessageFallback`
- Mélanger toutes les traductions dans un seul namespace monolithique : organiser par feature/page (HomePage, Nav, ContactForm)
- Multiplier `useTranslations`/`getTranslations` pour des sous-namespaces du même parent (`'Foo.bar'` + `'Foo.baz'` + `'Foo.qux'`) : 1 hook sur `'Foo'` + dot notation suffit, plus DRY et moins de subscriptions React

## Gotchas
- Depuis next-intl 4.0, **`NextIntlClientProvider` obligatoire** pour tous les Client Components qui utilisent `useTranslations` — sinon erreur de contexte (avant 4.0 : optionnel)
- `onError` et `getMessageFallback` ne sont **pas hérités** par `NextIntlClientProvider` : les définir explicitement dans un wrapper Client si nécessaire
- Pour la config initiale (`defineRouting`, `setRequestLocale`, `createNavigation`, layout `[locale]`, types `AppConfig`) : voir `next-intl/setup.md`

## Exemples
```typescript
// ✅ Server Component async → getTranslations (depuis 'next-intl/server')
export default async function Page({ params }) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Namespace' })
  return <h1>{t('title')}</h1>
}

// ❌ useTranslations dans un Server Component async (utiliser getTranslations)
const t = useTranslations('Namespace')
```

```typescript
// ✅ t.rich pour interpoler du JSX dans un message
// messages/fr.json : { "footer": { "terms": "Lire nos <link>conditions</link>." } }
t.rich('footer.terms', {
  link: (chunks) => <Link href="/conditions">{chunks}</Link>,
})
```

```typescript
// ✅ useFormatter pour dates/nombres localisés (basé sur Intl natif)
const format = useFormatter()
format.dateTime(date, { year: 'numeric', month: 'long', day: 'numeric' })
format.number(price, { style: 'currency', currency: 'EUR' })
format.relativeTime(pastDate, now) // "il y a 2 jours"
```

```typescript
// ✅ 1 hook + dot notation pour les sous-namespaces du même parent
const t = useTranslations('Projects.caseStudy')
t(`contractStatus.${contract}`)   // au lieu de useTranslations('Projects.caseStudy.contractStatus')
t(`workMode.${workMode}`)         // au lieu de useTranslations('Projects.caseStudy.workMode')
t(`sector.${sector}`)             // au lieu de useTranslations('Projects.caseStudy.sector')

// ❌ N hooks pour des sous-namespaces du même parent (verbeux, redondant)
const t = useTranslations('Projects.caseStudy')
const tContract = useTranslations('Projects.caseStudy.contractStatus')
const tWorkMode = useTranslations('Projects.caseStudy.workMode')
const tSector = useTranslations('Projects.caseStudy.sector')

// ✅ N hooks JUSTIFIÉS uniquement si namespaces top-level différents
const t = useTranslations('ErrorPage')
const tCommon = useTranslations('Common')
```
