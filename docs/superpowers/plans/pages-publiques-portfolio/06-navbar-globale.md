# Plan d'implémentation: `06-navbar-globale`

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter `src/components/layout/Navbar.tsx` (logo + nav links localisés avec état actif sur la route courante + branchement du `MobileMenu` Sheet) et factoriser le pattern logo light/dark dans un `BrandLogo` partagé Navbar/Footer (refacto Footer inclus).

**Architecture:** `Navbar` reste Server Component, récupère les labels via `getTranslations('Nav')` côté serveur et les passe à un îlot Client `NavLinks` (besoin de `usePathname` localisé pour l'état actif). Logo via composant Server `BrandLogo` (2 `<Image>` switch CSS pur `dark:hidden` / `hidden dark:block`). `MobileMenu` devient stateful (controlled `Sheet` avec fermeture au clic sur un lien). `NAV_ITEMS` promu dans `src/config/nav-items.ts` (cohérent avec `@/config/social-links` du sub 05).

**Tech Stack:** Next.js 16 App Router + PPR, React 19 (`'use client'` + `useState`), TypeScript 6 strict, next-intl 4.9.1 (`getTranslations` server + `usePathname` client localisé), shadcn/ui (`Sheet`, `SheetContent`, `SheetTrigger`, `SheetTitle`), next-themes (déjà en place via `Providers.tsx`).

**Spec de référence:** [`docs/superpowers/specs/pages-publiques-portfolio/06-navbar-globale-design.md`](../../specs/pages-publiques-portfolio/06-navbar-globale-design.md).

**Rappels projet:**
- `tdd_scope: none` → pas de tests à écrire (UI presentation, pas de règle métier projet testable sous no-lib-test).
- Discipline commit CLAUDE.md : **aucun commit intermédiaire**. Commit unique après Task 8 verte, validé par l'utilisateur.
- **Ordre topologique** : sub 05 doit être implémenté avant sub 06 (le `Footer.tsx` à refacto consomme déjà 2 `<Image>` light/dark via `buildAssetUrl('branding/logo-horizontal-{light,dark}.png')`).
- **Pas de modif DESIGN.md / BRAINSTORM.md** ici : la navbar est déjà documentée dans le mapping composants DESIGN.md, le `BrandLogo` est une factorisation interne sans nouvelle entrée du design system.
- Switch thème dark/light : next-themes ajoute la classe `.dark` sur `<html>` avant hydratation React (script inline) → les classes Tailwind `dark:*` fonctionnent dès le premier render SSR, pas besoin de `useTheme` + pattern `mounted`.
- Convention assets logo (héritée sub 05) : `logo-horizontal-light.png` est le logo conçu pour **fond light** (visible en thème light, masqué en dark via `dark:hidden`). `logo-horizontal-dark.png` est le logo conçu pour **fond dark** (masqué en light, visible en dark via `hidden dark:block`). Le suffixe désigne le **thème de page**, pas la couleur du logo lui-même.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `src/config/nav-items.ts` | Constante `NAV_ITEMS` + type `NavSlug` (source unique de vérité Navbar + MobileMenu) | Créer |
| `src/components/layout/BrandLogo.tsx` | Server, 2 `<Image>` switch CSS dark/light, h-10 par défaut | Créer |
| `src/components/layout/NavLinks.tsx` | Client, `usePathname` + état actif, prop `orientation: 'horizontal' \| 'vertical'` + callback `onLinkClick` | Créer |
| `src/components/layout/Navbar.tsx` | Server, intégration `BrandLogo` + `NavLinks horizontal hidden md:flex`, suppression du TODO ligne 10 | Modifier |
| `src/components/layout/MobileMenu.tsx` | Client, Sheet controlled (`useState` open) + `<NavLinks orientation="vertical" onLinkClick={() => setOpen(false)} />` + `SheetTitle` a11y | Modifier |
| `src/components/layout/Footer.tsx` | Refacto : remplacer les 2 `<Image>` inline par `<BrandLogo />` (DRY, no-regression visuel) | Modifier |
| `messages/fr.json` | Ajout namespace `Nav` (5 clés : `home`, `services`, `projects`, `about`, `contact`) | Modifier |
| `messages/en.json` | Parité stricte EN | Modifier |

---

## Task 1 : Constante `NAV_ITEMS` dans `src/config/`

**Files:**
- Create: `src/config/nav-items.ts`

Source unique de vérité partagée entre `NavLinks` (consommé par Navbar desktop ET MobileMenu mobile). Cohérent avec `src/config/social-links.ts` introduit par sub 05.

- [ ] **Step 1.1 : Créer le fichier**

```typescript
// src/config/nav-items.ts
export const NAV_ITEMS = [
  { slug: 'home', href: '/' },
  { slug: 'services', href: '/services' },
  { slug: 'projects', href: '/projets' },
  { slug: 'about', href: '/a-propos' },
  { slug: 'contact', href: '/contact' },
] as const

export type NavSlug = (typeof NAV_ITEMS)[number]['slug']
```

Notes :
- `as const` + dérivation `typeof` conforme `.claude/rules/typescript/conventions.md`.
- Les `href` sont les routes côté FR (la locale est gérée par `Link` localisé `@/i18n/navigation` qui préfixe `/en` automatiquement en EN sans modifier la valeur source).
- Ordre identique à BRAINSTORM.md § Feature 1 (Accueil → Services → Projets → À propos → Contact).

- [ ] **Step 1.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 2 : Composant `BrandLogo` (Server)

**Files:**
- Create: `src/components/layout/BrandLogo.tsx`

Server Component qui rend le logo horizontal avec switch CSS dark/light. Réutilisé par Navbar (Task 4) et Footer (Task 6 refacto).

- [ ] **Step 2.1 : Créer le composant**

```typescript
// src/components/layout/BrandLogo.tsx
import Image from 'next/image'

import { buildAssetUrl } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function BrandLogo({ className }: Props) {
  return (
    <>
      <Image
        src={buildAssetUrl('branding/logo-horizontal-light.png')}
        alt="Thibaud Geisler"
        width={180}
        height={40}
        className={cn('h-10 w-auto max-w-[200px] object-contain dark:hidden', className)}
      />
      <Image
        src={buildAssetUrl('branding/logo-horizontal-dark.png')}
        alt=""
        width={180}
        height={40}
        className={cn('hidden h-10 w-auto max-w-[200px] object-contain dark:block', className)}
      />
    </>
  )
}
```

Notes :
- 2 `<Image>` rendues dans le même fragment React, l'une masquée par CSS selon le thème. Convention assets : `logo-horizontal-light.png` visible en thème light, `logo-horizontal-dark.png` visible en thème dark (cf. Rappels projet).
- `alt="Thibaud Geisler"` sur le visible light, `alt=""` sur le caché dark (a11y : un seul logo annoncé à la fois grâce au switch CSS, l'autre est purement décoratif).
- `className` prop pour overrides ponctuels (ex: `className="h-12"` si besoin d'une taille différente plus tard). Par défaut h-10 (40 px), aligné avec la version Footer pré-refacto.
- Reste Server Component : zéro hook, zéro JS client, zéro hydration mismatch (cf. `.claude/rules/next-themes/theming.md`).

- [ ] **Step 2.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 3 : Composant `NavLinks` (Client, état actif)

**Files:**
- Create: `src/components/layout/NavLinks.tsx`

Client Component qui rend la liste des nav links avec détection de l'état actif via `usePathname` localisé. Utilisé en orientation `horizontal` par Navbar desktop et `vertical` par MobileMenu mobile.

- [ ] **Step 3.1 : Créer le composant**

```typescript
// src/components/layout/NavLinks.tsx
'use client'

import { Link, usePathname } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { NAV_ITEMS, type NavSlug } from '@/config/nav-items'

type Props = {
  orientation: 'horizontal' | 'vertical'
  labels: Record<NavSlug, string>
  onLinkClick?: () => void
  className?: string
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function NavLinks({ orientation, labels, onLinkClick, className }: Props) {
  const pathname = usePathname()

  const containerClass =
    orientation === 'horizontal'
      ? 'flex items-center gap-6 text-sm font-medium'
      : 'flex flex-col gap-4 pt-6 text-base font-medium'

  return (
    <ul className={cn(containerClass, className)}>
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href)
        return (
          <li key={item.slug}>
            <Link
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'transition',
                active ? 'text-primary' : 'text-foreground hover:text-primary',
              )}
            >
              {labels[item.slug]}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
```

Notes :
- `usePathname` depuis `@/i18n/navigation` retourne le path SANS préfixe locale (ex: `/services` pour `/fr/services` ET `/en/services`) → l'état actif fonctionne identiquement dans les 2 langues.
- `isActive` : `===` strict pour `/` (sinon toutes les routes matcheraient via `startsWith`), `===` ou `startsWith('${href}/')` pour les autres (couvre `/projets/[slug]` qui doit garder "Projets" actif sans qu'un faux match `/services` matche `/services-special` éventuel).
- `onLinkClick` optional : utilisé par MobileMenu (Task 5) pour fermer le Sheet à la sélection. La nav desktop ne le fournit pas.
- `Link` de `@/i18n/navigation` : préfixe automatique de la locale courante côté client.
- Pattern `useFormStatus` enfant non applicable ici, mais `usePathname` au top-level conforme `.claude/rules/react/hooks.md`.

- [ ] **Step 3.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 4 : Update `Navbar.tsx` (BrandLogo + NavLinks horizontal + suppression TODO)

**Files:**
- Modify: `src/components/layout/Navbar.tsx`

Remplacement du TODO ligne 10 par le logo cliquable (retour accueil) + nav links horizontaux cachés en mobile. Récupération des labels Nav côté server, transmission à `NavLinks` Client.

- [ ] **Step 4.1 : Remplacer intégralement le contenu de `src/components/layout/Navbar.tsx`**

```typescript
// src/components/layout/Navbar.tsx
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'

import { Link } from '@/i18n/navigation'

import { BrandLogo } from './BrandLogo'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileMenu } from './MobileMenu'
import { NavLinks } from './NavLinks'
import { ThemeToggle } from './ThemeToggle'

import { type NavSlug } from '@/config/nav-items'

export async function Navbar() {
  const t = await getTranslations('Nav')

  const labels: Record<NavSlug, string> = {
    home: t('home'),
    services: t('services'),
    projects: t('projects'),
    about: t('about'),
    contact: t('contact'),
  }

  return (
    <header className="sticky top-0 z-50 backdrop-blur border-b border-border bg-background/80">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16 gap-6">
        <Link href="/" aria-label={t('home')} className="shrink-0">
          <BrandLogo />
        </Link>

        <NavLinks orientation="horizontal" labels={labels} className="hidden md:flex" />

        <div className="flex items-center gap-2 ml-auto md:ml-0">
          <Suspense fallback={<div className="size-9" />}>
            <LanguageSwitcher />
          </Suspense>
          <ThemeToggle />
          <MobileMenu labels={labels} />
        </div>
      </nav>
    </header>
  )
}
```

Notes :
- **Devient `async`** car `getTranslations('Nav')` est async côté serveur.
- `bg-background/80` ajouté pour que `backdrop-blur` ait quelque chose à blur (la version actuelle n'avait pas de fond → blur invisible sauf si le contenu défilait derrière).
- `Link href="/"` autour du logo : retour accueil, `aria-label={t('home')}` pour le screen reader (sinon le logo est annoncé via son `alt`, mais l'`aria-label` du lien le renforce).
- `shrink-0` sur le `Link` du logo : empêche que le logo se réduise quand l'espace nav est serré (mobile portrait).
- `gap-6` sur le `nav` : espace minimal entre logo, nav links et bloc droit (utile en desktop pour séparer visuellement).
- `ml-auto md:ml-0` sur le bloc droit : en mobile (nav links cachés), le bloc droit prend le `ml-auto` pour pousser à droite. En desktop (nav links visibles), `md:ml-0` annule le `ml-auto` car les nav links centrent déjà.
- `MobileMenu` reçoit maintenant `labels` en prop (passage Server → Client, sérialisable). Le composant utilisera ces labels pour rendre `NavLinks` à l'intérieur du Sheet (Task 5).
- TODO ligne 10 supprimé (résolu).

- [ ] **Step 4.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 5 : Update `MobileMenu.tsx` (Sheet controlled + NavLinks vertical + SheetTitle a11y)

**Files:**
- Modify: `src/components/layout/MobileMenu.tsx`

Remplir le `SheetContent` actuellement vide avec `<NavLinks orientation="vertical" />`. Le Sheet devient controlled pour fermer au clic sur un lien. Ajout d'un `SheetTitle` accessible (sr-only) requis par Radix.

- [ ] **Step 5.1 : Remplacer intégralement le contenu de `src/components/layout/MobileMenu.tsx`**

```typescript
// src/components/layout/MobileMenu.tsx
'use client'

import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

import { type NavSlug } from '@/config/nav-items'

import { NavLinks } from './NavLinks'

type Props = {
  labels: Record<NavSlug, string>
}

export function MobileMenu({ labels }: Props) {
  const t = useTranslations('MobileMenu')
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={t('ariaLabel')}
          className="md:hidden"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle className="sr-only">{t('ariaLabel')}</SheetTitle>
        </SheetHeader>
        <NavLinks
          orientation="vertical"
          labels={labels}
          onLinkClick={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  )
}
```

Notes :
- **Devient stateful** via `useState(false)` pour controller le Sheet. `onOpenChange={setOpen}` propage les ouvertures/fermetures Radix (clic à l'extérieur, Escape, etc.).
- **`SheetTitle` requis par Radix** pour la conformité a11y (sinon warning console). `sr-only` le masque visuellement, le screen reader l'annonce. Réutilise la clé `MobileMenu.ariaLabel` existante (texte court "Menu" / "Menu") plutôt que de créer une nouvelle clé i18n.
- **`onLinkClick={() => setOpen(false)}`** : ferme le Sheet après navigation. UX standard.
- `labels` reçu en prop depuis `Navbar` (Task 4) : évite un double appel `useTranslations('Nav')` côté Navbar et MobileMenu, et garantit la cohérence des labels desktop/mobile.

- [ ] **Step 5.2 : Vérifier que `SheetHeader` et `SheetTitle` sont exportés par `@/components/ui/sheet`**

Commande : `grep -E "export.*Sheet(Header|Title)" src/components/ui/sheet.tsx`
Attendu : 2 matches (SheetHeader et SheetTitle).

Si l'un est absent (devrait pas, sont dans le shadcn par défaut), ajouter via : `pnpm dlx shadcn@latest add sheet --overwrite` puis re-vérifier.

- [ ] **Step 5.3 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 6 : Refacto `Footer.tsx` (remplacer 2 Image par BrandLogo)

**Files:**
- Modify: `src/components/layout/Footer.tsx`

Substitution chirurgicale : remplacer les 2 `<Image>` inline par un seul `<BrandLogo />`. Aucun changement visuel attendu (mêmes assets, mêmes classes CSS via le défaut de `BrandLogo`).

- [ ] **Step 6.1 : Lire l'état actuel pour repérer les lignes exactes**

Commande : `cat src/components/layout/Footer.tsx`

Repérer le bloc `<Image src=...logo-horizontal-light.png... />` puis `<Image src=...logo-horizontal-dark.png... />` (lignes ~19-33 selon état au moment de l'implémentation).

- [ ] **Step 6.2 : Substituer le bloc par `<BrandLogo />`**

Remplacer EXACTEMENT ces lignes :

```typescript
          <Image
            src={buildAssetUrl('branding/logo-horizontal-light.png')}
            alt="Thibaud Geisler"
            width={180}
            height={40}
            className="h-10 w-auto max-w-[200px] object-contain dark:hidden"
          />
          <Image
            src={buildAssetUrl('branding/logo-horizontal-dark.png')}
            alt=""
            width={180}
            height={40}
            className="hidden h-10 w-auto max-w-[200px] object-contain dark:block"
          />
```

par :

```typescript
          <BrandLogo />
```

- [ ] **Step 6.3 : Mettre à jour les imports en haut du fichier**

Retirer (devient inutilisé) :

```typescript
import Image from 'next/image'
import { buildAssetUrl } from '@/lib/assets'
```

Ajouter :

```typescript
import { BrandLogo } from '@/components/layout/BrandLogo'
```

(Conserver tous les autres imports : `Locale`, `getTranslations`, `DownloadCvButton`, `SocialLinks`.)

- [ ] **Step 6.4 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur (les imports `Image` et `buildAssetUrl` ne doivent plus être référencés ailleurs dans `Footer.tsx`).

- [ ] **Step 6.5 : Vérifier qu'aucun autre composant Footer n'utilise encore Image/buildAssetUrl**

Commande : `grep -E "Image|buildAssetUrl" src/components/layout/Footer.tsx`
Attendu : aucun match (les 2 références sont remplacées).

---

## Task 7 : Ajouter le namespace `Nav` dans `messages/fr.json` et `messages/en.json`

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 7.1 : Ajouter le namespace `Nav` à `messages/fr.json`**

Ajouter ce bloc dans `messages/fr.json` (position : à un emplacement cohérent avec l'ordre existant, ex: au début après `HomePage` et avant `ServicesPage`, ou en dernier avant `MobileMenu`/`LanguageSwitcher` selon convention déjà adoptée) :

```json
  "Nav": {
    "home": "Accueil",
    "services": "Services",
    "projects": "Projets",
    "about": "À propos",
    "contact": "Contact"
  },
```

(Veiller à la virgule de clôture entre `Nav` et le namespace suivant.)

- [ ] **Step 7.2 : Ajouter la parité EN à `messages/en.json`**

```json
  "Nav": {
    "home": "Home",
    "services": "Services",
    "projects": "Projects",
    "about": "About",
    "contact": "Contact"
  },
```

- [ ] **Step 7.3 : Vérifier la validité JSON**

Commande : `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`
Attendu : `OK`.

---

## Task 8 : Verification finale

Aucun test automatisé (`tdd_scope: none`). Verification = gates qualité + smoke navigateur (état actif sur chaque route + switch thème + mobile menu).

- [ ] **Step 8.1 : Lint**

Commande : `just lint`
Attendu : 0 error, warnings uniquement préexistants.

- [ ] **Step 8.2 : Typecheck global**

Commande : `just typecheck`
Attendu : 0 erreur.

- [ ] **Step 8.3 : Build**

Commande : `just build`
Attendu : build Next.js OK, toutes les routes listées sans erreur.

- [ ] **Step 8.4 : Smoke test desktop FR: état actif sur chaque route**

1. `just dev` (serveur sur `http://localhost:3000`).
2. Ouvrir `http://localhost:3000/` → la navbar doit afficher : `BrandLogo` (light) à gauche, "Accueil" en `text-primary` (vert sauge), les 4 autres liens en `text-foreground`.
3. Naviguer sur `/services` → "Services" passe en `text-primary`, "Accueil" repasse en `text-foreground`.
4. Naviguer sur `/projets` → "Projets" en `text-primary`.
5. Naviguer sur `/projets/<un-slug>` (case study) → "Projets" reste en `text-primary` (détection `startsWith`).
6. Naviguer sur `/a-propos` → "À propos" en `text-primary`.
7. Naviguer sur `/contact` → "Contact" en `text-primary`.
8. Aucune erreur console, aucun warning React (pas de hydration mismatch).

- [ ] **Step 8.5 : Smoke test desktop EN**

1. Ouvrir `http://localhost:3000/en/services`.
2. La navbar affiche : "Home", "Services", "Projects", "About", "Contact" en EN.
3. "Services" en `text-primary` (l'état actif fonctionne identique en EN car `usePathname` retourne `/services` sans préfixe locale).

- [ ] **Step 8.6 : Smoke test switch thème dark**

1. Cliquer sur le `ThemeToggle` de la navbar pour basculer en dark.
2. Le `BrandLogo` switch de `logo-horizontal-light.png` à `logo-horizontal-dark.png` instantanément (CSS-only, pas de flash).
3. Le footer (qui consomme aussi `BrandLogo` désormais) switch en même temps : aucune régression visuelle vs avant le refacto.
4. Aucune erreur console, aucun warning hydration.

- [ ] **Step 8.7 : Smoke test mobile (`< 768px`)**

1. Redimensionner le viewport à 375px (iPhone) ou utiliser DevTools mode mobile.
2. La navbar affiche : `BrandLogo` à gauche, `LanguageSwitcher` (Globe) + `ThemeToggle` (sun/moon) + bouton hamburger à droite. **Aucun nav link horizontal visible** (`hidden md:flex` actif).
3. Cliquer sur le hamburger → le `Sheet` s'ouvre depuis la droite, contient les 5 nav links en vertical, le lien correspondant à la route courante est en `text-primary`.
4. Cliquer sur un lien (ex: "Services") → le Sheet se ferme automatiquement, la navigation s'effectue, et au retour le lien "Services" est en `text-primary` (cohérent desktop).
5. Aucun warning a11y : le `SheetTitle` sr-only est dans le DOM (vérifier via DevTools : `<h2 class="sr-only">Menu</h2>` ou similaire).

- [ ] **Step 8.8 : Smoke test logo cliquable retour accueil**

1. Sur `/services` (ou n'importe quelle page hors `/`).
2. Cliquer sur le `BrandLogo` dans la navbar.
3. Navigation vers `/` (FR) ou `/en` (EN) selon la locale courante.
4. "Accueil" / "Home" passe en `text-primary`.

- [ ] **Step 8.9 : Smoke test no-regression Footer**

1. Sur n'importe quelle page, scroller jusqu'au footer.
2. Vérifier que le logo affiché est strictement identique à avant le refacto (mêmes dimensions, même switch dark/light).
3. Aucune autre modification visuelle attendue (tagline, location, social links, CV, copyright inchangés).

- [ ] **Step 8.10 : Sanity check `BrandLogo` réutilisé aux 2 endroits**

Commande : `grep -rn "BrandLogo" src/components/layout/`
Attendu : 3 matches au minimum :
- `src/components/layout/BrandLogo.tsx` (definition)
- `src/components/layout/Navbar.tsx` (import + usage)
- `src/components/layout/Footer.tsx` (import + usage)

- [ ] **Step 8.11 : Sanity check `NAV_ITEMS` source unique**

Commande : `grep -rn "NAV_ITEMS" src/`
Attendu : 2 matches :
- `src/config/nav-items.ts` (definition)
- `src/components/layout/NavLinks.tsx` (import + map)

(Aucun autre composant ne doit redéfinir une liste de routes.)

- [ ] **Step 8.12 : Arrêter le serveur dev**

Commande : `just stop`
Attendu : port 3000 libéré.

- [ ] **Step 8.13 : Proposer le commit au user (discipline CLAUDE.md)**

Ne PAS commit automatiquement. Demander à l'utilisateur :

> "Verification complète OK (lint + typecheck + build + smoke desktop FR/EN avec état actif + switch dark/light + mobile menu Sheet + logo cliquable + no-regression Footer + sanity grep BrandLogo/NAV_ITEMS). Je peux committer ce sub-project ? Message suggéré : `feat(navbar): logo + nav links localisés avec état actif + mobile menu, factorisation BrandLogo partagé Navbar/Footer`."

Attendre validation explicite avant `git add` / `git commit`.

---

## Status du spec

La mise à jour du `status` du spec de `draft` vers `implemented` (frontmatter de [`06-navbar-globale-design.md`](../../specs/pages-publiques-portfolio/06-navbar-globale-design.md)) **n'est pas réalisée dans ce plan**. Elle est déléguée au workflow parent `/implement-subproject` (gates `/simplify` + `code/code-reviewer` + mise à jour status après approbation finale).

---

## Self-review

**Spec coverage** (chaque scénario et décision du spec mappé à une task) :
- Scénario 1 (rendu desktop FR avec /services actif) → Tasks 2, 3, 4, 7 + smoke 8.4.
- Scénario 2 (état actif /projets/[slug] via startsWith) → Task 3 (`isActive` avec `startsWith('${href}/')`) + smoke 8.4 point 5.
- Scénario 3 (état actif / strict via `===`) → Task 3 (`isActive` avec `=== '/'` early-return) + smoke 8.4 point 2.
- Scénario 4 (rendu EN) → Task 7.2 + smoke 8.5.
- Scénario 5 (rendu mobile FR) → Task 4 (`hidden md:flex` sur nav links + bloc droit `ml-auto md:ml-0`) + Task 5 (Sheet `md:hidden` hérité de l'attribut sur SheetTrigger) + smoke 8.7 point 2.
- Scénario 6 (MobileMenu open/close) → Task 5 (`useState` + `onLinkClick`) + smoke 8.7 points 3-4.
- Scénario 7 (logo cliquable retour accueil) → Task 4 (`Link href="/"` autour du logo) + smoke 8.8.
- Scénario 8 (Footer refacto no-regression) → Task 6 + smoke 8.9.
- Scénario 9 (SSR thème no flash) → Task 2 (BrandLogo CSS-only switch) + smoke 8.6.
- Scénario 10 (a11y nav links + SheetTitle) → Task 5 (`SheetTitle sr-only`) + smoke 8.7 point 5.
- Edge case "route inconnue 404" → Task 3 (aucun lien match → tous foreground, comportement implicite via `isActive` qui retourne false partout).
- Edge case "lien externe / anchor" → hors scope MVP (note dans spec, pas de task).
- Edge case "JS désactivé" → Task 3 (Server-rendered HTML contient déjà `text-primary` sur le bon lien, fonctionne sans hydration ; le Sheet ne s'ouvre pas mais switches/logo restent fonctionnels).
- Edge case "next-themes flash initial" → Task 2 (CSS-only, immune).
- Edge case "NAV_ITEMS muté HMR dev" → Task 1 (`as const`, aucun side-effect).
- Edge case "locale fallback" → middleware next-intl déjà en place (hors scope).
- Décision archi A (`NavLinks` Client) → Task 3 (`'use client'` + `usePathname` localisé).
- Décision archi B (pas de CTA persistant) → Task 4 (bloc droit ne contient que LanguageSwitcher + ThemeToggle + MobileMenu).
- Décision archi C (Sheet = nav links seulement, switches en navbar mobile) → Task 5 (SheetContent ne contient que `<NavLinks>`, pas LanguageSwitcher/ThemeToggle).
- Décision archi D (état actif couleur primary) → Task 3 (`active ? 'text-primary' : 'text-foreground hover:text-primary'`).
- Décision archi E (`NAV_ITEMS` dans `src/config/`) → Task 1.
- Décision archi F (refacto Footer dans le même sub-project) → Task 6 + smoke 8.9.

**Placeholder scan** : aucun `TBD` / `TODO` / `à définir` / `implement later`. Le seul TODO mentionné est dans le code source actuel de `Navbar.tsx` ligne 10, supprimé par Task 4 Step 4.1.

**Type consistency** :
- `NavSlug = 'home' | 'services' | 'projects' | 'about' | 'contact'` (Task 1) ↔ `Record<NavSlug, string>` labels (Task 3, Task 4, Task 5) : cohérent.
- `NAV_ITEMS` exporté depuis `@/config/nav-items` (Task 1) ↔ import Task 3 (`NavLinks`) : cohérent.
- `BrandLogo` exporté depuis `@/components/layout/BrandLogo` (Task 2) ↔ imports Task 4 (Navbar) et Task 6 (Footer) : cohérent.
- `NavLinks` exporté depuis `@/components/layout/NavLinks` (Task 3) ↔ imports Task 4 (Navbar) et Task 5 (MobileMenu) : cohérent.
- Props `MobileMenu` `{ labels: Record<NavSlug, string> }` (Task 5) ↔ appel Task 4 (`<MobileMenu labels={labels} />`) : cohérent.
- Clés i18n `Nav.{home, services, projects, about, contact}` (Task 7) ↔ appels `t(...)` Task 4 et `labels[item.slug]` Task 3 : cohérent.

Aucune divergence détectée.

---

## Execution Handoff

Plan sauvegardé dans [`docs/superpowers/plans/pages-publiques-portfolio/06-navbar-globale.md`](./06-navbar-globale.md).

Deux options d'exécution lorsqu'on passera à l'implémentation :

1. **Subagent-Driven (recommandé)**, `superpowers:subagent-driven-development` dispatch un subagent frais par task, review entre tasks. Aligné avec `/implement-subproject` qui intègre `/simplify` et `code/code-reviewer` comme gates.
2. **Inline Execution**, `superpowers:executing-plans`, batch avec checkpoints dans la session courante.

Pas d'exécution dans le cadre de `/decompose-feature` : la phase d'implémentation est déclenchée via `/implement-subproject pages-publiques-portfolio 06`.
