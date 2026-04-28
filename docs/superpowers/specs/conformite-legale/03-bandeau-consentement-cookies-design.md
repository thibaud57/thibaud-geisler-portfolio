---
feature: "Feature 7 — Conformité légale"
subproject: "Bandeau consentement cookies vanilla-cookieconsent v3 headless + modale Dialog shadcn + hook useConsentStatus"
goal: "Installer vanilla-cookieconsent v3 self-hosted en mode headless, exposer un bandeau motion/react slide-up CWV-friendly + une modale Dialog shadcn de préférences granulaires conformes CNIL 2025-2026, et un hook useConsentStatus consommable par les autres surfaces de la feature 7"
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: []
date: "2026-04-28"
---

# Bandeau consentement cookies vanilla-cookieconsent v3 headless + modale Dialog shadcn + hook useConsentStatus

## Scope

Installer `vanilla-cookieconsent@^3.1.0` (~30 KB MIT, vanilla JS, ESM) pour gérer la persistance localStorage du consentement et les événements DOM `cc:onConsent` / `cc:onChange`, en mode **headless** : on remplace le banner et la modale built-in de la lib par des composants custom (banner `motion/react` slide-up et modale `Dialog` shadcn) pour cohérence avec le DESIGN.md du projet. Configuration CNIL 2025-2026 : 2 catégories (`necessary` toujours actif read-only + `marketing` opt-in granulaire), Accept all / Reject all / Customize au même niveau visuel (`equalWeightButtons`), durée du cookie de consentement 13 mois max (`expiresAfterDays: 395`), retrait aussi simple que l'acceptation. Hook `useConsentStatus()` retourne `{ marketing: boolean, hasInteracted: boolean }` + méthode `openPreferences()` exposés via `<CookieConsentProvider>` injecté dans `<Providers>` au root layout `[locale]/layout.tsx`. Lazy load via `dynamic({ ssr: false })` pour ne pas bloquer FCP. i18n FR/EN namespace `Cookies` dans `messages/{fr,en}.json`. Logger côté client `clientLogger.info(event, payload)` aligné format Pino server-side, sans PII (events `consent:accepted | consent:rejected | consent:customized | consent:changed`). **Exclut** : page Cookie Manager dédiée (post-MVP), tracking Umami (post-MVP), mutation côté serveur, branding custom au-delà des tokens DESIGN.md, support de plus de 2 catégories.

### État livré

À la fin de ce sub-project, on peut : (a) charger n'importe quelle page publique (`/fr`, `/en/contact`, etc.) en navigation privée, voir le banner motion/react apparaître en bas (slide-up 200ms ease-out) après FCP avec les 3 CTAs au même niveau visuel ; (b) cliquer Accept all → cookie `cc_consent` persisté 13 mois avec marketing=true, banner se ferme avec animation slide-down, événement `consent:accepted` loggé en console au format JSON Pino-like ; (c) cliquer Reject all → idem mais marketing=false, événement `consent:rejected` ; (d) cliquer Customize → Dialog shadcn s'ouvre avec 2 cards (necessary toggle disabled+true, marketing toggle interactive), bouton Save persiste l'état, événement `consent:customized` ; (e) recharger la page → banner ne réapparaît pas, le cookie est toujours là, hook `useConsentStatus()` retourne `{ marketing, hasInteracted: true }` ; (f) `pnpm test src/lib/cookies/use-consent-status.integration.test.ts` retourne vert sur tous les scénarios listés ; (g) Lighthouse Performance score reste >= baseline pré-banner, CLS < 0.1, LCP < 2.5s.

## Dependencies

Aucune. Ce sub-project est autoporté. Il introduit `vanilla-cookieconsent` comme nouvelle dépendance npm, mais ne dépend d'aucun autre sub-project de la feature 7. Il sera consommé en lecture par sub 5 (`gating-calendly-marketing` qui utilise `useConsentStatus().marketing` pour conditionner le rendu Calendly) et sub 7 (`footer-extension-nav-legale-siret` qui utilise `openPreferences()` pour le bouton "Gérer mes cookies"). Mais ces consommateurs ne sont pas requis pour valider l'état livré de ce sub.

