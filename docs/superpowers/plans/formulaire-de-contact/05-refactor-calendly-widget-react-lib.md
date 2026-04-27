# Sub 05 — Refactor CalendlyWidget : lib `react-calendly` + custom hook `useCalendlyInline` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrer le composant `CalendlyWidget.tsx` du pattern autoscan natif vers une intégration pilotée par un custom hook `useCalendlyInline` qui appelle manuellement `window.Calendly.initInlineWidget()`, ajouter la lib `react-calendly` (types + `useCalendlyEventListener`) et une Server Action minimale `trackCalendlyEvent` qui logue les bookings via Pino, factoriser les helpers serveur partagés.

**Architecture:** Hook React 19 avec callback ref + Promise singleton script + `replaceChildren()` cleanup pour fixer le bug de remount Radix Tabs (déjà observé en live). Server Action `trackCalendlyEvent` reproduit le pattern Pino du sub 03 (`submitContact`). Helpers `extractClientIp` + `hashIp` extraits dans `src/lib/server-utils.ts` pour DRY entre `contact.ts` et `calendly.ts`. Inline embed only, params Calendly free (`hideEventTypeDetails`, `hideGdprBanner`) appliqués via `pageSettings` côté code.

**Tech Stack:** Next.js 16 App Router + TypeScript 6 strict + React 19 + `react-calendly@^4.4.0` + Pino (existant) + pnpm. Pas de tests Vitest (`tdd_scope: none`, plumbing lib React/Calendly + iframe cross-origin).

**Spec source:** `docs/superpowers/specs/formulaire-de-contact/05-refactor-calendly-widget-react-lib-design.md`

**Gating de qualité:** pas de TDD. Validation par `pnpm typecheck` + `pnpm lint` + `pnpm test` (suite existante doit rester verte après le refactor `contact.ts`) + 4 scénarios Playwright manuels.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `package.json` | Modify | Ajout dependency `react-calendly@^4.4.0` |
| `pnpm-lock.yaml` | Modify (auto) | Regénéré par `pnpm add` |
| `src/lib/server-utils.ts` | Create | Helpers `extractClientIp` + `hashIp` + constante `IP_HASH_LENGTH` extraits de `contact.ts` (factor pour réutilisation dans `calendly.ts`) |
| `src/server/actions/contact.ts` | Modify | Import `extractClientIp` + `hashIp` depuis `@/lib/server-utils` au lieu de définir localement (refactor non-régressif) |
| `src/server/actions/calendly.ts` | Create | Server Action `trackCalendlyEvent({ eventUri })` + log Pino structuré, pattern identique à `submitContact` |
| `src/hooks/use-calendly-inline.ts` | Create | Custom hook avec Promise singleton script, callback ref, `replaceChildren()` cleanup |
| `src/components/features/contact/CalendlyWidget.tsx` | Modify | Refactor : consomme `useCalendlyInline` + `useCalendlyEventListener`, supprime `<Script>` + autoscan div, conserve placeholder fallback et props |

