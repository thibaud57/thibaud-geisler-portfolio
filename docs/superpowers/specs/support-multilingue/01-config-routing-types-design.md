---
feature: "Feature 6 — Support multilingue (FR / EN)"
subproject: "Configuration fondation i18n next-intl"
goal: "Configurer le routing centralisé, le chargement des messages par requête et l'augmentation TypeScript pour la type-safety des locales et clés de traduction"
status: "draft"
complexity: "S"
tdd_scope: "none"
depends_on: []
date: "2026-04-16"
---

# Configuration fondation i18n next-intl

## Scope

Mettre en place la fondation i18n du projet : `defineRouting` centralisant les locales et la stratégie de routing, `getRequestConfig` chargeant dynamiquement les messages JSON par locale, augmentation TypeScript `AppConfig` pour la type-safety des clés de traduction, fichiers messages squelettes, et plugin next-intl dans `next.config.ts`. Exclut le middleware/proxy (sub-project `proxy-detection-locale`), la restructuration du layout sous `[locale]` (sub-project `layout-locale`), et le contenu des traductions (sub-project `messages-contenu`).

### État livré

À la fin de ce sub-project, on peut : vérifier que les fichiers de configuration i18n existent avec `locales: ['fr', 'en']` et `defaultLocale: 'fr'`, que les types AppConfig sont augmentés (autocomplete IDE sur les locales), et que `tsc --noEmit` passe sans erreur.

## Dependencies

Aucune — ce sub-project est autoporté. Premier sub-project de la feature i18n.

## Files touched

- **À créer** : `src/i18n/routing.ts`
- **À créer** : `src/i18n/request.ts`
- **À créer** : `src/i18n/types.ts`
- **À créer** : `messages/fr.json`
- **À créer** : `messages/en.json`
- **À modifier** : `next.config.ts` (ajout plugin next-intl)

## Architecture approach

- `defineRouting()` dans `src/i18n/routing.ts` : source unique de vérité pour `locales: ['fr', 'en']`, `defaultLocale: 'fr'`, `localePrefix: 'always'`. Pas de config `pathnames` (segments de route unifiés dans toutes les locales, décision actée pour ce MVP). Respect de `.claude/rules/next-intl/setup.md`
- `getRequestConfig()` dans `src/i18n/request.ts` : utilise `await requestLocale` (API next-intl 4, argument `locale` déprécié), valide via `hasLocale(routing.locales, requested)` avec fallback sur `routing.defaultLocale`, import dynamique des messages `messages/${locale}.json` (code-splitting automatique par locale). Respect de `.claude/rules/next-intl/setup.md`
- Augmentation TypeScript dans `src/i18n/types.ts` : `declare module 'next-intl'` avec `AppConfig { Locale: (typeof routing.locales)[number], Messages: typeof messages }`. `Messages` dérivé de `messages/fr.json` (fichier FR = référence pour les types). Respect de `.claude/rules/typescript/conventions.md`
- Messages squelettes `messages/fr.json` et `messages/en.json` : objets JSON vides `{}`, seront peuplés par le sub-project `messages-contenu`
- Plugin next-intl dans `next.config.ts` via `createNextIntlPlugin('./src/i18n/request.ts')` wrappant la config existante. Respect de `.claude/rules/nextjs/configuration.md`

## Acceptance criteria

### Scénario 1 : Configuration i18n compilable

**GIVEN** les 5 fichiers i18n créés et `next.config.ts` modifié
**WHEN** `tsc --noEmit` est exécuté
**THEN** aucune erreur TypeScript n'est produite
**AND** les types `Locale` et `Messages` sont disponibles via l'augmentation AppConfig

### Scénario 2 : Routing config cohérent

**GIVEN** `src/i18n/routing.ts` importé dans un fichier TypeScript
**WHEN** on accède à `routing.locales`
**THEN** la valeur est `['fr', 'en']`
**AND** `routing.defaultLocale` est `'fr'`

### Scénario 3 : Messages chargés dynamiquement

**GIVEN** `src/i18n/request.ts` configuré avec import dynamique
**WHEN** `getRequestConfig` est appelé avec `requestLocale` résolvant `'en'`
**THEN** les messages de `messages/en.json` sont chargés
**AND** la locale retournée est `'en'`

### Scénario 4 : Locale invalide fallback sur défaut

**GIVEN** `src/i18n/request.ts` configuré
**WHEN** `getRequestConfig` est appelé avec une locale invalide (ex: `'de'`)
**THEN** `hasLocale` retourne `false`
**AND** la locale retournée est `'fr'` (defaultLocale)

## Architectural decisions

### Décision : Stratégie des slugs et préfixes de route (résolution sous-question ADR-010)

**Options envisagées :**
- **A. Slugs language-agnostic + pathnames unifiés** : un seul slug par entité (`mon-projet`), segments de route identiques dans toutes les locales (`/fr/projets/mon-projet`, `/en/projets/mon-projet`). Pas de config `pathnames` dans defineRouting.
- **B. Slugs localisés + pathnames traduits** : un slug par locale en BDD (`mon-projet` / `my-project`), segments traduits (`/fr/projets/` / `/en/projects/`). Config `pathnames` dans defineRouting + mapping à maintenir + 2 colonnes slug en BDD.

**Choix : A**

**Rationale :**
- Simplicité BDD : une seule colonne `slug` par entité, pas de synchronisation
- `generateStaticParams` trivial : une seule valeur à générer par projet
- Cohérent avec le périmètre single-user MVP : le volume de contenu dynamique est faible, l'overhead de S2 n'est pas justifié
- La config defineRouting reste minimale (pas de `pathnames`), réduisant la surface de maintenance
- Réversible : migrer vers S2 plus tard est possible sans casser les URLs existantes (ajout de redirects)

### Décision : Stratégie de type-safety des messages

**Options envisagées :**
- **A. typeof import fr.json** : importer `messages/fr.json` dans `types.ts` et dériver `Messages` via `typeof`. Autocomplete sur les clés, erreur si clé manquante.
- **B. createMessagesDeclaration** : type-safe sur les arguments ICU (`{name}`, `{count, plural, ...}`). Requiert `allowArbitraryExtensions: true` dans tsconfig.json.

**Choix : A**

**Rationale :**
- Suffisant pour le MVP avec des messages squelettes vides
- Zero overhead de configuration (pas de modification tsconfig)
- createMessagesDeclaration peut être ajouté plus tard (sub-project `messages-contenu`) quand les messages seront peuplés et que la valeur des types ICU sera concrète