## Files touched

- **À modifier** : `package.json` (ajout `"vanilla-cookieconsent": "^3.1.0"` aux dependencies)
- **À créer** : `src/lib/cookies/consent-config.ts` (config typée `CookieConsentConfig`, helper `buildConsentConfig(translations)`, constantes `consentCookieName = 'cc_consent'`, `consentCookieMaxDays = 395`)
- **À créer** : `src/lib/cookies/use-consent-status.ts` (Context Provider `CookieConsentProvider` + Hook `useConsentStatus`, sync via DOM events `cc:onConsent` / `cc:onChange`)
- **À créer** : `src/lib/cookies/use-consent-status.integration.test.ts` (tests jsdom : persistance localStorage, hook getStatus, callback openPreferences, listener cleanup, throw hors Provider)
- **À créer** : `src/lib/cookies/client-logger.ts` (wrapper `console.info/warn/error` au format JSON Pino-like, `service`, `context: 'client'`, `time` ISO, `msg`, payload spread)
- **À créer** : `src/components/layout/CookieConsent.tsx` (Client Component `'use client'`, mount lazy de la lib, render conditionnel du banner motion + modale, écoute events DOM)
- **À créer** : `src/components/layout/CookiePreferencesModal.tsx` (Dialog shadcn + Card par catégorie + toggles `<input type="checkbox">` stylisé via classes Tailwind tokens)
- **À modifier** : `src/components/providers/Providers.tsx` (ajout `<CookieConsentProvider>` autour des children, mount lazy `<CookieConsent>` via `dynamic` import + `ssr: false`)
- **À modifier** : `messages/fr.json` (extension namespace `Cookies` : `banner.title`, `banner.description`, `banner.acceptAll`, `banner.rejectAll`, `banner.customize`, `modal.title`, `modal.description`, `modal.categories.necessary.title`, `modal.categories.necessary.description`, `modal.categories.marketing.title`, `modal.categories.marketing.description`, `modal.save`, `modal.acceptAll`, `modal.rejectAll`)
- **À modifier** : `messages/en.json` (idem traductions EN exactes)

**Non touchés** : `next.config.ts` (sub 2 CSP), `prisma/schema.prisma` (sub 1 BDD), pages App Router (sub 4), `src/components/features/contact/CalendlyWidget.tsx` (sub 5), `src/components/layout/Footer.tsx` (sub 7), `src/lib/seo/json-ld.ts` (sub 6), `src/lib/logger.ts` (Pino server-only inchangé).

## Architecture approach

