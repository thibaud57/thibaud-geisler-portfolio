# Protection des routes de l'espace admin — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre `/admin` inaccessible sans session valide, et le faire échapper au préfixage de locale.

**Architecture:** Le proxy trie par préfixe de chemin : `/admin` court-circuite le handler next-intl et reçoit une redirection optimiste si le cookie de session manque, tout le reste est délégué à next-intl comme aujourd'hui. La vérification qui fait autorité est ailleurs, dans le layout, qui valide la session en base et taint l'objet utilisateur.

**Tech Stack:** Next.js 16 App Router, next-intl 4, Better Auth, Vitest. Versions exactes : `docs/VERSIONS.md`, à relever au moment de l'installation.

**Spec:** `docs/superpowers/specs/espace-admin/05-protection-routes-admin-design.md`

## Global Constraints

- `/admin` ne doit **jamais** être préfixé d'une locale. C'est la première responsabilité de ce sub-project (ADR-021).
- La vérification du proxy **n'est pas une sécurité** : Better Auth l'écrit en majuscules dans son propre exemple. Elle oriente le visiteur, elle n'autorise rien. La sécurité est dans le layout.
- `isAdminPath` ne doit pas se réduire à `startsWith('/admin')` : `/administration` serait classé à tort comme route admin.
- `requiresSession` doit exempter `/admin/login`, faute de quoi la redirection boucle indéfiniment.
- Les drapeaux `experimental.authInterrupts` et `experimental.taint` s'activent dans la **même étape** que le code qui les consomme.
- **Aucun `'use cache'`** dans l'arbre `/admin`, sous peine de devoir contourner la récupération de session (`docs/VERSIONS.md` § Post-MVP > Better Auth).
- **La CSP n'est pas modifiée.** La connexion passe par `authClient.signIn.social()`, donc une navigation JavaScript. Un `<form>` déclencherait `form-action 'self'`, bloqué par Chrome et Safari mais pas par Firefox.
- Le matcher de `src/proxy.ts` est **conservé tel quel** : il exclut déjà `api`, ce qui garde `/api/auth/*` hors du proxy et protège le callback OAuth.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/proxy.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/next-intl/setup.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Qualification des chemins admin

**Files:**
- Create: `src/lib/admin-routes.ts`
- Test: `src/lib/admin-routes.test.ts`

**Interfaces:**
- Consomme : rien.
- Produit : `isAdminPath(pathname: string): boolean` et `requiresSession(pathname: string): boolean`, consommées par le proxy de la Task 2.

> C'est ici que se logerait une erreur silencieuse : une route qui devait être protégée et ne l'est pas, ou une page de connexion inatteignable. D'où l'extraction hors du proxy et les tests.

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
import { describe, expect, it } from 'vitest'

import { isAdminPath, requiresSession } from './admin-routes'

describe('isAdminPath', () => {
  it('reconnaît la racine de l\'espace admin', () => {
    expect(isAdminPath('/admin')).toBe(true)
  })

  it('reconnaît les sous-chemins', () => {
    expect(isAdminPath('/admin/projets')).toBe(true)
    expect(isAdminPath('/admin/login')).toBe(true)
  })

  it('ne confond pas un préfixe avec un segment', () => {
    expect(isAdminPath('/administration')).toBe(false)
    expect(isAdminPath('/adminx')).toBe(false)
  })

  it('ne reconnaît pas les chemins publics', () => {
    expect(isAdminPath('/')).toBe(false)
    expect(isAdminPath('/fr/projets')).toBe(false)
    expect(isAdminPath('/fr/admin')).toBe(false)
  })
})

describe('requiresSession', () => {
  it('exige une session sur la racine et les sous-chemins', () => {
    expect(requiresSession('/admin')).toBe(true)
    expect(requiresSession('/admin/projets')).toBe(true)
  })

  it('exempte la page de connexion', () => {
    expect(requiresSession('/admin/login')).toBe(false)
  })

  it('ne soumet pas le callback OAuth à la vérification', () => {
    expect(requiresSession('/api/auth/callback/google')).toBe(false)
  })
})
```

Le cas `/administration` n'est pas théorique : c'est le piège classique d'un `startsWith` naïf. Et `/fr/admin` doit retourner `false` puisque cette URL ne doit jamais exister.

Le callback OAuth est déjà hors du proxy par le matcher, qui exclut `api`. Le cas est couvert quand même : si quelqu'un réécrit un jour ce matcher, ce test est ce qui rattrape la boucle de redirection au retour de Google, avec un message clair plutôt qu'une erreur de flux OAuth illisible.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run --project unit src/lib/admin-routes.test.ts`
Expected: FAIL, le module `./admin-routes` n'existe pas.