Aucun autre fichier touché. Pas de modif `page.tsx`, pas de modif tests Vitest existants (`contact.test.ts` doit rester valide après le refactor d'imports).

---

## Task 1: Installer la dépendance `react-calendly`

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml` (auto)

- [ ] **Step 1.1: Installer `react-calendly`**

Run: `pnpm add react-calendly@^4.4.0`

Expected: `package.json` mis à jour avec `"react-calendly": "^4.4.0"` dans `dependencies`. Pas de warning `peer deps unmet` (peer deps `react >= 16.8.0`, React 19 OK). Version cohérente avec `docs/VERSIONS.md` ligne 20 (déjà documentée).

- [ ] **Step 1.2: Vérifier l'installation**

Run: `pnpm list react-calendly`

Expected: ligne `react-calendly 4.4.x`.

---

## Task 2: Créer `src/lib/server-utils.ts` (extract helpers serveur)

**Files:**
- Create: `src/lib/server-utils.ts`

- [ ] **Step 2.1: Créer le fichier avec les helpers extraits**

Chemin : `D:/Desktop/thibaud-geisler-portfolio/src/lib/server-utils.ts`

```typescript
import 'server-only'
import { createHash } from 'node:crypto'

const IP_HASH_LENGTH = 8

export function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown'
  const first = forwardedFor.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, IP_HASH_LENGTH)
}
```

**Notes pour le worker** :
- `import 'server-only'` au top : empêche tout import accidentel depuis un Client Component (le module n'a aucun sens côté navigateur).
- `IP_HASH_LENGTH = 8` constante locale au module (pas exportée), valeur identique à celle de `contact.ts` actuel.
- Le TODO comment sur le bucket "unknown" qui était dans `contact.ts` est volontairement omis ici. La sémantique reste la même côté caller.

- [ ] **Step 2.2: Vérifier le typecheck**

Run: `pnpm typecheck`

Expected: pas d'erreur. Le module compile, `import 'server-only'` est bien résolu (déjà installé via sub 03).

---

## Task 3: Refactor `src/server/actions/contact.ts` (import depuis `server-utils`)

**Files:**
- Modify: `src/server/actions/contact.ts`

- [ ] **Step 3.1: Lire le fichier actuel pour identifier les helpers locaux à supprimer**

Run: `cat src/server/actions/contact.ts | grep -n "extractClientIp\|hashIp\|IP_HASH_LENGTH"`

Expected: occurrences de définition locale (function `extractClientIp`, function `hashIp`, constante `IP_HASH_LENGTH`) ainsi que les usages dans `submitContact`.

- [ ] **Step 3.2: Modifier les imports en haut du fichier**

Localiser le bloc d'imports existant et **ajouter** l'import depuis `@/lib/server-utils` (juste après les autres imports `@/lib/...`) :

```typescript
import { extractClientIp, hashIp } from '@/lib/server-utils'
```

L'ordre d'import à respecter : node modules d'abord, puis `@/lib/...`, puis `@/server/...`, puis types relatifs. Cohérent avec la convention déjà utilisée dans le fichier.

- [ ] **Step 3.3: Supprimer les définitions locales `extractClientIp`, `hashIp`, `IP_HASH_LENGTH`**

Repérer dans `src/server/actions/contact.ts` les 3 blocs suivants et les **supprimer intégralement** :

```typescript
const IP_HASH_LENGTH = 8
```

```typescript
// TODO: bucket partagé pour requêtes sans x-forwarded-for, à raffiner si threat model évolue (proxy/CDN abuse).
function extractClientIp(forwardedFor: string | null): string {
  if (!forwardedFor) return 'unknown'
  const first = forwardedFor.split(',')[0]?.trim()
  return first && first.length > 0 ? first : 'unknown'
}
```

```typescript
function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, IP_HASH_LENGTH)
}
```

Les usages dans `submitContact` (`extractClientIp(headersList.get('x-forwarded-for'))`, `hashIp(ip)`) **ne changent pas** : les fonctions sont maintenant importées au lieu d'être locales.

- [ ] **Step 3.4: Nettoyer l'import `createHash` si plus utilisé localement**

Vérifier dans `src/server/actions/contact.ts` si `createHash` (de `node:crypto`) est encore utilisé après suppression de `hashIp` local.

Si **non utilisé ailleurs** dans le fichier (cas attendu), modifier la ligne d'import :

Avant :
```typescript
import { createHash, randomUUID } from 'node:crypto'
```

Après :
```typescript
import { randomUUID } from 'node:crypto'
```

- [ ] **Step 3.5: Vérifier que le fichier compile**

Run: `pnpm typecheck`

Expected: pas d'erreur. `extractClientIp` et `hashIp` sont maintenant résolus depuis `@/lib/server-utils`.

---

## Task 4: Vérifier la non-régression des tests Vitest

**Files:** aucun (commande de vérification uniquement)

- [ ] **Step 4.1: Lancer la suite Vitest complète**

Run: `pnpm test`

Expected: **113/113 tests passent** (12 fichiers, suite complète projet incluant `contact.test.ts` avec 15 tests). Aucun test ne doit fail.

Si un test échoue dans `contact.test.ts`, c'est probablement parce que :
- Un mock `vi.mock()` ciblait l'ancien chemin local de `extractClientIp` ou `hashIp` (peu probable, ces fonctions n'étaient pas mockées)
- Un type qui dépendait des helpers a changé

Investiguer le diff `git diff src/server/actions/contact.ts` et corriger.

- [ ] **Step 4.2: Lint**

Run: `pnpm lint`

Expected: pas d'erreur ni warning bloquant.

---

## Task 5: Créer `src/server/actions/calendly.ts` (Server Action `trackCalendlyEvent`)

**Files:**
- Create: `src/server/actions/calendly.ts`

- [ ] **Step 5.1: Créer le fichier avec la Server Action**

Chemin : `D:/Desktop/thibaud-geisler-portfolio/src/server/actions/calendly.ts`

```typescript
'use server'

