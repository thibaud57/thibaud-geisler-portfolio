---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "footer-global"
goal: "Livrer le footer partagé par toutes les pages publiques (logo horizontal + tagline + réseaux + CV + copyright) avec emplacements commentés pour les liens légaux que Feature 7 conformité livrera."
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["04-page-contact-layout-design.md"]
date: "2026-04-24"
---

# Footer global — Logo, tagline, réseaux, CV, copyright

## Scope

Étendre `src/components/layout/Footer.tsx` existant (actuellement minimal : copyright + `DownloadCvButton` + TODO commenté `logo, nav secondaire, social icons`) pour livrer un footer en layout 2 colonnes desktop (empilé mobile) + row copyright en bas. Colonne gauche : logo horizontal (switch dark/light via CSS Tailwind `dark:hidden`) + tagline "IA & Développement Full-Stack · Luxembourg · France". Colonne droite : petite section "Retrouvez-moi" avec 2 badges carrés 40×40 (LinkedIn + GitHub, icônes Simple Icons) + `DownloadCvButton variant="outline" size="sm"` (déjà en place, conservé). Row bottom séparée par `border-t` : copyright `© {year} Thibaud Geisler` à gauche + emplacement commenté JSX à droite pour les liens Mentions légales / Politique de confidentialité / Gérer mes cookies que Feature 7 (conformité-legale) livrera.

Promotion de la constante `SOCIAL_LINKS` créée par le sub 04 depuis `src/components/features/contact/social-links-config.ts` vers un module partagé `src/config/social-links.ts` : footer et page contact consomment la même source de vérité.

**Exclu** : création des pages légales (`/mentions-legales`, `/confidentialite`) et du bandeau consentement cookies (`vanilla-cookieconsent`) — entièrement **Feature 7 conformité-legale** à décomposer séparément. Nav secondaire répétant les liens de la navbar primaire (intentionnellement abandonnée : la navbar sticky suffit, dupliquer en footer serait bruit visuel sans valeur SEO puisque le maillage interne est déjà couvert par navbar + sitemap.xml Feature 5).

### État livré

À la fin de ce sub-project, on peut : voir le footer sur toutes les pages publiques (FR et EN) avec le logo horizontal qui s'adapte automatiquement au thème (dark/light), la tagline, les 2 badges réseaux cliquables (liens externes sécurisés `target="_blank" rel="noopener noreferrer"`), le bouton CV qui télécharge le PDF localisé, et la row copyright avec l'année dynamique. Un commentaire JSX grep-able sur la chaîne `Feature 7` marque l'emplacement exact où Feature 7 viendra brancher les liens légaux sans refactor.

## Dependencies

- `04-page-contact-layout-design.md` (statut: draft) — ce sub-project promeut la constante `SOCIAL_LINKS` créée par sub 04 (`src/components/features/contact/social-links-config.ts`) vers un module partagé `src/config/social-links.ts`, et met à jour l'import dans `src/components/features/contact/SocialLinks.tsx`. L'ordre topologique (04 puis 05) garantit que le fichier source existe au moment de la promotion.

Éléments déjà livrés hors feature, réutilisés sans modification : `DownloadCvButton` (Feature 3 `gestion-et-exposition-des-assets`, sub 02, statut : implemented), `Link` localisé `@/i18n/navigation` (non utilisé ici — pas de liens internes dans la version MVP, seulement des liens externes), `ThemeProvider` de `next-themes` (déjà monté dans `src/components/providers/Providers.tsx`).

## Files touched

