---
feature: "Feature 7 — Conformité légale"
subproject: "Gating du widget Calendly inline derrière le consentement marketing"
goal: "Conditionner le rendu du iframe Calendly au consentement marketing du sub 3 via useConsentStatus, avec un placeholder gated CTA qui ouvre la modale de préférences pour activer Calendly sans recharger la page"
status: "draft"
complexity: "S"
tdd_scope: "partial"
depends_on: ["03-bandeau-consentement-cookies-design.md", "04-pages-mentions-confidentialite-design.md"]
date: "2026-04-28"
---

# Gating du widget Calendly inline derrière le consentement marketing

## Scope

Modifier `src/components/features/contact/CalendlyWidget.tsx` (Client Component existant `'use client'` qui rend `<InlineWidget>` de `react-calendly@^4.4.0`) pour ajouter une 3e branche conditionnelle en tête du return : si `useConsentStatus().marketing === false` (pas de consentement marketing donné par l'utilisateur), render un placeholder gated avec icône `Cookie` lucide + label i18n + bouton CTA `<OpenCookiePreferencesButton>` (créé au sub 4) qui ouvre la modale du sub 3. Re-render automatique via le Context React du sub 3 quand l'utilisateur accepte (state.marketing change → re-render → branche normale s'active, l'iframe Calendly se charge sans navigation). Étendre `<OpenCookiePreferencesButton>` (sub 4) avec une prop optionnelle `label?: string` pour customiser le texte du bouton en contexte ("Activer Calendly" vs "Personnaliser" par défaut). Ajouter 4 clés i18n `Cookies.calendlyGated.{label, cta}` dans `messages/{fr,en}.json`. Tests integration jsdom partial (3 cas : `marketing=false` rend gated, `marketing=true` rend iframe, transition false→true re-render). **Exclut** : modification de la lib `react-calendly` ou de la Server Action `trackCalendlyEvent`, modifications du sub 2 CSP (déjà whitelist Calendly day-1), prefetch ou warm-up de la lib avant consent (overkill MVP), tracking analytics post-consent (post-MVP avec Umami), suppression du cookie Calendly si l'utilisateur retire son consentement après l'avoir donné (post-MVP, vanilla-cookieconsent v3 a une API `autoClear` qu'on n'utilise pas en MVP).

### État livré

À la fin de ce sub-project, on peut : (a) charger `/fr/contact` en navigation privée (cookie consent absent), observer le widget Calendly remplacé par un placeholder gated affichant l'icône Cookie, le label "L'affichage du widget Calendly nécessite votre accord pour les cookies marketing." (FR) et un bouton "Activer Calendly" ; (b) cliquer sur ce bouton, voir la modale Dialog du sub 3 s'ouvrir avec les 2 cards et toggles ; (c) toggler marketing à `on` + cliquer Save dans la modale, observer la fermeture de la modale puis le re-render automatique du `<CalendlyWidget>` qui bascule en branche normale (iframe `https://calendly.com/...` se charge dans la même page sans reload) ; (d) `pnpm test src/components/features/contact/CalendlyWidget.integration.test.tsx` retourne vert sur les 3 cas listés ; (e) aucune violation CSP (le sub 2 autorise déjà `frame-src https://calendly.com https://*.calendly.com`).

## Dependencies

- `03-bandeau-consentement-cookies-design.md` (statut: draft) — fournit le hook `useConsentStatus()` qui retourne `{ marketing: boolean, hasInteracted: boolean, openPreferences: () => void }` et le `<CookieConsentProvider>` mounté dans `Providers.tsx` qui wrap toute l'arbre. Sans le sub 3, le `useConsentStatus()` lève une erreur explicite et le composant ne peut pas fonctionner.
- `04-pages-mentions-confidentialite-design.md` (statut: draft) — fournit le composant `<OpenCookiePreferencesButton>` réutilisé pour le CTA "Activer Calendly". Ce sub étend ledit composant avec une prop optionnelle `label?: string` pour customiser le texte affiché.

## Files touched

- **À modifier** : `src/components/features/contact/CalendlyWidget.tsx` (ajout 3e branche conditionnelle en tête du return + imports `useConsentStatus`, `useTranslations`, `Cookie` lucide, `OpenCookiePreferencesButton`)
- **À modifier** : `src/components/features/legal/OpenCookiePreferencesButton.tsx` (ajout d'une prop optionnelle `label?: string` qui, si fournie, override le texte par défaut `t('Cookies.banner.customize')`)
- **À créer** : `src/components/features/contact/CalendlyWidget.integration.test.tsx` (tests integration jsdom Vitest project unit, mock `useConsentStatus` + mock `<InlineWidget>` lib externe, 3 cas)
- **À modifier** : `messages/fr.json` (extension namespace `Cookies` existant : ajout sous-objet `calendlyGated.{label, cta}`)
- **À modifier** : `messages/en.json` (idem EN)

**Non touchés** : `next.config.ts` (sub 2 CSP autorise déjà `frame-src https://calendly.com https://*.calendly.com` et `connect-src https://*.calendly.com`), `prisma/schema.prisma` (sub 1), `src/server/actions/calendly.ts` (la Server Action `trackCalendlyEvent` reste appelée par `useCalendlyEventListener.onEventScheduled` une fois l'iframe montée), `src/components/features/contact/ContactPage.tsx` ou autre parent (le composant `<CalendlyWidget>` est consommé tel quel avec sa signature de props inchangée), `src/lib/cookies/use-consent-status.ts` (sub 3, lecture seule du hook), pages publiques (sub 4).

## Architecture approach

- **Pattern de gating côté client** : le contrôle d'accès au widget marketing se fait exclusivement côté client via le hook `useConsentStatus()` du sub 3 (Context React + state local synchronisé avec vanilla-cookieconsent via DOM events `cc:onConsent` / `cc:onChange`). Aucun gating côté serveur (la CSP du sub 2 autorise Calendly day-1, c'est le DOM client qui décide d'instancier ou non le `<InlineWidget>`). Voir `.claude/rules/nextjs/server-client-components.md` (`'use client'` au plus bas, état UI Client Components). Le hook ne peut être appelé que dans un descendant de `<CookieConsentProvider>` qui wrap toute l'arbre via `Providers.tsx` (sub 3) ; toutes les pages publiques sont OK.
- **Branche gated en tête du return, hooks toujours en haut** : selon les Rules of Hooks, `useState`, `useEffect`, `useCalendlyEventListener`, `useConsentStatus`, `useTranslations` doivent être appelés dans un ordre stable à chaque render. On déclare donc tous les hooks au top du composant AVANT toute condition `if (!marketing) return ...`. Voir `.claude/rules/react/hooks.md` (Rules of Hooks, top-level uniquement, jamais dans `if`/`for`). Les hooks `useState` et `useEffect` qui pilotent le resize Calendly continuent de tourner inutilement dans la branche gated, mais aucun side-effect néfaste (l'iframe n'est pas montée donc `useCalendlyEventListener` ne reçoit aucun événement, `matchMedia` est cheap).
- **Re-render automatique sur changement de consentement** : `useConsentStatus()` retourne le state via `useContext`, qui re-render le composant à chaque update du `state.marketing` du Provider (sub 3). Donc quand l'utilisateur clique "Tout accepter" ou toggle marketing dans la modale puis Save, le Provider met à jour son state via le listener `cc:onConsent` / `cc:onChange`, et tous les consumers (dont `<CalendlyWidget>`) re-render automatiquement. Le `<InlineWidget>` se monte alors et se charge de la même façon que sur un premier hit avec consent déjà donné. Voir `.claude/rules/react/hooks.md` (Context Provider re-render automatique des consumers).
- **Placeholder gated minimaliste, pas de réutilisation du `PlaceholderContent` existant** : le `PlaceholderContent` interne actuel ne contient qu'icône + texte simple. Le placeholder gated doit en plus contenir un bouton CTA interactif. On crée donc un bloc JSX inline dans la branche `if (!marketing)` avec icône `Cookie` lucide (sémantique cookies vs `CalendarClock` qui est calendrier), label i18n `t('Cookies.calendlyGated.label')`, et le bouton `<OpenCookiePreferencesButton variant="default" label={t('Cookies.calendlyGated.cta')} />`. Le styling reprend la structure visuelle des 2 placeholders existants (`flex flex-col items-center justify-center min-h-[500px] gap-3 border border-border bg-card text-muted-foreground rounded-lg`).
- **Extension `OpenCookiePreferencesButton` avec prop `label?` optionnelle** : par défaut le bouton lit `t('Cookies.banner.customize')` ("Personnaliser" / "Customize") du sub 3. Pour ce sub, on ajoute une prop `label?: string` qui, si fournie, override le texte affiché. Permet de réutiliser le même composant avec un texte contextualisé ("Activer Calendly" / "Enable Calendly") sans dupliquer la logique d'ouverture de la modale. Voir `.claude/rules/typescript/conventions.md` (props optionnelles avec `?`, défaut explicite).
- **i18n strict via next-intl** : 4 nouvelles clés ajoutées au namespace `Cookies` existant (créé au sub 3) : `Cookies.calendlyGated.label` et `Cookies.calendlyGated.cta` en FR et EN. Pas de fallback hardcodé. Voir `.claude/rules/next-intl/translations.md` (`useTranslations` Client Component, namespaces).
- **Tests integration jsdom avec mocks ciblés** : project Vitest `unit` (env jsdom par défaut sur les `*.test.tsx` colocalisés avec composants React). On mock 2 modules : `'@/lib/cookies/use-consent-status'` pour pouvoir contrôler la valeur retournée par `useConsentStatus()` (true/false marketing) et `'react-calendly'` pour stub `InlineWidget` et `useCalendlyEventListener` (lib externe, no-lib-test). On NE mock PAS `next-intl` (le hook `useTranslations` fonctionne en jsdom avec un Provider de test ou via mock de `next/navigation`). Voir `.claude/rules/vitest/setup.md` (project unit jsdom, `vi.mock` au top du fichier hoisted) et `.claude/rules/nextjs/tests.md` (factory pattern, mock `next/navigation`).
- **Convention nommage test** : `*.integration.test.tsx` (et non `*.test.tsx`) car le test render un Client Component avec hooks et Context, donc considéré comme intégration au-delà d'un pure unit test sur fonction pure. Cohérent avec la convention projet documentée dans `.claude/rules/vitest/setup.md`. Le project Vitest `integration` utilise par défaut env `node`, mais ce fichier nécessite jsdom : override via `// @vitest-environment jsdom` en tête de fichier.
- **Pas de Server Action additionnelle** : `trackCalendlyEvent` (`src/server/actions/calendly.ts`) reste appelée par `useCalendlyEventListener.onEventScheduled` uniquement quand l'iframe est montée (donc quand marketing=true). Aucun appel quand le widget est gated. Pas de modification.
- **Pas de revalidation Next 16 nécessaire** : le sub-project ne touche pas aux queries cachées ni aux pages SSG. La page `/contact` reste rendue normalement par le Server Component parent qui passe l'URL Calendly en prop ; le gating se fait dans le Client Component leaf au runtime navigateur.
- **ADRs liés** : ADR-001 (monolithe Next.js, Client Component dans la même app), ADR-005 (Dokploy self-hosted, lib `react-calendly` dans le bundle client). Aucun nouvel ADR à créer.

## Acceptance criteria

### Scénario 1 : Premier chargement /contact en navigation privée, widget gated affiché

**GIVEN** un visiteur charge `/fr/contact` en navigation privée (cookie `cc_consent` absent, `useConsentStatus()` retourne `{ marketing: false, hasInteracted: false }`)
**WHEN** la page hydrate côté client
**THEN** le composant `<CalendlyWidget>` est rendu mais l'`<InlineWidget>` Calendly n'est PAS dans le DOM (aucun `iframe` `src="https://calendly.com/..."` présent)
**AND** un placeholder est rendu avec une icône `Cookie` lucide (size-10), un label "L'affichage du widget Calendly nécessite votre accord pour les cookies marketing." et un bouton "Activer Calendly"
**AND** aucun appel réseau vers `calendly.com` n'est émis (Network DevTools propre)
**AND** aucune violation CSP en console DevTools

### Scénario 2 : Clic sur "Activer Calendly" ouvre la modale du sub 3

**GIVEN** le widget gated affiché (cf. scénario 1)
**WHEN** je clique sur le bouton "Activer Calendly"
**THEN** la modale Dialog shadcn du sub 3 s'ouvre avec les 2 cards (necessary disabled+true, marketing toggle interactive default false)
**AND** un événement `consent:customized` est loggé en console au format JSON Pino-like (`clientLogger` du sub 3)

### Scénario 3 : Toggle marketing on + Save → re-render automatique → iframe se charge

**GIVEN** la modale est ouverte (suite du scénario 2)
**WHEN** je toggle le checkbox marketing à on et je clique "Sauvegarder mes préférences"
**THEN** la modale se ferme
**AND** le cookie `cc_consent` est créé avec `categories: ['necessary', 'marketing']`, expire dans ~395 jours
**AND** un événement `consent:accepted` (ou `consent:changed` si premier consent ou modification ultérieure) est loggé
**AND** le `<CalendlyWidget>` re-render automatiquement sans navigation : la branche gated disparaît, l'`<InlineWidget>` se monte avec l'URL passée en prop
**AND** un appel réseau vers `https://calendly.com/...` est observable dans Network DevTools (chargement de l'iframe)
**AND** une fois l'iframe complètement chargée (~1-2s), le placeholder loading overlay (branche existante `!iframeReady`) disparaît au profit du widget interactif

### Scénario 4 : Visiteur ayant déjà accepté revient sur /contact

**GIVEN** un visiteur a déjà accepté le marketing dans une session précédente (cookie `cc_consent` présent avec `categories: ['necessary', 'marketing']`)
**WHEN** il charge `/fr/contact` (ou rafraîchit la page)
**THEN** le `<CookieConsentProvider>` du sub 3 lit le cookie au mount et set `state.marketing = true` immédiatement (pas d'état intermédiaire false)
**AND** le `<CalendlyWidget>` rend directement la branche normale (sans flicker du placeholder gated)
**AND** l'`<InlineWidget>` Calendly se charge dès le mount

### Scénario 5 : Visiteur ayant refusé revient sur /contact

**GIVEN** un visiteur a refusé le marketing (cookie `cc_consent` présent avec `categories: ['necessary']` seul)
**WHEN** il charge `/fr/contact`
**THEN** `state.marketing = false`, le widget reste gated (placeholder + CTA)
**AND** s'il clique "Activer Calendly" et accepte, le widget bascule en mode normal sans reload

### Scénario 6 : Tests integration verts

**GIVEN** le sub-project complètement implémenté
**WHEN** je lance `pnpm test src/components/features/contact/CalendlyWidget.integration.test.tsx`
**THEN** Vitest exécute le fichier dans le project `unit` ou `integration` selon override env, env jsdom
**AND** les 3 cas listés en Tests passent (vert)
**AND** aucun warning React (clé manquante, ref invalide, etc.) en console pendant les tests

## Tests à écrire

### Integration

`src/components/features/contact/CalendlyWidget.integration.test.tsx` (env jsdom override via `// @vitest-environment jsdom` en tête de fichier) :

- **`marketing=false` rend le placeholder gated, pas l'iframe** : mock `useConsentStatus` pour retourner `{ marketing: false, hasInteracted: false, openPreferences: vi.fn() }`, render `<CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />`, attend que `screen.getByText(/L'affichage du widget Calendly nécessite votre accord/)` soit présent (ou `getByText(/marketing cookies/)` en EN selon le messages provider de test), `screen.getByRole('button', { name: /Activer Calendly|Enable Calendly/ })` est présent, `screen.queryByTestId('inline-widget-stub')` est null (pas d'iframe Calendly)
- **`marketing=true` + url valide rend l'iframe, pas le placeholder gated** : mock `useConsentStatus` pour retourner `{ marketing: true, hasInteracted: true, openPreferences: vi.fn() }`, mock `react-calendly` `InlineWidget` pour rendre `<div data-testid="inline-widget-stub">`, render `<CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />`, attend que `screen.getByTestId('inline-widget-stub')` soit présent, `screen.queryByText(/L'affichage du widget Calendly nécessite/)` est null (pas de placeholder gated)
- **Transition `marketing: false → true` re-render le composant** : utilise un wrapper qui contrôle dynamiquement la valeur retournée par le mock `useConsentStatus` via un state externe, render initial avec `marketing=false`, vérifie placeholder gated présent, mute le mock pour retourner `marketing=true`, force un re-render (en pratique le Context du sub 3 le ferait automatiquement, ici on force via un changement de prop ou un parent state), vérifie que `screen.getByTestId('inline-widget-stub')` est désormais présent et le placeholder gated est null

Setup commun :
- `// @vitest-environment jsdom` en tête de fichier
- `vi.mock('@/lib/cookies/use-consent-status', () => ({ useConsentStatus: vi.fn() }))` au top, hoisted
- `vi.mock('react-calendly', () => ({ InlineWidget: ({ url }: { url: string }) => <div data-testid="inline-widget-stub" data-url={url} />, useCalendlyEventListener: () => undefined }))` pour stub la lib externe
- Mock minimal de `next-intl` : utiliser `NextIntlClientProvider` test wrapper avec messages stubs, OU mock direct `useTranslations` pour retourner une fonction qui résout les clés FR (suffisant pour tester le gating, on ne teste pas les traductions elles-mêmes)
- `beforeEach(() => vi.clearAllMocks())` reset entre les tests
- Factory `renderCalendlyWidget(overrides?: Partial<Props>)` qui rend le composant avec les props par défaut

Tests délibérément exclus (no-lib-test, voir `~/.claude/CLAUDE.md` § Code > Tests) :
- Test du rendu effectif de `<InlineWidget>` (testerait la lib `react-calendly`)
- Test des callbacks `useCalendlyEventListener` (testerait la lib)
- Test du resize matchMedia (testerait `window.matchMedia` en jsdom, code de plumbing existant non touché par ce sub)
- Test du `trackCalendlyEvent` Server Action (sub Feature 4 contact, hors scope)
- Test du contenu de `messages/{fr,en}.json` namespace `Cookies.calendlyGated` (testerait next-intl)
- Test du composant `<OpenCookiePreferencesButton>` lui-même (sub 4)

`tdd_scope = partial` justifié par : 3 tests integration ciblés sur la logique de gating (la règle métier "marketing=false bloque, marketing=true autorise"), no-lib-test pour le reste.

## Edge cases

- **`useConsentStatus()` appelé hors Provider** : le hook lève une erreur explicite définie au sub 3 (`throw new Error('useConsentStatus must be used within CookieConsentProvider')`). En pratique, le `<CookieConsentProvider>` wrap toute l'arbre via `Providers.tsx`, donc le cas n'arrive pas en production. Si un dev futur consomme le composant hors Provider (tests sans wrapper, page non wrappée), l'erreur est immédiate et explicite. Pas de gestion défensive supplémentaire.
- **`url` prop vide ET `marketing=false`** : la branche gated court-circuite en premier (avant la branche `!url`), donc le placeholder gated est rendu plutôt que le placeholder "no url". Comportement intentionnel : la priorité est de communiquer le besoin de consent, pas de signaler une URL manquante (qui est une erreur de configuration développeur, pas une erreur utilisateur).
- **Re-render rapide successif (marketing change plusieurs fois)** : le composant re-render proprement à chaque changement de Context value. Pas de risque de mémoire ni de side-effect. Le `useEffect` matchMedia ne se ré-exécute pas (deps stables `[]`). `useCalendlyEventListener` reste actif mais ne reçoit aucun événement tant que l'iframe n'est pas montée.
- **Hydration mismatch React 19** : impossible car le composant est `'use client'` complet (pas de SSR du contenu, le composant est mounté côté client après hydration). Le `<CookieConsentProvider>` du sub 3 fournit `state.marketing = false` initial avant de lire le cookie via `useEffect`, donc le placeholder gated est rendu en premier puis remplacé par l'iframe si le cookie est présent. Pas de mismatch entre serveur et client.
- **Cookie `cc_consent` corrompu** : `vanilla-cookieconsent` v3 (sub 3) considère le cookie absent et retourne `validConsent() === false` + `acceptedCategory('marketing') === false`. Le widget reste gated. L'utilisateur peut re-consentir.
- **Visiteur avec `prefers-reduced-motion: reduce`** : le placeholder gated n'a pas d'animation. Si motion/react est utilisée pour le bouton hover, motion respecte automatiquement la préférence. Pas de patch.
- **Plusieurs `<CalendlyWidget>` sur la même page** (cas hypothétique futur) : chaque instance consomme `useConsentStatus()` indépendamment et observe la même valeur (singleton Context). Tous les widgets de la page se débloquent simultanément quand l'utilisateur accepte. Comportement attendu.
- **Visiteur retire son consentement après l'avoir donné** (ré-ouvre la modale, toggle marketing à off, Save) : le state.marketing repasse à false, le `<CalendlyWidget>` re-render et bascule en branche gated. L'iframe Calendly est démontée du DOM. Note : les cookies tiers déjà déposés par Calendly via l'iframe ne sont PAS supprimés automatiquement (vanilla-cookieconsent v3 a une option `autoClear` qu'on n'utilise pas en MVP, hors scope sub 5). Acceptable : la prochaine session, le widget sera bloqué et Calendly ne posera plus de nouveaux cookies. Documentation à ajouter post-MVP si compliance requise.
- **Test environnement (Vitest jsdom)** : `useConsentStatus` mocké retourne directement la valeur sans passer par le Provider réel. `react-calendly` mocké retourne un stub. Pas de vraie communication réseau ni postMessage. Tests rapides, déterministes.
- **Bundle size** : le composant `<CalendlyWidget>` reste dans le bundle de la page `/contact` (déjà le cas avant ce sub). L'ajout du gating ajoute ~5 imports + 10 lignes JSX, impact bundle négligeable.

## Architectural decisions

### Décision : Gating côté client (Context React) vs côté serveur (lecture cookie sur Server Component)

**Options envisagées :**
- **A. Côté client via `useConsentStatus()` du sub 3 (Context React)** : le `<CalendlyWidget>` Client Component lit le state du Provider et conditionne son rendu. Re-render automatique sur changement.
- **B. Côté serveur via `cookies()` next/headers** : le Server Component parent (`/contact/page.tsx`) lit le cookie `cc_consent` via `await cookies()` et passe une prop `consentMarketing: boolean` au `<CalendlyWidget>`. Le composant client se contente de switcher selon la prop.
- **C. Hybride (initial server + client takeover)** : Server Component lit le cookie pour le rendu initial (évite flicker du placeholder gated si déjà consenti), Client Component écoute les changements ultérieurs via Context.

**Choix : A**

**Rationale :**
- L'option B nécessite que `/contact/page.tsx` (Server Component) devienne dépendant du cookie de consentement, ce qui force un rendu dynamique de la page (perte de cache statique). Or la page `/contact` est aujourd'hui un Server Component pur sans dépendance cookie. Couplage serveur/cookie indésirable.
- L'option C est plus complexe (Server Component qui lit le cookie + prop + Client Component qui écoute le Context) sans bénéfice fonctionnel notable : le flicker initial du placeholder gated dure ~50ms (le temps que le `useEffect` du Provider lise le cookie), invisible à l'œil nu. YAGNI.
- L'option A est cohérente avec l'architecture du sub 3 (`<CookieConsentProvider>` mounté dans `Providers.tsx`, hook réutilisable par toutes les surfaces de la feature 7 et au-delà). Re-render automatique sur changement (consume natif Context). Code minimal (10 lignes ajoutées au composant existant).
- Trade-off accepté : flicker très bref (~50ms) du placeholder gated au premier mount si l'utilisateur a déjà consenti. Acceptable car invisible et réutilisable du pattern client-side standard.

### Décision : Réutiliser `<OpenCookiePreferencesButton>` du sub 4 vs créer un bouton dédié

**Options envisagées :**
- **A. Réutiliser `<OpenCookiePreferencesButton>` avec ajout d'une prop `label?` optionnelle** : 1 composant, 1 source de vérité pour la logique d'ouverture de la modale. Étend le composant existant pour customisation.
- **B. Créer un bouton dédié `<EnableCalendlyButton>`** : nouveau Client Component qui consomme `useConsentStatus().openPreferences()` et appelle `t('Cookies.calendlyGated.cta')`. Duplique la logique du bouton sub 4.
- **C. Inline le bouton dans `<CalendlyWidget>`** : pas de composant séparé, juste un `<Button onClick={openPreferences}>{t(...)}</Button>` dans le JSX du placeholder gated.

**Choix : A**

**Rationale :**
- L'option B duplique la logique de `useConsentStatus().openPreferences()` + le bouton shadcn. Anti-DRY. À maintenir en 2 endroits si la logique d'ouverture change.
- L'option C est OK syntaxiquement mais perd la sémantique réutilisable. Si demain un 4e endroit du site veut ouvrir la modale (ex: section Cookies de `/confidentialite` au sub 4 + footer au sub 7 + nouvelle surface), on duplique encore. Le sub 4 a déjà créé `<OpenCookiePreferencesButton>` précisément pour ce besoin.
- L'option A étend le composant existant sans casser son API : la prop `label` est optionnelle et fallback sur `t('Cookies.banner.customize')` par défaut. Diff `+1 ligne` côté `<OpenCookiePreferencesButton>`. Cohérent avec le principe de réutilisation du projet (cf. mémoire `feedback_reuse_components.md` du user).

### Décision : Position de la branche gated (avant ou après la branche `!url`)

**Options envisagées :**
- **A. Branche gated en premier** : `if (!marketing) return <Gated />; if (!url) return <NoUrl />; return <Inline />`. Le consent prime sur l'absence d'URL.
- **B. Branche `!url` en premier** : `if (!url) return <NoUrl />; if (!marketing) return <Gated />; return <Inline />`. L'URL absente est traitée comme une erreur de config et signalée en priorité.

**Choix : A**

**Rationale :**
- L'option B traite le cas "URL absente" comme prioritaire, mais c'est une erreur de configuration développeur (le parent Server Component oublie de passer la prop `url`). Si l'utilisateur n'a pas consenti et que l'URL est par hasard manquante, lui afficher "URL Calendly manquante" plutôt que "veuillez consentir aux cookies" est confusant (il n'a rien à voir avec le bug).
- L'option A communique la bonne action utilisateur (consentir) en priorité. Si l'URL est aussi manquante, c'est un problème distinct qui apparaîtra dès qu'il aura consenti (branche `!url` se déclenche dans la branche normale après consent). C'est OK car l'erreur de config est résolue par le développeur, pas par l'utilisateur.
- En pratique MVP : l'URL est toujours fournie (c'est le `NEXT_PUBLIC_CALENDLY_URL` env var), donc la branche `!url` ne se déclenche jamais en production. Le choix A vs B est purement défensif.

### Décision : Tests integration jsdom vs E2E Playwright

**Options envisagées :**
- **A. Tests integration jsdom avec mocks ciblés** : 3 cas qui mockent `useConsentStatus` et `react-calendly`, vérifient les branches conditionnelles via `@testing-library/react`. Rapides, déterministes.
- **B. Tests E2E Playwright** : lancer un vrai navigateur sur `/fr/contact`, simuler le clic sur le bouton, accepter le cookie, vérifier que l'iframe se charge. Couvre l'intégration complète (Provider sub 3 + sub 4 + sub 5 + lib).
- **C. Pas de test** : tdd_scope `none`, smoke test post-deploy uniquement.

**Choix : A**

**Rationale :**
- L'option C ne couvre pas la règle métier critique de la feature 7 (consent requis avant Calendly = LCEN+RGPD compliance). Inacceptable car cette règle est contractuelle vis-à-vis de la CNIL.
- L'option B (Playwright) est la couverture la plus complète mais le projet exclut explicitement l'E2E pour le MVP (cf. `.claude/rules/nextjs/tests.md` : "Tests E2E (Playwright) : non prévus pour le MVP, à ajouter post-MVP si le dashboard devient complexe"). Hors scope projet.
- L'option A est l'optimum pragmatique : 3 tests jsdom rapides qui valident la logique de gating (la règle métier de ce sub) en mockant les dépendances externes (lib `react-calendly`, hook du sub 3 qu'on n'a pas à re-tester). Couvre les 2 branches + la transition. Si en production le bug arrive, le test casse au build CI.
- Trade-off accepté : on ne teste pas l'intégration réelle Provider + cookie réel + iframe. Couvert par les acceptance scenarios manuels (Task smoke tests) et le sub 3 qui a déjà ses propres tests integration.