- [ ] **Step 3: Écrire l'implémentation**

```typescript
const ADMIN_ROOT = '/admin'
const LOGIN_PATH = '/admin/login'

export function isAdminPath(pathname: string): boolean {
  return pathname === ADMIN_ROOT || pathname.startsWith(`${ADMIN_ROOT}/`)
}

export function requiresSession(pathname: string): boolean {
  return isAdminPath(pathname) && pathname !== LOGIN_PATH
}
```

Le test d'égalité doublé du séparateur est ce qui écarte `/administration`.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/lib/admin-routes.test.ts`
Expected: PASS, sept cas verts.

---

### Task 2 : Trier dans le proxy

**Files:**
- Modify: `src/proxy.ts`

**Interfaces:**
- Consomme : `isAdminPath` et `requiresSession` de la Task 1, `getSessionCookie` de `better-auth/cookies`.
- Produit : un proxy qui exclut `/admin` du routing i18n et redirige les visiteurs sans cookie.

- [ ] **Step 1: Réécrire `src/proxy.ts`**

```typescript
import { getSessionCookie } from 'better-auth/cookies'
import createMiddleware from 'next-intl/middleware'
import { NextResponse, type NextRequest } from 'next/server'

import { isAdminPath, requiresSession } from '@/lib/admin-routes'
import { routing } from '@/i18n/routing'

const intlHandler = createMiddleware(routing)

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isAdminPath(pathname)) {
    if (requiresSession(pathname) && !getSessionCookie(request)) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    return NextResponse.next()
  }

  return intlHandler(request)
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
```

Le `return NextResponse.next()` est la ligne qui règle la question de la locale : la requête sort de la fonction sans jamais atteindre `intlHandler`, donc rien ne lui ajoute de préfixe.

Ne pas déclarer `export const runtime` : Next 16 rejette tout route segment config dans un fichier proxy.

- [ ] **Step 2: Vérifier que le matcher est inchangé**

Le matcher conserve son exclusion de `api`, sans quoi `/api/auth/callback/google` passerait par le proxy et le retour du flux OAuth casserait avec une erreur difficile à rattacher à sa cause.

- [ ] **Step 3: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 3 : Helper de session et drapeaux expérimentaux

**Files:**
- Create: `src/lib/get-current-user.ts`
- Modify: `next.config.ts`
- Modify: `tsconfig.json`

**Interfaces:**
- Consomme : `auth` de `src/lib/auth.ts` (sub-project `04`).
- Produit : `getCurrentUser()`, consommée par le layout de la Task 4 et, plus tard, par les Server Actions de l'espace admin.

- [ ] **Step 1: Activer les deux drapeaux**

Dans `next.config.ts`, le bloc `experimental` **existe déjà** et porte `globalNotFound: true`. Compléter, ne pas remplacer :

```typescript
  experimental: {
    globalNotFound: true, // existant : le root layout vit sous [locale], ne pas retirer
    authInterrupts: true,
    taint: true,
  },
```

`authInterrupts` autorise `unauthorized()` et le fichier `unauthorized.tsx`. `taint` autorise le Taint API. Les deux sont activés ici parce que c'est l'étape qui les consomme : plus tôt, ils seraient une configuration morte ; plus tard, le build échouerait.

- [ ] **Step 1 bis: Rendre le Taint API typable**

`experimental_taintObjectReference` n'est pas déclaré dans les types par défaut de React : il vit dans `@types/react/experimental.d.ts`, que `tsconfig.json` ne charge pas (son champ `types` est explicite depuis TypeScript 6). Sans ce réglage, le runtime fonctionne mais `just typecheck` échoue sur un `TS2305`.

Le champ `types` de `tsconfig.json` porte déjà `react/canary`, qui ne déclare pas le Taint API : y ajouter `"react/experimental"`, puis vérifier que le typecheck passe avant d'écrire la suite.

- [ ] **Step 2: Écrire le helper**