- **Mode headless de `vanilla-cookieconsent` v3** : la lib gère uniquement la persistance localStorage du cookie `cc_consent` (durée 13 mois), expose une API JS (`acceptCategory`, `acceptedCategory`, `validConsent`, `showPreferences`) et émet 2 events DOM (`cc:onConsent` au premier consentement, `cc:onChange` aux modifications ultérieures). On désactive le rendu UI built-in de la lib via `disablePageInteraction: false` + `guiOptions` minimaux et on rend nos propres composants `<CookieConsent>` (banner) + `<CookiePreferencesModal>` (modale Dialog shadcn). Voir `Architectural decisions` ci-dessous pour le rationale de ce choix.
- **`<CookieConsentProvider>` Context React** : wrappe les children dans `Providers.tsx`, expose `{ marketing: boolean, hasInteracted: boolean, openPreferences: () => void }` via `createContext` + `useContext`. Le state local `useState<ConsentState>` est synchronisé avec l'API vanilla-cookieconsent via 2 `useEffect` listeners (`cc:onConsent` + `cc:onChange`) avec cleanup obligatoire au unmount (`return () => removeEventListener(...)`). Voir `.claude/rules/react/hooks.md` (Rules of Hooks, useEffect cleanup, deps exhaustives, Context value memoizé via `useMemo`).
- **Hook `useConsentStatus()`** : custom hook qui appelle `useContext(ConsentContext)` et throw une erreur explicite si appelé hors Provider (`throw new Error('useConsentStatus must be used within CookieConsentProvider')`). Pattern aligné avec les hooks de Context shadcn/Radix existants. Cohérent avec `.claude/rules/react/hooks.md` (custom hooks `useXxx`, throw explicite plutôt que retourner null silencieusement).
- **Lazy load via `dynamic({ ssr: false })`** : `<CookieConsent>` (qui importe `vanilla-cookieconsent` ~30 KB et bundle motion/react banner) est mounté dans `Providers` via `next/dynamic` avec `ssr: false`. La lib n'est PAS dans le bundle initial des pages → FCP non impacté. Voir `.claude/rules/nextjs/server-client-components.md` (`'use client'` au plus bas, dynamic mount). Voir aussi `.claude/rules/nextjs/configuration.md` (Next 16 cacheComponents compatible).
- **Détection automatique de la locale via `language.autoDetect: 'document'`** : vanilla-cookieconsent v3 lit l'attribut `<html lang>` qui est déjà set par next-intl à `fr` ou `en` via le layout `[locale]/layout.tsx`. Pas besoin de prop locale explicite. Les 2 langues sont injectées d'un coup au build de la config via `language.translations: { fr, en }`. Voir `.claude/rules/next-intl/translations.md` (`useTranslations` Client Component, namespaces).
- **Banner motion/react custom** : composant Client `'use client'` qui rend un `<motion.div>` avec `initial={{ y: 100, opacity: 0 }}`, `animate={{ y: 0, opacity: 1 }}`, `exit={{ y: 100, opacity: 0 }}`, `transition={{ duration: 0.2, ease: 'easeOut' }}`. Position `fixed bottom-0 left-0 right-0 z-50` (CLS = 0, ne push pas le contenu). Affiché conditionnellement quand `state.hasInteracted === false`. Wrappé dans `<AnimatePresence>` pour l'animation de fermeture. Voir `.claude/rules/tailwind/conventions.md` (cn(), tokens sémantiques `bg-card`, `text-foreground`, `border-border`).
- **Modale Dialog shadcn** : utilise le composant `Dialog` existant de `src/components/ui/dialog.tsx` (Radix UI sous-jacent, déjà accessible et `'use client'`). Contenu : `DialogHeader` avec titre, `DialogContent` avec 2 `Card` shadcn (necessary + marketing), chacune avec un `<input type="checkbox">` stylisé via classes Tailwind (token `--primary` pour l'état actif). `DialogFooter` avec 3 boutons même variant `default` (Save, Accept all, Reject all). Voir `.claude/rules/shadcn-ui/components.md` (Dialog primitive interactive, mapping composants), `.claude/rules/tailwind/conventions.md` (variants Tailwind tokens).
- **Configuration `vanilla-cookieconsent` typée** : on utilise les types officiels de la lib (`CookieConsentConfig` exporté). Le helper `buildConsentConfig(translations: { fr: Translation, en: Translation }): CookieConsentConfig` retourne l'objet complet avec `cookie.expiresAfterDays = 395` (~13 mois), `categories: { necessary: { readOnly: true, enabled: true }, marketing: { enabled: false } }`, `language.default = 'fr'`, `language.autoDetect = 'document'`, `language.translations = { fr, en }`. Voir `.claude/rules/typescript/conventions.md` (alias `@/*`, types via `z.infer` ou type natifs lib).
- **`clientLogger` aligné format Pino server-side** : helper minimaliste qui produit `{ level, service, context: 'client', time, msg, ...payload }` et appelle `console.info` / `console.warn` / `console.error` selon le niveau. Format strictement identique aux logs serveur Pino (mêmes clés `level`, `service`, `time`, `msg`) avec `context: 'client'` pour distinguer dans les futurs systèmes d'agrégation (post-MVP : Sentry CSP report, Umami events). Pas de PII : la fonction prend un `payload: Record<string, unknown>` mais la convention projet interdit d'y mettre IP, email, contenu cookie, ID utilisateur. Vérifié par les tests intégration. Voir `.claude/rules/pino/logger.md` pour le format serveur de référence.
- **Tests intégration jsdom** : project Vitest `integration` (env node mais avec `'jsdom'` override pour ce fichier via `// @vitest-environment jsdom` en tête, ou via inclusion explicite côté config). En jsdom, `localStorage` et `document.cookie` sont disponibles, vanilla-cookieconsent fonctionne. On NE mocke PAS la lib (no-lib-test = on ne teste pas la lib elle-même mais notre intégration via Hook + Context). On mock uniquement `next/navigation` si nécessaire. Factory `renderWithProvider(children, options?)` qui wrap le children dans `<CookieConsentProvider>` + permet de pré-seed un cookie via `document.cookie = 'cc_consent=...'`. Voir `.claude/rules/vitest/setup.md` (project integration séparé), `.claude/rules/nextjs/tests.md` (factory pattern, mock `next/navigation`).
- **Mount conditionnel anti-hydration mismatch** : pattern `mounted` (similaire à next-themes), on ne render le banner motion qu'après `useEffect(() => setMounted(true), [])` pour éviter un mismatch hydration React 19 (le banner depend de `localStorage` qui n'existe que côté client). Voir `.claude/rules/next-themes/theming.md` (pattern `mounted`).
- **i18n FR/EN strict via next-intl** : pas de fallback hardcodé. Les traductions injectées dans `vanilla-cookieconsent` viennent du namespace `Cookies` de `messages/{fr,en}.json`. La modale Dialog shadcn utilise directement `useTranslations('Cookies')` côté Client Component. ADR-010.
- **ADRs liés** : ADR-001 (monolithe Next.js), ADR-005 (Dokploy self-hosted, lib ~30 KB acceptable bundle), ADR-007 (Umami post-MVP, ne nécessite PAS de catégorie analytics car cookie-less). Pas de nouvel ADR à créer.

