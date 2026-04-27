---
feature: "Feature 4 — Formulaire de contact"
subproject: "refactor-calendly-widget-react-lib"
goal: "Migrer CalendlyWidget vers la lib react-calendly avec un custom hook useCalendlyInline qui fixe le bug de remount Tabs et applique les params URL gratuits Calendly free."
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-04-27"
---

# Refactor CalendlyWidget : lib `react-calendly` + custom hook `useCalendlyInline`

## Scope

Refactor du composant `src/components/features/contact/CalendlyWidget.tsx` qui utilise actuellement le pattern autoscan natif (`<div className="calendly-inline-widget" data-url="...">` + `<Script>` Next.js avec `data-resize="true"`) vers une intégration pilotée par un custom hook `useCalendlyInline` qui appelle manuellement `window.Calendly.initInlineWidget()`. Ajout de la dépendance `react-calendly@^4.4.0` pour ses types (`PageSettings`, `Prefill`, `Utm`) et son hook `useCalendlyEventListener` qui capte l'event `calendly:event_scheduled`. Ajout d'une Server Action minimale `trackCalendlyEvent` qui logue cet event via Pino (pattern identique à `submitContact` du sub 03). Factorisation des helpers `extractClientIp` et `hashIp` (actuellement locaux à `contact.ts`) dans `src/lib/server-utils.ts` pour réutilisation. Params URL Calendly gratuits (`hideEventTypeDetails`, `hideGdprBanner`) appliqués via `pageSettings` côté code, pas via query string env. Inline embed uniquement (pas de PopupWidget, PopupButton, PopupModal).

**Exclu** : passage Calendly Pro pour couleurs custom (`primary_color`, `text_color`, `background_color` silencieusement ignorés en free), gating cookies marketing par bandeau de consentement (Feature 7 légale, séparée), suppression du bandeau cookies natif Calendly en prod sans gating (à arbitrer plus tard), switch vers Cal.com (alternative discutée mais non retenue), tests Vitest (tdd_scope `none` : plumbing lib React/Calendly + iframe cross-origin, no-lib-test), modification de `page.tsx` ou des autres composants contact (`ContactForm`, `LocationLine`, `SocialLinks`, `CalendlyWidget` props inchangées).

### État livré