import 'server-only'
import { randomUUID } from 'node:crypto'
import { headers } from 'next/headers'

import { logger } from '@/lib/logger'
import { extractClientIp, hashIp } from '@/lib/server-utils'

export async function trackCalendlyEvent(input: { eventUri: string }): Promise<void> {
  const requestId = randomUUID()
  const headersList = await headers()
  const ip = extractClientIp(headersList.get('x-forwarded-for'))
  const ipHash = hashIp(ip)
  const log = logger.child({ action: 'trackCalendlyEvent', requestId, ip_hash: ipHash })

  log.info({ event: 'calendly:event_scheduled', event_uri: input.eventUri })
}
```

**Notes pour le worker** :
- `'use server'` au top : Server Action exposée pour appel depuis le client.
- `import 'server-only'` : ceinture supplémentaire (le code n'a aucun sens côté browser).
- Pattern child logger Pino identique à `submitContact` (sub 03) : `action`, `requestId`, `ip_hash` en bindings.
- Aucune validation Zod : un seul champ `eventUri` (string), conversion `String()` côté client suffit. La rule `.claude/rules/zod/validation.md` recommande Zod pour les **endpoints publics avec input riche** ; ici l'action est interne (appelée depuis notre propre client) et le champ est un simple identifiant URL.
- Aucun rate limiting : Calendly bloque déjà les bookings excessifs en amont, et le tracking est fire-and-forget (pas de risque DDoS via cette action).
- **Pas** de logging de `invitee_uri` ou de toute autre donnée du visiteur (PII). Conforme à la rule `.claude/rules/pino/logger.md`.

- [ ] **Step 5.2: Vérifier le typecheck**

Run: `pnpm typecheck`

Expected: pas d'erreur. Imports `@/lib/logger`, `@/lib/server-utils`, `next/headers`, `node:crypto` tous résolus.

- [ ] **Step 5.3: Vérifier le lint**

Run: `pnpm lint`

Expected: pas d'erreur ni warning bloquant.

---

## Task 6: Créer `src/hooks/use-calendly-inline.ts` (custom hook)

**Files:**
- Create: `src/hooks/use-calendly-inline.ts`

- [ ] **Step 6.1: Créer le fichier avec le hook complet**

Chemin : `D:/Desktop/thibaud-geisler-portfolio/src/hooks/use-calendly-inline.ts`

```typescript
'use client'

import { useCallback, useEffect, useRef } from 'react'
import type { PageSettings, Prefill, Utm } from 'react-calendly'

const CALENDLY_SCRIPT_SRC = 'https://assets.calendly.com/assets/external/widget.js'

type CalendlyGlobal = {
  initInlineWidget: (opts: {
    url: string
    parentElement: HTMLElement
    pageSettings?: PageSettings
    prefill?: Prefill
    utm?: Utm
  }) => void
}

declare global {
  interface Window {
    Calendly?: CalendlyGlobal
  }
}

let scriptPromise: Promise<CalendlyGlobal> | null = null

function loadCalendlyScript(): Promise<CalendlyGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Calendly: window unavailable (SSR)'))
  }
  if (window.Calendly) return Promise.resolve(window.Calendly)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${CALENDLY_SCRIPT_SRC}"]`,
    )
    const script = existing ?? document.createElement('script')
    if (!existing) {
      script.src = CALENDLY_SCRIPT_SRC
      script.async = true
      document.head.appendChild(script)
    }
    const onLoad = () => {
      if (window.Calendly) resolve(window.Calendly)
      else reject(new Error('Calendly: global missing after load'))
    }
    if (window.Calendly) onLoad()
    else {
      script.addEventListener('load', onLoad, { once: true })
      script.addEventListener(
        'error',
        () => reject(new Error('Calendly: script load failed')),
        { once: true },
      )
    }
  })

  return scriptPromise
}

