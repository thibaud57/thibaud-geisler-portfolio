# Metadata SEO localisées et sitemap multilingue: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localiser les metadata SEO de toutes les pages et adapter le sitemap pour le support multilingue hreflang.

**Architecture:** `generateMetadata` async dans chaque page utilisant `getTranslations('Metadata')` pour title/description localisés. Title template dans le layout. `alternates.languages` avec hreflang FR/EN/x-default. Sitemap avec alternates multilingues.

**Tech Stack:** Next.js 16 App Router, next-intl 4.9.1, TypeScript 6 strict

**Spec:** `docs/superpowers/specs/support-multilingue/07-metadata-seo-localisee-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `messages/fr.json` | Namespace Metadata FR |
| Modify | `messages/en.json` | Namespace Metadata EN |
| Modify | `src/app/[locale]/layout.tsx` | metadataBase, title template, generateMetadata |
| Modify | `src/app/[locale]/(public)/page.tsx` | generateMetadata accueil |
| Modify | `src/app/[locale]/(public)/services/page.tsx` | generateMetadata services |
| Modify | `src/app/[locale]/(public)/projets/page.tsx` | generateMetadata projets |
| Modify | `src/app/[locale]/(public)/projets/[slug]/page.tsx` | generateMetadata case study |
| Modify | `src/app/[locale]/(public)/a-propos/page.tsx` | generateMetadata à propos |
| Modify | `src/app/[locale]/(public)/contact/page.tsx` | generateMetadata contact |
| Modify | `src/app/sitemap.ts` | Alternates hreflang multilingues |

---

### Task 1: Ajouter le namespace Metadata dans les messages

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Ajouter les clés Metadata dans `messages/fr.json`**

```json
{
  "Metadata": {
    "site_title": "Thibaud Geisler — IA & Full-Stack",
    "site_description": "Portfolio de Thibaud Geisler. Intelligence artificielle, développement full-stack et formation IA.",
    "home_title": "Accueil",
    "home_description": "Découvrez mes services en IA, développement full-stack et formation. Projets et démos disponibles.",
    "services_title": "Services",
    "services_description": "IA & automatisation, développement full-stack, formation IA en entreprise.",
    "projects_title": "Projets",
    "projects_description": "Portfolio de projets en intelligence artificielle et développement web.",
    "about_title": "À propos",
    "about_description": "Parcours, compétences techniques et approche de travail de Thibaud Geisler.",
    "contact_title": "Contact",
    "contact_description": "Contactez Thibaud Geisler pour un projet IA, une application web ou une formation."
  }
}
```

- [ ] **Step 2: Ajouter les clés Metadata dans `messages/en.json`**

```json
{
  "Metadata": {
    "site_title": "Thibaud Geisler — AI & Full-Stack",
    "site_description": "Thibaud Geisler's portfolio. Artificial intelligence, full-stack development, and AI training.",
    "home_title": "Home",
    "home_description": "Explore my services in AI, full-stack development, and training. Projects and live demos available.",
    "services_title": "Services",
    "services_description": "AI & automation, full-stack development, corporate AI training.",
    "projects_title": "Projects",
    "projects_description": "Portfolio of artificial intelligence and web development projects.",
    "about_title": "About",
    "about_description": "Background, technical skills, and working approach of Thibaud Geisler.",
    "contact_title": "Contact",
    "contact_description": "Get in touch with Thibaud Geisler for an AI project, web application, or training."
  }
}
```

Note : adapter le wording au ton réel du site. Ces textes sont optimisés pour le SEO (mots-clés naturels, longueur description ~150 caractères).

- [ ] **Step 3: Commit**

```bash
git add messages/
git commit -m "feat(i18n): add Metadata namespace with SEO titles and descriptions"
```

---

### Task 2: Configurer generateMetadata dans le layout

**Files:**
- Modify: `src/app/[locale]/layout.tsx`

**Docs:** `.claude/rules/nextjs/metadata-seo.md`, `.claude/rules/next-intl/setup.md`

- [ ] **Step 1: Ajouter generateMetadata dans le layout**

Ajouter en haut du fichier, après les imports existants :

```typescript
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
```

Supprimer l'export `metadata` statique existant (s'il y en a un) et le remplacer par :

```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    title: {
      template: `%s | ${t('site_title')}`,
      default: t('site_title'),
    },
    description: t('site_description'),
  }
}
```

Points clés :
- `metadataBase` : résout toutes les URLs relatives (OG images, canonical)
- `title.template` : appliqué automatiquement aux pages enfants (ex: "Projets | Thibaud Geisler, IA & Full-Stack")
- `title.default` : utilisé si une page enfant ne définit pas de title
- `process.env.NEXT_PUBLIC_SITE_URL` : variable d'environnement pour l'URL canonique du site

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/layout.tsx
git commit -m "feat(i18n): add localized generateMetadata to locale layout"
```

---

### Task 3: Ajouter generateMetadata aux pages statiques

