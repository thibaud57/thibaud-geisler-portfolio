# Footer extension nav légale + SIRET copyright Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compléter le Footer global (TODO ligne 38) avec une nav légale row bottom (3 liens : Mentions légales, Politique de confidentialité, Gérer mes cookies) et étendre la ligne copyright avec le SIRET formaté lu via `getPublisher` du sub 1.

**Architecture:** Modification chirurgicale d'un Server Component existant. Parallélisation de `getTranslations('Footer')` et `getPublisher()` via `Promise.all`. Réutilisation du helper `formatSiret` (sub 4) + composant `<OpenCookiePreferencesButton>` (sub 4, prop `label?` déjà exposée nativement) + `Link` next-intl localisé. Aucun nouveau fichier créé.

**Tech Stack:** Next.js 16, React 19, TypeScript 6 strict, next-intl 4, pnpm 10. Pas de test : `tdd_scope = none`.

**Spec source :** [docs/superpowers/specs/conformite-legale/07-footer-extension-nav-legale-siret-design.md](../../specs/conformite-legale/07-footer-extension-nav-legale-siret-design.md)

**Discipline commit (CLAUDE.md projet) :** AUCUN `git commit` intermédiaire pendant l'implémentation. Un seul commit final après validation utilisateur explicite à la fin de Task 5.

**Rules applicables :**
- `.claude/rules/nextjs/server-client-components.md` (Server Component async, leaf client component pattern)
- `.claude/rules/nextjs/data-fetching.md` (`Promise.all` parallel queries, queries cachées Server Components)
- `.claude/rules/next-intl/translations.md` (`getTranslations` async serveur, namespaces)
- `.claude/rules/next-intl/setup.md` (`Link` localisé `@/i18n/navigation`)
- `.claude/rules/shadcn-ui/components.md` (Button variant link, primitive interactive)
- `.claude/rules/tailwind/conventions.md` (cn(), tokens sémantiques, mobile-first)
- `.claude/rules/typescript/conventions.md` (alias `@/*`)

---

## Task 1: Étendre messages/fr.json et messages/en.json avec `Footer.legalNav`

**Files:**
- Modify: `messages/fr.json` (extension namespace `Footer` existant avec sous-objet `legalNav`)
- Modify: `messages/en.json` (idem EN)

- [ ] **Step 1.1: Localiser le namespace `Footer` dans `messages/fr.json`**

Ouvrir `messages/fr.json` et chercher le namespace `Footer` existant (créé au sub-project pages-publiques-portfolio, contient déjà `tagline`, `location`, `cv.label`).

- [ ] **Step 1.2: Ajouter le sous-objet `legalNav` au namespace `Footer` de `messages/fr.json`**

À l'intérieur du namespace `Footer`, ajouter à la fin (en respectant la virgule de séparation avec la dernière clé existante, typiquement `cv`) :

```json
"legalNav": {
  "ariaLabel": "Liens légaux",
  "mentions": "Mentions légales",
  "privacy": "Politique de confidentialité",
  "cookies": "Gérer mes cookies"
}
```

Le namespace `Footer` ressemblera ensuite à :
```json
"Footer": {
  "tagline": "...",
  "location": "...",
  "cv": { "label": "..." },
  "legalNav": {
    "ariaLabel": "Liens légaux",
    "mentions": "Mentions légales",
    "privacy": "Politique de confidentialité",
    "cookies": "Gérer mes cookies"
  }
}
```

- [ ] **Step 1.3: Ajouter le même sous-objet à `messages/en.json` avec traductions EN**

Idem position d'insertion dans le namespace `Footer` de `messages/en.json` :

```json
"legalNav": {
  "ariaLabel": "Legal links",
  "mentions": "Legal notice",
  "privacy": "Privacy policy",
  "cookies": "Manage my cookies"
}
```

- [ ] **Step 1.4: Vérifier la cohérence JSON et le typecheck**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8'));JSON.parse(require('fs').readFileSync('messages/en.json','utf8'));console.log('OK')"`
Expected: `OK`

