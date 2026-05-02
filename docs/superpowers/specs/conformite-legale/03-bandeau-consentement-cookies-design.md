---
feature: "Feature 7 — Conformité légale"
subproject: "Bandeau consentement cookies via c15t mode offline + sync next-intl + theming CSS vars"
goal: "Installer @c15t/nextjs v2.0.0 en mode offline (zéro backend), monter ConsentManagerProvider + ConsentBanner + ConsentDialog dans Providers.tsx avec translations FR/EN built-in et hideBranding, exposer un sync runtime entre useLocale next-intl et setLanguage c15t, themer via CSS variables aux tokens DESIGN.md, et fournir aux subs 4/5/7 l'API useConsentManager (has(category), setActiveUI('dialog')) pour gating Calendly et bouton Gérer mes cookies"
status: "implemented"
complexity: "M"
tdd_scope: "partial"
depends_on: []
date: "2026-04-29"
---

# Bandeau consentement cookies via c15t mode offline + sync next-intl + theming CSS vars

## Scope

Installer `@c15t/nextjs@^2.0.0` (Apache 2.0) + `@c15t/translations@^2.0.0` (peer transitif à exposer explicitement, sinon `Module not found '@c15t/translations/all'`). Wrapper `<ConsentManagerProvider options={{ mode: 'offline', overrides: { country: 'FR' }, consentCategories: ['necessary', 'marketing'], i18n: { locale: 'fr', detectBrowserLanguage: false, messages: baseTranslations }, legalLinks: { privacyPolicy: { href: <calculé selon locale>, target: '_self' } } }}>` autour des children dans `src/components/providers/Providers.tsx` (Client Component existant déjà `'use client'`), à l'intérieur du `<NextIntlClientProvider>` parent et autour du `<ThemeProvider>` next-themes existant. Mount `<ConsentBanner hideBranding />` + `<ConsentDialog hideBranding />` à l'intérieur du Provider (pas en `dynamic` car la lib gère elle-même la non-render SSR). Créer `<ConsentLanguageSync />` Client Component leaf (~15 lignes) qui appelle `setLanguage(useLocale())` via `useEffect` quand la locale next-intl change, mounté entre `<ConsentManagerProvider>` et les composants UI. Theming via override des CSS variables c15t (`--button-primary`, `--banner-*`, `--dialog-*`, `--accordion-*`) dans `globals.css` après `@import "@c15t/nextjs/styles.css"` (placement strict AVANT `@import "tailwindcss"` pour layer ordering Tailwind 4). Helper `buildLegalLinks(locale)` colocalisé `src/lib/cookies/` qui retourne `{ privacyPolicy: { href: \`/${locale}/confidentialite\`, target: '_self' } }` consommé par le Provider. Ajouter 2 clés i18n `Cookies.openManagerLabel` (FR: "Gérer mes cookies", EN: "Manage cookies") dans `messages/{fr,en}.json` namespace `Cookies` (réservé aux textes spécifiques projet : labels boutons custom, placeholder Calendly du sub 5, lien footer du sub 7 ; les textes du banner et de la modale sont gérés intégralement par `@c15t/translations/all`). Tests intégration partial (3 cas justifiés métier : `<ConsentLanguageSync />` appelle `setLanguage` au mount + au changement de locale + cleanup au unmount). **Exclut** : page Cookie Manager dédiée (post-MVP), tracking `onConsentChanged` vers Umami (post-MVP, Umami est cookie-less en MVP), mode `hosted` (pas d'audit trail serveur requis pour single-user MVP), CMP IAB TCF (pas d'éditeur de pub), cross-tab sync via BroadcastChannel (limitation acceptée MVP, c15t v2 le supporte nativement mais on ne le configure pas explicitement), composants custom maison (motion/react banner ou Dialog shadcn dédié) car c15t fournit les composants UI conformes CNIL out-of-the-box.

### État livré

