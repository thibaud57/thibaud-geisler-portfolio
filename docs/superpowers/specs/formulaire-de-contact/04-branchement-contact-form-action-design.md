---
feature: "Feature 4 — Formulaire de contact"
subproject: "branchement-contact-form-action"
goal: "Brancher la Server Action submitContact sur le ContactForm existant via useActionState, ajouter le champ honeypot caché et localiser les messages d'erreur/succès dans messages/fr.json + messages/en.json."
status: "implemented"
complexity: "S"
tdd_scope: "none"
depends_on: ["03-server-action-submit-contact-design.md"]
date: "2026-04-26"
---

# Branchement ContactForm ↔ Server Action submitContact

## Scope

Modification du composant `ContactForm.tsx` créé par le sub-project `04-page-contact-layout-design.md` (cross-feature, Feature 1 — Pages publiques) pour : (1) remplacer le handler stub `(toast + console.log)` par `useActionState(submitContact, initialContactFormState)`, (2) brancher `<form action={formAction}>` au lieu de `onSubmit`, (3) ajouter un input honeypot `name="website"` caché en CSS (`sr-only` + `aria-hidden` + `tabIndex={-1}` + `autoComplete="off"`), (4) afficher les codes d'erreur Zod sub 02 sous chaque champ via `t(\`form.errors.${code}\`)` next-intl, (5) afficher un toast `sonner` succès quand `state.ok === true` (reset le form via `useRef`) et un toast erreur quand `state.ok === false` avec `state.message` non null (rate_limit/smtp_error), (6) extraire un sous-composant `SubmitButton.tsx` avec `useFormStatus` pour disabled + label « Envoi… » pendant la transition, (7) ajouter ~14 clés i18n exhaustivement listées dans `messages/fr.json` et `messages/en.json` avec parité stricte.

**Exclu** : modification du layout 2 colonnes, du widget Calendly, des SocialLinks, du DownloadCvButton (intacts depuis sub 04 du layout), tests Vitest RTL (validation par Playwright via `mcp__playwright__browser_*`), modification des champs métier visibles (5 champs identiques au sub 04 du layout : `name`, `company`, `email`, `subject`, `message`), modification de la prop `defaultSubject` (préservée tel quel — `useActionState` la consomme via `defaultValue` du `<input name="subject">`).

### État livré

À la fin de ce sub-project, on peut : naviguer sur `/contact` (FR ou EN), remplir les 5 champs visibles, cliquer « Envoyer », recevoir un email réel sur `MAIL_TO`, voir un toast success vert, et constater que le form a été reset. Une 6e soumission depuis la même IP en moins de 10 minutes affiche un toast d'erreur localisé « Trop de tentatives… ». Un email mal formé affiche le code i18n sous le champ Email sans déclencher de submit serveur. Un test DevTools qui force `<input name="website" value="bot">` et soumet retourne le toast success factice **sans qu'aucun mail n'arrive**.

## Dependencies

- `03-server-action-submit-contact-design.md` (statut: `draft`) — fournit la Server Action `submitContact`, le type `ContactFormState` et la constante `initialContactFormState` importés depuis `@/server/actions/contact`.

**Dépendance cross-feature** (hors `depends_on` qui ne référence que la feature courante) : le fichier `src/components/features/contact/ContactForm.tsx` est **créé par** `docs/superpowers/specs/pages-publiques-portfolio/04-page-contact-layout-design.md` (Feature 1 — Pages publiques portfolio, sub 04). Ce sub-project doit être **implémenté avant** sub 04 de Feature 4 (le présent), sinon le fichier à modifier n'existe pas. L'ordre topologique global est : Feature 1 sub 04 (layout) → Feature 4 sub 01 (mailer) → Feature 4 sub 02 (schema) → Feature 4 sub 03 (server action) → Feature 4 sub 04 (le présent).

## Files touched

