---
feature: "Feature 4 — Formulaire de contact"
subproject: "config-smtp-mailer"
goal: "Configurer les variables d'environnement SMTP IONOS et fournir un transporter nodemailer singleton prêt à l'emploi pour la Server Action submitContact."
status: "draft"
complexity: "S"
tdd_scope: "none"
depends_on: []
date: "2026-04-26"
---

# Configuration SMTP IONOS et transporter nodemailer

## Scope

Création du module `src/lib/mailer.ts` qui (1) valide les 6 variables SMTP au boot via un schéma Zod local, (2) instancie un singleton `Transporter` nodemailer (port 587 + STARTTLS pour IONOS) au top-level, (3) expose les constantes typées `MAIL_FROM` et `MAIL_TO` pour les consommateurs serveur (la Server Action `submitContact` arrive au sub 03). Ajout de la ligne `MAIL_TO=` au `.env.example` (les 5 vars `SMTP_*` sont déjà présentes). Aucun wrapper `sendMail()` n'est introduit : la Server Action sub 03 appellera directement `transporter.sendMail({ from: MAIL_FROM, to: MAIL_TO, ... })`.

**Exclu** : utilisation du transporter dans une Server Action (sub 03), wrapper helper `sendMail()`, templates HTML/MJML (text/html simple inline, sub 03), tests unitaires (no-lib-test : tester `createTransport` reviendrait à tester nodemailer lui-même), création d'un schéma env-vars centralisé `src/lib/env.ts` (YAGNI MVP, parsing local au module mailer suffit tant qu'il n'y a qu'un seul consommateur de validation env).

### État livré

À la fin de ce sub-project, on peut : importer `{ transporter, MAIL_FROM, MAIL_TO }` depuis `@/lib/mailer` dans n'importe quel fichier serveur et appeler `await transporter.sendMail({ from: MAIL_FROM, to: MAIL_TO, subject, text })`. Si une des 6 vars (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `MAIL_TO`) est absente ou invalide, l'application crash au boot avec un message Zod identifiant la clé fautive (fail fast).

## Dependencies

Aucune — ce sub-project est autoporté. `nodemailer@^8.0.5` et `@types/nodemailer@^8.0.0` sont déjà installés dans `package.json`.

## Files touched

- **À créer** : `src/lib/mailer.ts`
- **À modifier** : `.env.example` (ajout ligne `MAIL_TO=` avec commentaire `# destinataire des messages reçus via le formulaire de contact`)

## Architecture approach

- **Singleton transporter au top-level du module** : `export const transporter: Transporter = nodemailer.createTransport({...})` instancié à l'import. Conforme à `.claude/rules/nodemailer/email.md` qui prescrit explicitement « Instancier le transporter une seule fois au niveau module » et rejette le pattern factory mémoïsée comme anti-pattern (overhead de connexion SMTP à chaque appel sinon).
- **Validation Zod au top-level** : un schéma `envSchema = z.object({ SMTP_HOST: z.string().min(1), SMTP_PORT: z.coerce.number().int().positive(), SMTP_USER: z.string().min(1), SMTP_PASS: z.string().min(1), SMTP_FROM: z.string().email(), MAIL_TO: z.string().email() })` parse `process.env` à l'import du module. Toute clé manquante ou invalide → throw immédiat (fail fast au boot, pas à la première Server Action). Conforme à `.claude/rules/zod/schemas.md`.
- **IONOS SMTP** : `host` depuis `SMTP_HOST`, `port: SMTP_PORT` (typiquement 587), `secure: false` pour STARTTLS sur 587 (conforme `.claude/rules/nodemailer/email.md`). Le commentaire existant `.env.example` ligne 14 documente déjà l'alternative `465 (TLS)` que la rule supporte aussi mais que le port par défaut IONOS reste 587.
- **Aucun préfixe `NEXT_PUBLIC_`** sur les vars SMTP : credentials côté serveur uniquement, jamais exposés au bundle client. Conforme à `.claude/rules/nodemailer/email.md` qui flag l'exposition comme risque sécurité.
- **Type `Transporter`** importé explicitement depuis `'nodemailer'` pour la type-safety du singleton. Conforme à la rule.
- **Constantes `MAIL_FROM` et `MAIL_TO`** exportées en plus du transporter : la Server Action sub 03 importera ces constantes typées au lieu de toucher `process.env.SMTP_FROM` / `process.env.MAIL_TO` directement (single source of truth, pas de re-parsing).
- **Pas de wrapper `sendMail()`** : la Server Action sub 03 appelle directement `transporter.sendMail({ from: MAIL_FROM, to: MAIL_TO, replyTo: userEmail, subject, text })`. Logs Pino + try/catch + sanitization RGPD relèvent de la logique métier de sub 03, pas de la couche infra mailer. Conforme à l'exemple de la rule.
- **Conventions TypeScript** : `.claude/rules/typescript/conventions.md`.