## Acceptance criteria

### Scénario 1 : Premier chargement, banner s'affiche après FCP

**GIVEN** un visiteur en navigation privée arrive sur `/fr` (DB seedée, cookie `cc_consent` absent)
**WHEN** la page charge complètement (HTML + bundle JS hydrate)
**THEN** le banner cookies apparaît en bas de l'écran avec une animation slide-up 200ms ease-out (motion/react)
**AND** le banner contient un titre i18n FR (ex: "Cookies & confidentialité"), une description courte i18n FR, et 3 boutons côte à côte de même taille (Tailwind `w-full sm:w-auto`) : "Tout accepter", "Tout refuser", "Personnaliser"
**AND** la position du banner est `fixed bottom-0 left-0 right-0 z-50`, n'introduit pas de layout shift (CLS = 0)
**AND** Lighthouse Performance reste >= baseline pré-banner (le banner étant `dynamic({ ssr: false })`, il ne bloque pas le bundle initial)

### Scénario 2 : Clic "Tout accepter"

**GIVEN** le banner est visible
**WHEN** je clique "Tout accepter"
**THEN** le cookie `cc_consent` est créé avec un payload incluant `categories: ['necessary', 'marketing']`, expire dans 395 jours (~13 mois)
**AND** le banner se ferme avec animation slide-down (`AnimatePresence` exit transition)
**AND** un événement `consent:accepted` est loggé en console au format JSON `{ level: 'info', service: 'thibaud-geisler-portfolio', context: 'client', time: '<ISO>', msg: 'consent:accepted', marketing: true }`
**AND** le hook `useConsentStatus()` retourne désormais `{ marketing: true, hasInteracted: true }`

### Scénario 3 : Clic "Tout refuser"

**GIVEN** le banner est visible
**WHEN** je clique "Tout refuser"
**THEN** le cookie `cc_consent` est créé avec `categories: ['necessary']` (marketing absent), expire 395 jours
**AND** le banner se ferme
**AND** un événement `consent:rejected` est loggé avec `marketing: false`
**AND** le hook retourne `{ marketing: false, hasInteracted: true }`

