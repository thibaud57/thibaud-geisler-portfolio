# Génération des images Open Graph et Twitter — Plan d'implémentation (sub-project 02 / Feature 5 SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/seo-referencement/02-og-images-design.md](../../specs/seo-referencement/02-og-images-design.md)

**Goal :** Générer dynamiquement les images Open Graph et Twitter (1200×630) pour toutes les pages publiques (5 statiques mutualisées + 1 par projet case study) via `ImageResponse` Next.js, alignées au design system DESIGN.md.

**Architecture :** Composant React partagé `OgTemplate` (flex only, mode light hardcodé) consommé par 2 fichiers `opengraph-image.tsx` (route group `(public)` + `/projets/[slug]`). Fonts Sansation Bold + Geist Regular bundlées localement dans `src/lib/seo/fonts/` chargées via `readFile` + `process.cwd()`, `runtime: 'nodejs'` explicite. Pas de fichier `twitter-image.tsx` distinct : auto-merge Next.js via `twitter.card="summary_large_image"` configuré au sub-project 01. Aucun test automatisé (`tdd_scope: none`, no-lib-test).

**Tech Stack :** Next.js 16.2.4 App Router · TypeScript 6 strict · React 19.2.5 · `next/og` (ImageResponse, livré nativement avec Next 16) · next-intl 4.9.1 · Prisma 7.7.0 (`findPublishedBySlug` cachée).

**Rules à respecter (lecture dynamique) :**
- `.claude/rules/nextjs/metadata-seo.md` (cœur : ImageResponse, flex only, 1200×630, JSON-LD)
- `.claude/rules/nextjs/images-fonts.md` (chargement fonts via `readFile`, jamais `next/font` dans `ImageResponse`, format `.ttf`)
- `.claude/rules/nextjs/routing.md` (params async, `notFound()`, hard error Next 16)
- `.claude/rules/nextjs/data-fetching.md` (`'use cache'` + `cacheTag` mutualisation per-request)
- `.claude/rules/nextjs/server-client-components.md` (composant Server, `'server-only'`)
- `.claude/rules/typescript/conventions.md`

**ADRs liés :** ADR-001 (monolithe Next.js, runtime Node disponible), ADR-006 (hub de démos, sobriété visuelle), ADR-011 (assets dynamiques volume Docker, **explicitement non utilisé** ici).

