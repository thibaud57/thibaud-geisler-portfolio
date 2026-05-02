# Sélecteur de langue FR/EN: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter le sélecteur de langue FR/EN dans la navbar avec shadcn/ui DropdownMenu et l'icône Globe de Lucide.

**Architecture:** Client Component leaf utilisant `useRouter`/`usePathname` localisés et `useLocale` pour basculer la locale via `router.replace`. Composant shadcn/ui DropdownMenu avec Globe trigger, intégré dans la navbar existante.

**Tech Stack:** Next.js 16, next-intl 4.9.1, shadcn/ui (DropdownMenu), Lucide React (Globe), TypeScript 6

**Spec:** `docs/superpowers/specs/support-multilingue/06-selecteur-langue-design.md`

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `src/components/features/language-switcher.tsx` | Composant sélecteur de langue |
| Modify | Composant navbar existant | Intégration du LanguageSwitcher |

---

### Task 1: Créer le composant LanguageSwitcher

**Files:**
- Create: `src/components/features/language-switcher.tsx`

**Docs:** `.claude/rules/shadcn-ui/components.md`, `.claude/rules/next-intl/setup.md`, `.claude/rules/react/hooks.md`

- [ ] **Step 1: Vérifier que les composants shadcn nécessaires sont installés**

```bash
ls src/components/ui/dropdown-menu.tsx src/components/ui/button.tsx 2>/dev/null
```

Si `dropdown-menu.tsx` n'existe pas :

```bash
pnpm dlx shadcn@latest add dropdown-menu
```

- [ ] **Step 2: Créer `src/components/features/language-switcher.tsx`**

```tsx
'use client'

import { useLocale } from 'next-intl'
import { Globe } from 'lucide-react'

import { useRouter, usePathname } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const localeLabels: Record<string, string> = {
  fr: 'Français',
  en: 'English',
}

export function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  function handleLocaleChange(newLocale: string) {
    router.replace(pathname, { locale: newLocale })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Change language">
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleLocaleChange(loc)}
            className={cn(locale === loc && 'font-semibold')}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

Points clés :
- `'use client'` : hooks interactifs (useLocale, useRouter, usePathname, onClick)
- `useLocale()` depuis `next-intl` : identifie la locale active
- `router.replace(pathname, { locale })` : change de locale sans polluer l'historique
- `routing.locales.map()` : itère dynamiquement sur les locales configurées
- `cn(locale === loc && 'font-semibold')` : indicateur visuel de la locale active
- `localeLabels` : mapping locale → label lisible, hors du composant (pas de re-création à chaque render)
- `Button variant="ghost" size="icon"` : cohérent avec le style du Theme Toggle
- `Globe className="h-5 w-5"` : 20px, taille standard icônes UI (DESIGN.md)

- [ ] **Step 3: Commit**

```bash
git add src/components/features/language-switcher.tsx
git commit -m "feat(i18n): create LanguageSwitcher component with Globe dropdown"
```

---

### Task 2: Intégrer dans la navbar

**Files:**
- Modify: composant navbar existant (probablement `src/components/features/navbar.tsx`)

- [ ] **Step 1: Lire le composant navbar**

Identifier l'emplacement du Theme Toggle (AnimatedThemeToggler) pour placer le LanguageSwitcher à côté.

- [ ] **Step 2: Ajouter l'import et le composant**

Ajouter l'import :
```typescript
import { LanguageSwitcher } from '@/components/features/language-switcher'
```

Placer `<LanguageSwitcher />` à côté du Theme Toggle dans le JSX de la navbar desktop ET dans le menu mobile (Sheet).

Exemple de placement :
```tsx
<div className="flex items-center gap-2">
  <LanguageSwitcher />
  <ThemeToggler />
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/features/
git commit -m "feat(i18n): integrate LanguageSwitcher in navbar"
```

---

### Task 3: Vérification finale

- [ ] **Step 1: Type-check**

```bash
pnpm tsc --noEmit
```

Expected: aucune erreur.

- [ ] **Step 2: Tester le basculement de langue**

Démarrer `pnpm dev`. Sur `/fr/projets`, cliquer sur le Globe, sélectionner "English".

Expected: redirection vers `/en/projets`, contenu en anglais.

- [ ] **Step 3: Tester le retour vers le français**

Sur `/en/projets`, cliquer sur le Globe, sélectionner "Français".

Expected: redirection vers `/fr/projets`, contenu en français.

- [ ] **Step 4: Tester sur mobile**

Réduire la fenêtre du navigateur pour passer en mode mobile. Ouvrir le menu hamburger.

Expected: le LanguageSwitcher est accessible et fonctionnel dans le menu mobile.

- [ ] **Step 5: Vérifier l'indicateur de locale active**

Ouvrir le dropdown Globe sur `/fr`.

Expected: "Français" est affiché en gras (font-semibold).
