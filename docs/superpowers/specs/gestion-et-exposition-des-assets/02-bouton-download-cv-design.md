---
feature: "Feature 3 MVP — Gestion et exposition des assets"
subproject: "bouton-download-cv"
goal: "Rendre le CV téléchargeable depuis /a-propos et depuis le footer via un Server Component réutilisable"
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["01-support-pdf-route-assets-design.md"]
date: "2026-04-24"
---

# Bouton "Télécharger mon CV" sur /a-propos et dans le footer

## Scope

Exposer le CV au public via un bouton CTA réutilisable (Server Component `DownloadCvButton`) affiché sur la page `/[locale]/a-propos` et dans le footer global. Le bouton construit son URL via un helper centralisé `buildCvUrl(locale)` et impose un nom de téléchargement neutre `CV_Thibaud_Geisler.pdf` (attribut `download`) même si les fichiers sur disque sont différenciés par locale (`cv-thibaud-geisler-fr.pdf` / `cv-thibaud-geisler-en.pdf`). Le footer reçoit un minimum de structure (copyright + bouton CV en flex row), le reste (logo, nav secondaire, socials) reste un `TODO` explicite. **Exclu** : bouton dans la Navbar (reporté) ; upload/remplacement du CV depuis un dashboard (post-MVP) ; analytics Umami (post-MVP) ; refonte complète du footer (dehors du périmètre).

### État livré

À la fin de ce sub-project, on peut : naviguer sur `http://localhost:3000/a-propos` (FR) et voir un bouton "Télécharger mon CV" avec icône, cliquer et recevoir le fichier `CV_Thibaud_Geisler.pdf` (contenu = `assets/documents/cv/cv-thibaud-geisler-fr.pdf`) ; même comportement sur `http://localhost:3000/en/a-propos` avec le label "Download my CV" et le contenu EN ; le footer affiche le copyright `© 2026 Thibaud Geisler` à gauche et le bouton CV à droite sur toutes les pages publiques.

## Dependencies

- `01-support-pdf-route-assets-design.md` (statut: `draft`) — requiert que `CONTENT_TYPE_MAP` inclue `pdf: 'application/pdf'` et que la convention `documents/<slug>/<filename>` soit documentée dans la rule. Sans cette dépendance implémentée, le bouton génère un `GET /api/assets/documents/cv/…` qui répond 400 (extension PDF non whitelistée).

## Files touched

- **À créer** : `src/components/features/about/DownloadCvButton.tsx` (Server Component, nouveau dossier `features/about/`)
- **À modifier** : `src/lib/assets.ts` (ajout `CV_FILENAMES`, `CV_DOWNLOAD_FILENAME`, `buildCvUrl(locale)`)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (import + rendu du bouton après le `<p>{t('placeholder')}</p>` existant, passage de `locale` déjà disponible dans `params`)
- **À modifier** : `src/components/layout/Footer.tsx` (remplacement du placeholder TODO par une structure flex responsive : copyright gauche, bouton CV droite, reste laissé en `TODO` explicite)
- **À modifier** : `messages/fr.json` (ajout `Common.cv.download` + `Common.cv.downloadAriaLabel`)
- **À modifier** : `messages/en.json` (ajout `Common.cv.download` + `Common.cv.downloadAriaLabel`)

## Architecture approach