type UseCalendlyInlineOptions = {
  url: string
  pageSettings?: PageSettings
  prefill?: Prefill
  utm?: Utm
}

export function useCalendlyInline({ url, pageSettings, prefill, utm }: UseCalendlyInlineOptions) {
  const nodeRef = useRef<HTMLDivElement | null>(null)
  const cancelledRef = useRef(false)

  const init = useCallback(
    (node: HTMLDivElement) => {
      cancelledRef.current = false
      node.replaceChildren()
      loadCalendlyScript()
        .then((calendly) => {
          if (cancelledRef.current || !node.isConnected) return
          if (node.children.length > 0) return
          calendly.initInlineWidget({ url, parentElement: node, pageSettings, prefill, utm })
        })
        .catch((err) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[useCalendlyInline]', err)
          }
        })
    },
    [url, pageSettings, prefill, utm],
  )

  const containerRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        nodeRef.current = node
        init(node)
      } else if (nodeRef.current) {
        cancelledRef.current = true
        nodeRef.current.replaceChildren()
        nodeRef.current = null
      }
    },
    [init],
  )

  useEffect(() => {
    return () => {
      cancelledRef.current = true
      nodeRef.current?.replaceChildren()
    }
  }, [])

  return { containerRef }
}
```

**Notes pour le worker** :
- `'use client'` obligatoire : utilise `window`, `useCallback`, `useEffect`, `useRef`.
- `scriptPromise` au scope module (singleton) : 1 seul script chargé même si plusieurs widgets montés simultanément.
- `containerRef` est une **callback ref** (pas un `useRef + useEffect`). React rappelle la fonction à chaque attach/detach DOM → re-init automatique au remount Radix Tabs.
- `node.replaceChildren()` avant chaque `initInlineWidget` : évite la double iframe en HMR Turbopack et StrictMode React 19 double-invoke.
- `cancelledRef` boolean : si la Promise du script résout après que le composant a unmount, on ignore l'init (évite d'injecter une iframe dans un node détaché).
- `process.env.NODE_ENV !== 'production'` pour le log d'erreur : visibilité en dev, silence en prod (pas de bruit pour les users avec adblocker).
- Types `PageSettings`, `Prefill`, `Utm` importés de `react-calendly` (pas redéfinis manuellement).

- [ ] **Step 6.2: Vérifier le typecheck**

Run: `pnpm typecheck`

Expected: pas d'erreur. Le `declare global { interface Window { Calendly?: ... } }` enrichit le type global `Window` correctement.

- [ ] **Step 6.3: Vérifier le lint**

Run: `pnpm lint`

Expected: pas d'erreur. Note : `react-hooks/exhaustive-deps` peut warner sur `init` dans le useCallback de `containerRef`. C'est attendu et géré par le `[init]` qui est lui-même mémoïsé sur ses propres deps.

---

## Task 7: Refactor `src/components/features/contact/CalendlyWidget.tsx`

**Files:**
- Modify: `src/components/features/contact/CalendlyWidget.tsx`

- [ ] **Step 7.1: Réécrire intégralement le fichier**

Chemin : `D:/Desktop/thibaud-geisler-portfolio/src/components/features/contact/CalendlyWidget.tsx`

```typescript
'use client'

import { CalendarClock } from 'lucide-react'
import { useCalendlyEventListener } from 'react-calendly'

import { useCalendlyInline } from '@/hooks/use-calendly-inline'
import { cn } from '@/lib/utils'
import { trackCalendlyEvent } from '@/server/actions/calendly'

type Props = {
  url: string
  placeholderLabel: string
  className?: string
}

