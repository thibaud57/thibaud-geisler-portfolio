---
feature: "Feature 6 — Support multilingue (FR / EN)"
subproject: "Proxy de détection automatique de locale"
goal: "Configurer le proxy Next.js 16+ pour la détection automatique de locale (Accept-Language, cookie) et la redirection vers /fr ou /en"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["01-config-routing-types-design.md"]
date: "2026-04-16"
---

# Proxy de détection automatique de locale

## Scope

Créer `src/proxy.ts` avec `createMiddleware(routing)` de next-intl pour intercepter toutes les requêtes, détecter la locale du visiteur (préfixe URL, cookie `NEXT_LOCALE`, header `Accept-Language`, ou `defaultLocale` en fallback) et rediriger vers `/fr` ou `/en`. Exclut la configuration du routing i18n (sub-project `config-routing-types`, implémenté) et la restructuration du layout (sub-project `layout-locale`).

### État livré

À la fin de ce sub-project, on peut : accéder à `/` dans un navigateur et être redirigé automatiquement vers `/fr` ou `/en` (code 307) selon la langue du navigateur.

## Dependencies

- `01-config-routing-types-design.md` (statut: implemented) — fournit `routing` (defineRouting avec locales, defaultLocale, localePrefix)

## Files touched

- **À créer** : `src/proxy.ts`

## Architecture approach

- `export default createMiddleware(routing)` : pattern standard next-intl, export default du handler retourné par `createMiddleware`. Respect de `.claude/rules/next-intl/setup.md`
- Fichier `src/proxy.ts` (Next.js 16+ : remplace `middleware.ts`). Respect de `.claude/rules/nextjs/proxy.md`
- Matcher strict : `['/((?!api|_next|_vercel|.*\\..*).*)']` pour exclure les routes API, les assets Next.js (`_next/static`, `_next/image`), les fichiers Vercel (`_vercel`), et tout fichier avec extension (favicon.ico, images, fonts)
- Ordre de détection de locale par next-intl : préfixe URL > cookie `NEXT_LOCALE` > header `Accept-Language` > `defaultLocale` (`'fr'`)
- Cookie `NEXT_LOCALE` stocké automatiquement par next-intl (expiration par session, comportement par défaut next-intl 4)
- Pas de logique proxy additionnelle au MVP (pas de Better Auth, pas de headers custom). Le proxy sera étendu post-MVP quand le dashboard admin arrivera.

## Acceptance criteria

### Scénario 1 : Redirection racine vers locale détectée

**GIVEN** un navigateur avec `Accept-Language: en`
**WHEN** le visiteur accède à `/`
**THEN** le proxy redirige vers `/en` avec un code HTTP 307

### Scénario 2 : Redirection racine vers locale par défaut

**GIVEN** un navigateur avec `Accept-Language: de` (locale non supportée)
**WHEN** le visiteur accède à `/`
**THEN** le proxy redirige vers `/fr` (defaultLocale) avec un code HTTP 307

### Scénario 3 : Pas de redirection si locale explicite

**GIVEN** un visiteur accédant à `/fr/projets`
**WHEN** la requête atteint le proxy
**THEN** la requête passe sans redirection (la locale est déjà explicite dans l'URL)

### Scénario 4 : Assets statiques exclus du proxy

**GIVEN** une requête vers `/_next/static/chunk.js` ou `/favicon.ico`
**WHEN** la requête est évaluée par le matcher
**THEN** le proxy ne s'exécute pas (le matcher exclut ces chemins)