- **Helper centralisé dans `src/lib/assets.ts`** : la constante `CV_FILENAMES` map la locale vers le filename disque, typée via `satisfies Record<Locale, string>` (type `Locale` importé depuis `next-intl`, déjà utilisé dans `src/app/global-error.tsx`, `src/i18n/locale-guard.ts`, `src/lib/seo.ts`). Le helper `buildCvUrl(locale: Locale)` compose `buildAssetUrl('documents/cv/' + CV_FILENAMES[locale])` — pas de duplication, un seul path à modifier si la convention change. Voir `.claude/rules/typescript/conventions.md` (dérivation de types, alias `@/*`).
- **Séparation filename disque ↔ filename download** : la constante `CV_DOWNLOAD_FILENAME = 'CV_Thibaud_Geisler.pdf'` vit dans `src/lib/assets.ts` à côté. Utilisée côté composant dans l'attribut HTML `download="..."`. Découplage explicite : le disque respecte le regex kebab-case imposé par la rule `.claude/rules/nextjs/assets.md` (segment `^[a-z0-9][a-z0-9._-]*$`) ; le download peut porter un nom libre (underscores, majuscules, convention RH `CV_<Nom>`).
- **Server Component async `DownloadCvButton`** : reçoit `{ locale: Locale, variant?, size? }` en props (défauts : `variant: 'default'`, `size: 'default'`), lit le label via `getTranslations('Common.cv')`. Ne porte aucune interactivité (hover et focus sont gérés par les CSS de `Button`), donc pas de directive `'use client'`. Conforme à `.claude/rules/nextjs/server-client-components.md` (privilégier Server Components, n'isoler en Client que pour interactivité réelle). Le pattern `Button asChild + <a>` est déjà utilisé dans `CaseStudyFooter.tsx` ; on le reproduit à l'identique pour cohérence (`.claude/rules/shadcn-ui/components.md`).
- **Accessibilité** : le `<a>` porte `aria-label={t('downloadAriaLabel')}` pour préciser "Télécharger le CV au format PDF" aux lecteurs d'écran (le texte visible « Télécharger mon CV » manque de précision sur le format). Pas de `target="_blank"` : `download` suffit à déclencher un téléchargement direct, ouvrir un nouvel onglet serait redondant.
- **Intégration page `/a-propos`** : la page est déjà un Server Component async avec `params` typé `PageProps<'/[locale]/a-propos'>`. Extraire `locale` via `const { locale } = await params` (Next 16 : `params` est une Promise, hard error sur accès sync). Passer en prop `<DownloadCvButton locale={locale} />`. Voir `.claude/rules/nextjs/routing.md` (params async), `.claude/rules/next-intl/translations.md` (getTranslations server).
- **Intégration footer** : `Footer.tsx` passe Server Component async (s'il ne l'est pas déjà, le rendre async — import de `getLocale` depuis `next-intl/server`). Structure intérieure : `<div className="... flex flex-col sm:flex-row items-center justify-between gap-4">` avec copyright à gauche (`<p className="text-sm text-muted-foreground">© 2026 Thibaud Geisler</p>`) et `<DownloadCvButton locale={locale} variant="outline" size="sm" />` à droite. Le variant `outline` + size `sm` évite de concurrencer visuellement un CTA primaire. Conforme `.claude/rules/tailwind/conventions.md` (tokens `bg-*`, classes utilitaires Tailwind, responsive mobile-first).
- **i18n namespace `Common.cv`** : le bouton apparaît dans 2 emplacements (page À propos + footer) et pourrait réapparaître ailleurs (services, homepage). Le namespace `Common` est déjà utilisé (ex: `Common.retry`), logique à étendre. Alternative rejetée : `AboutPage.cta.downloadCv` verrouille le label à une seule page, incohérent quand il est aussi rendu dans le footer global. Voir `.claude/rules/next-intl/translations.md` (conventions de namespaces).
- **Pas de tests** : justification no-lib-test (`~/.claude/CLAUDE.md` § Code > Tests). Le composant est un lien `<a>` avec attribut `download`, la locale → filename est un lookup dans une constante immuable, le label vient de next-intl (lib), `buildAssetUrl` est déjà testé. Aucune règle métier propre au portfolio : un test vérifierait soit du rendu shadcn/Lucide (lib), soit du lookup trivial. La validation se fait manuellement sur `pnpm dev` FR et EN (voir Verification du plan).

## Acceptance criteria

### Scénario 1 : Téléchargement depuis /a-propos en FR
**GIVEN** la page `/a-propos` (locale FR) et le fichier `assets/documents/cv/cv-thibaud-geisler-fr.pdf` présent sur disque
**WHEN** un visiteur clique sur le bouton "Télécharger mon CV"
**THEN** le navigateur déclenche un téléchargement du fichier PDF
**AND** le nom de fichier sauvegardé est `CV_Thibaud_Geisler.pdf`
**AND** le contenu correspond à la version FR (lien `href="/api/assets/documents/cv/cv-thibaud-geisler-fr.pdf"`)

### Scénario 2 : Téléchargement depuis /en/a-propos en EN
**GIVEN** la page `/en/a-propos` (locale EN) et le fichier `assets/documents/cv/cv-thibaud-geisler-en.pdf` présent sur disque
**WHEN** un visiteur clique sur le bouton "Download my CV"
**THEN** le navigateur déclenche un téléchargement
**AND** le nom de fichier sauvegardé est `CV_Thibaud_Geisler.pdf`
**AND** le contenu correspond à la version EN (lien `href="/api/assets/documents/cv/cv-thibaud-geisler-en.pdf"`)

### Scénario 3 : Bouton CV visible dans le footer sur toutes les pages publiques
**GIVEN** n'importe quelle page publique (ex: `/`, `/services`, `/projets`, `/contact`) en FR
**WHEN** le visiteur scrolle jusqu'au footer
**THEN** le footer affiche `© 2026 Thibaud Geisler` aligné à gauche et le bouton "Télécharger mon CV" (variant `outline`, size `sm`) aligné à droite
**AND** sur mobile (viewport < 640px), les deux éléments passent en colonne (`flex-col`) centrés

### Scénario 4 : Accessibilité du bouton
**GIVEN** un utilisateur de lecteur d'écran sur la page /a-propos
**WHEN** le focus atteint le bouton CV
**THEN** le lecteur d'écran annonce le label FR "Télécharger mon CV" **et** le aria-label "Télécharger le CV au format PDF"
**AND** le bouton est navigable au clavier (Tab), l'appui sur `Enter` déclenche le téléchargement

### Scénario 5 : Cohérence FR/EN dans les deux emplacements
**GIVEN** une page `/en/a-propos` (locale EN)
**WHEN** le visiteur voit à la fois le bouton CTA dans la page **et** le bouton dans le footer
**THEN** les deux boutons portent le label EN "Download my CV"
**AND** les deux pointent vers le même `href="/api/assets/documents/cv/cv-thibaud-geisler-en.pdf"`
**AND** les deux déclenchent un téléchargement sous le nom `CV_Thibaud_Geisler.pdf`

## Edge cases

- **Footer sur page d'erreur globale (`global-error.tsx`)** : la page d'erreur globale remplace le layout racine selon les conventions Next.js. Le footer ne s'affiche pas sur cette page (hors arbre `<Layout>`). Non bloquant : aucune action requise.
- **Prop `locale` non mappée** : si un futur ajout de locale (ex: `de`) est fait dans `routing.locales` sans ajouter l'entrée dans `CV_FILENAMES`, TypeScript compile toujours (index signature du `satisfies Record<Locale, string>` force l'exhaustivité → erreur de compilation, fail-fast attendu). Cohérent avec `.claude/rules/typescript/conventions.md`.
- **Asset disque manquant** : si le dev n'a pas encore déposé `cv-thibaud-geisler-<locale>.pdf`, le clic répond 404 JSON depuis `/api/assets`. Comportement acceptable en dev (le visiteur verra l'erreur 404 dans l'onglet du navigateur) ; en prod l'asset est censé être là via le volume Docker.

