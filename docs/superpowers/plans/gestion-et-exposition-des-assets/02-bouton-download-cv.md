# Bouton "Télécharger mon CV" sur /a-propos et dans le footer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exposer le CV au public via un Server Component `DownloadCvButton` réutilisable, affiché sur la page À propos et dans le footer global, avec filename de téléchargement neutre (`CV_Thibaud_Geisler.pdf`) et double filename serveur par locale.

**Architecture:** Extension de `src/lib/assets.ts` avec `CV_FILENAMES` (map locale → filename disque) + `CV_DOWNLOAD_FILENAME` (nom neutre du téléchargement) + helper `buildCvUrl(locale)`. Nouveau Server Component `DownloadCvButton` qui suit le pattern `Button asChild + <a>` déjà utilisé dans `CaseStudyFooter.tsx`. Intégration dans la page À propos (locale via `params`) et dans le footer (locale via `getLocale()` async). Zéro test (tdd_scope none), validation manuelle via `pnpm dev`. Voir spec : `docs/superpowers/specs/gestion-et-exposition-des-assets/02-bouton-download-cv-design.md`.

**Tech Stack:** TypeScript 6 strict, Next.js 16 App Router (Server Components async, `params` Promise), next-intl 4 (`getTranslations`, `getLocale`, type `Locale` déclaré via `declare module 'next-intl'` dans `src/i18n/types.ts`), shadcn/ui `Button` avec variants et `asChild`, Lucide React (`FileDown`).

**Prérequis d'exécution** : sub-project 01 (`support-pdf-route-assets`) mergé ou implémenté auparavant — sans quoi le PDF retournera 400 à l'exécution manuelle. Docker/Postgres non requis pour ce sub-project (pas de dépendance DB, pas de tests d'intégration).

---

## File Structure

| Fichier | Rôle | Nature du changement |
|---------|------|----------------------|
| `src/lib/assets.ts` | Source unique pour helpers asset publics | Ajout `CV_FILENAMES`, `CV_DOWNLOAD_FILENAME`, `buildCvUrl` (passe de 3 à ~15 lignes) |
| `src/components/features/about/DownloadCvButton.tsx` | Nouveau composant réutilisable | Création (Server Component async) |
| `src/app/[locale]/(public)/a-propos/page.tsx` | Page À propos publique | Ajout du CTA après le placeholder existant |
| `src/components/layout/Footer.tsx` | Footer global | Passage en async + insertion copyright + bouton CV |
| `messages/fr.json` | Traductions françaises | Ajout `Common.cv.*` |
| `messages/en.json` | Traductions anglaises | Ajout `Common.cv.*` |

Aucune suppression. Aucune modification de `next.config.ts`, `tsconfig.json`, `.env*`, `compose.yaml`, `Justfile`. Le composant est placé dans un nouveau dossier `src/components/features/about/` cohérent avec `src/components/features/projects/` existant.

---

### Task 1 : Étendre `src/lib/assets.ts` avec les helpers CV

**Files:**
- Modify: `src/lib/assets.ts`

**But** : poser la source unique de vérité pour la map locale → filename disque, la constante du nom téléchargement neutre, et le helper qui compose l'URL finale.

- [ ] **Step 1.1 : Remplacer le contenu actuel du fichier**

Le fichier actuel contient uniquement :

```typescript
export function buildAssetUrl(filename: string): string {
  return `/api/assets/${filename}`
}
```

Le remplacer par :

```typescript
import type { Locale } from 'next-intl'

export function buildAssetUrl(filename: string): string {
  return `/api/assets/${filename}`
}

export const CV_FILENAMES = {
  fr: 'cv-thibaud-geisler-fr.pdf',
  en: 'cv-thibaud-geisler-en.pdf',
} as const satisfies Record<Locale, string>

export const CV_DOWNLOAD_FILENAME = 'CV_Thibaud_Geisler.pdf'

export function buildCvUrl(locale: Locale): string {
  return buildAssetUrl(`documents/cv/${CV_FILENAMES[locale]}`)
}
```

**Note** : le `satisfies Record<Locale, string>` force TypeScript à vérifier que toutes les locales déclarées dans `src/i18n/routing.ts` ont une entrée. Si une locale est ajoutée (`de`, `es`) sans entrée ici, le build échoue — fail-fast volontaire. `Locale` est importé depuis `next-intl` (le type est dérivé via `declare module 'next-intl'` dans `src/i18n/types.ts`).

- [ ] **Step 1.2 : Vérifier le typecheck**

Run: `just typecheck`

Expected: aucune erreur. Le type `Record<Locale, string>` est satisfait par la map `{ fr, en }` (les 2 locales de `routing.locales`).

- [ ] **Step 1.3 : Commit des helpers**

```bash
git add src/lib/assets.ts
git commit -m "feat(assets): helpers buildCvUrl + CV_FILENAMES par locale"
```

---

### Task 2 : Ajouter les clés i18n `Common.cv` (FR + EN)

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

**But** : exposer les labels du bouton dans un namespace partagé, réutilisable depuis la page À propos et depuis le footer.

- [ ] **Step 2.1 : Ajouter `cv` dans `messages/fr.json` sous `Common`**

Localiser le bloc `Common` dans `messages/fr.json` :

```json
  "Common": {
    "loading": "Chargement…",
    "retry": "Réessayer"
  },
```

Le remplacer par :

```json
  "Common": {
    "loading": "Chargement…",
    "retry": "Réessayer",
    "cv": {
      "download": "Télécharger mon CV",
      "downloadAriaLabel": "Télécharger le CV au format PDF"
    }
  },
```

- [ ] **Step 2.2 : Ajouter `cv` dans `messages/en.json` sous `Common`**

Localiser le bloc `Common` dans `messages/en.json` (la structure miroir de FR, avec les traductions anglaises existantes de `loading` et `retry`). Ajouter le sous-objet `cv` exactement au même niveau :

```json
    "cv": {
      "download": "Download my CV",
      "downloadAriaLabel": "Download CV as PDF"
    }
```

- [ ] **Step 2.3 : Vérifier le typecheck (consistance des clés)**

Run: `just typecheck`

Expected: aucune erreur. Le type `Messages` déclaré dans `src/i18n/types.ts` est dérivé de `messages/fr.json` ; les deux fichiers doivent partager la même forme pour éviter les erreurs au runtime. Pas d'erreur TypeScript attendue à cette étape (l'usage des clés vient en Task 3).

