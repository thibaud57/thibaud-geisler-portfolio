---
feature: "Feature 5 — SEO & Référencement"
subproject: "Robots.txt avec déclaration du sitemap"
goal: "Exposer /robots.txt autorisant le crawl public des pages indexables, bloquant /api/ et déclarant l'URL absolue du sitemap"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["03-sitemap-dynamique-design.md"]
date: "2026-04-27"
---

# Robots.txt avec déclaration du sitemap

## Scope

Créer `src/app/robots.ts` (Next.js 16 Metadata file convention, retourne `MetadataRoute.Robots`) qui déclare une seule règle `User-agent: *` avec `Allow: /` et `Disallow: /api/`, plus la directive `Sitemap:` pointant vers `${siteUrl}/sitemap.xml` (URL absolue construite via `siteUrl` du sub-project 01). Aucune logique conditionnelle par environnement : le `noindex` hors prod est déjà géré côté HTML par le helper `buildPageMetadata` du sub-project 01 via `<meta name="robots" content="noindex,nofollow">`. **Exclut** la génération du sitemap lui-même (sub-project 03), tout JSON-LD (sub-project 05), les Open Graph images (sub-project 02), et tout `Disallow` pour le dashboard admin (post-MVP, n'existe pas dans les URLs publiques en MVP).

### État livré

À la fin de ce sub-project, on peut : `curl -s http://localhost:3000/robots.txt` retourne le bloc texte exact attendu (`User-agent: *` / `Allow: /` / `Disallow: /api/` / ligne vide / `Sitemap: <siteUrl>/sitemap.xml`), `Content-Type: text/plain`, parseable sans erreur par les crawlers standard et par la Search Console Google ("Robots.txt Tester").

## Dependencies

- `03-sitemap-dynamique-design.md` (statut: draft), la directive `Sitemap:` du robots.txt pointe vers `/sitemap.xml` dont le contenu est généré au sub-project 03. Le robots.txt fonctionne techniquement sans le sitemap (la directive `Sitemap:` reste valide même si l'URL retourne 404 au moment du crawl), mais la valeur opérationnelle ne se concrétise qu'avec les deux livrés ensemble.

## Files touched

- **À créer** : `src/app/robots.ts` (fichier unique, ~10 lignes)

**Non touchés** : `src/lib/seo.ts` (sub-project 01 inchangé, on consomme `siteUrl` tel quel), `src/app/sitemap.ts` (sub-project 03 inchangé), `next.config.ts` (aucune réécriture URL nécessaire, `app/robots.ts` est une convention Next.js détectée automatiquement), `messages/{fr,en}.json` (le robots.txt n'expose aucun texte traduit), `package.json`, `prisma/schema.prisma`.

## Architecture approach

- **Convention Next.js 16 `app/robots.ts`** : export default d'une fonction synchrone retournant `MetadataRoute.Robots`. Next.js sérialise automatiquement l'objet en réponse `text/plain` au format robots.txt standard, route accessible à `/robots.txt`. Voir `.claude/rules/nextjs/metadata-seo.md` (`app/robots.ts`, `app/sitemap.ts`, `app/manifest.ts` retournent les types `MetadataRoute.*`).
- **Une seule règle générique `User-agent: *`** : couvre tous les crawlers (Googlebot, Bingbot, etc.) sans distinction. Pas d'agents spécifiques en MVP, ajustable post-MVP si un crawler problématique nécessite un traitement particulier (ex: rate limit ciblé via `Crawl-delay` non honoré par Google).
- **`Allow: /` + `Disallow: /api/`** : autorise le crawl de toutes les pages publiques (`/fr/...`, `/en/...`, `/sitemap.xml`, `/opengraph-image`, etc.), bloque les endpoints internes (`/api/health`, `/api/contact`, `/api/assets/*`). Convention SEO standard : on signale aux crawlers que `/api/` ne contient pas de contenu indexable. Bénéfice : évite que des URLs comme `/api/assets/projets/.../cover.webp` apparaissent par accident dans Google et générent du bruit dans la Search Console (ex: avertissements "Indexed though blocked").
- **Directive `Sitemap:` avec URL absolue** : convention robots.txt impose une URL absolue (pas relative) pour la directive `Sitemap:`. Le helper `siteUrl` exporté par `src/lib/seo.ts` (sub-project 01) lit `process.env.NEXT_PUBLIC_SITE_URL` avec fallback `http://localhost:3000`. Cette URL est cohérente avec celle utilisée par le helper `buildPageMetadata` (canonical, OG), le sitemap (`buildSitemapEntries`), les images OG (`og-template`). Source unique de vérité.
- **Pas de logique conditionnelle par environnement dans le robots.txt** : le `noindex` hors prod est délibérément géré côté HTML par `buildPageMetadata` du sub-project 01 (`<meta name="robots" content="noindex,nofollow">` quand `NODE_ENV !== 'production'`). Le robots.txt reste permissif tout le temps. Trade-off acté dans le sub-project 01 : le meta tag est plus fiable car appliqué par page et inspectable visuellement, alors qu'un robots.txt conditionnel exige de gérer un mécanisme de switch propre. YAGNI sur le robots.txt conditionnel.
- **Pas de `Disallow: /(admin)` ni `/dashboard`** : le route group `(admin)` (cf. ARCHITECTURE.md) n'apparaît pas dans les URLs publiques (les route groups Next.js sont ignorés dans le path final). Le segment `/dashboard` n'existe pas en MVP (post-MVP via Better Auth + ADR-002). Quand le dashboard arrivera, on ajoutera `disallow: ['/api/', '/dashboard']` dans `app/robots.ts` à ce moment-là.
- **Pas de `Crawl-delay`** : ignoré par Google depuis 2019, et le portfolio n'a pas de problème de charge crawler. YAGNI.
- **Fichier `app/robots.ts` est rendu statique au build** par Next.js 16 (pas de Request-time API utilisée, pas de fetch dynamique). Servi avec `Cache-Control` long par défaut. Pas besoin de `'use cache'` explicite. Voir `.claude/rules/nextjs/metadata-seo.md` (manifest/robots/sitemap convention) et `.claude/rules/nextjs/routing.md`.
- **ADRs liés** : ADR-001 (monolithe Next.js, route handler dans la même app), ADR-006 (hub de démos, robots.txt référence le sitemap du portfolio uniquement, pas les domaines externes des démos).

## Acceptance criteria

### Scénario 1 : Robots.txt servi avec contenu exact attendu
**GIVEN** l'application en mode `pnpm build && pnpm start` (`NEXT_PUBLIC_SITE_URL=https://thibaud-geisler.com`)
**WHEN** un crawler ou un visiteur fait `GET /robots.txt`
**THEN** la réponse a un statut 200 et un `Content-Type: text/plain` (avec ou sans `; charset=utf-8`)
**AND** le corps de la réponse contient exactement (à l'ordre des lignes près imposé par Next.js) :
```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://thibaud-geisler.com/sitemap.xml
```

### Scénario 2 : URL Sitemap absolue cohérente avec siteUrl
**GIVEN** la variable `NEXT_PUBLIC_SITE_URL` valant `https://thibaud-geisler.com` en prod ou `http://localhost:3000` en dev
**WHEN** le robots.txt est servi
**THEN** la directive `Sitemap:` reflète exactement la valeur de `siteUrl` (helper de `src/lib/seo.ts`) suivie de `/sitemap.xml`
**AND** l'URL est absolue (commence par `https://` ou `http://`), conforme à la spec robots.txt qui n'accepte pas de chemins relatifs pour `Sitemap:`

### Scénario 3 : Validation par la Search Console Google (déférable)
**GIVEN** le projet déployé en prod sur `https://thibaud-geisler.com`
**WHEN** l'URL `https://thibaud-geisler.com/robots.txt` est testée via le "Robots.txt Tester" de la Google Search Console
**THEN** Google reconnaît le format sans erreur de parsing
**AND** la directive `Sitemap:` est suivie automatiquement (le sitemap apparaît dans le rapport "Sitemaps" de la Search Console après soumission ou crawl initial)

## Edge cases

- **`NEXT_PUBLIC_SITE_URL` absente** : `siteUrl` retombe sur `http://localhost:3000` (fallback codé dans `src/lib/seo.ts:8`). Le robots.txt reste valide localement. En prod, `NEXT_PUBLIC_SITE_URL` doit être configurée via Dokploy (politique PRODUCTION.md).
- **`NEXT_PUBLIC_SITE_URL` avec trailing slash** (ex: `https://thibaud-geisler.com/`) : la directive `Sitemap:` produirait `https://thibaud-geisler.com//sitemap.xml` (double slash). Comportement à éviter, soit en normalisant via `siteUrl.replace(/\/$/, '')` dans `app/robots.ts`, soit en assumant que la convention `siteUrl` n'a jamais de trailing slash (déjà l'hypothèse implicite des sub-projects 01/02/03). À acter dans le plan d'implémentation : appliquer la même normalisation que `buildSitemapEntries` du sub-project 03.
- **Mode dev local (`pnpm dev`)** : `siteUrl = 'http://localhost:3000'`. Le robots.txt produit `Sitemap: http://localhost:3000/sitemap.xml`. Aucun crawler externe ne consulte ce robots.txt (localhost), donc impact nul. Le `noindex` hors prod est géré côté metadata par `buildPageMetadata` du sub-project 01.