```typescript
import 'server-only'
import { headers } from 'next/headers'
import { unauthorized } from 'next/navigation'
import { experimental_taintObjectReference } from 'react'

import { auth } from '@/lib/auth'

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) unauthorized()

  experimental_taintObjectReference(
    "N'expose jamais l'objet user complet à un Client Component : sélectionne les champs nécessaires.",
    session.user,
  )

  return session.user
}
```

Le taint ne chiffre ni ne masque rien : il fait échouer le rendu si l'objet traverse la frontière serveur-client. Le message passé en premier argument est celui qu'affichera l'erreur, autant qu'il indique quoi faire.

- [ ] **Step 3: Vérifier que le build accepte les drapeaux**

```bash
just typecheck
```

Expected: aucune erreur. Un drapeau `experimental` inconnu de la version installée produirait un avertissement au démarrage.

---

### Task 4 : Layout protégé, pages et écran d'erreur

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/app/admin/unauthorized.tsx`

**Interfaces:**
- Consomme : `getCurrentUser()` de la Task 3, `authClient` de `src/lib/auth-client.ts` (sub-project `04`).
- Produit : l'arbre `/admin` protégé, consommé par le sub-project `06` qui y installera le shell.

- [ ] **Step 1: Écrire le layout protégé**

**Ce fichier est un root layout, pas un layout imbriqué.** Le seul root layout du dépôt vit sous `src/app/[locale]/layout.tsx` (contrainte next-intl, c'est la raison d'être de `globalNotFound`). L'arbre `src/app/admin/` est hors de ce segment : il n'a donc aucun `<html>`/`<body>` au-dessus de lui, et Next refuse un arbre sans document. Prendre modèle sur `src/app/global-not-found.tsx`, qui rend son propre document pour la même raison : `<html>`, `<body>`, l'import de `globals.css` et le script d'initialisation du thème.

```typescript
import type { ReactNode } from 'react'

import { fontVariables } from '@/lib/fonts'
import { getCurrentUser } from '@/lib/get-current-user'
import { themeInitScript } from '@/lib/theme-script'

import '@/app/globals.css'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await getCurrentUser()

  return (
    <html lang="fr" className={fontVariables} suppressHydrationWarning>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        {children}
      </body>
    </html>
  )
}
```

Relire `src/app/global-not-found.tsx` avant d'écrire ce fichier et en reprendre exactement la forme, script de thème compris : sans lui, l'espace admin s'affiche en clair puis bascule, ce que le scénario de bascule de thème du sub-project `06` sanctionnera. `lang="fr"` est figé, l'espace admin étant monolingue (ADR-021).

Ce layout ne monte aucune navigation : le `LanguageSwitcher` n'a pas de sens ici, et la sidebar arrive au sub-project `06`.

Ne jamais ajouter `'use cache'` dans ce fichier ni dans ses descendants.

- [ ] **Step 2: Écrire la page d'accueil minimale**

```typescript
export default function AdminHomePage() {
  return (
    <main className="p-8">
      <h1 className="font-sans text-2xl font-medium tracking-normal">Espace admin</h1>
    </main>
  )
}
```

Cette page existe pour avoir quelque chose à protéger et vérifier. Le sub-project `06` la remplacera.

- [ ] **Step 3: Écrire la page de connexion**

```typescript
'use client'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="font-sans text-2xl font-medium tracking-normal">Connexion</h1>
      <Button
        onClick={() =>
          authClient.signIn.social({ provider: 'google', callbackURL: '/admin' })
        }
      >
        Continuer avec Google
      </Button>
    </main>
  )
}
```

Un `onClick` et non un `<form>` : une soumission de formulaire suivie d'une redirection vers Google déclencherait `form-action 'self'`, que Chrome et Safari bloquent alors que Firefox l'autorise. Le bug ne se reproduirait donc pas sur toutes les machines.

Cette page est sous `/admin` mais exemptée de session par `requiresSession`, sinon elle serait inatteignable.

- [ ] **Step 4: Écrire la page `unauthorized`**

```typescript
import Link from 'next/link'