**Politique commits :** Pas de commit en cours de plan. La séquence complète est validée puis le user déclenche un commit unique en fin de workflow d'implémentation (cf. `~/.claude/CLAUDE.md` § Discipline commit). Les "checkpoints" entre tâches restent des points de validation manuelle, pas des commits.

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/lib/seo/fonts/Sansation-Bold.ttf` | Créer (binaire) | Font display titres OG, ~70 KB. Téléchargée depuis Google Fonts. |
| `src/lib/seo/fonts/Geist-Regular.ttf` | Créer (binaire) | Font corps OG, ~110 KB. Téléchargée depuis Google Fonts. |
| `src/lib/seo/og-fonts.ts` | Créer | Helper async `loadOgFonts()` → `FontOptions[]` pour `ImageResponse`. |
| `src/lib/seo/og-template.tsx` | Créer | Composant React `OgTemplate({ kind, title, subtitle, locale })` flex only. |
| `src/app/[locale]/(public)/opengraph-image.tsx` | Créer | Route OG mutualisée pour 5 pages statiques (`kind: 'site'`). |
| `src/app/[locale]/(public)/projets/[slug]/opengraph-image.tsx` | Créer | Route OG par case study (`kind: 'case-study'`). |

**Non touchés :** `src/lib/seo.ts` (sub-project 01 inchangé), `next.config.ts` (pas de `images.remotePatterns` à ajouter, lecture filesystem locale), `package.json` (`next/og` natif Next 16), `messages/{fr,en}.json` (clés `Metadata.siteTitle/siteDescription` réutilisées tel quel), `.gitignore` (les `.ttf` sont commit volontairement, chrome design system).

---

## Task 1 : Préparer les fonts dans `src/lib/seo/fonts/`

**Files :**
- Create (binaire) : `src/lib/seo/fonts/Sansation-Bold.ttf`
- Create (binaire) : `src/lib/seo/fonts/Geist-Regular.ttf`

> **Important** : Google Fonts ne fournit pas d'URL stable de téléchargement direct `.ttf`. Le téléchargement passe par le navigateur (page de la famille → bouton "Get font" / "Download family" → ZIP qui contient les `.ttf`). Cette tâche est **manuelle** côté utilisateur et ne peut pas être automatisée fiablement par CLI.

- [ ] **Step 1 : Créer le dossier `src/lib/seo/fonts/`**

Run : `mkdir -p src/lib/seo/fonts`
Expected : dossier créé, vide.

- [ ] **Step 2 : Demander à l'utilisateur de télécharger Sansation-Bold.ttf**

Demander à l'utilisateur :
1. Ouvrir [https://fonts.google.com/specimen/Sansation](https://fonts.google.com/specimen/Sansation) dans un navigateur.
2. Cliquer sur "Get font" puis "Download all" (ZIP de la famille).
3. Extraire le ZIP, identifier le fichier `Sansation-Bold.ttf` (poids 700).
4. Copier ce fichier exactement à : `d:\Desktop\thibaud-geisler-portfolio\src\lib\seo\fonts\Sansation-Bold.ttf`.

Confirmer la présence du fichier.

Run : `ls -la src/lib/seo/fonts/Sansation-Bold.ttf`
Expected : fichier présent, taille entre 50 KB et 100 KB.

- [ ] **Step 3 : Demander à l'utilisateur de télécharger Geist-Regular.ttf**

Demander à l'utilisateur :
1. Ouvrir [https://fonts.google.com/specimen/Geist](https://fonts.google.com/specimen/Geist) dans un navigateur.
2. Cliquer sur "Get font" puis "Download all" (ZIP de la famille).
3. Extraire le ZIP, identifier le fichier `Geist-Regular.ttf` (poids 400).
4. Copier ce fichier exactement à : `d:\Desktop\thibaud-geisler-portfolio\src\lib\seo\fonts\Geist-Regular.ttf`.

Run : `ls -la src/lib/seo/fonts/Geist-Regular.ttf`
Expected : fichier présent, taille entre 80 KB et 200 KB.

- [ ] **Step 4 : Vérifier le total bundle**

Run : `du -bch src/lib/seo/fonts/*.ttf | tail -1`
Expected : total < 300 KB (limite ImageResponse 500 KB inclut aussi le code JSX, on garde large marge).

---

## Task 2 : Créer le helper `loadOgFonts()`

**Files :**
- Create : `src/lib/seo/og-fonts.ts`

- [ ] **Step 1 : Créer le fichier `src/lib/seo/og-fonts.ts`**

```typescript
import 'server-only'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

export type OgFont = {
  name: string
  data: ArrayBuffer
  weight: 400 | 700
  style: 'normal'
}

export async function loadOgFonts(): Promise<OgFont[]> {
  const fontsDir = join(process.cwd(), 'src', 'lib', 'seo', 'fonts')

  const [sansationBold, geistRegular] = await Promise.all([
    readFile(join(fontsDir, 'Sansation-Bold.ttf')),
    readFile(join(fontsDir, 'Geist-Regular.ttf')),
  ])

  return [
    {
      name: 'Sansation',
      data: sansationBold.buffer.slice(
        sansationBold.byteOffset,
        sansationBold.byteOffset + sansationBold.byteLength,
      ),
      weight: 700,
      style: 'normal',
    },
    {
      name: 'Geist',
      data: geistRegular.buffer.slice(
        geistRegular.byteOffset,
        geistRegular.byteOffset + geistRegular.byteLength,
      ),
      weight: 400,
      style: 'normal',
    },
  ]
}
```

> **Pourquoi `buffer.slice(byteOffset, byteOffset + byteLength)`** : `readFile` retourne un `Buffer` Node.js. `ImageResponse` attend des `ArrayBuffer`. Le `.buffer` d'un Buffer Node peut être plus grand que les bytes utiles (partage avec d'autres Buffers). Le slice exact évite les corruptions.

- [ ] **Step 2 : Vérifier que le fichier compile**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 3 : Créer le composant React partagé `OgTemplate`

**Files :**
- Create : `src/lib/seo/og-template.tsx`

- [ ] **Step 1 : Créer le fichier `src/lib/seo/og-template.tsx`**

```tsx
import 'server-only'

const COLORS = {
  background: '#FFFFFF',
  foreground: '#0F0F0F',
  accent: '#5E7A5D',
  muted: '#737373',
} as const

type Locale = 'fr' | 'en'

type OgTemplateProps = {
  kind: 'site' | 'case-study'
  title: string
  subtitle: string
  locale: Locale
}

export function OgTemplate({ kind, title, subtitle, locale }: OgTemplateProps) {
  const kicker = kind === 'case-study' ? 'CASE STUDY' : 'PORTFOLIO'
  const localeLabel = locale.toUpperCase()
  const signature =
    kind === 'case-study'
      ? 'Thibaud Geisler · IA & dev full-stack'
      : 'thibaud-geisler.com'

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: COLORS.background,
        padding: 80,
        fontFamily: 'Geist',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 6,
            height: 28,
            backgroundColor: COLORS.accent,
          }}
        />
        <span
          style={{
            color: COLORS.accent,
            fontSize: 20,
            fontWeight: 400,
            letterSpacing: '0.2em',
          }}
        >
          {kicker}
        </span>
        <span style={{ color: COLORS.muted, fontSize: 20 }}>·</span>
        <span
          style={{
            color: COLORS.muted,
            fontSize: 20,
            letterSpacing: '0.2em',
          }}
        >
          {localeLabel}
        </span>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          marginTop: 60,
        }}
      >
        <div
          style={{
            color: COLORS.foreground,
            fontSize: 72,
            fontWeight: 700,
            fontFamily: 'Sansation',
            lineHeight: 1.1,
            display: 'flex',
          }}
        >
          {title}
        </div>

        <div
          style={{
            color: COLORS.foreground,
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {subtitle}
        </div>
      </div>

      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div
          style={{
            width: 200,
            height: 2,
            backgroundColor: COLORS.accent,
          }}
        />
        <span
          style={{
            color: COLORS.accent,
            fontSize: 24,
            fontWeight: 400,
          }}
        >
          {signature}
        </span>
      </div>
    </div>
  )
}
```

> **Notes** :
> - Pas de `font-display`, `font-sans`, ni autres classes Tailwind : Satori (moteur de `ImageResponse`) ignore les classes CSS, on doit utiliser les `style={{...}}` inline.
> - `fontFamily: 'Sansation'` et `'Geist'` sont les `name` déclarés dans `loadOgFonts()`, lookup par nom.
> - Tous les containers ont `display: 'flex'` (Satori interdit `display: block` par défaut sur les enfants).
> - Le titre a `display: 'flex'` (pas seulement `flexDirection: column`) pour permettre le wrap multi-ligne natif Satori.
> - `WebkitLineClamp: 4` sur le subtitle pour clamper les descriptions très longues à 4 lignes max.

- [ ] **Step 2 : Vérifier que le fichier compile**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 4 : Créer la route OG des pages statiques `(public)/opengraph-image.tsx`

**Files :**
- Create : `src/app/[locale]/(public)/opengraph-image.tsx`

- [ ] **Step 1 : Créer le fichier**

```tsx
import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { loadOgFonts } from '@/lib/seo/og-fonts'
import { OgTemplate } from '@/lib/seo/og-template'

export const runtime = 'nodejs'

export const alt = 'Thibaud Geisler · Portfolio IA & développement full-stack'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const [fonts, t] = await Promise.all([
    loadOgFonts(),
    getTranslations({ locale, namespace: 'Metadata' }),
  ])

  return new ImageResponse(
    (
      <OgTemplate
        kind="site"
        locale={locale}
        title={t('siteTitle')}
        subtitle={t('siteDescription')}
      />
    ),
    {
      ...size,
      fonts,
    },
  )
}
```

- [ ] **Step 2 : Vérifier que le fichier compile**

Run : `pnpm typecheck`
Expected : 0 erreur (les types `ImageResponse`, `getTranslations`, `hasLocale` doivent tous résoudre).

- [ ] **Step 3 : Tester l'image en mode dev**

Run : `pnpm dev` (laisser tourner en arrière-plan).

Une fois le serveur démarré (port 3000), dans un autre terminal :

Run : `curl -sI http://localhost:3000/fr/opengraph-image`
Expected : `HTTP/1.1 200 OK` + `Content-Type: image/png`.

- [ ] **Step 4 : Vérifier visuellement l'image FR**

Ouvrir dans un navigateur : `http://localhost:3000/fr/opengraph-image`
Expected : PNG 1200×630 affiché, kicker `PORTFOLIO · FR` en sauge, titre Sansation Bold large = `Thibaud Geisler : IA & Développement` (issu de `Metadata.siteTitle` FR), sous-titre Geist Regular = `Portfolio de Thibaud Geisler. Intelligence artificielle, développement full-stack et formation IA.` (issu de `Metadata.siteDescription` FR), liseré sauge horizontal et signature `thibaud-geisler.com` en bas.

- [ ] **Step 5 : Vérifier visuellement l'image EN**

Ouvrir dans un navigateur : `http://localhost:3000/en/opengraph-image`
Expected : même layout avec kicker `PORTFOLIO · EN`, titre = `Thibaud Geisler: AI & Development`, sous-titre = `Thibaud Geisler's portfolio. Artificial intelligence, full-stack development, and AI training.`, signature `thibaud-geisler.com`.

- [ ] **Step 6 : Vérifier la 404 sur locale invalide**

Run : `curl -sI http://localhost:3000/xx/opengraph-image`
Expected : `HTTP/1.1 404 Not Found`.

- [ ] **Step 7 : Stopper le serveur dev**

Run : `just stop` (ou `Ctrl+C` sur le terminal qui tient `pnpm dev`).

---

## Task 5 : Créer la route OG dynamique `/projets/[slug]/opengraph-image.tsx`

**Files :**
- Create : `src/app/[locale]/(public)/projets/[slug]/opengraph-image.tsx`

- [ ] **Step 1 : Créer le fichier**

```tsx
import { ImageResponse } from 'next/og'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { loadOgFonts } from '@/lib/seo/og-fonts'
import { OgTemplate } from '@/lib/seo/og-template'
import { findPublishedBySlug } from '@/server/queries/projects'

export const runtime = 'nodejs'

export const alt = 'Case study du projet · Thibaud Geisler'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const [fonts, project] = await Promise.all([
    loadOgFonts(),
    findPublishedBySlug(slug, locale),
  ])

  if (!project) notFound()

  return new ImageResponse(
    (
      <OgTemplate
        kind="case-study"
        locale={locale}
        title={project.title}
        subtitle={project.description}
      />
    ),
    {
      ...size,
      fonts,
    },
  )
}
```

> **Note** : `findPublishedBySlug` est déjà wrappée `'use cache'` + `cacheTag('projects')` (cf. [src/server/queries/projects.ts:27](../../../src/server/queries/projects.ts)). L'appel ici hit le cache déjà chaud côté `generateMetadata` du sub-project 01 (per-request mutualisation par Next.js).

- [ ] **Step 2 : Vérifier que le fichier compile**

Run : `pnpm typecheck`
Expected : 0 erreur.

- [ ] **Step 3 : Identifier un slug projet publié pour les tests**

Run : `pnpm prisma studio` (s'ouvre dans le navigateur sur le port 5555).

Naviguer dans la table `Project`, identifier un projet avec `status: 'PUBLISHED'`, noter son `slug` exact (ex : `digiclaims`).

Fermer Prisma Studio.

Alternative (sans Prisma Studio) :

Run : `pnpm tsx -e "import { prisma } from './src/lib/prisma'; const p = await prisma.project.findFirst({ where: { status: 'PUBLISHED' }, select: { slug: true } }); console.log(p?.slug); await prisma.\$disconnect();"`
Expected : un slug s'affiche (ex : `digiclaims`).

- [ ] **Step 4 : Tester l'image dynamique en mode dev**

Run : `pnpm dev` (en arrière-plan).

Run : `curl -sI http://localhost:3000/fr/projets/<slug-relevé>/opengraph-image`
Expected : `HTTP/1.1 200 OK` + `Content-Type: image/png`.

- [ ] **Step 5 : Vérifier visuellement l'image dynamique FR**

Ouvrir : `http://localhost:3000/fr/projets/<slug-relevé>/opengraph-image`
Expected : kicker `CASE STUDY · FR`, titre = titre projet en FR (Sansation Bold), description projet en FR (Geist Regular, max 4 lignes), signature `Thibaud Geisler · IA & dev full-stack`.

- [ ] **Step 6 : Vérifier visuellement l'image dynamique EN**

Ouvrir : `http://localhost:3000/en/projets/<slug-relevé>/opengraph-image`
Expected : version traduite (titre + description en EN).

- [ ] **Step 7 : Vérifier la 404 sur slug inexistant**

Run : `curl -sI http://localhost:3000/fr/projets/inconnu-aaa-bbb/opengraph-image`
Expected : `HTTP/1.1 404 Not Found` (couvre Acceptance Scénario 3 de la spec).

- [ ] **Step 8 : Stopper le serveur dev**

Run : `just stop`.

---

## Task 6 : Vérifier l'auto-merge dans la metadata des pages (Acceptance Scénario 4)

**Files :** aucun, vérification HTTP.

> **But** : confirmer que Next.js merge automatiquement les `opengraph-image.tsx` créés dans la metadata HTML des pages enfants, sans modifier le helper `buildPageMetadata` du sub-project 01.

- [ ] **Step 1 : Build prod local**

Run : `pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. Vérifier dans les logs build qu'aucun warning sur les `opengraph-image.tsx` n'apparaît.

- [ ] **Step 2 : Vérifier que `og:image` apparaît sur une page statique**

Run : `curl -s http://localhost:3000/fr/services | grep -E 'og:image|twitter:image'`
Expected : présence de `<meta property="og:image" content="<url-absolue>/opengraph-image">`, `<meta property="og:image:width" content="1200">`, `<meta property="og:image:height" content="630">`, `<meta name="twitter:image" content="<url-absolue>/opengraph-image">`.

- [ ] **Step 3 : Vérifier que `og:image` apparaît sur une page case study**

Run : `curl -s http://localhost:3000/fr/projets/<slug-relevé> | grep -E 'og:image|twitter:image'`
Expected : présence de `<meta property="og:image">` pointant vers `/fr/projets/<slug>/opengraph-image` (URL absolue avec `siteUrl` issu de `metadataBase`).

- [ ] **Step 4 : Vérifier l'image rendue via View Source**

Ouvrir dans le navigateur : `http://localhost:3000/fr/services`, View Source, identifier l'URL `og:image`, l'ouvrir : doit afficher l'image PNG du route group `(public)`.

Idem pour `http://localhost:3000/fr/projets/<slug-relevé>` : l'URL `og:image` doit afficher l'image dynamique du projet.

- [ ] **Step 5 : Stopper le serveur prod**

Run : `just stop`.

---

## Task 7 : Quality gates statiques

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint` (ou `just lint`)
Expected : 0 erreur, 0 warning bloquant. Pas de violation des rules ESLint sur les nouveaux fichiers.

- [ ] **Step 2 : Typecheck complet**

Run : `just typecheck` (lance `pnpm next typegen && pnpm typecheck`)
Expected : 0 erreur. Vérifier en particulier que `OgFont`, `OgTemplateProps`, et les `params` Promise sont correctement typés.

- [ ] **Step 3 : Tests unit (vérifier qu'aucune régression)**

Run : `just test-unit` (`pnpm vitest run --project unit --passWithNoTests`)
Expected : tous les tests existants (notamment `src/lib/seo.test.ts` du sub-project 01) passent. Aucun nouveau test attendu (`tdd_scope: none` confirmé par no-lib-test).

- [ ] **Step 4 : Tests integration (vérifier qu'aucune régression)**

Run : `just test-integration`
Expected : suites integration vertes. Le sub-project 02 ne touche pas aux Server Actions ni aux queries Prisma, mais on confirme qu'aucun import collatéral n'a cassé.

- [ ] **Step 5 : Build standalone**

Run : `pnpm build`
Expected : build complet sans erreur. Vérifier que la sortie inclut bien les nouvelles routes :
- `/[locale]/opengraph-image` listée comme route statique ou dynamique.
- `/[locale]/projets/[slug]/opengraph-image` listée comme route dynamique.

Vérifier aussi qu'aucun warning sur la taille du bundle `ImageResponse` n'est levé (les fonts + JSX doivent rester < 500 KB).

---

## Task 8 : Validation manuelle end-to-end (5 scénarios spec)

**Files :** aucun, vérification visuelle. Lancer le serveur en mode prod pour reproduire le comportement réel d'indexation.

> **Pré-requis** : `docker compose up -d --wait postgres`, `.env` rempli (`NEXT_PUBLIC_SITE_URL=http://localhost:3000` en local), un projet `PUBLISHED` en base avec un slug noté.

- [ ] **Step 1 : Build prod local**

Run : `pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. `NODE_ENV` = `production` automatique.

- [ ] **Step 2 : Scénario 1 spec — image statique FR + EN**

Ouvrir `http://localhost:3000/fr/opengraph-image` puis `http://localhost:3000/en/opengraph-image` dans le navigateur.

Expected :
- Réponse `image/png` 1200×630.
- Visuel `kind: 'site'` : kicker `PORTFOLIO · FR` (puis `EN`), titre `Metadata.siteTitle`, sous-titre `Metadata.siteDescription`, liseré et signature sauge `thibaud-geisler.com`.

- [ ] **Step 3 : Scénario 2 spec — image case study FR + EN**

Ouvrir `http://localhost:3000/fr/projets/<slug-relevé>/opengraph-image` puis `http://localhost:3000/en/projets/<slug-relevé>/opengraph-image`.

Expected :
- Réponse `image/png` 1200×630.
- Visuel `kind: 'case-study'` : kicker `CASE STUDY · FR` (puis `EN`), titre = `project.title` localisé, sous-titre = `project.description` localisé (clamp 4 lignes max), signature `Thibaud Geisler · IA & dev full-stack`.

- [ ] **Step 4 : Scénario 3 spec — slug inexistant 404**

Run : `curl -sI http://localhost:3000/fr/projets/inconnu-aaa-bbb/opengraph-image`
Expected : `HTTP/1.1 404 Not Found`. La route appelle `notFound()` et n'émet pas d'image.

- [ ] **Step 5 : Scénario 4 spec — auto-merge metadata HTML**

Run : `curl -s http://localhost:3000/fr/services | grep -E 'og:image|twitter:image'`
Expected : `og:image`, `og:image:width=1200`, `og:image:height=630`, `twitter:image` tous présents et pointant vers une URL absolue contenant `/opengraph-image`.

Run : `curl -s http://localhost:3000/fr/projets/<slug-relevé> | grep -E 'og:image|twitter:image'`
Expected : idem, pointant vers `/fr/projets/<slug>/opengraph-image`.

- [ ] **Step 6 : Scénario 5 spec — validation outils sociaux (optionnel, recommandé)**

Pré-requis pour ce step : exposer `localhost:3000` via tunneling (ngrok ou cloudflared).

```bash
# Option 1 : ngrok (account gratuit requis)
ngrok http 3000
# Note l'URL HTTPS publique générée (ex: https://abc123.ngrok-free.app)

# Option 2 : cloudflared
cloudflared tunnel --url http://localhost:3000
```

Soumettre l'URL tunnelée à :
- [https://opengraph.xyz/](https://opengraph.xyz/) → tester `<tunnel>/fr/projets/<slug>` et `<tunnel>/en/projets/<slug>` → vérifier l'aperçu carte avec image, titre et description corrects en FR/EN.
- [https://cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) (ou X Developer Card Validator si renommé) → idem, vérifier `summary_large_image`.

Si le tunneling n'est pas disponible, ce step peut être différé : il sera vérifié lors du premier déploiement Dokploy en prod via les vraies URLs `https://<domaine-prod>/fr/projets/<slug>`.

- [ ] **Step 7 : Stopper le serveur prod**

Run : `just stop`.

---

## Self-review (post-écriture, fait par l'auteur du plan)

1. **Couverture spec** :
   - Composant React partagé `OgTemplate` → Task 3 ✅
   - Helper `loadOgFonts` chargeant `.ttf` via `readFile` + `process.cwd()` → Task 2 ✅
   - Fonts bundlées dans `src/lib/seo/fonts/` (option A actée dans Architectural decisions) → Task 1 ✅
   - `opengraph-image.tsx` route group `(public)` mutualisé pour 5 pages statiques → Task 4 ✅
   - `opengraph-image.tsx` `/projets/[slug]` dynamique → Task 5 ✅
   - `runtime: 'nodejs'` explicite dans les 2 fichiers OG → Task 4 + Task 5 ✅
   - `notFound()` sur slug inexistant + locale invalide → Task 4 + Task 5 ✅
   - Mode color light hardcodé (palette DESIGN.md, pas de variant dark) → Task 3 (constantes `COLORS`) ✅
   - Auto-merge `og:image` et `twitter:image` sans modification du sub-project 01 → Task 6 ✅
   - 5 scénarios Acceptance criteria → Task 8 (Steps 2-6) ✅
   - Edge cases (titre long, description longue avec clamp) → Task 3 (`WebkitLineClamp: 4`) ✅
   - Aucun fichier `twitter-image.tsx` distinct (auto-merge via `summary_large_image`) → respecté ✅
   - `tdd_scope: none` → Task 7 lance les tests existants pour non-régression, aucun nouveau test créé ✅
   - Pas de modification de `next.config.ts`, `package.json`, `messages/*.json`, `src/lib/seo.ts` → respecté ✅

2. **Placeholder scan** :
   - Aucun `TBD` / `TODO` / `à compléter`.
   - Toutes les commandes `pnpm` / `just` / `curl` sont exactes.
   - Le slug projet utilisé dans les tests est explicitement à relever via Prisma Studio ou `pnpm tsx` (Task 5 Step 3), pas hardcodé.
   - Les URLs Google Fonts sont exactes (vérifiables au moment de l'exécution).
   - Aucun "similar to Task N" : chaque task contient son code complet.

3. **Type consistency** :
   - `OgFont` (Task 2) consommé tel quel par `ImageResponse` via le retour de `loadOgFonts()` (Task 4 + Task 5).
   - `OgTemplateProps` (Task 3) avec `kind: 'site' | 'case-study'`, `locale: 'fr' | 'en'` consommé tel quel par les 2 fichiers OG (Task 4 + Task 5).
   - `params` typé `Promise<{ locale: string; slug?: string }>` cohérent avec `await params` Next 16.
   - `findPublishedBySlug(slug, locale)` retourne `LocalizedProjectWithRelations | null` (cf. [src/server/queries/projects.ts:27](../../../src/server/queries/projects.ts#L27)) → `project.title` et `project.description` sont des `string` après narrowing par `if (!project) notFound()`.

Plan complet.
