---
feature: "Feature 1 MVP — Pages publiques portfolio"
subproject: "page-contact-layout"
goal: "Livrer la page /contact en layout 2 colonnes (Calendly + réseaux à gauche, form UI à droite) avec stub submit, en attendant que Feature 4 branche la logique métier SMTP."
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: []
date: "2026-04-24"
---

# Page `/contact` — Header, Calendly, réseaux et form UI (stub submit)

## Scope

Remplacer le placeholder de `src/app/[locale]/(public)/contact/page.tsx` par une page à header centré (badge icône `Mail` + H1 `font-display` + tagline + localisation "Luxembourg · France · Remote") suivi d'une grille 2 colonnes desktop, empilée sur mobile. Colonne gauche : H2 "Réservez un créneau" + widget Calendly inline officiel (chargé via `<Script>` Next.js en `lazyOnload`, URL pilotée par `NEXT_PUBLIC_CALENDLY_URL`) + section "Ou retrouvez-moi" avec 2 badges carrés (LinkedIn + GitHub, icônes Simple Icons, hover `scale-105 shadow-md`). Colonne droite : H2 "Envoyez-moi un message" + formulaire dans `Card` shadcn avec 5 champs (Nom complet, Entreprise optionnel, Email, Sujet, Message) et un bouton Submit. Le **submit est stubé** (handler local qui affiche un toast `sonner` "Merci, message bientôt transmis — fonctionnalité complète en cours" + `console.log` des données), Feature 4 remplacera ce stub par une vraie Server Action SMTP. Le sujet est **pré-rempli** depuis le query param `?service=<slug>` (CTAs des cards services du sub 01/03) via un mapping i18n slug → label. En pied de page, lien CV discret (`DownloadCvButton variant="ghost"`).

