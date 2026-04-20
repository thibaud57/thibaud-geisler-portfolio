---
feature: "Feature 6 — Support multilingue (FR / EN)"
subproject: "Restructuration app sous segment [locale]"
goal: "Restructurer l'application sous le segment dynamique [locale] avec le root layout configuré pour le rendu statique multilingue"
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: ["01-config-routing-types-design.md"]
date: "2026-04-16"
---

# Restructuration app sous segment [locale]

## Scope

Migrer le root layout existant (`src/app/layout.tsx`) dans `src/app/[locale]/layout.tsx` en ajoutant le support i18n (`setRequestLocale`, `NextIntlClientProvider`, `hasLocale`, `generateStaticParams`, `<html lang={locale}>`). Déplacer toutes les pages publiques de `src/app/(public)/` vers `src/app/[locale]/(public)/` en ajoutant `setRequestLocale(locale)` dans chaque page. Créer `src/app/[locale]/not-found.tsx` pour les 404 localisés. Exclut le contenu traduit (sub-project `messages-contenu`), la navigation localisée (sub-project `navigation-localisee`), et le sélecteur de langue (sub-project `selecteur-langue`).

### État livré

À la fin de ce sub-project, on peut : accéder à `/fr/projets` et `/en/projets` dans le navigateur, voir les pages s'afficher correctement, et vérifier dans le code source que `<html lang="fr">` ou `<html lang="en">` est présent selon la locale.

## Dependencies

- `01-config-routing-types-design.md` (statut: implemented) — fournit `routing` (defineRouting), `setRequestLocale`, `NextIntlClientProvider`, `hasLocale`, `generateStaticParams`

## Files touched

- **À créer** : `src/app/[locale]/layout.tsx` (migration du contenu de l'ancien root layout + ajouts i18n)
- **À supprimer** : `src/app/layout.tsx` (remplacé par le layout locale)
- **À déplacer + modifier** : `src/app/(public)/page.tsx` → `src/app/[locale]/(public)/page.tsx` (ajout `setRequestLocale`)
- **À déplacer + modifier** : `src/app/(public)/services/page.tsx` → `src/app/[locale]/(public)/services/page.tsx`
- **À déplacer + modifier** : `src/app/(public)/projets/page.tsx` → `src/app/[locale]/(public)/projets/page.tsx`
- **À déplacer + modifier** : `src/app/(public)/projets/[slug]/page.tsx` → `src/app/[locale]/(public)/projets/[slug]/page.tsx`
- **À déplacer + modifier** : `src/app/(public)/a-propos/page.tsx` → `src/app/[locale]/(public)/a-propos/page.tsx`
- **À déplacer + modifier** : `src/app/(public)/contact/page.tsx` → `src/app/[locale]/(public)/contact/page.tsx`
- **À créer** : `src/app/[locale]/not-found.tsx`

## Architecture approach

- **Migration du root layout** : le contenu de `src/app/layout.tsx` (fonts Geist Sans / Sansation / Geist Mono via `next/font/google`, ThemeProvider next-themes, classes CSS globales) est migré intégralement dans `src/app/[locale]/layout.tsx`. L'ancien fichier est supprimé. Respect de `.claude/rules/nextjs/routing.md`
- **i18n dans le layout** : `setRequestLocale(locale)` appelé avant le rendering, `NextIntlClientProvider` wrappant les enfants (messages hérités automatiquement, next-intl 4+), `hasLocale(routing.locales, locale)` + `notFound()` comme garde de validation. Respect de `.claude/rules/next-intl/setup.md`
- **SSG multilingue** : `generateStaticParams` retourne `routing.locales.map(locale => ({ locale }))` pour pré-générer les variantes FR et EN de chaque page
- **Params async** : Next.js 16 impose `params` comme `Promise`, `const { locale } = await params` obligatoire dans les layouts et pages. Respect de `.claude/rules/nextjs/server-client-components.md`
- **`<html lang={locale} suppressHydrationWarning>`** : `lang` pour l'accessibilité et le SEO, `suppressHydrationWarning` car next-themes modifie l'attribut `class` côté client (mismatch hydration attendu)
- **setRequestLocale dans chaque page** : obligatoire dans chaque `layout.tsx` ET chaque `page.tsx` sous `[locale]` pour que Next.js puisse pré-générer les pages en SSG (les layouts et pages sont rendus indépendamment)
- **Contenu inchangé** : les textes en dur des pages restent tels quels, ils seront remplacés par les appels `useTranslations`/`getTranslations` dans le sub-project `messages-contenu`

## Acceptance criteria

### Scénario 1 : Pages accessibles sous les deux locales

**GIVEN** l'application démarrée en dev
**WHEN** le visiteur accède à `/fr/projets`
**THEN** la page projets s'affiche correctement
**AND** le même contenu est accessible via `/en/projets`

### Scénario 2 : Attribut lang sur HTML

**GIVEN** l'application démarrée en dev
**WHEN** le visiteur accède à `/fr/a-propos`
**THEN** le code source contient `<html lang="fr"`
**AND** en accédant à `/en/a-propos`, le code source contient `<html lang="en"`

### Scénario 3 : Locale invalide renvoie 404

**GIVEN** l'application démarrée en dev
**WHEN** le visiteur accède à `/de/projets` (locale non supportée)
**THEN** la page 404 localisée s'affiche (via `notFound()` déclenché par `hasLocale`)

### Scénario 4 : Providers existants fonctionnels

**GIVEN** l'application avec ThemeProvider (next-themes) migré dans le layout locale
**WHEN** le visiteur utilise le toggle dark/light mode
**THEN** le theme switch fonctionne normalement (pas de régression)

### Scénario 5 : Fonts chargées correctement

**GIVEN** les fonts (Geist Sans, Sansation, Geist Mono) migrées dans le layout locale
**WHEN** le visiteur accède à n'importe quelle page
**THEN** les fonts sont chargées et appliquées correctement (pas de flash de font par défaut)