### Scénario 4 : Clic "Personnaliser" puis Save avec marketing toggled on

**GIVEN** le banner est visible
**WHEN** je clique "Personnaliser"
**THEN** une modale Dialog shadcn s'ouvre, le banner reste affiché derrière (overlay)
**AND** la modale contient un titre i18n, 2 Card (necessary disabled+true read-only, marketing toggle interactive default false), et un footer avec 3 boutons (Save, Accept all, Reject all)
**WHEN** je toggle marketing à on et je clique "Save"
**THEN** le cookie `cc_consent` est créé avec `categories: ['necessary', 'marketing']`
**AND** la modale se ferme, le banner se ferme aussi
**AND** un événement `consent:customized` est loggé avec `marketing: true`

### Scénario 5 : Rechargement persistant

**GIVEN** un visiteur a déjà accepté (cookie `cc_consent` présent, marketing=true)
**WHEN** il recharge la page ou revient ultérieurement (cookie encore valide < 13 mois)
**THEN** le banner ne réapparaît PAS
**AND** le hook `useConsentStatus()` retourne immédiatement `{ marketing: true, hasInteracted: true }` (sans attendre une interaction)

### Scénario 6 : `openPreferences()` ré-ouvre la modale

**GIVEN** un visiteur a déjà interagi (banner fermé, cookie persisté)
**WHEN** un Client Component tiers (par ex. le futur bouton footer "Gérer mes cookies" du sub 7) appelle `useConsentStatus().openPreferences()`
**THEN** la modale Dialog shadcn s'ouvre directement, sans réafficher le banner
**AND** les toggles reflètent l'état actuel persisté (marketing on/off selon le dernier choix)

### Scénario 7 : Détection automatique de la locale

**GIVEN** un visiteur arrive sur `/en/contact` (next-intl set `<html lang="en">`)
**WHEN** le banner s'affiche (premier hit)
**THEN** les textes du banner et de la modale sont en EN (lus depuis `messages/en.json` namespace `Cookies`)
**AND** vanilla-cookieconsent détecte la locale via `language.autoDetect: 'document'` qui lit `document.documentElement.lang === 'en'`
**WHEN** le visiteur switch en `/fr` (cookie persiste cross-locale)
**THEN** le banner ne réapparaît pas mais si on appelle `openPreferences()` la modale est en FR

### Scénario 8 : Tests intégration verts

**GIVEN** le sub-project complètement implémenté
**WHEN** je lance `pnpm test src/lib/cookies/use-consent-status.integration.test.ts`
**THEN** Vitest exécute le fichier dans le project `integration`, environment jsdom
**AND** les 12 cas listés dans la section Tests passent (vert)
**AND** la console n'émet aucun warning React (hydration mismatch, deps useEffect manquante, etc.)

## Tests à écrire

### Integration

`src/lib/cookies/use-consent-status.integration.test.ts` (jsdom env via `// @vitest-environment jsdom` en tête de fichier ou via config Vitest project) :