Run: `pnpm typecheck`
Expected: aucune erreur. Les nouvelles clés sont accessibles via `t('Footer.legalNav.mentions')` etc.

---

## Task 2: Modifier `Footer.tsx` (ajout imports + Promise.all + nav légale + SIRET)

**Files:**
- Modify: `src/components/layout/Footer.tsx`

- [ ] **Step 2.1: Remplacer entièrement le contenu du fichier par la version étendue**

Le contenu actuel de `src/components/layout/Footer.tsx` (43 lignes, avec le commentaire TODO ligne 38 réservé pour la nav légale).

Remplacer entièrement par :

```typescript
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { OpenCookiePreferencesButton } from '@/components/features/legal/OpenCookiePreferencesButton'
import { SocialLinks } from '@/components/features/contact/SocialLinks'
import { Link } from '@/i18n/navigation'
import { formatSiret } from '@/lib/legal/format-siret'
import { getPublisher } from '@/server/queries/legal'

import { BrandLogo } from './BrandLogo'

type Props = {
  locale: Locale
}

export async function Footer({ locale }: Props) {
  const [t, publisher] = await Promise.all([
    getTranslations('Footer'),
    getPublisher(),
  ])

  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto grid gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
        <div className="flex flex-col gap-3">
          <BrandLogo />
          <p className="text-sm text-muted-foreground">{t('tagline')}</p>
          <p className="text-sm text-muted-foreground">{t('location')}</p>
        </div>

        <div className="flex flex-col gap-6 lg:items-end">
          <SocialLinks />
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <p className="text-sm text-muted-foreground">{t('cv.label')}</p>
            <DownloadCvButton locale={locale} variant="outline" size="sm" />
          </div>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col gap-4 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {process.env.NEXT_PUBLIC_BUILD_YEAR} Thibaud Geisler
            {publisher.siret && ` - SIRET ${formatSiret(publisher.siret)}`}
          </p>
          <nav
            aria-label={t('legalNav.ariaLabel')}
            className="flex flex-wrap items-center gap-x-4 gap-y-2"
          >
            <Link href="/mentions-legales" className="hover:text-foreground transition-colors">
              {t('legalNav.mentions')}
            </Link>
            <Link href="/confidentialite" className="hover:text-foreground transition-colors">
              {t('legalNav.privacy')}
            </Link>
            <OpenCookiePreferencesButton variant="link" label={t('legalNav.cookies')} />
          </nav>
        </div>
      </div>
    </footer>
  )
}
```

Diff vs version actuelle :
- +5 imports (`OpenCookiePreferencesButton`, `Link` de `@/i18n/navigation`, `formatSiret`, `getPublisher`, parallélisation `Promise.all`)
- Le `await getTranslations('Footer')` devient une déstructuration `Promise.all` avec `getPublisher()`
- Suppression du commentaire `// TODO(feature-7-conformite-legale): nav légale (mentions, confidentialité, cookies)` (ligne 38)
- Extension du `<p>` copyright avec ternaire `{publisher.siret && ...}`
- Ajout d'un `<nav aria-label>` avec 3 enfants après le `<p>` copyright

Row haute (BrandLogo + SocialLinks + DownloadCvButton) reste strictement identique.

- [ ] **Step 2.2: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. Les imports résolvent correctement (`getPublisher` du sub 1, `formatSiret` du sub 4, `OpenCookiePreferencesButton` du sub 4 + sub 5 avec prop `label?`, `Link` de `@/i18n/navigation`).

- [ ] **Step 2.3: Vérifier l'absence d'erreur lint**

Run: `pnpm lint`
Expected: aucune erreur. Le composant respecte les conventions React 19 (Server Component async, hooks au top du composant, props sérialisables).

---

## Task 3: Smoke tests en dev

**Files:** aucun fichier modifié.