export function CalendlyWidget({ url, placeholderLabel, className }: Props) {
  const { containerRef } = useCalendlyInline({
    url,
    pageSettings: {
      hideEventTypeDetails: true,
      hideGdprBanner: true,
    },
  })

  useCalendlyEventListener({
    onEventScheduled: (e) => {
      void trackCalendlyEvent({ eventUri: String(e.data.payload.event.uri) })
    },
  })

  if (!url) {
    return (
      <div
        className={cn(
          'flex min-h-[500px] w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground',
          className,
        )}
      >
        <CalendarClock className="size-10" aria-hidden />
        <p className="text-sm font-medium">{placeholderLabel}</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{ minWidth: 320, height: 750 }}
      className={cn('w-full', className)}
    />
  )
}
```

**Notes pour le worker** :
- **Suppression** de l'import `Script` de `next/script` (le hook gère le chargement via Promise singleton).
- **Suppression** du `<div className="calendly-inline-widget" data-url={url} data-resize="true" />` (remplacé par `<div ref={containerRef} ...>`).
- **Conservation** du placeholder fallback **strictement à l'identique** (icône `CalendarClock`, label i18n, classes Tailwind, structure JSX).
- **Conservation** des props `url`, `placeholderLabel`, `className` (le composant garde son contrat avec `page.tsx`, aucune modification consommateur).
- `pageSettings: { hideEventTypeDetails: true, hideGdprBanner: true }` : 2 params Calendly free pour rendu compact + masquage bandeau cookies natif.
- `useCalendlyEventListener` (hook de `react-calendly`) : encapsule le `window.addEventListener('message', ...)`. La callback `onEventScheduled` reçoit `e.data.payload.event.uri` (URL admin Calendly) et `e.data.payload.invitee.uri` (URL invitee, **non logué côté serveur**, PII).
- `void trackCalendlyEvent({...})` : fire-and-forget. Pas de `await`, on n'attend pas le retour serveur (le UX du visiteur ne dépend pas du log).
- `String(e.data.payload.event.uri)` : conversion défensive au cas où le type de `react-calendly` serait `unknown` ou `string | undefined`.
- `style={{ minWidth: 320, height: 750 }}` : valeurs officielles Calendly (recommandation 2025+), passées en `style` inline car ce sont des **valeurs littérales recommandées par la doc lib externe** (pas du theming projet). Les classes Tailwind du `className` (passé en prop) restent valides pour layout/spacing parent.

- [ ] **Step 7.2: Vérifier le typecheck**

Run: `pnpm typecheck`

Expected: pas d'erreur. `useCalendlyEventListener` a une signature typée par `react-calendly`, `e.data.payload.event.uri` accessible.

- [ ] **Step 7.3: Vérifier le lint**

Run: `pnpm lint`

Expected: pas d'erreur ni warning bloquant.

---

## Task 8: Vérifications qualité globales

**Files:** aucun (commandes uniquement)

- [ ] **Step 8.1: Suite complète de tests Vitest**

Run: `pnpm test`

Expected: **113/113 tests passent** (aucune régression). En particulier :
- `src/server/actions/contact.test.ts` : 15 tests verts (le refactor d'imports n'affecte pas le comportement testé)
- Aucun test n'est ajouté pour `useCalendlyInline`, `trackCalendlyEvent`, ou `CalendlyWidget` (`tdd_scope: none`)

- [ ] **Step 8.2: Typecheck global**

Run: `pnpm typecheck`

Expected: exit 0, pas d'erreur.

- [ ] **Step 8.3: Lint global**

Run: `pnpm lint`

Expected: exit 0, pas d'erreur ni warning bloquant.

- [ ] **Step 8.4: `git status` pour valider le périmètre des modifications**

Run: `git status --porcelain`

Expected: 7 fichiers modifiés ou créés :
- `M  package.json`
- `M  pnpm-lock.yaml`
- `??  src/lib/server-utils.ts`
- `M  src/server/actions/contact.ts`
- `??  src/server/actions/calendly.ts`
- `??  src/hooks/use-calendly-inline.ts`
- `M  src/components/features/contact/CalendlyWidget.tsx`

Aucun autre fichier ne doit apparaître. Si oui, investiguer (probablement un fichier touché par accident).

---

## Task 9: Validation manuelle Playwright (4 scénarios)

**Files:** aucun (validation runtime via le MCP `mcp__playwright__browser_*`)

**Prérequis** :
- `.env` (ou `.env.local`) configuré avec `NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/<slug>/<event-type>` (URL nue, sans query string)
- Dev server lancé : `just dev` (port 3000)

- [ ] **Step 9.1: Scénario 1 — widget Calendly chargé avec params gratuits**

1. `mcp__playwright__browser_navigate` → `http://localhost:3000/fr/contact`
2. `mcp__playwright__browser_click` sur l'onglet "Réservez un créneau"
3. Attendre 3 secondes (`mcp__playwright__browser_wait_for { time: 3 }`)
4. `mcp__playwright__browser_evaluate` :
   ```javascript
   () => {
     const widget = document.querySelector('[ref] iframe, .calendly-inline-widget iframe, div[ref] iframe')
     // fallback : le wrapper a un ref callback, on cherche par parent
     const iframe = document.querySelector('iframe[src*="calendly.com"]')
     return {
       iframeExists: !!iframe,
       iframeSrc: iframe?.src,
       iframeHeight: iframe ? Math.round(iframe.getBoundingClientRect().height) : null,
     }
   }
   ```
