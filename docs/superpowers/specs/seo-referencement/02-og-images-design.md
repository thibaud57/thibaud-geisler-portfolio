---
feature: "Feature 5 — SEO & Référencement"
subproject: "Génération des images Open Graph et Twitter (1200×630)"
goal: "Générer dynamiquement les images Open Graph et Twitter pour les pages publiques et les case studies via ImageResponse, alignées au design system DESIGN.md"
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: ["01-metadata-base-design.md"]
date: "2026-04-27"
---

# Génération des images Open Graph et Twitter (1200×630)

## Scope

Créer un composant React partagé `OgTemplate` (flex only, conforme `ImageResponse`), un helper `loadOgFonts()` qui charge `Sansation-Bold.ttf` et `Geist-Regular.ttf` via `readFile`, et deux fichiers `opengraph-image.tsx` détectés automatiquement par Next.js : un au niveau du route group `(public)` couvrant les 5 pages statiques (home, services, à-propos, projets liste, contact), et un dans `/projets/[slug]` qui lit le projet via `findPublishedBySlug` (cache hit chaud côté `generateMetadata` du sub-project 01). **Exclut** la lecture de `coverFilename` du projet (visuel 100% typographique en MVP), les variantes par page statique (une seule image partagée), un fichier `twitter-image.tsx` distinct (Next.js auto-merge `opengraph-image.tsx` pour Twitter Card via `summary_large_image`), le sitemap (sub-project 03), le robots.txt (sub-project 04) et tout JSON-LD (sub-project 05).

### État livré

À la fin de ce sub-project, on peut : (a) charger `http://localhost:3000/fr/opengraph-image` (et `/en`, `/fr/projets/<slug>/opengraph-image`, `/en/projets/<slug>/opengraph-image`) en mode `pnpm build && pnpm start` et obtenir un PNG 1200×630 avec le visuel typographique attendu, et (b) soumettre une URL prod (ou tunnelée) à opengraph.xyz et au Twitter/X Card Validator pour vérifier l'aperçu social réel avec image, titre et description corrects en FR et EN.

## Dependencies

- `01-metadata-base-design.md` (statut: draft) — fournit le `buildPageMetadata` qui prépare `metadata.openGraph` et `metadata.twitter`. Les fichiers `opengraph-image.tsx` créés ici sont auto-mergés par Next.js dans la metadata sans modifier ce helper.

## Files touched

- **À créer** : `src/lib/seo/fonts/Sansation-Bold.ttf` (binaire commit, ~70 KB, téléchargé une fois depuis Google Fonts)
- **À créer** : `src/lib/seo/fonts/Geist-Regular.ttf` (binaire commit, ~110 KB, téléchargé une fois depuis Google Fonts)
- **À créer** : `src/lib/seo/og-fonts.ts` (helper async `loadOgFonts()` qui retourne le tableau `FontOptions[]` attendu par `ImageResponse`)
- **À créer** : `src/lib/seo/og-template.tsx` (composant React `OgTemplate({ kind, title, subtitle, locale })` retournant le JSX 1200×630 flex only)
- **À créer** : `src/app/[locale]/(public)/opengraph-image.tsx` (route OG pour les 5 pages statiques, `kind: 'site'`)
- **À créer** : `src/app/[locale]/(public)/projets/[slug]/opengraph-image.tsx` (route OG par projet, `kind: 'case-study'`)

**Non touchés** : `src/lib/seo.ts` (sub-project 01 inchangé, le helper `buildPageMetadata` ne déclare pas `openGraph.images` ni `twitter.images`, Next.js merge via convention de fichier), `next.config.ts` (pas de `images.remotePatterns` à ajouter, lecture filesystem locale), `package.json` (`next/og` est exporté par Next.js 16 nativement), `messages/{fr,en}.json` (les clés `Metadata.siteTitle` et `Metadata.siteDescription` existent déjà et sont réutilisées tel quel).

## Architecture approach