À la fin de ce sub-project, on peut : (a) charger `/fr` en navigation privée (cookie consent absent), voir le banner c15t apparaître en bottom-left avec le titre "Nous respectons votre vie privée", la description par défaut FR, et 3 boutons même niveau visuel "Tout rejeter" / "Accepter tout" / "Personnaliser" (rendu thémé aux couleurs DESIGN.md vert sauge OKLCH + radius `--radius` projet, sans badge "Secured by c15t") ; (b) cliquer "Accepter tout" → cookie c15t persisté ~13 mois (durée par défaut alignée GDPR), banner se ferme, `useConsentManager().has({ category: 'marketing' })` retourne `true` ; (c) cliquer "Personnaliser" → modale `ConsentDialog` s'ouvre avec 2 cards (necessary read-only + marketing toggle interactif), le clic sur Save ferme la modale et persiste le choix granulaire ; (d) recharger la page → banner ne réapparaît pas, hook retourne immédiatement l'état persisté ; (e) switcher de `/fr` à `/en` via le LocaleSwitcher → `<ConsentLanguageSync />` appelle `setLanguage('en')`, si le banner ou la modale est ouvert(e) les textes basculent en EN ("We value your privacy" / "Reject All" / "Accept All" / "Customize") ; (f) appel programmatique `useConsentManager().setActiveUI('dialog')` (consommé par sub 4 OpenCookiePreferencesButton et sub 7 footer) ré-ouvre la modale sans recharger ; (g) `pnpm test src/lib/cookies/consent-language-sync.integration.test.tsx` retourne vert sur les 3 cas listés ; (h) Lighthouse Performance reste >= baseline pré-c15t sur `/fr` en build prod (CLS < 0.1 car le banner est position fixed ; LCP < 2.5s).

## Dependencies

Aucune, ce sub-project est autoporté. Il introduit `@c15t/nextjs` et `@c15t/translations` comme nouvelles dépendances npm. Les autres sub-projects de la feature 7 le consommeront (sub 4 utilise `useConsentManager` pour `<OpenCookiePreferencesButton>` ; sub 5 utilise `useConsentManager().has({ category: 'marketing' })` pour gating Calendly ; sub 7 footer utilise le même bouton). Sub 4 a besoin que ses paths `/{locale}/confidentialite` existent à l'exécution pour que le lien `legalLinks.privacyPolicy` du banner ne 404 pas, mais c'est une dépendance d'exécution post-merge, pas de build : sub 3 peut être implémenté et mergé avant sub 4 (le lien retournera 404 temporairement, sans crash).

## Files touched

