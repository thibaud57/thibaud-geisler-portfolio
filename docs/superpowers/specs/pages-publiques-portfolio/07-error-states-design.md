---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "error-states"
goal: "Refactor design des 3 pages d'erreur App Router (not-found, error, global-error) pour cohérence avec DESIGN.md, et ajout d'un not-found.tsx racine pour catch les URLs hors locale"
status: "draft"
complexity: "S"
tdd_scope: "none"
depends_on: ["05-footer-global-design.md", "06-navbar-globale-design.md"]
date: "2026-04-28"
---

# Pages d'erreur — design cohérent + fallback racine hors locale

## Scope

Refactor des 3 fichiers spéciaux App Router actuellement en placeholder textuel minimaliste : `src/app/[locale]/not-found.tsx`, `src/app/[locale]/error.tsx`, `src/app/global-error.tsx`. Livrer un design cohérent avec DESIGN.md (icônes Lucide, tokens CSS, typography display, CTA retour home, intégration `PageShell` pour les versions locale). Créer en plus `src/app/not-found.tsx` racine, absent aujourd'hui, pour catch les URLs hors locale (ex: `/foo`, `/wp-admin`) qui tombent actuellement sur le not-found Next.js par défaut (page brute non localisée).

**Exclu** : intégration Sentry (post-MVP, déjà tracée par `// TODO post-MVP : envoyer error à Sentry` dans `error.tsx` et `global-error.tsx`), illustrations SVG/images custom (icône Lucide suffit pour MVP), pages légales `/mentions-legales` et `/confidentialite` (Feature 7 conformité-legale), correction du status code HTTP 404 → 200 sur `/[locale]/projets/[slug]` inexistant (comportement framework Next 16 + `'use cache'`, indépendant du design — à traiter dans un follow-up Next.js séparé).

### État livré

À la fin de ce sub-project, on peut :
- visiter `/fr/projets/inconnu-xxx` ou `/en/projets/inconnu-xxx` et voir une page 404 stylée (icône Lucide, titre 404 en `font-display`, message + description localisés, bouton CTA "Retour à l'accueil" qui redirige vers `/<locale>`), cohérente avec le reste du site (Navbar sticky + Footer global hérités de `[locale]/layout.tsx`, container `max-w-7xl`, tokens CSS adaptés dark/light) ;
- visiter `/foo-random` ou `/wp-admin` (URL hors locale) et voir une page 404 racine fallback en français, design sobre minimal autonome (sans header/footer puisque hors `[locale]/layout.tsx`), CTA `<a href="/fr">` hardcoded ;
- déclencher une erreur runtime dans une page locale (throw côté Server Component) et voir une page `error.tsx` stylée (icône Lucide, message localisé, bouton "Réessayer" conservé + CTA "Retour à l'accueil" additionnel) ;
- déclencher une erreur critique (next-intl crash) et voir `global-error.tsx` stylé minimal (FR/EN hardcoded conservé via `useSyncExternalStore`, icône inline, classes Tailwind appliquées, bouton retry + lien retour vers `/<locale>`).

## Dependencies

- `05-footer-global-design.md` (statut: implemented) — les pages d'erreur du locale héritent automatiquement du `Footer` mounté dans `[locale]/layout.tsx`. Doit être livré pour cohérence visuelle bottom de page.
- `06-navbar-globale-design.md` (statut: implemented) — idem pour la `Navbar` sticky héritée du même layout (logo, nav, theme toggle, language switcher).

## Files touched

- **À créer** : `src/app/not-found.tsx` (fallback racine pour URLs hors locale, autonome hors `NextIntlClientProvider`, FR par défaut)
- **À modifier** : `src/app/[locale]/not-found.tsx` (refactor design : `PageShell`, icône Lucide `SearchX`, description + CTA localisés, metadata `noindex`)
- **À modifier** : `src/app/[locale]/error.tsx` (refactor design : `PageShell`, icône Lucide `AlertCircle`, message + bouton retry conservé, CTA retour home additionnel)
- **À modifier** : `src/app/global-error.tsx` (refactor design minimal stylé : icône Lucide inline, classes Tailwind sur layout autonome, conserve `useSyncExternalStore` + messages FR/EN hardcodés)
- **À modifier** : `messages/fr.json` (extension namespace `NotFound` : ajout `description`, `ctaLabel`. Extension namespace `ErrorPage` : ajout `description`, `ctaLabel`)
- **À modifier** : `messages/en.json` (parité stricte des deux extensions)

## Architecture approach

