---
feature: "Feature 6 — Support multilingue (FR / EN)"
subproject: "Metadata SEO localisées et sitemap multilingue"
goal: "Localiser les metadata SEO de toutes les pages (titres, descriptions, Open Graph) et adapter le sitemap pour le support multilingue avec hreflang"
status: "implemented"
complexity: "M"
tdd_scope: "none"
depends_on: ["05-messages-contenu-design.md"]
date: "2026-04-16"
---

# Metadata SEO localisées et sitemap multilingue

## Scope

Ajouter `generateMetadata` utilisant `getTranslations` dans chaque page pour localiser title, description et `openGraph.locale` (`fr_FR`, `en_US`). Configurer le title template localisé dans le layout. Ajouter `alternates.languages` avec hreflang sur chaque page. Adapter le sitemap dynamique pour inclure les alternates hreflang pour chaque locale. Ajouter un namespace `Metadata` dans les fichiers de messages. Exclut le contenu des traductions des pages (sub-project `messages-contenu`, implémenté).

### État livré

À la fin de ce sub-project, on peut : inspecter le code source de n'importe quelle page et voir des `<title>` et `<meta name="description">` localisés, un `<meta property="og:locale">` correct (`fr_FR` ou `en_US`), des balises `<link rel="alternate" hreflang>`, et un sitemap.xml contenant les entrées hreflang pour les deux locales.

## Dependencies

- `05-messages-contenu-design.md` (statut: implemented) — les messages et le layout locale sont en place

## Files touched

- **À modifier** : `messages/fr.json` (ajout namespace Metadata)
- **À modifier** : `messages/en.json` (ajout namespace Metadata)
- **À modifier** : `src/app/[locale]/layout.tsx` (metadataBase, title template localisé, viewport)
- **À modifier** : `src/app/[locale]/(public)/page.tsx` (generateMetadata)
- **À modifier** : `src/app/[locale]/(public)/services/page.tsx` (generateMetadata)
- **À modifier** : `src/app/[locale]/(public)/projets/page.tsx` (generateMetadata)
- **À modifier** : `src/app/[locale]/(public)/projets/[slug]/page.tsx` (generateMetadata)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (generateMetadata)
- **À modifier** : `src/app/[locale]/(public)/contact/page.tsx` (generateMetadata)
- **À modifier** : `src/app/sitemap.ts` (alternates hreflang multilingue)

## Architecture approach

- **Title template localisé** dans le layout : `generateMetadata` dans `src/app/[locale]/layout.tsx` retournant `title: { template: '%s | Thibaud Geisler', default: t('site_title') }` via `getTranslations('Metadata')`. `metadataBase` défini ici avec `process.env.NEXT_PUBLIC_SITE_URL`. Respect de `.claude/rules/nextjs/metadata-seo.md`
- **generateMetadata par page** : chaque page exporte `generateMetadata` async utilisant `getTranslations({ locale, namespace: 'Metadata' })` pour localiser `title` et `description`. Respect de `.claude/rules/nextjs/metadata-seo.md` et `.claude/rules/next-intl/setup.md`
- **openGraph.locale** : `fr_FR` pour la locale `fr`, `en_US` pour la locale `en`, défini dans chaque `generateMetadata`
- **alternates.languages** : chaque page inclut `alternates: { languages: { fr: '/fr/path', en: '/en/path', 'x-default': '/fr/path' } }` pour le SEO multilingue. `x-default` pointe vers la locale par défaut (FR). Respect de `.claude/rules/nextjs/metadata-seo.md`
- **Sitemap multilingue** : `src/app/sitemap.ts` génère les entrées pour les deux locales avec `alternates.languages` par URL, permettant à Google d'indexer correctement les versions FR et EN
- **Namespace Metadata** : les titres et descriptions SEO sont séparés du contenu visible dans un namespace dédié pour permettre un wording SEO-optimisé indépendant du contenu de la page

## Acceptance criteria

### Scénario 1 : Title localisé avec template

**GIVEN** le visiteur sur `/fr/projets`
**WHEN** il inspecte le `<title>` dans le code source
**THEN** le titre est en français, formaté selon le template (ex: "Projets | Thibaud Geisler")

### Scénario 2 : Description localisée

**GIVEN** le visiteur sur `/en/services`
**WHEN** il inspecte `<meta name="description">` dans le code source
**THEN** la description est en anglais

### Scénario 3 : openGraph.locale correct

**GIVEN** le visiteur sur `/fr/a-propos`
**WHEN** il inspecte `<meta property="og:locale">` dans le code source
**THEN** la valeur est `fr_FR`
**AND** sur `/en/a-propos`, la valeur est `en_US`

### Scénario 4 : Hreflang alternate links

**GIVEN** le visiteur sur `/fr/projets`
**WHEN** il inspecte le `<head>` dans le code source
**THEN** il trouve `<link rel="alternate" hreflang="en" href=".../en/projets">`
**AND** `<link rel="alternate" hreflang="fr" href=".../fr/projets">`
**AND** `<link rel="alternate" hreflang="x-default" href=".../fr/projets">`

### Scénario 5 : Sitemap multilingue

**GIVEN** le sitemap.xml généré
**WHEN** on inspecte une entrée de page statique
**THEN** elle contient les alternates pour `/fr/...` et `/en/...`
**AND** les entrées de projets dynamiques incluent aussi les alternates pour les deux locales
