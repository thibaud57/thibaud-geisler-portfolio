# Gating Calendly marketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conditionner le rendu du iframe Calendly au consentement marketing du sub 3 via `useConsentManager().has({ category: 'marketing' })`, avec un placeholder gated CTA qui ouvre la modale `ConsentDialog` c15t pour activer Calendly sans recharger la page.

**Architecture:** Modification chirurgicale de `CalendlyWidget.tsx` (ajout d'une 3e branche conditionnelle en tête du return : si `useConsentManager().has({ category: 'marketing' }) === false`, render un placeholder gated avec icône Cookie + label i18n + bouton CTA `<OpenCookiePreferencesButton>` réutilisé du sub 4 avec sa prop `label?` déjà exposée). Re-render automatique via le store c15t (`useConsentManager()` est réactif) quand l'utilisateur accepte.

**Tech Stack:** Next.js 16, React 19, TypeScript 6 strict, Tailwind 4, shadcn/ui (Button), lucide-react (Cookie icon), motion@^12, react-calendly@^4.4.0, Vitest 4 (jsdom env override), pnpm 10.

**Spec source :** [docs/superpowers/specs/conformite-legale/05-gating-calendly-marketing-design.md](../../specs/conformite-legale/05-gating-calendly-marketing-design.md)

**Discipline commit (CLAUDE.md projet) :** AUCUN `git commit` intermédiaire pendant l'implémentation. Un seul commit final après validation utilisateur explicite à la fin de Task 6.

**Rules applicables :**
- `.claude/rules/react/hooks.md` (Rules of Hooks, top-level uniquement, Context Provider re-render)
- `.claude/rules/nextjs/server-client-components.md` (`'use client'` au plus bas, leaf client component)
- `.claude/rules/next-intl/translations.md` (`useTranslations` Client Component, namespaces)
- `.claude/rules/typescript/conventions.md` (props optionnelles, alias `@/*`)
- `.claude/rules/vitest/setup.md` (project unit jsdom, `vi.mock` hoisted, factory pattern)
- `.claude/rules/nextjs/tests.md` (factory pattern, mock libs externes pas Prisma)
- `.claude/rules/tailwind/conventions.md` (cn(), tokens sémantiques)

---

## Task 1: Étendre messages/fr.json et messages/en.json

**Files:**
- Modify: `messages/fr.json` (ajout sous-objet `Cookies.calendlyGated`)
- Modify: `messages/en.json` (idem EN)

- [ ] **Step 1.1: Ajouter le sous-objet `calendlyGated` au namespace `Cookies` de `messages/fr.json`**

Localiser le namespace `Cookies` dans `messages/fr.json` (créé au sub 3, contient déjà la clé `openManagerLabel`).

Ajouter le sous-objet `calendlyGated` au namespace `Cookies`, en respectant la virgule de séparation avec la clé `openManagerLabel` :

```json
"calendlyGated": {
  "label": "L'affichage du widget Calendly nécessite votre accord pour les cookies marketing.",
  "cta": "Activer Calendly"
}
```

Le namespace `Cookies` ressemblera à :
```json
"Cookies": {
  "openManagerLabel": "Gérer mes cookies",
  "calendlyGated": {
    "label": "...",
    "cta": "..."
  }
}
```

- [ ] **Step 1.2: Ajouter le sous-objet `calendlyGated` à `messages/en.json`**

Idem position d'insertion. Ajouter :

```json
"calendlyGated": {
  "label": "Displaying the Calendly widget requires your consent to marketing cookies.",
  "cta": "Enable Calendly"
}
```

- [ ] **Step 1.3: Vérifier la cohérence JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('OK')"`
Expected: `OK`

- [ ] **Step 1.4: Vérifier les types next-intl**

Run: `pnpm typecheck`
Expected: aucune erreur. Les nouvelles clés `Cookies.calendlyGated.label` et `Cookies.calendlyGated.cta` sont accessibles via `useTranslations('Cookies.calendlyGated')`.

---

## Task 2: TDD red: écrire les tests integration du gating

**Files:**
- Create: `src/components/features/contact/CalendlyWidget.integration.test.tsx`

- [ ] **Step 2.1: Créer le fichier de tests avec les 3 cas**

Create `src/components/features/contact/CalendlyWidget.integration.test.tsx` :

```typescript
// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

vi.mock('@c15t/nextjs', () => ({
  useConsentManager: vi.fn(),
}))

vi.mock('react-calendly', () => ({
  InlineWidget: ({ url }: { url: string }) => (
    <div data-testid="inline-widget-stub" data-url={url} />
  ),
  useCalendlyEventListener: () => undefined,
}))

vi.mock('@/server/actions/calendly', () => ({
  trackCalendlyEvent: vi.fn(),
}))

import { CalendlyWidget } from './CalendlyWidget'
import { useConsentManager } from '@c15t/nextjs'

const messages = {
  Cookies: {
    openManagerLabel: 'Gérer mes cookies',
    calendlyGated: {
      label: "L'affichage du widget Calendly nécessite votre accord pour les cookies marketing.",
      cta: 'Activer Calendly',
    },
  },
} as const

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="fr" messages={messages} timeZone="Europe/Paris">
      {children}
    </NextIntlClientProvider>
  )
}

const useConsentManagerMock = vi.mocked(useConsentManager)

function buildManagerMock(marketingAccepted: boolean) {
  return {
    has: ({ category }: { category: string }) => category === 'necessary' || (category === 'marketing' && marketingAccepted),
    setActiveUI: vi.fn(),
    setLanguage: vi.fn(),
    consents: marketingAccepted ? { necessary: true, marketing: true } : { necessary: true, marketing: false },
  } as unknown as ReturnType<typeof useConsentManager>
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('CalendlyWidget gating marketing', () => {
  it('rend le placeholder gated quand marketing=false', () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(false))

    render(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    expect(
      screen.getByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Activer Calendly' })).toBeInTheDocument()
    expect(screen.queryByTestId('inline-widget-stub')).toBeNull()
  })

  it('rend le widget Calendly quand marketing=true et url valide', () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(true))

    render(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    const stub = screen.getByTestId('inline-widget-stub')
    expect(stub).toBeInTheDocument()
    expect(stub.getAttribute('data-url')).toBe('https://calendly.com/test')
    expect(
      screen.queryByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeNull()
  })

  it('bascule du placeholder gated vers le widget quand marketing passe de false à true', () => {
    useConsentManagerMock.mockReturnValue(buildManagerMock(false))

    const { rerender } = render(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    expect(
      screen.getByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeInTheDocument()
    expect(screen.queryByTestId('inline-widget-stub')).toBeNull()

    useConsentManagerMock.mockReturnValue(buildManagerMock(true))

    rerender(
      <Wrapper>
        <CalendlyWidget url="https://calendly.com/test" placeholderLabel="Loading..." />
      </Wrapper>,
    )

    expect(screen.getByTestId('inline-widget-stub')).toBeInTheDocument()
    expect(
      screen.queryByText(/L'affichage du widget Calendly nécessite votre accord/),
    ).toBeNull()
  })
})
```

Note importante : `vi.mock(...)` est hoisted au top du fichier par Vitest avant les `import` (cf. `.claude/rules/vitest/setup.md`). Les imports de `CalendlyWidget` et `useConsentManager` viennent APRÈS les `vi.mock` côté code mais sont effectivement résolus avec les mocks grâce au hoisting.

- [ ] **Step 2.2: Lancer les tests, ils doivent ÉCHOUER (red phase)**

Run: `pnpm test src/components/features/contact/CalendlyWidget.integration.test.tsx`
Expected: les 3 tests échouent. La raison : le fichier `CalendlyWidget.tsx` n'a pas encore la 3e branche `if (!marketingAccepted)`, donc :
- Test 1 (`marketing=false`) : le composant rend l'`InlineWidget` (branche normale) au lieu du placeholder gated → `screen.getByText(/L'affichage du widget/)` lance `Unable to find an element`.
- Test 2 (`marketing=true`) : le composant rend l'`InlineWidget`, ce test PASSERAIT par accident car le mock du hook retourne marketing=true et l'URL est valide. À cette étape, c'est OK qu'il passe (on TDD le cas marketing=false ; le cas marketing=true est régression-safe).
- Test 3 (transition) : le rerender ne bascule pas car aucune branche gated n'existe → `screen.getByText(/L'affichage du widget/)` initial échoue.

C'est la phase red du TDD.

---

## Task 3: TDD green: modifier CalendlyWidget.tsx avec la branche gated

**Files:**
- Modify: `src/components/features/contact/CalendlyWidget.tsx`

- [ ] **Step 3.1: Remplacer le contenu du fichier par la version avec branche gated**

Le contenu actuel (107 lignes, 2 branches `!url` / normale).

Remplacer entièrement par la version étendue (3 branches : `!marketingAccepted` gated / `!url` no-url / normale InlineWidget) :

```typescript
'use client'

import { useConsentManager } from '@c15t/nextjs'
import { CalendarClock, Cookie } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import { InlineWidget, useCalendlyEventListener } from 'react-calendly'

import { OpenCookiePreferencesButton } from '@/components/features/legal/OpenCookiePreferencesButton'
import { cn } from '@/lib/utils'
import { trackCalendlyEvent } from '@/server/actions/calendly'

const PAGE_SETTINGS = {
  hideEventTypeDetails: true,
  hideGdprBanner: true,
} as const

const MIN_WIDTH_PX = 320
const INITIAL_HEIGHT_PX = 680
const MIN_REASONABLE_HEIGHT_PX = 400
const TOP_PADDING_CROP_DESKTOP_PX = 70
const TOP_PADDING_CROP_MOBILE_PX = 0
const MOBILE_BREAKPOINT = '(max-width: 767px)'

type Props = {
  url: string
  placeholderLabel: string
  className?: string
}

function PlaceholderContent({ label }: { label: string }) {
  return (
    <>
      <CalendarClock className="size-10" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
    </>
  )
}

export function CalendlyWidget({ url, placeholderLabel, className }: Props) {
  const { has } = useConsentManager()
  const marketingAccepted = has({ category: 'marketing' })
  const tCookies = useTranslations('Cookies.calendlyGated')

  const [height, setHeight] = useState(INITIAL_HEIGHT_PX)
  const [cropPx, setCropPx] = useState(TOP_PADDING_CROP_DESKTOP_PX)
  const [iframeReady, setIframeReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT)
    const update = () =>
      setCropPx(mq.matches ? TOP_PADDING_CROP_MOBILE_PX : TOP_PADDING_CROP_DESKTOP_PX)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useCalendlyEventListener({
    onPageHeightResize: (e) => {
      const px = Number.parseInt(e.data.payload.height, 10)
      if (Number.isFinite(px) && px >= MIN_REASONABLE_HEIGHT_PX) setHeight(px)
    },
    onEventTypeViewed: () => {
      if (!iframeReady) setIframeReady(true)
    },
    onProfilePageViewed: () => {
      if (!iframeReady) setIframeReady(true)
    },
    onEventScheduled: (e) => {
      void trackCalendlyEvent({ eventUri: e.data.payload.event.uri })
    },
  })

  if (!marketingAccepted) {
    return (
      <div
        className={cn(
          'flex w-full flex-1 flex-col items-center justify-center min-h-[500px] gap-4 border border-border bg-card text-muted-foreground rounded-lg p-6',
          className,
        )}
      >
        <Cookie className="size-10" aria-hidden />
        <p className="text-sm font-medium text-center max-w-md">{tCookies('label')}</p>
        <OpenCookiePreferencesButton variant="default" label={tCookies('cta')} />
      </div>
    )
  }

  if (!url) {
    return (
      <div
        className={cn(
          'flex w-full flex-1 flex-col items-center justify-center min-h-[500px] gap-3 border border-border bg-card text-muted-foreground rounded-lg',
          className,
        )}
      >
        <PlaceholderContent label={placeholderLabel} />
      </div>
    )
  }

  return (
    <div
      style={{
        minWidth: MIN_WIDTH_PX,
        height: height - cropPx,
        overflow: 'hidden',
      }}
      className={cn('relative w-full', className)}
    >
      <InlineWidget
        url={url}
        pageSettings={PAGE_SETTINGS}
        styles={{ minWidth: MIN_WIDTH_PX, height, marginTop: -cropPx }}
      />
      {!iframeReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-border bg-card text-muted-foreground rounded-lg">
          <PlaceholderContent label={placeholderLabel} />
        </div>
      )}
    </div>
  )
}
```

Diff vs version actuelle :
- +4 imports (`useConsentManager` from `@c15t/nextjs`, `Cookie` from lucide-react, `useTranslations` from next-intl, `OpenCookiePreferencesButton` from legal)
- +3 lignes au top (`const { has } = useConsentManager()`, `const marketingAccepted = has({ category: 'marketing' })`, `const tCookies = useTranslations('Cookies.calendlyGated')`)
- +12 lignes de JSX pour la branche gated avant `if (!url)`
- Tout le reste inchangé (placeholder no-url + InlineWidget normal)

- [ ] **Step 3.2: Lancer les tests, ils doivent PASSER (green phase)**

Run: `pnpm test src/components/features/contact/CalendlyWidget.integration.test.tsx`
Expected: les 3 tests passent (vert).

Si test 1 échoue avec un message du genre `Unable to find role "button"`, vérifier que le mock de `next-intl` retourne bien le texte FR pour la clé `Cookies.calendlyGated.cta` (le test wrap avec `NextIntlClientProvider` qui résout via le `messages` stub).

Si test 3 échoue à cause du rerender qui ne reflète pas le changement, vérifier que `useConsentManagerMock.mockReturnValue(...)` est bien appelé avant le `rerender` (Vitest mocks sont hoisted, mais leur état change à chaque appel `mockReturnValue`).

- [ ] **Step 3.3: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. `useConsentManager()` typé via `@c15t/nextjs` (sub 3), `has({ category })` retourne `boolean`, `useTranslations('Cookies.calendlyGated')` retourne une fonction de traduction.

---

## Task 4: Smoke tests en dev

**Files:** aucun fichier modifié.

- [ ] **Step 4.1: Démarrer le serveur dev**

Run: `pnpm dev`
Expected: serveur démarre sur `http://localhost:3000`.

Note prérequis : sub 3 (`<ConsentManagerProvider>` mounté dans Providers) et sub 4 (`<OpenCookiePreferencesButton>` créé avec prop `label?` exposée) doivent déjà être implémentés et mergés. Sans ces 2 sub-projects, `useConsentManager()` lèvera l'erreur explicite et le composant ne fonctionnera pas.

- [ ] **Step 4.2: Charger /fr/contact en navigation privée**

Ouvrir `http://localhost:3000/fr/contact` en mode incognito (Chrome) ou navigation privée (Firefox), avec DevTools console + Network ouvertes.
Expected:
- Le banner cookies c15t du sub 3 apparaît en bas, comportement attendu pour tout premier hit.
- Le widget Calendly est remplacé par le placeholder gated : icône `Cookie` lucide (size-10), texte "L'affichage du widget Calendly nécessite votre accord pour les cookies marketing.", bouton "Activer Calendly" (variant `default`).
- Aucun `<iframe src="https://calendly.com/...">` dans le DOM (vérifiable via Elements DevTools).
- Aucun appel réseau vers `calendly.com` dans Network panel.
- Aucune violation CSP en console.

- [ ] **Step 4.3: Cliquer sur "Activer Calendly"**

Cliquer sur le bouton "Activer Calendly" dans le placeholder gated.
Expected:
- La modale `ConsentDialog` c15t du sub 3 s'ouvre, avec les 2 catégories (necessary read-only + marketing toggle interactif).
- Aucune erreur en console DevTools.

- [ ] **Step 4.4: Toggle marketing on + Save**

Toggler le checkbox marketing à `on` dans la modale, puis cliquer "Enregistrer".
Expected:
- La modale se ferme.
- Un cookie c15t est mis à jour (DevTools > Application > Cookies) avec `marketing: true`, expire ~13 mois (durée par défaut alignée GDPR).
- Le banner cookies se ferme aussi (si encore visible).
- **Le `<CalendlyWidget>` re-render automatiquement** : le placeholder gated disparaît, l'iframe Calendly se monte (`<iframe src="https://calendly.com/test...">` apparaît dans le DOM Elements).
- Network panel montre l'appel vers `calendly.com` qui charge l'iframe.
- Une fois l'iframe chargée (~1-2s), le placeholder loading overlay disparaît au profit du widget interactif.

- [ ] **Step 4.5: Recharger la page et vérifier la persistance**

Recharger `/fr/contact`.
Expected:
- Le banner cookies ne réapparaît PAS (cookie déjà persisté).
- Le widget Calendly se charge directement sans flicker du placeholder gated (c15t expose `consents.marketing = true` immédiatement post-mount).

- [ ] **Step 4.6: Test du cas refus**

Vider les cookies (DevTools > Application > Cookies > Clear all + localStorage), recharger la page.
Cliquer sur "Tout rejeter" dans le banner cookies.
Expected:
- Le banner se ferme, cookie persisté avec `marketing: false`.
- Le `<CalendlyWidget>` reste en mode placeholder gated (marketing=false).
- Cliquer sur "Activer Calendly" ouvre la modale, où l'utilisateur peut accepter rétroactivement.

- [ ] **Step 4.7: Vérifier l'absence de violations CSP**

Pour les 3 scénarios précédents (premier hit, après accept, après reject), DevTools console doit être propre :
- Aucune violation CSP `frame-src` ou `connect-src` (car le sub 2 autorise déjà Calendly day-1).
- Aucun warning React (hydration mismatch, deps useEffect, etc.).

- [ ] **Step 4.8: Arrêter le serveur dev**

Run: `Ctrl+C`.

---

## Task 5: Smoke tests en build prod

**Files:** aucun fichier modifié.

- [ ] **Step 5.1: Builder l'app en mode production**

Run: `pnpm build`
Expected: build réussi, aucune erreur. Le bundle de la page `/contact` reste raisonnable (impact ajout 4 imports + 13 lignes JSX = négligeable).

- [ ] **Step 5.2: Démarrer le serveur prod**

Run: `pnpm start`
Expected: serveur démarre sur `http://localhost:3000` en mode production.

- [ ] **Step 5.3: Refaire les smoke tests Step 4.2 à 4.6 en prod**

Reproduire en mode incognito :
- Premier hit `/fr/contact` → placeholder gated visible.
- Clic "Activer Calendly" → modale ouvre.
- Accept marketing + Save → re-render automatique, iframe se charge.
- Reload → cookie persiste, iframe direct.
- Reject all → placeholder gated reste.

Expected: comportement identique à dev. Aucune divergence dev/prod.

- [ ] **Step 5.4: Vérifier les Core Web Vitals sur /fr/contact**

Run: lancer Lighthouse Performance audit (mode mobile) sur `http://localhost:3000/fr/contact`.
Expected:
- LCP < 2.5s
- CLS < 0.1 (le placeholder gated et l'iframe ont la même `min-h-[500px]`, pas de layout shift au switch)
- INP < 200ms (clic "Activer Calendly" responsif)

- [ ] **Step 5.5: Arrêter le serveur prod**

Run: `Ctrl+C`.

---

## Task 6: Vérifications finales et préparation commit

- [ ] **Step 6.1: Lancer le typecheck global**

Run: `pnpm typecheck`
Expected: aucune erreur.

- [ ] **Step 6.2: Lancer le lint**

Run: `pnpm lint`
Expected: aucune erreur.

- [ ] **Step 6.3: Lancer la suite de tests complète**

Run: `pnpm test`
Expected: tous les tests verts. Les 3 nouveaux tests `CalendlyWidget.integration.test.tsx` passent. Aucune régression sur les tests existants (`consent-language-sync.integration.test.tsx` du sub 3 doit toujours passer).

- [ ] **Step 6.4: Lancer un build final**

Run: `pnpm build`
Expected: build réussi sans warning bloquant.

- [ ] **Step 6.5: Vérifier le diff git**

Run: `git status`
Expected output (les fichiers attendus) :
- new file: `src/components/features/contact/CalendlyWidget.integration.test.tsx`
- modified: `src/components/features/contact/CalendlyWidget.tsx`
- modified: `messages/fr.json`
- modified: `messages/en.json`

Vérifier qu'il n'y a pas de fichier inattendu.

- [ ] **Step 6.6: DEMANDER VALIDATION USER avant tout `git add` / `git commit`**

NE PAS lancer `git commit` directement. La discipline projet (CLAUDE.md projet § Workflow Git > Discipline commit) interdit les commits auto-initiés.

Présenter à l'utilisateur :
1. La liste des fichiers modifiés/créés (output `git status`)
2. Un résumé : "Sub-project 5/7 implémenté : gating Calendly marketing via useConsentManager().has({ category: 'marketing' }), placeholder gated CTA + bouton Activer Calendly, re-render automatique post-consent, 3 tests integration jsdom verts, smoke tests dev + prod OK"
3. Une proposition de message de commit Conventional :
   ```
   feat(contact): gate Calendly inline widget behind marketing consent

   - CalendlyWidget rend un placeholder gated (icône Cookie + label + CTA) tant que useConsentManager().has({ category: 'marketing' }) est false
   - Re-render automatique via store c15t quand l'utilisateur accepte (pas de reload)
   - Réutilisation OpenCookiePreferencesButton du sub 4 avec prop label="Activer Calendly"
   - 4 clés i18n Cookies.calendlyGated.{label, cta} en FR/EN
   - 3 tests integration jsdom (marketing=false, marketing=true, transition false→true)

   Refs: docs/superpowers/specs/conformite-legale/05-gating-calendly-marketing-design.md
   ```

Attendre l'accord explicite de l'utilisateur avant de lancer `git add` puis `git commit`.

- [ ] **Step 6.7: Après validation user uniquement, commiter**

Run (uniquement après accord explicite user) :
```bash
git add src/components/features/contact/CalendlyWidget.tsx src/components/features/contact/CalendlyWidget.integration.test.tsx messages/fr.json messages/en.json
git commit -m "$(cat <<'EOF'
feat(contact): gate Calendly inline widget behind marketing consent

- CalendlyWidget rend un placeholder gated (icône Cookie + label + CTA) tant que useConsentManager().has({ category: 'marketing' }) est false
- Re-render automatique via store c15t quand l'utilisateur accepte (pas de reload)
- Réutilisation OpenCookiePreferencesButton du sub 4 avec prop label="Activer Calendly"
- 4 clés i18n Cookies.calendlyGated.{label, cta} en FR/EN
- 3 tests integration jsdom (marketing=false, marketing=true, transition false→true)

Refs: docs/superpowers/specs/conformite-legale/05-gating-calendly-marketing-design.md
EOF
)"
```

Run: `git status`
Expected: working tree clean.

- [ ] **Step 6.8: Mettre à jour le statut du spec**

Modifier le frontmatter de `docs/superpowers/specs/conformite-legale/05-gating-calendly-marketing-design.md` :
- Changer `status: "draft"` en `status: "implemented"`

Cette modification peut être commitée séparément en `chore(specs): mark gating-calendly-marketing as implemented` après accord user.

---

## Self-Review

**Spec coverage check :**

| Spec section | Task(s) couvrant |
|---|---|
| Premier chargement /contact gated (Scénario 1) | Task 3 + Task 4 Step 4.2 |
| Clic "Activer Calendly" ouvre modale (Scénario 2) | Task 3 (OpenCookiePreferencesButton consommé) + Task 4 Step 4.3 |
| Toggle marketing + Save → re-render iframe (Scénario 3) | Task 3 (store c15t réactif) + Task 4 Step 4.4 |
| Visiteur déjà accepté (Scénario 4) | Task 4 Step 4.5 |
| Visiteur déjà refusé (Scénario 5) | Task 4 Step 4.6 |
| Tests integration verts (Scénario 6) | Task 2 + Task 3 + Task 6 Step 6.3 |
| 4 clés i18n FR/EN | Task 1 |
| Aucune violation CSP | Task 4 Step 4.7 (sub 2 CSP autorise déjà Calendly) |
| Performance Core Web Vitals | Task 5 Step 5.4 |

Aucun gap identifié.

**Placeholder scan :** aucun TBD/TODO/à définir dans le plan. Code complet à chaque step. Textes i18n FR + EN intégraux fournis dans Task 1. Code complet `CalendlyWidget.tsx` modifié fourni Task 3 (verbatim, pas de "similar to before").

**Type consistency :** `useConsentManager()` retour fourni par `@c15t/nextjs` (sub 3) avec `has({ category })`, `setActiveUI`, `setLanguage`, `consents`. Props `OpenCookiePreferencesButton` `{ className?, variant?, label? }` cohérent avec sub 4 (composant déjà créé avec prop `label?` exposée). Hooks `useTranslations('Cookies.calendlyGated')` cohérent avec namespace défini Task 1.

---

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/conformite-legale/05-gating-calendly-marketing.md`.**

Ce plan sera consommé par `/implement-subproject conformite-legale 05` lors de l'implémentation effective.

**Pas d'implémentation tout de suite** : on est dans le workflow `/decompose-feature` qui boucle sur les 7 sub-projects. Le sub-project 6/7 (`json-ld-enrich-person-legal`) est le suivant dans l'ordre topologique.