## Acceptance criteria

### Scénario 1 : import avec vars valides
**GIVEN** les 6 vars `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `MAIL_TO` sont toutes définies dans `process.env` avec des valeurs valides
**WHEN** le module `src/lib/mailer.ts` est importé pour la première fois (au boot Next ou au build)
**THEN** un singleton `Transporter` nodemailer est instancié au top-level avec `host=SMTP_HOST`, `port=SMTP_PORT`, `secure=false`, `auth={ user: SMTP_USER, pass: SMTP_PASS }`
**AND** les constantes `MAIL_FROM` (string) et `MAIL_TO` (string) sont exportées avec les valeurs des env vars correspondantes
**AND** aucune erreur n'est levée

### Scénario 2 : var manquante au boot
**GIVEN** la var `SMTP_PASS` est absente de `process.env` (les 5 autres présentes et valides)
**WHEN** le module `src/lib/mailer.ts` est importé
**THEN** une erreur Zod (`ZodError`) est levée immédiatement avec un message identifiant la clé `SMTP_PASS`
**AND** aucun `transporter` n'est créé
**AND** l'application crash au boot Next (fail fast — visible dans les logs Dokploy avant tout traitement de requête)

### Scénario 3 : SMTP_PORT non numérique
**GIVEN** `SMTP_PORT="abc"`, les 5 autres vars valides
**WHEN** le module est importé
**THEN** Zod rejette la var via `z.coerce.number().int().positive()` avec une erreur de type
**AND** l'application crash au boot

### Scénario 4 : SMTP_FROM ou MAIL_TO mal formé
**GIVEN** `MAIL_TO="not-an-email"`, les 5 autres vars valides
**WHEN** le module est importé
**THEN** Zod rejette la var via `z.string().email()` avec une erreur de format
**AND** l'application crash au boot

### Scénario 5 : réutilisation du singleton
**GIVEN** les vars sont valides
**WHEN** deux fichiers serveur différents importent `{ transporter }` depuis `@/lib/mailer`
**THEN** ils reçoivent la même instance (`===` strict equality)
**AND** aucune connexion SMTP supplémentaire n'est créée à la 2e import (cache module Node natif)

### Scénario 6 : `.env.example` documenté
**GIVEN** un nouveau contributeur clone le repo et copie `.env.example` en `.env.local`
**WHEN** il ouvre le fichier
**THEN** il voit la ligne `MAIL_TO=` avec un commentaire `# destinataire des messages reçus via le formulaire de contact` (alignement vertical cohérent avec les 5 lignes SMTP existantes lignes 13-17)
**AND** les 5 autres vars SMTP existantes restent intactes (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)

## Edge cases

- **Import depuis un Client Component** : nodemailer dépend de modules Node.js (`net`, `tls`, `dns`) → casse au build webpack. Le contrat du module est implicitement « server-only » via la nature des Server Actions consommatrices (sub 03). Si le risque devient réel (ex: import accidentel), ajouter `import 'server-only'` au top du fichier au sub 03.
- **Edge runtime** : `runtime = 'edge'` ne supporte pas les APIs Node.js. Les Server Actions Next 16 sont en runtime `nodejs` par défaut, donc OK. Documenté dans `.claude/rules/nodemailer/email.md`.
- **Hot reload Next dev** : grâce au pattern singleton module-level + cache module Node, le transporter est instancié une fois par worker. Les hot reloads de fichiers n'invalidant pas `src/lib/mailer.ts` réutilisent le même transporter. Acceptable pour le MVP.
- **Rotation `SMTP_PASS`** : changement de mot de passe IONOS → mise à jour dans Dokploy → restart du conteneur → nouveau singleton. Documenté dans PRODUCTION.md § Variables d'Environnement.

