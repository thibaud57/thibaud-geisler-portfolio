# Restructuration app sous segment [locale] — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructurer l'application sous le segment dynamique `[locale]` pour que toutes les pages soient accessibles sous `/fr/...` et `/en/...` avec `<html lang={locale}>`.

**Architecture:** Migration du root layout dans `src/app/[locale]/layout.tsx` avec ajout des providers i18n (NextIntlClientProvider, setRequestLocale, hasLocale). Déplacement de toutes les pages publiques sous `src/app/[locale]/(public)/`. Ajout de `setRequestLocale(locale)` dans chaque page pour le SSG.

**Tech Stack:** Next.js 16 App Router, next-intl 4.9.1, next-themes, TypeScript 6 strict

**Spec:** `docs/superpowers/specs/support-multilingue/03-layout-locale-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/app/[locale]/layout.tsx` | Root layout avec i18n, fonts, ThemeProvider |
| Delete | `src/app/layout.tsx` | Remplacé par le layout locale |
| Move+Modify | `src/app/[locale]/(public)/page.tsx` | Page accueil + setRequestLocale |
| Move+Modify | `src/app/[locale]/(public)/services/page.tsx` | Page services + setRequestLocale |
| Move+Modify | `src/app/[locale]/(public)/projets/page.tsx` | Page projets + setRequestLocale |
| Move+Modify | `src/app/[locale]/(public)/projets/[slug]/page.tsx` | Page case study + setRequestLocale |
| Move+Modify | `src/app/[locale]/(public)/a-propos/page.tsx` | Page à propos + setRequestLocale |
| Move+Modify | `src/app/[locale]/(public)/contact/page.tsx` | Page contact + setRequestLocale |
| Create | `src/app/[locale]/not-found.tsx` | Page 404 localisée |

---

### Task 1: Créer le layout locale

**Files:**
- Create: `src/app/[locale]/layout.tsx`

**Docs:** `.claude/rules/next-intl/setup.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/server-client-components.md`

- [ ] **Step 1: Lire le root layout existant**

Lire `src/app/layout.tsx` pour identifier :
- Les imports de fonts (`next/font/google`)
- Les providers (ThemeProvider de next-themes)
- Les classes CSS globales sur `<body>`
- Les metadata globales (si `generateMetadata` ou objet `metadata` exporté)
- Toute autre configuration (viewport, etc.)

- [ ] **Step 2: Créer `src/app/[locale]/layout.tsx`**

Créer le fichier en reprenant le contenu du root layout existant et en ajoutant les éléments i18n. Structure cible :

```tsx
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
// ... imports fonts existants (Geist Sans, Sansation, Geist Mono)
// ... imports providers existants (ThemeProvider)
// ... import CSS global

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={/* classes fonts existantes */}>
        {/* ThemeProvider existant wrappant NextIntlClientProvider */}
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NextIntlClientProvider>
            {children}
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

Points clés :
- `await params` : obligatoire Next.js 16 (hard error si accès synchrone)
- `hasLocale` + `notFound()` : garde de validation avant `setRequestLocale`
- `setRequestLocale(locale)` : obligatoire pour le SSG (appelé après validation)
- `NextIntlClientProvider` : ne pas passer `messages` en props (hérité automatiquement next-intl 4+)
- `suppressHydrationWarning` sur `<html>` : next-themes modifie `class` côté client
- `generateStaticParams` : pré-génère les deux variantes (fr, en) au build
- Conserver l'ordre exact des providers existants, insérer `NextIntlClientProvider` comme enfant direct du ThemeProvider (ou l'inverse selon l'organisation actuelle)

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/layout.tsx
git commit -m "feat(i18n): create locale layout with i18n providers and static params"
```

---

### Task 2: Déplacer les pages publiques sous [locale]

**Files:**
- Move: `src/app/(public)/*` → `src/app/[locale]/(public)/*`

- [ ] **Step 1: Créer la structure de dossiers**

```bash
mkdir -p "src/app/[locale]/(public)/services"
mkdir -p "src/app/[locale]/(public)/projets/[slug]"
mkdir -p "src/app/[locale]/(public)/a-propos"
mkdir -p "src/app/[locale]/(public)/contact"
```

- [ ] **Step 2: Déplacer les fichiers page.tsx**

```bash
git mv src/app/\(public\)/page.tsx src/app/\[locale\]/\(public\)/page.tsx
git mv src/app/\(public\)/services/page.tsx src/app/\[locale\]/\(public\)/services/page.tsx
git mv src/app/\(public\)/projets/page.tsx src/app/\[locale\]/\(public\)/projets/page.tsx
git mv src/app/\(public\)/projets/\[slug\]/page.tsx src/app/\[locale\]/\(public\)/projets/\[slug\]/page.tsx
git mv src/app/\(public\)/a-propos/page.tsx src/app/\[locale\]/\(public\)/a-propos/page.tsx
git mv src/app/\(public\)/contact/page.tsx src/app/\[locale\]/\(public\)/contact/page.tsx
```

Note : déplacer aussi tout fichier associé aux pages (loading.tsx, error.tsx, layout.tsx de route group) s'ils existent. Vérifier avec `ls src/app/(public)/` avant le déplacement.