**Exclu** : logique métier du form (validation Zod stricte côté serveur, Server Action `submitContact` avec nodemailer SMTP IONOS, rate limiting IP in-memory, tests d'intégration TDD `full`) — entièrement **Feature 4**, qui remplacera uniquement le handler stub par un `useActionState(submitContact, ...)` sans refactorer le layout ni les champs. Carte du monde SVG (prévu initialement en brainstorming, abandonnée car visuel trop lourd pour le bénéfice MVP, remplacée par un texte sobre de localisation). Abonnement Aceternity PRO (blocs payants abandonnés, reconstruction shadcn pur).

**Modifications documentaires** (addendum DESIGN.md § Mapping Composants mentionnant la reconstruction shadcn du pattern "Contact Grid" + ajout `NEXT_PUBLIC_CALENDLY_URL` dans PRODUCTION.md § Variables d'Environnement) **différées au sync docs global** de fin de `/decompose-feature`, pas dans le plan de ce sub-project.

### État livré

À la fin de ce sub-project, on peut : naviguer sur `/contact` (FR et EN) et voir header + grille 2 colonnes (desktop) ou stack empilé (mobile). La colonne gauche propose Calendly fonctionnel (une fois `NEXT_PUBLIC_CALENDLY_URL` renseigné) et 2 badges réseaux cliquables. La colonne droite présente un formulaire complet visuellement, qui accepte les saisies, déclenche un toast confirmant la soumission et log les données dans la console (stub). Un accès `/contact?service=ia` pré-remplit le champ Sujet avec "Projet IA & Automatisation" (idem pour `fullstack` et `formation`). Le lien CV est accessible en bas. Tout est responsive, SEO metadata localisée.

## Dependencies

Aucune — ce sub-project est autoporté. Éléments déjà livrés réutilisés sans modification : `DownloadCvButton` (Feature 3, sub 02 implemented, accepte `variant` et `size`), `Input`, `Textarea`, `Button`, `Card`, `Label` (shadcn primitives installés), `Sonner` toast shadcn (installé, visible dans `src/components/ui/sonner.tsx`), helpers `setupLocalePage`, `setupLocaleMetadata`, `buildLanguageAlternates`, `localeToOgLocale`, clés `Metadata.contactTitle` et `Metadata.contactDescription`.

## Files touched

- **À créer** : `src/components/features/contact/ContactHeader.tsx`
- **À créer** : `src/components/features/contact/CalendlyWidget.tsx`
- **À créer** : `src/components/features/contact/SocialLinks.tsx`
- **À créer** : `src/components/features/contact/ContactForm.tsx`
- **À créer** : `src/components/features/contact/social-links-config.ts`
- **À modifier** : `src/app/[locale]/(public)/contact/page.tsx` (remplacement du placeholder par le layout complet)
- **À modifier** : `messages/fr.json` (étoffer le namespace `ContactPage` : `header.{h1, tagline, location}`, `calendly.{title, subtitle, fallback}`, `social.{title, ariaLabel.linkedin, ariaLabel.github}`, `form.{title, subtitle, fields.{name, company, companyOptional, email, subject, message}, placeholders.{name, company, email, subject, message}, submit, submitting, stubToast}`, `form.subjectPrefill.{ia, fullstack, formation}`, `cv.label`)
- **À modifier** : `messages/en.json` (parité stricte du namespace `ContactPage`)
- **À modifier** : `.env.example` (ajout `NEXT_PUBLIC_CALENDLY_URL=https://calendly.com/<slug>/<event-type>` + commentaire explicatif)

## Architecture approach

- **Server page orchestrée + îlots Client** : `page.tsx` reste Server Component async (`setupLocalePage` + `getTranslations('ContactPage')`), lit `searchParams.service` pour dériver le subject pré-rempli, compose le layout. `CalendlyWidget` est Client (charge un script externe). `ContactForm` est Client (state local pour les inputs + handler submit stub). `ContactHeader`, `SocialLinks` restent Server (pas de hook). `DownloadCvButton` déjà Server async. Voir `.claude/rules/nextjs/server-client-components.md` et `.claude/rules/nextjs/routing.md`.
- **`searchParams` async** : `page.tsx` doit `await searchParams` avant d'en lire `service`, hard error Next 16 sinon (`.claude/rules/nextjs/routing.md`). Le slug reçu (string `ia` | `fullstack` | `formation` ou autre) est mappé côté page via `getTranslations('ContactPage.form.subjectPrefill')` + fallback vide si slug inconnu. Résultat passé en prop `defaultSubject` au `ContactForm`.
- **`ContactHeader`** (Server) : rend un badge icône `Mail` (Lucide) 48×48 dans `bg-primary/10 rounded-lg`, H1 centré `font-display text-4xl font-bold tracking-tight sm:text-5xl`, tagline `text-lg text-muted-foreground`, et une ligne location type "Luxembourg · France · Remote" en `text-sm text-muted-foreground`. Pas d'animation, sobre.
- **`CalendlyWidget`** (`'use client'`) : reçoit `url: string` + optional `className`. Rend `<Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" />` suivi de `<div className="calendly-inline-widget min-h-[700px] w-full" data-url={url} />`. Si `url` est vide, rend un fallback `<div>` `border-dashed border-muted min-h-[700px]` avec le message `ContactPage.calendly.fallback`. Voir `.claude/rules/react/hooks.md`.
- **`SocialLinks`** (Server) : reçoit `title: string` + `ariaLabels: { linkedin: string; github: string }`. Itère sur `SOCIAL_LINKS` (config TS), rend pour chaque entrée un `<a>` externe (`target="_blank" rel="noopener noreferrer"`) avec `aria-label` localisé, contenant une icône Simple Icons résolue via le format `simple-icons:<slug>` (pattern identique à `src/components/features/projects/TagBadge.tsx` pour cohérence). Style du badge : `size-14` (56×56 px), `rounded-lg bg-card border border-border flex items-center justify-center`, hover `scale-105 shadow-md transition`. Voir `.claude/rules/shadcn-ui/components.md` et `.claude/rules/tailwind/conventions.md`.
- **`social-links-config.ts`** : exporte `SOCIAL_LINKS` en constante TS `as const`, chaque entrée `{ slug: 'linkedin' | 'github', url: string, icon: 'simple-icons:linkedin' | 'simple-icons:github' }`. Les URLs seront fournies par l'utilisateur au moment de l'implémentation (PR check obligatoire pour éviter placeholders laissés en prod). Typage via `typeof` conformément à `.claude/rules/typescript/conventions.md`.
- **`ContactForm`** (`'use client'`) : composant client autonome qui encapsule les 5 champs, gère l'état local via `useState` ou `useActionState` (approche React 19 déjà utilisée ailleurs — permet à Feature 4 de juste remplacer le handler). Reçoit les labels/placeholders/texte submit/toast traduits en props depuis le Server parent, plus `defaultSubject: string` pour pré-remplir le champ Sujet. Le handler submit **stub** affiche un toast `sonner` avec le message `ContactPage.form.stubToast` puis `console.log({ name, company, email, subject, message })`. Aucune Server Action n'est appelée, aucune validation Zod (validation HTML5 native `required`, `type="email"` uniquement). Feature 4 remplacera exclusivement la fonction submit handler par un `useActionState(submitContact, ...)` sans toucher aux champs ni au layout.
- **Pattern `useActionState` (optionnel mais recommandé ici)** : structurer le form avec `useActionState` dès ce sub-project permet à Feature 4 de juste swap l'action, sans refactor. Voir `.claude/rules/react/hooks.md` (pattern `useActionState` + `useFormStatus` dans un enfant). Si trop précoce, fallback à un `useState` + `onSubmit` classique — challenge à trancher pendant l'implémentation.
- **Champs du form** :
  - `name` : `<Input type="text" name="name" required placeholder="Votre nom complet" />`
  - `company` : `<Input type="text" name="company" placeholder="Nom de votre entreprise (optionnel)" />` — pas de `required`
  - `email` : `<Input type="email" name="email" required placeholder="vous@exemple.com" />`
  - `subject` : `<Input type="text" name="subject" required defaultValue={defaultSubject} placeholder="Sujet de votre message" />`
  - `message` : `<Textarea name="message" required rows={6} placeholder="Décrivez votre besoin, votre contexte, vos questions..." />`
  - `submit` : `<Button type="submit">Envoyer</Button>` (variant default)
- **Pré-remplissage `defaultSubject`** : `page.tsx` lit `searchParams.service`, appelle `getTranslations('ContactPage.form.subjectPrefill')`, tente `t(slug)` si le slug est dans la liste connue (`ia`, `fullstack`, `formation`), sinon chaîne vide. La page passe le résultat en prop à `ContactForm`. Pas de validation stricte côté sub 04 — Feature 4 renforcera via Zod.
- **Toast `sonner`** : le composant `Toaster` doit être monté dans un layout parent (probablement `src/app/[locale]/(public)/layout.tsx` ou `src/app/[locale]/layout.tsx`, à vérifier lors de l'implémentation). Si absent, le plan inclura une étape pour l'ajouter (voir `src/components/ui/sonner.tsx` pour l'export `Toaster`). Voir `.claude/rules/shadcn-ui/components.md`.
- **Layout `page.tsx`** : conteneur standard `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-24`. Structure : `<ContactHeader>` centré pleine largeur, puis `<div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mt-12">`. Colonne gauche = stack `flex flex-col gap-8` avec H2 + CalendlyWidget + section "Ou retrouvez-moi" (H3 petit + SocialLinks). Colonne droite = stack `flex flex-col gap-8` avec H2 + `<Card>` contenant le ContactForm. Footer de section = `<div className="mt-16 flex justify-center"><DownloadCvButton variant="ghost" /></div>`.
- **i18n `ContactPage`** : structure nested conforme à `.claude/rules/next-intl/translations.md`. Les clés `Metadata.contactTitle` et `Metadata.contactDescription` déjà remplies sont réutilisées inchangées.
- **Metadata SEO** : `generateMetadata` suit le pattern des subs 01/02/03 (`setupLocaleMetadata`, `localeToOgLocale`, `buildLanguageAlternates('/contact')`). Voir `.claude/rules/nextjs/metadata-seo.md`.
- **Env var `NEXT_PUBLIC_CALENDLY_URL`** : ajoutée à `.env.example` avec valeur exemple commentée. Formalisation dans PRODUCTION.md § Variables d'Environnement → sync docs global.
- **Sécurité** : `target="_blank" rel="noopener noreferrer"` obligatoire sur les liens réseaux externes. Script Calendly chargé depuis `assets.calendly.com` — vérifier CSP `next.config.ts` à l'implémentation (hors scope spec strict).

## Acceptance criteria

### Scénario 1 : rendu FR complet
**GIVEN** un visiteur navigue vers `/contact` et que `NEXT_PUBLIC_CALENDLY_URL` est définie
**WHEN** la page est rendue
**THEN** le header centré affiche un badge `Mail` 48×48 `bg-primary/10`, un `<h1>` `font-display` "Contact", une tagline en `text-muted-foreground` et une ligne localisation "Luxembourg · France · Remote"
**AND** la grille desktop affiche 2 colonnes de largeur équivalente avec gap de 48px
**AND** la colonne gauche affiche un H2 "Réservez un créneau", le widget Calendly inline `min-h-[700px]` chargé via `<Script strategy="lazyOnload">`, un H3 "Ou retrouvez-moi", et 2 badges carrés 56×56 px (LinkedIn + GitHub, icônes Simple Icons centrées, hover `scale-105 shadow-md`)
**AND** la colonne droite affiche un H2 "Envoyez-moi un message" et une `Card` contenant le formulaire avec 5 champs (Nom complet, Entreprise optionnel, Email, Sujet, Message) et un bouton "Envoyer"
**AND** un lien CV discret `variant="ghost"` est présent en pied de page, centré

### Scénario 2 : rendu EN
**GIVEN** un visiteur navigue vers `/en/contact`
**WHEN** la page est rendue
**THEN** tous les textes (header H1, tagline, location, labels CTAs, H2/H3, labels des champs form, placeholders, bouton submit, toast stub) sont affichés en anglais
**AND** les URLs réseaux et le script Calendly restent identiques (données non localisées)

### Scénario 3 : pré-remplissage du sujet depuis searchParams
**GIVEN** un visiteur arrive via `/contact?service=ia` (CTA "Parler de mon besoin IA" depuis sub 01/03)
**WHEN** la page est rendue
**THEN** le champ Sujet du form est pré-rempli avec la valeur de `ContactPage.form.subjectPrefill.ia` (ex: "Projet IA & Automatisation")
**AND** idem pour `?service=fullstack` → `subjectPrefill.fullstack` et `?service=formation` → `subjectPrefill.formation`
**AND** si le slug est absent ou inconnu, le champ Sujet reste vide (placeholder visible)

### Scénario 4 : submit stub
**GIVEN** un visiteur a rempli les 4 champs requis (Nom, Email, Sujet, Message) et clique sur "Envoyer"
**WHEN** le form est soumis
**THEN** un toast `sonner` apparaît avec le message `ContactPage.form.stubToast` (ex: "Merci, message bientôt transmis — fonctionnalité complète en cours")
**AND** les données `{ name, company, email, subject, message }` sont loguées via `console.log` côté client
**AND** aucune Server Action n'est invoquée, aucun email n'est envoyé
**AND** le form ne se réinitialise pas (les valeurs saisies restent visibles pour que le visiteur puisse copier/modifier si besoin)

### Scénario 5 : validation HTML5
**GIVEN** un visiteur tente de soumettre le form sans remplir le champ Email
**WHEN** il clique sur "Envoyer"
**THEN** la validation HTML5 native bloque la soumission et affiche le message standard du navigateur ("Please fill out this field")
**AND** idem pour un email mal formé (`type="email"` rejette les chaînes sans `@`)
**AND** le champ Entreprise peut rester vide sans blocage (pas de `required`)

### Scénario 6 : URL Calendly absente
**GIVEN** `NEXT_PUBLIC_CALENDLY_URL` est vide ou non définie
**WHEN** la page est rendue
**THEN** la zone Calendly affiche un conteneur `min-h-[700px] border-dashed border-muted` avec le message `ContactPage.calendly.fallback`
**AND** aucune requête réseau vers `assets.calendly.com` n'est déclenchée

### Scénario 7 : liens réseaux sécurisés
**GIVEN** un visiteur clique sur le badge LinkedIn
**WHEN** le lien est ouvert
**THEN** la navigation cible l'URL configurée dans `SOCIAL_LINKS` dans un nouvel onglet (`target="_blank"`)
**AND** l'attribut `rel="noopener noreferrer"` est présent
**AND** l'élément a un `aria-label` localisé depuis `ContactPage.social.ariaLabel.linkedin`

### Scénario 8 : metadata SEO localisée
**GIVEN** un crawler lit le `<head>` de `/contact`
**WHEN** la réponse HTML arrive
**THEN** `<title>` = `Metadata.contactTitle` appliqué au template `%s | {siteTitle}`
**AND** la meta `description` = `Metadata.contactDescription`
**AND** `og:locale` = `localeToOgLocale[locale]`
**AND** `alternates.languages` couvre `fr`, `en`, `x-default` via `buildLanguageAlternates('/contact')`

### Scénario 9 : responsive mobile
**GIVEN** un viewport `< 1024px`
**WHEN** la page est rendue
**THEN** le header reste centré pleine largeur
**AND** les 2 colonnes s'empilent verticalement : Calendly d'abord (pleine largeur `min-h-[700px]`), puis SocialLinks, puis Card form, puis CV
**AND** les 2 badges réseaux restent côte à côte en flex-row (pas empilés)
**AND** les inputs du form prennent toute la largeur disponible

### Scénario 10 : responsive desktop
**GIVEN** un viewport ≥ 1024px (`lg:`)
**WHEN** la page est rendue
**THEN** la grille passe en 2 colonnes de largeur égale avec `gap-12`
**AND** Calendly + SocialLinks occupent la colonne gauche, Card form occupe la colonne droite
**AND** le CV reste centré pleine largeur en pied de page

### Scénario 11 : extension Feature 4 sans refactor
**GIVEN** Feature 4 livre une Server Action `submitContact` avec Zod + nodemailer
**WHEN** Feature 4 branche cette action sur le `ContactForm` existant
**THEN** seul le handler submit est modifié (remplacement du stub toast/console.log par `useActionState(submitContact, initialState)`)
**AND** aucun champ, label, placeholder, layout ou style n'est impacté
**AND** les clés i18n `ContactPage.form.*` restent utilisées, enrichies si besoin avec des clés de messages d'erreur serveur

## Edge cases

- **Script Calendly bloqué** (adblocker, CSP strict) : widget non affiché, `min-h-[700px]` préserve l'espace et évite le CLS. UX dégradée acceptable (le visiteur peut toujours utiliser le form à droite).
- **URL Calendly invalide** (slug incorrect, event type supprimé) : Calendly affiche son propre message d'erreur dans l'iframe interne. Hors scope (responsabilité service tiers).
- **URLs réseaux placeholder** non remplies avant merge : clics mènent à des 404 externes. Gate = smoke test de la PR (check manuel des liens).
- **`searchParams.service` avec slug inconnu** (ex: `/contact?service=foo`) : fallback silencieux, le champ Sujet reste vide. Pas de message d'erreur visible côté visiteur.
- **Submit pendant que `sonner.Toaster` n'est pas monté** : le toast ne s'affiche pas mais le `console.log` reste visible. À vérifier pendant le plan : le `Toaster` doit être monté dans un layout parent (voir "Architecture approach" note sonner).
- **Re-soumission rapide du form** (stub) : chaque clic déclenche un toast + un log. Pas de debounce côté stub. Feature 4 ajoutera éventuellement un `disabled` pendant la transition `useFormStatus`.
- **Champ Entreprise laissé vide** : comportement normal (pas `required`), le form soumet sans valeur entreprise. Le stub log `company: ""`.

## Architectural decisions

### Décision : scope form UI — inclus dans sub 04 vs entièrement Feature 4

**Options envisagées :**
- **A. Form UI dans sub 04 + logique métier dans Feature 4** : layout complet, champs, validation HTML5 et stub submit en sub 04. Feature 4 remplace uniquement le handler par `useActionState(submitContact)`, ajoute Zod serveur, SMTP nodemailer, rate limiting, tests TDD `full`.
- **B. Tout reporté à Feature 4** : sub 04 limité à Calendly + réseaux + CV, col droite vide ou stub "formulaire bientôt". UX MVP bancale ou trompeuse.
- **C. Tout inclus dans sub 04** : UI + logique métier. Contradit la stratégie TDD projet (Server Action contact = `full` TDD, tests intégration SMTP + Zod) qui justifie une Feature 4 dédiée.

**Choix : A**

**Rationale :**
- MVP immédiatement utilisable : la page /contact a un form visible et interactif (même si le submit ne fait rien de réel).
- Séparation propre UI/logique : sub 04 = pure présentation (tdd none), Feature 4 = logique métier (tdd full). Chaque sub-project a un focus test cohérent avec la stratégie projet.
- Extension sans refactor : Feature 4 swap le handler, n'altère pas layout/champs/i18n. Zéro duplication.
- Pré-remplissage `searchParams.service` possible dès maintenant (impact direct sur conversion depuis /services et /).

### Décision : Calendly inline embed vs popup button

**Options envisagées :**
- **A. Inline embed officiel** (`<Script>` + `<div class="calendly-inline-widget">` 700px) : picker visible directement, 2-way messaging, event tracking.
- **B. Popup button** (bouton + `Calendly.initPopupWidget`) : widget minuscule mais 1 clic de friction en plus.

**Choix : A**

**Rationale :**
- Convertissant : pas de friction "cliquer pour voir mes créneaux", le visiteur voit immédiatement les disponibilités.
- Chargé en `lazyOnload` → aucun impact négatif sur LCP/TTFB.
- La colonne gauche peut absorber 700px sans déséquilibrer le layout (la colonne droite contient le form qui est lui aussi ~700px de haut).
- Cohérent avec le positionnement "prendre un appel direct" priorisé dans BRAINSTORM.md.

### Décision : pré-remplissage du sujet via `searchParams.service`

**Options envisagées :**
- **A. Lecture dans `page.tsx` Server + mapping i18n `subjectPrefill.<slug>` + prop `defaultSubject` au ContactForm** : logique côté serveur, `ContactForm` reste agnostique du routing.
- **B. Lecture côté client via `useSearchParams()` dans `ContactForm`** : couplage form ↔ routing, nécessite `'use client'` partout, Suspense obligatoire pour useSearchParams (Next 15).
- **C. Pas de pré-remplissage, sujet toujours vide** : perte de l'information "le visiteur vient du service IA", nuit à la conversion.

**Choix : A**

**Rationale :**
- Séparation claire : le form ne connaît pas le routing, il reçoit une string `defaultSubject`.
- Pas de `useSearchParams` ni Suspense supplémentaire à gérer.
- Feature 4 pourra conserver ce pattern (prop `defaultSubject` restant).
- Aligne sur le pattern Server-first du projet.

### Décision : submit stub — `sonner` toast + `console.log` vs Server Action vide vs `alert()`

**Options envisagées :**
- **A. `sonner.toast()` + `console.log`** : UX polie (toast aligné sur design system), traçabilité dev (log en console).
- **B. Server Action vide** (`async function stub() { 'use server'; }`) : prépare Feature 4 mais introduit une action serveur inutile MVP.
- **C. `alert()` natif** : plus rapide à écrire mais UX cheap.

**Choix : A**

**Rationale :**
- `sonner` déjà installé (`src/components/ui/sonner.tsx`) → zéro nouvelle dépendance.
- Toast message explicite pour le visiteur ("fonctionnalité complète en cours") → pas de frustration silencieuse.
- `console.log` utile en dev pour vérifier que la capture des champs fonctionne, supprimable en 1 ligne par Feature 4.
- Pas de Server Action fantôme à nettoyer.

### Décision : carte du monde abandonnée

**Options envisagées :**
- **A. Pas de map**, remplacée par une ligne texte "Luxembourg · France · Remote" dans le header.
- **B. SVG world map statique** + marqueur CSS sur Luxembourg.
- **C. Effet Magic UI Particles** évoquant l'international sans carte.

**Choix : A**

**Rationale :**
- Le bloc Aceternity original mettait la map dans la col gauche au-dessus des infos contact. Avec Calendly qui occupe la col gauche (700px) + réseaux dessous, il n'y a pas d'espace naturel pour une map sans déséquilibrer.
- MVP : une ligne texte suffit pour l'info (la localisation est vérifiable sur le CV + LinkedIn).
- YAGNI : aucune demande business qui justifie un effort de map. Si post-MVP une vraie carte apporte de la valeur, on la réintègrera dans une section dédiée ou /a-propos.

## Open questions

- [ ] Vérifier pendant l'implémentation que `<Toaster />` (sonner) est bien monté dans un layout parent. Si non, ajouter une étape au plan pour le monter dans `src/app/[locale]/(public)/layout.tsx`.
- [ ] Confirmer avec le responsable infra que le CSP autorise `assets.calendly.com` (script + iframe). Si CSP strict à ajouter dans `next.config.ts`, à traiter hors ce sub-project.