- **À modifier** : `src/components/features/contact/ContactForm.tsx` (swap handler stub → `useActionState` + ajout `<input name="website">` honeypot + affichage erreurs sous champs + toasts succès/erreur + reset via `useRef`)
- **À créer** : `src/components/features/contact/SubmitButton.tsx` (sous-composant `'use client'` avec `useFormStatus` pour `disabled` + label localisé pendant transition)
- **À modifier** : `messages/fr.json` (ajout exhaustif des sous-clés `ContactPage.form.errors.*` + `success.toast` + `submitting`)
- **À modifier** : `messages/en.json` (parité stricte avec FR sur les mêmes clés)

## Architecture approach

- **Pattern `useActionState` natif React 19** : `const [state, formAction, isPending] = useActionState<ContactFormState, FormData>(submitContact, initialContactFormState)`. Conforme à `.claude/rules/nextjs/server-actions.md` ligne 72 et `.claude/rules/react/hooks.md`. Le 3e élément `isPending` peut être omis si `useFormStatus` est utilisé dans le SubmitButton enfant (préféré).
- **`<form action={formAction}>`** : remplace `onSubmit` du stub. La Server Action reçoit le `FormData` natif sans handler manuel (progressive enhancement). Conforme rule server-actions ligne 19 + 44-46.
- **Champs non contrôlés avec `defaultValue`** : préserve `defaultSubject` (prop existante du sub 04 layout) via `<input name="subject" defaultValue={defaultSubject} required />`. Pas de `useState` par champ — `useActionState` gère le state via le `state` retourné. Conforme à la philo React 19 (« uncontrolled by default, action via FormData »).
- **Champ honeypot caché** : ajout d'un `<input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="sr-only" />` placé en début de form (avant les champs visibles, pour que les bots qui remplissent dans l'ordre du DOM le remplissent en premier). Le `sr-only` Tailwind est le standard utility-class accessibility-first (visuellement caché, lecteurs d'écran ignorent grâce à `aria-hidden`, focus exclu via `tabIndex={-1}`). Conforme `.claude/rules/tailwind/conventions.md`.
- **Affichage erreurs sous champs** : pour chaque input, ajouter sous le `<Input>`/`<Textarea>` shadcn :
  ```
  state.errors[fieldName]?.map(code => (
    <p key={code} className="text-sm text-destructive mt-1">
      {t(`form.errors.${code}`)}
    </p>
  ))
  ```
  Le mapping code Zod (sub 02) → clé i18n est 1-1 (le code IS la clé). Aucune table de mapping intermédiaire.
- **Toast success** : `useEffect(() => { if (state.ok === true) { toast.success(t('form.success.toast')); formRef.current?.reset() } }, [state, t])`. Le `formRef.current?.reset()` vide les inputs non contrôlés et réapplique les `defaultValue` (incluant `defaultSubject` si toujours présent). Conforme rule server-actions ligne 37 (alternative au key change, retenue car form non-contrôlé donc `reset()` natif suffit).
- **Toast erreur globale** : `useEffect(() => { if (state.ok === false && state.message !== null) { toast.error(t(\`form.errors.${state.message}\`)) } }, [state, t])`. Affiché uniquement quand un code de message global est présent (`'rate_limit'` ou `'smtp_error'`) ; les erreurs Zod par champ (`state.message === null`) ne déclenchent pas de toast (déjà visibles sous les inputs).
- **`SubmitButton.tsx` sous-composant** : OBLIGATOIRE de l'extraire dans un composant ENFANT du `<form>`, conforme rule server-actions ligne 30 (`useFormStatus()` throw si appelé dans le composant qui rend lui-même le form). Le SubmitButton reçoit en prop les labels traduits (`label`, `submittingLabel`) et utilise `useFormStatus()` pour basculer entre les deux + appliquer `disabled={pending}`. Pattern conforme `.claude/rules/react/hooks.md`.
- **Préservation `defaultSubject`** : la prop existante du sub 04 layout est inchangée. Le `<input name="subject" defaultValue={defaultSubject} required />` consomme la prop directement. Au reset post-succès, le `defaultValue` est réappliqué automatiquement (comportement natif `form.reset()`).
- **Pas de `key` change sur le form** : `formRef.current?.reset()` suffit pour vider les inputs non-contrôlés. Le `key` change ne serait nécessaire que pour des composants contrôlés ou des libs comme react-hook-form (non utilisée ici).
- **Conventions i18n** : `.claude/rules/next-intl/translations.md`. Toutes les clés sont nestées sous `ContactPage.form` pour cohérence avec les clés existantes du sub 04 layout (`ContactPage.form.title`, `ContactPage.form.fields.*`, `ContactPage.form.placeholders.*`, `ContactPage.form.submit`, `ContactPage.form.subjectPrefill.*`, `ContactPage.form.stubToast`).
- **Suppression de la clé obsolète** : `ContactPage.form.stubToast` (créée par sub 04 layout pour le toast factice du stub) devient inutilisée après le branchement. À retirer de `messages/fr.json` ET `messages/en.json` pour éviter le dead-code i18n.
- **Gestion de `defaultSubject` côté Server Component parent** : inchangée. `page.tsx` continue de lire `searchParams.service`, mappe vers `ContactPage.form.subjectPrefill.{ia, fullstack, formation}`, passe en prop au ContactForm. Notre sub-project ne touche pas à `page.tsx`.
- **Conventions tests** : `tdd_scope: none` (validation Playwright manuelle, voir Acceptance criteria). Aligné avec sub 04 du layout (sibling, même feature parent métier) qui est aussi `tdd_scope: none`. Conforme à la règle no-lib-test (`~/.claude/CLAUDE.md` § Code > Tests) : aucune règle métier projet ne vit dans ce branchement (toutes les règles sont dans sub 02 et sub 03 testés). Mémoire utilisateur : « UI testing systématique via Playwright + dev server persistant ».

## Acceptance criteria

### Scénario 1 : happy path FR
**GIVEN** un visiteur sur `/contact` avec `NEXT_PUBLIC_CALENDLY_URL` définie et `MAIL_TO` configuré
**WHEN** il remplit `name="Alice"`, `company="Acme"`, `email="alice@acme.fr"`, `subject="Projet IA"`, `message="<≥20 chars>"` et clique « Envoyer »
**THEN** le bouton submit affiche « Envoi… » pendant la transition (disabled)
**AND** un toast `sonner` success vert apparaît avec le message localisé `ContactPage.form.success.toast`
**AND** les 5 champs visibles sont vidés (le champ Sujet revient au `defaultSubject` si applicable)
**AND** un email arrive sur la boîte `MAIL_TO` avec sujet `Contact: Alice — Projet IA` et le body text contenant les 4 champs (sub 03 a déjà testé l'envoi)

### Scénario 2 : happy path EN (parité i18n)
**GIVEN** un visiteur sur `/en/contact`
**WHEN** il remplit le formulaire et clique « Submit »
**THEN** tous les labels, placeholders, le bouton submit, le label de transition, le toast success et les codes d'erreur potentiels sont rendus en anglais
**AND** les valeurs des clés `ContactPage.form.errors.*`, `ContactPage.form.success.toast`, `ContactPage.form.submitting` sont traduites en EN avec une parité stricte de la liste des clés FR

### Scénario 3 : validation Zod côté serveur (email invalide)
**GIVEN** un visiteur a rempli les autres champs valides mais `email="pas-un-email"`
**WHEN** il clique « Envoyer »
**THEN** la Server Action retourne `state.errors.email = ['email_invalid']`
**AND** sous le champ Email s'affiche le message localisé `ContactPage.form.errors.email_invalid` (FR : « Email invalide. » ou équivalent)
**AND** aucun toast global n'apparaît (`state.message === null`)
**AND** les autres champs gardent leurs valeurs (le form n'est pas reset)

### Scénario 4 : rate limit dépassé (toast erreur global)
**GIVEN** 5 soumissions valides depuis la même IP dans les 10 dernières minutes
**WHEN** une 6e soumission est tentée avec un payload valide
**THEN** un toast `sonner` erreur rouge apparaît avec le message localisé `ContactPage.form.errors.rate_limit_exceeded`
**AND** aucune erreur sous champ n'est affichée (`state.errors._global` n'est PAS rendu sous un input visible)
**AND** le form n'est pas reset (les valeurs restent saisies)

### Scénario 5 : SMTP fail (toast erreur global)
**GIVEN** la Server Action `submitContact` retourne `{ ok: false, errors: {}, message: 'smtp_error' }` (simulable via DevTools en interrompant le réseau ou en revoyant après un échec SMTP réel côté `transporter`)
**WHEN** le state est appliqué via `useActionState`
**THEN** un toast `sonner` erreur rouge apparaît avec le message localisé `ContactPage.form.errors.smtp_error`
**AND** le form n'est pas reset

### Scénario 6 : honeypot rempli en bypass DevTools (success silencieux factice)
**GIVEN** un visiteur (ou un test Playwright simulant un bot) ouvre les DevTools et force `document.querySelector('input[name="website"]').value = 'bot-spam'` puis remplit les 5 autres champs et soumet
**WHEN** la Server Action est appelée
**THEN** un toast success apparaît (le bot croit avoir réussi)
**AND** le form est reset (cohérent avec un vrai succès, indistinguable côté client)
**AND** aucun email n'arrive sur `MAIL_TO` (sub 03 a déjà testé le honeypot côté serveur)

### Scénario 7 : honeypot caché à l'utilisateur réel
**GIVEN** un visiteur ordinaire sur `/contact` qui utilise tab pour naviguer entre les champs
**WHEN** il appuie sur Tab depuis le champ précédant le form
**THEN** le focus saute directement au premier champ visible (`Nom`) en sautant le champ honeypot (grâce à `tabIndex={-1}`)
**AND** un lecteur d'écran NVDA/JAWS ne lit aucun label associé au champ `website` (grâce à `aria-hidden="true"`)
**AND** l'inspecteur DOM montre l'input `<input name="website">` mais avec `class="sr-only"` qui le rend invisible visuellement (largeur/hauteur 1px, clip)

### Scénario 8 : SubmitButton transition state
**GIVEN** un visiteur a rempli le form valide et clique « Envoyer »
**WHEN** la Server Action est en cours d'exécution
**THEN** le bouton affiche le label `ContactPage.form.submitting` (FR : « Envoi en cours… » ou équivalent)
**AND** le bouton a l'attribut `disabled` (impossible de cliquer 2x)
**AND** dès que la Server Action retourne, le label revient à `ContactPage.form.submit` (« Envoyer »)

### Scénario 9 : suppression de la clé i18n stub
**GIVEN** le sub 04 du layout avait créé `ContactPage.form.stubToast` (FR + EN) pour le toast du handler stub
**WHEN** ce sub-project est implémenté
**THEN** la clé `stubToast` est retirée de `messages/fr.json` ET `messages/en.json`
**AND** aucun fichier de code ne référence plus cette clé (`grep -r "stubToast" src/` retourne 0 résultat)

## Edge cases

- **`useActionState` initial render** : `state.ok === null` au premier render → aucun toast ni reset (le `useEffect` ne déclenche que sur transition vers `true` ou `false`).
- **Re-soumission rapide** : `useFormStatus().pending === true` désactive le bouton, empêche le double-submit.
- **Erreurs Zod multi-codes par champ** : `flatten().fieldErrors` peut retourner plusieurs codes pour un même champ (ex: `name: ['name_required', 'name_too_long']` ne se produit pas en pratique car les contraintes sont mutuellement exclusives, mais le rendu via `.map()` supporte le cas). Affichage en cascade.
- **Erreurs Zod sur champ inconnu** : si un nouveau champ est ajouté côté schéma sans clé i18n correspondante, `t(\`form.errors.${code}\`)` retournera la clé brute en absence de fallback. Ajouter une clé `generic` (`ContactPage.form.errors.generic` : « Une erreur est survenue. ») et un wrapper `getErrorLabel(code, t) = hasKey(code) ? t(code) : t('generic')` est une amélioration possible **post-MVP** — pour le sub-project présent, on s'engage à lister exhaustivement les 11 codes des sub 02/03 dans les fichiers i18n, donc le cas n'arrive pas.
- **Reset au succès et `defaultSubject`** : si le visiteur arrive via `/contact?service=ia`, le champ Sujet a `defaultValue="Projet IA & Automatisation"`. Après reset post-succès, le `defaultValue` est réappliqué (comportement natif `form.reset()`). Acceptable et cohérent.
- **Toaster non monté dans le layout parent** : si `<Toaster />` (sonner) n'est pas monté dans `src/app/[locale]/(public)/layout.tsx` ou parent, `toast.success`/`toast.error` ne s'affichent pas mais ne throw pas. À vérifier au plan d'implémentation que le `Toaster` du sub 04 layout est bien en place (Open question résolue par sub 04 layout).
- **Bot qui désactive JS** : `useActionState` est progressive enhancement — le `<form action={formAction}>` fonctionne sans JS via Next.js Server Actions natives. Le bot envoie un `FormData` POST classique, le serveur le traite, retourne un HTML refresh. Accepté.

## Architectural decisions

### Décision : reset form via `formRef.current.reset()` vs `key` change

**Options envisagées :**
- **A. `useRef` + `useEffect` qui appelle `formRef.current?.reset()` quand `state.ok === true`** : utilise la méthode native du `<form>`. Compatible avec les inputs non-contrôlés (notre cas) et réapplique les `defaultValue`.
- **B. `key={resetKey}` sur le `<form>` avec `setResetKey(k => k+1)` au succès** : re-mount complet du form, vide tout state interne. Préconisé par `.claude/rules/nextjs/server-actions.md` ligne 37 « pour les composants contrôlés ».

**Choix : A**

**Rationale :**
- Notre form est entièrement non-contrôlé (`useActionState` gère le state externe, les inputs ont juste `defaultValue` et `name`). `form.reset()` est la méthode standard pour ce pattern.
- A est plus simple : 1 `useRef` + 1 ligne dans le `useEffect`, vs B qui demande un state local `resetKey` et un re-mount qui peut être perçu comme un flash visuel sur des forms longs.
- B serait obligatoire avec react-hook-form ou state contrôlé par `useState` par champ — pas notre cas.

### Décision : honeypot CSS via `sr-only` Tailwind vs absolute -9999px

**Options envisagées :**
- **A. `className="sr-only"`** : utility-class Tailwind standard (`position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0`). Recommandé Tailwind + a11y best practices.
- **B. `className="absolute -left-[9999px]"`** : positionne l'élément hors-écran. Marche aussi mais moins standard.
- **C. `style={{ display: 'none' }}`** : caché du DOM rendu. Bots intelligents le détectent et l'ignorent → honeypot inefficace.

**Choix : A**

**Rationale :**
- `sr-only` est le standard documenté Tailwind (utility incluse par défaut), reconnu par la communauté a11y.
- Cohérent avec `.claude/rules/tailwind/conventions.md` (utility-classes plutôt que styles inline).
- A et B sont fonctionnellement équivalents pour les bots peu sophistiqués (le honeypot rempli quoi qu'il arrive). Pour les bots avancés, ni A ni B ne piège — on accepte 95% de capture (PRODUCTION.md ne tranche pas, on a choisi honeypot + rate limit comme suffisant pour MVP).
- C est explicitement contre-productif (bots ignorent les `display:none`).

### Décision : `SubmitButton` extrait vs hooks dans le ContactForm parent

**Options envisagées :**
- **A. Sous-composant `SubmitButton.tsx` enfant du form** : utilise `useFormStatus()` (legalement appelable car enfant du `<form>` parent qui a `action={formAction}`).
- **B. `useActionState` retourne déjà `isPending` (3e élément)** : utiliser ce booléen directement dans le ContactForm parent pour basculer le label/disabled du bouton, sans `useFormStatus`.

**Choix : A**

**Rationale :**
- `.claude/rules/nextjs/server-actions.md` ligne 30 le tranche : « Appeler `useFormStatus()` dans le même composant qui rend le `<form>` : doit être dans un composant **enfant** du form. » L'option B contourne le hook mais est moins idiomatique.
- A isole la responsabilité « état de transition du bouton » dans un composant focused (~15 lignes), facile à styliser ou enrichir post-MVP (spinner, icône check au succès).
- A est le pattern recommandé par la doc React 19 (`useFormStatus` est conçu spécifiquement pour ce cas).