export default function Unauthorized() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-sans text-2xl font-medium tracking-normal">Accès non autorisé</h1>
      <p className="text-muted-foreground">
        Cette page nécessite une session valide.
      </p>
      <Link className="text-primary underline underline-offset-2" href="/admin/login">
        Se connecter
      </Link>
    </main>
  )
}
```

**Le placer sous `src/app/admin/unauthorized.tsx`**, et non à la racine de `src/app/`. La frontière `unauthorized()` est levée par le layout admin : le fichier voisin de ce layout hérite du document qu'il rend (`<html>`/`<body>`, `globals.css`). À la racine de `src/app/`, il n'aurait aucun root layout au-dessus de lui et rendrait une page sans styles, quand il ne ferait pas échouer le build.

Hors `[locale]`, il ne peut pas utiliser `useTranslations` et porte donc des libellés français en dur, comme `global-error.tsx` le fait déjà pour la même raison.

« Se connecter » est un lien de contenu, posé dans une phrase de prose : DESIGN.md § Conventions lui impose `text-primary underline underline-offset-2` en permanence. La famille lien d'interface, distinguée par la seule couleur, est réservée à la navigation et aux CTA.

- [ ] **Step 5: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 5 : Vérifier le comportement de bout en bout

**Files:** aucun fichier du dépôt.

**Interfaces:**
- Consomme : tout ce qui précède.
- Produit : la confirmation que la protection tient et que la locale ne s'invite pas.

- [ ] **Step 1: Démarrer l'application**

```bash
just dev
```

- [ ] **Step 2: Vérifier la redirection d'un visiteur anonyme**

En navigation privée, demander `http://localhost:3000/admin`.

Expected: redirection vers `/admin/login`, et l'URL affichée est bien `/admin/login`, **sans** préfixe de locale.

- [ ] **Step 3: Vérifier l'absence de boucle**

Demander directement `http://localhost:3000/admin/login`.

Expected: la page s'affiche, aucune redirection. Une boucle ici signifierait que `requiresSession` n'exempte pas la page de connexion.

- [ ] **Step 4: Vérifier que le site public est intact**

Demander `http://localhost:3000/`.

Expected: redirection vers `/fr` comme avant. Le routing i18n des pages publiques ne doit pas avoir bougé.

- [ ] **Step 5: Vérifier qu'aucune URL admin ne porte de locale**

Demander `http://localhost:3000/fr/admin`.

Expected: une 404. Cette URL ne doit pas exister, puisque `src/app/admin/` vit hors du segment `[locale]`.

- [ ] **Step 6: Mener la connexion**

Depuis `/admin/login`, console navigateur ouverte, lancer la connexion Google avec le compte autorisé.

Expected: retour sur `/admin`, la page d'accueil s'affiche, et **aucune violation de CSP** n'apparaît dans la console. Une violation signalerait que la connexion emprunte un chemin de formulaire au lieu d'une navigation JavaScript.

- [ ] **Step 7: Vérifier le comportement d'un cookie invalide**

Session ouverte, altérer manuellement la valeur du cookie de session dans les outils de développement, puis recharger `/admin`.

Expected: le proxy laisse passer, puisqu'il ne teste que la présence du cookie, et le layout affiche la page `unauthorized`. C'est exactement la répartition voulue : le proxy oriente, le layout tranche.

- [ ] **Step 8: Vérifier que le taint bloque réellement**

Vérification jetable, à défaire aussitôt. Ajouter temporairement dans `src/app/admin/page.tsx` un passage de l'objet complet à un Client Component :

```typescript
// TEMPORAIRE — à supprimer après vérification
'use client'
export function TaintProbe(_props: { user: unknown }) {
  return null
}
```

```typescript
// TEMPORAIRE — à supprimer après vérification
import { getCurrentUser } from '@/lib/get-current-user'
import { TaintProbe } from './taint-probe'

export default async function AdminHomePage() {
  const user = await getCurrentUser()
  return <TaintProbe user={user} />
}
```

Un Client Component jetable, et surtout pas `ThemeToggle` : celui-ci appelle `useTranslations`, or `NextIntlClientProvider` n'est monté que sous `[locale]`. Il échouerait hors de ce segment pour une raison étrangère au Taint API, et la vérification ne prouverait rien.

Expected: le rendu échoue avec l'erreur du Taint API et le message défini dans `getCurrentUser`.

Si la page s'affiche normalement, le taint est inopérant : vérifier que `experimental.taint` est bien actif dans `next.config.ts`.

**Restaurer ensuite `src/app/admin/page.tsx` dans son état du Step 2 de la Task 4.**

- [ ] **Step 9: Lancer la suite de tests**

```bash
just test
```

Expected: tous les tests verts, `admin-routes.test.ts` compris.

- [ ] **Step 10: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): protège les routes /admin et les sort du routing localisé
```
