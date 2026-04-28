# Bandeau consentement cookies vanilla-cookieconsent v3 headless Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer `vanilla-cookieconsent` v3 self-hosted en mode headless, exposer un bandeau motion/react slide-up CWV-friendly + une modale Dialog shadcn de préférences granulaires conformes CNIL 2025-2026, et un hook `useConsentStatus()` consommable par les autres surfaces de la feature 7.

**Architecture:** vanilla-cookieconsent gère uniquement persistance localStorage cookie 13 mois + events DOM (`cc:onConsent` / `cc:onChange`). On remplace banner + modale built-in par 2 composants custom (banner motion/react fixed bottom + modale Dialog shadcn). Hook `useConsentStatus()` via Context React synchronisé avec la lib via 2 useEffect listeners. Lazy load via `dynamic({ ssr: false })` pour ne pas bloquer FCP.

**Tech Stack:** Next.js 16, React 19, TypeScript 6 strict, Tailwind 4, shadcn/ui (Dialog, Card, Button), motion@^12 (motion/react), vanilla-cookieconsent v3.1.0, Vitest 4 (project integration jsdom), pnpm 10.

**Spec source :** [docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md](../../specs/conformite-legale/03-bandeau-consentement-cookies-design.md)

**Discipline commit (CLAUDE.md projet) :** AUCUN `git commit` intermédiaire pendant l'implémentation. Un seul commit final après validation utilisateur explicite à la fin de Task 11. Toutes les Tasks intermédiaires laissent le working tree modifié sans commit.

**Rules applicables :**
- `.claude/rules/react/hooks.md` (Rules of Hooks, useEffect cleanup, useMemo Context value, custom hooks `useXxx`, throw explicite)
- `.claude/rules/nextjs/server-client-components.md` (`'use client'` au plus bas, `dynamic({ ssr: false })`)
- `.claude/rules/nextjs/configuration.md` (Next 16 cacheComponents compatible)
- `.claude/rules/next-intl/translations.md` (`useTranslations` Client Components, namespaces)
- `.claude/rules/next-themes/theming.md` (pattern `mounted` anti-hydration mismatch)
- `.claude/rules/shadcn-ui/components.md` (Dialog primitive interactive, Card mapping)
- `.claude/rules/tailwind/conventions.md` (cn(), tokens sémantiques, `position fixed` + z-50, mobile-first)
- `.claude/rules/typescript/conventions.md` (alias `@/*`, types lib via import explicite)
- `.claude/rules/vitest/setup.md` (project integration séparé, jsdom env override)
- `.claude/rules/nextjs/tests.md` (factory pattern, mock `next/navigation` si besoin, pas de mock lib testée)
- `.claude/rules/pino/logger.md` (format `{ level, service, time, msg }` à aligner pour client-logger)

---

## Task 1: Installer la dépendance et étendre messages i18n

**Files:**
- Modify: `package.json` (ajout `vanilla-cookieconsent`)
- Modify: `messages/fr.json` (extension namespace `Cookies`)
- Modify: `messages/en.json` (extension namespace `Cookies`)

- [ ] **Step 1.1: Installer `vanilla-cookieconsent` v3.1.0**

Run: `pnpm add vanilla-cookieconsent@^3.1.0`
Expected: ajout de `"vanilla-cookieconsent": "^3.1.0"` dans `dependencies` du `package.json`, lockfile mis à jour. Aucune erreur de peer dep.

- [ ] **Step 1.2: Vérifier que les types sont bien fournis**

Run: `node -e "console.log(require.resolve('vanilla-cookieconsent/dist/types.d.ts'))"` (ou équivalent selon la lib)
Expected: chemin vers les types TypeScript fournis par la lib. Sinon, le types `CookieConsentConfig` et `Translation` seront exportés depuis le module principal.

- [ ] **Step 1.3: Ajouter le namespace `Cookies` complet à `messages/fr.json`**

Lire `messages/fr.json` actuel pour identifier la position d'insertion (typiquement à la fin de l'objet root, en respectant la virgule de séparation avec le dernier namespace).

Ajouter le bloc suivant comme nouveau namespace top-level :

```json
"Cookies": {
  "banner": {
    "title": "Cookies & confidentialité",
    "description": "Nous utilisons des cookies essentiels pour le fonctionnement du site. Le widget Calendly de prise de rendez-vous nécessite votre accord pour les cookies marketing.",
    "acceptAll": "Tout accepter",
    "rejectAll": "Tout refuser",
    "customize": "Personnaliser"
  },
  "modal": {
    "title": "Préférences de cookies",
    "description": "Choisissez les types de cookies que vous acceptez. Vous pouvez modifier ce choix à tout moment via le lien \"Gérer mes cookies\" du pied de page.",
    "categories": {
      "necessary": {
        "title": "Cookies essentiels",
        "description": "Indispensables au fonctionnement du site (préférence de thème, mémorisation de votre choix de cookies). Toujours actifs."
      },
      "marketing": {
        "title": "Cookies marketing",
        "description": "Permettent l'affichage du widget Calendly sur la page Contact. Calendly transfère vos données aux États-Unis dans le cadre du Data Privacy Framework."
      }
    },
    "save": "Sauvegarder mes préférences",
    "acceptAll": "Tout accepter",
    "rejectAll": "Tout refuser"
  }
}
```

- [ ] **Step 1.4: Ajouter le namespace `Cookies` complet à `messages/en.json`**

Idem position d'insertion. Ajouter :