## Architectural decisions

### Décision : Server Component vs Client Component pour `DownloadCvButton`

**Options envisagées :**
- **A. Server Component async** : reçoit `locale` en prop depuis le parent, lit `getTranslations('Common.cv')` en async, rend un `<a>` HTML pur. Aucune directive `'use client'`. Zéro JS envoyé au client pour ce composant.
- **B. Client Component avec `useLocale()` + `useTranslations()`** : directive `'use client'`, hook `useLocale()` de next-intl pour autonomie (pas besoin que le parent passe la locale), rend le même `<a>`.

**Choix : A**

**Rationale :**
- Le bouton est un lien HTML pur : aucune interactivité ne justifie la frontière client. Règle `.claude/rules/nextjs/server-client-components.md` : privilégier Server Components, n'isoler en Client que pour interactivité réelle.
- Pattern cohérent avec les autres CTA du projet : `CaseStudyFooter.tsx` est un Server Component async utilisant exactement le même pattern `<Button asChild><a>`.
- Coût marginal de passer `locale` en prop : les 2 parents (page À propos, footer) peuvent récupérer la locale en 1 ligne (`await params` ou `getLocale()`).
- Bénéfice : zéro bundle JS ajouté pour ce bouton, pas d'hydratation, préservation de la stratégie SSR par défaut.

### Décision : namespace i18n `Common.cv` vs `AboutPage.cta.downloadCv`

**Options envisagées :**
- **A. `Common.cv.download` + `Common.cv.downloadAriaLabel`** : namespace partagé, réutilisable depuis n'importe quel emplacement.
- **B. `AboutPage.cta.downloadCv`** : namespace dédié à la page À propos. Label verrouillé à un emplacement.

**Choix : A**

**Rationale :**
- Le bouton apparaît dans ≥ 2 emplacements dès ce sub-project (page + footer), dont un footer qui n'appartient à aucune page en particulier. Verrouiller le label dans `AboutPage.*` crée une dépendance sémantique fausse.
- Le namespace `Common` existe déjà (`Common.retry`) : l'étendre à `Common.cv` respecte la convention établie, ne crée pas de nouveau namespace.
- Si d'autres assets publics apparaissent (plaquette freelance, charte formation), un sous-namespace par asset partagé (`Common.plaquette`, `Common.charte`) reste possible sans refonte.

## Open questions

*(Aucune — toutes les décisions sont actées.)*
