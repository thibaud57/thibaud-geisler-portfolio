# Authentification Better Auth avec Google OAuth — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installer Better Auth avec Google comme unique provider, de sorte qu'un seul compte puisse ouvrir une session.

**Architecture:** Quatre modèles Prisma transcrits à la main dans le schema `auth`, une configuration serveur qui n'active que le provider Google, et un hook de création qui rejette tout email autre que celui autorisé. La règle d'autorisation est isolée dans une fonction pure testée, seule règle métier du sub-project.

**Tech Stack:** Better Auth, Prisma 7, PostgreSQL 18, Next.js 16 App Router, Vitest. Versions exactes : `docs/VERSIONS.md`, à relever au moment de l'installation.

**Spec:** `docs/superpowers/specs/espace-admin/04-auth-better-auth-google-design.md`

## Global Constraints

- Google OAuth est le **seul** provider. Aucun provider Credentials, pas même en secours (ADR-002).
- **Ne jamais lancer `@better-auth/cli generate`** dans ce dépôt : elle écrase `prisma/schema.prisma`, où vivent les 22 annotations du sub-project `03`, et a produit un schéma incompatible Prisma 7 (issue better-auth#6277).
- Les modèles Prisma s'appellent `User`, `Session`, `Account`, `Verification` et sont mappés vers les tables `user`, `session`, `account`, `verification` via `@@map`. Le schéma reste homogène à la lecture, la base reste conforme à l'ADR-018.
- Les quatre modèles portent `@@schema("auth")`, et `"auth"` est ajouté au tableau `schemas` du datasource.
- `nextCookies()` est le **dernier** plugin déclaré, sinon les en-têtes `Set-Cookie` des Server Actions ne sont plus gérés.
- Aucune des cinq variables ne porte le préfixe `NEXT_PUBLIC_`.
- Depuis Prisma 7, `migrate dev` ne déclenche plus `prisma generate` : la régénération est explicite.
- Aucune route n'est protégée ici. Le proxy, `getCurrentUser()`, le layout protégé et la page de connexion appartiennent au sub-project `05`.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/nextjs/auth.md`, `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/api-routes.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Créer le client OAuth Google

**Files:** aucun fichier du dépôt. Action utilisateur dans la console Google Cloud.

**Interfaces:**
- Consomme : rien.
- Produit : un `GOOGLE_CLIENT_ID` et un `GOOGLE_CLIENT_SECRET`, consommés par la Task 2.

- [ ] **Step 1: Créer le projet et le client OAuth**

Dans la console Google Cloud : créer un projet, puis **APIs & Services → Credentials → Create Credentials → OAuth client ID**, type **Web application**.

- [ ] **Step 2: Déclarer les redirect URIs**

Ajouter les deux URIs de redirection autorisées :

```
http://localhost:3000/api/auth/callback/google
https://thibaud-geisler.com/api/auth/callback/google
```

Le chemin `/api/auth/callback/google` est celui que Better Auth expose depuis le route handler catch-all de la Task 5. Un oubli ici ne se manifeste qu'au moment de la connexion, par une erreur de redirect URI peu explicite.

- [ ] **Step 3: Relever les identifiants**

Copier le Client ID et le Client Secret. Le secret n'est plus affiché en clair par la suite.

- [ ] **Step 4: Générer le secret de signature**

```bash
openssl rand -base64 32
```

Cette valeur devient `BETTER_AUTH_SECRET`.

---

### Task 2 : Installer la librairie et déclarer les variables

**Files:**
- Modify: `package.json`
- Modify: `src/env.ts`
- Modify: `.env.example`

**Interfaces:**
- Consomme : les identifiants de la Task 1.
- Produit : `env.BETTER_AUTH_URL`, `env.BETTER_AUTH_SECRET`, `env.GOOGLE_CLIENT_ID`, `env.GOOGLE_CLIENT_SECRET`, `env.ADMIN_EMAIL`, consommés par les Tasks 4 et 5.

> `src/env.ts` est fail-fast : ces variables doivent être déclarées et renseignées dans le même mouvement que l'installation, sinon le démarrage casse.

- [ ] **Step 1: Installer Better Auth**

```bash
pnpm add better-auth
```

- [ ] **Step 2: Déclarer les variables dans `src/env.ts`**

Ajouter à la section `server` :

```typescript
    BETTER_AUTH_URL: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    ADMIN_EMAIL: z.email(),
```

et à `runtimeEnv`, en miroir :

```typescript
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
```

`min(32)` sur le secret correspond à la longueur d'un `openssl rand -base64 32`, et rejette une valeur tronquée au copier-coller.

- [ ] **Step 3: Documenter dans `.env.example`**

```bash
# Auth (espace admin — Better Auth + Google OAuth)
BETTER_AUTH_URL=                    # Dev : http://localhost:3000 | Prod : https://thibaud-geisler.com
BETTER_AUTH_SECRET=                 # Secret de signature (openssl rand -base64 32)
GOOGLE_CLIENT_ID=                   # Client ID OAuth Google (Google Cloud Console)
GOOGLE_CLIENT_SECRET=               # Client Secret OAuth Google (Google Cloud Console)
ADMIN_EMAIL=                        # Email unique autorisé (whitelist single-user)
```

- [ ] **Step 4: Renseigner le `.env` local et vérifier le démarrage**

Après avoir renseigné les cinq valeurs dans le `.env` local :

```bash
just typecheck
```

Expected: aucune erreur. Une variable manquante produirait une erreur de validation explicite au chargement de `src/env.ts`.

---

### Task 3 : Déclarer les modèles et migrer

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<horodatage>_better_auth/migration.sql`

**Interfaces:**
- Consomme : le datasource en multi-schema du sub-project `03`.
- Produit : les tables `auth.user`, `auth.session`, `auth.account`, `auth.verification`, consommées par les Tasks 5 et 6.

- [ ] **Step 1: Ajouter `auth` au datasource**

```prisma
datasource db {
  provider = "postgresql"
  schemas  = ["auth", "public"]
}
```

- [ ] **Step 2: Ajouter les quatre modèles**

Transcrits depuis le guide officiel Prisma pour Better Auth, avec l'ajout de `@@schema("auth")` :

```prisma
model User {
  id            String    @id
  name          String
  email         String
  emailVerified Boolean
  image         String?
  createdAt     DateTime
  updatedAt     DateTime
  sessions      Session[]
  accounts      Account[]

  @@unique([email])
  @@map("user")
  @@schema("auth")
}

model Session {
  id        String   @id
  expiresAt DateTime
  token     String
  createdAt DateTime
  updatedAt DateTime
  ipAddress String?
  userAgent String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([token])
  @@map("session")
  @@schema("auth")
}

model Account {
  id                    String    @id
  accountId             String
  providerId            String
  userId                String
  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken           String?
  refreshToken          String?
  idToken               String?
  accessTokenExpiresAt  DateTime?
  refreshTokenExpiresAt DateTime?
  scope                 String?
  password              String?
  createdAt             DateTime
  updatedAt             DateTime

  @@map("account")
  @@schema("auth")
}

model Verification {
  id         String    @id
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime?
  updatedAt  DateTime?

  @@map("verification")
  @@schema("auth")
}
```

Deux écarts volontaires avec les conventions du projet, à ne pas « corriger » :

- **Pas de `@default(uuid(7))` sur les `id`** : Better Auth génère lui-même les identifiants et les fournit à l'insertion. Un défaut Prisma serait inutile et masquerait un dysfonctionnement.
- **Pas de `@default(now())` ni de `@updatedAt`** : la librairie fournit également ces valeurs. Les laisser à Prisma créerait deux sources de vérité pour la même donnée.

Le champ `password` de `Account` reste dans le modèle bien qu'aucun provider Credentials ne soit activé : il fait partie du schéma attendu par la librairie et restera `null`.

- [ ] **Step 3: Générer la migration sans l'appliquer**

```bash
pnpm prisma migrate dev --create-only --name better_auth
```

- [ ] **Step 4: Lire le SQL généré**

```bash
cat prisma/migrations/*_better_auth/migration.sql
```

Attendu : un `CREATE SCHEMA "auth"` suivi de quatre `CREATE TABLE` dans ce schema. Vérifier qu'**aucune instruction ne touche les tables existantes** de `public` : la présence d'un `ALTER TABLE "Project"` ou équivalent signalerait une erreur d'annotation, à corriger avant d'appliquer.

- [ ] **Step 5: Appliquer et régénérer**

```bash
pnpm prisma migrate dev
pnpm db:generate
```

Le second appel est obligatoire depuis Prisma 7.

- [ ] **Step 6: Vérifier l'emplacement et le nom des tables**

```sql
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema IN ('auth', 'public')
ORDER BY table_schema, table_name;
```

Attendu : `auth.user`, `auth.session`, `auth.account`, `auth.verification` en minuscules, et les neuf tables métier toujours dans `public`.

---

### Task 4 : Fonction de whitelist

**Files:**
- Create: `src/lib/admin-whitelist.ts`
- Test: `src/lib/admin-whitelist.test.ts`

**Interfaces:**
- Consomme : `env.ADMIN_EMAIL` de la Task 2.
- Produit : `isAdminEmail(email: string | null | undefined): boolean`, consommée par le hook de la Task 5.

> C'est la seule règle métier du sub-project. Une régression ici ouvrirait l'espace admin à n'importe quel compte Google, d'où le test.

- [ ] **Step 1: Écrire le test qui échoue**

```typescript
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/env', () => ({ env: { ADMIN_EMAIL: 'admin@exemple.fr' } }))

const { isAdminEmail } = await import('./admin-whitelist')

describe('isAdminEmail', () => {
  it("autorise l'email exactement égal à ADMIN_EMAIL", () => {
    expect(isAdminEmail('admin@exemple.fr')).toBe(true)
  })

  it('refuse un email différent', () => {
    expect(isAdminEmail('intrus@exemple.fr')).toBe(false)
  })

  it('ignore la casse', () => {
    expect(isAdminEmail('Admin@Exemple.FR')).toBe(true)
  })

  it('ignore les espaces en début et fin', () => {
    expect(isAdminEmail('  admin@exemple.fr  ')).toBe(true)
  })

  it('refuse une valeur vide, nulle ou absente', () => {
    expect(isAdminEmail('')).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
    expect(isAdminEmail(undefined)).toBe(false)
  })
})
```

Les deux derniers cas ne sont pas décoratifs : une comparaison naïve entre deux chaînes vides renverrait `true` si `ADMIN_EMAIL` était mal chargée, ce qui autoriserait n'importe qui.

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `pnpm vitest run --project unit src/lib/admin-whitelist.test.ts`
Expected: FAIL, le module `./admin-whitelist` n'existe pas.

- [ ] **Step 3: Écrire l'implémentation**

```typescript
import { env } from '@/env'

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false

  const normalized = email.trim().toLowerCase()
  if (!normalized) return false

  return normalized === env.ADMIN_EMAIL.trim().toLowerCase()
}
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `pnpm vitest run --project unit src/lib/admin-whitelist.test.ts`
Expected: PASS, cinq cas verts.

---

### Task 5 : Configurer Better Auth et exposer les routes

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/lib/auth-client.ts`
- Create: `src/app/api/auth/[...all]/route.ts`

**Interfaces:**
- Consomme : `isAdminEmail` de la Task 4, les variables de la Task 2, les tables de la Task 3, le client Prisma de `src/lib/prisma.ts`.
- Produit : l'instance `auth` et le client `authClient`, consommés par le sub-project `05`.

- [ ] **Step 1: Écrire la configuration serveur**

```typescript
import 'server-only'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { nextCookies } from 'better-auth/next-js'

import { env } from '@/env'
import { isAdminEmail } from '@/lib/admin-whitelist'
import { prisma } from '@/lib/prisma'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (!isAdminEmail(user.email)) {
            throw new Error('Compte non autorisé')
          }
          return { data: user }
        },
      },
    },
  },
  plugins: [nextCookies()],
})
```

Trois points non négociables : aucune clé `emailAndPassword` n'est déclarée, `nextCookies()` est le dernier plugin, et le hook est un `before` — seul un `before` peut refuser la création, un `after` n'observe qu'un compte déjà créé. La documentation Better Auth décrit la forme des deux hooks sans garantir le comportement transactionnel du second : raison de plus pour ne pas lui confier la whitelist.

- [ ] **Step 2: Écrire le client navigateur**

```typescript
import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient()
```

- [ ] **Step 3: Exposer le route handler catch-all**

```typescript
import { toNextJsHandler } from 'better-auth/next-js'

import { auth } from '@/lib/auth'

export const { GET, POST } = toNextJsHandler(auth)
```

Ne pas ajouter d'`export const dynamic` : c'est incompatible avec `cacheComponents: true`, comme le rappelle `.claude/rules/nextjs/api-routes.md`.

- [ ] **Step 4: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 6 : Isoler les tests, vérifier le flux et documenter

**Files:**
- Modify: `src/lib/prisma-test-setup.ts`
- Modify: `docs/PRODUCTION.md`

**Interfaces:**
- Consomme : tout ce qui précède.
- Produit : un reset de test complet, et la preuve que la whitelist tient face à un vrai compte Google.

- [ ] **Step 1: Étendre le reset de test**

Remplacer le contenu de `resetDatabase()` par :

```typescript
await prisma.$executeRawUnsafe(
  'TRUNCATE TABLE "public"."Project", "public"."ClientMeta", "public"."Company", "public"."Tag", "public"."ProjectTag", "public"."DataProcessing", "public"."Publisher", "public"."LegalEntity", "public"."Address", "auth"."session", "auth"."account", "auth"."verification", "auth"."user" RESTART IDENTITY CASCADE',
)
```

Deux changements : les noms sont désormais **qualifiés par leur schema**, puisque des tables vivent hors de `public`, et les quatre tables d'authentification sont incluses. Sans cela, un utilisateur créé par un test resterait visible du suivant, et l'échec apparaîtrait dans un test sans rapport avec la cause.

- [ ] **Step 2: Vérifier que la suite d'intégration passe**

```bash
just db-test-reset
just test
```

Expected: tests unitaires et d'intégration verts.

- [ ] **Step 3: Vérifier le flux avec le compte autorisé**

Démarrer l'application, puis déclencher une connexion Google avec le compte correspondant à `ADMIN_EMAIL`.

```sql
SELECT id, email FROM auth."user";
SELECT id, "userId", "expiresAt" FROM auth."session";
```

Expected: une ligne dans chaque table.

- [ ] **Step 4: Vérifier le rejet d'un autre compte**

Se déconnecter, vider les cookies, puis mener le même flux avec un **autre** compte Google.

```sql
SELECT count(*) FROM auth."user";
```

Expected: toujours une seule ligne, celle du compte autorisé. C'est le critère central du sub-project : sans ce contrôle, la whitelist pourrait être inopérante sans que rien ne le signale.

- [ ] **Step 5: Vérifier qu'aucun secret n'a fui dans le bundle client**

```bash
pnpm build
grep -rl "$(grep '^GOOGLE_CLIENT_SECRET=' .env | cut -d= -f2-)" .next/static/ 2>/dev/null || echo "OK : secret absent du bundle client"
```

Expected: `OK : secret absent du bundle client`.

Aucune des cinq variables ne portant le préfixe `NEXT_PUBLIC_`, elles ne devraient pas être inlinées. Ce contrôle le confirme plutôt que de s'en remettre à la convention, une importation malencontreuse de `src/lib/auth.ts` depuis un Client Component pouvant l'entraîner.

- [ ] **Step 6: Mettre à jour `docs/PRODUCTION.md`**

Deux modifications. Le doc a été purgé de tout ce qui n'existait pas encore le 2026-09-03 : les cinq variables d'authentification en ont été **retirées**, ainsi que leurs entrées dans Gestion des Secrets et Rotation. C'est à ce sub-project de les réintroduire, une fois déployées.

- Ajouter `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` et `ADMIN_EMAIL` au bloc des Variables Secrets, une ligne par secret dans Gestion des Secrets (lecture via `env`, jamais `process.env`) et les procédures de rotation correspondantes. Mettre à jour la note « liste exhaustive » et sa date.
- Dans les anti-patterns de logging, la liste des secrets à ne jamais logger mentionne `SMTP_PASS`, `DATABASE_URL` et `IP_HASH_SALT`. Y ajouter `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_SECRET` et `ADMIN_EMAIL`, ce dernier étant une donnée personnelle et le seul élément permettant d'identifier la cible d'une tentative d'accès.

- [ ] **Step 7: Mettre à jour `docs/ARCHITECTURE.md`**

§ Authentification et § Sécurité Backend décrivent Better Auth au post-MVP : passer au présent. Ajouter les cinq variables à § Environnements et les quatre tables du schema `auth` à § Approche Modélisation.

- [ ] **Step 8: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): authentification Better Auth avec Google OAuth
```
