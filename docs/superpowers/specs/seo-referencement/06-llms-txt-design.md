---
feature: "Feature 5 — SEO & Référencement"
subproject: "Fichier llms.txt pour AI engines (GEO 2026)"
goal: "Exposer /llms.txt à la racine du domaine au format llmstxt.org pour fournir aux AI engines (ChatGPT, Perplexity, Claude search) une carte structurée et machine-readable du portfolio"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: []
date: "2026-04-28"
---

# Fichier llms.txt pour AI engines (GEO 2026)

## Scope

Créer `src/app/llms.txt/route.ts` (route handler Next.js GET) qui retourne un markdown UTF-8 conforme à la convention [llmstxt.org](https://llmstxt.org) : H1 nom du site + blockquote description courte + section H2 `## Pages` avec liens vers les 5 pages publiques principales + section H2 `## Optional` avec liens vers le sitemap et les profils sociaux. Réutilise `siteUrl` du sub-project 01 et les URLs LinkedIn/GitHub de `src/config/social-links.ts` (hardcodées dans le template string, statique). **Exclut** la génération dynamique du contenu depuis Prisma (chrome statique en MVP, à reconsidérer post-MVP avec blog), une variante par locale (1 seul fichier en EN à la racine, conforme à la pratique des sites adopteurs Anthropic/Cloudflare/Stripe), tout impact sur le sub-project 04 robots.txt (le `User-agent: *` actuel autorise déjà les crawlers AI).

### État livré

À la fin de ce sub-project, on peut : `curl -s https://thibaud-geisler.com/llms.txt` retourne un markdown UTF-8 valide en `Content-Type: text/plain; charset=utf-8` (statut 200), parseable par les AI engines, conforme au format llmstxt.org (H1 + blockquote + sections H2 `Pages` et `Optional`).

## Dependencies

Aucune, ce sub-project est autoporté. Il consomme `siteUrl` du sub-project 01 (statut `draft`) et référence l'URL du sitemap produite par le sub-project 03 (statut `draft`), mais peut être implémenté en parallèle car le contenu est du chrome statique : `siteUrl` a un fallback `'http://localhost:3000'` déjà en place dans `src/lib/seo.ts`, et l'URL `${siteUrl}/sitemap.xml` reste valide au moins en string même si `app/sitemap.ts` n'est pas encore livré.

## Files touched

- **À créer** : `src/app/llms.txt/route.ts` (route handler GET, ~30 lignes, retourne `Response` avec markdown en body)

**Non touchés** :
- `src/lib/seo.ts` (consommé read-only via import `siteUrl`)
- `src/config/social-links.ts` (URLs LinkedIn/GitHub hardcodées dans le template string, pas d'import dynamique, cohérent avec le caractère statique du chrome)
- `messages/{fr,en}.json` (markdown en EN uniquement, pas de localisation via next-intl)
- `src/app/robots.ts` (sub-project 04 inchangé, le `User-agent: *` + `Allow: /` autorise déjà GPTBot, ClaudeBot, PerplexityBot, et tout autre AI crawler)
- `next.config.ts`, `package.json`, `prisma/schema.prisma`

## Architecture approach

- **Route handler Next.js GET** dans `src/app/llms.txt/route.ts` : convention App Router qui permet d'utiliser un nom de fichier avec extension dans le path (Next.js expose la route à `/llms.txt`). Cohérent avec le pattern projet déjà observé pour `app/sitemap.ts` (sub-project 03) et `app/robots.ts` (sub-project 04). Voir `.claude/rules/nextjs/api-routes.md` (export named function `GET`, retour `Response`).
- **Réponse `Response()` native** avec `Content-Type: text/plain; charset=utf-8` explicite (et non `text/markdown` qui est moins universellement reconnu) et `Cache-Control: public, max-age=3600, stale-while-revalidate=86400` (1h fresh, 24h stale-while-revalidate). Le contenu change rarement (chrome statique), marge confortable.
- **Markdown construit comme template string** dans le handler, pas de fichier séparé : le contenu est trivial (~15 lignes), pas de besoin de séparer dans un asset à lire via `readFile`. La normalisation `siteUrl.replace(/\/$/, '')` évite le double slash si `NEXT_PUBLIC_SITE_URL` contient un trailing slash (même pattern que `buildSitemapEntries` du sub-project 03 et `app/robots.ts` du sub-project 04).
- **Format llmstxt.org strict** : H1 `# Thibaud Geisler` + blockquote `> Freelance AI engineer & full-stack developer...` + section `## Pages` avec liste markdown de 5 liens (Home, Services, Projects, About, Contact) + section `## Optional` avec liste markdown de 3 liens (Sitemap, LinkedIn, GitHub). Format conforme aux exemples des sites adopteurs (anthropic.com/llms.txt, cloudflare.com/llms.txt).
- **EN-only, pas de variante FR** : pratique standard observée chez les sites adopteurs (Anthropic, Stripe, Cloudflare). Les AI engines indexent les concepts en EN et font le matching sémantique cross-locale. Une version `/fr/llms.txt` n'apporterait rien au signal d'autorité topique, et brouillerait la simplicité du fichier unique racine.
- **Liens des pages préfixés `/fr/`** : conforme à `localePrefix: 'always'` (cf. `src/i18n/routing.ts`). Les URLs absolues pointent par défaut vers la version FR (`routing.defaultLocale = 'fr'`). Les AI engines suivront ces liens et trouveront le contenu localisé.
- **Pas de description trop longue dans la blockquote** : 1-2 phrases max, brand-focused, mots-clés naturels (`Freelance AI engineer & full-stack developer`, `services`, `case studies`, `AI training`). Évite la dilution du signal et garde la prose concise (les recherches GEO 2026 montrent que les structures concises sont 2.5× plus citées que la prose longue).
- **Pas de tests automatisés** : route handler trivial qui retourne un template string statique. Tester reviendrait à snapshoter la string (anti-pattern fragile) ou à valider `new Response()` (= framework Next.js). Validation manuelle via `curl` dans le plan suffit.
- **ADRs liés** : ADR-001 (monolithe Next.js, route handler dans la même app), ADR-006 (hub de démos, llms.txt sert d'orientation pour les AI engines vers les pages portfolio, pas vers les démos externes qui ont leur propre indexation).

## Acceptance criteria

### Scénario 1 : llms.txt structurel valide
**GIVEN** l'application en mode `pnpm build && pnpm start` (`NEXT_PUBLIC_SITE_URL=https://thibaud-geisler.com`)
**WHEN** un AI engine ou un visiteur fait `GET /llms.txt`
**THEN** la réponse a un statut 200 et un `Content-Type: text/plain; charset=utf-8`
**AND** le body contient (dans cet ordre) : `# Thibaud Geisler` (H1), blockquote `> Freelance AI engineer & full-stack developer...`, section `## Pages` avec 5 liens markdown vers `/fr/`, `/fr/services`, `/fr/projets`, `/fr/a-propos`, `/fr/contact`, section `## Optional` avec 3 liens vers `/sitemap.xml`, LinkedIn, GitHub
**AND** le markdown est parseable sans erreur (encodage UTF-8 valide, pas de caractères mal échappés)

### Scénario 2 : URLs absolues construites depuis siteUrl
**GIVEN** la variable `NEXT_PUBLIC_SITE_URL` valant `https://thibaud-geisler.com` en prod (ou `http://localhost:3000` en dev)
**WHEN** le `/llms.txt` est servi
**THEN** chaque lien des sections `## Pages` et `## Optional` (sauf LinkedIn/GitHub qui sont externes) commence exactement par la valeur de `siteUrl` normalisée (sans trailing slash)
**AND** le lien Sitemap est `<siteUrl>/sitemap.xml` (URL absolue conforme à la convention robots.txt et sitemap)

### Scénario 3 : Cache-Control conservateur
**GIVEN** le `/llms.txt` servi en prod
**WHEN** un crawler AI fait `GET /llms.txt`
**THEN** la réponse contient `Cache-Control: public, max-age=3600, stale-while-revalidate=86400`
**AND** le contenu peut être servi par un CDN ou cache navigateur jusqu'à 24h sans hit serveur (1h fresh + 23h stale-while-revalidate)

## Edge cases

- **`siteUrl` avec trailing slash** : si `process.env.NEXT_PUBLIC_SITE_URL = 'https://thibaud-geisler.com/'`, le template string produirait `https://thibaud-geisler.com//fr/services` (double slash). Le handler normalise via `siteUrl.replace(/\/$/, '')` (même pattern que sub-projects 03 et 04). Couvert par le scénario 2.

## Architectural decisions

### Décision : Emplacement du fichier `llms.txt`

**Options envisagées :**
- **A. Route handler `src/app/llms.txt/route.ts`** : convention App Router Next.js avec extension dans le path, retour `Response` typé.
- **B. Fichier statique `public/llms.txt`** : convention web traditionnelle, 0 ligne de code, servi automatiquement par Next.js.

**Choix : A**

**Rationale :**
- Cohérence avec le pattern projet : tous les sub-projects SEO du portfolio (`app/sitemap.ts` du sub-project 03, `app/robots.ts` du sub-project 04, `app/[locale]/(public)/opengraph-image.tsx` du sub-project 02) exposent leurs fichiers via `src/app/`, pas via `public/`. Mettre `llms.txt` ailleurs casserait la cohérence et imposerait au lecteur du repo de chercher à 2 endroits différents pour comprendre les fichiers SEO exposés.
- Permet de consommer `siteUrl` dynamiquement depuis `src/lib/seo.ts` (sub-project 01) avec normalisation du trailing slash. Avec l'option B, soit on hardcode `https://thibaud-geisler.com` dans le markdown (régression si le domaine change), soit on rajoute une étape de build qui résout `NEXT_PUBLIC_SITE_URL` (overhead).
- Évite l'exception à ADR-011 : la rule `nextjs/assets.md` réserve `public/` aux assets non-dynamiques au sens "contenu uploadé". `llms.txt` n'est techniquement pas du contenu uploadé, mais son contenu construit dynamiquement (URLs absolues construites depuis `siteUrl`) le rend plus naturellement à sa place dans `app/`. Pas besoin de justifier d'exception.
- Code source du contenu visible dans le repo (le template string est lisible dans le route handler), versionné, modifiable via PR comme tout autre code TypeScript.
- Coût négligeable : ~30 lignes de TypeScript vs 1 fichier `.txt` statique.
