# Bandeau consentement cookies via c15t mode offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer `@c15t/nextjs@^2.0.0` (Apache 2.0) + `@c15t/translations@^2.0.0` en mode `offline`, monter `ConsentManagerProvider` + `ConsentBanner` + `ConsentDialog` dans `Providers.tsx` avec translations FR/EN built-in et `hideBranding`, exposer un sync runtime entre `useLocale()` next-intl et `setLanguage()` c15t, et themer via CSS variables aux tokens DESIGN.md.

**Architecture:** c15t en mode `offline` stocke le consentement en localStorage + cookie sans backend. `overrides.country: 'FR'` force GDPR sans géo-détection IP. Translations FR/EN fournies par `baseTranslations` de `@c15t/translations/all`. `<ConsentLanguageSync />` (Client Component leaf) appelle `setLanguage(useLocale())` dans un `useEffect` pour propager le switch FR/EN dans le banner. Theming via override des variables `--button-*`, `--banner-*`, `--dialog-*` dans `globals.css`. API exposée aux subs 4/5/7 : `useConsentManager().has({ category: 'marketing' })` et `setActiveUI('dialog')`.

**Tech Stack:** Next.js 16, React 19, TypeScript 6 strict, Tailwind 4, next-intl 4, @c15t/nextjs 2.0.0, @c15t/translations 2.0.0, Vitest 4 (project integration jsdom), pnpm 10.

**Spec source :** [docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md](../../specs/conformite-legale/03-bandeau-consentement-cookies-design.md)

**Knowledge fiche :** [docs/knowledges/c15t.md](../../../knowledges/c15t.md)

**Discipline commit (CLAUDE.md projet) :** AUCUN `git commit` intermédiaire pendant l'implémentation. Un seul commit final après validation utilisateur explicite à la fin de Task 9. Toutes les Tasks intermédiaires laissent le working tree modifié sans commit.

**Rules applicables :**
- `.claude/rules/react/hooks.md` (Rules of Hooks, useEffect cleanup, deps exhaustives)
- `.claude/rules/nextjs/server-client-components.md` (`'use client'` au plus bas, Provider Client Component)
- `.claude/rules/nextjs/configuration.md` (Next 16 cacheComponents compatible)
- `.claude/rules/next-intl/translations.md` (`useLocale` Client Component)
- `.claude/rules/tailwind/conventions.md` (cn(), tokens sémantiques, ordering imports CSS)
- `.claude/rules/typescript/conventions.md` (alias `@/*`, types lib via import explicite)
- `.claude/rules/vitest/setup.md` (project integration séparé, jsdom env override)
- `.claude/rules/nextjs/tests.md` (factory pattern, mock `next/navigation`, no-lib-test strict)

---

## Task 1: Installer les dépendances et étendre messages i18n

**Files:**
- Modify: `package.json` (ajout `@c15t/nextjs` et `@c15t/translations`)
- Modify: `messages/fr.json` (ajout namespace `Cookies` minimal)
- Modify: `messages/en.json` (idem EN)

- [ ] **Step 1.1: Installer `@c15t/nextjs` et `@c15t/translations`**

Run: `pnpm add @c15t/nextjs@^2.0.0 @c15t/translations@^2.0.0`
Expected: ajout des 2 packages dans `dependencies` du `package.json`, lockfile mis à jour. `@c15t/translations` doit être installé EXPLICITEMENT (et pas seulement comme transitif de `@c15t/nextjs`) sinon `Module not found: Can't resolve '@c15t/translations/all'` au build.

- [ ] **Step 1.2: Vérifier que les types sont fournis**

Run: `node -e "console.log(require.resolve('@c15t/nextjs'))" ; node -e "console.log(require.resolve('@c15t/translations/all'))"`
Expected: chemins vers les builds installés. Les types sont fournis via `dist-types/` et exportés depuis le package principal.

- [ ] **Step 1.3: Ajouter le namespace `Cookies` minimal à `messages/fr.json`**

