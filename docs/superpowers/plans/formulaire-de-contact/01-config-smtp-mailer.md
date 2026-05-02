# Sub 01: Config SMTP & transporter nodemailer: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer `src/lib/mailer.ts` qui valide les 6 vars SMTP/MAIL au boot via Zod et expose un singleton `transporter` nodemailer + les constantes typées `MAIL_FROM` / `MAIL_TO` pour la Server Action `submitContact` à venir au sub 03.

**Architecture:** Module serveur unique avec singleton top-level (pas de factory), schéma Zod parsé à l'import (fail fast au boot Next), pas de wrapper applicatif `sendMail()` (la Server Action sub 03 appelle `transporter.sendMail()` directement). YAGNI : pas de `src/lib/env.ts` centralisé tant qu'un seul module a besoin de validation env stricte.

**Tech Stack:** Next.js 16 App Router + TypeScript 6 strict + nodemailer ^8.0.5 (déjà installé) + @types/nodemailer ^8.0.0 (déjà installé) + zod (déjà utilisé dans le projet).

**Spec source:** `docs/superpowers/specs/formulaire-de-contact/01-config-smtp-mailer-design.md`

**Gating de qualité:** pas de TDD (`tdd_scope: none`, la rule `.claude/rules/nodemailer/email.md` justifie le pattern singleton, le test reviendrait à tester nodemailer = lib externe). Validation par `pnpm typecheck` + `pnpm lint` + `pnpm build` + 1 vérif manuelle ciblée.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `.env.example` | Modify | Ajout d'une ligne `MAIL_TO=` dans la section `=== SMTP ===` existante (alignement 29 colonnes conservé) |
| `src/lib/mailer.ts` | Create | Schéma Zod env local + singleton `transporter: Transporter` au top-level + export des constantes `MAIL_FROM` et `MAIL_TO` |

Aucun autre fichier touché. Pas de test (`tdd_scope: none`).

---

## Task 1: Documenter la nouvelle var `MAIL_TO` dans `.env.example`

**Files:**
- Modify: `.env.example` (section `=== SMTP ===` lignes 12-17)

- [ ] **Step 1.1: Ouvrir `.env.example` et localiser la fin de la section SMTP**

La section actuelle (lignes 12-17) :

```dotenv
# === SMTP ===
SMTP_HOST=
SMTP_PORT=                   # 587 (STARTTLS) | 465 (TLS)
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

L'alignement vertical des commentaires est à **29 colonnes** (le `#` de la ligne `SMTP_PORT=` commence colonne 30). À conserver pour la nouvelle ligne.

- [ ] **Step 1.2: Ajouter la ligne `MAIL_TO=` immédiatement après `SMTP_FROM=`**

Après modification, la section SMTP doit ressembler **exactement** à ceci (21 espaces entre `MAIL_TO=` et `#`) :

```dotenv
# === SMTP ===
SMTP_HOST=
SMTP_PORT=                   # 587 (STARTTLS) | 465 (TLS)
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
MAIL_TO=                     # destinataire des messages reçus via le formulaire de contact
```

Ne PAS toucher aux 5 lignes existantes ni à la section Calendly qui suit (lignes 19-23).

- [ ] **Step 1.3: Vérifier visuellement l'alignement**

Run: `pnpm exec --silent cat .env.example` (ou ouvrir dans VSCode avec la regle 30 colonnes affichée)

Expected: les `#` des deux lignes commentées de la section SMTP (`SMTP_PORT` et `MAIL_TO`) sont alignés verticalement.

---

## Task 2: Créer `src/lib/mailer.ts`

**Files:**
- Create: `src/lib/mailer.ts`

- [ ] **Step 2.1: Créer le fichier avec le contenu suivant**

Chemin exact : `D:/Desktop/thibaud-geisler-portfolio-specs-contact/src/lib/mailer.ts`

```typescript
import nodemailer, { type Transporter } from 'nodemailer'
import { z } from 'zod'

const envSchema = z.object({
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),
  MAIL_TO: z.string().email(),
})

const env = envSchema.parse(process.env)

export const transporter: Transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
})

export const MAIL_FROM = env.SMTP_FROM
export const MAIL_TO = env.MAIL_TO
```

