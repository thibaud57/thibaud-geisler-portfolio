---
feature: "Feature 6 — Support multilingue (FR / EN)"
subproject: "Sélecteur de langue FR/EN dans la navbar"
goal: "Implémenter le sélecteur de langue FR/EN dans la navbar avec shadcn/ui DropdownMenu et l'icône Globe de Lucide"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["04-navigation-localisee-design.md", "03-layout-locale-design.md"]
date: "2026-04-16"
---

# Sélecteur de langue FR/EN dans la navbar

## Scope

Créer un composant Client `LanguageSwitcher` utilisant `DropdownMenu` de shadcn/ui et l'icône `Globe` de Lucide. Le composant utilise `useRouter` et `usePathname` localisés depuis `@/i18n/navigation` pour basculer la locale en préservant la page courante. Intégration dans la navbar existante à côté du Theme Toggle. Exclut les styles de la navbar elle-même.

### État livré

À la fin de ce sub-project, on peut : cliquer sur le sélecteur Globe dans la navbar, choisir "English" ou "Français", et voir la page se recharger dans la langue choisie en préservant la route courante.

## Dependencies

- `04-navigation-localisee-design.md` (statut: implemented), fournit `useRouter`, `usePathname` localisés
- `03-layout-locale-design.md` (statut: implemented), fournit le layout `[locale]` avec `NextIntlClientProvider`

## Files touched

- **À créer** : `src/components/features/language-switcher.tsx`
- **À modifier** : composant navbar existant (intégration du LanguageSwitcher)

## Architecture approach

- **Client Component** (`'use client'`) : le composant utilise des hooks interactifs (`useRouter`, `usePathname`, `useLocale`). Respect de `.claude/rules/nextjs/server-client-components.md` (leaf client component)
- **shadcn/ui DropdownMenu** : `DropdownMenuTrigger` avec `Button` variant `ghost` + icône `Globe` (Lucide, 20px), `DropdownMenuContent` avec deux `DropdownMenuItem` ("Français", "English"). Respect de `.claude/rules/shadcn-ui/components.md`
- **Changement de locale** : `router.replace(pathname, { locale: targetLocale })` via le `useRouter` localisé. `replace` plutôt que `push` pour ne pas polluer l'historique de navigation
- **Locale active** : `useLocale()` depuis `next-intl` pour identifier la locale courante et afficher un indicateur visuel (check mark ou font-weight bold)
- **Accessibilité** : `aria-label` sur le trigger ("Changer de langue" / "Change language"), le DropdownMenu gère déjà le focus management via Radix UI
- **Placement** : à côté du AnimatedThemeToggler dans la navbar (DESIGN.md : mapping composants)
- **Composition avec cn()** : `.claude/rules/tailwind/conventions.md`

## Acceptance criteria

### Scénario 1 : Basculement FR vers EN

**GIVEN** un visiteur sur `/fr/projets`
**WHEN** il clique sur le Globe puis sur "English"
**THEN** la page se recharge sur `/en/projets`
**AND** le contenu est affiché en anglais

### Scénario 2 : Basculement EN vers FR

**GIVEN** un visiteur sur `/en/contact`
**WHEN** il clique sur le Globe puis sur "Français"
**THEN** la page se recharge sur `/fr/contact`

### Scénario 3 : Locale active indiquée visuellement

**GIVEN** un visiteur sur `/fr/`
**WHEN** il ouvre le dropdown du Globe
**THEN** "Français" est visuellement marqué comme actif (check mark ou bold)

### Scénario 4 : Responsive mobile

**GIVEN** un visiteur sur mobile (menu hamburger)
**WHEN** il ouvre le menu mobile et accède au sélecteur de langue
**THEN** le sélecteur est accessible et fonctionnel