```json
"Cookies": {
  "banner": {
    "title": "Cookies & Privacy",
    "description": "We use essential cookies to operate the site. The Calendly scheduling widget requires your consent for marketing cookies.",
    "acceptAll": "Accept all",
    "rejectAll": "Reject all",
    "customize": "Customize"
  },
  "modal": {
    "title": "Cookie preferences",
    "description": "Choose which types of cookies you accept. You can change your mind anytime via the \"Manage my cookies\" link in the footer.",
    "categories": {
      "necessary": {
        "title": "Essential cookies",
        "description": "Required for site functionality (theme preference, cookie consent storage). Always active."
      },
      "marketing": {
        "title": "Marketing cookies",
        "description": "Enable the Calendly scheduling widget on the Contact page. Calendly transfers your data to the United States under the Data Privacy Framework."
      }
    },
    "save": "Save my preferences",
    "acceptAll": "Accept all",
    "rejectAll": "Reject all"
  }
}
```

- [ ] **Step 1.5: Vérifier la cohérence JSON et la compilation des types**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('OK')"`
Expected: `OK` (les 2 fichiers sont du JSON valide).

Run: `pnpm typecheck`
Expected: aucune erreur. Le namespace `Cookies` est désormais accessible via `t('Cookies.banner.title')` etc.

---

## Task 2: Créer `src/lib/cookies/client-logger.ts`

**Files:**
- Create: `src/lib/cookies/client-logger.ts`

- [ ] **Step 2.1: Créer le fichier**

Create `src/lib/cookies/client-logger.ts` :

```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const SERVICE = 'thibaud-geisler-portfolio'

function emit(level: LogLevel, msg: string, payload: Record<string, unknown> = {}): void {
  const entry = {
    level,
    service: SERVICE,
    context: 'client',
    time: new Date().toISOString(),
    msg,
    ...payload,
  }
  const serialized = JSON.stringify(entry)
  if (level === 'error') console.error(serialized)
  else if (level === 'warn') console.warn(serialized)
  else console.info(serialized)
}

export const clientLogger = {
  info: (msg: string, payload?: Record<string, unknown>): void => emit('info', msg, payload),
  warn: (msg: string, payload?: Record<string, unknown>): void => emit('warn', msg, payload),
  error: (msg: string, payload?: Record<string, unknown>): void => emit('error', msg, payload),
}
```

- [ ] **Step 2.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur.

---

## Task 3: Créer `src/lib/cookies/consent-config.ts`

**Files:**
- Create: `src/lib/cookies/consent-config.ts`

- [ ] **Step 3.1: Créer le fichier de configuration vanilla-cookieconsent**

Create `src/lib/cookies/consent-config.ts` :

```typescript
import type { CookieConsentConfig, Translation } from 'vanilla-cookieconsent'

export const consentCookieName = 'cc_consent'
export const consentCookieMaxDays = 395 // ~13 mois CNIL

export type ConsentTranslations = {
  fr: Translation
  en: Translation
}

export function buildConsentConfig(translations: ConsentTranslations): CookieConsentConfig {
  return {
    cookie: {
      name: consentCookieName,
      expiresAfterDays: consentCookieMaxDays,
    },
    guiOptions: {
      consentModal: {
        layout: 'box inline',
        position: 'bottom right',
        equalWeightButtons: true,
      },
      preferencesModal: {
        layout: 'box',
        equalWeightButtons: true,
      },
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      marketing: { enabled: false, autoClear: { cookies: [] } },
    },
    language: {
      default: 'fr',
      autoDetect: 'document',
      translations,
    },
    disablePageInteraction: false,
  }
}
```

- [ ] **Step 3.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. Les types `CookieConsentConfig` et `Translation` sont importés depuis `vanilla-cookieconsent`.

---

## Task 4: TDD red — écrire les tests d'intégration du Hook + Provider

**Files:**
- Create: `src/lib/cookies/use-consent-status.integration.test.ts`

- [ ] **Step 4.1: Créer le fichier de tests avec les 12 cas du spec**

Create `src/lib/cookies/use-consent-status.integration.test.ts` :

```typescript
// @vitest-environment jsdom

import { act, render, renderHook, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import { CookieConsentProvider, useConsentStatus } from './use-consent-status'
import type { ConsentTranslations } from './consent-config'
import { consentCookieName } from './consent-config'

const fakeTranslations: ConsentTranslations = {
  fr: {
    consentModal: {
      title: 'Cookies',
      description: 'desc',
      acceptAllBtn: 'Tout accepter',
      acceptNecessaryBtn: 'Tout refuser',
      showPreferencesBtn: 'Personnaliser',
    },
    preferencesModal: {
      title: 'Préférences',
      acceptAllBtn: 'Tout accepter',
      acceptNecessaryBtn: 'Tout refuser',
      savePreferencesBtn: 'Sauvegarder',
      closeIconLabel: 'Fermer',
      sections: [
        { title: 'Essentiels', description: 'desc', linkedCategory: 'necessary' },
        { title: 'Marketing', description: 'desc', linkedCategory: 'marketing' },
      ],
    },
  },
  en: {
    consentModal: {
      title: 'Cookies',
      description: 'desc',
      acceptAllBtn: 'Accept all',
      acceptNecessaryBtn: 'Reject all',
      showPreferencesBtn: 'Customize',
    },
    preferencesModal: {
      title: 'Preferences',
      acceptAllBtn: 'Accept all',
      acceptNecessaryBtn: 'Reject all',
      savePreferencesBtn: 'Save',
      closeIconLabel: 'Close',
      sections: [
        { title: 'Essential', description: 'desc', linkedCategory: 'necessary' },
        { title: 'Marketing', description: 'desc', linkedCategory: 'marketing' },
      ],
    },
  },
}

function Wrapper({ children }: { children: ReactNode }) {
  return <CookieConsentProvider translations={fakeTranslations}>{children}</CookieConsentProvider>
}

function clearConsentCookie(): void {
  document.cookie = `${consentCookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  localStorage.clear()
}

