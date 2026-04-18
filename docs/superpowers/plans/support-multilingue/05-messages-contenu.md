# Extraction contenu textuel et traductions FR/EN — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extraire tout le contenu textuel des pages et composants dans les fichiers de messages JSON FR/EN et câbler les traductions via useTranslations/getTranslations.

**Architecture:** Messages organisés par namespace (un par page/feature) dans `messages/fr.json` et `messages/en.json`. Chaque page/composant utilise `getTranslations` (Server Components async) ou `useTranslations` (Client Components) pour accéder aux traductions via le namespace correspondant.

**Tech Stack:** Next.js 16 App Router, next-intl 4.9.1, TypeScript 6 strict

**Spec:** `docs/superpowers/specs/support-multilingue/05-messages-contenu-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Modify | `messages/fr.json` | Tous les namespaces FR |
| Modify | `messages/en.json` | Tous les namespaces EN |
| Modify | `src/components/features/` (navbar, footer) | Composants partagés traduits |
| Modify | `src/app/[locale]/(public)/page.tsx` | Page accueil traduite |
| Modify | `src/app/[locale]/(public)/services/page.tsx` | Page services traduite |
| Modify | `src/app/[locale]/(public)/projets/page.tsx` | Page projets traduite |
| Modify | `src/app/[locale]/(public)/projets/[slug]/page.tsx` | Page case study traduite |
| Modify | `src/app/[locale]/(public)/a-propos/page.tsx` | Page à propos traduite |
| Modify | `src/app/[locale]/(public)/contact/page.tsx` | Page contact traduite |
| Modify | `src/app/[locale]/not-found.tsx` | Page 404 traduite |

---

## Approche générale par page

Pour chaque page/composant, suivre ce processus :

1. **Lire** le fichier pour identifier tous les textes en dur visibles par l'utilisateur
2. **Créer les clés** dans le namespace approprié de `messages/fr.json` avec le texte FR exact
3. **Rédiger les traductions** EN correspondantes dans `messages/en.json`
4. **Remplacer** les textes en dur par les appels `t('key')` ou `t.rich('key', { ... })`
5. **Ne pas toucher** : noms propres ("Thibaud Geisler"), URLs, attributs `className`, données Prisma dynamiques

### Pattern Server Component async

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('Namespace')

  return <h1>{t('title')}</h1>
}
```

### Pattern Client Component

```tsx
'use client'
import { useTranslations } from 'next-intl'

export function Component() {
  const t = useTranslations('Namespace')
  return <span>{t('label')}</span>
}
```

### Pattern Rich Text (JSX dans un message)

```json
{ "cta": "Découvrir mes <link>projets</link>" }
```

```tsx
t.rich('cta', {
  link: (chunks) => <Link href="/projets">{chunks}</Link>,
})
```

---

### Task 1: Traduire les composants partagés (Nav + Footer)

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: composant navbar dans `src/components/features/`
- Modify: composant footer dans `src/components/features/`

**Docs:** `.claude/rules/next-intl/translations.md`

- [ ] **Step 1: Lire le composant navbar et identifier les textes**

Lire le fichier navbar (probablement `src/components/features/navbar.tsx` ou similaire). Identifier tous les liens de navigation et labels visibles.

- [ ] **Step 2: Ajouter le namespace Nav dans les messages**

Ajouter dans `messages/fr.json` :
```json
{
  "Nav": {
    "home": "Accueil",
    "services": "Services",
    "projects": "Projets",
    "about": "À propos",
    "contact": "Contact"
  }
}
```

Et dans `messages/en.json` :
```json
{
  "Nav": {
    "home": "Home",
    "services": "Services",
    "projects": "Projects",
    "about": "About",
    "contact": "Contact"
  }
}
```

Note : adapter les clés exactes aux labels réellement présents dans le composant.

- [ ] **Step 3: Câbler useTranslations dans la navbar**

Si la navbar est un Client Component (`'use client'`) :
```tsx
import { useTranslations } from 'next-intl'

// Dans le composant :
const t = useTranslations('Nav')
// Remplacer "Projets" par t('projects'), etc.
```

Si c'est un Server Component, utiliser `getTranslations` à la place.

- [ ] **Step 4: Lire le composant footer et identifier les textes**

Lire le fichier footer. Identifier les labels, liens, copyright.

- [ ] **Step 5: Ajouter le namespace Footer dans les messages**

Ajouter dans `messages/fr.json` :
```json
{
  "Footer": {
    "copyright": "© {year} Thibaud Geisler. Tous droits réservés.",
    "cv": "Télécharger mon CV",
    "services": "Services",
    "projects": "Projets",
    "about": "À propos",
    "contact": "Contact"
  }
}
```