- **Composant React partagé `OgTemplate`** : signature `{ kind: 'site' | 'case-study', title: string, subtitle: string, locale: 'fr' | 'en' }`. Layout flex column avec padding 80px, fond blanc plein, kicker `PORTFOLIO`/`CASE STUDY` + locale tag à gauche d'un point séparateur sauge, titre principal Sansation Bold ~72px, sous-titre Geist Regular ~32px (multiline avec wrap natif Satori), liseré horizontal sauge 200×2px en bas, signature Geist Regular ~24px sauge. Aucun caractère graphique ASCII, tous les éléments sont des `<div>` Flex avec couleurs et dimensions inline (cf. `.claude/rules/nextjs/metadata-seo.md` qui interdit grid et autorise uniquement flex et absolute positioning dans `ImageResponse`).
- **Couleurs hardcodées (mode light uniquement)** issues de DESIGN.md § Palette : fond `#FFFFFF`, texte principal `#0F0F0F`, accent vert sauge `#5E7A5D`, texte muté `#737373`. Pas de variante dark : les SERPs et previews sociaux affichent toujours en light, et `ImageResponse` ne peut pas lire les CSS custom properties (Edge runtime sans DOM). Référencer DESIGN.md dans les commentaires du fichier reste autorisé pour la traçabilité.
- **Typographie alignée DESIGN.md** : Sansation Bold 700 pour les titres OG (équivalent `font-display` web), Geist Regular 400 pour le corps (équivalent Geist Sans web). Les tailles OG (~72px / ~32px / ~24px) sont volontairement plus grandes que les tailles web (H1 = 48px) car les images OG sont vues en thumbnail dans les feeds sociaux et doivent rester lisibles à 600×315 et plus petit. Cf. `.claude/rules/nextjs/images-fonts.md` qui interdit `next/font` dans `ImageResponse` et impose le chargement manuel via `readFile`.
- **Helper `loadOgFonts()`** dans `src/lib/seo/og-fonts.ts` : importe `'server-only'`, fait `readFile(join(process.cwd(), 'src/lib/seo/fonts/Sansation-Bold.ttf'))` + idem Geist, retourne `[{ name: 'Sansation', data: ArrayBuffer, weight: 700, style: 'normal' }, { name: 'Geist', data: ArrayBuffer, weight: 400, style: 'normal' }]`. Aucun cache custom (Next.js 16 cache déjà les routes `opengraph-image.tsx` au build sauf si elles consomment un Request-time API ou une dynamic config, ce qui n'est pas notre cas pour le statique et reste rare en dynamique grâce au `'use cache'` sur `findPublishedBySlug`).
- **Fichier `opengraph-image.tsx` route group `(public)`** : exports requis Next.js → `export const runtime = 'nodejs'` (impose Node runtime nécessaire à `process.cwd()` et `readFile`), `export const alt`, `export const size = { width: 1200, height: 630 }`, `export const contentType = 'image/png'`. Default export `async function Image({ params })` : appelle `setupLocaleMetadata(params)` (réutilise le helper existant de `src/lib/seo.ts`) pour récupérer `t('siteTitle')` + `t('siteDescription')`, charge les fonts, retourne `new ImageResponse(<OgTemplate kind="site" .../>, { ...size, fonts })`. La fonction `Image` est partagée par les 5 pages statiques (Next.js auto-merge l'image du route group dans `metadata.openGraph.images` et `metadata.twitter.images` de chaque page enfant qui ne définit pas la sienne).
- **Fichier `opengraph-image.tsx` `/projets/[slug]`** : mêmes exports + default export qui lit `params.slug` + `params.locale`, appelle `findPublishedBySlug(slug, locale)` (déjà cachée `'use cache'` + `cacheTag('projects')` dans `src/server/queries/projects.ts`, donc cache mutualisé avec `generateMetadata` du sub-project 01), `notFound()` si null, retourne `<OgTemplate kind="case-study" title={project.title} subtitle={project.description} locale={locale}/>`. Voir `.claude/rules/nextjs/routing.md` (params async, hard error Next 16 si sync) et `.claude/rules/nextjs/data-fetching.md` (cache hit per-request avec `'use cache'`).
- **Format des fonts** : `.ttf` exclusivement. `ImageResponse` accepte `.ttf`/`.otf`/`.woff`, **pas `.woff2`**. `.ttf` privilégié pour la vitesse de parsing Satori (cf. doc officielle Next.js).
- **Bundle size limit** : `ImageResponse` impose un bundle < 500 KB (fonts + code). Sansation-Bold (~70 KB) + Geist-Regular (~110 KB) + JSX = ~200 KB → marge confortable. Pas plus d'1 weight par police pour éviter la dérive.
- **Pas de fichier `twitter-image.tsx` distinct** : Next.js merge automatiquement `opengraph-image.tsx` dans `metadata.twitter.images` quand `twitter.card` est `summary_large_image` (configuré par le sub-project 01 dans le helper et dans le root layout `[locale]`). Confirmé par `.claude/rules/nextjs/metadata-seo.md`.
- **`output: 'standalone'` compatible** : `src/lib/seo/fonts/*.ttf` est dans le code source, copié automatiquement dans `.next/standalone` au build (Next.js packe `src/` complet). Pas de modification du Dockerfile nécessaire (cf. `.claude/rules/nextjs/production-deployment.md`). Les fonts sont disponibles au runtime dès le premier `next start` sans dépendance au volume `portfolio_assets`.
- **Aucune variante par page statique** : un seul `opengraph-image.tsx` au niveau du route group `(public)` suffit. Les `og:title` / `og:description` produits par le sub-project 01 distinguent déjà chaque page dans les SERPs et les previews sociaux. Trade-off acté : moins de différenciation visuelle entre pages, mais 1 fichier vs 5 à maintenir et zéro risque d'incohérence.
- **Aucune cover image projet utilisée** : ADR-006 positionne le portfolio en hub vers démos externes plutôt qu'en présentation de produits visuels. Le visuel typographique signe la marque "Thibaud Geisler" sans dépendre de la qualité hétérogène des covers projets ni gérer le fallback obligatoire pour les `coverFilename` null. Si la stratégie de partage social devient un canal actif post-MVP, ré-évaluer via un sub-project dédié.
- **ADRs liés** : ADR-001 (monolithe Next.js, runtime Node disponible pour `readFile`), ADR-006 (hub de démos, sobriété visuelle), ADR-011 (assets dynamiques dans volume Docker — explicitement non utilisé ici car les fonts sont du chrome design system bundled au build).

## Acceptance criteria

### Scénario 1 : Image OG des pages statiques (route group `(public)`)
**GIVEN** l'application déployée en mode `pnpm build && pnpm start` (`NODE_ENV=production`)
**WHEN** un visiteur charge `http://localhost:3000/fr/opengraph-image` directement
**THEN** la réponse est un `image/png` valide de dimension 1200×630
**AND** l'image affiche le visuel `kind: 'site'` : kicker `PORTFOLIO · FR`, titre Sansation Bold issu de `Metadata.siteTitle` FR, sous-titre Geist Regular issu de `Metadata.siteDescription` FR, liseré et signature sauge en bas
**AND** la même URL en `/en/opengraph-image` retourne le visuel équivalent en EN avec kicker `PORTFOLIO · EN` et textes traduits

### Scénario 2 : Image OG dynamique d'un case study
**GIVEN** un projet publié avec un `slug` connu en base (ex: un slug seedé via `prisma/seed-data/projects.ts`)
**WHEN** un visiteur charge `http://localhost:3000/fr/projets/<slug>/opengraph-image`
**THEN** la réponse est un `image/png` valide de dimension 1200×630
**AND** l'image affiche le visuel `kind: 'case-study'` : kicker `CASE STUDY · FR`, titre Sansation Bold = `project.title` (locale FR), sous-titre Geist Regular = `project.description` (locale FR, wrap multiline si long)
**AND** la version `/en/projets/<slug>/opengraph-image` affiche les champs traduits

### Scénario 3 : Slug case study inexistant
**GIVEN** un slug `inconnu-aaa-bbb` qui n'existe pas en base
**WHEN** un visiteur charge `/fr/projets/inconnu-aaa-bbb/opengraph-image`
**THEN** la route appelle `notFound()` et retourne `404 Not Found`
**AND** aucune image n'est générée (cohérent avec le comportement de la page parente `/projets/[slug]/page.tsx`)

### Scénario 4 : Auto-merge dans la metadata (intégration sub-project 01)
**GIVEN** la metadata d'une page statique (ex: `/fr/services`) générée par le `buildPageMetadata` du sub-project 01 ne contient ni `openGraph.images` ni `twitter.images`
**WHEN** Next.js détecte le fichier `opengraph-image.tsx` au niveau du route group `(public)`
**THEN** le HTML servi pour `/fr/services` contient `<meta property="og:image" content="<url-absolue-vers-opengraph-image>"/>` et `<meta property="og:image:width" content="1200"/>` et `<meta property="og:image:height" content="630"/>`
**AND** également `<meta name="twitter:image" content="<url-absolue>"/>` (auto-merge via la `twitter.card="summary_large_image"` configurée par le sub-project 01)

### Scénario 5 : Validation par les outils sociaux
**GIVEN** une URL prod (ou exposée via tunneling) `https://<domaine>/fr/projets/<slug>`
**WHEN** l'URL est soumise à opengraph.xyz et au Twitter/X Card Validator
**THEN** les deux outils affichent un aperçu carte avec image 1200×630 dédiée, titre et description corrects en FR
**AND** la même opération sur la version `/en/projets/<slug>` affiche les champs traduits

## Edge cases

- **Titre projet long (`project.title`)** : Satori fait du wrap multiline naturel via flex et CSS standard. Si le titre dépasse vraiment la largeur disponible, le texte se replie sur plusieurs lignes sans overflow. Pas de helper de troncature à écrire au MVP (YAGNI). Si un cas extrême apparaît en pratique, ajouter un `WebkitLineClamp: 2` ou un helper `truncate(title, maxChars)` dans un ajustement ultérieur.
- **Description projet longue (`project.description`)** : appliquer `WebkitLineClamp: 4` (CSS supporté par Satori) sur le sous-titre pour éviter qu'une description très longue déborde sur le liseré et la signature. Préserve la lisibilité et le rythme visuel.
- **Locale invalide dans `params.locale`** : `setupLocaleMetadata` (et son équivalent direct via `hasLocale`) appelle `notFound()` si la locale n'est pas dans `routing.locales`. Comportement déjà couvert par le helper existant utilisé dans le sub-project 01.
- **Fonts manquantes au déploiement** : `readFile` lève `ENOENT` si un fichier `.ttf` est absent. Le rendu OG échoue avec une 500 plutôt qu'avec un fallback dégradé. Acceptable au MVP : la présence des fonts est garantie par le commit dans `src/lib/seo/fonts/` et la copie automatique par `output: 'standalone'`. Si une régression survient, elle se voit immédiatement à la première requête OG en dev.
- **Bundle ImageResponse > 500 KB** : si on ajoute un weight de plus à Sansation ou Geist, surveiller la taille totale. Le sub-project actuel reste sous la limite avec ~200 KB.
- **Cache `opengraph-image.tsx` statique vs dynamique** : Next.js cache l'image au build pour le route group `(public)` (pas de Request-time API, pas de fetch dynamic). Pour `/projets/[slug]/opengraph-image.tsx`, la query `findPublishedBySlug` étant `'use cache'` + `cacheTag('projects')`, l'image est régénérée uniquement quand le cache est invalidé via `revalidateTag('projects')` (post-MVP, depuis le dashboard admin). Comportement souhaité.

## Architectural decisions

### Décision : Emplacement des fichiers `.ttf` du design system pour `ImageResponse`

**Options envisagées :**
- **A. `src/lib/seo/fonts/`** : colocaliser les `.ttf` avec le helper `og-fonts.ts` et le composant `og-template.tsx` qui les consomment. Lus via `readFile(join(process.cwd(), 'src/lib/seo/fonts/<file>.ttf'))`.
- **B. `public/fonts/`** : convention web traditionnelle pour servir des assets statiques. Lus via `readFile(join(process.cwd(), 'public/fonts/<file>.ttf'))`.
- **C. `assets/fonts/`** : à côté des contenus dynamiques (covers de projets, logos clients, CV) déjà servis via la route `/api/assets/[...path]` (ADR-011).

**Choix : A**

**Rationale :**
- L'option C est éliminée : `assets/` est un volume Docker dynamique runtime (`portfolio_assets`) destiné aux contenus uploadés ou éditorialement gérés (ADR-011, `.claude/rules/nextjs/assets.md`). Les fonts du design system sont du chrome statique qui doit être présent dès le premier `next start`, donc obligatoirement dans le bundle build, pas dans le volume runtime. De plus, la route `/api/assets/[...path]` valide les extensions via une whitelist Zod (`png/jpg/jpeg/webp/svg/pdf`) qui exclut `.ttf` par défense en profondeur — étendre cette whitelist élargirait la surface d'attaque sans bénéfice.
- L'option B est techniquement valide mais a été retirée de la documentation officielle Next.js récente (issue [vercel/next.js#76573](https://github.com/vercel/next.js/issues/76573) "Docs: local fonts docs incorrectly mention public folder"). La nouvelle reco officielle est "place the local asset relative to the project root, not the example source file" : n'importe où à la racine du projet. De plus, mettre des fonts du design system dans `public/` pourrait suggérer qu'elles sont servies publiquement par HTTP (ce qu'elles ne sont pas, elles sont lues filesystem côté serveur uniquement).
- L'option A est cohérente avec la convention de **colocalisation** observée dans le projet (helpers + tests + dépendances regroupés autour du module qui les consomme — voir `src/i18n/localize-content.ts` + `localize-content.test.ts`, `src/lib/projects.ts` + `projects.test.ts`). Elle aligne avec la nouvelle reco Next.js officielle (root-relative, pas public). Elle évite toute ambiguïté sémantique avec ADR-011. Elle est automatiquement incluse par `output: 'standalone'` qui packe le contenu de `src/` au build.
- Trade-off accepté : ~180 KB de fichiers binaires commit dans le repo. Acceptable car les fonts changent uniquement avec un changement intentionnel du design system (rare).