## Architectural decisions

### Décision : transporter singleton top-level vs factory mémoïsée

**Options envisagées :**
- **A. Singleton top-level** : `export const transporter: Transporter = nodemailer.createTransport({...})`. Instance créée à l'import du module, partagée par tous les consommateurs via le cache module Node.
- **B. Factory mémoïsée** : `let cached: Transporter | null = null; export function getMailer(): Transporter { if (!cached) cached = createTransport({...}); return cached; }`. Instance créée à la première demande.

**Choix : A**

**Rationale :**
- `.claude/rules/nodemailer/email.md` tranche explicitement : « Instancier le transporter une seule fois au niveau module » avec exemple A ✅ et anti-pattern factory ❌ (overhead de connexion SMTP à chaque appel).
- Le crash Zod fail-fast est plus visible avec A : l'application refuse de démarrer si une var manque, au lieu de planter à la première soumission de formulaire en prod (debug bien plus difficile).
- API consommateur plus simple : `import { transporter } from '@/lib/mailer'` (pas d'appel de fonction).

### Décision : pas de wrapper `sendMail()` vs wrapper applicatif

**Options envisagées :**
- **A. Pas de wrapper** : la Server Action sub 03 appelle directement `transporter.sendMail({ from: MAIL_FROM, to: MAIL_TO, replyTo: userEmail, subject, text })`.
- **B. Wrapper `sendContactMail({ replyTo, subject, text })`** : encapsule `from`/`to` figés + try/catch + logs Pino dans le module `mailer.ts`.
- **C. Wrapper générique `sendMail({ to, subject, text, html })`** : laisse l'appelant choisir from/to mais offre une API uniforme.

**Choix : A**

**Rationale :**
- YAGNI MVP : 1 seul caller (Server Action sub 03), 1 seul use-case (envoi message contact). Wrapper inutile tant qu'il n'y a pas de 2e cas d'usage (ex: alertes admin post-MVP, mails de reset auth post-MVP).
- Logs Pino + try/catch + sanitization RGPD appartiennent à la logique métier de la Server Action sub 03, pas à la couche infra mailer (séparation des responsabilités).
- L'exemple de `.claude/rules/nodemailer/email.md` utilise `transporter.sendMail()` directement dans une Server Action.
- Refactor trivial le jour où un 2e caller apparaît (extraire un wrapper depuis sub 03 dans `mailer.ts`).

### Décision : parsing Zod local vs `src/lib/env.ts` centralisé

**Options envisagées :**
- **A. Parsing Zod local au module `mailer.ts`** : `envSchema` défini dans `mailer.ts` ne parse que les 6 vars SMTP/MAIL.
- **B. Création de `src/lib/env.ts`** : schéma Zod global pour toutes les vars projet (`DATABASE_URL`, `NEXT_PUBLIC_CALENDLY_URL`, `SMTP_*`, `MAIL_TO`, etc.) avec export d'un objet `env` typé à importer partout.

**Choix : A**

**Rationale :**
- YAGNI MVP : seul le module mailer a besoin de validation strict-au-boot. Les autres vars (`DATABASE_URL`, `NEXT_PUBLIC_CALENDLY_URL`) sont consommées ad hoc et leur absence ne justifie pas un crash au boot du portfolio.
- Aligne avec la philosophie projet documentée dans `CLAUDE.md` : « Pas de sur-ingénierie anticipatoire ».
- Refactor trivial le jour où un 2e module a besoin du même pattern (extraire le schéma vers `src/lib/env.ts`, importer côté `mailer.ts`).