Et dans `messages/en.json` :
```json
{
  "Footer": {
    "copyright": "© {year} Thibaud Geisler. All rights reserved.",
    "cv": "Download my resume",
    "services": "Services",
    "projects": "Projects",
    "about": "About",
    "contact": "Contact"
  }
}
```

Note : `{year}` est une interpolation ICU, passée via `t('copyright', { year: new Date().getFullYear() })`.

- [ ] **Step 6: Câbler les traductions dans le footer**

Même pattern que pour la navbar.

- [ ] **Step 7: Commit**

```bash
git add messages/ src/components/features/
git commit -m "feat(i18n): translate Nav and Footer components"
```

---

### Task 2: Traduire la page d'accueil

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: `src/app/[locale]/(public)/page.tsx`

- [ ] **Step 1: Lire la page d'accueil et identifier les textes**

Lire `src/app/[locale]/(public)/page.tsx`. Identifier : hero title, hero subtitle, teaser services, CTA, textes de section.

- [ ] **Step 2: Ajouter le namespace HomePage dans les messages**

Créer les clés FR et EN pour tous les textes identifiés. Exemple de structure (adapter au contenu réel) :

`messages/fr.json` :
```json
{
  "HomePage": {
    "hero_title": "Thibaud Geisler",
    "hero_subtitle": "IA & Développement Full-Stack",
    "hero_tagline": "Je conçois des solutions intelligentes qui résolvent des problèmes concrets.",
    "cta_contact": "Prendre un appel",
    "cta_projects": "Voir les projets",
    "services_title": "Ce que je fais",
    "service_ia": "IA & Automatisation",
    "service_ia_description": "Intégration d'IA dans vos processus métier pour automatiser, analyser et décider.",
    "service_dev": "Développement Full-Stack",
    "service_dev_description": "Applications web performantes et modernes, du prototype à la production.",
    "service_formation": "Formation IA",
    "service_formation_description": "Formations en entreprise pour comprendre et utiliser l'IA au quotidien.",
    "projects_title": "Projets récents"
  }
}
```

`messages/en.json` :
```json
{
  "HomePage": {
    "hero_title": "Thibaud Geisler",
    "hero_subtitle": "AI & Full-Stack Development",
    "hero_tagline": "I build intelligent solutions that solve real-world problems.",
    "cta_contact": "Book a call",
    "cta_projects": "View projects",
    "services_title": "What I do",
    "service_ia": "AI & Automation",
    "service_ia_description": "Integrating AI into your business processes to automate, analyze, and decide.",
    "service_dev": "Full-Stack Development",
    "service_dev_description": "Performant, modern web applications from prototype to production.",
    "service_formation": "AI Training",
    "service_formation_description": "Corporate training to understand and leverage AI in everyday work.",
    "projects_title": "Recent projects"
  }
}
```

Note : adapter les clés et valeurs au contenu réel de la page.

- [ ] **Step 3: Câbler getTranslations dans la page**

```tsx
import { getTranslations, setRequestLocale } from 'next-intl/server'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('HomePage')

  // Remplacer chaque texte en dur par t('key')
}
```

- [ ] **Step 4: Commit**

```bash
git add messages/ src/app/\[locale\]/\(public\)/page.tsx
git commit -m "feat(i18n): translate HomePage"
```

---

### Task 3: Traduire la page Services

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: `src/app/[locale]/(public)/services/page.tsx`

- [ ] **Step 1: Lire la page services, identifier les textes, créer les clés dans le namespace ServicesPage**

Même processus : lire le fichier, identifier les textes (titre, descriptions des 3 offres, CTAs), créer les clés FR/EN.

- [ ] **Step 2: Câbler getTranslations dans la page**

- [ ] **Step 3: Commit**

```bash
git add messages/ src/app/\[locale\]/\(public\)/services/
git commit -m "feat(i18n): translate ServicesPage"
```

---

### Task 4: Traduire la page Projets (liste)

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: `src/app/[locale]/(public)/projets/page.tsx`

- [ ] **Step 1: Lire la page, identifier les textes (titre, labels de filtres, textes vides), créer les clés dans ProjectsPage**

Labels de filtres attendus : "Tous", "Client", "Personnel" (ou équivalent).

- [ ] **Step 2: Câbler getTranslations dans la page**

Note : les titres et descriptions de projets viennent de Prisma et ne sont PAS traduits via i18n.

