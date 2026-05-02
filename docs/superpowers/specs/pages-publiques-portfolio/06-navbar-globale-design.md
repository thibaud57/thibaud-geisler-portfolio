---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "navbar-globale"
goal: "Compléter la Navbar globale (logo + nav links localisés avec état actif + branchement MobileMenu) et factoriser le pattern logo light/dark dans un composant BrandLogo partagé Navbar/Footer."
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["05-footer-global-design.md"]
date: "2026-04-26"
---

# Navbar globale : Logo, nav links localisés, mobile menu

## Scope

Étendre `src/components/layout/Navbar.tsx` existant (actuellement minimal : sticky header + `LanguageSwitcher` + `ThemeToggle` + un TODO commenté `logo + nav links`) pour livrer une navbar complète sur toutes les pages publiques. Layout desktop : `[BrandLogo] [NavLinks horizontal] ... [LanguageSwitcher] [ThemeToggle]`. Layout mobile : `[BrandLogo] ... [LanguageSwitcher] [ThemeToggle] [MobileMenu hamburger]`. Le hamburger ouvre un Sheet shadcn (déjà câblé dans `MobileMenu.tsx`) qui contient les mêmes nav links en vertical. État actif des liens via `usePathname` localisé : couleur `text-primary` (vert sauge) sur le lien correspondant à la route courante, `text-foreground hover:text-primary transition` sur les autres.

Promotion du pattern logo light/dark vers un composant partagé `src/components/layout/BrandLogo.tsx` (2× `<Image>` avec `dark:hidden` / `hidden dark:block`), refactoré dans le même sub-project depuis `Footer.tsx` (sub 05), Navbar et Footer consomment la même source de vérité.

Promotion de la liste des nav items vers une constante TS `src/config/nav-items.ts` (cohérent avec `@/config/social-links` introduit par sub 05) : source unique de vérité pour la navbar desktop ET le mobile menu.

**Exclu** : modification de `LanguageSwitcher.tsx` ou `ThemeToggle.tsx` (déjà fonctionnels et hors scope). Logique chatbot RAG (post-MVP). CTA "Parlons de votre projet" persistant dans la navbar (intentionnellement abandonné : les pages ont déjà leurs propres CTA contact, le lien "Contact" dans la nav suffit). Logo vertical (réservé à un usage hero / sticker éventuel post-MVP, pas dans la navbar). Sub-page formations dédiée (BRAINSTORM.md : `/services` couvre le besoin MVP).

### État livré

À la fin de ce sub-project, on peut : naviguer sur n'importe quelle page publique (FR et EN), voir le logo horizontal qui s'adapte automatiquement au thème (dark/light) à gauche de la navbar, voir les 5 liens (Accueil / Services / Projets / À propos / Contact) au centre-droite avec le lien correspondant à la route courante affiché en `text-primary`, switcher la langue et le thème via les contrôles existants à droite, et sur mobile (`<md`) ouvrir un Sheet via le hamburger qui affiche les mêmes liens en vertical (avec fermeture au clic sur un lien). Le `Footer` consomme désormais `<BrandLogo />` à la place de ses 2 `<Image>` inline (refacto DRY, aucun changement visuel).

## Dependencies

- `05-footer-global-design.md` (statut: implemented), ce sub-project refacto `Footer.tsx` pour consommer le nouveau `BrandLogo`. L'ordre topologique (05 puis 06) garantit que la duplication light/dark à refactorer existe au moment de la promotion.

Éléments déjà livrés hors feature, réutilisés sans modification : `LanguageSwitcher.tsx` (sub-project `support-multilingue/06-selecteur-langue`, statut: implemented), `ThemeToggle.tsx` (bootstrap layout, opérationnel), `Sheet` shadcn (`src/components/ui/sheet.tsx`), `Link` localisé `@/i18n/navigation`, `usePathname` localisé `@/i18n/navigation`, `next/image`, `cn()` `@/lib/utils`. Helper `buildAssetUrl` `src/lib/assets.ts` réutilisé par `BrandLogo`.

