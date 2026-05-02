# Plan d'implémentation: `05-footer-global`

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre `src/components/layout/Footer.tsx` pour livrer un footer 2 colonnes (logo horizontal dark/light + tagline à gauche, réseaux + CV à droite) avec row copyright en bas, incluant un emplacement commenté grep-able `Feature 7` pour les futurs liens légaux. Promouvoir la constante `SOCIAL_LINKS` de sub 04 vers un module partagé `src/config/social-links.ts`.

**Architecture:** Footer 100% Server Component. Switch logo dark/light via CSS Tailwind pur (`dark:hidden` / `hidden dark:block` sur 2 `<Image>`), zéro Client Component, zéro hook, zéro hydration mismatch. `FooterSocialLinks` sous-composant Server avec résolution d'icônes Simple Icons (pattern identique au sub 04). Layout 2 cols lg, empilé mobile.

**Tech Stack:** Next.js 16 App Router + PPR, React 19 (Server Components), TypeScript 6 strict, next-intl 4.9.1, shadcn/ui, `@icons-pack/react-simple-icons`, next-themes (déjà en place via `Providers.tsx`).

**Spec de référence:** [`docs/superpowers/specs/pages-publiques-portfolio/05-footer-global-design.md`](../../specs/pages-publiques-portfolio/05-footer-global-design.md).