- [ ] **Step 3: Commit**

```bash
git add messages/ src/app/\[locale\]/\(public\)/projets/page.tsx
git commit -m "feat(i18n): translate ProjectsPage"
```

---

### Task 5: Traduire la page Case Study (projet détail)

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: `src/app/[locale]/(public)/projets/[slug]/page.tsx`

- [ ] **Step 1: Lire la page, identifier les labels de section (Contexte, Défis, Solution, etc.), créer les clés dans ProjectPage**

Note : le contenu du projet (titre, description, etc.) vient de Prisma. Seuls les labels de section sont traduits.

- [ ] **Step 2: Câbler getTranslations dans la page**

- [ ] **Step 3: Commit**

```bash
git add messages/ src/app/\[locale\]/\(public\)/projets/\[slug\]/
git commit -m "feat(i18n): translate ProjectPage (case study)"
```

---

### Task 6: Traduire la page À propos

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`

- [ ] **Step 1: Lire la page, identifier les textes (bio, parcours, stack, chiffres clés, CTA CV), créer les clés dans AboutPage**

- [ ] **Step 2: Câbler getTranslations dans la page**

Pour les textes longs (bio, paragraphes), utiliser des clés descriptives (`bio_paragraph_1`, `approach_description`) plutôt qu'une seule clé monolithique.

- [ ] **Step 3: Commit**

```bash
git add messages/ src/app/\[locale\]/\(public\)/a-propos/
git commit -m "feat(i18n): translate AboutPage"
```

---

### Task 7: Traduire la page Contact

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: `src/app/[locale]/(public)/contact/page.tsx`

- [ ] **Step 1: Lire la page, identifier les textes (titre, labels formulaire, placeholders, bouton submit, liens réseaux), créer les clés dans ContactPage**

- [ ] **Step 2: Câbler getTranslations ou useTranslations**

Si le formulaire est un Client Component (`'use client'`), utiliser `useTranslations('ContactPage')`.

- [ ] **Step 3: Commit**

```bash
git add messages/ src/app/\[locale\]/\(public\)/contact/
git commit -m "feat(i18n): translate ContactPage"
```

---

### Task 8: Traduire la page Not Found + namespace Common

**Files:**
- Modify: `messages/fr.json`, `messages/en.json`
- Modify: `src/app/[locale]/not-found.tsx`

- [ ] **Step 1: Ajouter les namespaces NotFound et Common**

`messages/fr.json` :
```json
{
  "NotFound": {
    "title": "Page introuvable",
    "message": "La page que vous cherchez n'existe pas.",
    "back_home": "Retour à l'accueil"
  },
  "Common": {
    "back": "Retour",
    "loading": "Chargement...",
    "error": "Une erreur est survenue."
  }
}
```

`messages/en.json` :
```json
{
  "NotFound": {
    "title": "Page not found",
    "message": "The page you're looking for doesn't exist.",
    "back_home": "Back to home"
  },
  "Common": {
    "back": "Back",
    "loading": "Loading...",
    "error": "An error occurred."
  }
}
```

- [ ] **Step 2: Câbler les traductions dans not-found.tsx**

- [ ] **Step 3: Commit**

```bash
git add messages/ src/app/\[locale\]/not-found.tsx
git commit -m "feat(i18n): translate NotFound page and add Common namespace"
```

---

### Task 9: Vérification finale

- [ ] **Step 1: Vérifier la cohérence des fichiers messages**

S'assurer que `messages/fr.json` et `messages/en.json` ont exactement les mêmes clés dans chaque namespace :

```bash
pnpm tsc --noEmit
```

Les types AppConfig dérivés de `fr.json` causeront une erreur TypeScript si une clé est utilisée dans le code mais absente du JSON.

- [ ] **Step 2: Rechercher les textes français résiduels dans les composants**

```bash
grep -rn "[À-ÿ]" src/app/\[locale\]/ src/components/features/ --include="*.tsx" | grep -v "import\|from\|className\|//\|{/*"
```

Vérifier chaque résultat : s'il s'agit d'un texte visible par l'utilisateur, il doit être externalisé dans les messages.

- [ ] **Step 3: Tester /fr et /en dans le navigateur**

Démarrer `pnpm dev`.

Naviguer sur chaque page sous `/fr` : vérifier que le contenu est identique à la version pré-i18n.
Naviguer sur chaque page sous `/en` : vérifier que tout le contenu est en anglais.

- [ ] **Step 4: Commit final si ajustements**

```bash
git add -A
git commit -m "fix(i18n): resolve remaining translation issues"
```
