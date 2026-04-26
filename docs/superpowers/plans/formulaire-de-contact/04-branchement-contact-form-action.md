# Sub 04 — Branchement ContactForm ↔ Server Action submitContact — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Brancher la Server Action `submitContact` (sub 03) sur le `ContactForm.tsx` existant via `useActionState`, ajouter le champ honeypot caché, localiser exhaustivement les messages d'erreur/succès dans `messages/fr.json` + `messages/en.json`, et valider end-to-end via Playwright.

**Architecture:** Pattern React 19 `useActionState(submitContact, initialContactFormState)` + sous-composant `SubmitButton` enfant du `<form>` qui consomme `useFormStatus()`. Erreurs Zod par champ rendues sous chaque input via `t(\`errors.${code}\`)`, toasts globaux (`success`, `rate_limit`, `smtp_error`) déclenchés par `useEffect` sur `state.ok` + reset via `formRef.current?.reset()`. Honeypot `<input name="website">` caché en `sr-only` Tailwind avec `aria-hidden` + `tabIndex={-1}`.

**Tech Stack:** React 19 (`useActionState`, `useFormStatus`, `useRef`, `useEffect`) + next-intl (i18n) + sonner (toasts shadcn) + Tailwind 4 (utility `sr-only`) + TypeScript 6 strict.

**Spec source:** `docs/superpowers/specs/formulaire-de-contact/04-branchement-contact-form-action-design.md`

**Stratégie validation** : `tdd_scope: none`. Aucun test Vitest RTL — la couche `useActionState`/`useFormStatus`/`toast`/i18n est entièrement du plumbing lib React/shadcn (no-lib-test). Validation par session Playwright manuelle via `mcp__playwright__browser_*` documentée en Task 7.

**⚠️ Prérequis cross-feature** : ce plan suppose que `pages-publiques-portfolio/04-page-contact-layout-design.md` (Feature 1, layout `/contact`) est **déjà implémenté**. Le fichier `src/components/features/contact/ContactForm.tsx` est créé par ce sub layout avec un handler stub. Si non implémenté, lancer ce plan échoue à Task 2. Vérifier au préalable : `ls src/components/features/contact/ContactForm.tsx`.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/components/features/contact/SubmitButton.tsx` | Create | Sous-composant `'use client'` avec `useFormStatus` (props `label`, `submittingLabel`) |
| `src/components/features/contact/ContactForm.tsx` | Modify | Swap stub handler → `useActionState` + ajout honeypot + erreurs sous champs + toasts + reset |
| `messages/fr.json` | Modify | Ajout exhaustif des 14 clés sous `ContactPage.form.errors.*` + `success.toast` + `submitting` ; retrait de `stubToast` |
| `messages/en.json` | Modify | Parité stricte FR (mêmes clés, valeurs traduites) |

Aucun autre fichier touché. Pas de tests Vitest.

---

## Task 1: Créer `SubmitButton.tsx`

**Files:**
- Create: `src/components/features/contact/SubmitButton.tsx`

- [ ] **Step 1.1: Créer le sous-composant**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/components/features/contact/SubmitButton.tsx`

```typescript
'use client'

import { useFormStatus } from 'react-dom'

import { Button } from '@/components/ui/button'

type SubmitButtonProps = {
  label: string
  submittingLabel: string
}

export function SubmitButton({ label, submittingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? submittingLabel : label}
    </Button>
  )
}
```

**Notes pour le worker** :
- `useFormStatus` vient de `'react-dom'` (pas `'react'`) — c'est la signature React 19 documentée.
- `'use client'` obligatoire (utilise un hook).
- Pas de variant `Button` spécifique : on hérite du variant default shadcn déjà utilisé par le sub 04 layout. Si le layout a stylé le bouton en `<Button variant="..." size="...">`, **conserver** la même configuration en l'ajoutant ici (vérifier le code existant de `ContactForm.tsx` avant de coder).