- [ ] **Step 3: Déplacer les fichiers auxiliaires restants**

Vérifier et déplacer tout autre fichier dans `src/app/(public)/` :

```bash
find src/app/\(public\) -type f -not -name "*.tsx" -not -name "*.ts" 2>/dev/null
```

Déplacer chaque fichier trouvé vers son équivalent sous `[locale]/(public)/`.

- [ ] **Step 4: Supprimer l'ancien dossier (public)**

```bash
rm -rf src/app/\(public\)
```

Vérifier que le dossier est bien vide avant suppression.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor(i18n): move public pages under [locale] segment"
```

---

### Task 3: Ajouter setRequestLocale dans chaque page

**Files:**
- Modify: `src/app/[locale]/(public)/page.tsx`
- Modify: `src/app/[locale]/(public)/services/page.tsx`
- Modify: `src/app/[locale]/(public)/projets/page.tsx`
- Modify: `src/app/[locale]/(public)/projets/[slug]/page.tsx`
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`
- Modify: `src/app/[locale]/(public)/contact/page.tsx`

**Docs:** `.claude/rules/next-intl/setup.md`, `.claude/rules/nextjs/routing.md`

- [ ] **Step 1: Modifier chaque page pour ajouter le support locale**

Pour chaque page.tsx listée ci-dessus, appliquer les modifications suivantes :

1. Ajouter l'import :

```typescript
import { setRequestLocale } from 'next-intl/server'
```

2. Ajouter `params` async dans la signature du composant :

```typescript
export default async function PageName({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  // ... reste du composant inchangé
}
```

3. Si le composant n'était pas `async`, le rendre `async`.

**Cas particulier pour `projets/[slug]/page.tsx` :** cette page a déjà un param `slug`. Le type params devient :

```typescript
params: Promise<{ locale: string; slug: string }>
```

Et la destructuration :

```typescript
const { locale, slug } = await params
setRequestLocale(locale)
```

- [ ] **Step 2: Vérifier la compilation**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur TypeScript.

- [ ] **Step 3: Commit**

```bash
git add src/app/\[locale\]/\(public\)/
git commit -m "feat(i18n): add setRequestLocale to all public pages"
```

---

### Task 4: Créer la page not-found localisée

**Files:**
- Create: `src/app/[locale]/not-found.tsx`

- [ ] **Step 1: Créer `src/app/[locale]/not-found.tsx`**

```tsx
export default function NotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-muted-foreground">Page introuvable.</p>
    </main>
  )
}
```

Note : le texte reste en dur pour l'instant (hardcodé en français). Il sera traduit dans le sub-project `messages-contenu`. Les classes Tailwind utilisent les tokens du design system (`text-muted-foreground`).

- [ ] **Step 2: Commit**

```bash
git add src/app/\[locale\]/not-found.tsx
git commit -m "feat(i18n): add localized not-found page"
```

---

### Task 5: Supprimer l'ancien root layout et nettoyer

**Files:**
- Delete: `src/app/layout.tsx`

- [ ] **Step 1: Supprimer l'ancien root layout**

```bash
git rm src/app/layout.tsx
```

- [ ] **Step 2: Vérifier qu'il n'y a pas d'orphelins**

Vérifier que `src/app/` ne contient plus de `page.tsx` ou `layout.tsx` hors de `[locale]/` (sauf `api/`, `sitemap.ts`, `robots.ts` qui restent à la racine) :

```bash
ls src/app/
```

Expected: seuls `[locale]/`, `api/` (si existant), `sitemap.ts` (si existant), `robots.ts` (si existant), et `global-error.tsx` (si existant).

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor(i18n): remove old root layout, replaced by [locale] layout"
```

---

### Task 6: Vérification finale

- [ ] **Step 1: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 2: Démarrer le serveur de dev**

```bash
pnpm dev
```

Expected: le serveur démarre sans erreur.

- [ ] **Step 3: Tester les pages sous /fr**

Ouvrir dans le navigateur :
- `http://localhost:3000/fr` — page accueil
- `http://localhost:3000/fr/services` — page services
- `http://localhost:3000/fr/projets` — page projets
- `http://localhost:3000/fr/a-propos` — page à propos
- `http://localhost:3000/fr/contact` — page contact

Expected: toutes les pages s'affichent correctement. Vérifier `<html lang="fr">` dans le code source (Ctrl+U).

- [ ] **Step 4: Tester les pages sous /en**

Ouvrir `http://localhost:3000/en` et `http://localhost:3000/en/projets`.

Expected: les pages s'affichent (contenu encore en français, normal à ce stade). Vérifier `<html lang="en">` dans le code source.

- [ ] **Step 5: Tester le dark mode**

Utiliser le toggle dark/light mode sur n'importe quelle page.

Expected: le theme switch fonctionne sans régression.

- [ ] **Step 6: Tester la 404**

Ouvrir `http://localhost:3000/fr/page-inexistante`.

Expected: la page 404 s'affiche avec le message "Page introuvable."

- [ ] **Step 7: Commit final si ajustements nécessaires**

```bash
git add -A
git commit -m "fix(i18n): resolve layout locale issues"
```

Ne créer ce commit que si des ajustements ont été faits. Pas de commit vide.