Lire `messages/fr.json` actuel pour identifier la position d'insertion (typiquement à la fin de l'objet root, avec virgule de séparation).

Ajouter le bloc suivant comme nouveau namespace top-level :

```json
"Cookies": {
  "openManagerLabel": "Gérer mes cookies"
}
```

Le namespace `Cookies` projet est volontairement minimal (1 clé) : tous les textes du banner et de la modale viennent de `@c15t/translations/all` (built-in c15t). Ce namespace ne contient que les libellés boutons custom du projet (consommés par sub 5 via prop `label?` du bouton, et sub 7 footer).

- [ ] **Step 1.4: Ajouter le namespace `Cookies` à `messages/en.json`**

Idem position d'insertion. Ajouter :

```json
"Cookies": {
  "openManagerLabel": "Manage cookies"
}
```

- [ ] **Step 1.5: Vérifier la cohérence JSON et la compilation des types**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('OK')"`
Expected: `OK` (les 2 fichiers sont du JSON valide).

Run: `pnpm typecheck`
Expected: aucune erreur. La clé `Cookies.openManagerLabel` est désormais accessible via `t('openManagerLabel')` dans le namespace `Cookies`.

---

## Task 2: Créer le helper `buildLegalLinks`

**Files:**
- Create: `src/lib/cookies/build-legal-links.ts`

- [ ] **Step 2.1: Créer le helper pur**

Create `src/lib/cookies/build-legal-links.ts` :

```typescript
type Locale = 'fr' | 'en'

type LegalLinks = {
  privacyPolicy: { href: string; target: '_self' }
}

export function buildLegalLinks(locale: Locale): LegalLinks {
  return {
    privacyPolicy: {
      href: `/${locale}/confidentialite`,
      target: '_self',
    },
  }
}
```

Note : pas de `cookiePolicy` séparée car la section cookies vit dans la page `/confidentialite` du sub 4 (pas de page séparée). Le path `/confidentialite` reste identique en EN (slug FR conservé en EN, voir `Architectural decisions` du sub 4 si besoin de localiser le slug ultérieurement).

- [ ] **Step 2.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur.

---

## Task 3: TDD red: écrire les tests d'intégration de `<ConsentLanguageSync />`

**Files:**
- Create: `src/lib/cookies/consent-language-sync.integration.test.tsx`

- [ ] **Step 3.1: Créer le fichier de tests avec les 3 cas du spec**

Create `src/lib/cookies/consent-language-sync.integration.test.tsx` :

```typescript
// @vitest-environment jsdom

import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import { ConsentManagerProvider } from '@c15t/nextjs'
import { baseTranslations } from '@c15t/translations/all'

const setLanguageMock = vi.fn()
const useLocaleMock = vi.fn<() => 'fr' | 'en'>()

vi.mock('next-intl', () => ({
  useLocale: () => useLocaleMock(),
}))

vi.mock('@c15t/nextjs', async (importOriginal) => {
  const original = await importOriginal<typeof import('@c15t/nextjs')>()
  return {
    ...original,
    useConsentManager: () => ({
      setLanguage: setLanguageMock,
      consents: {},
      has: () => false,
      setActiveUI: () => undefined,
    }),
  }
})

import { ConsentLanguageSync } from './consent-language-sync'

function Wrapper({ children }: { children: ReactNode }) {
  return (
    <ConsentManagerProvider
      options={{
        mode: 'offline',
        i18n: { locale: 'fr', detectBrowserLanguage: false, messages: baseTranslations },
      }}
    >
      {children}
    </ConsentManagerProvider>
  )
}

beforeEach(() => {
  setLanguageMock.mockClear()
  useLocaleMock.mockReturnValue('fr')
  localStorage.clear()
  document.cookie = ''
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('<ConsentLanguageSync />', () => {
  it('appelle setLanguage(locale) au mount avec la locale courante', () => {
    useLocaleMock.mockReturnValue('fr')
    render(
      <Wrapper>
        <ConsentLanguageSync />
      </Wrapper>,
    )
    expect(setLanguageMock).toHaveBeenCalledTimes(1)
    expect(setLanguageMock).toHaveBeenCalledWith('fr')
  })

  it('rappelle setLanguage avec la nouvelle locale après changement (re-render)', () => {
    useLocaleMock.mockReturnValue('fr')
    const { rerender } = render(
      <Wrapper>
        <ConsentLanguageSync />
      </Wrapper>,
    )
    expect(setLanguageMock).toHaveBeenCalledWith('fr')

    useLocaleMock.mockReturnValue('en')
    act(() => {
      rerender(
        <Wrapper>
          <ConsentLanguageSync />
        </Wrapper>,
      )
    })

    expect(setLanguageMock).toHaveBeenCalledTimes(2)
    expect(setLanguageMock).toHaveBeenLastCalledWith('en')
  })

  it('ne génère pas de warning React au unmount', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(
      <Wrapper>
        <ConsentLanguageSync />
      </Wrapper>,
    )
    unmount()
    expect(consoleErrorSpy).not.toHaveBeenCalled()
    consoleErrorSpy.mockRestore()
  })
})
```