- [ ] **Step 1.2: Vérification typecheck**

Run: `pnpm typecheck`

Expected: pas d'erreur. Le hook `useFormStatus` est typé natif React 19 (pas de import explicit du type `FormStatus` requis, `pending` est `boolean`).

---

## Task 2: Modifier `ContactForm.tsx` — swap stub vers `useActionState`

**Files:**
- Modify: `src/components/features/contact/ContactForm.tsx` (créé par sub 04 layout — vérifier l'état du fichier avant)

- [ ] **Step 2.1: Lire l'état actuel du fichier**

Run: `cat src/components/features/contact/ContactForm.tsx` (ou ouvrir dans l'IDE).

Le fichier est créé par sub 04 du layout (Feature 1) avec :
- Composant `'use client'` autonome
- 5 inputs visibles : `name`, `company`, `email`, `subject`, `message`
- Prop `defaultSubject: string` consommée par `<input name="subject" defaultValue={defaultSubject}>`
- Handler stub `onSubmit` qui fait `toast.success(...stubToast)` + `console.log(...)`
- Pattern soit `useState` + `onSubmit`, soit `useActionState(stubAction, ...)` (à découvrir)

Identifier les éléments à **préserver** :
- Structure des 5 champs visibles (labels, placeholders, classes Tailwind, ordre)
- Layout `<Card>` + `<form>` (gap, classes utilitaires)
- Préservation de la prop `defaultSubject`

Identifier les éléments à **remplacer** :
- Le handler stub (toast + console.log) → branchement Server Action
- Tout `useState` par champ (uniquement si présent — incompatible avec `useActionState`)

- [ ] **Step 2.2: Réécrire `ContactForm.tsx` avec le pattern useActionState**

Chemin : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/components/features/contact/ContactForm.tsx`

Cible — adapter selon le code existant en préservant la structure visuelle (Card, classes Tailwind, ordre des champs) et les clés i18n existantes (`fields.*`, `placeholders.*`, `submit`) :

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

import { initialContactFormState, submitContact } from '@/server/actions/contact'

import { SubmitButton } from './SubmitButton'

type ContactFormProps = {
  defaultSubject: string
}

export function ContactForm({ defaultSubject }: ContactFormProps) {
  const t = useTranslations('ContactPage.form')
  const [state, formAction] = useActionState(submitContact, initialContactFormState)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok === true) {
      toast.success(t('success.toast'))
      formRef.current?.reset()
    } else if (state.ok === false && state.message !== null) {
      toast.error(t(`errors.${state.message}`))
    }
  }, [state, t])

  return (
    <Card className="p-6">
      <form ref={formRef} action={formAction} className="flex flex-col gap-4">
        {/* Honeypot caché — premier dans le DOM pour piéger les bots qui remplissent dans l'ordre */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="sr-only"
        />

        <div>
          <Label htmlFor="contact-name">{t('fields.name')}</Label>
          <Input
            id="contact-name"
            name="name"
            type="text"
            required
            placeholder={t('placeholders.name')}
          />
          {state.errors.name?.map((code) => (
            <p key={code} className="mt-1 text-sm text-destructive">
              {t(`errors.${code}`)}
            </p>
          ))}
        </div>

        <div>
          <Label htmlFor="contact-company">{t('fields.companyOptional')}</Label>
          <Input
            id="contact-company"
            name="company"
            type="text"
            placeholder={t('placeholders.company')}
          />
          {state.errors.company?.map((code) => (
            <p key={code} className="mt-1 text-sm text-destructive">
              {t(`errors.${code}`)}
            </p>
          ))}
        </div>

        <div>
          <Label htmlFor="contact-email">{t('fields.email')}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            placeholder={t('placeholders.email')}
          />
          {state.errors.email?.map((code) => (
            <p key={code} className="mt-1 text-sm text-destructive">
              {t(`errors.${code}`)}
            </p>
          ))}
        </div>

        <div>
          <Label htmlFor="contact-subject">{t('fields.subject')}</Label>
          <Input
            id="contact-subject"
            name="subject"
            type="text"
            required
            defaultValue={defaultSubject}
            placeholder={t('placeholders.subject')}
          />
          {state.errors.subject?.map((code) => (
            <p key={code} className="mt-1 text-sm text-destructive">
              {t(`errors.${code}`)}
            </p>
          ))}
        </div>

        <div>
          <Label htmlFor="contact-message">{t('fields.message')}</Label>
          <Textarea
            id="contact-message"
            name="message"
            required
            rows={6}
            placeholder={t('placeholders.message')}
          />
          {state.errors.message?.map((code) => (
            <p key={code} className="mt-1 text-sm text-destructive">
              {t(`errors.${code}`)}
            </p>
          ))}
        </div>

        <SubmitButton label={t('submit')} submittingLabel={t('submitting')} />
      </form>
    </Card>
  )
}
```

**Notes pour le worker** :
- **Préserver** strictement les classes Tailwind, l'ordre des champs, et les clés i18n `fields.*` / `placeholders.*` / `submit` du sub 04 layout. Le code ci-dessus est une cible illustrative — adapter aux conventions exactes du fichier existant.
- **Supprimer** complètement tout import / usage de `console.log` qui était dans le stub.
- **Supprimer** la clé i18n `stubToast` lue par l'ancien handler (réfèrera bientôt à une clé inexistante après Task 5).
- **Ne pas** ajouter de `key` au form (`form.reset()` natif suffit pour les inputs non-contrôlés).
- **Ne pas** appeler `useFormStatus()` ici dans le ContactForm parent — uniquement dans `SubmitButton` (rule server-actions).
- L'import `useActionState` vient de `'react'` (React 19), pas `'react-dom'` (qui est `useFormStatus`).
- Si le sub 04 layout utilisait déjà `useActionState(stubAction, initialState)`, la modif se réduit à : (1) swap `stubAction` → `submitContact`, (2) swap initial state → `initialContactFormState` importé, (3) ajout du `useEffect` toasts + reset, (4) ajout du honeypot input, (5) ajout du rendu `state.errors[fieldName]?.map()` sous chaque input.

- [ ] **Step 2.3: Vérification typecheck du composant**

Run: `pnpm typecheck`

Expected: pas d'erreur. `state` est typé `ContactFormState` (importé via `initialContactFormState`), `state.errors.name` est `string[] | undefined`, `state.message` est `string | null`.

Si erreur de typage sur `t(\`errors.${code}\`)` (next-intl exige des clés statiques pour le type-checking), le projet a probablement déjà désactivé cette contrainte ou utilise un cast. Vérifier `.claude/rules/next-intl/translations.md` et appliquer le pattern projet existant.

---

## Task 3: Ajouter les clés i18n FR

**Files:**
- Modify: `messages/fr.json`

- [ ] **Step 3.1: Localiser le namespace `ContactPage.form` dans `messages/fr.json`**

Run: `grep -n "\"form\":" messages/fr.json | head -5`

Identifier le bloc `ContactPage.form` créé par sub 04 layout. Il contient déjà : `title`, `subtitle`, `fields.{name, company, companyOptional, email, subject, message}`, `placeholders.{...}`, `submit`, `submitting` (peut-être absent), `stubToast`, `subjectPrefill.{ia, fullstack, formation}`.

- [ ] **Step 3.2: Ajouter les sous-objets `errors`, `success` et la clé `submitting`**

Insérer dans `messages/fr.json` sous `ContactPage.form` :

```json
"errors": {
  "name_required": "Votre nom est requis.",
  "name_too_long": "Votre nom est trop long (max 120 caractères).",
  "company_too_long": "Le nom de votre société est trop long (max 200 caractères).",
  "email_invalid": "Email invalide.",
  "email_too_long": "Email trop long (max 200 caractères).",
  "subject_required": "Le sujet est requis.",
  "subject_too_long": "Sujet trop long (max 200 caractères).",
  "message_too_short": "Votre message doit contenir au moins 20 caractères.",
  "message_too_long": "Votre message est trop long (max 5000 caractères).",
  "rate_limit_exceeded": "Trop de tentatives, veuillez réessayer dans quelques minutes.",
  "smtp_error": "Une erreur est survenue lors de l'envoi. Veuillez réessayer plus tard.",
  "generic": "Une erreur est survenue. Veuillez réessayer."
},
"success": {
  "toast": "Merci pour votre message ! Je vous réponds très vite."
},
"submitting": "Envoi en cours…"
```

**Notes pour le worker** :
- Si la clé `submitting` existe déjà (créée préventivement par sub 04 layout), conserver sa valeur ou ajuster selon les conventions du projet.
- Les valeurs ci-dessus sont des **suggestions** : adapter le ton selon les autres textes du portfolio (ex: tutoyer ou vouvoyer cohérent avec le reste du site). Vérifier le ton de `placeholders.*` existants pour aligner.
- Préserver strictement la structure JSON (indentation 2 espaces, virgules, ordre des clés cohérent avec le namespace).

- [ ] **Step 3.3: Retirer la clé `stubToast` obsolète**

Repérer dans `messages/fr.json` la clé `ContactPage.form.stubToast` et la supprimer (avec sa virgule trailing si nécessaire pour préserver la validité JSON).

- [ ] **Step 3.4: Vérifier la validité JSON**

Run: `pnpm exec tsx --eval "console.log(JSON.parse(require('fs').readFileSync('messages/fr.json','utf-8')).ContactPage.form.errors)"`

Expected: l'objet `errors` complet est imprimé sans erreur de parse.

Alternative plus simple : `pnpm typecheck` qui inclut la validation des clés i18n typées par next-intl.

---

## Task 4: Ajouter les clés i18n EN (parité stricte)

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 4.1: Insérer la parité EN sous `ContactPage.form`**

Insérer dans `messages/en.json` aux mêmes emplacements que FR :

```json
"errors": {
  "name_required": "Your name is required.",
  "name_too_long": "Your name is too long (max 120 characters).",
  "company_too_long": "Your company name is too long (max 200 characters).",
  "email_invalid": "Invalid email.",
  "email_too_long": "Email is too long (max 200 characters).",
  "subject_required": "Subject is required.",
  "subject_too_long": "Subject is too long (max 200 characters).",
  "message_too_short": "Your message must be at least 20 characters.",
  "message_too_long": "Your message is too long (max 5000 characters).",
  "rate_limit_exceeded": "Too many attempts, please try again in a few minutes.",
  "smtp_error": "An error occurred while sending. Please try again later.",
  "generic": "An error occurred. Please try again."
},
"success": {
  "toast": "Thanks for your message! I'll get back to you soon."
},
"submitting": "Sending…"
```

- [ ] **Step 4.2: Retirer la clé `stubToast` obsolète de la version EN**

Repérer et supprimer `ContactPage.form.stubToast` dans `messages/en.json`.

- [ ] **Step 4.3: Vérifier la parité FR/EN**

Run: `pnpm exec tsx scripts/check-i18n-parity.ts` (si le projet a un tel script — sinon comparaison manuelle via `diff <(jq 'paths(scalars)' messages/fr.json) <(jq 'paths(scalars)' messages/en.json)` ou équivalent).

Expected: 0 différence sur les clés (seules les valeurs diffèrent).

Si le projet n'a pas de tooling i18n parity, vérifier visuellement que les 14 clés ajoutées en FR ont leur pendant EN au même chemin.

---

## Task 5: Vérifier la suppression complète des références à `stubToast`

**Files:** aucun (commande de vérification)

- [ ] **Step 5.1: Grep pour s'assurer qu'aucun fichier ne référence plus `stubToast`**

Run: `grep -rn "stubToast" src/ messages/`

Expected: **aucun résultat**. Si un résultat apparaît dans `src/components/features/contact/ContactForm.tsx`, c'est une oubli de Task 2.2 — supprimer la référence (probablement un `t('stubToast')` ou similaire).

---

## Task 6: Vérifications quality

**Files:** aucun (commandes uniquement)

- [ ] **Step 6.1: Typecheck global**

Run: `pnpm typecheck`

Expected: pas d'erreur. Le typage `ContactFormState` propagé depuis sub 03 doit être correctement consommé par `useActionState`. Le typage des props `SubmitButton` et `ContactForm` doit passer.

- [ ] **Step 6.2: Lint**

Run: `pnpm lint`

Expected: pas d'erreur ni warning bloquant sur les 4 fichiers modifiés/créés.

- [ ] **Step 6.3: Tests Vitest existants restent verts (non-régression)**

Run: `pnpm test`

Expected: la suite complète (tests sub 02 + sub 03 + autres tests projet) reste verte. Aucun test n'a été ajouté par ce sub-project.

- [ ] **Step 6.4: Build Next.js**

Run: `pnpm build`

Expected: build réussit. Pas d'erreur de bundling sur `useActionState`/`useFormStatus` (server/client split correct), pas d'import accidentel de modules serveur côté client.

**Note** : si le build échoue avec une erreur sur les vars SMTP (sub 01 fail-fast Zod), c'est attendu sans `.env.local` valide. Configurer l'environnement avant build, ou skipper Step 6.4 si on est juste en environnement de spec writing.

---

## Task 7: Validation Playwright (6 scénarios manuels)

**Files:** aucun fichier permanent (vérification runtime via le MCP `mcp__playwright__browser_*`)

**Prérequis** :
- `.env.local` configuré avec les 6 vars du sub 01 (SMTP IONOS réel + `MAIL_TO` accessible).
- `pnpm dev` lancé en background sur `http://localhost:3000`.
- Boîte mail `MAIL_TO` ouverte pour vérifier la réception.

- [ ] **Step 7.1: Test 1 — happy path FR**

1. `mcp__playwright__browser_navigate` → `http://localhost:3000/fr/contact`
2. `mcp__playwright__browser_snapshot` → vérifier visuellement que le form s'affiche avec 5 champs visibles + SubmitButton « Envoyer »
3. `mcp__playwright__browser_fill_form` → remplir : name=`Alice Test`, company=`Acme Test`, email=`<ta_email_perso>`, subject=`Test sub 04`, message=`Bonjour, ceci est un test du sub 04 du portfolio (au moins 20 caractères).`
4. `mcp__playwright__browser_click` sur le bouton « Envoyer »
5. Pendant la soumission : `mcp__playwright__browser_snapshot` → vérifier que le bouton affiche « Envoi en cours… » et est disabled
6. Après la soumission : `mcp__playwright__browser_snapshot` → vérifier le toast vert « Merci pour votre message ! Je vous réponds très vite. »
7. `mcp__playwright__browser_evaluate` → `document.querySelector('input[name="name"]').value` doit être vide (form reset)
8. **Vérification email** : ouvrir `MAIL_TO` → 1 mail reçu avec sujet `Contact: Alice Test — Test sub 04` et le body text contenant les 4 champs

Expected: tous les checks PASS.

- [ ] **Step 7.2: Test 2 — happy path EN (parité)**

1. `mcp__playwright__browser_navigate` → `http://localhost:3000/en/contact`
2. `mcp__playwright__browser_fill_form` (mêmes valeurs que Test 1)
3. `mcp__playwright__browser_click` sur le bouton « Submit »
4. `mcp__playwright__browser_snapshot` → vérifier le toast EN « Thanks for your message! I'll get back to you soon. »

Expected: même comportement qu'en FR mais textes EN.

- [ ] **Step 7.3: Test 3 — email invalide → message localisé sous le champ**

1. `mcp__playwright__browser_navigate` → `http://localhost:3000/fr/contact`
2. `mcp__playwright__browser_fill_form` → name=`Alice`, email=`pas-un-email`, subject=`Test`, message=`Au moins vingt caractères dans le message.`
3. `mcp__playwright__browser_click` sur « Envoyer »
4. `mcp__playwright__browser_snapshot` → vérifier que sous le champ Email apparaît le texte « Email invalide. » en `text-destructive`
5. Vérifier qu'**aucun toast** global n'est affiché
6. Vérifier que les autres champs gardent leurs valeurs (form non reset)

Expected: tous les checks PASS.

**Note** : `<input type="email" required>` HTML5 peut bloquer la soumission côté client avec un message natif du navigateur AVANT que la Server Action soit appelée. Pour bypasser et tester la validation Zod serveur : utiliser `mcp__playwright__browser_evaluate` pour `document.querySelector('input[name="email"]').setAttribute('type', 'text')` AVANT le submit.

- [ ] **Step 7.4: Test 4 — rate limit dépassé**

1. Soumettre 5 fois consécutivement le form valide depuis la même session (Tests 1 répétés)
2. À la 6e tentative, `mcp__playwright__browser_click` sur « Envoyer »
3. `mcp__playwright__browser_snapshot` → vérifier le toast rouge « Trop de tentatives, veuillez réessayer dans quelques minutes. »
4. Vérifier qu'aucun email n'arrive sur `MAIL_TO` pour la 6e tentative
5. Vérifier que le form n'est PAS reset (les valeurs restent saisies)

Expected: tous les checks PASS.

**Note** : pour reset le rate limit après ce test (et continuer les tests), redémarrer `pnpm dev` (le rate-limiter est in-memory, redémarrage = reset).

- [ ] **Step 7.5: Test 5 — honeypot bypass DevTools**

1. `mcp__playwright__browser_navigate` → `http://localhost:3000/fr/contact`
2. `mcp__playwright__browser_evaluate` →
   ```javascript
   document.querySelector('input[name="website"]').value = 'bot-spam-test'
   ```
3. `mcp__playwright__browser_fill_form` (5 champs métier valides comme Test 1, **sauf** mettre un email différent pour distinguer cet envoi)
4. `mcp__playwright__browser_click` sur « Envoyer »
5. `mcp__playwright__browser_snapshot` → vérifier le toast success vert (factice)
6. Vérifier que le form est reset (cohérent avec un vrai succès)
7. **Vérification critique email** : ouvrir `MAIL_TO` → **AUCUN mail ne doit arriver** pour cet envoi

Expected: toast success affiché côté UI, mais aucun mail effectivement envoyé (sub 03 a déjà testé le honeypot côté serveur).

- [ ] **Step 7.6: Test 6 — Tab navigation skip honeypot**

1. `mcp__playwright__browser_navigate` → `http://localhost:3000/fr/contact`
2. `mcp__playwright__browser_press_key` → `Tab` plusieurs fois depuis le début de la page jusqu'à atteindre les inputs du form
3. `mcp__playwright__browser_evaluate` → `document.activeElement.name` doit retourner `'name'` (premier champ visible) directement, JAMAIS `'website'`

Expected: l'input `website` est skippé par la navigation Tab.

- [ ] **Step 7.7: Snapshot visuel final**

1. `mcp__playwright__browser_take_screenshot` → snapshot de la page `/contact` complète pour archive visuelle (optionnel, pour comparer avec sub 04 layout pré-implémentation)

---

## Task 8: Signal de complétion (pas de commit automatique)

- [ ] **Step 8.1: Vérifier le `git status` du worktree**

Run (depuis `D:/Desktop/thibaud-geisler-portfolio-specs-contact/`) : `git status`

Expected: 4 fichiers modifiés/créés
- `new file: src/components/features/contact/SubmitButton.tsx`
- `modified: src/components/features/contact/ContactForm.tsx`
- `modified: messages/fr.json`
- `modified: messages/en.json`

Aucun autre fichier ne doit apparaître (en particulier pas de `scripts/check-*.ts` jetable).

- [ ] **Step 8.2: Annoncer la fin du sub-project**

Le sub-project 4 (`branchement-contact-form-action`) est implémenté. **NE PAS committer automatiquement** : règle utilisateur stricte.

Message attendu pour le user :

```
✅ Sub-project 4/4 (branchement-contact-form-action) implémenté.
- src/components/features/contact/SubmitButton.tsx créé (useFormStatus, props label/submittingLabel)
- src/components/features/contact/ContactForm.tsx modifié (useActionState + honeypot + erreurs sous champs + toasts succès/erreur + reset)
- messages/fr.json + messages/en.json modifiés (14 nouvelles clés errors.* / success.toast / submitting, retrait stubToast obsolète)
- typecheck / lint / build : verts
- Validation Playwright : 6 scénarios passés (happy path FR/EN, email invalide, rate limit, honeypot bypass, Tab skip)

🎉 Feature 4 — Formulaire de contact COMPLÈTE (4/4 sub-projects implémentés).

Prêt à commit sur chore/specs-formulaire-contact, attends ton go.
```

---

## Self-review checklist

- [x] **Spec coverage** : tous les acceptance criteria du spec couverts
  - Scénario 1 (happy path FR) → Task 7.1
  - Scénario 2 (happy path EN) → Task 7.2
  - Scénario 3 (Zod email invalide) → Task 7.3
  - Scénario 4 (rate limit) → Task 7.4
  - Scénario 5 (SMTP fail) → couvert implicitement par sub 03 (test mocké). Pas de Playwright test parce que demande de simuler un crash SMTP en runtime — peut être ajouté en mode debug si besoin
  - Scénario 6 (honeypot bypass DevTools) → Task 7.5
  - Scénario 7 (honeypot caché Tab navigation) → Task 7.6
  - Scénario 8 (SubmitButton transition) → Task 7.1 step 5
  - Scénario 9 (suppression `stubToast`) → Task 5
- [x] **Pas de placeholder** : tout le code est complet, commandes exactes
- [x] **Type consistency** : `ContactFormState`, `initialContactFormState`, `submitContact` cohérents avec sub 03 ; `SubmitButton` props cohérents
- [x] **Anti-patterns explicites** : pas de `useFormStatus` dans le ContactForm parent, pas de `display: none` honeypot (sr-only), pas de tests Vitest RTL, retrait `stubToast`, préservation `defaultSubject`
- [x] **Pas de commit automatique** : Task 8 signal de fin, message d'attente explicite

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/formulaire-de-contact/04-branchement-contact-form-action.md`. Ce plan **clôt la boucle** `/decompose-feature` (sub 4/4 de Feature 4 — Formulaire de contact).

L'exécution sera lancée plus tard via `/implement-subproject formulaire-de-contact 04`, qui orchestrera `superpowers:subagent-driven-development` (Task 1-6) + validation Playwright (Task 7) + demande de commit explicite (Task 8).

**Sortie finale du workflow `/decompose-feature`** :

8 fichiers générés dans le worktree :
- `docs/superpowers/specs/formulaire-de-contact/01-config-smtp-mailer-design.md` + `02-zod-schema-contact-design.md` + `03-server-action-submit-contact-design.md` + `04-branchement-contact-form-action-design.md`
- `docs/superpowers/plans/formulaire-de-contact/01-config-smtp-mailer.md` + `02-zod-schema-contact.md` + `03-server-action-submit-contact.md` + `04-branchement-contact-form-action.md`

Le user peut maintenant committer ces 8 fichiers sur la branche `chore/specs-formulaire-contact` du worktree, créer une PR vers `develop`, et lancer plus tard `/implement-subproject formulaire-de-contact 01` pour démarrer la phase d'implémentation.