## Files touched

- **À créer** : `src/components/layout/BrandLogo.tsx` (Server Component, 2 `<Image>` avec switch CSS dark/light)
- **À créer** : `src/components/layout/NavLinks.tsx` (Client Component, `usePathname` + état actif, prop `orientation: 'horizontal' | 'vertical'`)
- **À créer** : `src/config/nav-items.ts` (constante `NAV_ITEMS` + type `NavSlug`)
- **À modifier** : `src/components/layout/Navbar.tsx` (intégration `BrandLogo` + `NavLinks` desktop + suppression du TODO ligne 10)
- **À modifier** : `src/components/layout/MobileMenu.tsx` (remplir le `SheetContent` vide avec `<NavLinks orientation="vertical" />` + fermeture au clic via `useState` + `Sheet open` controlled)
- **À modifier** : `src/components/layout/Footer.tsx` (remplacer les 2 `<Image>` light/dark par `<BrandLogo />`, refacto DRY sans changement visuel)
- **À modifier** : `messages/fr.json` (ajout du namespace `Nav` : `home`, `services`, `projects`, `about`, `contact`)
- **À modifier** : `messages/en.json` (parité stricte du namespace `Nav`)

## Architecture approach

- **`BrandLogo.tsx` (Server)** : sans props (taille fixe MVP, prop `size?: 'sm' | 'md' | 'lg'` ajoutable plus tard si besoin, YAGNI). Rend 2 `<Image>` côte à côte, l'une masquée par CSS selon le thème. Sources `/api/assets/branding/logo-horizontal-{dark,light}.png` (mêmes assets que ceux uploadés par sub 05). `width=180`, `height=40`, `className="h-10 w-auto max-w-[200px] object-contain"` + `dark:hidden` / `hidden dark:block`. `alt="Thibaud Geisler"` sur le visible (light), `alt=""` sur le caché (dark, décoratif, un seul est annoncé par les lecteurs d'écran à un instant T grâce à la classe `.dark` qui swap les visibilités). `buildAssetUrl()` depuis `src/lib/assets.ts`. Voir `.claude/rules/nextjs/server-client-components.md` et `.claude/rules/next-themes/theming.md` (CSS-only switch, pas de pattern `mounted`, pas de hydration mismatch).
- **`NavLinks.tsx` (Client `'use client'`)** : reçoit `orientation: 'horizontal' | 'vertical'` + `labels: Record<NavSlug, string>` + optional `onLinkClick?: () => void`. Le hook `usePathname` (depuis `@/i18n/navigation`, retourne le path SANS préfixe locale) est requis → composant Client. Itère sur `NAV_ITEMS`, rend pour chaque entrée un `<Link href={item.href}>` localisé. Détection actif : `pathname === item.href` pour `/` exact, `pathname.startsWith(item.href)` pour les autres (couvre `/projets/[slug]` qui doit garder "Projets" actif). Style actif : `text-primary`. Style par défaut : `text-foreground hover:text-primary transition`. Layout horizontal : `flex items-center gap-6 text-sm font-medium`. Layout vertical : `flex flex-col gap-4 text-base font-medium pt-6` (tap target plus large pour mobile). Le callback `onLinkClick` est invoqué dans le `onClick` de chaque Link (utilisé par `MobileMenu` pour fermer le Sheet à la sélection). Voir `.claude/rules/react/hooks.md` et `.claude/rules/next-intl/translations.md`.
- **`src/config/nav-items.ts`** : exporte `NAV_ITEMS` en constante TS `as const`, chaque entrée `{ slug: 'home' | 'services' | 'projects' | 'about' | 'contact', href: '/' | '/services' | '/projets' | '/a-propos' | '/contact' }`. Type `NavSlug = (typeof NAV_ITEMS)[number]['slug']` exporté pour le typage de `labels` dans `NavLinks`. Cohérent avec `src/config/social-links.ts` introduit par sub 05 (convention `src/config/` pour les constantes partagées cross-feature). Voir `.claude/rules/typescript/conventions.md`.
- **`Navbar.tsx`** : reste Server Component. Récupère les labels via `getTranslations('Nav')` côté serveur, les passe en prop à `NavLinks`. Layout : `<header className="sticky top-0 z-50 backdrop-blur border-b border-border bg-background/80">` (le `bg-background/80` ajouté pour que le backdrop blur ait quelque chose à blur, la version actuelle n'en a pas). Container `nav` standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16`. Structure interne : `<BrandLogo />` (gauche, prend `<Link href="/">` autour pour cliquable retour accueil), puis `<NavLinks orientation="horizontal" labels={...} className="hidden md:flex" />` (caché en mobile), puis le bloc de droite `<div className="flex items-center gap-2">` qui contient `LanguageSwitcher` + `ThemeToggle` + `MobileMenu` (le hamburger est déjà `md:hidden` dans MobileMenu.tsx, OK). Suppression du TODO ligne 10. Voir `.claude/rules/tailwind/conventions.md` (container, tokens sémantiques) et `.claude/rules/nextjs/server-client-components.md`.
- **`MobileMenu.tsx`** : devient stateful (`useState` pour controller le Sheet `open`). Le `SheetContent` reçoit le bloc `<NavLinks orientation="vertical" labels={...} onLinkClick={() => setOpen(false)} />`. Les labels sont passés en props (le composant reste Client mais reçoit les traductions du parent Server `MobileMenu` ? Non, `MobileMenu` est déjà Client, il appelle `useTranslations('Nav')` directement). `SheetTitle` accessible (requis par Radix pour a11y) : ajouter un titre visuellement masqué via `<VisuallyHidden>` ou `<SheetHeader>` `<SheetTitle>` avec `sr-only`. Voir `.claude/rules/react/hooks.md` (`useState` + `useTranslations` patterns).
- **Refacto `Footer.tsx`** : remplacer le bloc des 2 `<Image>` light/dark (lignes ~19-32) par un simple `<BrandLogo />`. Aucun changement de comportement visuel (mêmes assets, mêmes classes). Le `Link` href="/" autour du logo dans le footer reste à voir : aujourd'hui le logo Footer n'est pas cliquable, donc on garde `<BrandLogo />` nu (cohérence avec le comportement existant). Si on veut le rendre cliquable plus tard, ce sera un changement à part.
- **i18n `Nav`** : structure flat `{ home, services, projects, about, contact }` dans `messages/{fr,en}.json` au même niveau que `Footer`, `ContactPage`, etc. Valeurs FR : "Accueil", "Services", "Projets", "À propos", "Contact". Valeurs EN : "Home", "Services", "Projects", "About", "Contact". Voir `.claude/rules/next-intl/translations.md`.
- **Aucune modification de `DESIGN.md` dans ce sub-project** : la navbar est déjà documentée dans le mapping composants (`Navbar, Mobile Menu | shadcn/ui (NavigationMenu, Sheet)`) et le layout sticky avec backdrop blur est mentionné dans § Layout & Espacement. Le composant `BrandLogo` est une factorisation interne, pas une nouvelle entrée du design system.

## Acceptance criteria

### Scénario 1 : rendu desktop FR avec route /services active
**GIVEN** un visiteur navigue sur `/services` en FR sur viewport `≥ 768px`
**WHEN** la page est rendue
**THEN** la navbar sticky affiche à gauche le `BrandLogo` horizontal (light en thème light, dark en thème dark via classes CSS)
**AND** au centre-droite affiche les 5 liens "Accueil", "Services", "Projets", "À propos", "Contact" avec le lien "Services" en `text-primary` (vert sauge)
**AND** les autres liens sont en `text-foreground` avec `hover:text-primary transition`
**AND** à droite : `LanguageSwitcher` (Globe icon) + `ThemeToggle` (sun/moon)
**AND** aucun bouton hamburger visible (`md:hidden` actif)
**AND** aucune erreur console, aucun warning React

### Scénario 2 : état actif sur route paramétrée /projets/[slug]
**GIVEN** un visiteur navigue sur `/projets/portfolio-thibaud-geisler` (case study)
**WHEN** la navbar évalue l'état actif
**THEN** le lien "Projets" est rendu en `text-primary` (la détection utilise `pathname.startsWith('/projets')`, pas l'égalité stricte)
**AND** les autres liens restent en `text-foreground`

### Scénario 3 : état actif sur route racine /
**GIVEN** un visiteur navigue sur `/` (accueil)
**WHEN** la navbar évalue l'état actif
**THEN** le lien "Accueil" est rendu en `text-primary`
**AND** les autres liens restent en `text-foreground` (la détection `pathname === '/'` empêche que les autres liens matchent par `startsWith`, sinon "/" serait toujours actif)

### Scénario 4 : rendu EN
**GIVEN** un visiteur navigue sur `/en/services`
**WHEN** la navbar est rendue
**THEN** les labels affichent "Home", "Services", "Projects", "About", "Contact" en anglais
**AND** "Services" reste en `text-primary` (l'état actif s'évalue sur le `pathname` non-localisé via `usePathname` de `@/i18n/navigation`)

### Scénario 5 : rendu mobile FR
**GIVEN** un visiteur navigue sur viewport `< 768px`
**WHEN** la page est rendue
**THEN** la navbar affiche : `BrandLogo` à gauche, `LanguageSwitcher` + `ThemeToggle` + bouton hamburger à droite
**AND** les nav links horizontaux sont masqués (`hidden md:flex` actif)
**AND** aucun lien n'est dupliqué visuellement (les nav links sont uniquement dans le Sheet, ouvrable au clic)

### Scénario 6 : MobileMenu : ouverture, navigation, fermeture
**GIVEN** un visiteur sur mobile clique sur le hamburger
**WHEN** le `Sheet` s'ouvre depuis la droite
**THEN** le `SheetContent` affiche les 5 nav links en vertical (`flex flex-col gap-4`) avec l'état actif identique à la version desktop
**AND** un `SheetTitle` accessible est présent (sr-only ou visible) pour la conformité Radix
**WHEN** le visiteur clique sur un lien (ex: "Projets")
**THEN** le `Sheet` se ferme (`onLinkClick` callback déclenche `setOpen(false)`) et la navigation vers `/projets` s'effectue
**AND** au retour sur la page, le lien "Projets" est en `text-primary` (cohérent desktop/mobile)

### Scénario 7 : logo cliquable retourne à l'accueil
**GIVEN** un visiteur sur n'importe quelle page (`/services`, `/projets/[slug]`, etc.)
**WHEN** il clique sur le `BrandLogo` dans la navbar
**THEN** la navigation cible `/` (accueil), localisée selon la locale courante (`/` en FR, `/en` en EN)

### Scénario 8 : Footer refacto BrandLogo (no regression)
**GIVEN** un visiteur scrolle jusqu'au footer sur n'importe quelle page
**WHEN** le footer est rendu
**THEN** le logo affiché est strictement identique à la version pré-refacto (mêmes assets, mêmes dimensions, même switch dark/light via CSS)
**AND** le code source de `Footer.tsx` ne contient plus les 2 `<Image>` inline mais un unique `<BrandLogo />`

### Scénario 9 : SSR et thème (no flash)
**GIVEN** un visiteur charge initialement une page (FCP)
**WHEN** la navbar est rendue côté serveur
**THEN** le `BrandLogo` affiche les 2 `<Image>` HTML, classes Tailwind `dark:hidden` / `hidden dark:block` appliquées
**AND** le script inline next-themes applique la classe `.dark` sur `<html>` avant l'hydratation React → un seul logo est visible dès le premier paint, aucun flash inter-thèmes

### Scénario 10 : a11y nav links
**GIVEN** un utilisateur navigue au clavier (Tab)
**WHEN** le focus traverse la navbar
**THEN** chaque nav link est focusable, le focus ring (`ring-ring`) est visible (style shadcn par défaut hérité de Tailwind reset)
**AND** le hamburger en mobile expose `aria-label="Menu"` (déjà présent dans `MobileMenu.tsx` actuel)
**AND** le `SheetTitle` à l'intérieur du Sheet annonce la nature du panneau aux lecteurs d'écran

## Edge cases

- **Route inconnue (404)** : `usePathname` retourne le path de la page 404 (`/_not-found` ou similaire). Aucun nav link ne match → tous restent en `text-foreground`. Comportement cohérent (pas de fausse mise en avant).
- **Lien externe ou anchor (#section)** : non couvert MVP, `NAV_ITEMS` ne contient que des routes internes. Si on ajoute plus tard un lien externe (blog post-MVP), ajouter une prop `external?: boolean` à l'item config et conditionner le rendu (`<a target="_blank">` au lieu de `<Link>`).
- **JS désactivé côté visiteur** : `NavLinks` est Client mais le HTML rendu côté SSR contient déjà les bons liens et les bonnes classes. L'état actif est calculé au render serveur (le composant Client reçoit le HTML pré-rendu avec `text-primary` sur le bon lien). Pas de dégradation. Le `MobileMenu` Sheet ne s'ouvre pas sans JS (Radix requiert JS), mais en mobile sans JS le visiteur peut quand même voir le logo et les contrôles thème/langue, et naviguer en passant par les liens en pied de page (footer non couvert ici).
- **next-themes flash initial avant hydratation** : le pattern `BrandLogo` 2 images CSS-only est immune (déjà validé par sub 05 footer). Pas de risque hydration mismatch.
- **NAV_ITEMS muté à chaud (HMR dev)** : aucun impact runtime, `NAV_ITEMS` est `as const`, les composants se re-render normalement au save.
- **Locale fallback (visiteur sans header Accept-Language)** : le middleware next-intl redirige vers `/fr` (locale par défaut). Aucun impact sur la nav active.

## Architectural decisions

### Décision : `NavLinks` Client vs Server Component avec passage de pathname en prop

**Options envisagées :**
- **A. `NavLinks` Client (`'use client'`)** : utilise `usePathname` (hook Client) directement. Le composant est un îlot Client à l'intérieur d'une Navbar Server. Reçoit les `labels` traduits en props depuis le Server parent.
- **B. `NavLinks` Server, pathname passé en prop** : le Server parent (`Navbar`) lit le `pathname` quelque part (ex: `next/headers`) et le passe en prop. Mais Next.js 16 ne fournit pas de `pathname` côté serveur dans les Server Components (`headers()` retourne le path de la requête mais sans la locale strippée).
- **C. Tout `Navbar` en Client** : option lourde, perd les bénéfices RSC (rendu Server, bundle JS minimal).

**Choix : A**

**Rationale :**
- `usePathname` de `@/i18n/navigation` est explicitement conçu pour le client et retourne le path sans préfixe locale (ce qu'on veut pour matcher `/services`, pas `/fr/services`).
- L'îlot Client est minimal (juste `NavLinks`, pas toute la Navbar). Bundle JS impact négligeable.
- Pattern documenté dans `.claude/rules/nextjs/server-client-components.md` : "Placer `'use client'` le plus bas possible (leaf client component)".
- Option B impossible proprement avec les helpers next-intl actuels. Option C sur-ingénierie.

### Décision : pas de CTA bouton "Parlons de votre projet" dans la navbar

**Options envisagées :**
- **A. Pas de CTA persistant**, juste les nav links.
- **B. CTA primary "Parlons de votre projet" à droite** (push conversion).
- **C. CTA outline "Contact" plus subtil**.

**Choix : A**

**Rationale :**
- Le portfolio a déjà des CTA contact dans plusieurs pages (hero accueil, ServiceCards `Parler de mon besoin IA` / `Discuter de mon projet` / `Organiser une formation`, footer). Un CTA persistant en navbar serait redondant.
- Le lien "Contact" dans la nav est déjà cliquable (et passe en `text-primary` quand on est sur /contact).
- Garde la navbar légère et professionnelle, cohérent avec le ton DESIGN.md (intensité subtile, le contenu prime sur l'effet).

### Décision : MobileMenu sheet contient nav links seulement vs tout (theme + langue inclus)

**Options envisagées :**
- **A. Sheet = nav links seulement**, `LanguageSwitcher` + `ThemeToggle` restent visibles dans la navbar mobile à droite du hamburger.
- **B. Sheet = nav links + LanguageSwitcher + ThemeToggle**, navbar mobile minimaliste `[Logo] [Hamburger]`.

**Choix : A**

**Rationale :**
- Pattern dominant sur mobile : switches thème/langue accessibles en 1 tap, sans ouvrir le menu.
- La navbar mobile n'est pas surchargée : `[Logo (180px max)] [Globe (36px)] [Sun/Moon (36px)] [Hamburger (36px)]` tient bien dans 375px (iPhone min).
- Cohérence visuelle desktop/mobile : les contrôles transverses sont toujours au même endroit.

### Décision : état actif : couleur primary vs underline vs pill

**Options envisagées :**
- **A. Couleur primary** : `text-primary` sur l'actif, `text-foreground hover:text-primary transition` sur les autres.
- **B. Underline `border-b-2 border-primary`** sur l'actif.
- **C. Pill `bg-primary/10 text-primary rounded-md px-3 py-1`** sur l'actif.

**Choix : A**

**Rationale :**
- Validé visuellement par le user via mockup HTML standalone (3 variantes côte à côte rendues dans le browser).
- Le plus sobre, cohérent avec le ton "professionnel" du portfolio. La couleur primary sauge est suffisamment distinctive.
- Underline (B) ajoute du chrome visuel proche du `border-b border-border` de la navbar elle-même. Pill (C) trop marqué pour une nav top-level (plus adapté à des tabs internes, ex: filtres `/projets`).

### Décision : `NAV_ITEMS` dans `src/config/` vs constante locale dans `Navbar.tsx`

**Options envisagées :**
- **A. Module partagé `src/config/nav-items.ts`** : importé par `NavLinks` (utilisé par Navbar desktop et MobileMenu mobile).
- **B. Constante locale dans `NavLinks.tsx`** : juste un seul consommateur si on factorise bien.

**Choix : A**

**Rationale :**
- Cohérent avec la convention `src/config/` introduite par sub 05 (`@/config/social-links`). Aligné `.claude/rules/typescript/conventions.md`.
- Permet à d'autres composants futurs (sitemap.xml dynamique en Feature 5 SEO, ou un composant de breadcrumb) de réutiliser la même source de vérité.
- Coût négligeable (1 fichier, ~15 lignes).

### Décision : refacto Footer dans le même sub-project vs sub-project séparé

**Options envisagées :**
- **A. Refacto Footer inclus dans sub 06** : extraction de `BrandLogo` motivée par le besoin Navbar, application immédiate au Footer dans le même commit.
- **B. Sub-project séparé `07-refacto-brand-logo`** : isole le refacto.

**Choix : A**

**Rationale :**
- Le refacto Footer est trivial (10 lignes remplacées par 1 `<BrandLogo />`), sans risque de régression (mêmes assets, mêmes classes CSS).
- La motivation du refacto est exactement le besoin Navbar → cohérent que les 2 changements vivent dans le même commit.
- Sub-project séparé serait du sur-process pour 10 lignes.
- Le code-reviewer du sub 05 avait explicitement flagué cette duplication "à factoriser dès que la Navbar viendrait" → on tient cet engagement.
