---
feature: "Feature 7 — Conformité légale"
subproject: "Pages /mentions-legales et /confidentialite Server Components bilingues"
goal: "Livrer 2 pages publiques bilingues Server Components (mentions légales LCEN art. 6-III + politique de confidentialité RGPD art. 13/14) qui consomment getPublisher et getDataProcessors du sub 1 et exposent un bouton client réutilisable OpenCookiePreferencesButton qui ouvre la modale du sub 3"
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["01-schema-prisma-legal-entity-seed-design.md", "03-bandeau-consentement-cookies-design.md"]
date: "2026-04-28"
---

# Pages /mentions-legales et /confidentialite Server Components bilingues

## Scope

2 nouvelles pages App Router en Server Components asynchrones (`src/app/[locale]/(public)/mentions-legales/page.tsx` et `src/app/[locale]/(public)/confidentialite/page.tsx`) qui consomment `getPublisher()`, `getDataProcessors()`, `getHostingProvider()` du sub 1 (queries cachées `'use cache' + cacheLife('days') + cacheTag('legal-entity')`). Pattern metadata strict aligné `/a-propos/page.tsx` existant (`setupLocaleMetadata + resolveParentOgImages + buildPageMetadata`). Layout via `<PageShell>` + classe `prose prose-invert max-w-none` (plugin `@tailwindcss/typography` v0.5.19 déjà chargé). Section Cookies de `/confidentialite` utilise un Client Component leaf `<OpenCookiePreferencesButton>` qui consomme `useConsentStatus().openPreferences()` du sub 3, réutilisable par sub 7 (footer). Helper pur `formatSiret(siret: string): string` colocalisé `src/lib/legal/` avec ses tests unit (5 cas), réutilisable par sub 7. i18n FR/EN strict via namespaces `LegalMentions` et `PrivacyPolicy` dans `messages/{fr,en}.json` (titres de sections + textes courts + textes longs structurés section par section avec `t.rich()` pour les liens internes vers `/confidentialite`, `mailto:`, CNIL.fr externe). Réutilisation des keys `Legal.{legalStatus,ape,retention,legalBasis,outsideEuFramework,processingKind}` du sub 1. **Exclut** version éditable post-MVP (dashboard admin), variantes par juridiction (Luxembourg, Suisse), CGV/CGU (BRAINSTORM ligne 210), versioning des mentions, JSON-LD `LegalContact` ou similaire (le sub 6 traite l'enrichissement Person sur `/a-propos`, pas de doublon).

### État livré

À la fin de ce sub-project, on peut : (a) charger `/fr/mentions-legales`, observer un statut HTTP 200 et 5 sections LCEN affichant `Thibaud Pierre Geisler`, `Entrepreneur Individuel`, SIRET formatté `880 419 122 00036`, SIREN, RNE, code APE `6201Z` + label `Programmation informatique` (via `Legal.ape.6201Z`), adresse `11 rue Gouvy 57000 Metz`, email `contact@thibaud-geisler.com`, mention TVA franchise art. 293 B CGI, et l'hébergeur IONOS SARL avec son adresse Sarreguemines + RCS Sarreguemines 431 303 775 ; (b) charger `/en/mentions-legales` et observer la version EN intégrale (statut juridique `Sole proprietorship`, label APE `Computer programming`, mêmes données BDD) ; (c) charger `/fr/confidentialite`, voir 7 sections RGPD avec itération correcte sur les 3 sous-traitants seedés (IONOS hosting, Calendly embedded, IONOS SMTP), section "Transferts hors UE" affichée avec mention DPF pour Calendly, bouton "Gérer mes préférences" qui ouvre la modale Dialog du sub 3 ; (d) `pnpm test src/lib/legal/format-siret.test.ts` retourne vert sur les 5 cas listés en Tests ; (e) Lighthouse Performance LCP < 2.5s, CLS < 0.1 sur les 2 pages en build prod ; (f) aucune violation CSP (les 2 pages sont des Server Components purs sans script externe ni iframe).

## Dependencies

- `01-schema-prisma-legal-entity-seed-design.md` (statut: draft) — fournit les queries Prisma `getPublisher()`, `getDataProcessors()`, `getHostingProvider()` consommées par les Server Components des 2 pages. Sans le schema + le seed + les queries, les pages ne peuvent pas afficher les données légales.
- `03-bandeau-consentement-cookies-design.md` (statut: draft) — fournit le hook `useConsentStatus()` consommé par `<OpenCookiePreferencesButton>` (section Cookies de `/confidentialite`). Le `<CookieConsentProvider>` mounté dans `Providers.tsx` au sub 3 wrap déjà l'arbre de toutes les pages publiques, donc le bouton fonctionne sans modification supplémentaire.

## Files touched

- **À créer** : `src/app/[locale]/(public)/mentions-legales/page.tsx` (Server Component async, `generateMetadata` + page principale, ~150 lignes JSX avec sections + lecture queries Prisma)
- **À créer** : `src/app/[locale]/(public)/confidentialite/page.tsx` (Server Component async, `generateMetadata` + page principale, ~200 lignes JSX avec sections + tableaux + lecture queries Prisma + composant client embedded)
- **À créer** : `src/components/features/legal/OpenCookiePreferencesButton.tsx` (Client Component `'use client'`, ~20 lignes, consomme `useConsentStatus().openPreferences()`)
- **À créer** : `src/lib/legal/format-siret.ts` (helper pur, ~5 lignes, regex de formatage)
- **À créer** : `src/lib/legal/format-siret.test.ts` (tests unitaires Vitest project unit, 5 cas, ~30 lignes)
- **À modifier** : `messages/fr.json` (extension : namespace `LegalMentions` avec ~15 keys de sections + namespace `PrivacyPolicy` avec ~25 keys + clés `Metadata.legalMentionsTitle`, `Metadata.legalMentionsDescription`, `Metadata.privacyPolicyTitle`, `Metadata.privacyPolicyDescription`)
- **À modifier** : `messages/en.json` (idem EN, traductions strictes)

**Non touchés** : `next.config.ts` (sub 2 CSP), `prisma/schema.prisma` (sub 1 BDD), `src/components/layout/Footer.tsx` (sub 7), `src/components/features/contact/CalendlyWidget.tsx` (sub 5), `src/lib/seo/json-ld.ts` (sub 6), `src/server/queries/legal.ts` (sub 1, on lit uniquement), `src/lib/cookies/*` (sub 3, on lit uniquement le hook), `src/lib/seo.ts` (helpers metadata existants utilisés tel quels), `src/components/layout/PageShell.tsx` (wrapper utilisé tel quel).

## Architecture approach

- **Pattern Server Components App Router** : les 2 pages sont `async function Page({ params })` qui appellent `setupLocalePage(params)` (helper existant `src/i18n/locale-guard.ts`) puis `getTranslations()` côté serveur + queries Prisma cachées en parallèle via `Promise.all` (cf. `.claude/rules/nextjs/data-fetching.md` : queries DB directes dans Server Components, parallélisation pour éviter waterfall). Aucun `'use client'` au niveau page. Voir `.claude/rules/nextjs/server-client-components.md` (pattern leaf client component, isoler les îlots clients le plus bas possible).
- **Pattern `generateMetadata` aligné `/a-propos/page.tsx` existant** : `Promise.all` sur `setupLocaleMetadata(params)` et `resolveParentOgImages(parent)` puis `buildPageMetadata({ locale, path, title, description, siteName, ogType: 'website', parentOpenGraphImages, parentTwitterImages })`. Les clés `Metadata.legalMentionsTitle/Description` et `Metadata.privacyPolicyTitle/Description` ajoutées au namespace `Metadata` existant. Voir `.claude/rules/nextjs/metadata-seo.md` (`metadataBase`, viewport séparé, alternates non-mergés en deep).
- **Lecture data via queries cachées du sub 1** : `getPublisher()` retourne `LegalEntity & { address: Address, publisher: Publisher }`, `getDataProcessors()` retourne `Array<{ ...LegalEntity, address: Address, processing: DataProcessing }>` triés par `displayOrder`, `getHostingProvider()` retourne le HOSTING dédié. Toutes wrappées `'use cache' + cacheLife('days') + cacheTag('legal-entity')` côté query, donc l'appel depuis Server Component participe au Data Cache. Pas de `connection()` nécessaire (les queries sont déjà dans un scope `'use cache'` qui absorbe `new Date()` Prisma 7). Voir `.claude/rules/nextjs/rendering-caching.md` (`cacheComponents: true` + `'use cache'` Next 16).
- **Layout typographique via `prose` Tailwind** : wrapper `<article className="prose prose-invert max-w-none">` autour du contenu, ce qui applique automatiquement les espacements et la hiérarchie typographique aux balises HTML standards (`h1`, `h2`, `h3`, `p`, `ul`, `li`, `a`, `table`, `th`, `td`). Override via `not-prose` quand on rend des composants shadcn (Button, Link Next.js stylé). Le plugin `@tailwindcss/typography` v0.5.19 est déjà déclaré via `@plugin "@tailwindcss/typography"` dans `globals.css`. Voir `.claude/rules/tailwind/conventions.md` (cn(), tokens sémantiques, mobile-first).
- **Typographie DESIGN.md respectée** : H1 `text-5xl font-bold font-display` (Sansation) sur le titre principal de chaque page (en dehors du `prose` ou via override `not-prose`), H2 `text-4xl font-semibold` pour les sections principales, H3 `text-2xl font-semibold` pour sous-sections, body `text-base`. Container standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` géré par `<PageShell>`. Section padding vertical `py-16 sm:py-20 lg:py-24` aussi géré par `<PageShell>`.
- **i18n strict via next-intl namespaces dédiés** : `getTranslations('LegalMentions')` côté Server Component pour la page mentions, `getTranslations('PrivacyPolicy')` pour la confidentialité. Les textes longs structurés (sections RGPD art. 13/14 obligatoires) sont décomposés en clés par section : `LegalMentions.identity.title`, `LegalMentions.identity.intro`, `LegalMentions.hosting.title`, etc. Les liens internes (`/confidentialite`, `mailto:`, CNIL.fr) utilisent `t.rich(key, { link: (chunks) => <Link href="/confidentialite">{chunks}</Link>, mail: (chunks) => <a href="mailto:contact@thibaud-geisler.com">{chunks}</a> })`. Les enums Prisma sont rendus via `t(`Legal.legalStatus.${publisher.legalEntity.legalStatusKey}`)` et équivalents (clés `Legal.{...}` ajoutées au sub 1). Voir `.claude/rules/next-intl/translations.md` (`useTranslations` Client / `getTranslations` async serveur, `t.rich` JSX interpolation, namespaces).
- **Helper pur `formatSiret`** : 1 ligne de regex `siret.replace(/^(\d{3})(\d{3})(\d{3})(\d{5})$/, '$1 $2 $3 $4')` qui produit `"880 419 122 00036"` à partir de `"88041912200036"` (14 chiffres SIRET = SIREN 9 + NIC 5). Si l'input ne match pas le pattern (chaîne vide, longueur autre, caractères non numériques), retourne la chaîne d'entrée inchangée (graceful fallback). Pas de throw. Cohérent avec helpers projet `localizeProject`, `formatDurationRange` (helpers purs colocalisés). Voir `.claude/rules/typescript/conventions.md` (alias `@/*`, fonctions pures, narrowing).
- **Bouton client `<OpenCookiePreferencesButton>`** : Client Component leaf marqué `'use client'` qui consomme `useConsentStatus()` du sub 3. Props minimales `{ className?: string, variant?: 'default' | 'outline' | 'link' }` pour customisation par caller (sub 4 : variant `outline` dans la section Cookies de `/confidentialite`, sub 7 : variant `link` dans le footer). Texte du bouton via `useTranslations('Cookies.banner').customize`. L'import du composant depuis le Server Component de `/confidentialite` est OK (pattern leaf client : un Server Component peut importer et rendre un Client Component, l'inverse casse le RSC). Voir `.claude/rules/nextjs/server-client-components.md` (leaf client component, props sérialisables) et `.claude/rules/shadcn-ui/components.md` (Button shadcn).
- **Section "Transferts hors UE" conditionnelle** : `getDataProcessors().filter(p => p.processing.outsideEuFramework !== null)` retourne 1 entrée minimum (Calendly DPF) avec le seed canonique. Mais le code prévoit le cas où le filtre serait vide (futur seed sans transfert hors UE) en omettant la section entièrement (`if (transfers.length === 0) return null`). YAGNI : pas de message "Aucun transfert hors UE", on cache la section.
- **Tableau "Sous-traitants"** : `<table>` HTML standard dans le scope `prose` (Tailwind typography stylise automatiquement les tables). 4 colonnes : Nom, Rôle (`Legal.processingKind.{kind}`), Finalité (`purposeFr` ou `purposeEn` selon locale), Pays (`address.country`). Sur mobile (< sm), la table reste responsive grâce au `prose` mais peut overflow horizontal (acceptable MVP, content lisible).
- **Tableau "Durées de conservation"** : 2 colonnes : Sous-traitant (name) + Durée (`Legal.retention.{retentionPolicyKey}`). Itération sur le même `getDataProcessors()` que la section précédente (un seul appel partagé via destructuring `const [t, publisher, processors] = await Promise.all(...)`).
- **Pas de CSP impact** : les 2 pages sont des Server Components purs qui rendent du HTML statique avec données dynamiques BDD. Aucun script externe, aucune iframe, aucune connexion sortante. La CSP du sub 2 (avec `default-src 'self'`) ne pose pas de problème ici. Le `<OpenCookiePreferencesButton>` est un Client Component standard qui passe par le bundle Next.js (origine `'self'`), aucun script tiers.
- **Mention TVA franchise conditionnelle** : si `publisher.publisher.vatRegime === 'FRANCHISE'`, ajouter dans la section Identité un paragraphe avec la mention obligatoire `t('LegalMentions.identity.vatNotApplicable')` qui contient le texte "TVA non applicable, art. 293 B du CGI" / "VAT not applicable, art. 293 B of the French Tax Code". Si `vatRegime === 'ASSUJETTI'`, afficher `publisher.legalEntity.vatNumber` à la place (FR + 11 chiffres formatté). Pour MVP Thibaud = FRANCHISE, donc la mention TVA non applicable est rendue.
- **ADRs liés** : ADR-001 (monolithe Next.js, pages dans la même app), ADR-004 (PostgreSQL dès MVP, queries Prisma directes), ADR-010 (i18n next-intl, contenu éditorial libre en messages.json + Fr/En BDD pour `purposeFr/En` consommé ici). Aucun ADR `proposed` bloquant.

## Acceptance criteria

### Scénario 1 : `/fr/mentions-legales` rend les 5 sections LCEN avec données réelles

**GIVEN** la DB seedée par sub 1 (publisher Thibaud + IONOS hosting + Calendly + IONOS SMTP) et `<CookieConsentProvider>` du sub 3 mounté dans `Providers.tsx`
**WHEN** un visiteur charge `/fr/mentions-legales` en `pnpm build && pnpm start`
**THEN** la réponse HTTP est 200, le HTML contient un `<h1>` avec le titre "Mentions légales" (i18n FR)
**AND** la section "Identité de l'éditeur" contient `Thibaud Pierre Geisler`, `Entrepreneur Individuel` (rendu via `t('Legal.legalStatus.entrepreneurIndividuel')`), SIRET formatté `880 419 122 00036`, SIREN `880 419 122` (formatté via `formatSiret(siren)` ou substring), `Inscrit au Registre National des Entreprises (RNE) sous le n° SIREN 880 419 122`, code APE `6201Z` avec label `Programmation informatique` (via `t('Legal.ape.6201Z')`), adresse `11 rue Gouvy, 57000 Metz, France`, email `contact@thibaud-geisler.com` (clickable `mailto:`), mention `TVA non applicable, art. 293 B du CGI`
**AND** la section "Hébergeur" contient `IONOS SARL`, `SARL au capital de 100 000 EUR` (rendu via `legalStatusFr` BDD du DataProcessing IONOS hosting), adresse `7 place de la Gare, 57200 Sarreguemines, France`, `RCS Sarreguemines 431 303 775`, téléphone `+33 9 70 80 89 11`
**AND** les sections 3, 4, 5 (Propriété intellectuelle, Responsabilité, Droit applicable) contiennent leur texte fixe i18n FR
**AND** aucune violation CSP en console DevTools (pas de script tiers ni iframe sur la page)

### Scénario 2 : `/en/mentions-legales` rend l'équivalent EN

**GIVEN** la même DB seedée
**WHEN** un visiteur charge `/en/mentions-legales`
**THEN** la réponse est 200, `<h1>` "Legal notice" (FR title traduit, à valider au plan)
**AND** la section "Identity of the publisher" affiche `Thibaud Pierre Geisler`, `Sole proprietorship` (via `t('Legal.legalStatus.entrepreneurIndividuel')` namespace EN), SIRET formatté identique (les nombres ne se traduisent pas), code APE `6201Z` avec label `Computer programming`, mention `VAT not applicable, art. 293 B of the French Tax Code`
**AND** la section "Hosting provider" affiche IONOS SARL avec `legalStatusEn` BDD `LLC with capital of 100,000 EUR`
**AND** `<html lang="en">` set par next-intl

### Scénario 3 : `/fr/confidentialite` itère correctement sur les sous-traitants

**GIVEN** la DB seedée avec 3 DataProcessing (`ionos-hosting` displayOrder 0, `calendly-embedded` displayOrder 1, `ionos-smtp` displayOrder 2)
**WHEN** un visiteur charge `/fr/confidentialite`
**THEN** la réponse est 200
**AND** la section "Responsable du traitement" affiche `Thibaud Pierre Geisler`, adresse, email, et un lien interne `<Link href="/mentions-legales">Mentions légales</Link>` (next-intl `Link` localisé qui produit `/fr/mentions-legales`)
**AND** la section "Destinataires / sous-traitants" rend un tableau ou liste structurée avec 3 entrées dans l'ordre : IONOS hosting, Calendly embedded, IONOS SMTP, chacune affichant nom + rôle (Hébergement / Service embarqué / Fournisseur d'emails) + finalité (purposeFr depuis BDD) + statut juridique (legalStatusFr) + pays
**AND** la section "Durées de conservation" rend un tableau ou liste avec 3 entrées : nom + durée formatée via `t('Legal.retention.logs3Years')` / `t('Legal.retention.session13Months')` / `t('Legal.retention.logs30Days')`
**AND** la section "Transferts hors UE" est rendue (Calendly DPF présent), affiche le nom de Calendly et la mention `Data Privacy Framework (décision d'adéquation US 2023)` via `t('Legal.outsideEuFramework.DATA_PRIVACY_FRAMEWORK')`

### Scénario 4 : Bouton "Gérer mes préférences" ouvre la modale du sub 3

**GIVEN** un visiteur sur `/fr/confidentialite` (cookie de consentement présent ou absent)
**WHEN** il clique sur le bouton "Gérer mes préférences" dans la section Cookies
**THEN** la modale Dialog shadcn du sub 3 s'ouvre, affichant les 2 cards (necessary + marketing) et leurs toggles
**AND** un événement `consent:customized` est loggé en console au format JSON Pino-like (clientLogger sub 3)
**AND** le bouton est consommable depuis le footer du sub 7 sans modification (variant prop ajustable)

### Scénario 5 : Metadata bilingue correcte

**GIVEN** les 2 pages buildées en `pnpm build`
**WHEN** je consulte le HTML rendu en SSR de `/fr/mentions-legales`
**THEN** le `<head>` contient `<title>Mentions légales | <siteName></title>` (template appliqué)
**AND** `<meta name="description">` issu de `t('Metadata.legalMentionsDescription')` FR
**AND** `og:type="website"`, `og:locale="fr_FR"`, `og:url="https://thibaud-geisler.com/fr/mentions-legales"`, `og:siteName`, `og:title`, `og:description`
**AND** `twitter:card="summary_large_image"`
**AND** `<link rel="canonical" href="https://thibaud-geisler.com/fr/mentions-legales">`
**AND** `<link rel="alternate" hreflang="fr">`, `<link rel="alternate" hreflang="en">`, `<link rel="alternate" hreflang="x-default">` pointant respectivement vers `/fr/mentions-legales`, `/en/mentions-legales`, `/fr/mentions-legales`
**AND** mêmes balises pour `/fr/confidentialite` et leurs équivalents EN

### Scénario 6 : `formatSiret` couvre les cas valides et invalides

**GIVEN** les 5 cas définis en Tests
**WHEN** je lance `pnpm test src/lib/legal/format-siret.test.ts`
**THEN** les 5 tests passent (vert)
**AND** `formatSiret('88041912200036')` retourne `'880 419 122 00036'`
**AND** `formatSiret('')` retourne `''`
**AND** `formatSiret('abc')` retourne `'abc'` (graceful fallback, pas de throw)

### Scénario 7 : Performance Core Web Vitals

**GIVEN** l'app buildée en `pnpm build && pnpm start`
**WHEN** je lance Lighthouse Performance audit (mode mobile) sur `/fr/mentions-legales` et `/fr/confidentialite`
**THEN** LCP < 2.5s sur les 2 pages
**AND** CLS < 0.1 sur les 2 pages
**AND** INP < 200ms (clic bouton "Gérer mes préférences" sur `/confidentialite`)
**AND** Performance score >= 90 (Server Components purs sans iframe ni script externe = pages très légères)

## Tests à écrire

### Unit

`src/lib/legal/format-siret.test.ts` :

- **SIRET valide 14 chiffres** : `formatSiret('88041912200036')` retourne `'880 419 122 00036'`
- **SIREN valide 9 chiffres** : `formatSiret('880419122')` retourne `'880419122'` (pas de match du regex `^\d{14}$` donc retour tel quel ; alternative : si on veut formatter SIREN aussi, tester `'880 419 122'` mais YAGNI MVP, le sub 7 footer affiche le SIRET pas le SIREN)
- **Input vide** : `formatSiret('')` retourne `''`
- **Input non numérique** : `formatSiret('abc')` retourne `'abc'` (graceful fallback)
- **Input avec espaces déjà** : `formatSiret('880 419 122 00036')` retourne `'880 419 122 00036'` (idempotence, pas de double-formatage car le regex `^\d{14}$` ne match pas la string avec espaces)

Setup minimal : Vitest project `unit` (env jsdom par défaut, mais ce helper est pure logic, env node compatible aussi). Pas de mock nécessaire. Pas de fixture partagée. Tests directs avec assertions `expect(...).toBe(...)`.

Tests délibérément exclus (no-lib-test, voir `~/.claude/CLAUDE.md` § Code > Tests) :
- Tests de rendu des Server Components (Vitest + jsdom ne supportent pas les RSC async, voir `.claude/rules/nextjs/tests.md`). Couvert par les acceptance scenarios end-to-end (View Source + DevTools).
- Tests du contenu de `messages/{fr,en}.json` (testerait next-intl, pas la logique projet).
- Tests de `<OpenCookiePreferencesButton>` (3 lignes, testerait le hook du sub 3 + Button shadcn = libs).
- Tests du pattern `generateMetadata` des 2 pages (testerait `buildPageMetadata` du sub-project SEO 01 déjà couvert ailleurs).
- Tests de `getPublisher()`, `getDataProcessors()`, `getHostingProvider()` (testés par le sub 1 dans son spec).

`tdd_scope = partial` justifié par : 5 tests unit ciblés sur le helper `formatSiret` (logique métier de regex potentiellement cassante, helper réutilisable au sub 7 donc test contractualisant le format).

## Edge cases

- **Locale invalide passée à la page** : `setupLocalePage(params)` lève `notFound()` si la locale n'est pas dans `routing.locales`. Couvert par le helper existant. Pas de gestion explicite dans la page.
- **DB vide (publisher absent)** : `getPublisher()` lève `NotFoundError` (Prisma `findUniqueOrThrow`). Le Server Component remonte l'erreur, qui est interceptée par le `error.tsx` le plus proche (à créer post-MVP, pas ce sub-project). Pour MVP : si la DB est seedée correctement, ce cas n'arrive jamais. Si non seedée, page `/fr/mentions-legales` 500. Acceptable car la DB EST seedée à la mise en prod.
- **Section "Transferts hors UE" vide** : si aucun `outsideEuFramework` n'est non-null dans le seed (cas hypothétique sans Calendly), la section est entièrement omise (return null). Pas de message "Aucun transfert".
- **Tableau sous-traitants vide** (DataProcessing array vide) : section "Destinataires / sous-traitants" affiche un message i18n générique du type "Le site n'utilise actuellement aucun sous-traitant". Cas peu probable MVP (Calendly + IONOS toujours là), mais le code est défensif.
- **Mention TVA `vatRegime === 'ASSUJETTI'` post-bascule de Thibaud** : si Thibaud dépasse le seuil franchise (37 500 EUR HT/an prestations services 2026) et bascule en assujetti, le seed sera mis à jour avec `vatRegime: 'ASSUJETTI'` + `vatNumber: 'FRXX880419122'`. La page rend alors le numéro TVA intracommunautaire formatté à la place de la mention 293 B. Couvert par condition `if (publisher.publisher.vatRegime === 'FRANCHISE') ... else ...`.
- **`publisher.legalEntity.capitalAmount === null`** (cas EI Thibaud, pas de capital) : la section Identité ne rend pas de ligne capital. Pour les sous-traitants société (IONOS = SARL au capital de 100 000 EUR), le capital est inclus directement dans `legalStatusFr/En` BDD, donc rendu naturellement.
- **Format SIRET invalide en BDD** (corrupt ou typo) : `formatSiret` retourne tel quel. La page affiche la string brute (lisible mais non formattée). Acceptable MVP. Validation au seed déjà couverte par sub 1 (tests integration).
- **`<OpenCookiePreferencesButton>` rendu hors `<CookieConsentProvider>`** : impossible en pratique car le Provider wrap toute l'arbre via `Providers.tsx`. Si le développeur supprime accidentellement le Provider, le hook `useConsentStatus()` lève l'erreur explicite définie au sub 3. Pas de gestion défensive supplémentaire.
- **Lien `t.rich` avec ancre interne `#section`** : par exemple un lien depuis la section Cookies de `/confidentialite` vers une autre section de la même page. Non utilisé MVP (les ancres internes sont YAGNI, on a des sections h2 numérotées 1 à 7 lisibles séquentiellement).
- **Données du `purposeFr/En` BDD contenant des caractères spéciaux HTML** : Prisma retourne les strings telles quelles, React échappe automatiquement le rendu JSX (pas de `dangerouslySetInnerHTML`). Pas de risque XSS.
- **Build statique vs dynamique** : avec `cacheComponents: true` et les queries Prisma cachées `'use cache'`, les 2 pages sont rendues à la demande au premier hit puis cachées. Pas besoin de `generateStaticParams` (les locales sont déjà gérées par le segment `[locale]` parent qui fait `generateStaticParams` global). Voir `.claude/rules/nextjs/routing.md` (`generateStaticParams` optionnel avec `cacheComponents: true`).

## Architectural decisions

### Décision : Contenu textuel long en `messages.json` vs fichiers `legal-content.{fr,en}.tsx` séparés

**Options envisagées :**
- **A. Tout dans `messages/{fr,en}.json` namespaces `LegalMentions` + `PrivacyPolicy`** : pattern strict ADR-010, ~40 keys au total (15 mentions + 25 confidentialité), `t.rich` pour les liens internes. Cohérent avec le reste du projet (Tag.nameFr/En, Project.titleFr/En etc.).
- **B. Fichiers séparés `src/app/[locale]/(public)/mentions-legales/content.fr.tsx` + `content.en.tsx`** : composants React React qui retournent le JSX complet par locale, importés conditionnellement par la page selon `locale`. Permet d'écrire du JSX riche directement.
- **C. Un fichier MDX par locale** : `mentions-legales.fr.mdx` + `.en.mdx` rendus via `next-mdx-remote`. Markdown lisible par non-tech.

**Choix : A**

**Rationale :**
- L'option A est strict ADR-010 (contenu éditorial libre par entité = Fr/En BDD ou messages.json selon volume ; pour ce sub-project, les textes sont structurés en sections fixes avec interpolation de variables BDD donc messages.json plus adapté que BDD). Cohérent avec les autres pages publiques du projet qui utilisent toutes `useTranslations` / `getTranslations`.
- L'option B duplique du JSX entre 2 fichiers, casse l'isomorphisme et complique la maintenance (modifier la structure d'une section = 2 fichiers à éditer en miroir).
- L'option C ajouterait `next-mdx-remote` comme nouvelle dépendance MVP juste pour ces 2 pages. YAGNI. Et le projet a explicitement décidé de ne PAS faire de MDX (BRAINSTORM ligne 256-258 : "MDX incompatible avec ce workflow" pour le blog, même argument applicable ici).
- Volume estimé : ~25 keys par page x 2 pages x 2 locales = ~100 entrées dans les 2 messages JSON. Acceptable, déjà ~50 keys existantes pour les autres pages.

### Décision : `formatSiret` placement et `tdd_scope`

**Options envisagées :**
- **A. `src/lib/legal/format-siret.ts` séparé + tests unit colocalisés** : helper pur réutilisable au sub 7 footer, 5 cas tests pour protéger le regex.
- **B. Fonction inline dans `src/app/[locale]/(public)/mentions-legales/page.tsx`** : pas de fichier séparé, helper privé à la page.
- **C. Fonction inline dans `src/server/queries/legal.ts`** : injecter le format directement dans le retour de `getPublisher()`.

**Choix : A**

**Rationale :**
- Le sub 7 (footer) va afficher le SIRET sous le copyright avec le même format espacé (`SIRET 880 419 122 00036`). Sans fichier séparé, on duplique la regex en 2 endroits. Anti-DRY.
- L'option C couplerait la query Prisma à la couche présentation (un format espacé est une concern UI, pas data layer). Séparation des responsabilités cassée.
- L'option A respecte la convention projet : helpers purs colocalisés dans `src/lib/<domaine>/` avec leur test unitaire (cf. `src/lib/seo/json-ld.ts` + `json-ld.test.ts` du sub-project SEO 05). Test ~10 lignes pour 1 ligne de code, mais c'est un helper réutilisable et la regex peut casser silencieusement (typo dans les groupes capturants). `tdd_scope = partial` (5 tests unit ciblés sur ce helper, pas de couverture full du sub-project).

### Décision : Layout responsive du tableau "Sous-traitants" et "Durées de conservation"

**Options envisagées :**
- **A. `<table>` HTML standard dans le scope `prose`** : Tailwind typography stylise automatiquement, sur mobile la table reste responsive avec scroll horizontal si nécessaire.
- **B. Liste `<ul>` avec stack vertical mobile + grid desktop** : pas de table, items en cards.
- **C. Composant Table shadcn** : ajouter `Table`, `TableRow`, `TableCell` shadcn, plus de contrôle mais plus de code.

**Choix : A**

**Rationale :**
- L'option A est sémantique HTML correcte (un tableau de données EST un tableau, pas une liste). Plus accessible (lecteurs d'écran reconnaissent la structure tabulaire). Plugin Tailwind typography fournit déjà des styles raisonnables pour `<table>` dans `prose`.
- L'option B perd la sémantique tabulaire et oblige à dupliquer la structure entre mobile et desktop.
- L'option C est sur-engineering pour 3 lignes de tableau MVP. Le composant Table shadcn est utile pour un dashboard avec tri/filtres dynamiques (post-MVP éventuel), pas pour un tableau statique légal.
- Si le tableau overflow horizontalement sur mobile (3-4 colonnes peuvent serrer), c'est acceptable MVP. L'utilisateur peut scroller. Améliorations responsive post-MVP si besoin.

### Décision : Mention TVA (franchise vs assujetti) condition runtime

**Options envisagées :**
- **A. Condition runtime `if (vatRegime === 'FRANCHISE') ... else ...`** : flexibilité, supporte les 2 cas dans le code, déclenche la bonne mention selon la valeur seed.
- **B. Hardcoder la mention "TVA non applicable, art. 293 B du CGI"** : assume Thibaud reste en franchise éternellement. Si bascule, recompiler.

**Choix : A**

**Rationale :**
- Si Thibaud dépasse le seuil franchise (37 500 EUR HT/an prestations services 2026) en cours d'année, il bascule automatiquement en `vatRegime: ASSUJETTI` avec un numéro TVA intracommunautaire à publier. L'option B forcerait à modifier le code à ce moment-là (~1 ligne de condition à ajouter quand même). L'option A est ready day-one.
- Coût marginal de l'option A : 5 lignes de JSX conditionnel. Acceptable.
- Trade-off : si on n'utilise jamais la branche `ASSUJETTI`, on a 5 lignes de code mort. Mais le test de condition est trivial (`if (vatRegime === 'FRANCHISE')`), pas de risque de bug.