5. Expected :
   - `iframeExists: true`
   - `iframeSrc` contient `embed_domain=localhost%3A3000` ET `embed_type=Inline` ET `hide_event_type_details=1` ET `hide_gdpr_banner=1`
   - `iframeHeight ≈ 750` (peut être plus si auto-resize a déjà fait grandir l'iframe)

- [ ] **Step 9.2: Scénario 2 — iframe conservée au switch d'onglets**

1. Depuis l'onglet Calendly chargé (état Step 9.1)
2. `mcp__playwright__browser_click` sur l'onglet "Écrivez-moi"
3. `mcp__playwright__browser_wait_for { time: 1 }`
4. `mcp__playwright__browser_click` sur l'onglet "Réservez un créneau"
5. `mcp__playwright__browser_wait_for { time: 2 }`
6. Re-mesurer l'iframe avec le même `mcp__playwright__browser_evaluate` que Step 9.1
7. Expected : `iframeExists: true`, l'iframe est immédiatement présente sans phase de blanc transitoire (test du fix de remount)

- [ ] **Step 9.3: Scénario 3 — placeholder fallback avec URL vide**

1. Modifier temporairement `.env` (ou `.env.local`) : commenter `NEXT_PUBLIC_CALENDLY_URL=...` ou la mettre à vide
2. `just stop && just dev` (restart obligatoire car `NEXT_PUBLIC_*` est compile-time)
3. `mcp__playwright__browser_navigate` → `http://localhost:3000/fr/contact`
4. `mcp__playwright__browser_click` sur l'onglet "Réservez un créneau"
5. `mcp__playwright__browser_evaluate` :
   ```javascript
   () => {
     const placeholder = document.querySelector('[class*="border-dashed"]')
     const icon = placeholder?.querySelector('svg')
     const text = placeholder?.querySelector('p')?.textContent
     const noIframe = !document.querySelector('iframe[src*="calendly.com"]')
     return { placeholderVisible: !!placeholder, iconVisible: !!icon, text, noIframe }
   }
   ```
6. Expected :
   - `placeholderVisible: true`
   - `iconVisible: true` (icône `CalendarClock` Lucide)
   - `text` contient le label i18n (en FR : "Module de réservation bientôt disponible" ou équivalent depuis `messages/fr.json` clé `ContactPage.calendly.placeholder`)
   - `noIframe: true`
7. **Restaurer** la valeur de `NEXT_PUBLIC_CALENDLY_URL` dans `.env` après ce test, et restart `just dev`

- [ ] **Step 9.4: Scénario 4 — log Pino sur réservation réelle**

⚠️ Ce scénario nécessite une vraie réservation, donc un calendrier Calendly disponible et une boîte mail accessible. À faire **une seule fois** pour valider le pipeline.

1. Démarrer le dev server avec output visible (terminal) : `just dev` (pas en background, ou suivre le fichier de log si en background)
2. `mcp__playwright__browser_navigate` → `http://localhost:3000/fr/contact`
3. Cliquer onglet Calendly
4. Réserver un créneau (sélectionner date + heure → remplir nom/email → confirmer)
5. Surveiller la sortie du dev server (ou `tail -f` le fichier de log si dispo)
6. Expected : un log Pino apparaît au format JSON avec :
   ```json
   {
     "level": 30,
     "time": "...",
     "service": "thibaud-geisler-portfolio",
     "action": "trackCalendlyEvent",
     "requestId": "<uuid v4>",
     "ip_hash": "<8 hex chars>",
     "event": "calendly:event_scheduled",
     "event_uri": "https://api.calendly.com/scheduled_events/<uuid>",
     "msg": ""
   }
   ```
7. Vérifier que le log NE contient PAS `invitee_uri`, ni email/nom/prénom du visiteur (PII)
8. **Annuler la réservation** côté Calendly admin pour ne pas polluer ton agenda

---

## Task 10: Signal de complétion (pas de commit automatique)

- [ ] **Step 10.1: Vérifier `git status`**

Run: `git status`

Expected: 7 fichiers modifiés/créés (cf. Step 8.4). Aucun fichier `scripts/` jetable, aucun artefact Playwright.

- [ ] **Step 10.2: Annoncer la fin du sub-project**

Le sub-project 5 (`refactor-calendly-widget-react-lib`) est implémenté. **NE PAS committer automatiquement** : règle utilisateur stricte. Reporter au workflow parent (`/implement-subproject formulaire-de-contact 05`) qui :
1. Lance les quality gates (`code/code-reviewer`)
2. Demande au user le périmètre exact du commit
3. Met à jour le frontmatter du spec (`status: implemented`) au moment du commit

Message attendu pour le user :

```
✅ Sub-project 5/5 (refactor-calendly-widget-react-lib) implémenté.
- react-calendly@^4.4.0 installé
- src/lib/server-utils.ts créé (helpers extractClientIp + hashIp factorisés)
- src/server/actions/contact.ts refactoré (import depuis server-utils, tests existants 15/15 verts)
- src/server/actions/calendly.ts créé (Server Action trackCalendlyEvent + log Pino)
- src/hooks/use-calendly-inline.ts créé (custom hook avec Promise singleton + callback ref + replaceChildren cleanup)
- src/components/features/contact/CalendlyWidget.tsx refactoré (consomme le hook + useCalendlyEventListener + appelle trackCalendlyEvent)
- typecheck / lint : verts
- 113/113 tests Vitest verts (aucune régression)
- Validation Playwright manuelle : 4 scénarios passés (widget chargé / switch tabs sans bug / placeholder fallback / log Pino sur booking)

🎉 Feature 4 — Formulaire de contact COMPLÈTE post-MVP : 5/5 sub-projects implémentés (4 MVP + 1 amélioration Calendly).

Prêt à commit sur feature/formulaire-de-contact, attends ton go.
```

---

## Self-review checklist

- [x] **Spec coverage** : tous les acceptance criteria du spec sont couverts par les tasks
  - Scénario 1 (widget chargé avec params gratuits) → Task 9.1
  - Scénario 2 (iframe conservée au switch) → Task 9.2
  - Scénario 3 (placeholder fallback) → Task 9.3
  - Scénario 4 (log Pino sur booking) → Task 9.4
  - Scénario 5 (refactor non-régressif tests) → Task 4 + Task 8.1
- [x] **Pas de placeholder** : tout le code est complet, commandes exactes (`pnpm add`, `pnpm typecheck`, `pnpm lint`, `pnpm test`)
- [x] **Type consistency** : `useCalendlyInline`, `trackCalendlyEvent`, `extractClientIp`, `hashIp`, `CalendlyGlobal`, `PageSettings` tous nommés identiquement entre tasks et alignés avec le spec
- [x] **Anti-patterns explicites** : pas de `<Script>` Next.js dans `CalendlyWidget` (Step 7.1), pas de `<div className="calendly-inline-widget" data-url=...>` autoscan (Step 7.1), pas de Zod validation dans `trackCalendlyEvent` (justifié Step 5.1), pas de logging `invitee_uri` (vérifié Step 9.4)
- [x] **Pas de commit automatique** : Task 10 reporte au workflow parent, message d'attente explicite

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/formulaire-de-contact/05-refactor-calendly-widget-react-lib.md`. Ce plan complète la Feature 4 — Formulaire de contact (sub 5/5, amélioration post-MVP du widget Calendly hérité du sub 04 layout).

L'exécution sera lancée plus tard via `/implement-subproject formulaire-de-contact 05`, qui orchestrera `superpowers:subagent-driven-development` (Tasks 1-8) + validation Playwright manuelle (Task 9) + demande de commit explicite (Task 10).

Pour l'instant, le sub 05 reste en `status: draft` dans le frontmatter du spec. Pas de modification du `status` jusqu'à l'implémentation effective.