- **`useConsentStatus()` hors Provider lance une erreur explicite** : render un composant qui appelle `useConsentStatus()` SANS wrapper, attend `expect(...).toThrow('useConsentStatus must be used within CookieConsentProvider')`
- **State initial avant interaction utilisateur** : render `<CookieConsentProvider>` avec localStorage vide, lire le hook → `{ marketing: false, hasInteracted: false }`
- **Cookie pré-existant marketing=true** : pré-seed `document.cookie = 'cc_consent={"categories":["necessary","marketing"]}'`, render Provider, attendre `useEffect` du Provider qui lit le cookie via `cc.acceptedCategory('marketing')`, lire le hook → `{ marketing: true, hasInteracted: true }`
- **Cookie pré-existant marketing=false** : idem mais `categories: ['necessary']`, hook → `{ marketing: false, hasInteracted: true }`
- **Accept all programmatique synchronise le state** : render Provider, simuler `cc.acceptCategory('all')` (API vanilla-cookieconsent), dispatch event `cc:onConsent`, hook → `{ marketing: true, hasInteracted: true }`, vérifier que `clientLogger.info('consent:accepted', { marketing: true })` a été appelé (spy sur `console.info`)
- **Reject all programmatique synchronise le state** : render Provider, simuler `cc.acceptCategory([])`, dispatch `cc:onConsent`, hook → `{ marketing: false, hasInteracted: true }`, log `consent:rejected`
- **Change ultérieur via `cc:onChange`** : render Provider avec cookie pré-existant marketing=false, dispatch `cc:onChange` après `cc.acceptCategory(['necessary', 'marketing'])`, hook → `{ marketing: true, hasInteracted: true }`, log `consent:changed`
- **`openPreferences()` appelle `cc.showPreferences()`** : render Provider, spy sur `cc.showPreferences`, appeler `useConsentStatus().openPreferences()`, attendre que le spy soit appelé une fois
- **Cleanup des event listeners au unmount** : render Provider puis unmount, vérifier via spy `removeEventListener` que `cc:onConsent` et `cc:onChange` ont été supprimés
- **Cookie expire bien à 395 jours** : après accept simulé, lire `document.cookie` ou utiliser une factory pour vérifier que le `expires` du cookie est ~395 jours dans le futur (tolérance 1 jour)
- **`clientLogger` ne loggue jamais de PII** : appeler `clientLogger.info('test', { ip: '1.2.3.4', email: 'a@b.c' })` (test d'usage incorrect), vérifier que la convention de tests s'assure qu'aucun appel dans le sub-project ne contient ces clés sensibles. Note : c'est un test de **convention** (regex sur les fichiers du sub) plutôt qu'un test runtime.
- **Format JSON Pino-like** : appeler `clientLogger.info('test:event', { foo: 'bar' })`, intercepter `console.info`, parser le JSON émis, vérifier les clés `level === 'info'`, `service === 'thibaud-geisler-portfolio'`, `context === 'client'`, `time` est un ISO valide, `msg === 'test:event'`, `foo === 'bar'`

Setup commun :
- `// @vitest-environment jsdom` en tête de fichier
- `beforeEach(() => { document.cookie = 'cc_consent=; expires=Thu, 01 Jan 1970 00:00:00 GMT'; localStorage.clear(); vi.clearAllMocks() })` reset complet
- Factory `renderWithProvider(children, { initialCookie?: string })` qui pré-seed le cookie puis render le Provider
- Spy sur `console.info` / `console.warn` / `console.error` via `vi.spyOn(console, 'info').mockImplementation(() => {})`
- Pas de mock de `vanilla-cookieconsent` (vraie lib utilisée en jsdom)
- Mock `next/navigation` si un composant testé l'utilise (probablement pas pour ce sub)

Tests délibérément exclus (no-lib-test) :
- Test unitaire des composants `<CookieConsent>` et `<CookiePreferencesModal>` au niveau React (testerait le rendu motion/react + Dialog Radix = libs)
- Test du contenu de `messages/{fr,en}.json` namespace `Cookies` (testerait next-intl)
- Test de `dynamic({ ssr: false })` côté Providers (testerait Next.js)
- Test de l'API `vanilla-cookieconsent.run()` ou `cc.acceptedCategory()` (testerait la lib elle-même)
- Test E2E de l'animation slide-up motion/react (testerait motion + jsdom ne supporte pas les CSS animations correctement)
- Test du clic sur le bouton Save de la modale (testerait Dialog Radix + Tailwind = libs)

## Edge cases

- **Hydration mismatch React 19 si banner rendu côté serveur** : impossible car `dynamic({ ssr: false })` exclut le composant du SSR. Le banner ne render qu'après mount client. Pattern `mounted` redondant mais sûr.
- **Visiteur revient après expiration du cookie 13 mois** : `vanilla-cookieconsent` détecte le cookie absent au mount, `validConsent()` retourne false, banner réapparaît automatiquement. Couvert par scénario 1.
- **Visiteur supprime manuellement le cookie via DevTools** : prochaine page navigation, lib détecte cookie absent, banner réapparaît. Pas de bug.
- **`useConsentStatus()` appelé depuis un Server Component** : impossible car le hook est côté Client Component (le Provider lui-même est `'use client'`). Erreur de compilation si tenté.
- **Animation motion/react cassée si `prefers-reduced-motion`** : motion respecte automatiquement `prefers-reduced-motion: reduce` (standard depuis motion 11). Pas de patch nécessaire.
- **2 onglets ouverts simultanément** : si l'utilisateur accepte dans l'onglet 1, l'onglet 2 a un cookie obsolète en mémoire JS jusqu'au reload. Cas accepté MVP (pas de sync cross-tab via `BroadcastChannel`). Documenter comme limitation connue.
- **Cookie corrompu (parse JSON fail)** : `vanilla-cookieconsent` v3 gère le cas, considère le cookie absent, banner réapparaît. Pas de crash.
- **`document.documentElement.lang` non encore set au moment du mount lib** : peu probable car next-intl set le lang dans `<html lang>` au render serveur. Mais si race condition, fallback sur `language.default = 'fr'` configuré.
- **PII accidentelle dans `clientLogger.info(event, payload)`** : convention projet interdit IP/email/cookie content. Test de convention dans le sub-project (regex check sur les appels). Si un dev futur fait l'erreur, ce test casse.
- **Bundle size impact** : `vanilla-cookieconsent` ~30 KB minified gzipped. Lazy load via `dynamic({ ssr: false })` exclut du bundle initial. Vérifier post-implémentation que le report `next build` ne montre pas d'inflation du bundle de la home (par ex. `/fr` ne doit PAS inclure cookies-related JS dans son First Load JS).
- **Calendly iframe avant consent (sub 5 pas encore mergé)** : pendant la phase de dev où sub 3 est mergé mais pas sub 5, le widget Calendly se charge inconditionnellement. Aucune CSP violation (sub 2 autorise déjà `frame-src calendly.com`). Pas de blocker MVP, juste à avoir en tête lors du sequencing des merges.
- **Modale Dialog shadcn focus trap** : Radix UI gère automatiquement le focus trap (focus ne sort pas de la modale au Tab). Couvert nativement par `Dialog`.

## Architectural decisions

### Décision : Mode headless vs UI built-in `vanilla-cookieconsent`

**Options envisagées :**
- **A. UI built-in vanilla-cookieconsent** : utiliser le banner et la modale par défaut de la lib, avec un éventuel restyle via overrides CSS. Zéro composant React custom. La lib s'occupe de tout.
- **B. Mode headless** : utiliser uniquement l'API JS et la persistance localStorage de la lib, remplacer banner et modale par des composants custom (banner motion/react slide-up + modale Dialog shadcn). Cohérence design system.
- **C. Hybride** : utiliser le banner built-in (restylé via CSS pour matcher tokens DESIGN.md) + modale custom Dialog shadcn (besoin de plus de contrôle UX).

**Choix : B**

**Rationale :**
- L'option A demande un restyle CSS substantiel pour matcher le DESIGN.md (couleurs OKLCH vert sauge, typographie Sansation/Geist, border-radius `--radius`, `prefers-reduced-motion` respecté). Le selector ladder de la lib est complexe et évolue à chaque version. Combat CSS récurrent.
- L'option C mélange 2 styles différents pour banner et modale, incohérent. De plus le banner built-in n'a pas d'animation motion/react cohérente avec le reste du projet (animations sub-projects précédents).
- L'option B donne le contrôle total : banner motion/react aligné sur les patterns du projet, modale Dialog shadcn déjà présente et accessible (Radix), tokens Tailwind cohérents. Coût : ~80 lignes React supplémentaires pour les 2 composants. Coût acceptable pour MVP solo, et c'est du code maintenable. La lib est utilisée uniquement pour ce qu'elle fait bien : persistance cookie + events DOM.
- Trade-off accepté : si la lib ajoute des features (ex: GPC support, gestion granulaire des services), il faudra les exposer manuellement dans nos composants. Mais MVP scope limité (2 catégories, pas de GPC), donc OK.

### Décision : Hook + Context React vs callback subscription global

**Options envisagées :**
- **A. Context React + state local synchronisé via DOM events** : `<CookieConsentProvider>` qui écoute `cc:onConsent` / `cc:onChange`, expose `useConsentStatus()` aux descendants via `useContext`.
- **B. Singleton global `window.cookieConsent`** : la lib pose une variable globale, les Client Components y accèdent directement sans hook. Pas de Provider.
- **C. Callback prop drilling** : passer `useConsentStatus` en prop des composants qui en ont besoin, depuis un parent qui écoute la lib.

**Choix : A**

**Rationale :**
- L'option B (global) viole les patterns React idiomatiques (pas de re-render automatique sur changement de l'état global, nécessite forceUpdate ou abonnement manuel). De plus, `window.X` est mal typé et complique les tests unitaires.
- L'option C (prop drilling) devient pénible quand le hook est consommé par 2-3 composants à des niveaux différents (sub 5 CalendlyWidget, sub 7 Footer button). Provider + hook scale mieux.
- L'option A est le pattern React canonical pour partager un state global accessible. Re-render automatique sur changement via `useState` du Provider qui se met à jour via les listeners DOM. Tests faciles via `renderWithProvider`. Cohérent avec d'autres providers du projet (`ThemeProvider` next-themes, `NextIntlClientProvider`).