- **Server Component pour `[locale]/not-found.tsx`** : aucune interactivité, `getTranslations` async pour résoudre les clés `NotFound.title`, `NotFound.message`, `NotFound.description`, `NotFound.ctaLabel`. Pas de `generateMetadata` async (pas de `params` à attendre dans une page not-found Next.js) — utiliser un export statique `export const metadata: Metadata = { title: '404', robots: { index: false, follow: false } }` pour empêcher l'indexation. Voir `.claude/rules/nextjs/server-client-components.md` et `.claude/rules/nextjs/metadata-seo.md`.
- **Server Component pour `app/not-found.tsx` racine** : vit hors `NextIntlClientProvider`, hors fonts `next/font` du `[locale]/layout.tsx`, hors theme provider. Strings hardcodées en français (locale par défaut, `routing.defaultLocale = 'fr'`). Markup minimal sobre `<main>` + `<h1>` + `<p>` + `<a href="/fr">`. Pas de `PageShell` (dépendrait des fonts non chargées). Pas de tests. Voir décision architecturale ci-dessous.
- **Client Component pour `[locale]/error.tsx`** : `'use client'` obligatoire (Error Boundary Next.js). Conserve la signature exacte `({ error, reset }: { error: Error & { digest?: string }; reset: () => void })` et le commentaire `// TODO post-MVP : envoyer error à Sentry` + `void error`. Utilise `useTranslations('ErrorPage')` (provider monté par `[locale]/layout.tsx`). Bouton primaire `Button` shadcn/ui (`onClick={reset}`) + bouton secondaire `<Link href="/" />` (`@/i18n/navigation`) en `variant="outline"`. Voir `.claude/rules/next-intl/translations.md`.
- **Client Component pour `global-error.tsx`** : `'use client'` obligatoire. Doit inclure `<html>` et `<body>` (Next.js requirement, cf. `.claude/rules/nextjs/routing.md`). Conserve **strictement** le pattern `useSyncExternalStore` + `getClientLocale` + messages FR/EN hardcodés (garde-fou pour le cas où next-intl crash lui-même). Ajouter classes Tailwind sur le markup (`min-h-dvh`, `flex flex-col items-center justify-center`, `gap-4`, `text-center`) — le bundle CSS Tailwind est inline-injected par Next.js, donc accessible même hors providers. Pas d'import de `Button` shadcn (`Button` dépend des CSS vars de tokens via `globals.css`, qui est injecté par `[locale]/layout.tsx` — risque de casse en mode crash) : utiliser un `<button type="button">` natif stylé manuellement avec classes Tailwind sur tokens utilitaires neutres. Icône `AlertTriangle` Lucide importée directement (Lucide est zero-dep côté provider, fonctionne).
- **Layout via `PageShell`** : `[locale]/not-found.tsx` et `[locale]/error.tsx` utilisent `<PageShell title={t('title')} subtitle={t('message')}>...</PageShell>` (cf. `src/components/layout/PageShell.tsx`) pour spacing + typography homogène. Le `<h1>` "404" / "Erreur" rend en `font-display text-4xl font-bold tracking-tight sm:text-5xl`. Sous-titre en `text-muted-foreground`. Le contenu enfant est une section avec icône Lucide centrée + paragraphe description (`text-base text-muted-foreground`) + CTA(s) en `flex gap-3` (mobile-first column, desktop row). Voir `.claude/rules/tailwind/conventions.md` (container, section padding, tokens sémantiques).
- **Icônes Lucide** : `SearchX` 32px pour 404 (`text-muted-foreground`), `AlertCircle` 32px pour `error.tsx` (`text-destructive`), `AlertTriangle` 32px pour `global-error.tsx` (`text-destructive`). Toutes en stroke style (default Lucide). Voir DESIGN.md `Icônes` + `.claude/rules/shadcn-ui/components.md`.
- **CTA retour home localisé** : `Link` from `@/i18n/navigation` (`href="/"`) pour les versions `[locale]/` (préfixage locale automatique). `<a href="/fr">` hardcoded pour `app/not-found.tsx` et `global-error.tsx`. Bouton primaire `Button` shadcn/ui (`variant="default"`) sur not-found locale ; pour error locale, bouton primaire = `reset()` (`variant="default"`) et bouton secondaire = retour home (`variant="outline"`). Voir `.claude/rules/next-intl/setup.md`.
- **Metadata SEO `[locale]/not-found.tsx`** : `export const metadata: Metadata = { title: 'Page introuvable', robots: { index: false, follow: false } }`. Le `noindex` empêche d'indexer une 404 par accident, complète le travail SEO de `metadata-base` (sub 01 SEO). Pas besoin de `generateMetadata` async ni de helper `buildPageMetadata` ici (pas de canonical/og:url à exposer pour une page d'erreur). Voir `.claude/rules/nextjs/metadata-seo.md`.
- **Cohérence Cas du status code 404→200 sur `[slug]`** : pas couvert par ce sub-project. Le `notFound()` côté `generateMetadata` rend bien la page not-found côté UX (l'utilisateur voit la page d'erreur stylée livrée par ce sub-project), mais le HTTP status reste 200 OK (comportement Next 16 + `'use cache'`). À traiter dans un follow-up Next.js framework, hors design.
- **i18n** : extension des namespaces `NotFound` et `ErrorPage` existants (`messages/fr.json` et `messages/en.json` déjà parents pour `title` et `message`) pour ajouter `description` (paragraphe sous le titre) et `ctaLabel` (texte du bouton retour home). Pas de nouveau namespace, parité stricte FR/EN. Voir `.claude/rules/next-intl/translations.md`.
- **Pas de tests** : `tdd_scope: none`. C'est du chrome routing pur Next.js (App Router file-based), aucune règle métier projet à protéger contre régression (cf. `~/.claude/CLAUDE.md` § Code > Tests, no-lib-test). Validation manuelle uniquement (curl + visuel browser FR/EN dark/light desktop/mobile).