**Files:**
- Modify: `src/app/[locale]/(public)/page.tsx`
- Modify: `src/app/[locale]/(public)/services/page.tsx`
- Modify: `src/app/[locale]/(public)/projets/page.tsx`
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`
- Modify: `src/app/[locale]/(public)/contact/page.tsx`

**Docs:** `.claude/rules/nextjs/metadata-seo.md`

- [ ] **Step 1: Créer un helper pour les alternates**

Ajouter dans chaque page (ou dans un helper partagé `src/lib/metadata.ts` si le pattern se répète) :

```typescript
const localeToOgLocale: Record<string, string> = {
  fr: 'fr_FR',
  en: 'en_US',
}
```

- [ ] **Step 2: Ajouter generateMetadata à la page accueil**

Dans `src/app/[locale]/(public)/page.tsx` :

```typescript
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Metadata' })
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return {
    title: t('home_title'),
    description: t('home_description'),
    openGraph: {
      locale: localeToOgLocale[locale],
    },
    alternates: {
      languages: {
        fr: `${baseUrl}/fr`,
        en: `${baseUrl}/en`,
        'x-default': `${baseUrl}/fr`,
      },
    },
  }
}
```

- [ ] **Step 3: Appliquer le même pattern aux 4 autres pages**

Pour chaque page (services, projets, a-propos, contact) :
- Ajouter `generateMetadata` avec les clés Metadata correspondantes (`services_title`, `services_description`, etc.)
- Adapter le path dans `alternates.languages` (ex: `/fr/services`, `/en/services`)
- Définir `openGraph.locale` avec le mapping `localeToOgLocale`

- [ ] **Step 4: Commit**

```bash
git add src/app/\[locale\]/\(public\)/
git commit -m "feat(i18n): add localized generateMetadata to all static pages"
```

---

### Task 4: Ajouter generateMetadata à la page case study

**Files:**
- Modify: `src/app/[locale]/(public)/projets/[slug]/page.tsx`

- [ ] **Step 1: Adapter generateMetadata pour la page dynamique**

Cette page a déjà un `generateMetadata` qui récupère le projet via Prisma. Adapter pour inclure la localisation :

```typescript
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
  const { locale, slug } = await params
  const project = await getProject(slug)
  if (!project) return {}

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  return {
    title: project.title,
    description: project.description,
    openGraph: {
      locale: localeToOgLocale[locale],
    },
    alternates: {
      canonical: `/${locale}/projets/${slug}`,
      languages: {
        fr: `${baseUrl}/fr/projets/${slug}`,
        en: `${baseUrl}/en/projets/${slug}`,
        'x-default': `${baseUrl}/fr/projets/${slug}`,
      },
    },
  }
}
```

Note : le title et description du projet viennent de Prisma (pas des messages i18n). `alternates.canonical` ajouté car c'est une route dynamique.

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/\(public\)/projets/\[slug\]/
git commit -m "feat(i18n): add localized generateMetadata to project case study page"
```

---

### Task 5: Adapter le sitemap pour le multilingue

**Files:**
- Modify: `src/app/sitemap.ts`

**Docs:** `.claude/rules/nextjs/metadata-seo.md`

- [ ] **Step 1: Lire le sitemap existant**

Lire `src/app/sitemap.ts` pour comprendre la structure actuelle.

- [ ] **Step 2: Adapter pour le multilingue**

Modifier pour inclure les alternates par locale :

```typescript
import type { MetadataRoute } from 'next'

import { routing } from '@/i18n/routing'

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

function localizedEntry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return {
    url: `${baseUrl}/fr${path}`,
    lastModified: lastModified ?? new Date(),
    alternates: {
      languages: Object.fromEntries(
        routing.locales.map((locale) => [locale, `${baseUrl}/${locale}${path}`])
      ),
    },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const projects = await getPublishedProjects()

  const staticPages = [
    localizedEntry(''),
    localizedEntry('/services'),
    localizedEntry('/projets'),
    localizedEntry('/a-propos'),
    localizedEntry('/contact'),
  ]

  const projectPages = projects.map((project) =>
    localizedEntry(`/projets/${project.slug}`, project.updatedAt)
  )

  return [...staticPages, ...projectPages]
}
```

Points clés :
- `url` pointe vers la version FR (canonical)
- `alternates.languages` inclut les deux locales pour chaque URL
- Le helper `localizedEntry` évite la duplication
- Les projets dynamiques utilisent `updatedAt` pour `lastModified`

- [ ] **Step 3: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "feat(i18n): adapt sitemap with multilingual alternates"
```

---

### Task 6: Vérification finale

- [ ] **Step 1: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 2: Vérifier les metadata sur /fr**

Démarrer `pnpm dev`. Ouvrir `http://localhost:3000/fr/projets` et inspecter le code source (Ctrl+U).

Expected:
- `<title>Projets | Thibaud Geisler — IA & Full-Stack</title>`
- `<meta name="description" content="Portfolio de projets en intelligence artificielle..."`
- `<meta property="og:locale" content="fr_FR">`
- `<link rel="alternate" hreflang="en" href=".../en/projets">`
- `<link rel="alternate" hreflang="fr" href=".../fr/projets">`

- [ ] **Step 3: Vérifier les metadata sur /en**

Ouvrir `http://localhost:3000/en/projets` et inspecter le code source.

Expected:
- `<title>Projects | Thibaud Geisler — AI & Full-Stack</title>`
- `<meta property="og:locale" content="en_US">`

- [ ] **Step 4: Vérifier le sitemap**

Ouvrir `http://localhost:3000/sitemap.xml`.

Expected: chaque entrée contient les alternates `xhtml:link` pour FR et EN.

- [ ] **Step 5: Commit final si ajustements**

```bash
git add -A
git commit -m "fix(i18n): resolve metadata SEO issues"
```
