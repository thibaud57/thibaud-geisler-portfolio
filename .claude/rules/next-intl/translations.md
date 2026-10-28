---
paths:
  - "src/{app,components}/**/*.tsx"
  - "messages/**/*.json"
---

# next-intl : traductions, ICU et formatage

## À faire
- Utiliser **`useTranslations(namespace)`** dans les composants sync (Server ou Client), **`getTranslations(namespace)`** en async côté serveur : la locale vient des root params. Passer **`{ locale, namespace }`** seulement là où les root params manquent (Server Actions, Route Handlers, `global-not-found.tsx`) ou pour forcer une autre locale
- Stocker les messages dans `messages/fr.json` et `messages/en.json` avec **namespaces imbriqués** par feature ou page : le caractère `.` accède au nesting (`t('form.placeholder')`)
- **Un seul `useTranslations` / `getTranslations` par composant si toutes les clés vivent sous le même parent**, sous-namespaces atteints par dot notation (`t(\`status.${value}\`)`). Plusieurs hooks seulement si les namespaces top-level diffèrent (ex: `'ErrorPage'` + `'Common'`)
- **`t.rich(key, tags)`** pour interpoler du JSX dans un message (ex: footer avec liens vers les CGV, mentions légales)
- **`useFormatter()` / `getFormatter()`** pour formater dates et nombres selon la locale : `format.dateTime`, `format.number`, `format.relativeTime`, `format.list`
- **Séparer UI chrome et content DB** : les labels d'interface (nav, boutons, titres de page statiques, enums bornés) vivent dans `messages/{fr,en}.json`. Le **content éditorial long** stocké en BDD (titres de projets, descriptions, markdown case study, noms de tags affichés) passe par des **colonnes jumelées Prisma `<champ>Fr`/`<champ>En`** et un helper pur `localize*(entity, locale)` qui résout le bon champ avant render (cf. `src/i18n/localize-content.ts`). Ne jamais dupliquer du content éditorial dans `messages/*.json`

## À éviter
- Faire confiance à un fallback automatique vers une autre locale si traduction manquante : pas de mécanisme built-in, fusionner les messages dans `request.ts` ou utiliser `getMessageFallback`

## Gotchas
- **L'espace admin est monolingue français** (ADR-021) : ses libellés d'interface (`src/app/admin/**`, `src/components/features/admin/**`, `src/components/layout/admin/**`) restent en dur, hors next-intl. Seul le contenu bilingue qu'il édite (`nameFr`/`nameEn`…) relève des colonnes jumelées
- Depuis next-intl 4.0, **`NextIntlClientProvider` obligatoire** pour tous les Client Components qui utilisent `useTranslations`, sinon erreur de contexte
- `onError` et `getMessageFallback` ne sont **pas hérités** par `NextIntlClientProvider` : les définir explicitement dans un wrapper Client si nécessaire
- Pour la config initiale (`defineRouting`, `createNavigation`, layout `[locale]`, types `AppConfig`) : voir `next-intl/setup.md`

## Exemples
```typescript
// ✅ Server Component async → getTranslations (depuis 'next-intl/server'), locale des root params
export default async function Page() {
  const t = await getTranslations('Namespace')
  return <h1>{t('title')}</h1>
}

// ✅ Server Action : pas de root params, locale passée explicitement
const t = await getTranslations({ locale, namespace: 'Namespace' })

// ❌ useTranslations dans un Server Component async (utiliser getTranslations)
const t = useTranslations('Namespace')
```

```typescript
// ✅ 1 hook + dot notation pour les sous-namespaces du même parent
const t = useTranslations('Foo')
t(`status.${status}`)
t(`mode.${mode}`)

// ❌ Un hook par sous-namespace du même parent
const tStatus = useTranslations('Foo.status')
const tMode = useTranslations('Foo.mode')
```