- **À modifier** : `package.json` (ajout `"@c15t/nextjs": "^2.0.0"` et `"@c15t/translations": "^2.0.0"` aux `dependencies`)
- **À modifier** : `src/components/providers/Providers.tsx` (Client Component existant : ajouter imports `ConsentManagerProvider`, `ConsentBanner`, `ConsentDialog` depuis `@c15t/nextjs`, `baseTranslations` depuis `@c15t/translations/all`, `ConsentLanguageSync` local, `useLocale` depuis `next-intl`, helper `buildLegalLinks`. Wrapper `<ConsentManagerProvider>` autour du `<ThemeProvider>` existant. Mount `<ConsentLanguageSync />` + `<ConsentBanner hideBranding />` + `<ConsentDialog hideBranding />` à l'intérieur du Provider, après les children)
- **À modifier** : `src/app/globals.css` (ajout `@import "@c15t/nextjs/styles.css"` avant `@import "tailwindcss"` ; nouveau bloc CSS d'override des variables c15t dans `:root` et `.dark` mappées sur les tokens projet `--primary`, `--card`, `--foreground`, `--border`, `--radius`, `--font-sans` : minimum 12 vars couvrant `--button-primary`, `--button-primary-hover`, `--button-text-primary`, `--button-border-radius`, `--button-font`, `--banner-background-color`, `--banner-text-color`, `--banner-border-color`, `--banner-border-radius`, `--dialog-background-color`, `--dialog-text-color`, `--dialog-border-radius` ; vars outline/secondary à compléter si décalage visuel observé sur Reject All / Customize après PR review visuelle)
- **À créer** : `src/lib/cookies/build-legal-links.ts` (helper pur ~10 lignes : `buildLegalLinks(locale: 'fr' | 'en'): { privacyPolicy: { href: string, target: '_self' } }`. Retourne `{ privacyPolicy: { href: \`/${locale}/confidentialite\`, target: '_self' } }`. Pas de `cookiePolicy` séparée car la section cookies vit dans la page `/confidentialite` du sub 4)
- **À créer** : `src/lib/cookies/consent-language-sync.tsx` (Client Component leaf `'use client'`, ~15 lignes : `useConsentManager().setLanguage` appelé dans un `useEffect([locale, setLanguage])` qui synchronise la locale c15t avec la locale next-intl (`useLocale()`). Retourne `null`)
- **À créer** : `src/lib/cookies/consent-language-sync.integration.test.tsx` (tests jsdom Vitest project `integration`, 3 cas : sync au mount, sync au changement de locale via re-render, cleanup propre)
- **À modifier** : `messages/fr.json` (ajout namespace `Cookies` avec 1 clé : `openManagerLabel: "Gérer mes cookies"`. Toute la mécanique du banner et de la modale est gérée par `baseTranslations` de c15t, ce namespace ne contient que les libellés boutons custom du projet réutilisés par sub 5 et sub 7)
- **À modifier** : `messages/en.json` (idem EN : `openManagerLabel: "Manage cookies"`)

**Non touchés** : `next.config.ts` (sub 2 CSP déjà mergée), `prisma/schema.prisma` (sub 1 BDD), `src/app/[locale]/layout.tsx` (Providers est wrappé tel quel), pages App Router publiques (sub 4), `src/components/features/contact/CalendlyWidget.tsx` (sub 5), `src/components/layout/Footer.tsx` (sub 7), `src/lib/seo/json-ld.ts` (sub 6), `src/lib/logger.ts` (Pino server-only inchangé, pas de clientLogger custom car c15t expose `onConsentChanged` callback pour MVP+1 si besoin).

## Architecture approach

- **Mode `offline` de `@c15t/nextjs`** : la lib stocke le consentement en localStorage + cookie sans appel réseau ni API key. Combiné à `overrides.country: 'FR'`, force la juridiction GDPR/CNIL inconditionnellement (pas de géo-détection IP requise, dispensable en mode offline). Voir `.claude/rules/...` à compléter si la règle est extraite (sinon référence directe à `docs/knowledges/c15t.md` § "ConsentManagerProvider en mode offline"). Voir aussi rationale `Architectural decisions` ci-dessous.
- **`<ConsentManagerProvider>` à l'intérieur de `<NextIntlClientProvider>`** : le provider c15t doit pouvoir être mounté à n'importe quel niveau Client. On le place dans `Providers.tsx` qui est lui-même wrappé par `<NextIntlClientProvider>` côté `[locale]/layout.tsx`. Le `<ThemeProvider>` next-themes existant reste à l'intérieur du c15t Provider (pas d'ordre critique entre les deux, mais convention "providers globaux à l'extérieur, providers UI à l'intérieur" → c15t comporte un Context global, donc à l'extérieur de ThemeProvider). Voir `.claude/rules/nextjs/server-client-components.md` (`'use client'` au plus bas, leaf client components).
- **Composants `<ConsentBanner>` et `<ConsentDialog>` mountés directement** : pas de `dynamic({ ssr: false })` nécessaire car c15t v2 gère lui-même l'absence de localStorage côté SSR (rien n'est rendu jusqu'au mount client). Pattern plus simple que la spec précédente (vanilla-cookieconsent v1) qui imposait `dynamic`. `hideBranding` retire le badge "Secured by c15t" de manière gratuite en mode offline (testé visuellement au POC).
- **Sync next-intl ↔ c15t via `<ConsentLanguageSync />`** : composant Client leaf qui consomme `useLocale()` de next-intl + `useConsentManager()` de c15t et appelle `setLanguage(locale)` dans un `useEffect([locale, setLanguage])`. Mounté à l'intérieur du Provider, juste avant les composants UI. Le composant retourne `null` (no UI). Sans ce sync, c15t reste figé sur sa `i18n.locale` initiale ('fr') et le switch FR→EN du `LocaleSwitcher` projet ne propage pas dans le banner/modale. Voir `.claude/rules/react/hooks.md` (Rules of Hooks, deps exhaustives, cleanup) et `.claude/rules/next-intl/translations.md` (`useLocale` Client side).
- **Translations FR/EN built-in via `@c15t/translations/all`** : import `baseTranslations` depuis `@c15t/translations/all` (sub-export du package, doit être installé EXPLICITEMENT en dépendance directe sinon `Module not found`). `baseTranslations` est un `Record<string, CompleteTranslations>` qui contient les 30+ langues UE (dont FR et EN complètes : "Nous respectons votre vie privée" / "Tout rejeter" / "Accepter tout" / "Personnaliser" pour FR ; "We value your privacy" / "Reject All" / "Accept All" / "Customize" pour EN). On le passe tel quel dans `i18n.messages` du Provider, c15t pioche dedans selon la locale active. Pas de namespace `Cookies` projet pour ces strings. Voir `docs/knowledges/c15t.md` § "Translations FR/EN via @c15t/translations/all".
- **`overrides.country: 'FR'`** : force la juridiction GDPR/CNIL côté Provider, sans dépendre d'une géo-détection IP (qui en mode offline n'existe pas). C'est plus strict (et plus prudent) que de laisser c15t deviner : tous les visiteurs voient le banner CNIL, même si techniquement un visiteur US n'y est pas obligé. Conforme à l'esprit "single-user portfolio FR-first". Voir `docs/knowledges/c15t.md` § "Bonnes Pratiques".
- **`consentCategories: ['necessary', 'marketing']`** : 2 catégories. `necessary` toujours read-only true (cookie de consentement lui-même, theme préférence next-themes, session). `marketing` opt-in pour Calendly (cookies tiers). Pas de catégorie `measurement` car Umami sera cookie-less en MVP (cf ADR-007). Pas de `experience` ni `functionality` (YAGNI). Voir Architectural decisions ci-dessous.
- **`legalLinks` calculé par locale via `buildLegalLinks(locale)`** : helper pur qui retourne `{ privacyPolicy: { href: \`/${locale}/confidentialite\`, target: '_self' } }`. Le href dépend de la locale active : depuis `Providers.tsx` qui est Client, on lit `useLocale()` et on appelle le helper au render. Le Provider re-évalue les options à chaque re-render de Providers.tsx (acceptable, c15t mémoïse en interne). Pas de `cookiePolicy` car la section cookies vit dans la page `/confidentialite` du sub 4 (pas de page séparée). Voir `docs/knowledges/c15t.md` § "Liens légaux dans le banner".
- **Theming via CSS variables override dans `globals.css`** : `@import "@c15t/nextjs/styles.css"` placé AVANT `@import "tailwindcss"` (ordering Tailwind 4 layers : c15t pose ses defaults, Tailwind les wrap dans la cascade). Bloc d'override dans `:root` et `.dark` mappant les vars c15t (`--button-primary`, `--banner-background-color`, etc.) sur les tokens projet (`--primary`, `--card`, `--foreground`, `--radius`, `--font-sans`) déjà déclarés au sub-projet 0 (DESIGN.md baseline). Couvre les principales surfaces (boutons primary, banner, dialog) ; les variants outline/secondary (Reject All, Customize) à mapper finement après PR review visuelle si décalage observé. Voir `docs/knowledges/c15t.md` § "Theming via CSS variables".
- **API exposée aux subs 4/5/7** : c15t expose `useConsentManager()` qui retourne `{ consents, has, setActiveUI, setLanguage, ... }`. Sub 4 utilise `setActiveUI('dialog')` dans `<OpenCookiePreferencesButton>`. Sub 5 utilise `has({ category: 'marketing' })` dans `<CalendlyWidget>`. Sub 7 réutilise `<OpenCookiePreferencesButton>` du sub 4. Cette API est documentée dans `docs/knowledges/c15t.md` § "Hook useConsentManager", les subs 4/5/7 sont mis à jour en parallèle (cf section "Open questions" de leur spec).
- **Pas de tests sur le Provider, les composants c15t, le format cookie, la persistance** : règle no-lib-test (cf `~/.claude/CLAUDE.md` § Code > Tests). Le seul test justifié est sur `<ConsentLanguageSync />` car c'est du code projet (logique de sync) et non du plumbing lib. Voir `.claude/rules/vitest/setup.md` (project integration séparé) et `.claude/rules/nextjs/tests.md` (factory pattern, mock `next/navigation`).
- **ADRs liés** : ADR-001 (monolithe Next.js, lib client-side ajoutée au bundle global), ADR-005 (Dokploy self-hosted, lib ~30 KB acceptable), ADR-007 (Umami post-MVP cookie-less, ne nécessite PAS de catégorie analytics/measurement dans le banner), ADR-010 (i18n FR/EN strict via next-intl pour le contenu projet ; les translations c15t sont fournies par `@c15t/translations` et sync via `setLanguage`). Pas de nouvel ADR à créer (le choix c15t vs custom est tracé dans `Architectural decisions` ci-dessous, pas assez structurant pour un ADR formel).

## Acceptance criteria

### Scénario 1 : Premier chargement `/fr`, banner FR thémé apparaît en bottom-left

**GIVEN** un visiteur en navigation privée arrive sur `/fr` (cookie c15t absent, localStorage vide)
**WHEN** la page charge complètement (HTML + bundle JS hydrate)
**THEN** le banner c15t apparaît en bottom-left avec le titre "Nous respectons votre vie privée" et la description FR par défaut de `baseTranslations.fr`
**AND** 3 boutons sont rendus côte à côte : "Tout rejeter", "Accepter tout", "Personnaliser". **Accept all et Reject all sont visuellement strictement symétriques** (même variante, même taille, même contraste, même padding) conformément à la délibération CNIL 2020-092 consolidée janvier 2026. **Customize peut rester en variante outline ou lien plus discret** (CNIL n'exige pour ce 3e bouton que sa présence au 1er niveau, pas sa symétrie pixel-perfect avec Accept/Reject)
**AND** aucun badge "Secured by c15t" n'est visible (`hideBranding` ✅)
**AND** les couleurs primary, card, border et le radius matchent les tokens DESIGN.md (vert sauge OKLCH `--primary`, `--card`, `--border`, `--radius: 0.625rem`)
**AND** position `fixed bottom-left z-XX` géré par c15t, n'introduit aucun layout shift (CLS = 0)

### Scénario 2 : Clic "Accepter tout"

**GIVEN** le banner est visible en `/fr`
**WHEN** je clique "Accepter tout"
**THEN** le cookie de consentement c15t est créé avec un payload incluant `marketing: true` et `necessary: true`, expire ~13 mois (durée par défaut alignée GDPR de la lib)
**AND** le banner se ferme automatiquement
**AND** un appel ultérieur à `useConsentManager().has({ category: 'marketing' })` retourne `true`
**AND** un appel ultérieur à `useConsentManager().has({ category: 'necessary' })` retourne `true`

### Scénario 3 : Clic "Tout rejeter"

**GIVEN** le banner est visible
**WHEN** je clique "Tout rejeter"
**THEN** le cookie est créé avec `marketing: false` et `necessary: true` (necessary reste toujours true par design CNIL)
**AND** le banner se ferme
**AND** `useConsentManager().has({ category: 'marketing' })` retourne `false`

### Scénario 4 : Clic "Personnaliser" puis Save avec marketing toggled on

**GIVEN** le banner est visible
**WHEN** je clique "Personnaliser"
**THEN** la modale `ConsentDialog` s'ouvre par-dessus la page (overlay accessible via Radix focus trap natif c15t), pas de badge branding
**AND** la modale liste 2 catégories : "Strictement nécessaires" (toggle disabled, true read-only) + "Marketing" (toggle interactif, default `false`)
**WHEN** je toggle marketing à `on` puis clique "Enregistrer"
**THEN** la modale se ferme, le banner se ferme aussi, le cookie persiste `marketing: true`

### Scénario 5 : Rechargement avec consentement persisté

**GIVEN** un visiteur a déjà accepté (cookie c15t valide < 13 mois, marketing=true)
**WHEN** il recharge la page ou revient ultérieurement
**THEN** le banner ne réapparaît PAS
**AND** `useConsentManager()` retourne immédiatement l'état persisté (`consents.marketing === true`) sans attendre une nouvelle interaction

### Scénario 6 : Switch FR→EN propage dans le banner via ConsentLanguageSync

**GIVEN** un visiteur arrive sur `/fr` et le banner est visible (cookie absent)
**WHEN** il clique le LocaleSwitcher pour passer en `/en`
**THEN** Next.js navigue vers `/en` avec la même page
**AND** `useLocale()` retourne désormais `'en'`, le `useEffect` de `<ConsentLanguageSync />` se déclenche et appelle `consentManager.setLanguage('en')`
**AND** les textes du banner basculent en EN ("We value your privacy" / "Reject All" / "Accept All" / "Customize")
**AND** si la modale `ConsentDialog` était ouverte, ses textes basculent aussi en EN

### Scénario 7 : `setActiveUI('dialog')` programmatique ouvre la modale (consommé par sub 4 et sub 7)

**GIVEN** un visiteur a déjà interagi (banner fermé, cookie persisté)
**WHEN** un Client Component descendant du Provider appelle `useConsentManager().setActiveUI('dialog')` (typiquement le `<OpenCookiePreferencesButton>` du sub 4 cliqué depuis la section Cookies de `/confidentialite` ou depuis le footer du sub 7)
**THEN** la modale `ConsentDialog` s'ouvre directement sans recharger la page
**AND** les toggles de la modale reflètent l'état persisté actuel (marketing on/off selon le dernier choix)
**AND** le banner ne réapparaît pas (consentement déjà persisté dans le cookie c15t)

### Scénario 8 : Tests intégration verts

**GIVEN** le sub-project complètement implémenté
**WHEN** je lance `pnpm test src/lib/cookies/consent-language-sync.integration.test.tsx`
**THEN** Vitest exécute le fichier dans le project `integration` (env jsdom)
**AND** les 3 cas listés dans la section Tests passent (vert)
**AND** la console n'émet aucun warning React (deps useEffect manquante, hydration mismatch, etc.)

## Tests à écrire

### Integration

`src/lib/cookies/consent-language-sync.integration.test.tsx` (env jsdom via `// @vitest-environment jsdom` en tête de fichier ou via config Vitest project) :

- **`<ConsentLanguageSync />` appelle `setLanguage(locale)` au mount** : render `<ConsentLanguageSync />` à l'intérieur d'un `<ConsentManagerProvider options={{ mode: 'offline', i18n: { locale: 'fr', messages: baseTranslations } }}>`, avec un wrapper qui injecte `useLocale` retournant `'fr'`. Spy sur `consentManager.setLanguage`. Au mount, vérifier que `setLanguage` a été appelé une fois avec `'fr'`.
- **Re-render avec nouvelle locale déclenche un nouvel appel `setLanguage`** : après le mount initial avec `'fr'`, simuler un changement de locale en re-render avec un wrapper qui retourne `'en'` depuis `useLocale`. Vérifier que `setLanguage` a été appelé une 2e fois avec `'en'`. (Ce test valide que le `useEffect` a bien `locale` dans ses deps.)
- **Cleanup propre au unmount** : render puis unmount le composant. Vérifier qu'aucune erreur ou warning React n'est émis (notamment "state update on unmounted component"). Comme `<ConsentLanguageSync />` n'a pas d'effet asynchrone à annuler, ce test est principalement un sanity check de Rules of Hooks deps.

Setup commun :
- `// @vitest-environment jsdom` en tête de fichier
- `beforeEach` : `localStorage.clear(); document.cookie = ''; vi.clearAllMocks()`
- Factory `renderWithProvider(children, { locale: 'fr' | 'en' })` qui mock `useLocale` via `vi.mock('next-intl', ...)` et wrap dans `<ConsentManagerProvider>`
- Spy sur `setLanguage` via `vi.spyOn(consentManager, 'setLanguage')` ou via mock du hook `useConsentManager`
- Pas de mock de `@c15t/nextjs` (vraie lib utilisée en jsdom, mode offline n'a pas besoin de réseau)
- Mock de `next-intl` pour `useLocale` uniquement (le reste de next-intl n'est pas utilisé)

Tests délibérément exclus (no-lib-test, cf `~/.claude/CLAUDE.md` § Code > Tests) :

- Test du rendu visuel de `<ConsentBanner>` ou `<ConsentDialog>` (testerait c15t lui-même)
- Test de la persistance du cookie c15t (testerait c15t)
- Test du clic sur les boutons "Accepter tout" / "Tout rejeter" / "Personnaliser" (testerait c15t)
- Test du format JSON du cookie ou de sa durée 13 mois (testerait c15t)
- Test des translations FR/EN de `baseTranslations` (testerait `@c15t/translations`)
- Test du theming CSS vars (testerait CSS, et il n'y a aucune logique projet : juste des `var(--xxx)`)
- Test du Provider lui-même (Provider standard React, déjà couvert par les tests d'intégration de c15t en amont)
- Test E2E du switch de locale propagé dans le banner (couvert par scénario 6 acceptance manuel et par les tests intégration de c15t)

## Edge cases

- **Cookie c15t corrompu (parse JSON fail ou format invalide)** : c15t v2 traite le cookie comme absent et ré-affiche le banner. Pas de crash, comportement attendu.
- **Visiteur supprime manuellement le cookie via DevTools** : à la prochaine navigation, c15t détecte l'absence et ré-affiche le banner. Comportement standard.
- **Visiteur revient après expiration du cookie ~13 mois** : c15t détecte expiration via `Date.now() > expiresAt`, considère le consentement caduc, banner réapparaît. Couvert par scénario 1.
- **`useConsentManager()` appelé hors Provider** : c15t throw une erreur explicite côté lib. Aucun composant projet ne fait ça (Providers wrap tout l'arbre `[locale]/layout.tsx`).
- **Hydration mismatch React 19** : c15t v2 gère nativement la non-render SSR du banner et de la modale (rien n'est rendu jusqu'au mount client). Pas besoin de pattern `mounted` custom.
- **`prefers-reduced-motion`** : c15t respecte les préférences système nativement (pas de paramétrage projet requis).
- **2 onglets ouverts simultanément** : c15t v2 supporte le sync cross-tab via `BroadcastChannel` mais on ne le configure pas explicitement en MVP. Si user accepte dans onglet 1, onglet 2 voit le changement à la prochaine navigation/reload (limitation acceptée MVP, à upgrader si besoin user post-MVP).
- **Locale non supportée par `baseTranslations`** : `baseTranslations` couvre 30+ langues UE dont `'fr'` et `'en'`. Si une locale non listée est passée à `setLanguage`, c15t fallback sur sa locale par défaut configurée (`'fr'` côté Provider). Pour le projet (FR + EN uniquement), pas de cas réel.
- **Lien `legalLinks.privacyPolicy` 404 si sub 4 pas encore mergé** : pendant la phase de dev où sub 3 est mergé mais pas sub 4, le clic sur le lien depuis le banner produit un 404. Pas de crash, juste une 404 page Next.js standard. À documenter dans la PR de sub 3 et à régler côté merge order : merger sub 4 juste après sub 3 (ou les deux dans la même PR).
- **Calendly iframe avant consent (sub 5 pas encore mergé)** : pendant la phase de dev où sub 3 est mergé mais pas sub 5, le widget Calendly se charge inconditionnellement (pas encore gated). Aucune CSP violation (sub 2 autorise déjà `frame-src calendly.com`). Pas de blocker MVP, juste à avoir en tête lors du sequencing des merges.
- **Symétrie Accept all / Reject all à valider visuellement au smoke test** : la délibération CNIL 2020-092 (consolidée janvier 2026) exige *"boutons et police de même taille, offrant la même facilité de lecture, mis en évidence de manière identique"* entre **Accept et Reject UNIQUEMENT** (pas Customize). Si c15t v2 rend Accept en `primary` plein et Reject en `outline` par défaut, **non-conforme CNIL**. Override CSS obligatoire dans `globals.css` pour aligner Reject sur Accept (ou inversement, mais identiques entre eux). Customize reste libre (peut rester `outline` plus discret ou lien hypertexte au 1er niveau, conforme CNIL).

## Architectural decisions

### Décision : c15t headless lib vs implémentation custom (motion + Dialog shadcn + clientLogger)

**Options envisagées :**

- **A. c15t en mode offline + composants UI built-in thémés** : utiliser `@c15t/nextjs` qui fournit Provider + ConsentBanner + ConsentDialog conformes CNIL out-of-the-box. Theming via CSS variables. ~80 lignes projet (Provider config + sync next-intl + theming + helper legal links + 1 test intégration).
- **B. Implémentation custom maison** : `vanilla-cookieconsent` v3 en mode headless + banner motion/react slide-up + modale Dialog shadcn dédiée + Hook `useConsentStatus()` + Provider Context maison + `clientLogger` Pino-like + 12 tests intégration. ~250 lignes projet (cf version précédente de cette spec).
- **C. Tarteaucitron.js** : lib FR éprouvée 10 ans CNIL, mais styling rigide, pas pensée React, intégration via `<script>` global et tarteaucitron.user.calendlyId. ~100 lignes projet mais look custom limité.

**Choix : A**

**Rationale :**
- L'option B duplique 80% de ce que c15t fait déjà (persistance, granularité, equalWeightButtons, gestion catégories) en plus du custom UI. Coût maintenance élevé pour aucun bénéfice fonctionnel : la modale Dialog shadcn maison est juste une ré-écriture de ce que c15t propose nativement.
- L'option C est moins flexible côté React (pas de hook, pas de Context, pattern script global) et le styling matchant tokens DESIGN.md serait plus laborieux que les CSS vars de c15t.
- L'option A est la plus efficace : ~3x moins de code projet, pattern React natif (Provider + hook), theming via CSS vars cohérent avec shadcn, conformité CNIL gérée par la lib (testée par sa communauté), 30+ traductions FR/EN built-in, hideBranding gratuit, switch dynamique langue via setLanguage. POC validé en pratique sur Next.js 16.2.4 + React 19 + Turbopack (cf `docs/knowledges/c15t.md`).
- Trade-off accepté : dépendance externe Apache 2.0 active, risque modéré (v2 sortie 2026-04-13, communauté en croissance, VC-backed Robotostudio). Si la lib se stoppe ou change de licence, migration vers Tarteaucitron faisable en quelques heures (l'API métier projet `useConsentManager().has()` peut être ré-implémentée avec n'importe quel CMP).

### Décision : Mode `offline` vs `hosted` vs `custom backend`

**Options envisagées :**

- **A. Mode `offline`** : localStorage + cookie côté navigateur, zéro backend, zéro account, zéro coût opérationnel.
- **B. Mode `hosted`** (cloud c15t.dev managé) : SaaS gratuit/payant selon plan, fournit audit trail serveur, geo-detection auto, dashboard analytics consentement.
- **C. Mode `custom`** (self-hosted backend) : full contrôle des données de consentement, audit trail complet, mais nécessite déployer un service supplémentaire.

**Choix : A**

**Rationale :**
- Option B introduit une dépendance SaaS (account c15t.dev requis, API key), un appel réseau bloquant à chaque hit, et un coût potentiel selon traffic. Pour un portfolio single-user à faible traffic, disproportionné.
- Option C nécessite un service backend supplémentaire à déployer/maintenir sur Dokploy. Pour un portfolio MVP qui n'a pas d'audit trail légal formel à fournir, sur-engineering.
- Option A répond exactement au besoin : la conformité CNIL n'exige PAS un audit trail serveur datable par utilisateur en l'absence d'enquête formelle. Le cookie navigateur suffit comme preuve "j'ai consenti à telle date" du côté visiteur. `overrides.country: 'FR'` force GDPR sans avoir besoin de geo-detection auto.
- Limite acceptée : si un audit CNIL formel exigeait un jour la preuve datée par utilisateur côté serveur, basculement vers `hosted` ou `custom` faisable en ~30 lignes (changement de `mode` + ajout backendURL ou customHandlers). C'est documenté dans `docs/knowledges/c15t.md` § "Bonnes Pratiques".
- **Risque résiduel assumé MVP** : la persistance navigateur (cookie + localStorage horodaté) constitue une preuve de consentement faible côté éditeur (l'utilisateur peut purger son storage et nier le consentement, charge de la preuve difficile à contrer). Aucun texte (RGPD art. 7, ePrivacy, recommandation CNIL 2020-092 consolidée janvier 2026) n'exige *expressis verbis* un log serveur, et aucune sanction CNIL connue ne porte sur un site single-user sans adtech pour ce seul motif (cf. précédent `gouv.fr` utilisant `tarteaucitron` OSS sans audit trail). Risque jugé acceptable pour un portfolio à faible trafic sans tracker publicitaire majeur. Upgrade vers mode `hosted` ou table Postgres `consent_log` (~30 LOC) à reconsidérer si : montée en charge significative, ajout d'analytics non exemptés, ou enjeu B2B où la traçabilité opposable devient un argument commercial.

### Décision : 2 catégories `necessary + marketing` vs 3 `necessary + measurement + marketing`

**Options envisagées :**

- **A. 2 catégories** : `necessary` (toujours actif) + `marketing` (Calendly opt-in).
- **B. 3 catégories** : `necessary` + `measurement` (Umami pré-configuré) + `marketing`.
- **C. 1 catégorie globale** : accept/reject binaire.

**Choix : A**

**Rationale :**
- Option C ne permet pas la granularité CNIL (l'utilisateur ne peut pas accepter le strict nécessaire et refuser le marketing séparément). Non conforme.
- Option B anticipe Umami post-MVP, mais Umami est cookie-less par design (cf ADR-007), donc n'a pas besoin de catégorie `measurement` dans le banner. Catégorie fantôme MVP. YAGNI.
- Option A est le minimum CNIL conforme : `necessary` couvre les cookies fonctionnels du site (cookie c15t lui-même, theme préférence next-themes, session future), `marketing` couvre Calendly (cookies tiers déposés par calendly.com lors de l'inline embed). Si Umami nécessitait un consent post-MVP (peu probable car cookie-less), ajout 1 ligne dans `consentCategories` à ce moment-là.
