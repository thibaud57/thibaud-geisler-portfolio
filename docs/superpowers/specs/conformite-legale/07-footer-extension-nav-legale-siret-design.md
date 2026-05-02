---
feature: "Feature 7 — Conformité légale"
subproject: "Footer extension nav légale + SIRET copyright"
goal: "Compléter le Footer global (TODO ligne 38) avec une nav légale row bottom (3 liens : Mentions légales, Politique de confidentialité, Gérer mes cookies) et étendre la ligne copyright avec le SIRET formaté lu via getPublisher du sub 1, en réutilisant les helpers et composants des sub 4 et sub 5"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["01-schema-prisma-legal-entity-seed-design.md", "03-bandeau-consentement-cookies-design.md", "04-pages-mentions-confidentialite-design.md"]
date: "2026-04-28"
---

# Footer extension nav légale + SIRET copyright

## Scope

Modifier `src/components/layout/Footer.tsx` (Server Component async existant qui rend `<BrandLogo>`, `<SocialLinks>`, `<DownloadCvButton>` + une ligne copyright avec un commentaire TODO ligne 38 réservant l'emplacement nav légale) pour : (1) ajouter dans la row bottom une `<nav aria-label>` contenant 3 liens légaux ordonnés (Mentions légales via `Link` next-intl localisé vers `/mentions-legales`, Politique de confidentialité via `Link` localisé vers `/confidentialite`, Gérer mes cookies via `<OpenCookiePreferencesButton variant="link">` du sub 4 avec sa prop `label?` déjà exposée) ; (2) étendre la ligne copyright existante avec une mention SIRET formatée `- SIRET 880 419 122 00036` (tiret simple) en lisant le SIRET via `getPublisher()` du sub 1 et en formatant via `formatSiret()` du sub 4 ; (3) ajouter 4 nouvelles clés i18n au namespace `Footer` existant (`Footer.legalNav.{ariaLabel, mentions, privacy, cookies}`) en FR et EN. Le composant Server Component parallélise `getTranslations('Footer')` et `getPublisher()` via `Promise.all`. **Exclut** : modifications de la row haute du footer (logo, tagline, location, SocialLinks, DownloadCvButton restent intacts), création de tests automatisés (smoke visuel post-deploy suffit, no-lib-test : la logique métier critique est déjà testée au sub 1 query, sub 4 formatSiret, sub 5 gating consent), refacto de `<OpenCookiePreferencesButton>` (livré au sub 4 avec prop `label?` exposée nativement, on consomme tel quel), modification des autres consommateurs de `getPublisher()` (sub 4 page mentions, sub 6 JSON-LD).

### État livré

À la fin de ce sub-project, on peut : (a) charger n'importe quelle page publique en `pnpm build && pnpm start` (ex: `/fr/`, `/fr/services`, `/en/projets`, `/en/contact`), et observer dans le footer en row bottom la ligne copyright étendue `© 2026 Thibaud Geisler - SIRET 880 419 122 00036` (avec espacement SIRET formaté par `formatSiret`, tiret simple) ; (b) voir à droite (ou en stack mobile) une `<nav>` avec 3 liens : "Mentions légales", "Politique de confidentialité", "Gérer mes cookies" ; (c) cliquer "Mentions légales" navigue vers `/fr/mentions-legales` (URL localisée par `Link` next-intl) ; (d) cliquer "Politique de confidentialité" vers `/fr/confidentialite` ; (e) cliquer "Gérer mes cookies" ouvre la modale `ConsentDialog` c15t du sub 3 (via `useConsentManager().setActiveUI('dialog')` consommé par `<OpenCookiePreferencesButton>`) ; (f) la même structure est rendue en EN avec libellés traduits "Legal notice / Privacy policy / Manage my cookies" et URLs `/en/mentions-legales` etc. ; (g) aucune violation CSP en console DevTools.

## Dependencies

- `01-schema-prisma-legal-entity-seed-design.md` (statut: draft), fournit la query `getPublisher()` consommée par le Server Component pour récupérer `publisher.siret` (= `"88041912200036"` pour Thibaud, formaté ensuite). Sans cette query, le footer ne peut pas afficher le SIRET.
- `03-bandeau-consentement-cookies-design.md` (statut: draft), fournit le `<ConsentManagerProvider>` (de `@c15t/nextjs`) mounté dans `Providers.tsx` qui wrap toute l'arbre, indispensable pour que `<OpenCookiePreferencesButton>` (Client Component descendant) puisse consommer `useConsentManager().setActiveUI('dialog')` sans lever d'erreur.
- `04-pages-mentions-confidentialite-design.md` (statut: draft), fournit `<OpenCookiePreferencesButton>` (Client Component créé au sub 4 avec prop `label?` exposée nativement pour customisation contextuelle, ici on l'utilise avec `variant="link"` + `label={t('Footer.legalNav.cookies')}`) ET le helper `formatSiret()` (créé au sub 4 dans `src/lib/legal/format-siret.ts`, mappe `"88041912200036"` → `"880 419 122 00036"`). Les pages cibles `/mentions-legales` et `/confidentialite` sont également livrées par ce sub 4.

## Files touched

- **À modifier** : `src/components/layout/Footer.tsx` (ajout imports : `Promise.all` avec `getPublisher`, `Link` from `@/i18n/navigation`, `formatSiret`, `OpenCookiePreferencesButton` ; suppression du commentaire TODO ligne 38 ; extension de la ligne `<p>` copyright avec ternaire SIRET ; ajout d'un `<nav>` avec 3 liens dans la row bottom ; row haute inchangée)
- **À modifier** : `messages/fr.json` (extension namespace `Footer` existant : ajout sous-objet `legalNav` avec 4 clés `ariaLabel`, `mentions`, `privacy`, `cookies`)
- **À modifier** : `messages/en.json` (idem traductions EN strictes)

**Non touchés** : `src/components/layout/Footer.tsx` row haute (BrandLogo + tagline + location + SocialLinks + DownloadCvButton inchangés), `src/components/features/legal/OpenCookiePreferencesButton.tsx` (consommation tel quel, déjà créé au sub 4 avec prop `label?` exposée), `src/lib/legal/format-siret.ts` (consommation tel quel, livré sub 4), `src/server/queries/legal.ts` (consommation tel quel, livré sub 1), `prisma/schema.prisma` (sub 1), pages `/[locale]/(public)/mentions-legales` et `/confidentialite` (sub 4, déjà existantes), `src/lib/seo/json-ld.ts` (sub 6), `src/components/features/contact/CalendlyWidget.tsx` (sub 5), `next.config.ts` (sub 2), `src/components/providers/Providers.tsx` (sub 3, le `<ConsentManagerProvider>` wrap déjà l'arbre).

## Architecture approach

- **Server Component async qui parallélise les queries** : `Footer` est déjà un Server Component async qui appelle `getTranslations('Footer')`. Ajout de `getPublisher()` via `Promise.all` pour éviter le waterfall avec `getTranslations`. Le pattern `const [t, publisher] = await Promise.all([getTranslations('Footer'), getPublisher()])` est aligné avec les autres pages du projet (`/a-propos/page.tsx` paralléliser avec `getYearsOfExperience`, etc.). `getPublisher()` est cachée `'use cache' + cacheLife('days') + cacheTag('legal-entity')` (sub 1), donc l'appel Server Component participe au Data Cache et n'a aucun coût répété sur les pages multiples consommant le Footer. Voir `.claude/rules/nextjs/data-fetching.md` (Promise.all pour éviter waterfall, queries directes Server Components).
- **Pattern leaf Client Component** : `<OpenCookiePreferencesButton>` (Client Component `'use client'` du sub 4) est importé et rendu dans le `Footer` Server Component. Pattern leaf canonical Next.js : un Server Component peut importer et rendre un Client Component descendant, l'inverse casse RSC. Voir `.claude/rules/nextjs/server-client-components.md` (`'use client'` au plus bas, leaf client component, props sérialisables).
- **`Link` next-intl localisé** : importé depuis `@/i18n/navigation` (helper next-intl qui produit des URLs préfixées par locale automatiquement). `<Link href="/mentions-legales">` rend `<a href="/fr/mentions-legales">` ou `<a href="/en/mentions-legales">` selon la locale active. Pas besoin de hardcoder la locale dans le href. Voir `.claude/rules/next-intl/setup.md` (`createNavigation`, navigation localisée), `.claude/rules/next-intl/translations.md` (`useTranslations`/`getTranslations`).
- **`formatSiret` réutilisé du sub 4** : appel `formatSiret(publisher.siret)` côté Server Component (helper pur exporté de `src/lib/legal/format-siret.ts`). Mappe `"88041912200036"` → `"880 419 122 00036"` (4 groupes espacés selon la convention SIRET 3-3-3-5). Si `publisher.siret` est null (cas hypothétique DB non seedée en dev), le helper retourne tel quel donc affichage gracefully dégradé. Pour MVP avec seed sub 1 standard, le SIRET est toujours `"88041912200036"`.
- **Affichage conditionnel SIRET** : la ligne copyright utilise `{publisher.siret && ` - SIRET ${formatSiret(publisher.siret)}`}` (ternaire court). Si `publisher.siret` est null/undefined (cas dev sans DB ou cas futur où Thibaud changerait de statut sans SIRET), le footer affiche juste `© 2026 Thibaud Geisler` sans la mention SIRET. Pas de crash. Cohérent avec le ternaire utilisé au sub 6 dans `/a-propos/page.tsx` pour le sous-objet `legal`.
- **`<OpenCookiePreferencesButton variant="link" label={t('Footer.legalNav.cookies')}>` réutilisé du sub 4** : le composant accepte les props `{ className?, variant?, label? }`. Avec `variant="link"`, le bouton shadcn rend visuellement comme un lien texte (pas d'arrière-plan, juste underline au hover), cohérent avec les 2 `<Link>` voisins. Le `label` override le texte par défaut `t('Cookies.openManagerLabel')` ("Gérer mes cookies") par `t('Footer.legalNav.cookies')` (sémantique strictement identique en pratique, mais permet au sub 7 de gérer ses propres clés i18n et de varier la formulation s'il le souhaite). Voir `.claude/rules/shadcn-ui/components.md` (Button variants, primitive interactive `'use client'`).
- **Layout responsive Tailwind** : la row bottom existante utilise déjà `flex flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8`. On garde ce layout : sur mobile, copyright en haut (full-width) + nav légale en bas (full-width stack), sur sm+ les 2 sont côte à côte (copyright à gauche, nav à droite). La nav utilise `flex flex-wrap items-center gap-x-4 gap-y-2` pour wrap sur petite largeur si nécessaire. Voir `.claude/rules/tailwind/conventions.md` (`cn()`, tokens sémantiques `text-muted-foreground`, mobile-first responsive, container standards).
- **Accessibilité** : la `<nav>` reçoit `aria-label={t('Footer.legalNav.ariaLabel')}` (FR "Liens légaux" / EN "Legal links") pour distinction par rapport à la nav principale du Navbar (lecteurs d'écran annoncent "Legal links navigation"). Les `<Link>` héritent automatiquement du focus state Tailwind (sub-projects shadcn ont déjà les focus-visible rings configurés sur les liens). Le `<button>` rendu par `<OpenCookiePreferencesButton>` (variant link) est accessible au clavier via Tab + Enter, gestion native shadcn. Voir `.claude/rules/shadcn-ui/components.md` (états hover/focus/disabled intégrés, ne pas redéfinir).
- **i18n strict via next-intl** : 4 nouvelles clés ajoutées au namespace `Footer` existant (`legalNav.ariaLabel`, `legalNav.mentions`, `legalNav.privacy`, `legalNav.cookies`) en FR + EN. Le namespace `Footer` contient déjà les clés `tagline`, `location`, `cv.label` du sub-project pages-publiques. On étend, on ne refait pas. Pas de fallback hardcodé. Voir `.claude/rules/next-intl/translations.md`.
- **Aucun nouveau fichier créé** : modification chirurgicale d'un Server Component existant + extension du namespace i18n. Bundle impact zéro côté client (Server Component), juste +5 lignes de JSX et +5 imports.
- **CSP du sub 2 inchangée** : aucune ressource externe ajoutée. La CSP `default-src 'self'` du sub 2 couvre déjà tous les liens internes (qui pointent vers `/fr/...` ou `/en/...` même origine).
- **ADRs liés** : ADR-001 (monolithe Next.js, composant layout dans la même app), ADR-005 (Dokploy self-hosted, pas de service externe ajouté), ADR-010 (i18n next-intl FR/EN). Aucun ADR `proposed` bloquant.

## Acceptance criteria

### Scénario 1 : Footer rend la nav légale + SIRET sur `/fr/`

**GIVEN** la DB seedée par sub 1 (publisher Thibaud avec `siret = "88041912200036"`), build prod via `pnpm build && pnpm start`, et `<ConsentManagerProvider>` du sub 3 mounté dans Providers
**WHEN** un visiteur charge `/fr/` (ou n'importe quelle autre page publique FR)
**THEN** le `<footer>` est rendu en bas de page
**AND** la row bottom contient une ligne `<p>` avec le texte exact `© 2026 Thibaud Geisler - SIRET 880 419 122 00036` (tiret simple, SIRET formaté avec 3 espaces : "880 419 122 00036")
**AND** la même row bottom contient une `<nav aria-label="Liens légaux">` avec 3 enfants interactifs ordonnés : un `<a href="/fr/mentions-legales">` "Mentions légales", un `<a href="/fr/confidentialite">` "Politique de confidentialité", un `<button>` "Gérer mes cookies" (rendu par `<OpenCookiePreferencesButton variant="link">`)
**AND** la row haute (BrandLogo + tagline + location + SocialLinks + DownloadCvButton) reste strictement identique à avant ce sub-project
**AND** aucune violation CSP en console DevTools

### Scénario 2 : Footer rend la nav légale + SIRET sur `/en/`

**GIVEN** la même DB seedée
**WHEN** un visiteur charge `/en/` (ou n'importe quelle autre page publique EN)
**THEN** la ligne copyright affiche le même SIRET formaté (les nombres ne se traduisent pas) `© 2026 Thibaud Geisler - SIRET 880 419 122 00036`
**AND** la `<nav>` contient `<a href="/en/mentions-legales">` "Legal notice", `<a href="/en/confidentialite">` "Privacy policy", `<button>` "Manage my cookies"
**AND** l'`aria-label` de la nav est "Legal links" (EN)

### Scénario 3 : Clic "Mentions légales" navigue vers la page localisée

**GIVEN** un visiteur sur `/fr/services` (footer rendu)
**WHEN** il clique sur le lien "Mentions légales" du footer
**THEN** la navigation client-side de Next.js navigue vers `/fr/mentions-legales`
**AND** la page mentions légales (livrée par sub 4) s'affiche avec son contenu LCEN art. 6-III complet

### Scénario 4 : Clic "Politique de confidentialité" navigue vers la page localisée

**GIVEN** un visiteur sur `/fr/projets`
**WHEN** il clique sur le lien "Politique de confidentialité" du footer
**THEN** la navigation client navigue vers `/fr/confidentialite`
**AND** la page confidentialité (livrée par sub 4) s'affiche avec ses 7 sections RGPD

### Scénario 5 : Clic "Gérer mes cookies" ouvre la modale du sub 3

**GIVEN** un visiteur sur n'importe quelle page publique (cookie consent présent ou absent)
**WHEN** il clique sur "Gérer mes cookies" dans le footer
**THEN** la modale `ConsentDialog` c15t du sub 3 s'ouvre, affichant les 2 catégories (necessary read-only + marketing toggle interactif)
**AND** aucune erreur en console DevTools

### Scénario 6 : Layout responsive sur mobile et desktop

**GIVEN** le footer rendu
**WHEN** je teste la largeur de viewport :
- Mobile (< 640px / sm) : copyright (avec SIRET) en haut full-width, nav légale en bas full-width (les 3 éléments wrap si nécessaire via `flex-wrap`)
- Desktop (>= 640px) : copyright à gauche, nav légale à droite, alignés horizontalement via `sm:flex-row sm:justify-between`
**THEN** le layout est cohérent dans les 2 modes, aucun texte ne déborde, pas de scroll horizontal
**AND** les liens et le bouton restent cliquables/focusables au clavier (Tab puis Enter)

### Scénario 7 : SIRET absent (DB non seedée)

**GIVEN** un environnement de dev avec DB non seedée (ou un cas hypothétique futur où `publisher.siret` serait null)
**WHEN** la page charge
**THEN** soit `getPublisher()` lève (DB sans publisher = `findUniqueOrThrow` lance), soit `publisher.siret` est null et la ligne copyright affiche juste `© 2026 Thibaud Geisler` sans la mention SIRET (gracefully dégradé via le ternaire `publisher.siret && ...`)
**AND** la nav légale reste fonctionnelle (les liens et le bouton ne dépendent pas du SIRET)

## Edge cases

- **`getPublisher()` lance `NotFoundError` si DB sans publisher seedé** : le Server Component `Footer` remonte l'erreur, qui sera interceptée par le `error.tsx` global. En production avec DB seedée correctement par sub 1 (déploiement Dokploy + `prisma migrate deploy` + seed manuel), ce cas n'arrive jamais. En dev local sans seed, l'erreur est explicite et signale le besoin de lancer `pnpm db:seed`.
- **`publisher.siret` null** (Thibaud bascule un jour vers entité légale étrangère sans SIRET) : ternaire `&&` court-circuite et la ligne copyright affiche juste `© 2026 Thibaud Geisler`. Pas de crash, gracefully dégradé. Mais la mention LCEN art. 6-III obligatoire pour publisher français exige le SIRET, donc cas peu probable en pratique.
- **`<OpenCookiePreferencesButton>` rendu hors `<ConsentManagerProvider>`** : impossible car le Provider du sub 3 wrap toute l'arbre via `Providers.tsx` (qui inclut le Footer). Si un dev futur supprime accidentellement le Provider, `useConsentManager()` (de `@c15t/nextjs`) lève une erreur explicite, repérable au clic du bouton.
- **`Link` next-intl avec locale inconnue** : impossible, la locale vient du segment dynamique `[locale]` validé par `setupLocalePage` au niveau du root layout `[locale]/layout.tsx`. Si la locale était invalide, la page entière retournerait `notFound()` avant même d'atteindre le rendu du Footer.
- **Caractères spéciaux dans le SIRET** : impossible, `Publisher.siret` au sub 1 est stocké comme 14 chiffres pure (validé au seed via Zod éventuel). `formatSiret` accepte n'importe quelle string et retourne tel quel si le pattern regex `^\d{14}$` ne match pas. Cohérent.
- **Year build-time `process.env.NEXT_PUBLIC_BUILD_YEAR`** : injecté au build via `next.config.ts` env var. Si on rebuild en 2027, la value passera à `"2027"` automatiquement. Pas de gestion runtime nécessaire. Cohérent avec le pattern existant.
- **Bundle impact** : aucune nouvelle dépendance npm. Modification chirurgicale d'un Server Component existant (~10 lignes JSX ajoutées) + 4 clés JSON. Bundle client zéro impact (Server Component). Bundle serveur négligeable.
- **Performance / Core Web Vitals** : le Footer est rendu côté serveur avec une seule query Prisma supplémentaire (`getPublisher`) qui est cachée `cacheLife('days')` du sub 1. Aucun impact LCP / CLS / INP mesurable. Le Footer reste sticky en bas via `mt-auto` du parent `<body>` (déjà en place).

## Architectural decisions

### Décision : Lecture du SIRET via `getPublisher()` runtime vs constante hardcodée

**Options envisagées :**
- **A. Lire via `getPublisher()` côté Server Component** : query Prisma cachée, parallélisée avec `getTranslations` via `Promise.all`. Source unique de vérité (BDD).
- **B. Hardcoder le SIRET dans une constante TypeScript** (ex: `const PUBLISHER_SIRET = '88041912200036'` dans `src/config/legal.ts`) : pas de query, accès direct, plus simple.
- **C. Lire via une variable d'env** (ex: `process.env.LEGAL_SIRET`) : configurable sans rebuild si Dokploy update env.

**Choix : A**

**Rationale :**
- Cohérence architecturale : la décision projet (sub 1, mémoire `feedback_domain_data_postgres.md`) tranche que les données légales métier vivent en BDD via `LegalEntity`, pas en constantes ni en env vars. Le footer doit suivre la même règle que les pages mentions légales (sub 4) et le JSON-LD enrichi (sub 6) qui lisent toutes via `getPublisher()`.
- Source unique de vérité : si Thibaud édite son SIRET via Prisma Studio (cas exceptionnel), tous les consommateurs (Footer + page mentions + JSON-LD) sont mis à jour en synchronisation au prochain `cacheLife('days')` revalidation ou via `revalidateTag('legal-entity', 'max')`. Avec une constante hardcodée, on aurait 3 endroits à mettre à jour + redéploiement.
- Coût : `getPublisher()` est cachée `'use cache'` côté query, l'appel n'a aucun coût répété entre pages. La parallélisation `Promise.all` avec `getTranslations` évite tout waterfall.
- L'option B/C romprait la cohérence et créerait 2 sources de vérité du SIRET, anti-pattern.

### Décision : Réutiliser `<OpenCookiePreferencesButton>` du sub 4 vs créer un lien custom

**Options envisagées :**
- **A. Réutiliser `<OpenCookiePreferencesButton variant="link" label="Gérer mes cookies">`** : 1 import, 1 ligne de JSX. Le composant gère déjà la consommation de `useConsentManager().setActiveUI('dialog')` (de `@c15t/nextjs`) du sub 3.
- **B. Créer un `<button>` inline dans Footer.tsx** : `'use client'` requis sur le Footer entier (rupture du pattern Server Component) ou wrapper inline dans un sous-composant client dédié.
- **C. Créer un nouveau Client Component `<FooterCookieLink>` propre** : composant dédié au footer.

**Choix : A**

**Rationale :**
- L'option B casse l'architecture en transformant le Footer en Client Component, ce qui briserait la lecture serveur de `getPublisher()` + `getTranslations` (`useTranslations` Client side existe mais avec un Provider, ce qui complique).
- L'option C duplique la logique du `<OpenCookiePreferencesButton>` du sub 4 (qui fait déjà exactement ce qu'on veut). Anti-DRY.
- L'option A applique le pattern leaf client component canonical : Server Component Footer importe et rend un Client Component leaf. La prop `label?` ajoutée au sub 5 (pour customisation contextuelle) sert exactement ce cas. 1 ligne de JSX, cohérent avec le sub 4 page `/confidentialite` qui consomme aussi le même bouton.
- Cohérent avec la mémoire user `feedback_reuse_components.md` : "Réutiliser les composants existants plutôt que créer des variations".

### Décision : `tdd_scope = none` (pas de tests automatisés)

**Options envisagées :**
- **A. `tdd_scope = none`** : aucun fichier de test créé. Smoke test visuel post-deploy + couverture transverse via les tests existants des dépendances.
- **B. `tdd_scope = partial`** avec un test integration `Footer.integration.test.tsx` (mock `useConsentManager`, mock `Link`, render footer, vérifier les 3 liens + SIRET formaté).
- **C. `tdd_scope = full`** avec tests unit complets sur tous les chemins (footer avec/sans SIRET, footer en FR/EN, etc.).

**Choix : A**

**Rationale :**
- **No-lib-test** appliqué : les règles métier critiques de ce sub-project sont déjà testées indirectement :
  - `formatSiret` est testé au sub 4 (5 cas unit dans `format-siret.test.ts`)
  - `getPublisher()` est testé au sub 1 (cas integration dans `legal.integration.test.ts`)
  - `<OpenCookiePreferencesButton>` est testé indirectement au sub 5 (3 cas integration `CalendlyWidget.integration.test.tsx` qui utilisent le hook `useConsentManager`)
  - `<Link>` next-intl localisé n'est pas du code projet (lib externe)
- Tester le Footer entier reviendrait à tester le rendu d'un Server Component async qui appelle Prisma + next-intl, impossible en jsdom (limitation Vitest + RSC), ou à tester les libs (no-lib-test).
- Les acceptance scenarios couvrent par smoke test visuel post-deploy (chargement de pages publiques en dev/prod, clic sur les liens, vérification de la modale qui s'ouvre). Suffisant pour la couverture pragmatique d'un changement aussi simple (3 liens + 1 ternaire SIRET).
- L'option B aurait pour seul mérite de garder la convention "tester chaque sub-project". Mais le coût (mock `useTranslations`, mock `Link`, mock `getPublisher`, mock `useConsentManager`, render Server Component) est largement supérieur au gain (couverture déjà assurée transversement). Anti-pattern.
- L'option C est sur-engineering pour un changement de ~15 lignes JSX.