- **À modifier** : `src/components/layout/Footer.tsx` (extension majeure depuis la version minimale existante)
- **À créer** : `src/components/layout/FooterSocialLinks.tsx` (Server Component dédié, résolution Simple Icons)
- **À créer** : `src/config/social-links.ts` (promotion depuis `src/components/features/contact/social-links-config.ts`, contenu identique)
- **À supprimer** : `src/components/features/contact/social-links-config.ts` (déplacé vers `src/config/`)
- **À modifier** : `src/components/features/contact/SocialLinks.tsx` (mise à jour de l'import : `from './social-links-config'` → `from '@/config/social-links'`)
- **À modifier** : `messages/fr.json` (ajout du namespace `Footer` : `tagline`, `social.{title, ariaLabel.linkedin, ariaLabel.github}`, `cv.label`)
- **À modifier** : `messages/en.json` (parité stricte du namespace `Footer`)
- **Assets ops (upload manuel dans le volume Docker)** : `branding/logo-horizontal-dark.svg` et `branding/logo-horizontal-light.svg` dans le volume servi par la route `/api/assets/[...path]` (silo introduit par sub 02 pour le portrait)

## Architecture approach

- **Server Component par défaut** : `Footer.tsx` et `FooterSocialLinks.tsx` restent Server Components (aucun hook, aucune interactivité). Le switch logo dark/light se fait via CSS Tailwind (`dark:hidden` / `hidden dark:block`) sur 2 balises `<Image>` côte à côte — next-themes applique la classe `.dark` sur `<html>` via script inline avant hydratation React, les classes utilitaires fonctionnent donc dès le premier render. Cette approche évite un îlot client, pas de `useTheme`, pas de pattern `mounted`, pas de risque d'hydration mismatch. Voir `.claude/rules/nextjs/server-client-components.md` et `.claude/rules/next-themes/theming.md` (« pattern `mounted` uniquement si l'UI change selon `resolvedTheme` — le CSS-only est préférable quand possible »).
- **Promotion `SOCIAL_LINKS`** : le fichier `src/components/features/contact/social-links-config.ts` créé par sub 04 est déplacé vers `src/config/social-links.ts`. Le contenu (constante `SOCIAL_LINKS` + type `SocialSlug`) est identique, seul le chemin change. Justification : deux consommateurs cross-feature (footer layout + page contact) → source unique de vérité dans un module `src/config/` partagé, conforme à la logique de séparation `config` vs `features` de `.claude/rules/typescript/conventions.md` (alias `@/` imports propres). L'import `src/components/features/contact/SocialLinks.tsx` (sub 04) est ajusté en conséquence dans la même task.
- **`FooterSocialLinks.tsx`** (Server) : reçoit `title: string | undefined` (optionnel — version footer compacte sans titre) + `ariaLabels: Record<SocialSlug, string>`. Itère sur `SOCIAL_LINKS`, rend pour chaque entrée un `<a>` externe (`target="_blank" rel="noopener noreferrer"` pour éviter le reverse tabnabbing) de taille 40×40 `rounded-lg bg-card border border-border`, icône Simple Icons résolue via le même pattern que `SocialLinks` du sub 04 (lookup `simple-icons:<slug>` → `Si<PascalCase>` dans `@icons-pack/react-simple-icons`). Hover `scale-105 shadow-sm transition` (plus discret que le 56×56 de la page contact). Voir `.claude/rules/shadcn-ui/components.md` pour les conventions d'icônes.
- **Logo horizontal via `next/image`** : 2 `<Image>` rendues simultanément, une masquée par CSS selon le thème. Sources `/api/assets/branding/logo-horizontal-{dark,light}.svg` (silo `branding/` introduit par sub 02, servi par la route catch-all `/api/assets/[...path]` de Feature 2). `width` + `height` explicites (ex: 180×40 selon les dimensions réelles du logo du user), `alt="Thibaud Geisler"` sur les deux (l'un des deux est toujours visible → un seul `alt` annoncé par les lecteurs d'écran). `preload` **non nécessaire** (le logo du footer n'est pas LCP). `buildAssetUrl('branding/logo-horizontal-dark.svg')` depuis `src/lib/assets.ts` (helper existant). Voir `.claude/rules/nextjs/images-fonts.md`.
- **Layout 2 colonnes + row copyright** : container standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`. Wrapper footer `border-t border-border mt-auto`. Grid interne `grid gap-8 lg:grid-cols-2 py-12`, puis row bottom `border-t border-border pt-6 flex flex-col sm:flex-row justify-between gap-4 text-xs text-muted-foreground`. Mobile : stack vertical (logo+tagline → réseaux+CV → copyright). Voir `.claude/rules/tailwind/conventions.md` (container, section padding, tokens sémantiques).
- **Copyright dynamique** : réutilise `process.env.NEXT_PUBLIC_BUILD_YEAR` déjà hoist module-level (commit `9753cc4`). Aucun `new Date()` côté render (compatible avec `cacheComponents: true` de Next 16). Voir `.claude/rules/nextjs/rendering-caching.md`.
- **Emplacement Feature 7** : commentaire JSX **verbatim** dans la row bottom, contenant la structure complète de la nav légale pour que Feature 7 la décommente et remplace les appels `t(...)` par les vraies clés i18n :
  ```tsx
  {/* Feature 7 (conformité-legale) — décommenter quand pages livrées :
  <nav className="flex flex-wrap gap-4">
    <Link href="/mentions-legales">{t('legal.mentions')}</Link>
    <Link href="/confidentialite">{t('legal.privacy')}</Link>
    <button type="button" onClick={openCookieSettings}>{t('legal.cookies')}</button>
  </nav>
  */}
  ```
  Grep-able sur la chaîne `Feature 7`.
- **i18n `Footer`** : structure nested `tagline`, `social.{title, ariaLabel.{linkedin, github}}`, `cv.label`. `.claude/rules/next-intl/translations.md` (labels d'interface → `messages/*.json`). Footer est monté dans `src/app/[locale]/layout.tsx` → reçoit `locale` en prop (pattern existant conservé).
- **Aucune modification de `DESIGN.md` dans ce sub-project** : le footer était déjà évoqué dans DESIGN.md "logo/nom, nav secondaire, liens réseaux (Simple Icons), CV, copyright, séparé par border-t border-border". La décision de **ne pas** dupliquer la nav secondaire est une précision projet qui ne contredit pas DESIGN.md (mention "nav secondaire" restait ambiguë). Ajout de la mention Feature 7 / bandeau cookies → reporté au sync docs global de fin de `/decompose-feature`.

## Acceptance criteria

### Scénario 1 : rendu FR en thème light
**GIVEN** un visiteur navigue sur n'importe quelle page publique en FR, thème light actif
**WHEN** il scrolle jusqu'au footer
**THEN** la colonne gauche affiche `logo-horizontal-dark.svg` (classe `dark:hidden`) et la tagline "IA & Développement Full-Stack · Luxembourg · France"
**AND** la colonne droite affiche une section "Retrouvez-moi" avec 2 badges carrés 40×40 (LinkedIn + GitHub, icônes Simple Icons) et le bouton CV variant `outline` size `sm`
**AND** la row bottom affiche `© {année build} Thibaud Geisler` à gauche et un espace vide à droite (commentaire JSX Feature 7 non visible)
**AND** aucune erreur console, aucun warning React

### Scénario 2 : rendu FR en thème dark
**GIVEN** l'utilisateur bascule vers le thème dark via le `ThemeToggle` de la navbar
**WHEN** le footer est re-rendu
**THEN** la classe `.dark` est appliquée sur `<html>` par next-themes
**AND** `logo-horizontal-dark.svg` devient masqué (via `dark:hidden`) et `logo-horizontal-light.svg` devient visible (via `hidden dark:block`)
**AND** aucun flash inter-thèmes (CSS-only switch, pas de re-render client)

### Scénario 3 : rendu EN
**GIVEN** un visiteur navigue sur `/en/...`
**WHEN** le footer est rendu
**THEN** la tagline, le titre de la section réseaux, les aria-labels des badges et le label CV sont affichés en anglais
**AND** le logo, l'année copyright et les URLs des réseaux/CV restent identiques (données non localisées)

### Scénario 4 : liens réseaux sécurisés
**GIVEN** un visiteur clique sur le badge LinkedIn du footer
**WHEN** le lien est ouvert
**THEN** la navigation cible l'URL configurée dans `SOCIAL_LINKS` (module `src/config/social-links.ts`) dans un nouvel onglet
**AND** les attributs `target="_blank"` et `rel="noopener noreferrer"` sont présents
**AND** l'élément a un `aria-label` localisé issu de `Footer.social.ariaLabel.linkedin`

### Scénario 5 : CV téléchargeable
**GIVEN** un visiteur clique sur le bouton CV du footer
**WHEN** l'action se déclenche
**THEN** le comportement est identique à celui déjà en production du `DownloadCvButton` (téléchargement du PDF localisé selon la locale courante)
**AND** le bouton conserve les props `variant="outline"` et `size="sm"` déjà présentes dans la version minimale actuelle

### Scénario 6 : source unique `SOCIAL_LINKS`
**GIVEN** le footer et la page `/contact` (sub 04) sont rendus dans la même session
**WHEN** on compare les URLs des liens réseaux affichés
**THEN** footer et page contact consomment exactement la même constante `SOCIAL_LINKS` importée depuis `@/config/social-links`
**AND** un grep sur `src/components/features/contact/social-links-config.ts` ne retourne aucun match (fichier déplacé)

### Scénario 7 : emplacement Feature 7 grep-able
**GIVEN** un développeur de Feature 7 ouvre `src/components/layout/Footer.tsx`
**WHEN** il cherche `Feature 7` par grep
**THEN** il trouve le commentaire JSX exact dans la row bottom, contenant la structure `<nav>` avec les 3 liens (`/mentions-legales`, `/confidentialite`, bouton Gérer mes cookies)
**AND** aucun élément visuel n'est rendu côté utilisateur final en MVP (pas de faux signal "liens légaux à venir")

### Scénario 8 : responsive
**GIVEN** un viewport `< 1024px`
**THEN** les 2 colonnes s'empilent verticalement (logo+tagline puis réseaux+CV)
**AND** les 2 badges réseaux restent côte à côte en flex-row à l'intérieur de la section droite
**AND** la row bottom passe en flex-col (copyright au-dessus des éventuels liens légaux futurs)
**WHEN** le viewport atteint ≥ 1024px (`lg:`)
**THEN** la grille principale passe en 2 colonnes
**AND** la row bottom passe en flex-row avec `justify-between`

## Edge cases

- **Logo `.svg` introuvable dans le volume branding** : `next/image` affichera l'erreur de chargement côté client. **Décision** : l'upload des 2 fichiers `logo-horizontal-{dark,light}.svg` est une étape ops runbook (documenter dans le PR body, comme pour le portrait sub 02). Si absent en dev, la page charge mais le footer affiche un logo cassé — acceptable MVP single-user.
- **`NEXT_PUBLIC_BUILD_YEAR` non défini** : déjà hoist module-level (commit `9753cc4`) avec fallback raisonnable dans la codebase existante (à vérifier dans `.env` / build system). Le footer actuel fonctionne déjà avec cette variable, comportement inchangé.
- **URLs réseaux placeholder** non remplies avant merge : même gate que sub 04 (smoke test de la PR qui vérifie manuellement les liens). Si sub 04 a déjà remplacé les placeholders, sub 05 en hérite automatiquement via le module partagé.
- **Utilisateur sans JavaScript** : footer rendu côté serveur, liens fonctionnels, logo switch via CSS pur → aucune dégradation. CV déjà téléchargeable en no-JS (ancre `<a href download>`).

## Architectural decisions

### Décision : nav secondaire du footer — duplicata complet de la navbar vs liens légaux en row bottom vs skip total

**Options envisagées :**
- **A. Skip nav secondaire, liens légaux en row bottom sous le copyright** : 2 colonnes (logo+tagline / réseaux+CV) + row `border-t` avec copyright + emplacement commenté pour Feature 7. Pattern web standard (gov, gros e-commerce, SaaS).
- **B. Nav secondaire complète en col 2** : duplique les 5 liens de la navbar primaire (Accueil, Services, Projets, À propos, Contact). Pattern "sitemap footer" classique.
- **C. Col 2 dédiée aux liens légaux** : promeut les mentions légales en colonne centrale du footer, plus prominents.

**Choix : A**

**Rationale :**
- **Navbar sticky primaire** déjà présente sur toutes les pages → la nav footer serait pure redondance sans valeur fonctionnelle (utilisateur n'a pas besoin de scroller jusqu'en bas pour re-naviguer).
- **SEO** : le maillage interne est déjà couvert par la navbar primaire + `sitemap.xml` (Feature 5). Footer nav n'ajoute pas de signal.
- **Mentions légales en row bottom** = pattern web standard (legifrance.gouv.fr, CNIL, sites e-commerce). Discret, répond à l'obligation sans prendre la lumière. Les légaux ne sont pas des éléments de séduction mais du compliance.
- **Option B** rejeté = bruit visuel redondant. **Option C** rejeté = donne trop de poids à des éléments de conformité vs contenu business.

### Décision : switch logo dark/light — CSS Tailwind vs hook `useTheme` + Client wrapper

**Options envisagées :**
- **A. CSS Tailwind pur** : 2 `<Image>` avec classes `dark:hidden` / `hidden dark:block`, rendues simultanément, une seule visible selon `.dark` sur `<html>`. Footer reste Server Component.
- **B. Hook `useTheme` + pattern `mounted`** : mini Client Component `LogoSwitch` qui `useTheme().resolvedTheme` avec `useState(false)` + `useEffect(setMounted(true))` et rendu conditionnel.

**Choix : A**

**Rationale :**
- Aucun Client Component introduit → footer 100 % SSR, aucun JavaScript envoyé pour ce widget.
- Aucun risque d'hydration mismatch (pattern `mounted` devient inutile puisque le CSS s'applique dès le premier render SSR + script inline next-themes qui applique `.dark` avant hydratation).
- 0 ligne de JS côté client, 2 `<Image>` HTML standard — next/image optimise les deux mais un seul est affiché (l'autre `display: none`, non rendu à l'écran, bandwidth perdu minime pour 2 SVG).
- Alternative B correcte mais sur-ingénierie pour un cas où le CSS suffit. Aligne sur `.claude/rules/next-themes/theming.md` qui dit explicitement « render conditionnellement selon `resolvedTheme` **sans le pattern `mounted`** → hydration mismatch » et recommande de retarder uniquement quand le CSS-only ne peut pas.

### Décision : emplacement de `SOCIAL_LINKS` — module partagé `src/config/` vs dep cross-feature vs duplication

**Options envisagées :**
- **A. Module partagé `src/config/social-links.ts`** : promu depuis sub 04, consommé par footer (sub 05) et page contact (sub 04) via `@/config/social-links`. Source unique de vérité.
- **B. Import cross-feature direct** : footer importe depuis `src/components/features/contact/social-links-config.ts` (sub 04). Simple mais crée un couplage layout/features/contact.
- **C. Duplication** : footer redéfinit sa propre constante locale. Évite le couplage mais double la maintenance (oubli garanti au prochain ajout de réseau).

**Choix : A**

**Rationale :**
- Deux consommateurs cross-feature → promotion en `src/config/` justifiée (pas de YAGNI violé : la réutilisation est réelle et immédiate, pas anticipée).
- Couplage propre via alias `@/config/*`, pas de dépendance layout ↔ features/contact.
- Duplication rejetée : oubli certain lors d'un ajout de réseau futur (X, Mastodon, etc.).
- Coût de la promotion : déplacement d'un fichier (1 move) + mise à jour d'un import (1 edit dans `SocialLinks.tsx` sub 04). Négligeable.