- [ ] **Step 2.4 : Commit des traductions**

```bash
git add messages/fr.json messages/en.json
git commit -m "feat(i18n): ajoute Common.cv.download + downloadAriaLabel (FR/EN)"
```

---

### Task 3 : Créer le Server Component `DownloadCvButton`

**Files:**
- Create: `src/components/features/about/DownloadCvButton.tsx`

**But** : composant réutilisable qui rend un `<a>` de téléchargement stylé via `Button` shadcn, avec label traduit selon la locale reçue en prop. Aucune interactivité client → Server Component async.

- [ ] **Step 3.1 : Créer le fichier composant**

Créer `src/components/features/about/DownloadCvButton.tsx` avec le contenu :

```typescript
import { FileDown } from 'lucide-react'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { Button } from '@/components/ui/button'
import type { ButtonProps } from '@/components/ui/button'
import { buildCvUrl, CV_DOWNLOAD_FILENAME } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  locale: Locale
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  className?: string
}

export async function DownloadCvButton({
  locale,
  variant = 'default',
  size = 'default',
  className,
}: Props) {
  const t = await getTranslations('Common.cv')

  return (
    <Button asChild variant={variant} size={size} className={cn(className)}>
      <a
        href={buildCvUrl(locale)}
        download={CV_DOWNLOAD_FILENAME}
        aria-label={t('downloadAriaLabel')}
      >
        <FileDown className="mr-2 h-4 w-4" />
        {t('download')}
      </a>
    </Button>
  )
}
```

**Notes** :
- Pas de directive `'use client'` → Server Component async (règle `.claude/rules/nextjs/server-client-components.md`).
- `ButtonProps` et `Button` sont importés depuis `@/components/ui/button` (shadcn).
- `cn()` vient de `@/lib/utils` (helper shadcn déjà présent, voir `src/lib/utils.ts`). Si `className` est absent, `cn()` retourne une string vide → pas d'effet.
- L'icône `FileDown` de `lucide-react` porte `h-4 w-4 mr-2`, identique au pattern `ExternalLink` utilisé dans `CaseStudyFooter.tsx`.
- `download={CV_DOWNLOAD_FILENAME}` force le nom neutre `CV_Thibaud_Geisler.pdf` côté client peu importe le fichier serveur.