Note prérequis : sub 1 (DB seedée avec publisher Thibaud + siret), sub 3 (`<ConsentManagerProvider>` c15t mounté dans Providers), sub 4 (pages mentions/confidentialité existantes + composants livrés avec prop `label?`) doivent déjà être implémentés et mergés.

- [ ] **Step 3.1: Démarrer le serveur dev**

Run: `pnpm dev`
Expected: serveur démarre sur `http://localhost:3000` sans erreur.

- [ ] **Step 3.2: Charger /fr/ et inspecter le footer**

Ouvrir `http://localhost:3000/fr/` dans un navigateur, scroller en bas de page.
Expected:
- Row bottom du footer contient :
  - Ligne copyright `© 2026 Thibaud Geisler - SIRET 880 419 122 00036` (tiret simple, SIRET formaté avec 3 espaces)
  - Une `<nav>` (avec aria-label "Liens légaux" inspectable via DevTools) contenant 3 éléments interactifs côte à côte : "Mentions légales" (lien), "Politique de confidentialité" (lien), "Gérer mes cookies" (bouton style link)
- Row haute (Logo + tagline + location + SocialLinks + CV) inchangée

- [ ] **Step 3.3: Cliquer sur "Mentions légales"**

Cliquer sur le lien "Mentions légales" du footer.
Expected:
- Navigation client-side de Next.js vers `/fr/mentions-legales`
- La page mentions légales (livrée par sub 4) s'affiche avec ses 5 sections LCEN

- [ ] **Step 3.4: Cliquer sur "Politique de confidentialité"**

Retourner sur `/fr/`, cliquer sur "Politique de confidentialité" du footer.
Expected:
- Navigation vers `/fr/confidentialite`
- La page confidentialité (livrée par sub 4) s'affiche avec ses 7 sections RGPD

- [ ] **Step 3.5: Cliquer sur "Gérer mes cookies"**

Retourner sur `/fr/`, cliquer sur "Gérer mes cookies" du footer.
Expected:
- La modale `ConsentDialog` c15t du sub 3 s'ouvre, affichant les 2 catégories (necessary read-only + marketing toggle interactif)
- Aucune erreur en console DevTools
- Si l'utilisateur a déjà interagi avec le banner précédemment, l'état des toggles reflète le dernier choix persisté

- [ ] **Step 3.6: Charger /en/ et vérifier la version EN**

Ouvrir `http://localhost:3000/en/`.
Expected:
- Le footer affiche en row bottom :
  - Ligne copyright `© 2026 Thibaud Geisler - SIRET 880 419 122 00036` (les nombres ne se traduisent pas)
  - Nav avec aria-label "Legal links", liens "Legal notice" / "Privacy policy" / "Manage my cookies"
- Clic "Legal notice" navigue vers `/en/mentions-legales`
- Clic "Privacy policy" navigue vers `/en/confidentialite`

- [ ] **Step 3.7: Vérifier le layout responsive**

Avec DevTools Device Toolbar (ou Ctrl+Shift+M) :
- Largeur 320px (mobile small) : copyright en haut full-width, nav légale en bas full-width avec wrap si nécessaire
- Largeur 768px (md) : copyright à gauche, nav à droite, alignés horizontalement
- Largeur 1280px (desktop) : idem md, conteneur centré max-w-7xl

Expected: aucun débordement horizontal, aucun élément coupé, le focus state Tailwind reste visible au Tab clavier sur les liens et le bouton.

- [ ] **Step 3.8: Vérifier l'absence de violations CSP**