**Rappels projet:**
- `tdd_scope: none` → pas de tests à écrire (présentiel + réutilisations, pas de règle métier projet testable sous no-lib-test).
- Discipline commit CLAUDE.md : **aucun commit intermédiaire**. Commit unique après Task 7 verte, validé par l'utilisateur.
- **Ordre topologique** : sub 04 doit être implémenté avant sub 05 (le fichier `src/components/features/contact/social-links-config.ts` existe → déplacé vers `src/config/` par ce plan).
- **Pas de modif DESIGN.md / ADR-011 / BRAINSTORM.md** ici : consolidés dans le sync docs global de fin de `/decompose-feature` (inclura l'ajout de Feature 7 conformité-legale à BRAINSTORM.md en MVP).
- Switch thème dark/light : next-themes ajoute la classe `.dark` sur `<html>` avant hydratation React (via script inline) → les classes Tailwind `dark:*` fonctionnent dès le premier render SSR, pas besoin de `useTheme` + pattern `mounted`.

---

## File Structure

| Fichier | Rôle | Action |
|---|---|---|
| `src/components/features/contact/social-links-config.ts` | Constante SOCIAL_LINKS (sub 04) | Supprimer (déplacé) |
| `src/config/social-links.ts` | Constante SOCIAL_LINKS promue en module partagé | Créer |
| `src/components/features/contact/SocialLinks.tsx` | Composant contact qui consomme SOCIAL_LINKS (sub 04) | Modifier (import path) |
| `src/components/layout/FooterSocialLinks.tsx` | Server, badges 40×40 Simple Icons, réutilise SOCIAL_LINKS promu | Créer |
| `src/components/layout/Footer.tsx` | Footer étendu : 2 cols + row copyright + commentaire JSX Feature 7 | Modifier |
| `messages/fr.json` | Ajout namespace `Footer` | Modifier |
| `messages/en.json` | Parité stricte EN | Modifier |
| `assets/branding/logo-horizontal-dark.svg` (volume Docker) | Logo pour thème light | Upload ops |
| `assets/branding/logo-horizontal-light.svg` (volume Docker) | Logo pour thème dark | Upload ops |

---

## Task 1 : Promouvoir `SOCIAL_LINKS` vers `src/config/`

**Files:**
- Create: `src/config/social-links.ts`
- Delete: `src/components/features/contact/social-links-config.ts`
- Modify: `src/components/features/contact/SocialLinks.tsx` (1 ligne d'import)

Le fichier `social-links-config.ts` créé par sub 04 est déplacé sans modification de contenu vers `src/config/social-links.ts` pour devenir la source unique de vérité partagée entre sub 04 (page contact) et sub 05 (footer).

- [ ] **Step 1.1 : Créer `src/config/social-links.ts` avec le contenu identique à sub 04**

```typescript
// src/config/social-links.ts
export const SOCIAL_LINKS = [
  {
    slug: 'linkedin',
    url: 'https://www.linkedin.com/in/<replace-with-real-slug>',
    icon: 'simple-icons:linkedin',
  },
  {
    slug: 'github',
    url: 'https://github.com/<replace-with-real-username>',
    icon: 'simple-icons:github',
  },
] as const

export type SocialSlug = (typeof SOCIAL_LINKS)[number]['slug']
```

**Important** : si sub 04 a déjà été implémenté et que les placeholders `<replace-with-real-slug>` / `<replace-with-real-username>` ont été remplacés par les vraies URLs dans le fichier source, **copier les vraies URLs ici** (pas les placeholders). Commande de vérification : `cat src/components/features/contact/social-links-config.ts` avant de créer le nouveau fichier.

- [ ] **Step 1.2 : Mettre à jour l'import dans `src/components/features/contact/SocialLinks.tsx`**

Localiser la ligne d'import de `social-links-config` (sub 04 l'a créée). Remplacer :

```typescript
import { SOCIAL_LINKS, type SocialSlug } from './social-links-config'
```

par :

```typescript
import { SOCIAL_LINKS, type SocialSlug } from '@/config/social-links'
```

- [ ] **Step 1.3 : Supprimer l'ancien fichier**

Commande : `rm src/components/features/contact/social-links-config.ts`

- [ ] **Step 1.4 : Vérifier qu'aucun autre import ne référence l'ancien chemin**

Commande : `grep -rn "features/contact/social-links-config" src/ 2>&1`
Attendu : aucun match (sauf éventuellement le binaire Git avant commit).

- [ ] **Step 1.5 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur (l'import mis à jour résout correctement vers `@/config/social-links`).

---

## Task 2 : Composant `FooterSocialLinks` (Server)

**Files:**
- Create: `src/components/layout/FooterSocialLinks.tsx`

Server Component qui rend les 2 badges réseaux (LinkedIn + GitHub) en version compacte 40×40 pour le footer. Pattern de résolution d'icônes identique à `src/components/features/contact/SocialLinks.tsx` (sub 04) pour cohérence.

- [ ] **Step 2.1 : Créer le composant**

```typescript
// src/components/layout/FooterSocialLinks.tsx
import * as SimpleIcons from '@icons-pack/react-simple-icons'
import { getTranslations } from 'next-intl/server'

import { cn } from '@/lib/utils'

import { SOCIAL_LINKS, type SocialSlug } from '@/config/social-links'

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

function toPascalCase(slug: string): string {
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
}

function isComponentLike(value: unknown): value is IconComponent {
  if (typeof value === 'function') return true
  return typeof value === 'object' && value !== null && '$$typeof' in value
}

function resolveSimpleIcon(iconKey: string): IconComponent | null {
  const colonIdx = iconKey.indexOf(':')
  if (colonIdx === -1) return null
  const lib = iconKey.slice(0, colonIdx)
  const slug = iconKey.slice(colonIdx + 1)
  if (lib !== 'simple-icons' || !slug) return null
  const componentName = `Si${toPascalCase(slug)}`
  const maybeComponent = (SimpleIcons as unknown as Record<string, unknown>)[componentName]
  return isComponentLike(maybeComponent) ? maybeComponent : null
}

type Props = {
  className?: string
}

export async function FooterSocialLinks({ className }: Props) {
  const t = await getTranslations('Footer.social')

  const ariaLabels: Record<SocialSlug, string> = {
    linkedin: t('ariaLabel.linkedin'),
    github: t('ariaLabel.github'),
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <h3 className="text-sm font-semibold">{t('title')}</h3>
      <div className="flex flex-wrap gap-2">
        {SOCIAL_LINKS.map((link) => {
          const Icon = resolveSimpleIcon(link.icon)
          return (
            <a
              key={link.slug}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={ariaLabels[link.slug]}
              className="flex size-10 items-center justify-center rounded-lg border border-border bg-card transition hover:scale-105 hover:shadow-sm"
            >
              {Icon ? <Icon className="size-4" /> : null}
            </a>
          )
        })}
      </div>
    </div>
  )
}
```

Notes :
- Version compacte du `SocialLinks` de sub 04 : badges 40×40 (au lieu de 56×56), icônes 16×16 (au lieu de 24×24), hover `shadow-sm` (au lieu de `shadow-md`).
- `h3` en `text-sm font-semibold` (discret, adapté footer).
- Résolveur d'icônes identique à sub 04 pour cohérence maintenance.

- [ ] **Step 2.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 3 : Étendre `Footer.tsx` avec layout 2 colonnes + row copyright

**Files:**
- Modify: `src/components/layout/Footer.tsx`

Remplacement intégral du footer minimal existant. Layout : 2 colonnes desktop (logo+tagline / réseaux+CV), row bottom `border-t` avec copyright + commentaire JSX Feature 7. Server Component.

- [ ] **Step 3.1 : Remplacer intégralement le contenu de `src/components/layout/Footer.tsx`**

```typescript
// src/components/layout/Footer.tsx
import Image from 'next/image'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { FooterSocialLinks } from '@/components/layout/FooterSocialLinks'
import { buildAssetUrl } from '@/lib/assets'

type Props = {
  locale: Locale
}

export async function Footer({ locale }: Props) {
  const t = await getTranslations('Footer')
  const year = process.env.NEXT_PUBLIC_BUILD_YEAR ?? new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 py-12 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div>
              <Image
                src={buildAssetUrl('branding/logo-horizontal-dark.svg')}
                alt="Thibaud Geisler"
                width={180}
                height={40}
                className="h-10 w-auto dark:hidden"
              />
              <Image
                src={buildAssetUrl('branding/logo-horizontal-light.svg')}
                alt="Thibaud Geisler"
                width={180}
                height={40}
                className="hidden h-10 w-auto dark:block"
              />
            </div>
            <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          </div>

          <div className="flex flex-col gap-6 lg:items-end">
            <FooterSocialLinks />
            <div className="flex flex-col gap-2 lg:items-end">
              <p className="text-sm text-muted-foreground">{t('cv.label')}</p>
              <DownloadCvButton locale={locale} variant="outline" size="sm" />
            </div>
          </div>
        </div>

        <div className="border-t border-border flex flex-col sm:flex-row justify-between gap-4 py-6 text-xs text-muted-foreground">
          <p>© {year} Thibaud Geisler</p>

          {/* Feature 7 (conformité-legale) — décommenter quand pages livrées :
          <nav className="flex flex-wrap gap-4">
            <Link href="/mentions-legales">{t('legal.mentions')}</Link>
            <Link href="/confidentialite">{t('legal.privacy')}</Link>
            <button type="button" onClick={openCookieSettings}>{t('legal.cookies')}</button>
          </nav>
          */}
        </div>
      </div>
    </footer>
  )
}
```

Notes :
- Les 2 `<Image>` du logo sont rendues simultanément dans le HTML SSR, next-themes applique `.dark` sur `<html>` via script inline, les classes Tailwind `dark:hidden` / `hidden dark:block` s'appliquent immédiatement → un seul logo visible à tout instant, pas d'hydration mismatch. Voir `.claude/rules/next-themes/theming.md`.
- `width={180}` et `height={40}` sont des **valeurs par défaut** correspondant à un ratio logo horizontal standard. À ajuster aux dimensions réelles des fichiers SVG fournis (cf. Task 6). La classe `h-10 w-auto` force la hauteur à 40 px et laisse la largeur s'adapter → tolérant aux variations de ratio source.
- `alt="Thibaud Geisler"` sur les 2 images : un seul est visible à la fois, les lecteurs d'écran n'annoncent que l'image visible.
- `year` : fallback sur `new Date().getFullYear()` si `NEXT_PUBLIC_BUILD_YEAR` absent. Comportement compatible avec `cacheComponents: true` car `new Date()` est appelé une seule fois au module load-time (refactor déjà appliqué commit `9753cc4` dans la version minimale ; ici on le reformule dans le Server Component async).
- Commentaire JSX Feature 7 **verbatim** (grep-able sur la chaîne `Feature 7 (conformité-legale)`). Les appels `t('legal.*')` et `openCookieSettings` référencés dans le commentaire seront câblés par Feature 7.
- **Import `Link`** : non ajouté pour éviter un import mort tant que le commentaire JSX est en place. Feature 7 ajoutera l'import `Link` de `@/i18n/navigation` au moment de décommenter.

- [ ] **Step 3.2 : Typecheck**

Commande : `pnpm exec tsc --noEmit`
Attendu : aucune erreur.

---

## Task 4 : Ajouter le namespace `Footer` dans `messages/fr.json` et `messages/en.json`

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 4.1 : Ajouter le namespace `Footer` à `messages/fr.json`**

Ajouter ce bloc dans `messages/fr.json` (position : après `ContactPage`, avant `NotFound` ou à un emplacement cohérent avec l'ordre existant) :

```json
  "Footer": {
    "tagline": "IA & Développement Full-Stack · Luxembourg · France",
    "social": {
      "title": "Retrouvez-moi",
      "ariaLabel": {
        "linkedin": "Profil LinkedIn de Thibaud Geisler",
        "github": "Profil GitHub de Thibaud Geisler"
      }
    },
    "cv": {
      "label": "Mon CV au format PDF :"
    }
  },
```

(Veiller à la virgule de clôture entre `Footer` et le namespace suivant.)

- [ ] **Step 4.2 : Ajouter la parité EN à `messages/en.json`**

```json
  "Footer": {
    "tagline": "AI & Full-Stack Development · Luxembourg · France",
    "social": {
      "title": "Find me on",
      "ariaLabel": {
        "linkedin": "Thibaud Geisler's LinkedIn profile",
        "github": "Thibaud Geisler's GitHub profile"
      }
    },
    "cv": {
      "label": "My résumé (PDF):"
    }
  },
```

- [ ] **Step 4.3 : Vérifier la validité JSON**

Commande : `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('OK')"`
Attendu : `OK`.

---

## Task 5 : (réservée pour Ops runbook): voir Task 6

Pas de code à écrire ici, placeholder renommé. Passer directement à Task 6.

---

## Task 6 : Ops: Upload des logos horizontaux dans le volume Docker

**Files:**
- External (volume Docker) : `assets/branding/logo-horizontal-dark.svg`, `assets/branding/logo-horizontal-light.svg`

Ces 2 fichiers ne sont **pas versionnés dans le repo** (convention ADR-011 : assets servis via `/api/assets/[...path]` et stockés dans le volume Docker). L'utilisateur dispose déjà des 4 variations de logo (mentionné au brainstorming). Seules les 2 versions horizontales sont nécessaires pour le footer.

- [ ] **Step 6.1 : Préparer les 2 fichiers SVG**

Sélectionner parmi les 4 variations utilisateur :
- `logo-horizontal-dark.svg` : version qui s'affiche correctement sur fond clair (logo aux tons sombres)
- `logo-horizontal-light.svg` : version qui s'affiche correctement sur fond sombre (logo aux tons clairs)

Conventions de nommage fichiers : strictement `logo-horizontal-dark.svg` et `logo-horizontal-light.svg` (casse et tirets respectés pour matcher `buildAssetUrl('branding/logo-horizontal-dark.svg')` dans le Footer.tsx).

- [ ] **Step 6.2 : Noter les dimensions réelles des SVG**

Commande (sur chaque fichier source) : `head -1 logo-horizontal-dark.svg | grep -oE 'viewBox="[0-9. ]+"'`
Attendu : extraire le `viewBox` (ex: `viewBox="0 0 720 160"` = ratio 9:2).

Si le ratio diffère significativement de 180×40 (4.5:1) utilisé comme valeur par défaut dans Task 3, ajuster les props `width` et `height` de chaque `<Image>` dans `src/components/layout/Footer.tsx` pour préserver le ratio source (ex: `width={360} height={80}` si ratio 4.5:1 conservé, ou `width={180} height={80}` si ratio 9:4, etc.). La classe `h-10 w-auto` contrôle la taille rendue finale (40 px de haut), les props `width`/`height` servent uniquement à Next/Image pour calculer la réservation d'espace et prévenir le CLS.

- [ ] **Step 6.3 : Déposer dans le volume Docker local**

Commande (environnement local, adapter selon la conf du projet) :

```bash
mkdir -p ./assets/branding
cp chemin/vers/logo-horizontal-dark.svg ./assets/branding/logo-horizontal-dark.svg
cp chemin/vers/logo-horizontal-light.svg ./assets/branding/logo-horizontal-light.svg
```

Si le volume Docker est monté sur un autre chemin (vérifier `docker-compose.yml`), adapter. Le portrait de sub 02 est déjà déposé dans `assets/branding/portrait.webp` → les logos vivent à côté dans le même silo.

- [ ] **Step 6.4 : Vérifier que les logos sont accessibles via la route API**

Après `just dev` (Task 7), tester dans le navigateur :
- `http://localhost:3000/api/assets/branding/logo-horizontal-dark.svg` → doit afficher le SVG
- `http://localhost:3000/api/assets/branding/logo-horizontal-light.svg` → doit afficher le SVG

- [ ] **Step 6.5 : Déposer en prod (Dokploy)**

Uploader les 2 fichiers dans le volume monté en prod (via SCP ou l'interface Dokploy selon la conf). Noter dans le PR body que cette étape ops est requise avant le merge sur `main` pour éviter un footer cassé en prod.

---

## Task 7 : Verification finale

Aucun test automatisé (`tdd_scope: none`). Verification = gates qualité + inspection navigateur (switch thème inclus) + sanity checks sur la promotion `SOCIAL_LINKS`.

- [ ] **Step 7.1 : Sanity check promotion `SOCIAL_LINKS`**

Commandes :

```bash
# 1. Le nouveau fichier existe
ls src/config/social-links.ts

# 2. L'ancien est supprimé
ls src/components/features/contact/social-links-config.ts 2>&1 | grep -q "No such file" && echo "OK: ancien fichier absent" || echo "KO: ancien fichier présent"

# 3. Aucun import orphelin
grep -rn "features/contact/social-links-config" src/ || echo "OK: aucun import orphelin"
```

Attendu : nouveau fichier présent, ancien absent, aucun import orphelin.

- [ ] **Step 7.2 : Lint**

Commande : `just lint`
Attendu : 0 error, warnings uniquement préexistants.

- [ ] **Step 7.3 : Typecheck global**

Commande : `just typecheck`
Attendu : 0 erreur.

- [ ] **Step 7.4 : Build**

Commande : `just build`
Attendu : build Next.js OK, toutes les routes listées sans erreur.

- [ ] **Step 7.5 : Smoke test FR en thème light**

1. `just dev` (serveur sur `http://localhost:3000`).
2. Ouvrir `http://localhost:3000/` (thème light par défaut ou forcé depuis la navbar).
3. Scroller jusqu'au footer.
4. Vérifier visuellement :
   - **Col gauche** : `logo-horizontal-dark.svg` visible (hauteur ~40 px, largeur auto), tagline `IA & Développement Full-Stack · Luxembourg · France` en `text-muted-foreground`.
   - **Col droite (alignée à droite en desktop)** : titre `Retrouvez-moi`, 2 badges 40×40 (LinkedIn + GitHub) avec icônes Simple Icons, label `Mon CV au format PDF :` + bouton CV outline sm.
   - **Row bottom (séparée par border-t)** : `© {année} Thibaud Geisler` à gauche, espace vide à droite.
5. DevTools Elements : le commentaire JSX `Feature 7 (conformité-legale) — décommenter...` est bien dans le DOM HTML (invisible).

- [ ] **Step 7.6 : Smoke test switch thème dark**

1. Cliquer sur le `ThemeToggle` de la navbar pour passer en thème dark.
2. Observer le footer :
   - `logo-horizontal-dark.svg` devient masqué (via `dark:hidden`).
   - `logo-horizontal-light.svg` devient visible (via `hidden dark:block`).
   - Aucun flash intermédiaire (CSS-only, pas de re-render client).
   - Aucune erreur dans la console, aucun warning hydration.
3. Vérifier les badges réseaux : bordure `border-border` toujours visible, hover toujours fonctionnel.

- [ ] **Step 7.7 : Smoke test EN**

1. Ouvrir `http://localhost:3000/en/`.
2. Scroller jusqu'au footer.
3. Vérifier traductions :
   - Tagline : `AI & Full-Stack Development · Luxembourg · France`
   - Titre réseaux : `Find me on`
   - Label CV : `My résumé (PDF):`
   - Badges aria-label EN (inspecter le DOM : `Thibaud Geisler's LinkedIn profile`).

- [ ] **Step 7.8 : Smoke test responsive**

1. Sur `/`, redimensionner la fenêtre.
2. Mobile (`< 1024px`) : les 2 colonnes s'empilent verticalement (logo+tagline puis réseaux+CV). La row bottom passe en flex-col. Les 2 badges réseaux restent côte à côte (flex-row).
3. Desktop (`≥ 1024px`) : grille 2 cols (gauche / droite alignée à droite), row bottom en flex-row (copyright à gauche, futur emplacement légaux à droite).

- [ ] **Step 7.9 : Vérifier le commentaire JSX Feature 7 est grep-able**

Commande : `grep -n "Feature 7 (conformité-legale)" src/components/layout/Footer.tsx`
Attendu : 1 match sur la ligne du commentaire.

- [ ] **Step 7.10 : Vérifier cohérence `SOCIAL_LINKS` entre footer et page contact**

Si la DB est up et la page `/contact` accessible :
1. Naviguer sur `/contact`.
2. Cliquer sur le badge LinkedIn dans la col gauche → noter l'URL cible.
3. Naviguer sur `/` ou toute autre page.
4. Scroller jusqu'au footer, cliquer sur le badge LinkedIn.
5. Les 2 URLs doivent être strictement identiques (source unique `@/config/social-links`).

- [ ] **Step 7.11 : Arrêter le serveur dev**

Commande : `just stop`
Attendu : port 3000 libéré.

- [ ] **Step 7.12 : Proposer le commit au user (discipline CLAUDE.md)**

Ne PAS commit automatiquement. Demander à l'utilisateur :

> "Verification complète OK (lint + typecheck + build + smoke FR/EN + switch dark/light + sanity SOCIAL_LINKS + grep Feature 7). Logos déposés dans `assets/branding/` (local + prod). Je peux committer ce sub-project ? Message suggéré : `feat(footer): footer global avec logo horizontal, réseaux, CV et emplacement légaux Feature 7`."

Attendre validation explicite avant `git add` / `git commit`.

---

## Status du spec

La mise à jour du `status` du spec de `draft` vers `implemented` (frontmatter de [`05-footer-global-design.md`](../../specs/pages-publiques-portfolio/05-footer-global-design.md)) **n'est pas réalisée dans ce plan**. Elle est déléguée au workflow parent `/implement-subproject` (gates `/simplify` + `code/code-reviewer` + mise à jour status après approbation finale).

---

## Self-review

**Spec coverage** (chaque scénario et décision du spec mappé à une task) :
- Scénario 1 (rendu FR light) → Tasks 2, 3, 4, 6 + smoke 7.5.
- Scénario 2 (switch dark) → Task 3 (classes `dark:hidden` / `hidden dark:block`) + smoke 7.6.
- Scénario 3 (rendu EN) → Task 4.2 + smoke 7.7.
- Scénario 4 (liens réseaux sécurisés) → Task 2 (`target="_blank" rel="noopener noreferrer"` + aria-label) + smoke 7.5 (DevTools).
- Scénario 5 (CV téléchargeable) → Task 3 (réutilisation `DownloadCvButton variant="outline" size="sm"`) + smoke 7.5.
- Scénario 6 (source unique SOCIAL_LINKS) → Task 1 (promotion + cleanup) + smoke 7.10.
- Scénario 7 (emplacement Feature 7 grep-able) → Task 3 (commentaire JSX verbatim) + smoke 7.9.
- Scénario 8 (responsive) → Task 3 (grid `lg:grid-cols-2` + row `sm:flex-row`) + smoke 7.8.
- Edge case "logo introuvable" → Task 6 (upload ops documenté + PR body).
- Edge case "NEXT_PUBLIC_BUILD_YEAR non défini" → Task 3 (fallback `new Date().getFullYear()`).
- Edge case "URLs réseaux placeholder" → Task 1 Step 1.1 (note sur reprise des vraies URLs depuis sub 04).
- Edge case "utilisateur sans JS" → Task 3 (Server Component pur, aucune dépendance JS).
- Décision archi A (skip nav secondaire + liens légaux en row bottom) → Task 3 (layout 2 cols + commentaire JSX Feature 7 sous copyright).
- Décision archi B (switch logo CSS) → Task 3 (`dark:hidden` / `hidden dark:block`).
- Décision archi C (SOCIAL_LINKS dans `src/config/`) → Task 1 (promotion complète).

**Placeholder scan** : aucun `TBD` / `TODO` / `à définir` / `implement later`. Les références `<replace-with-real-slug>` et `<replace-with-real-username>` dans Task 1 Step 1.1 sont des **commentaires explicatifs** (le contenu du fichier peut contenir ces placeholders si sub 04 n'a pas encore remplacé par les vraies URLs, dans ce cas sub 04 doit être finalisé avant sub 05). Le contenu copié dans `src/config/social-links.ts` sera ce qui est présent dans le fichier source au moment de la Task 1, pas un placeholder nouveau.

**Type consistency** :
- `SocialSlug = 'linkedin' | 'github'` (Task 1 = fichier promu) ↔ `Record<SocialSlug, string>` (Task 2 ariaLabels) : cohérent.
- `SOCIAL_LINKS` exporté depuis `@/config/social-links` (Task 1) ↔ import Task 2 (`FooterSocialLinks`) et import `SocialLinks.tsx` sub 04 (Task 1.2) : cohérent.
- Clés i18n `Footer.{tagline, social.title, social.ariaLabel.{linkedin, github}, cv.label}` (Task 4) ↔ appels `t(...)` dans Task 2 et Task 3 : cohérent.
- `locale: Locale` (Task 3 Props) ↔ appel `<DownloadCvButton locale={locale} />` : cohérent.

Aucune divergence détectée.

---

## Execution Handoff

Plan sauvegardé dans [`docs/superpowers/plans/pages-publiques-portfolio/05-footer-global.md`](./05-footer-global.md).

Deux options d'exécution lorsqu'on passera à l'implémentation (après implémentation du sub 04 qui est prérequis topologique) :

1. **Subagent-Driven (recommandé)**, `superpowers:subagent-driven-development` dispatch un subagent frais par task, review entre tasks. Aligné avec `/implement-subproject` qui intègre `/simplify` et `code/code-reviewer` comme gates.
2. **Inline Execution**, `superpowers:executing-plans`, batch avec checkpoints dans la session courante.

Pas d'exécution dans le cadre de `/decompose-feature` : la phase d'implémentation est déclenchée via `/implement-subproject pages-publiques-portfolio 05` (après `04`).