- [ ] **Step 3.2 : Vérifier le typecheck**

Run: `just typecheck`

Expected: aucune erreur. Les types `Locale`, `ButtonProps`, `Props` sont tous correctement dérivés.

- [ ] **Step 3.3 : Vérifier le lint**

Run: `just lint`

Expected: aucun warning/erreur sur le nouveau fichier (alias `@/*` OK, pas de composant client mal placé, import order conforme).

- [ ] **Step 3.4 : Commit du composant**

```bash
git add src/components/features/about/DownloadCvButton.tsx
git commit -m "feat(about): Server Component DownloadCvButton"
```

---

### Task 4 : Intégrer le bouton dans la page `/a-propos`

**Files:**
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`

**But** : consommer le nouveau composant dans le rendu public de la page À propos, avec la locale récupérée depuis `params` (déjà typés et awaitable).

- [ ] **Step 4.1 : Remplacer le rendu `AProposPage`**

Le contenu actuel (lignes 24-34) est :

```typescript
export default async function AProposPage({ params }: PageProps<'/[locale]/a-propos'>) {
  await setupLocalePage(params)
  const t = await getTranslations('AboutPage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('placeholder')}</p>
    </main>
  )
}
```

Le remplacer par :

```typescript
export default async function AProposPage({ params }: PageProps<'/[locale]/a-propos'>) {
  await setupLocalePage(params)
  const { locale } = await params
  const t = await getTranslations('AboutPage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('placeholder')}</p>
      <div className="mt-6">
        <DownloadCvButton locale={locale} />
      </div>
    </main>
  )
}
```

- [ ] **Step 4.2 : Ajouter l'import en tête de fichier**

En haut de `src/app/[locale]/(public)/a-propos/page.tsx`, après les imports existants (après l'import de `@/lib/seo` lignes 5-9), ajouter :

```typescript
import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
```

- [ ] **Step 4.3 : Typecheck + lint**

Run: `just typecheck && just lint`

Expected: aucune erreur. `params` étant `Promise<{ locale: Locale }>` dans Next 16, le `await params` renvoie un objet typé.

- [ ] **Step 4.4 : Commit de l'intégration page**

```bash
git add src/app/[locale]/(public)/a-propos/page.tsx
git commit -m "feat(a-propos): ajoute le bouton DownloadCvButton sous le placeholder"
```

---

### Task 5 : Passer Footer en async + insérer copyright et bouton CV

**Files:**
- Modify: `src/components/layout/Footer.tsx`

**But** : remplacer le placeholder TODO par une structure minimale : copyright gauche + bouton CV (outline, sm) droite, responsive (flex-col mobile, flex-row sm+). Le Footer devient un Server Component async pour récupérer la locale via `getLocale()`.

- [ ] **Step 5.1 : Remplacer le contenu complet de `Footer.tsx`**

Le contenu actuel est :

```typescript
export function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* TODO: implement footer (logo, secondary nav, social icons, copyright) */}
      </div>
    </footer>
  )
}
```

Le remplacer par :

```typescript
import { getLocale } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'