beforeEach(() => {
  clearConsentCookie()
  vi.spyOn(console, 'info').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.clearAllMocks()
  clearConsentCookie()
})

describe('useConsentStatus()', () => {
  it('lance une erreur explicite si appelé hors Provider', () => {
    expect(() => renderHook(() => useConsentStatus())).toThrow(
      'useConsentStatus must be used within CookieConsentProvider',
    )
  })

  it('retourne { marketing: false, hasInteracted: false } à l initial avec localStorage vide', async () => {
    const { result } = renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    // Attendre le tick suivant pour que le useEffect du Provider charge la lib
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(result.current.marketing).toBe(false)
    expect(result.current.hasInteracted).toBe(false)
  })

  it('synchronise marketing=true après dispatch de cc:onConsent quand la catégorie est acceptée', async () => {
    const { result } = renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const cc = await import('vanilla-cookieconsent')
    await act(async () => {
      cc.acceptCategory('all')
      window.dispatchEvent(new CustomEvent('cc:onConsent'))
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(result.current.marketing).toBe(true)
    expect(result.current.hasInteracted).toBe(true)
  })

  it('logge consent:accepted en console.info au format JSON Pino-like quand marketing=true', async () => {
    renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const cc = await import('vanilla-cookieconsent')
    await act(async () => {
      cc.acceptCategory('all')
      window.dispatchEvent(new CustomEvent('cc:onConsent'))
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    const calls = (console.info as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args) => JSON.parse(args[0] as string) as Record<string, unknown>,
    )
    const acceptedCall = calls.find((c) => c.msg === 'consent:accepted')
    expect(acceptedCall).toBeDefined()
    expect(acceptedCall?.level).toBe('info')
    expect(acceptedCall?.service).toBe('thibaud-geisler-portfolio')
    expect(acceptedCall?.context).toBe('client')
    expect(acceptedCall?.marketing).toBe(true)
    expect(typeof acceptedCall?.time).toBe('string')
  })

  it('logge consent:rejected quand marketing=false', async () => {
    renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const cc = await import('vanilla-cookieconsent')
    await act(async () => {
      cc.acceptCategory([])
      window.dispatchEvent(new CustomEvent('cc:onConsent'))
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    const calls = (console.info as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args) => JSON.parse(args[0] as string) as Record<string, unknown>,
    )
    expect(calls.find((c) => c.msg === 'consent:rejected')).toBeDefined()
  })

  it('logge consent:changed quand cc:onChange est dispatché', async () => {
    const { result } = renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const cc = await import('vanilla-cookieconsent')
    await act(async () => {
      cc.acceptCategory(['marketing'])
      window.dispatchEvent(new CustomEvent('cc:onChange'))
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    const calls = (console.info as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args) => JSON.parse(args[0] as string) as Record<string, unknown>,
    )
    expect(calls.find((c) => c.msg === 'consent:changed')).toBeDefined()
    expect(result.current.marketing).toBe(true)
  })

  it('openPreferences() appelle cc.showPreferences() de la lib', async () => {
    const { result } = renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const cc = await import('vanilla-cookieconsent')
    const showPreferencesSpy = vi.spyOn(cc, 'showPreferences').mockImplementation(() => {})

    act(() => {
      result.current.openPreferences()
    })

    expect(showPreferencesSpy).toHaveBeenCalledTimes(1)
    showPreferencesSpy.mockRestore()
  })

  it('openPreferences() logge consent:customized', async () => {
    const { result } = renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    const cc = await import('vanilla-cookieconsent')
    vi.spyOn(cc, 'showPreferences').mockImplementation(() => {})

    act(() => {
      result.current.openPreferences()
    })

    const calls = (console.info as ReturnType<typeof vi.spyOn>).mock.calls.map(
      (args) => JSON.parse(args[0] as string) as Record<string, unknown>,
    )
    expect(calls.find((c) => c.msg === 'consent:customized')).toBeDefined()
  })

  it('cleanup les event listeners cc:onConsent et cc:onChange au unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() => useConsentStatus(), { wrapper: Wrapper })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    unmount()

    const removedEvents = removeEventListenerSpy.mock.calls.map((call) => call[0])
    expect(removedEvents).toContain('cc:onConsent')
    expect(removedEvents).toContain('cc:onChange')
    removeEventListenerSpy.mockRestore()
  })

  it('Provider re-rend les consumers quand le state change', async () => {
    function StatusDisplay() {
      const { marketing, hasInteracted } = useConsentStatus()
      return (
        <div>
          <span data-testid="marketing">{marketing ? 'true' : 'false'}</span>
          <span data-testid="interacted">{hasInteracted ? 'true' : 'false'}</span>
        </div>
      )
    }

    render(
      <Wrapper>
        <StatusDisplay />
      </Wrapper>,
    )
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })

    expect(screen.getByTestId('marketing').textContent).toBe('false')
    expect(screen.getByTestId('interacted').textContent).toBe('false')

    const cc = await import('vanilla-cookieconsent')
    await act(async () => {
      cc.acceptCategory('all')
      window.dispatchEvent(new CustomEvent('cc:onConsent'))
      await new Promise((resolve) => setTimeout(resolve, 10))
    })

    expect(screen.getByTestId('marketing').textContent).toBe('true')
    expect(screen.getByTestId('interacted').textContent).toBe('true')
  })

  it('clientLogger émet le format JSON avec toutes les clés Pino-like', async () => {
    const { clientLogger } = await import('./client-logger')

    clientLogger.info('test:event', { foo: 'bar' })

    const lastCall = (console.info as ReturnType<typeof vi.spyOn>).mock.calls.at(-1)
    expect(lastCall).toBeDefined()
    const payload = JSON.parse(lastCall?.[0] as string) as Record<string, unknown>

    expect(payload.level).toBe('info')
    expect(payload.service).toBe('thibaud-geisler-portfolio')
    expect(payload.context).toBe('client')
    expect(typeof payload.time).toBe('string')
    expect(new Date(payload.time as string).toISOString()).toBe(payload.time)
    expect(payload.msg).toBe('test:event')
    expect(payload.foo).toBe('bar')
  })

  it('clientLogger.error utilise console.error au lieu de console.info', async () => {
    const { clientLogger } = await import('./client-logger')

    clientLogger.error('test:error')

    expect(console.error).toHaveBeenCalledTimes(1)
    expect((console.error as ReturnType<typeof vi.spyOn>).mock.calls[0]?.[0]).toContain(
      '"msg":"test:error"',
    )
  })
})
```

- [ ] **Step 4.2: Lancer les tests, ils doivent ÉCHOUER (red phase)**

Run: `pnpm test src/lib/cookies/use-consent-status.integration.test.ts`
Expected: échec d'import `Cannot find module './use-consent-status'` (le fichier n'existe pas encore). C'est attendu : c'est la phase red du TDD.

---

## Task 5: TDD green — implémenter le Provider et le Hook

**Files:**
- Create: `src/lib/cookies/use-consent-status.ts`

- [ ] **Step 5.1: Créer le Provider et le Hook**

Create `src/lib/cookies/use-consent-status.ts` :

```typescript
'use client'

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CookieConsent as CookieConsentApi } from 'vanilla-cookieconsent'

import { buildConsentConfig, type ConsentTranslations } from './consent-config'
import { clientLogger } from './client-logger'

type ConsentState = { marketing: boolean; hasInteracted: boolean }
type ConsentContextValue = ConsentState & { openPreferences: () => void }

const ConsentContext = createContext<ConsentContextValue | null>(null)

type ProviderProps = {
  children: ReactNode
  translations: ConsentTranslations
}

export function CookieConsentProvider({ children, translations }: ProviderProps) {
  const [state, setState] = useState<ConsentState>({ marketing: false, hasInteracted: false })
  const [api, setApi] = useState<CookieConsentApi | null>(null)

  useEffect(() => {
    let cancelled = false
    void import('vanilla-cookieconsent').then((cc) => {
      if (cancelled) return
      void cc.run(buildConsentConfig(translations))
      setApi(cc)
      setState({
        marketing: cc.acceptedCategory('marketing'),
        hasInteracted: cc.validConsent(),
      })
    })
    return () => {
      cancelled = true
    }
  }, [translations])

  useEffect(() => {
    if (!api) return
    const onConsent = () => {
      const marketing = api.acceptedCategory('marketing')
      setState({ marketing, hasInteracted: api.validConsent() })
      clientLogger.info(marketing ? 'consent:accepted' : 'consent:rejected', { marketing })
    }
    const onChange = () => {
      const marketing = api.acceptedCategory('marketing')
      setState({ marketing, hasInteracted: api.validConsent() })
      clientLogger.info('consent:changed', { marketing })
    }
    window.addEventListener('cc:onConsent', onConsent)
    window.addEventListener('cc:onChange', onChange)
    return () => {
      window.removeEventListener('cc:onConsent', onConsent)
      window.removeEventListener('cc:onChange', onChange)
    }
  }, [api])

  const openPreferences = () => {
    api?.showPreferences()
    clientLogger.info('consent:customized', {})
  }

  const value = useMemo<ConsentContextValue>(
    () => ({ ...state, openPreferences }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, api],
  )

  return <ConsentContext value={value}>{children}</ConsentContext>
}

export function useConsentStatus(): ConsentContextValue {
  const ctx = useContext(ConsentContext)
  if (!ctx) {
    throw new Error('useConsentStatus must be used within CookieConsentProvider')
  }
  return ctx
}
```

- [ ] **Step 5.2: Lancer les tests, ils doivent PASSER (green phase)**

Run: `pnpm test src/lib/cookies/use-consent-status.integration.test.ts`
Expected: tous les 12 tests passent (vert).

Si certains tests échouent à cause de timings (la lib est lazy-loadée, parfois `setTimeout(50)` n'est pas suffisant), augmenter à `setTimeout(100)`. Si l'import dynamique de `vanilla-cookieconsent` échoue en jsdom, vérifier que la lib est bien dans `dependencies` (pas `devDependencies`).

- [ ] **Step 5.3: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur.

---

## Task 6: Créer la modale `CookiePreferencesModal`

**Files:**
- Create: `src/components/layout/CookiePreferencesModal.tsx`

- [ ] **Step 6.1: Créer la modale Dialog shadcn avec 2 Card et toggles**

Create `src/components/layout/CookiePreferencesModal.tsx` :

```typescript
'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CookiePreferencesModal({ open, onOpenChange }: Props) {
  const t = useTranslations('Cookies.modal')
  const [marketingChecked, setMarketingChecked] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void import('vanilla-cookieconsent').then((cc) => {
      if (cancelled) return
      setMarketingChecked(cc.acceptedCategory('marketing'))
    })
    return () => {
      cancelled = true
    }
  }, [open])

  const handleAcceptAll = async () => {
    const cc = await import('vanilla-cookieconsent')
    cc.acceptCategory('all')
    onOpenChange(false)
  }

  const handleRejectAll = async () => {
    const cc = await import('vanilla-cookieconsent')
    cc.acceptCategory([])
    onOpenChange(false)
  }

  const handleSave = async () => {
    const cc = await import('vanilla-cookieconsent')
    cc.acceptCategory(marketingChecked ? ['necessary', 'marketing'] : ['necessary'])
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-base">{t('categories.necessary.title')}</CardTitle>
              <input
                type="checkbox"
                checked
                disabled
                aria-label={t('categories.necessary.title')}
                className={cn(
                  'size-5 rounded border border-input',
                  'bg-primary text-primary-foreground',
                  'cursor-not-allowed opacity-60',
                )}
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('categories.necessary.description')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-base">{t('categories.marketing.title')}</CardTitle>
              <input
                type="checkbox"
                checked={marketingChecked}
                onChange={(e) => setMarketingChecked(e.target.checked)}
                aria-label={t('categories.marketing.title')}
                className={cn(
                  'size-5 rounded border border-input cursor-pointer',
                  'checked:bg-primary checked:text-primary-foreground',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                )}
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t('categories.marketing.description')}</p>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="default" onClick={handleSave} className="w-full sm:w-auto">
            {t('save')}
          </Button>
          <Button variant="default" onClick={handleAcceptAll} className="w-full sm:w-auto">
            {t('acceptAll')}
          </Button>
          <Button variant="default" onClick={handleRejectAll} className="w-full sm:w-auto">
            {t('rejectAll')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 6.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. Si Card / CardContent / CardHeader / CardTitle ne sont pas exportés depuis `@/components/ui/card`, vérifier le contenu de ce fichier shadcn.

---

## Task 7: Créer le banner motion/react `CookieConsent`

**Files:**
- Create: `src/components/layout/CookieConsent.tsx`

- [ ] **Step 7.1: Créer le banner motion/react avec compose modale**

Create `src/components/layout/CookieConsent.tsx` :

```typescript
'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { useConsentStatus } from '@/lib/cookies/use-consent-status'

import { CookiePreferencesModal } from './CookiePreferencesModal'

export function CookieConsent() {
  const [mounted, setMounted] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const t = useTranslations('Cookies')
  const { hasInteracted } = useConsentStatus()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  const handleAcceptAll = async () => {
    const cc = await import('vanilla-cookieconsent')
    cc.acceptCategory('all')
  }

  const handleRejectAll = async () => {
    const cc = await import('vanilla-cookieconsent')
    cc.acceptCategory([])
  }

  return (
    <>
      <AnimatePresence>
        {!hasInteracted && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card p-4 sm:p-6 shadow-lg"
            role="dialog"
            aria-labelledby="cookie-banner-title"
          >
            <div className="max-w-7xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <h2 id="cookie-banner-title" className="text-base font-semibold text-foreground">
                  {t('banner.title')}
                </h2>
                <p className="text-sm text-muted-foreground">{t('banner.description')}</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAcceptAll}
                  className="w-full sm:w-auto"
                >
                  {t('banner.acceptAll')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleRejectAll}
                  className="w-full sm:w-auto"
                >
                  {t('banner.rejectAll')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(true)}
                  className="w-full sm:w-auto"
                >
                  {t('banner.customize')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <CookiePreferencesModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
```

- [ ] **Step 7.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur.

---

## Task 8: Intégrer le Provider et le Banner dans `Providers.tsx`

**Files:**
- Modify: `src/components/providers/Providers.tsx`

- [ ] **Step 8.1: Ajouter le Provider et le mount lazy du banner**

Le contenu actuel (`'use client'` directive + workaround next-themes + `Providers` qui wrap ThemeProvider + Toaster).

Modifier comme suit (en gardant le workaround next-themes intact) :

```typescript
'use client'

import dynamic from 'next/dynamic'
import { useMessages } from 'next-intl'
import type { ReactNode } from 'react'
import { ThemeProvider } from 'next-themes'

import { Toaster } from '@/components/ui/sonner'
import { CookieConsentProvider } from '@/lib/cookies/use-consent-status'
import type { ConsentTranslations } from '@/lib/cookies/consent-config'

// Faux positif React 19 × next-themes 0.4.6 : next-themes injecte un <script> inline
// pour éviter le FOUC, React 19 warne à tort (le script s'exécute bien en SSR).
// Workaround communautaire accepté, dev-only, filtre le message exact.
// Refs : https://github.com/pacocoursey/next-themes/issues/387
//        https://github.com/shadcn-ui/ui/issues/10104
// À retirer quand next-themes publie un fix (repo inactif depuis mars 2025).
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Encountered a script tag while rendering React component')
    ) {
      return
    }
    originalConsoleError.apply(console, args)
  }
}

const CookieConsent = dynamic(
  () => import('@/components/layout/CookieConsent').then((m) => m.CookieConsent),
  { ssr: false },
)

function buildConsentTranslations(messages: Record<string, unknown>): ConsentTranslations {
  // Mapping minimal pour vanilla-cookieconsent (les clés FR/EN sont projetées
  // depuis messages/{fr,en}.json namespace Cookies via next-intl).
  // La modale custom (CookiePreferencesModal) lit directement les messages via useTranslations,
  // mais vanilla-cookieconsent v3 exige un objet translations valide même en mode headless.
  const cookies = messages.Cookies as Record<string, Record<string, string>>
  const banner = cookies.banner
  const modal = cookies.modal
  return {
    fr: {
      consentModal: {
        title: banner.title,
        description: banner.description,
        acceptAllBtn: banner.acceptAll,
        acceptNecessaryBtn: banner.rejectAll,
        showPreferencesBtn: banner.customize,
      },
      preferencesModal: {
        title: modal.title,
        acceptAllBtn: modal.acceptAll,
        acceptNecessaryBtn: modal.rejectAll,
        savePreferencesBtn: modal.save,
        closeIconLabel: 'Fermer',
        sections: [
          { title: 'Essentiels', description: '', linkedCategory: 'necessary' },
          { title: 'Marketing', description: '', linkedCategory: 'marketing' },
        ],
      },
    },
    en: {
      consentModal: {
        title: banner.title,
        description: banner.description,
        acceptAllBtn: banner.acceptAll,
        acceptNecessaryBtn: banner.rejectAll,
        showPreferencesBtn: banner.customize,
      },
      preferencesModal: {
        title: modal.title,
        acceptAllBtn: modal.acceptAll,
        acceptNecessaryBtn: modal.rejectAll,
        savePreferencesBtn: modal.save,
        closeIconLabel: 'Close',
        sections: [
          { title: 'Essential', description: '', linkedCategory: 'necessary' },
          { title: 'Marketing', description: '', linkedCategory: 'marketing' },
        ],
      },
    },
  }
}

export function Providers({ children }: { children: ReactNode }) {
  const messages = useMessages()
  const translations = buildConsentTranslations(messages as Record<string, unknown>)

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <CookieConsentProvider translations={translations}>
        {children}
        <CookieConsent />
        <Toaster />
      </CookieConsentProvider>
    </ThemeProvider>
  )
}
```

Note importante : la modale custom `CookiePreferencesModal` lit les traductions via `useTranslations('Cookies.modal')` directement (pattern next-intl idiomatique). Le mapping ci-dessus vers `vanilla-cookieconsent.translations` n'est utilisé que parce que la lib v3 exige un objet `translations` valide même quand on désactive son UI native. C'est un mapping minimal de surface (titres, boutons) avec des descriptions vides : la lib ne render rien de tout ça en mode headless puisqu'on a notre propre UI.

- [ ] **Step 8.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. `useMessages` retourne `IntlMessages` (`AbstractIntlMessages`), à caster en `Record<string, unknown>` pour le mapping.

---

## Task 9: Smoke tests en dev

**Files:** aucun fichier modifié.

- [ ] **Step 9.1: Démarrer le serveur dev**

Run: `pnpm dev`
Expected: serveur démarre sans erreur. Note : le redémarrage est nécessaire car les changements dans `Providers.tsx` et `messages/*.json` ne sont pris en compte qu'au boot.

- [ ] **Step 9.2: Premier chargement de `/fr` en navigation privée**

Ouvrir `http://localhost:3000/fr` dans Chrome ou Firefox en mode incognito (DevTools console + Network ouvertes).
Expected:
- Le banner cookies apparaît en bas de l'écran après FCP (slide-up 200ms motion/react).
- Le banner contient "Cookies & confidentialité" en titre, la description courte FR, 3 boutons "Tout accepter" / "Tout refuser" / "Personnaliser" même taille (Tailwind `w-full sm:w-auto`).
- Aucun message d'erreur en console (ni hydration mismatch, ni CSP violation, ni warning React).
- Network panel ne montre pas le bundle vanilla-cookieconsent dans le First Load JS de `/fr` (chargé après FCP en chunk séparé).

- [ ] **Step 9.3: Test "Tout accepter"**

Cliquer sur "Tout accepter".
Expected:
- Le banner se ferme avec animation slide-down (`AnimatePresence` exit transition).
- Un cookie `cc_consent` est créé dans Application > Cookies (DevTools), avec `expires` ~13 mois dans le futur.
- En console, un log JSON apparaît du type `{"level":"info","service":"thibaud-geisler-portfolio","context":"client","time":"2026-04-28T...","msg":"consent:accepted","marketing":true}`.
- Recharger la page : le banner ne réapparaît PAS.

- [ ] **Step 9.4: Test "Tout refuser"**

Vider les cookies (DevTools > Application > Cookies > Clear all), recharger.
Cliquer sur "Tout refuser".
Expected:
- Le banner se ferme.
- Cookie `cc_consent` créé, mais sans `marketing` dans les categories.
- Log JSON `consent:rejected` avec `marketing:false`.

- [ ] **Step 9.5: Test "Personnaliser" + Save avec marketing on**

Vider les cookies, recharger.
Cliquer sur "Personnaliser".
Expected:
- Une modale Dialog shadcn s'ouvre avec :
  - Titre "Préférences de cookies"
  - Description courte
  - 2 cards : "Cookies essentiels" (toggle disabled+true) et "Cookies marketing" (toggle interactive)
  - 3 boutons en footer : "Sauvegarder mes préférences", "Tout accepter", "Tout refuser"
- Le banner reste visible derrière (overlay).
- Toggler le checkbox marketing à `on`, cliquer "Sauvegarder mes préférences".
- La modale se ferme, le banner se ferme aussi.
- Cookie `cc_consent` créé avec `marketing` dans les categories.
- Logs JSON dans cet ordre : `consent:customized` (au clic Personnaliser), puis `consent:accepted` (au save avec marketing on, car la lib dispatch `cc:onConsent`).

- [ ] **Step 9.6: Test page `/en/contact`**

Charger `http://localhost:3000/en/contact` (mode incognito, cookies vides).
Expected:
- Le banner s'affiche en EN ("Cookies & Privacy", "Accept all", etc.).
- vanilla-cookieconsent détecte la locale via `<html lang="en">` set par next-intl.
- L'iframe Calendly se charge (sub 5 pas encore mergé donc widget actif inconditionnel, comportement normal à ce stade).

- [ ] **Step 9.7: Vérifier CLS (Cumulative Layout Shift)**

Run: ouvrir Lighthouse via DevTools, lancer un audit Performance sur `http://localhost:3000/fr`.
Expected: score CLS < 0.1. Le banner étant `position: fixed`, il n'introduit pas de layout shift sur le contenu existant.

- [ ] **Step 9.8: Arrêter le serveur dev**

Run : `Ctrl+C` dans le terminal du serveur dev.
Expected : libération du port 3000.

---

## Task 10: Smoke tests en build prod

**Files:** aucun fichier modifié.

- [ ] **Step 10.1: Builder l'app en production**

Run: `pnpm build`
Expected: build réussi. Vérifier dans le rapport `next build` que :
- Le bundle initial des routes publiques (`/fr`, `/en`, `/fr/services`, etc.) NE contient PAS `vanilla-cookieconsent` ni `motion/react` du banner (chunks séparés grâce à `dynamic({ ssr: false })`).
- Vérifier la taille `First Load JS` des pages : pas d'augmentation significative (target : < 200 KB).

- [ ] **Step 10.2: Démarrer le serveur prod**

Run: `pnpm start`
Expected: serveur démarre en mode production sur `http://localhost:3000`.

- [ ] **Step 10.3: Refaire les smoke tests Step 9.2 à 9.6 en prod**

Refaire les 5 mêmes tests qu'en dev, en mode incognito :
- Banner s'affiche `/fr` et `/en`
- Accept / Reject / Customize fonctionnent
- Cookies persistent
- Logs JSON OK

Expected : comportement identique à dev. Aucune divergence dev/prod.

- [ ] **Step 10.4: Vérifier les Core Web Vitals en prod**

Run: lancer Lighthouse Performance audit sur `http://localhost:3000/fr` (mode prod, simulation Mobile).
Expected:
- LCP < 2.5s
- CLS < 0.1
- INP < 200ms (au clic des boutons banner)
- Performance score >= baseline pré-feature 7 (à comparer avec une prod précédente avant ce sub-project)

- [ ] **Step 10.5: Arrêter le serveur prod**

Run : `Ctrl+C`.

---

## Task 11: Vérifications finales et préparation commit

- [ ] **Step 11.1: Lancer le typecheck global**

Run: `pnpm typecheck`
Expected: aucune erreur.

- [ ] **Step 11.2: Lancer le lint**

Run: `pnpm lint`
Expected: aucune erreur. Si ESLint warne sur `react-hooks/exhaustive-deps` à propos du `useMemo` du Provider, le commentaire `eslint-disable-next-line` est déjà présent (le `openPreferences` n'a volontairement pas `clientLogger` en deps car il est stable et non capturé).

- [ ] **Step 11.3: Lancer la suite de tests complète**

Run: `pnpm test`
Expected: tous les tests verts. Les 12 nouveaux tests `use-consent-status.integration.test.ts` passent. Aucune régression sur les tests existants (`about.integration.test.ts`, `projects.integration.test.ts`, `seo.test.ts`, etc.).

- [ ] **Step 11.4: Lancer un build final**

Run: `pnpm build`
Expected: build réussi sans warning critique.

- [ ] **Step 11.5: Vérifier le diff git**

Run: `git status`
Expected output (les fichiers attendus) :
- modified: `package.json`
- modified: `pnpm-lock.yaml`
- new file: `src/lib/cookies/client-logger.ts`
- new file: `src/lib/cookies/consent-config.ts`
- new file: `src/lib/cookies/use-consent-status.ts`
- new file: `src/lib/cookies/use-consent-status.integration.test.ts`
- new file: `src/components/layout/CookieConsent.tsx`
- new file: `src/components/layout/CookiePreferencesModal.tsx`
- modified: `src/components/providers/Providers.tsx`
- modified: `messages/fr.json`
- modified: `messages/en.json`

Vérifier qu'il n'y a pas de fichier inattendu.

- [ ] **Step 11.6: DEMANDER VALIDATION USER avant tout `git add` / `git commit`**

NE PAS lancer `git commit` directement. La discipline projet (CLAUDE.md projet § Workflow Git > Discipline commit) interdit les commits auto-initiés.

Présenter à l'utilisateur :
1. La liste des fichiers modifiés/créés (output `git status`)
2. Un résumé : "Sub-project 3/7 implémenté : vanilla-cookieconsent v3 headless intégré, banner motion/react slide-up, modale Dialog shadcn, hook useConsentStatus + Provider, 12 tests integration verts, smoke tests dev + prod OK, CLS < 0.1, banner et modale fonctionnels en FR et EN"
3. Une proposition de message de commit Conventional :
   ```
   feat(cookies): add vanilla-cookieconsent v3 headless with motion banner and shadcn modal

   - vanilla-cookieconsent v3.1.0 installé en mode headless (UI custom)
   - Banner motion/react slide-up CWV-friendly (fixed bottom, CLS = 0, dynamic ssr:false)
   - Modale Dialog shadcn + 2 Card par catégorie + toggles checkbox
   - Hook useConsentStatus() + CookieConsentProvider Context React, sync via DOM events cc:onConsent / cc:onChange
   - clientLogger format JSON Pino-like (level, service, time, msg, context: 'client'), no PII
   - i18n FR/EN namespace Cookies, CNIL 2025-2026 compliant (equalWeightButtons, 13 mois, granularité)
   - 12 tests integration (jsdom) couvrant persistance, hook, listeners cleanup, format log

   Refs: docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md
   ```

Attendre l'accord explicite de l'utilisateur avant de lancer `git add` puis `git commit`.

- [ ] **Step 11.7: Après validation user uniquement, commiter**

Run (uniquement après accord explicite user) :
```bash
git add package.json pnpm-lock.yaml src/lib/cookies/ src/components/layout/CookieConsent.tsx src/components/layout/CookiePreferencesModal.tsx src/components/providers/Providers.tsx messages/fr.json messages/en.json
git commit -m "$(cat <<'EOF'
feat(cookies): add vanilla-cookieconsent v3 headless with motion banner and shadcn modal

- vanilla-cookieconsent v3.1.0 installé en mode headless (UI custom)
- Banner motion/react slide-up CWV-friendly (fixed bottom, CLS = 0, dynamic ssr:false)
- Modale Dialog shadcn + 2 Card par catégorie + toggles checkbox
- Hook useConsentStatus() + CookieConsentProvider Context React, sync via DOM events cc:onConsent / cc:onChange
- clientLogger format JSON Pino-like (level, service, time, msg, context: 'client'), no PII
- i18n FR/EN namespace Cookies, CNIL 2025-2026 compliant (equalWeightButtons, 13 mois, granularité)
- 12 tests integration (jsdom) couvrant persistance, hook, listeners cleanup, format log

Refs: docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md
EOF
)"
```

Run: `git status`
Expected: working tree clean.

- [ ] **Step 11.8: Mettre à jour le statut du spec**

Modifier le frontmatter de `docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md` :
- Changer `status: "draft"` en `status: "implemented"`

Cette modification peut être commitée séparément en `chore(specs): mark bandeau-consentement-cookies as implemented` après accord user.

---

## Self-Review

**Spec coverage check :**

| Spec section | Task(s) couvrant |
|---|---|
| Premier chargement banner après FCP (Scénario 1) | Task 9 Step 9.2 + Task 10 Step 10.3 |
| Clic Tout accepter (Scénario 2) | Task 9 Step 9.3 + Task 4 test "synchronise marketing=true" |
| Clic Tout refuser (Scénario 3) | Task 9 Step 9.4 + Task 4 test "consent:rejected" |
| Personnaliser + Save marketing on (Scénario 4) | Task 9 Step 9.5 + Task 6 modale custom |
| Rechargement persistant (Scénario 5) | Task 9 Step 9.3 fin (recharger) + Task 10 prod |
| `openPreferences()` ré-ouvre la modale (Scénario 6) | Task 4 tests "openPreferences()" + Task 5 implémentation |
| Détection automatique locale (Scénario 7) | Task 9 Step 9.6 (test EN) + Task 3 `autoDetect: 'document'` |
| Tests intégration verts (Scénario 8) | Task 4 + Task 5 + Task 11 Step 11.3 |
| Hook `useConsentStatus()` exposé via Context | Task 5 |
| `clientLogger` format Pino-like | Task 2 + Task 4 tests format JSON |
| 2 catégories CNIL conformes | Task 3 + Task 6 modale 2 cards |
| Lazy load `dynamic({ ssr: false })` | Task 8 Step 8.1 |
| Pattern `mounted` anti-hydration | Task 7 Step 7.1 (`if (!mounted) return null`) |
| CLS = 0 (position fixed) | Task 7 Step 7.1 + Task 9 Step 9.7 + Task 10 Step 10.4 |

Aucun gap identifié.

**Placeholder scan :** aucun TBD/TODO/à définir dans le plan. Code complet à chaque step. Les sections "description vide" dans le mapping `vanilla-cookieconsent.translations` (Task 8) sont volontaires et documentées (la lib exige un objet translations même en mode headless, mais ne render pas ces strings).

**Type consistency :** `ConsentTranslations` défini dans Task 3, importé dans Task 5 (Provider) et Task 8 (mapping). `ConsentContextValue` défini dans Task 5, retourné par `useConsentStatus()`. `consentCookieName` défini dans Task 3, importé dans Task 4 (tests). Cohérent.

---

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/conformite-legale/03-bandeau-consentement-cookies.md`.**

Ce plan sera consommé par `/implement-subproject conformite-legale 03` lors de l'implémentation effective.

**Pas d'implémentation tout de suite** : on est dans le workflow `/decompose-feature` qui boucle sur les 7 sub-projects. Le sub-project 4/7 (`pages-mentions-confidentialite`) est le suivant dans l'ordre topologique.