### Décision : 2 catégories `necessary + marketing` vs 3 `necessary + analytics + marketing`

**Options envisagées :**
- **A. 2 catégories** : `necessary` (toujours actif) + `marketing` (Calendly opt-in).
- **B. 3 catégories** : `necessary` + `analytics` + `marketing`. Préparer Umami pour post-MVP.
- **C. 1 catégorie** : `necessary` uniquement, accept all/reject all binaire global.

**Choix : A**

**Rationale :**
- L'option C ne permet pas la granularité CNIL (l'utilisateur ne peut pas accepter le strict nécessaire et refuser le marketing séparément). Non conforme.
- L'option B anticipe Umami mais introduit une catégorie fantôme MVP (rien à gater dedans tant qu'Umami n'est pas mergé). Et Umami est cookie-less par design (pas besoin de catégorie analytics dans le banner). YAGNI.
- L'option A est le minimum CNIL conforme pour MVP : `necessary` couvre les cookies fonctionnels du site (session, theme préférence next-themes, consentement lui-même), `marketing` couvre Calendly (cookies tiers). Si Umami nécessite un consent post-MVP (peu probable car cookie-less), on ajoutera la catégorie à ce moment-là. 1 ligne dans la config.

### Décision : Dialog shadcn custom pour la modale vs DialogPrimitive Radix direct

**Options envisagées :**
- **A. Dialog shadcn existant** (`src/components/ui/dialog.tsx`) : composant déjà présent, utilise Radix Primitives sous le capot, déjà accessible et stylé selon DESIGN.md.
- **B. Radix UI DialogPrimitive direct** : importer directement `@radix-ui/react-dialog`, custom le styling.
- **C. Nouvelle modale custom from scratch** : composant React custom sans dépendance UI lib.

**Choix : A**

**Rationale :**
- L'option C casse l'accessibilité (focus trap, escape key handler, ARIA). Inacceptable pour une modale conformité.
- L'option B duplique le travail déjà fait dans `dialog.tsx` shadcn (variants, classes Tailwind, structure). Anti-DRY.
- L'option A réutilise le composant shadcn existant. La modale Cookie Preferences est juste un consommateur de plus du Dialog, comme n'importe quelle autre modale future. Cohérence design system, accessibility gérée, maintenance déléguée à shadcn/Radix.