Pour les 3 pages chargées (`/fr/`, `/fr/mentions-legales`, `/fr/confidentialite`), DevTools console doit être propre :
- Aucune violation CSP `script-src` ou `connect-src` (le footer n'introduit aucune ressource externe nouvelle)
- Aucun warning React (hydration mismatch, deps useEffect manquantes, etc.)

- [ ] **Step 3.9: Arrêter le serveur dev**

Run: `Ctrl+C`.

---

## Task 4: Smoke tests en build prod

**Files:** aucun fichier modifié.

- [ ] **Step 4.1: Builder l'app en mode production**

Run: `pnpm build`
Expected: build réussi, aucune erreur. Pas d'augmentation significative du bundle (Server Component, Client Component leaf déjà présent depuis sub 4).

- [ ] **Step 4.2: Démarrer le serveur prod**

Run: `pnpm start`
Expected: serveur démarre sur `http://localhost:3000` en mode production.

- [ ] **Step 4.3: Refaire les smoke tests Step 3.2 à 3.8 en prod**

Reproduire en mode incognito :
- Footer rend SIRET + nav légale sur `/fr/` et `/en/`
- Clics sur les 3 liens fonctionnent (navigation + ouverture modale)
- Layout responsive OK
- Aucune violation CSP

Expected: comportement identique à dev. Aucune divergence dev/prod.

- [ ] **Step 4.4: Arrêter le serveur prod**

Run: `Ctrl+C`.

---

## Task 5: Vérifications finales et préparation commit

- [ ] **Step 5.1: Lancer le typecheck global**

Run: `pnpm typecheck`
Expected: aucune erreur.

- [ ] **Step 5.2: Lancer le lint**

Run: `pnpm lint`
Expected: aucune erreur.

- [ ] **Step 5.3: Lancer la suite de tests complète (régression)**

Run: `pnpm test`
Expected: tous les tests verts. Aucune régression sur les tests existants (sub 1 `legal.integration.test.ts`, sub 3 `consent-language-sync.integration.test.tsx`, sub 4 `format-siret.test.ts`, sub 5 `CalendlyWidget.integration.test.tsx`, sub 6 `json-ld.test.ts`).

Note : ce sub-project n'introduit aucun nouveau test (tdd_scope = none, justifié au spec). Les règles métier critiques sont déjà couvertes transversement par les tests des dépendances.

- [ ] **Step 5.4: Lancer un build final**

Run: `pnpm build`
Expected: build réussi sans warning bloquant.

- [ ] **Step 5.5: Vérifier le diff git**

Run: `git status`
Expected output (les fichiers attendus) :
- modified: `src/components/layout/Footer.tsx`
- modified: `messages/fr.json`
- modified: `messages/en.json`

Vérifier qu'il n'y a pas de fichier inattendu.

- [ ] **Step 5.6: DEMANDER VALIDATION USER avant tout `git add` / `git commit`**

NE PAS lancer `git commit` directement. La discipline projet (CLAUDE.md projet § Workflow Git > Discipline commit) interdit les commits auto-initiés.

Présenter à l'utilisateur :
1. La liste des fichiers modifiés (output `git status`)
2. Un résumé : "Sub-project 7/7 implémenté : Footer étendu avec nav légale 3 liens (Mentions légales, Politique de confidentialité, Gérer mes cookies) + SIRET formaté sous copyright. Réutilisation getPublisher (sub 1) + formatSiret (sub 4) + OpenCookiePreferencesButton (sub 4+5). Smoke tests dev + prod OK en FR et EN."
3. Une proposition de message de commit Conventional :
   ```
   feat(layout): extend Footer with legal nav and SIRET copyright

   - Nav légale row bottom (3 liens) : Mentions légales, Politique de confidentialité, Gérer mes cookies
   - Ligne copyright étendue avec SIRET formaté lu via getPublisher (sub legal-entity)
   - Réutilisation formatSiret (sub pages-mentions) + OpenCookiePreferencesButton variant link (sub gating-calendly)
   - Link next-intl localisé pour navigation FR/EN automatique
   - 4 nouvelles clés i18n Footer.legalNav.{ariaLabel, mentions, privacy, cookies} en FR/EN

   Refs: docs/superpowers/specs/conformite-legale/07-footer-extension-nav-legale-siret-design.md
   ```

Attendre l'accord explicite de l'utilisateur avant de lancer `git add` puis `git commit`.

- [ ] **Step 5.7: Après validation user uniquement, commiter**

Run (uniquement après accord explicite user) :
```bash
git add src/components/layout/Footer.tsx messages/fr.json messages/en.json
git commit -m "$(cat <<'EOF'
feat(layout): extend Footer with legal nav and SIRET copyright

- Nav légale row bottom (3 liens) : Mentions légales, Politique de confidentialité, Gérer mes cookies
- Ligne copyright étendue avec SIRET formaté lu via getPublisher (sub legal-entity)
- Réutilisation formatSiret (sub pages-mentions) + OpenCookiePreferencesButton variant link (sub gating-calendly)
- Link next-intl localisé pour navigation FR/EN automatique
- 4 nouvelles clés i18n Footer.legalNav.{ariaLabel, mentions, privacy, cookies} en FR/EN

Refs: docs/superpowers/specs/conformite-legale/07-footer-extension-nav-legale-siret-design.md
EOF
)"
```

Run: `git status`
Expected: working tree clean.

- [ ] **Step 5.8: Mettre à jour le statut du spec**

Modifier le frontmatter de `docs/superpowers/specs/conformite-legale/07-footer-extension-nav-legale-siret-design.md` :
- Changer `status: "draft"` en `status: "implemented"`

Cette modification peut être commitée séparément en `chore(specs): mark footer-extension-nav-legale-siret as implemented` après accord user.

---

## Self-Review

**Spec coverage check :**

| Spec section | Task(s) couvrant |
|---|---|
| Footer rend nav légale + SIRET sur `/fr/` (Scénario 1) | Task 2 + Task 3 Step 3.2 |
| Footer rend nav légale + SIRET sur `/en/` (Scénario 2) | Task 1 (i18n EN) + Task 3 Step 3.6 |
| Clic "Mentions légales" navigation localisée (Scénario 3) | Task 2 (Link next-intl) + Task 3 Step 3.3 |
| Clic "Politique de confidentialité" navigation (Scénario 4) | Task 3 Step 3.4 |
| Clic "Gérer mes cookies" ouvre modale (Scénario 5) | Task 2 (OpenCookiePreferencesButton consommé) + Task 3 Step 3.5 |
| Layout responsive mobile/desktop (Scénario 6) | Task 3 Step 3.7 |
| SIRET absent gracefully dégradé (Scénario 7) | Task 2 (ternaire `publisher.siret && ...`) |
| 4 clés i18n FR/EN | Task 1 |
| Aucune violation CSP | Task 3 Step 3.8 + Task 4 Step 4.3 |

Aucun gap identifié.

**Placeholder scan :** aucun TBD/TODO/à définir dans le plan. Code complet à chaque step. Textes i18n FR + EN intégraux fournis Task 1. Code complet `Footer.tsx` modifié fourni Task 2 (verbatim, pas de "similar to before").

**Type consistency :** `formatSiret(siret: string): string` cohérent avec sub 4. `OpenCookiePreferencesButton` props `{ variant?, label? }` cohérent avec sub 4 + sub 5 extension. `getPublisher()` retour `LegalEntity & { address, publisher }` cohérent avec sub 1 (on accède à `publisher.siret` qui existe sur le modèle Prisma `LegalEntity`). `Link` from `@/i18n/navigation` cohérent avec le pattern projet existant. Hook `useTranslations`/`getTranslations` cohérent avec le namespace `Footer.legalNav` défini Task 1.

---

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/conformite-legale/07-footer-extension-nav-legale-siret.md`.**

**Sub-project 7/7 — DERNIER de la Feature 7 Conformité légale.**

Ce plan sera consommé par `/implement-subproject conformite-legale 07` lors de l'implémentation effective, après que les sub-projects précédents (01 → 02 → 03 → 04 → 05 → 06) soient tous implémentés dans l'ordre topologique.

La décomposition de la Feature 7 est complète : 7 specs + 7 plans produits, prêts pour l'implémentation.