## Acceptance criteria

### Scénario 1 : Slug projet inexistant → not-found locale stylé
**GIVEN** un visiteur qui charge `/fr/projets/inconnu-xxx-yyy`
**WHEN** Next.js rend la page (le `notFound()` est déclenché par la `generateMetadata` du sub-project SEO `metadata-base`)
**THEN** la page rend `[locale]/not-found.tsx` avec la `Navbar` sticky en haut et le `Footer` en bas (hérités de `[locale]/layout.tsx`)
**AND** un container `PageShell` avec `<h1>` "404" en `font-display`, sous-titre "Page introuvable." en `text-muted-foreground`
**AND** une icône Lucide `SearchX` 32px visible centrée
**AND** un paragraphe description issu de `t('NotFound.description')`
**AND** un bouton `Button` "Retour à l'accueil" issu de `t('NotFound.ctaLabel')` qui redirige vers `/fr` (Link `@/i18n/navigation`)
**AND** la balise `<meta name="robots" content="noindex,nofollow">` présente dans le HTML rendu

### Scénario 2 : Même page en EN
**GIVEN** un visiteur qui charge `/en/projets/inconnu-xxx-yyy`
**WHEN** Next.js rend la page
**THEN** tous les textes (`title`, `message`, `description`, `ctaLabel`) sont issus de `messages/en.json` namespace `NotFound`
**AND** le CTA "Back to home" redirige vers `/en`

### Scénario 3 : URL racine hors locale → not-found racine fallback
**GIVEN** un visiteur ou un crawler qui charge `/foo-random` ou `/wp-admin` (URL non préfixée par `/fr` ou `/en`, hors `routing.locales`)
**WHEN** le middleware next-intl ne trouve aucun match dans `routing.locales` et `localePrefix: 'always'` empêche le redirect implicite
**THEN** Next.js rend `src/app/not-found.tsx` (racine, hors `[locale]/layout.tsx`)
**AND** la page affiche un titre "404" + message en français (locale par défaut), design sobre autonome (sans Navbar, sans Footer, sans PageShell)
**AND** un lien `<a href="/fr">` "Retour à l'accueil" hardcoded

### Scénario 4 : Erreur runtime côté Server Component → error stylé
**GIVEN** une page `/fr/<route>` qui throw une erreur runtime côté Server Component
**WHEN** l'erreur remonte à l'Error Boundary `[locale]/error.tsx`
**THEN** la page rend `[locale]/error.tsx` Client avec design cohérent (Header, Footer, PageShell)
**AND** une icône Lucide `AlertCircle` 32px en `text-destructive`
**AND** un titre "Erreur" en `font-display`, message et description localisés
**AND** un bouton primaire "Réessayer" qui appelle `reset()` (conservé)
**AND** un bouton secondaire "Retour à l'accueil" `variant="outline"` qui redirige vers `/fr`

