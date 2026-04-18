---
feature: "Feature 6 — Support multilingue (FR / EN)"
subproject: "Extraction contenu textuel et traductions FR/EN"
goal: "Extraire tout le contenu textuel des pages et composants dans les fichiers de messages JSON et câbler les traductions FR/EN via useTranslations/getTranslations"
status: "draft"
complexity: "L"
tdd_scope: "none"
depends_on: ["03-layout-locale-design.md"]
date: "2026-04-16"
---

# Extraction contenu textuel et traductions FR/EN

## Scope

Peupler `messages/fr.json` et `messages/en.json` avec des namespaces organisés par page/feature. Remplacer tous les textes en dur dans les pages et composants partagés par des appels `useTranslations` (Client Components) ou `getTranslations` (async Server Components). Rédiger les traductions anglaises complètes. Utiliser `t.rich()` pour les messages contenant du JSX. Exclut les metadata SEO (sub-project `metadata-seo-localisee`).

### État livré

À la fin de ce sub-project, on peut : naviguer sur `/fr` et voir tout le contenu en français, naviguer sur `/en` et voir tout le contenu en anglais, sans aucun texte en dur dans les composants React.

## Dependencies

- `03-layout-locale-design.md` (statut: implemented) — fournit le layout `[locale]` avec `NextIntlClientProvider` et `setRequestLocale`

## Files touched

- **À modifier** : `messages/fr.json` (peuplement complet de tous les namespaces)
- **À modifier** : `messages/en.json` (traductions anglaises complètes)
- **À modifier** : `src/app/[locale]/(public)/page.tsx` (remplacement textes en dur)
- **À modifier** : `src/app/[locale]/(public)/services/page.tsx`
- **À modifier** : `src/app/[locale]/(public)/projets/page.tsx`
- **À modifier** : `src/app/[locale]/(public)/projets/[slug]/page.tsx`
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx`
- **À modifier** : `src/app/[locale]/(public)/contact/page.tsx`
- **À modifier** : `src/app/[locale]/not-found.tsx`
- **À modifier** : composants partagés dans `src/components/features/` (navbar, footer, etc.)

## Architecture approach

- **Namespaces par page/feature** : `Common`, `Nav`, `Footer`, `HomePage`, `ServicesPage`, `ProjectsPage`, `ProjectPage`, `AboutPage`, `ContactPage`, `NotFound`. Respect de `.claude/rules/next-intl/translations.md` (organiser par feature/page, jamais de namespace monolithique)
- **Server Components async** : `const t = await getTranslations({ locale, namespace })` importé depuis `next-intl/server`. Respect de `.claude/rules/next-intl/translations.md`
- **Client Components** : `const t = useTranslations(namespace)` importé depuis `next-intl`. Le composant doit être wrappé par `NextIntlClientProvider` (déjà fait dans le layout locale)
- **Rich text** : `t.rich(key, { tag: (chunks) => <Component>{chunks}</Component> })` pour les messages contenant du JSX (liens CTA, texte avec balises). Respect de `.claude/rules/next-intl/translations.md`
- **Contenu dynamique BDD** : les données Prisma (titres de projets, descriptions) restent en base et ne sont PAS dans les fichiers de messages. Seuls les labels UI statiques sont externalisés (titres de section, boutons, placeholders formulaire, textes de présentation)
- **Traductions EN** : rédigées directement dans le plan par l'agent, qualité professionnelle adaptée au ton du portfolio

## Acceptance criteria

### Scénario 1 : Contenu FR complet

**GIVEN** l'application démarrée en dev
**WHEN** le visiteur navigue sur `/fr` et toutes les pages publiques
**THEN** tout le contenu textuel s'affiche en français
**AND** le contenu est identique visuellement à la version pré-i18n

### Scénario 2 : Contenu EN complet

**GIVEN** l'application démarrée en dev
**WHEN** le visiteur navigue sur `/en` et toutes les pages publiques
**THEN** tout le contenu textuel s'affiche en anglais
**AND** aucun texte français n'est visible (sauf données dynamiques BDD qui restent dans leur langue d'origine)

### Scénario 3 : Aucun texte en dur résiduel

**GIVEN** le codebase après les modifications
**WHEN** on inspecte les fichiers pages et composants partagés
**THEN** aucune string littérale française visible par l'utilisateur ne reste en dur dans le JSX (sauf noms propres, URLs, et attributs techniques)

### Scénario 4 : Rich text fonctionnel

**GIVEN** un message contenant du JSX (ex: lien CTA dans un paragraphe)
**WHEN** la page est rendue
**THEN** le JSX est correctement interpolé via `t.rich()` et le lien est cliquable

## Edge cases

- **Noms propres** : "Thibaud Geisler", noms de technologies (React, Next.js, PostgreSQL) ne sont PAS traduits, passés en interpolation `{name}` si insérés dans une phrase
- **Données Prisma** : les titres/descriptions de projets viennent de la BDD et ne passent pas par les messages i18n
- **Pluriels** : utiliser la syntaxe ICU `{count, plural, =0 {...} =1 {...} other {# ...}}` si applicable (ex: "X projets livrés")