**Notes pour le worker :**
- Le `secure` est dérivé du port : `true` pour 465 (TLS direct), `false` pour 587 (STARTTLS, cas IONOS par défaut). La rule `.claude/rules/nodemailer/email.md` documente les deux cas.
- `z.coerce.number()` accepte string ou number depuis `process.env` (toujours string en runtime Node, mais `.coerce` convertit proprement).
- Le `parse()` au top-level **throw** si une var manque ou est invalide → application crash au boot Next, comportement voulu (fail fast).
- Aucun `try/catch` ici : le crash doit remonter pour être visible dans les logs Dokploy.
- **Ne PAS** créer de fonction `getMailer()` ni de cache `let cachedTransporter`, anti-pattern explicite (rule nodemailer + spec décision archi A).
- **Ne PAS** créer de wrapper `sendMail()` ici, la Server Action sub 03 appellera `transporter.sendMail()` directement (spec décision archi A).
- **Ne PAS** ajouter `import 'server-only'` au top, pas nécessaire au sub 01 puisque le module n'est pas encore importé par un caller. Si le sub 03 introduit un risque d'import accidentel client, il l'ajoutera lui-même.

- [ ] **Step 2.2: Vérifier que les imports sont reconnus**

Run: `pnpm typecheck`

Expected: `tsc --noEmit` passe sans erreur, en particulier sur `import nodemailer, { type Transporter } from 'nodemailer'` (nécessite `esModuleInterop: true` dans `tsconfig.json` qui est déjà configuré projet, voir `.claude/rules/typescript/conventions.md`).

Si erreur d'import : vérifier `tsconfig.json` projet, `@types/nodemailer` installé (vérifié dans `package.json`).

---

## Task 3: Vérifications qualité

**Files:** aucun (commandes uniquement)

- [ ] **Step 3.1: Typecheck**

Run: `pnpm typecheck`

Expected: pas d'erreur. Le type `Transporter` est inféré, les types Zod inférés (`env.SMTP_PORT` est `number`, `env.MAIL_TO` est `string`).

- [ ] **Step 3.2: Lint**

Run: `pnpm lint`

Expected: pas d'erreur ni warning bloquant sur `src/lib/mailer.ts`.

- [ ] **Step 3.3: Build (vérification webpack ne bundle pas nodemailer côté client)**

Run: `pnpm build`

Expected: build réussit. Comme `src/lib/mailer.ts` n'est encore importé nulle part (sub 03 ajoutera l'import), le tree-shaking l'exclut du bundle. Si la commande échoue avec une erreur sur `net`/`tls`/`dns`, c'est qu'un autre fichier du repo a déjà importé `mailer.ts` côté client par erreur, investiguer avant de continuer.

**Note** : si le build échoue parce que les vars SMTP ne sont pas définies dans l'environnement de build, c'est un effet de bord du `parse()` top-level. Solution : ne pas exécuter `pnpm build` sans `.env.local` valide pendant le développement local, ou attendre l'étape 4 (test manuel) qui suppose un `.env.local` valide. Pour la CI/Dokploy, les vars doivent être définies dans la config de l'environnement avant build.

---

## Task 4: Test manuel ciblé (optionnel mais recommandé)

**Files:** aucun (vérification runtime uniquement)

- [ ] **Step 4.1: Configurer un `.env.local` complet**

S'il n'existe pas, créer `.env.local` à la racine du worktree avec les 6 vars renseignées (valeurs IONOS réelles). Exemple minimal :

```dotenv
SMTP_HOST=smtp.ionos.fr
SMTP_PORT=587
SMTP_USER=contact@thibaud-geisler.com
SMTP_PASS=<mot_de_passe_smtp>
SMTP_FROM=contact@thibaud-geisler.com
MAIL_TO=tibo57350@gmail.com
```

- [ ] **Step 4.2: Vérifier l'import sans erreur Zod**

Lancer un script ad hoc (à supprimer ensuite) ou utiliser le REPL :

Créer temporairement `scripts/check-mailer.ts` :

```typescript
import { transporter, MAIL_FROM, MAIL_TO } from '../src/lib/mailer'

console.log('Transporter prêt :', transporter.options.host)
console.log('From :', MAIL_FROM)
console.log('To :', MAIL_TO)
```