export async function Footer() {
  const locale = await getLocale()
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          © {year} Thibaud Geisler
        </p>
        <DownloadCvButton locale={locale} variant="outline" size="sm" />
        {/* TODO: logo, nav secondaire, social icons */}
      </div>
    </footer>
  )
}
```

**Notes** :
- `getLocale()` lit la locale active côté server via next-intl (pas besoin de la faire remonter en prop depuis le Layout).
- `year` dynamique (pas hardcodé `2026`) : le copyright s'autorégénère chaque nouvelle année civile, zéro maintenance. L'année affichée sur un rendu en 2026 sera `2026`.
- Classes Tailwind dans l'ordre conventionnel (`.claude/rules/tailwind/conventions.md`) : layout (`flex flex-col items-center justify-between`), spacing (`gap-4`), colors (`text-muted-foreground`), responsive (`sm:flex-row`).
- Le commentaire `{/* TODO: ... */}` reste pour signaler explicitement que le footer n'est pas fini (hors scope de ce sub-project).

- [ ] **Step 5.2 : Vérifier que les consommateurs de `Footer` sont dans un contexte async compatible**

Run: `grep -rn "<Footer" src/ | head -10`

Expected: tous les usages de `<Footer />` doivent être dans des Server Components (pas de Client Component parent). Si un Client Component le consomme actuellement, le pattern échoue au runtime : dans ce cas, reporter la décision et ouvrir une discussion (le Footer est un composant racine typiquement placé dans un layout RSC). Dans le projet actuel, le Footer est attendu dans `src/app/[locale]/(public)/layout.tsx` ou équivalent Server Component.

- [ ] **Step 5.3 : Typecheck + lint + build**

Run: `just typecheck && just lint`

Expected: aucune erreur. Si le layout parent n'attendait pas un `Promise<ReactNode>` du Footer, Next.js gère nativement les Server Components async en enfant d'autres Server Components (pas de conversion requise).

- [ ] **Step 5.4 : Commit du footer**

```bash
git add src/components/layout/Footer.tsx
git commit -m "feat(footer): structure minimale avec copyright + bouton CV (Server Component async)"
```

---

### Task 6 : Vérification finale (build + validation visuelle)

**But** : confirmer que tout compile, que les tests existants ne régressent pas, et valider visuellement sur le dev server en FR et EN.

- [ ] **Step 6.1 : Typecheck global**

Run: `just typecheck`

Expected: aucune erreur TypeScript sur l'ensemble du projet.

- [ ] **Step 6.2 : Lint global**

Run: `just lint`

Expected: aucun warning/erreur.

- [ ] **Step 6.3 : Build Next.js production**

Run: `just build`

Expected: build réussi, aucune erreur d'hydratation ou de RSC. Vérifier dans la sortie :
- La page `/[locale]/a-propos` apparaît comme `ƒ Dynamic` ou `○ Static` selon la config `generateStaticParams` existante.
- Aucun warning sur le Footer async.

- [ ] **Step 6.4 : Exécuter toute la suite de tests existante**

Run: `just test` (ou, si Docker/Postgres indisponible localement, skipper et laisser la CI valider)

Expected en environnement complet : tous les tests passent. Si `just test-integration` requiert Postgres et que la DB n'est pas up, documenter dans le message de PR que la validation intégration complète se fait en CI ; le sub-project 02 n'introduit pas de nouveau test, donc aucun risque de régression directe.

- [ ] **Step 6.5 : Poser des fichiers PDF de test pour la validation visuelle**

Run:
```bash
mkdir -p assets/documents/cv
# Créer deux PDFs minimaux valides pour la validation visuelle dev (1 ligne chacun)
printf '%%PDF-1.4\n%%%%EOF\n' > assets/documents/cv/cv-thibaud-geisler-fr.pdf
printf '%%PDF-1.4\n%%%%EOF\n' > assets/documents/cv/cv-thibaud-geisler-en.pdf
ls -la assets/documents/cv/
```

Expected: les deux fichiers sont présents. Ces PDFs sont des stubs valides de 15 octets — suffisants pour déclencher le téléchargement navigateur et vérifier le nom du fichier. Ils ne s'ouvrent pas comme un vrai CV mais valident la chaîne end-to-end. Ces fichiers sont gitignorés (`/assets/*`) donc ne partiront pas sur le repo.

- [ ] **Step 6.6 : Démarrer le dev server**

Run: `just dev` (ou `pnpm dev` si le sub-project 01 prévoit `just dev` équivalent)

Expected: serveur Next.js démarré sur `http://localhost:3000`, pas d'erreur au lancement.

- [ ] **Step 6.7 : Valider visuellement FR**

1. Ouvrir `http://localhost:3000/a-propos`
2. Vérifier :
   - Le bouton "Télécharger mon CV" est visible sous le placeholder, avec icône download à gauche
   - Le footer affiche `© <année courante> Thibaud Geisler` à gauche et un bouton "Télécharger mon CV" (style outline, plus petit) à droite
   - Sur un viewport < 640px (devtools responsive), les deux éléments du footer passent en colonne centrée
3. Cliquer sur le bouton CV de la page :
   - Le navigateur télécharge un fichier nommé `CV_Thibaud_Geisler.pdf`
   - Network tab devtools montre `GET /api/assets/documents/cv/cv-thibaud-geisler-fr.pdf` → 200
4. Cliquer sur le bouton CV du footer : même téléchargement, même nom de fichier.

- [ ] **Step 6.8 : Valider visuellement EN**

1. Ouvrir `http://localhost:3000/en/a-propos`
2. Vérifier :
   - Le bouton affiche "Download my CV"
   - Le footer contient un bouton "Download my CV"
3. Cliquer sur l'un des boutons :
   - Téléchargement de `CV_Thibaud_Geisler.pdf`
   - Network: `GET /api/assets/documents/cv/cv-thibaud-geisler-en.pdf` → 200

- [ ] **Step 6.9 : Validation accessibilité rapide**

Dans les devtools Chrome/Firefox, inspecter le bouton :
- L'élément rendu est un `<a>` imbriqué dans un `<button>`... non, attention : `asChild` de Radix fait que `Button` passe ses props à son enfant direct (`<a>`), l'élément final au DOM est un **`<a>` stylé comme un button**. Vérifier dans le DOM inspector que l'élément visible est un `<a href="..." download="..." aria-label="...">`, **pas** un `<button>` enrobant un `<a>`.
- L'attribut `aria-label` est bien présent avec la valeur traduite selon la locale.
- La navigation Tab atteint le bouton, `Enter` déclenche le téléchargement.

- [ ] **Step 6.10 : Nettoyage des stubs PDF (optionnel)**

Si les PDFs de test ne doivent pas rester dans le dossier assets local après la validation :

```bash
rm assets/documents/cv/cv-thibaud-geisler-fr.pdf assets/documents/cv/cv-thibaud-geisler-en.pdf
```

Note : les vrais fichiers CV PDF seront déposés par le propriétaire du portfolio en dehors de ce plan (tâche ops, pas dev).

- [ ] **Step 6.11 : Arrêter le dev server et confirmer**

Run: `just stop` (libère le port 3000)

Expected: serveur arrêté proprement.

---

## Self-Review

**Spec coverage :**
- Scénario 1 (téléchargement FR `CV_Thibaud_Geisler.pdf`) → Step 6.7 (validation visuelle) + Task 1 (buildCvUrl) + Task 3 (download attribute) + Task 4 (intégration page).
- Scénario 2 (téléchargement EN idem) → Step 6.8 couvre intégralement + mêmes tasks.
- Scénario 3 (bouton footer sur toutes les pages publiques, copyright + responsive) → Task 5 (layout flex-col/flex-row) + Step 6.7 item 2 (viewport < 640px).
- Scénario 4 (accessibilité : aria-label + Tab + Enter) → Task 3 (aria-label) + Step 6.9 (vérification devtools).
- Scénario 5 (cohérence FR/EN dans les deux emplacements) → la source unique `buildCvUrl(locale)` garantit cohérence ; Step 6.7 + 6.8 valident les deux emplacements simultanément.

**Placeholder scan :** aucun TBD/TODO dans les étapes (hormis le commentaire intentionnel `{/* TODO: logo, nav secondaire, social icons */}` dans le code footer, explicitement justifié dans le spec comme volontairement hors scope).

**Type consistency :**
- `Locale` est importé depuis `next-intl` partout (Task 1, Task 3).
- `CV_FILENAMES`, `CV_DOWNLOAD_FILENAME`, `buildCvUrl` : noms stables entre Task 1 (définition) et Task 3 (usage dans le composant).
- `DownloadCvButton` : import path `@/components/features/about/DownloadCvButton` identique en Task 4 et Task 5.
- `ButtonProps['variant' | 'size']` : typé via import depuis `@/components/ui/button` en Task 3, réutilisé en Task 5 via props de haut niveau `variant="outline"` et `size="sm"` (valeurs valides du type).

---

## Verification (end-to-end manual, déjà intégré en Task 6)

Les étapes 6.5 à 6.11 couvrent l'ensemble de la validation end-to-end : pose des fixtures PDF, démarrage dev server, check visuel FR + EN sur /a-propos et sur le footer, test du clic télécharge avec bon nom de fichier, vérification accessibilité. Aucune commande supplémentaire requise.