### Scénario 5 : Erreur critique (crash next-intl) → global-error stylé minimal
**GIVEN** une erreur critique non récupérable (ex: NextIntlClientProvider lui-même crash au montage du `[locale]/layout.tsx`)
**WHEN** Next.js fallback sur `app/global-error.tsx`
**THEN** la page rend un `<html>/<body>` autonome (sans Navbar, sans Footer, sans NextIntlClientProvider)
**AND** un titre "Erreur critique" / "Critical error" hardcoded selon la locale détectée par `useSyncExternalStore` (pattern existant conservé)
**AND** une icône Lucide `AlertTriangle` 32px inline
**AND** un bouton "Réessayer" / "Retry" qui appelle `reset()` (`<button type="button">` natif stylé Tailwind, pas le composant `Button` shadcn pour éviter dépendance aux tokens CSS)
**AND** un lien `<a>` retour vers `/<locale>` correspondant à la locale détectée
**AND** classes Tailwind appliquées (CSS bundle Next.js inline-injected accessible)

## Edge cases

- **URL hors locale ET hors path matché par middleware** : le middleware next-intl ne re-routera pas vers `/<defaultLocale>/<path>` car `localePrefix: 'always'` (cf. `src/i18n/routing.ts`). `/foo` tombe directement sur `app/not-found.tsx` racine, pas dans `[locale]/not-found.tsx`. Scénario 3 couvre.
- **Locale invalide dans path** : `/xx/services` (où `xx` ∉ `routing.locales`) — déjà géré par `setupLocaleMetadata` / `setupLocalePage` qui appellent `notFound()`. Comportement attendu : tombe sur le not-found le plus proche, ici `[locale]/not-found.tsx`. À valider en test manuel scénario 1 variant.
- **Tab focus sur les CTA** : ring focus visible (`focus-visible:ring-2 focus-visible:ring-ring`) doit être hérité automatiquement du composant `Button` shadcn/ui. Sur le bouton natif de `global-error.tsx`, ajouter manuellement les classes focus-visible.
- **Dark mode** : tous les composants utilisent les tokens CSS (`bg-background`, `text-foreground`, `text-muted-foreground`, `text-destructive`) → switch automatique dark/light via `next-themes`. global-error utilise les mêmes tokens (CSS bundle disponible).
- **Mobile responsive** : icône 32px conservée sur mobile (lisible), boutons en stack vertical (`flex flex-col gap-3 sm:flex-row sm:gap-4`), padding `PageShell` géré (`py-8 lg:py-14`). Test sur 375px (iPhone SE) et 1280px (desktop).
- **Bouton retry sur error.tsx déclenche une nouvelle erreur** : `reset()` re-render le segment ; si la cause de l'erreur n'est pas résolue, l'Error Boundary retape l'erreur — le user reste bloqué sur la page error en boucle. Comportement Next.js standard, hors scope (pas de logique de retry-with-backoff au MVP).

## Architectural decisions

### Décision : Layout du `app/not-found.tsx` racine

**Options envisagées :**
- **A. Layout autonome minimal** : la page racine ne réutilise pas `PageShell` (qui dépend des fonts via `[locale]/layout.tsx`). Markup `<main>` + `<h1>` + `<p>` + `<a>` stylé avec classes Tailwind utilisant tokens neutres. Texte FR hardcodé (locale par défaut). Aucune dépendance i18n.
- **B. Forwarder vers `[locale]/not-found.tsx`** : `src/app/not-found.tsx` redirige (via `redirect('/fr')` ou via `notFound()` programmatique) vers le not-found locale pour réutiliser le design complet (Header, Footer, PageShell).

**Choix : A**

**Rationale :**
- `app/not-found.tsx` racine vit hors de `[locale]/layout.tsx`, donc hors `NextIntlClientProvider`, hors fonts `next/font`, hors theme provider, hors Navbar/Footer. Forcer un design "complet" (Header/Footer) est artificiel et fragile : les fonts custom du layout root pourraient ne pas être chargées, et monter Navbar/Footer hors du provider next-intl ferait crasher leurs `useTranslations`/`getTranslations`.
- Une URL `/foo-random` ou `/wp-admin` est par définition jamais légitime — c'est soit un crawler/scanner, soit une typo. UX minimale (titre + paragraphe + lien retour) suffit, pas besoin de full design avec navbar/footer.
- Option B (redirect) ajoute une indirection HTTP 307 inutile et fait perdre le 404 status code authentique côté response (le redirect renvoie 307, puis la page locale renvoie 200, jamais 404). Anti-pattern SEO.
- Cohérent avec le pattern `global-error.tsx` qui vit déjà sans i18n provider et hardcode FR/EN — mêmes contraintes structurelles, même approche.