Run: `pnpm tsx scripts/check-mailer.ts` (ou la commande équivalente projet pour exécuter un fichier TS arbitraire)

Expected:
```
Transporter prêt : smtp.ionos.fr
From : contact@thibaud-geisler.com
To : tibo57350@gmail.com
```

Si la sortie est correcte → le module fonctionne. **Supprimer** `scripts/check-mailer.ts` immédiatement après (ne PAS commit).

- [ ] **Step 4.3: Vérifier le crash au boot avec une var manquante**

Commenter la ligne `MAIL_TO=...` dans `.env.local`, puis relancer le script :

Run: `pnpm tsx scripts/check-mailer.ts`

Expected: le processus crash avec un `ZodError` mentionnant `MAIL_TO` (ex: `Required` ou `Invalid email`).

Restaurer `MAIL_TO` dans `.env.local`. Supprimer `scripts/check-mailer.ts` si encore présent.

**Note** : ce test manuel n'est PAS automatisé volontairement, `tdd_scope: none` (no-lib-test). L'utilisateur le fait une seule fois pour valider le sub-project.

---

## Task 5: Signal de complétion (pas de commit automatique)

- [ ] **Step 5.1: Vérifier le `git status` du worktree**

Run (depuis le worktree `D:/Desktop/thibaud-geisler-portfolio-specs-contact/`) : `git status`

Expected: 2 fichiers modifiés/créés
- `modified: .env.example`
- `new file: src/lib/mailer.ts`

Aucun autre fichier ne doit apparaître. Si `scripts/check-mailer.ts` apparaît, le supprimer.

- [ ] **Step 5.2: Annoncer la fin du sub-project**

Le sub-project 1 (`config-smtp-mailer`) est implémenté. Il reste à committer sur la branche `chore/specs-formulaire-contact` du worktree, mais **NE PAS committer automatiquement** : la règle utilisateur impose une demande explicite avant tout commit. Reporter au workflow parent (`/decompose-feature` ou `/implement-subproject`) pour qu'il :

1. Lance les quality gates (`/simplify` + `Agent code/code-reviewer`) si la phase d'implémentation l'exige
2. Demande au user le périmètre exact du commit
3. Met à jour le frontmatter du spec source (`status: implemented`) au moment du commit

Message attendu pour le user :

```
✅ Sub-project 1/4 (config-smtp-mailer) implémenté.
- src/lib/mailer.ts créé (singleton transporter + Zod env-schema + constantes MAIL_FROM/MAIL_TO)
- .env.example modifié (ajout MAIL_TO=)
- typecheck / lint / build : verts
- Test manuel : transporter instancié OK, crash au boot si var manquante OK

Prêt à commit sur chore/specs-formulaire-contact, attends ton go.
```

---

## Self-review checklist

- [x] **Spec coverage** : tous les acceptance criteria du spec sont couverts par les tasks (Scénarios 1-4 = behavior validé par Step 4.2 et 4.3 + crash Zod, Scénario 5 = singleton implicite par module-level export Node, Scénario 6 = Step 1.2)
- [x] **Pas de placeholder** : aucun TBD/TODO, code complet à chaque step de modification, commandes exactes
- [x] **Type consistency** : `transporter`, `MAIL_FROM`, `MAIL_TO` nommés identiquement dans toutes les tasks et alignés avec le spec
- [x] **Anti-patterns explicites** : factory mémoïsée, wrapper `sendMail()`, `src/lib/env.ts` central → tous explicitement interdits dans Step 2.1 conformément aux décisions architecturales du spec
- [x] **Pas de commit automatique** : Task 5 reporte au workflow parent, message d'attente explicite

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/formulaire-de-contact/01-config-smtp-mailer.md`. Ce plan fait partie d'une boucle `/decompose-feature` (sub 1/4 de Feature 4, Formulaire de contact).

L'exécution sera lancée plus tard via `/implement-subproject formulaire-de-contact 01`, qui orchestrera `superpowers:subagent-driven-development` + quality gates (`/simplify` + `code/code-reviewer`) + demande de commit explicite.

Pour l'instant, le workflow parent (`/decompose-feature`) doit reprendre la main pour enchaîner sur le **sub-project 2** (`zod-schema-contact`).