À la fin de ce sub-project, on peut : naviguer sur `/contact` (FR ou EN) → cliquer onglet "Réservez un créneau" → voir le widget Calendly chargé sans bandeau cookies natif et avec calendrier directement (pas de section descriptive intermédiaire) ; switcher onglet "Écrivez-moi" → revenir sur "Réservez un créneau" → constater que l'iframe est conservée (pas de reload visible, pas de blanc transitoire — bug Tabs unmount fixé) ; vider la var d'environnement Calendly (URL vide) + restart dev → voir le placeholder fallback (icône `CalendarClock` + label i18n + bordure dashed) ; réserver un vrai créneau → voir un log Pino côté serveur avec `event: "calendly:event_scheduled"`, `event_uri`, `ip_hash`, `requestId`, sans aucune PII (pas d'`invitee_uri`).

## Dependencies

Aucune — ce sub-project est autoporté. Le sub 04 (`branchement-contact-form-action`) a laissé `CalendlyWidget` avec son implémentation pré-existante (pattern autoscan + placeholder fallback) ; ce sub 05 le refactor sans rien casser ailleurs.

## Files touched

- **À modifier** : `package.json` (ajout dependency `react-calendly@^4.4.0`)
- **À modifier** : `pnpm-lock.yaml` (auto-régénéré)
- **À créer** : `src/hooks/use-calendly-inline.ts` (custom hook : Promise singleton script + callback ref + `Calendly.initInlineWidget()` + `replaceChildren()` cleanup)
- **À créer** : `src/lib/server-utils.ts` (helpers `extractClientIp` + `hashIp` extraits de `contact.ts` pour réutilisation par `calendly.ts`)
- **À créer** : `src/server/actions/calendly.ts` (Server Action `trackCalendlyEvent({ eventUri })` + child logger Pino, pattern identique à `contact.ts` sub 03)
- **À modifier** : `src/components/features/contact/CalendlyWidget.tsx` (refactor : consomme `useCalendlyInline` + `useCalendlyEventListener`, supprime `<Script>` + `data-url` autoscan, conserve placeholder fallback existant et props)
- **À modifier** : `src/server/actions/contact.ts` (refactor : importe `extractClientIp` + `hashIp` depuis `@/lib/server-utils` au lieu de définir les helpers localement)

## Architecture approach

- **Custom hook `useCalendlyInline`** (path canonique `src/hooks/`) : encapsule le cycle de vie Calendly. Signature `useCalendlyInline({ url, pageSettings?, prefill?, utm? })` retourne `{ containerRef }`. Pattern callback ref (`(node: HTMLDivElement | null) => void`) plutôt que `useRef + useEffect` : React rappelle la fonction à chaque attach/detach DOM, ce qui re-déclenche l'init à chaque remount Radix Tabs sans dépendre de l'auto-scan de `widget.js`. Conforme à `.claude/rules/react/hooks.md` (Rules of Hooks au top-level, deps complètes, custom hook nommé `useXxx`).
- **Promise singleton module-level** pour le script `widget.js` : variable `let scriptPromise: Promise<typeof window.Calendly> | null = null` au scope module. Premier appel injecte un `<script src="https://assets.calendly.com/assets/external/widget.js">` dans `document.head` et résout au `load`. Appels suivants retournent la promesse existante. Évite le double-load si plusieurs `CalendlyWidget` montés simultanément ou navigation client-side.
- **Pattern `'use client'`** : le hook et le composant sont en Client Component (utilisent `window`, `useCallback`, `useEffect`). La page contact (`src/app/[locale]/(public)/contact/page.tsx`) reste Server Component et passe l'URL en prop sérialisable string. Conforme à `.claude/rules/nextjs/server-client-components.md` (leaf client component pattern).
- **`replaceChildren()` avant init** : à chaque appel de `initInlineWidget`, vider l'enfant du container via `node.replaceChildren()` pour éviter la double iframe en HMR Turbopack et le double-mount StrictMode React 19. Cleanup au unmount via callback ref reçoit `null` → on retient le node précédent dans une ref locale et on le vide.
- **TypeScript global** : `declare global { interface Window { Calendly?: { initInlineWidget: (opts: { url: string; parentElement: HTMLElement; pageSettings?: PageSettings; prefill?: Prefill; utm?: Utm }) => void } } }` dans le hook. Types `PageSettings`, `Prefill`, `Utm` importés de `react-calendly` (pas redéfinis). Conforme à `.claude/rules/typescript/conventions.md`.
- **`useCalendlyEventListener` (de `react-calendly`)** : utilisé dans `CalendlyWidget.tsx` pour écouter `onEventScheduled`. Hook qui encapsule le `window.addEventListener('message', ...)` typé. Callback reçoit `{ data: { payload: { event: { uri }, invitee: { uri } } } }`. On ne loggue **que** `event.uri` (URL de l'event Calendly côté admin), jamais `invitee.uri` qui contient l'identité du visiteur (PII).
- **Server Action `trackCalendlyEvent`** : path `src/server/actions/calendly.ts`, `'use server'` + `import 'server-only'`. Signature `async function trackCalendlyEvent(input: { eventUri: string }): Promise<void>`. Pattern identique à `submitContact` (sub 03) : `randomUUID` pour `requestId`, `await headers()` puis `extractClientIp` + `hashIp`, `logger.child({ action: 'trackCalendlyEvent', requestId, ip_hash: ipHash })`, `log.info({ event: 'calendly:event_scheduled', event_uri: input.eventUri })`. Pas de Zod validation (un seul champ string non sensible, conversion `String()` côté client suffit), pas de rate limiting (Calendly bloque en amont, et le tracking est fire-and-forget). Conforme à `.claude/rules/nextjs/server-actions.md` et `.claude/rules/pino/logger.md`.
- **Helpers serveur partagés** : `extractClientIp(forwardedFor: string | null): string` et `hashIp(ip: string): string` extraits de `src/server/actions/contact.ts` (où ils étaient locaux) vers `src/lib/server-utils.ts` exporté avec `import 'server-only'` au top. `contact.ts` les importe via `@/lib/server-utils`. Constante `IP_HASH_LENGTH = 8` extraite avec eux pour cohérence. Refactor pur, pas de changement de comportement, tests Vitest existants de `contact.ts` doivent rester verts.
- **Params Calendly via `pageSettings` code** : `useCalendlyInline({ url, pageSettings: { hideEventTypeDetails: true, hideGdprBanner: true } })` dans `CalendlyWidget.tsx`. URL env reste pure (`https://calendly.com/<slug>/<event-type>` sans query string). Plus typé que les query params, centralisé dans le composant.
- **Hauteur fixe 750px** + `min-width: 320px` : valeurs officielles Calendly recommandées 2025+ pour `data-resize` auto-resize. Le `<div ref={containerRef} style={{ minWidth: 320, height: 750 }} />` remplace le précédent `min-h-[500px] flex-1` (qui étirait le widget dans le parent flex et cassait l'auto-resize).
- **Placeholder fallback inchangé** : si `url` vide → render le `<div className="...border-dashed bg-muted/40">` existant avec `<CalendarClock>` + `placeholderLabel` i18n. Pas de modification de la rule `.claude/rules/shadcn-ui/components.md` ni de `.claude/rules/tailwind/conventions.md`.
- **Conventions tests** : `tdd_scope: none`. Aucun test Vitest nouveau écrit dans ce sub. Le refactor de `contact.ts` (helpers extraits) doit laisser les tests existants verts. Validation manuelle Playwright via `mcp__playwright__browser_*` (4 scénarios documentés en Acceptance criteria).

## Acceptance criteria

### Scénario 1 : widget Calendly chargé avec params gratuits
**GIVEN** la var `NEXT_PUBLIC_CALENDLY_URL` contient une URL valide (ex: `https://calendly.com/<slug>/30min`) et le compte Calendly est en plan gratuit
**WHEN** un visiteur navigue sur `/fr/contact` puis clique sur l'onglet "Réservez un créneau"
**THEN** un iframe `https://calendly.com/<slug>/30min` est injecté dans le composant `CalendlyWidget`
**AND** l'iframe a une hauteur de 750px (recommandation officielle Calendly)
**AND** le bandeau cookies natif Calendly **n'est pas affiché** (grâce à `hideGdprBanner: true` dans `pageSettings`)
**AND** la section descriptive Calendly (titre event, durée, description, "30 min / Web conferencing details") **n'est pas affichée** (grâce à `hideEventTypeDetails: true`)
**AND** le calendrier mensuel est directement visible

### Scénario 2 : iframe conservée au switch d'onglets
**GIVEN** le widget Calendly est chargé sur l'onglet "Réservez un créneau"
**WHEN** le visiteur clique sur l'onglet "Écrivez-moi" puis revient sur l'onglet "Réservez un créneau"
**THEN** l'iframe Calendly est toujours présente et fonctionnelle (le calendrier reste utilisable)
**AND** aucun reload visible n'a lieu (pas de blanc transitoire, pas de re-fetch de l'iframe)
**AND** la session Calendly interne (créneau survolé, mois en cours d'affichage) est préservée

### Scénario 3 : placeholder fallback avec URL vide
**GIVEN** la var `NEXT_PUBLIC_CALENDLY_URL` est vide ou absente du fichier `.env`
**AND** le serveur dev a été redémarré (NEXT_PUBLIC_* est compile-time)
**WHEN** un visiteur navigue sur `/fr/contact` puis clique sur l'onglet "Réservez un créneau"
**THEN** le placeholder fallback est affiché (div avec bordure dashed)
**AND** l'icône Lucide `CalendarClock` est centrée verticalement
**AND** le label i18n `ContactPage.calendly.placeholder` ("Module de réservation bientôt disponible") est affiché sous l'icône
**AND** aucune iframe Calendly n'est créée dans le DOM

### Scénario 4 : log Pino sur réservation réelle
**GIVEN** le widget est chargé avec une URL Calendly valide
**WHEN** un visiteur réserve effectivement un créneau (parcours jusqu'au bout, événement Calendly `calendly.event_scheduled` émis via `postMessage` par l'iframe)
**THEN** le hook `useCalendlyEventListener` capte l'event côté client
**AND** la Server Action `trackCalendlyEvent({ eventUri: e.data.payload.event.uri })` est invoquée
**AND** un log Pino côté serveur est émis avec `level: info`, `event: 'calendly:event_scheduled'`, `event_uri: '<URL admin Calendly>'`, `ip_hash: '<8 hex chars>'`, `requestId: '<uuid>'`, `action: 'trackCalendlyEvent'`
**AND** le log NE contient PAS `invitee_uri`, `email`, `name`, ni aucune autre PII

### Scénario 5 : helpers serveur partagés (refactor non-régressif)
**GIVEN** les helpers `extractClientIp` et `hashIp` ont été déplacés de `src/server/actions/contact.ts` vers `src/lib/server-utils.ts`
**WHEN** la suite Vitest est exécutée (`pnpm test`)
**THEN** les 13 tests existants de `submitContact` (`src/server/actions/contact.test.ts`) restent tous verts
**AND** les imports `from './contact'` des tests fonctionnent toujours (signature publique inchangée)
**AND** `pnpm typecheck` et `pnpm lint` passent sans erreur

## Edge cases

- **Compte Calendly Pro vs free** : si l'utilisateur upgrade vers Pro plus tard, les params Pro (`primaryColor`, `textColor`, `backgroundColor`, `buttonText`) peuvent être ajoutés à `pageSettings` dans `CalendlyWidget.tsx` sans toucher au hook (le hook propage `pageSettings` tel quel à `initInlineWidget`). Pas d'action nécessaire dans ce sub.
- **HMR Turbopack en dev** : le `replaceChildren()` avant init prévient la double iframe quand un fichier source change et que React re-render le composant sans full reload. Acceptable en dev, invisible en prod.
- **StrictMode React 19** : double-invoke des effets en dev. Le pattern callback ref + `replaceChildren()` est idempotent, le second appel ne crée pas d'iframe supplémentaire.
- **Multiple instances** : si plusieurs `CalendlyWidget` montés simultanément (ex: page mosaïque future), la Promise singleton garantit un seul script chargé, et chaque instance a son propre `containerRef` indépendant.
- **Réservation rapide après mount** : si l'utilisateur réserve avant que le hook `useCalendlyEventListener` soit attaché (timing très court), l'event peut être manqué. Acceptable : le booking est confirmé côté Calendly de toute façon, le tracking Pino est best-effort pour analytics.
- **Cleanup interrompu** : si le composant unmount alors que `loadCalendlyScript()` est en cours, un flag `cancelled` boolean dans le hook empêche `initInlineWidget` de s'exécuter sur un node détaché.
- **`window.Calendly` indisponible (script bloqué par adblocker)** : la Promise rejette ou ne résout jamais. Le widget reste vide. Acceptable pour MVP : aucun message d'erreur affiché à l'utilisateur (le widget vide est un signal suffisant que ça ne marche pas — adblocker = problème côté user).

## Architectural decisions

### Décision : custom hook `useCalendlyInline` vs `<InlineWidget>` pur de `react-calendly`

**Options envisagées :**
- **A. `<InlineWidget>` pur** : remplacer `CalendlyWidget` par `<InlineWidget url={url} pageSettings={...} styles={{ height: 750 }} />`. ~5 lignes de code, plus simple, lib bien typée.
- **B. Custom hook `useCalendlyInline` + `Calendly.initInlineWidget()` manuel** : utiliser `react-calendly` pour les types et `useCalendlyEventListener`, mais piloter l'init iframe manuellement via callback ref + Promise singleton script. ~80 lignes au total (50 hook + 30 composant).

**Choix : B**

**Rationale :**
- Le bug de remount Radix Tabs (iframe disparaît au retour sur l'onglet Calendly) a été observé en live sur ce projet. `<InlineWidget>` de `react-calendly` utilise en interne le même pattern autoscan (`<div className="calendly-inline-widget" data-url={url}>`) que le composant actuel et **ne résout pas ce bug** car `widget.js` ne re-scanne pas le DOM au remount.
- L'option A serait suffisante uniquement si le widget vivait sur une page dédiée sans Tabs / sans conditional rendering. Ce n'est pas notre cas (Tabs `Écrivez-moi` / `Réservez un créneau` shadcn).
- Le pattern callback ref de l'option B garantit que `initInlineWidget()` est rappelé à chaque attach DOM, ce qui résout définitivement le bug de remount sans dépendre de `forceMount` Radix Tabs (qui casse le widget si le parent est `display:none` au mount initial — déjà testé et constaté donnant 0px).
- Le coût en lignes (+75 lignes) est acceptable vu la complexité du bug à fixer et la robustesse gagnée (HMR Turbopack, StrictMode, multi-instance, navigation client-side).
- Source : recherches multi-agents communauté 2026 (issues `tcampb/react-calendly` #74 #102, Calendly community thread "Inline embed on SPA - second display dead").

### Décision : tracking event_scheduled via Server Action Pino vs client-only console.info vs skip

**Options envisagées :**
- **A. Pas de tracking pour MVP** : Umami sera installé post-MVP (ADR-007 acté), il fera le job. ~0 ligne ajoutée. YAGNI strict.
- **B. Log client-only** : `useCalendlyEventListener({ onEventScheduled: (e) => console.info(...) })` ou `logger.info()` côté browser. ~5 lignes. Visible DevTools, pas en logs serveur.
- **C. Server Action `trackCalendlyEvent` + log Pino structuré** : POST client → handler serveur → `logger.child({...}).info({ event: 'calendly:event_scheduled' })`. ~30 lignes. Cohérent avec le pattern `submitContact` (sub 03 : log Pino côté serveur pour chaque event email).

**Choix : C**

**Rationale :**
- **Cohérence avec sub 03** : le formulaire de contact logue tous ses events (`email:sent`, `honeypot:caught`, `rate_limit:exceeded`, `email:failed`) côté serveur via Pino. Faire pareil pour Calendly garde la traçabilité serveur uniforme entre les 2 canaux de prise de contact.
- **YAGNI MVP affiné** : le coût de C (~30 lignes) est mineur vu qu'on factorise déjà les helpers `extractClientIp` + `hashIp`. Pas de Zod validation ni rate limiting (1 champ, fire-and-forget).
- **Umami post-MVP redondant ?** : Umami fournira ses propres events `goal/conversion` côté front, mais Pino serveur reste utile en complément pour debug, audit RGPD, et corrélation avec les autres logs serveur (ex: spike de bookings vs erreurs SMTP du même créneau).
- L'option B est moins valable car les logs client ne sont pas centralisés ni persistés (DevTools jetables).
- L'option A (skip) prive le projet d'un signal serveur utile pour 30 lignes de plus.

### Décision : params Calendly dans `pageSettings` code vs URL env query string

**Options envisagées :**
- **A. Params dans le code** : `useCalendlyInline({ url, pageSettings: { hideEventTypeDetails: true, hideGdprBanner: true } })`. URL env reste nue (`https://calendly.com/<slug>/<event-type>`).
- **B. Params dans l'URL env** : `NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/<slug>/<event-type>?hide_event_type_details=1&hide_gdpr_banner=1`. Code plus simple mais URL env longue et fragile (typo facile, params noyés dans la chaîne).

**Choix : A**

**Rationale :**
- **Typage** : `pageSettings: PageSettings` est typé via `react-calendly`. Erreur TypeScript si on tape une option invalide. URL env est juste une string non vérifiée.
- **Centralisation** : les params concernent le rendu UI (cohérent qu'ils soient dans le composant). L'URL env reste sémantiquement "où Calendly est hébergé", pas "comment on configure le rendu".
- **Pas de besoin de différenciation par environnement** : on n'imagine pas de cas où le rendu Calendly devrait différer entre dev / staging / prod (les params sont visuels purs, pas opérationnels).
- L'option B serait pertinente si l'utilisateur voulait masquer/afficher des éléments Calendly dynamiquement par déploiement. YAGNI.

### Décision : factoriser `extractClientIp` + `hashIp` vs dupliquer dans `calendly.ts`

**Options envisagées :**
- **A. Extraire dans `src/lib/server-utils.ts`** : helpers `extractClientIp`, `hashIp`, constante `IP_HASH_LENGTH` exposés depuis un module partagé avec `import 'server-only'`. `contact.ts` et `calendly.ts` importent depuis `@/lib/server-utils`. Mini-refactor de `contact.ts` (3 lignes ajoutées en imports, 10 lignes supprimées localement).
- **B. Dupliquer dans `calendly.ts`** : recopier les ~10 lignes de helpers depuis `contact.ts`. Pas de modif de `contact.ts`. Dette tech (2 implémentations à maintenir en parallèle).

**Choix : A**

**Rationale :**
- **DRY pragmatique** : 2 callers identifiés (`contact.ts` + `calendly.ts`), pas de premature abstraction. Le seuil de 2 callers identiques justifie la factorisation.
- **Cohérence des hashes** : si plusieurs Server Actions doivent corréler un même `ip_hash` (ex: rate limit cross-actions futures), l'avoir dans un seul module garantit l'algorithme identique.
- **Tests existants verts** : `contact.test.ts` mock `next/headers`, l'import indirect via `server-utils.ts` ne change pas les chemins testés.
- **Coût** : 1 nouveau fichier (`server-utils.ts`, ~15 lignes), 1 modification mineure de `contact.ts` (imports + suppression locale). Acceptable.
- L'option B serait pertinente si on craignait l'instabilité du module partagé (rare pour des helpers purs).