- [ ] **Step 3.2: Lancer les tests, ils doivent ÉCHOUER (red phase)**

Run: `pnpm test src/lib/cookies/consent-language-sync.integration.test.tsx`
Expected: échec d'import `Cannot find module './consent-language-sync'` (le fichier n'existe pas encore). C'est attendu : c'est la phase red du TDD.

---

## Task 4: TDD green: implémenter `<ConsentLanguageSync />`

**Files:**
- Create: `src/lib/cookies/consent-language-sync.tsx`

- [ ] **Step 4.1: Créer le composant**

Create `src/lib/cookies/consent-language-sync.tsx` :

```typescript
'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'
import { useConsentManager } from '@c15t/nextjs'

export function ConsentLanguageSync() {
  const locale = useLocale()
  const { setLanguage } = useConsentManager()

  useEffect(() => {
    setLanguage(locale)
  }, [locale, setLanguage])

  return null
}
```

- [ ] **Step 4.2: Lancer les tests, ils doivent PASSER (green phase)**

Run: `pnpm test src/lib/cookies/consent-language-sync.integration.test.tsx`
Expected: les 3 tests passent (vert). Si un warning ESLint `react-hooks/exhaustive-deps` apparaît, vérifier que `setLanguage` est bien dans les deps (c'est notre design pour re-déclencher si la référence change).

- [ ] **Step 4.3: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur.

---

## Task 5: Intégrer ConsentManagerProvider + composants c15t dans `Providers.tsx`

**Files:**
- Modify: `src/components/providers/Providers.tsx`

- [ ] **Step 5.1: Modifier le Provider pour wrapper ConsentManagerProvider**

Le contenu actuel : `'use client'` + workaround next-themes + `Providers` qui wrap `ThemeProvider` + `Toaster`.

Modifier comme suit (en gardant le workaround next-themes intact) :

```typescript
'use client'

import type { ReactNode } from 'react'
import { useLocale } from 'next-intl'
import { ThemeProvider } from 'next-themes'
import {
  ConsentManagerProvider,
  ConsentBanner,
  ConsentDialog,
} from '@c15t/nextjs'
import { baseTranslations } from '@c15t/translations/all'

import { Toaster } from '@/components/ui/sonner'
import { ConsentLanguageSync } from '@/lib/cookies/consent-language-sync'
import { buildLegalLinks } from '@/lib/cookies/build-legal-links'

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

export function Providers({ children }: { children: ReactNode }) {
  const locale = useLocale()

  return (
    <ConsentManagerProvider
      options={{
        mode: 'offline',
        overrides: { country: 'FR' },
        consentCategories: ['necessary', 'marketing'],
        i18n: {
          locale,
          detectBrowserLanguage: false,
          messages: baseTranslations,
        },
        legalLinks: buildLegalLinks(locale),
      }}
    >
      <ConsentLanguageSync />
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <ConsentBanner hideBranding />
        <ConsentDialog hideBranding />
        <Toaster />
      </ThemeProvider>
    </ConsentManagerProvider>
  )
}
```

Notes :
- `ConsentManagerProvider` est WRAPPER autour de `ThemeProvider` (provider global à l'extérieur, provider UI à l'intérieur)
- `<ConsentLanguageSync />` placé immédiatement à l'intérieur de `ConsentManagerProvider` (a besoin du Context c15t)
- `<ConsentBanner>` et `<ConsentDialog>` placés DANS le `ThemeProvider` (pour que les couleurs dark mode soient appliquées correctement via les vars CSS overridées en `.dark`)
- Pas besoin de `dynamic({ ssr: false })` : c15t v2 gère lui-même la non-render SSR

- [ ] **Step 5.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. `useLocale()` retourne directement `'fr' | 'en'` strictement typé grâce à l'augmentation `declare module 'next-intl' { interface AppConfig { Locale: ... } }` déjà présente dans `src/i18n/types.ts` (pattern next-intl 4 idiomatique). Pas de cast nécessaire.

---

## Task 6: Theming via CSS variables dans `globals.css`

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 6.1: Ajouter l'import c15t styles AVANT tailwindcss**

Lire `src/app/globals.css` actuel. La ligne 1 doit être `@import "tailwindcss";`. Ajouter `@import "@c15t/nextjs/styles.css";` AVANT cette ligne (ordering critique pour les layers Tailwind 4 : c15t pose ses defaults dans la cascade en premier, Tailwind les wrap après).

Résultat attendu (4 premières lignes) :
```css
@import "@c15t/nextjs/styles.css";
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
```

- [ ] **Step 6.2: Ajouter le bloc d'override des CSS variables c15t**

Ajouter à la fin du fichier `globals.css` (après les déclarations `:root` et `.dark` existantes) :

```css
/* Theming c15t : mapper les variables c15t aux tokens DESIGN.md (sub 3 conformité légale) */
:root {
  --button-primary: var(--primary);
  --button-primary-hover: var(--primary);
  --button-text-primary: var(--primary-foreground);
  --button-border-radius: var(--radius);
  --button-font: var(--font-sans);
  --banner-background-color: var(--card);
  --banner-text-color: var(--foreground);
  --banner-border-color: var(--border);
  --banner-border-radius: var(--radius);
  --dialog-background-color: var(--card);
  --dialog-text-color: var(--foreground);
  --dialog-border-radius: var(--radius);
}

.dark {
  --button-primary: var(--primary);
  --button-primary-hover: var(--primary);
  --button-text-primary: var(--primary-foreground);
  --banner-background-color: var(--card);
  --banner-text-color: var(--foreground);
  --banner-border-color: var(--border);
  --dialog-background-color: var(--card);
  --dialog-text-color: var(--foreground);
}
```

Note CNIL : si Accept et Reject ne sont pas pixel-perfect identiques après ce premier mapping (cas typique : c15t rend Accept primary plein et Reject outline), **override CSS obligatoire** pour aligner Reject sur Accept (variante, font-size, padding, contraste). C'est une exigence stricte de la délibération CNIL 2020-092 consolidée janvier 2026, pas une finition optionnelle. Customize peut rester en variante outline ou lien plus discret (libre). Vérifier la liste exhaustive des vars exposées via `grep -oE "\-\-[a-z][a-z0-9-]+" node_modules/.pnpm/@c15t+ui@2.0.0_*/node_modules/@c15t/ui/dist/styles.css | sort -u`.

- [ ] **Step 6.3: Vérifier la compilation CSS**

Run: `pnpm dev` puis observer le compile log Turbopack.
Expected: aucune erreur CSS, pas de warning sur les imports CSS layer ordering.

Stop le dev server : `Ctrl+C`.

---

## Task 7: Smoke tests en dev

**Files:** aucun fichier modifié.

- [ ] **Step 7.1: Démarrer le serveur dev**

Run: `just dev` (ou `pnpm dev`)
Expected: serveur démarre sans erreur sur le port 3000.

- [ ] **Step 7.2: Premier chargement de `/fr` en navigation privée**

Ouvrir `http://localhost:3000/fr` dans Chrome ou Firefox en mode incognito (DevTools console + Application > Cookies ouvertes).
Expected:
- Le banner c15t apparaît en bottom-left avec le titre "Nous respectons votre vie privée" (FR par défaut de `baseTranslations.fr`).
- 3 boutons côte à côte : "Tout rejeter", "Accepter tout", "Personnaliser".
- **Symétrie Accept/Reject à valider** : DevTools > Inspecter "Accepter tout" et "Tout rejeter". `font-size`, `font-weight`, `padding`, `background-color`, `border`, hauteur tactile (≥44px) doivent être strictement égaux entre ces 2 boutons (exigence CNIL délibération 2020-092). Customize peut rester en variante outline ou lien plus discret. Si c15t v2 rend Accept en `primary` plein et Reject en `outline` par défaut, compléter le bloc CSS de `globals.css` avec un override forçant Reject en variante identique à Accept (ex: mapper `--button-secondary-background` à `var(--primary)` et `--button-secondary-text` à `var(--primary-foreground)`).
- Aucun badge "Secured by c15t" (`hideBranding` ✅).
- Couleurs primary, card, border et radius matchent les tokens DESIGN.md (vert sauge OKLCH).
- Aucun message d'erreur en console (ni hydration mismatch, ni CSP violation, ni warning React).
- Pas de layout shift CLS (banner position fixed).

- [ ] **Step 7.3: Test "Accepter tout"**

Cliquer sur "Accepter tout".
Expected:
- Le banner se ferme.
- Un cookie c15t est créé dans Application > Cookies (DevTools), avec `expires` ~13 mois dans le futur.
- Recharger la page : le banner ne réapparaît PAS.

- [ ] **Step 7.4: Test "Tout rejeter"**

Vider les cookies (DevTools > Application > Cookies > Clear all + localStorage), recharger.
Cliquer sur "Tout rejeter".
Expected:
- Le banner se ferme.
- Cookie c15t créé avec `marketing: false`.

- [ ] **Step 7.5: Test "Personnaliser" + Save avec marketing on**

Vider les cookies + localStorage, recharger.
Cliquer sur "Personnaliser".
Expected:
- La modale `ConsentDialog` s'ouvre par-dessus la page.
- 2 catégories listées : "Strictement nécessaires" (toggle disabled, true read-only) + "Marketing" (toggle interactif, default false).
- Toggler le switch marketing à `on`, cliquer "Enregistrer" (ou "Save preferences" selon translation).
- La modale se ferme, le banner se ferme aussi.
- Cookie c15t persiste avec `marketing: true`.

- [ ] **Step 7.6: Test page `/en/contact`**

Vider les cookies + localStorage. Charger `http://localhost:3000/en/contact` (mode incognito).
Expected:
- Le banner s'affiche en EN ("We value your privacy", "Reject All", "Accept All", "Customize") car `useLocale()` retourne `'en'` et `<ConsentLanguageSync />` appelle `setLanguage('en')` au mount.
- L'iframe Calendly se charge (sub 5 pas encore mergé donc widget actif inconditionnel, comportement normal à ce stade).

- [ ] **Step 7.7: Test switch FR ↔ EN à chaud**

Vider les cookies. Charger `/fr`. Banner FR visible.
Cliquer sur le LocaleSwitcher pour passer en `/en`.
Expected:
- Navigation Next.js vers `/en`.
- Le banner reste visible (pas encore d'interaction).
- Les textes du banner basculent en EN (effet `setLanguage('en')` via `<ConsentLanguageSync />`).
- Si on ouvre la modale "Customize" maintenant, elle est en EN.
- Re-switch vers `/fr` : textes rebasculent en FR.

- [ ] **Step 7.8: Vérifier l'absence de layout shift au mount du banner (smoke test)**

Ouvrir Chrome DevTools > Performance > **Live Metrics** (Chrome 124+). Recharger `/fr` en navigation privée et observer le track "Layout Shifts" pendant les 2 premières secondes.
Expected: aucun shift signalé au mount du banner (CLS = 0). Le banner étant `position: fixed` (géré nativement par c15t), il sort du flux normal et ne peut pas pousser le contenu.

Note : un Lighthouse complet en `pnpm dev` produit des Performance scores médiocres trompeurs (HMR + Turbopack overhead), à réserver au build prod (Step 8.4). Pour CLS spécifiquement, l'overlay DevTools en dev est suffisant et plus précis (identifie l'élément coupable au clic).

- [ ] **Step 7.9: Arrêter le serveur dev**

Run : `Ctrl+C` dans le terminal du serveur dev.
Expected : libération du port 3000.

---

## Task 8: Smoke tests en build prod

**Files:** aucun fichier modifié.

- [ ] **Step 8.1: Builder l'app en production**

Run: `pnpm build` (ou `just build`)
Expected: build réussi. Vérifier dans le rapport `next build` que :
- La taille `First Load JS` des pages publiques (`/fr`, `/en`, `/fr/services`, etc.) ne montre pas d'augmentation excessive (target : reste < 250 KB par route, c15t lui-même ~30 KB minified gzipped).
- Aucun warning critique de compilation.

- [ ] **Step 8.2: Démarrer le serveur prod**

Run: `pnpm start`
Expected: serveur démarre en mode production sur `http://localhost:3000`.

- [ ] **Step 8.3: Refaire les smoke tests Step 7.2 à 7.7 en prod**

Refaire les 6 mêmes tests qu'en dev, en mode incognito :
- Banner s'affiche `/fr` et `/en` avec textes corrects
- Accept / Reject / Customize fonctionnent
- Cookies persistent
- Switch FR ↔ EN propage les textes du banner

Expected : comportement identique à dev. Aucune divergence dev/prod.

- [ ] **Step 8.4: Vérifier les Core Web Vitals en prod**

Run: lancer Lighthouse Performance audit sur `http://localhost:3000/fr` (mode prod, simulation Mobile).
Expected:
- LCP < 2.5s
- CLS < 0.1
- INP < 200ms (au clic des boutons banner)
- Performance score >= baseline pré-feature 7

- [ ] **Step 8.5: Arrêter le serveur prod**

Run : `Ctrl+C`.

---

## Task 9: Vérifications finales et préparation commit

- [ ] **Step 9.1: Lancer le typecheck global**

Run: `pnpm typecheck` (ou `just typecheck`)
Expected: aucune erreur.

- [ ] **Step 9.2: Lancer le lint**

Run: `pnpm lint` (ou `just lint`)
Expected: aucune erreur ni warning sur les nouveaux fichiers.

- [ ] **Step 9.3: Lancer la suite de tests complète**

Run: `pnpm test` (ou `just test`)
Expected: tous les tests verts. Les 3 nouveaux tests `consent-language-sync.integration.test.tsx` passent. Aucune régression sur les tests existants (`about.integration.test.ts`, `projects.integration.test.ts`, `seo.test.ts`, etc.).

- [ ] **Step 9.4: Lancer un build final**

Run: `pnpm build`
Expected: build réussi sans warning critique.

- [ ] **Step 9.5: Vérifier le diff git**

Run: `git status`
Expected output (les fichiers attendus) :
- modified: `package.json`
- modified: `pnpm-lock.yaml`
- modified: `src/app/globals.css`
- modified: `src/components/providers/Providers.tsx`
- modified: `messages/fr.json`
- modified: `messages/en.json`
- new file: `src/lib/cookies/build-legal-links.ts`
- new file: `src/lib/cookies/consent-language-sync.tsx`
- new file: `src/lib/cookies/consent-language-sync.integration.test.tsx`
- new file: `docs/knowledges/c15t.md` (déjà créé hors plan, à inclure dans le commit)

Vérifier qu'il n'y a pas de fichier inattendu (ex: pas de `src/lib/cookies/use-consent-status.ts` résiduel de l'ancienne approche).

- [ ] **Step 9.6: DEMANDER VALIDATION USER avant tout `git add` / `git commit`**

NE PAS lancer `git commit` directement. La discipline projet (CLAUDE.md projet § Workflow Git > Discipline commit) interdit les commits auto-initiés.

Présenter à l'utilisateur :
1. La liste des fichiers modifiés/créés (output `git status`)
2. Un résumé : "Sub-project 3/7 implémenté : c15t v2.0.0 mode offline intégré, banner + dialog avec hideBranding, sync runtime FR/EN via ConsentLanguageSync, theming CSS vars aux tokens DESIGN.md, 3 tests integration verts, smoke tests dev + prod OK, CLS < 0.1, banner fonctionnel en FR et EN avec switch dynamique"
3. Une proposition de message de commit Conventional :
   ```
   feat(cookies): add c15t v2 offline mode with consent banner, dialog and locale sync

   - @c15t/nextjs ^2.0.0 + @c15t/translations ^2.0.0 installés (Apache 2.0)
   - Mode offline (zéro backend, zéro account), overrides.country FR pour CNIL/GDPR forcé
   - ConsentBanner + ConsentDialog mountés dans Providers.tsx avec hideBranding
   - <ConsentLanguageSync /> sync useLocale next-intl → setLanguage c15t (switch FR/EN dynamique)
   - Translations FR/EN built-in via @c15t/translations/all
   - Theming via override CSS vars c15t aux tokens DESIGN.md (vert sauge OKLCH, --radius)
   - 3 tests integration jsdom sur ConsentLanguageSync (mount, change locale, cleanup)
   - API exposée aux subs 4/5/7 : useConsentManager().has({ category }) et setActiveUI('dialog')
   - Knowledge fiche docs/knowledges/c15t.md ajoutée

   Refs: docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md
   ```

Attendre l'accord explicite de l'utilisateur avant de lancer `git add` puis `git commit`.

- [ ] **Step 9.7: Après validation user uniquement, commiter**

Run (uniquement après accord explicite user) :
```bash
git add package.json pnpm-lock.yaml src/lib/cookies/ src/components/providers/Providers.tsx src/app/globals.css messages/fr.json messages/en.json docs/knowledges/c15t.md
git commit -m "$(cat <<'EOF'
feat(cookies): add c15t v2 offline mode with consent banner, dialog and locale sync

- @c15t/nextjs ^2.0.0 + @c15t/translations ^2.0.0 installés (Apache 2.0)
- Mode offline (zéro backend, zéro account), overrides.country FR pour CNIL/GDPR forcé
- ConsentBanner + ConsentDialog mountés dans Providers.tsx avec hideBranding
- <ConsentLanguageSync /> sync useLocale next-intl → setLanguage c15t (switch FR/EN dynamique)
- Translations FR/EN built-in via @c15t/translations/all
- Theming via override CSS vars c15t aux tokens DESIGN.md (vert sauge OKLCH, --radius)
- 3 tests integration jsdom sur ConsentLanguageSync (mount, change locale, cleanup)
- API exposée aux subs 4/5/7 : useConsentManager().has({ category }) et setActiveUI('dialog')
- Knowledge fiche docs/knowledges/c15t.md ajoutée

Refs: docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md
EOF
)"
```

Run: `git status`
Expected: working tree clean.

- [ ] **Step 9.8: Mettre à jour le statut du spec**

Modifier le frontmatter de `docs/superpowers/specs/conformite-legale/03-bandeau-consentement-cookies-design.md` :
- Changer `status: "draft"` en `status: "implemented"`

Cette modification peut être commitée séparément en `chore(specs): mark bandeau-consentement-cookies as implemented` après accord user.

---

## Self-Review

**Spec coverage check :**

| Spec section | Task(s) couvrant |
|---|---|
| Premier chargement banner FR thémé bottom-left (Scénario 1) | Task 5 (Provider) + Task 6 (theming) + Task 7.2 (smoke dev) |
| Clic Accepter tout (Scénario 2) | Task 7.3 (smoke dev) + Task 8.3 (smoke prod) |
| Clic Tout rejeter (Scénario 3) | Task 7.4 + Task 8.3 |
| Personnaliser + Save marketing on (Scénario 4) | Task 7.5 + Task 8.3 |
| Rechargement persistant (Scénario 5) | Task 7.3 fin (recharger) + Task 8.3 |
| Switch FR→EN propage banner via ConsentLanguageSync (Scénario 6) | Task 3 (TDD red) + Task 4 (TDD green) + Task 7.7 (smoke dev) + Task 8.3 |
| `setActiveUI('dialog')` programmatique (Scénario 7) | Task 5 (mount Provider qui expose hook), testé end-to-end par sub 4 (OpenCookiePreferencesButton) |
| Tests intégration verts (Scénario 8) | Task 3 + Task 4 + Task 9.3 |
| API exposée aux subs 4/5/7 | Task 5 (Provider mounté wrap toute l'arbre) |
| Translations FR/EN built-in `@c15t/translations/all` | Task 1.1 (install) + Task 5.1 (Provider config) |
| `hideBranding` retire le badge | Task 5.1 |
| Theming via CSS vars aux tokens DESIGN.md | Task 6 |
| `overrides.country: 'FR'` force GDPR | Task 5.1 |
| 2 catégories `necessary + marketing` | Task 5.1 |
| `legalLinks` calculé par locale | Task 2 + Task 5.1 |
| Sync runtime FR/EN via setLanguage | Task 4 + Task 7.7 |
| CLS = 0 (banner position fixed natif c15t) | Task 7.8 + Task 8.4 |

Aucun gap identifié.

**Placeholder scan :** aucun TBD/TODO/à définir dans le plan. Code complet à chaque step.

**Type consistency :** `Locale` défini dans Task 2 (`'fr' | 'en'`), réutilisé implicitement via `as 'fr' | 'en'` dans Task 5. `ConsentManagerProvider` types fournis par la lib. `useConsentManager()` return type fourni par la lib (`{ setLanguage, consents, has, setActiveUI, ... }`). Cohérent.

**Comparatif vs ancien plan vanilla-cookieconsent :**
- Tasks : 9 (vs 11)
- Files créés : 3 (vs 5)
- Files modifiés : 4 (vs 3)
- Lignes de code projet à écrire : ~70 (vs ~250)
- Tests intégration : 3 (vs 12, no-lib-test strict appliqué)

---

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/conformite-legale/03-bandeau-consentement-cookies.md`.**

Ce plan sera consommé par `/implement-subproject conformite-legale 03` lors de l'implémentation effective.

**Pré-requis avant exécution :**
- Branche `feature/conformite-legale` checkout, à jour avec `develop`
- Worktree POC `.claude/worktrees/poc-c15t-evaluation` cleanup recommandé (`git worktree remove`) pour éviter confusion
- Spec sub 3 statut `draft` → à passer `approved` après validation user

**Impacts sur les autres sub-projects (à patcher AVANT leur implémentation) :**
- sub 4 : `<OpenCookiePreferencesButton>` consomme `useConsentManager().setActiveUI('dialog')` au lieu de `useConsentStatus().openPreferences()`
- sub 5 : gating Calendly via `useConsentManager().has({ category: 'marketing' })` au lieu de `useConsentStatus().marketing`
- sub 7 : footer réutilise `<OpenCookiePreferencesButton>` (changement transparent côté footer)
