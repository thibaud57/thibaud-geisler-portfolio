# Données de la fiche entreprise enrichie : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Porter sur `Company` les champs CRM (types, statut de la relation, zones, notes), corriger secteurs et tailles et fermer le site public aux champs CRM.

**Architecture:** Nouveaux enums et colonnes dans le schema Prisma `freelance`, migration éditée à la main (renommage de valeur, rattrapage). Validation Zod dérivée des enums Prisma, avec la règle « champ absent du `FormData`, champ inchangé » pour que l'ancien formulaire du `08` ne remette rien à zéro. La lecture publique passe d'un `include` complet à un `select` des champs affichés.

**Tech Stack:** Prisma 7 (`prisma-client`, `@/generated/prisma/browser` et `/client`), PostgreSQL 18, Zod 4, Next.js 16 Server Actions, Vitest 4 (projects `unit` et `integration`), next-intl.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/02-entreprise-enrichie-donnees-design.md`

## Global Constraints

- **Valeurs d'enum exactes** : `CompanyType` = `CLIENT_FINAL`, `ESN_RECRUTEMENT`, `PARTENAIRE`, `MA_SOCIETE` ; `RelationStatus` = `ACTIVE`, `DORMANTE`, `ARCHIVEE` ; `Zone` = `GRAND_EST`, `PARIS`, `FRANCE`, `LUXEMBOURG`, `BELGIQUE`, `SUISSE`, `ALLEMAGNE`, `EUROPE`, `MONDE`, ordre canonique ; `CompanySector` = `EMARKETING` renommé `MARKETING_COMMUNICATION`, plus `INDUSTRIE`, `HEALTHTECH`, `SECTEUR_PUBLIC` avant `AUTRE`. Tous `@@schema("freelance")`.
- **Zones triées** : `sortZones(zones)` (`src/lib/zones.ts`) trie toute liste de zones dans l'ordre canonique, utilisée par `companySchema` avant écriture et par les sub-projects `03` et `04` à l'affichage.
- **Aucun outil de saisie des temps** : champ reporté au suivi de mission.
- **Champ absent, champ inchangé** : un nouveau champ n'est lu que si le `FormData` porte sa clé.
- **Messages d'erreur exacts** : « Sélectionne au moins un type », « Les notes tiennent sur une ligne (200 caractères au plus) ».
- **Propriétés dérivées hors scope** : travaillée (`04`), prospect (`08`), premier contact (`10`) et clients finaux (`15`) ne sont ni des colonnes ni des champs de formulaire à ce stade.
- **Site public** : l'entreprise d'un projet publié ne porte que `id`, `slug`, `name`, `logoFilename`, `websiteUrl`, `sectors`, `size`.
- **Invalidation inchangée** : `updateTag("projects")` et `revalidatePath("/admin/entreprises")`.
- **Noms de tests en anglais**, AAA séparé par des lignes vides, sans commentaire `// Arrange`.
- **Commentaires** : seulement le pourquoi non évident, aucun commentaire qui paraphrase.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/typescript/conventions.md`, `.claude/rules/vitest/setup.md`, `.claude/rules/nextjs/tests.md`, `.claude/rules/next-intl/translations.md`.

## Review Focus

- **Ordre des valeurs de `CompanySector`** : un `ADD VALUE` sans `BEFORE 'AUTRE'` met les nouveaux secteurs après « Autre » en base, et `prisma migrate dev` y voit une dérive. Vérifié à la Task 1, Step 5.
- **Migration générée par Prisma pour le renommage** : Prisma recrée le type et convertit les colonnes, ce qui fait échouer la conversion de la ligne qui porte `EMARKETING`. Le bloc est remplacé à la Task 1, Step 3.
- **Ancien formulaire entreprise entre le 02 et le 03** : il n'envoie pas `types`. Une modification qui le remettrait à vide effacerait le rattrapage. Couvert par le test « leaves every CRM field untouched when the form does not send it » (Task 3).
- **Clés de traduction manquantes** : `CaseStudyHeader` traduit `sector.${s}` et `companySize.${size}` ; une valeur d'enum sans clé dans `messages/*.json` casse la page. `just typecheck` le détecte (Task 2, Step 5).
- **Fixtures typées sur l'entreprise publique** : un champ en trop dans une fabrique de test fait échouer le typage après le passage en `select`. Traité à la Task 4, Step 5.

---

### Task 1 : Schéma Prisma et migration

**Files:**
- Modify: `prisma/schema.prisma` (enums près de `CompanySector`, lignes 65-88 ; modèle `Company`, lignes 179-196)
- Create: `prisma/migrations/<horodatage>_company_crm_fields/migration.sql`

**Interfaces:**
- Consumes: rien
- Produces: enums Prisma `CompanyType`, `RelationStatus`, `Zone`, `CompanySector` (mis à jour) exportés par `@/generated/prisma/browser` et `@/generated/prisma/client` ; champs `Company.types`, `relationStatus`, `zones`, `notes`

- [ ] **Step 1 : Modifier les enums**

Dans `prisma/schema.prisma`, remplacer l'enum `CompanySector` par :

```prisma
enum CompanySector {
  ASSURANCE
  FINTECH
  SAAS
  SERVICES_RH
  ESN_CONSEIL
  LOGICIELS_ENTREPRISE
  ECOMMERCE
  IA_AUTOMATISATION
  MARKETING_COMMUNICATION
  BANQUE
  INDUSTRIE
  HEALTHTECH
  SECTEUR_PUBLIC
  AUTRE

  @@schema("freelance")
}

// Ce qu'est l'entreprise sur le marché. Pas d'état de relation ici : prospect et travaillée se déduisent.
// CLIENT_FINAL = donneur d'ordre qui achète en direct, par opposition à l'ESN qui place.
enum CompanyType {
  CLIENT_FINAL
  ESN_RECRUTEMENT
  PARTENAIRE
  MA_SOCIETE

  @@schema("freelance")
}

enum RelationStatus {
  ACTIVE
  DORMANTE
  ARCHIVEE

  @@schema("freelance")
}

// Segmentation commerciale, pas une géographie : sur quel marché on travaille avec l'entreprise,
// la personne ou l'opportunité. Le siège légal reste dans Address.country, en code ISO.
// Plat, volontairement : la valeur la plus précise s'applique, FRANCE couvre le reste du territoire,
// un filtre cherche la valeur exacte, jamais « contenu dans ».
enum Zone {
  GRAND_EST
  PARIS
  FRANCE
  LUXEMBOURG
  BELGIQUE
  SUISSE
  ALLEMAGNE
  EUROPE
  MONDE

  @@schema("freelance")
}
```

- [ ] **Step 2 : Ajouter les champs de `Company`**

Dans le modèle `Company`, après `size CompanySize?`, ajouter :

```prisma
  types          CompanyType[]  @default([])
  relationStatus RelationStatus @default(ACTIVE)
  zones          Zone[]         @default([])
  notes          String?
  details        String?
```

- [ ] **Step 3 : Générer puis corriger la migration**

Base de dev démarrée (`just db`), lancer :

Run: `pnpm prisma migrate dev --create-only --name company_crm_fields`
Expected: un dossier `prisma/migrations/<horodatage>_company_crm_fields/` créé, non appliqué. Si Prisma refuse de s'exécuter hors terminal interactif à cause de l'avertissement sur `EMARKETING`, créer le dossier à la main avec l'horodatage courant au format `AAAAMMJJHHMMSS` et écrire le fichier complet ci-dessous.

Remplacer tout le bloc que Prisma a écrit pour `CompanySector` (création d'un type `CompanySector_new`, conversion des colonnes, suppression et renommage) par :

```sql
-- EMARKETING est renommé, pas recréé : la ligne qui le porte le garde sous son nouveau nom.
ALTER TYPE "freelance"."CompanySector" RENAME VALUE 'EMARKETING' TO 'MARKETING_COMMUNICATION';
ALTER TYPE "freelance"."CompanySector" ADD VALUE 'INDUSTRIE' BEFORE 'AUTRE';
ALTER TYPE "freelance"."CompanySector" ADD VALUE 'HEALTHTECH' BEFORE 'AUTRE';
ALTER TYPE "freelance"."CompanySector" ADD VALUE 'SECTEUR_PUBLIC' BEFORE 'AUTRE';
```

Garder les instructions que Prisma a générées pour les trois nouveaux types, les colonnes et la clé étrangère. Elles doivent avoir cette forme (à écrire telles quelles si le fichier est créé à la main) :

```sql
CREATE TYPE "freelance"."CompanyType" AS ENUM ('CLIENT_FINAL', 'ESN_RECRUTEMENT', 'PARTENAIRE', 'MA_SOCIETE');

CREATE TYPE "freelance"."RelationStatus" AS ENUM ('ACTIVE', 'DORMANTE', 'ARCHIVEE');

CREATE TYPE "freelance"."Zone" AS ENUM ('GRAND_EST', 'PARIS', 'FRANCE', 'LUXEMBOURG', 'BELGIQUE', 'SUISSE', 'ALLEMAGNE', 'EUROPE', 'MONDE');

ALTER TABLE "freelance"."Company" ADD COLUMN     "details" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "relationStatus" "freelance"."RelationStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "types" "freelance"."CompanyType"[] DEFAULT ARRAY[]::"freelance"."CompanyType"[],
ADD COLUMN     "zones" "freelance"."Zone"[] DEFAULT ARRAY[]::"freelance"."Zone"[];
```

Ajouter à la fin du fichier :

```sql
-- Rattrapage : les entreprises déjà citées par un projet client entrent typées Client final.
UPDATE "freelance"."Company" AS c
SET "types" = ARRAY['CLIENT_FINAL']::"freelance"."CompanyType"[]
WHERE EXISTS (
  SELECT 1
  FROM "public"."ClientMeta" AS cm
  JOIN "public"."Project" AS p ON p."id" = cm."projectId"
  WHERE cm."companyId" = c."id" AND p."type" = 'CLIENT'
);

UPDATE "freelance"."Company"
SET "types" = ARRAY['MA_SOCIETE']::"freelance"."CompanyType"[]
WHERE "slug" = 'thibaud-geisler';
```

- [ ] **Step 4 : Appliquer et générer le client**

Run: `pnpm prisma migrate dev`
Expected: la migration `company_crm_fields` est appliquée, aucune nouvelle migration n'est proposée (pas de dérive entre le schéma et les migrations).

Run: `pnpm prisma generate`
Expected: client généré dans `src/generated/prisma`.

- [ ] **Step 5 : Vérifier le rattrapage sur la base de dev**

Run:
```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d portfolio_dev -c "SELECT slug, types, \"relationStatus\", sectors FROM freelance.\"Company\" ORDER BY slug;"'
```
Expected : les entreprises liées à un projet client ont `{CLIENT_FINAL}` ; `thibaud-geisler` a `{MA_SOCIETE}` ; aucun secteur `EMARKETING`, l'ancienne valeur apparaît en `MARKETING_COMMUNICATION` ; `relationStatus` vaut `ACTIVE` partout.

Run:
```bash
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d portfolio_dev -c "SELECT unnest(enum_range(NULL::freelance.\"CompanySector\"));"'
```
Expected : `AUTRE` en dernière position, précédé de `INDUSTRIE`, `HEALTHTECH`, `SECTEUR_PUBLIC`.

- [ ] **Step 6 : Appliquer sur la base de test**

Run: `just db-test`
Expected: migrations appliquées sur la base de test, sans erreur.

---

### Task 2 : Libellés et traductions

**Files:**
- Modify: `src/lib/companies.ts`
- Create: `src/lib/zones.ts`
- Modify: `messages/fr.json` (`Projects.caseStudy.sector`, `Projects.caseStudy.companySize`, lignes 122-140)
- Modify: `messages/en.json` (mêmes clés, lignes 122-140)

**Interfaces:**
- Consumes: enums de la Task 1
- Produces: `COMPANY_SECTOR_LABELS: Record<CompanySector, string>`, `COMPANY_SIZE_LABELS: Record<CompanySize, string>`, `COMPANY_SIZE_HEADCOUNTS: Record<CompanySize, string>`, `COMPANY_TYPE_LABELS: Record<CompanyType, string>`, `COMPANY_TYPE_ICONS: Record<CompanyType, IconComponent | null>`, `RELATION_STATUS_LABELS: Record<RelationStatus, string>`, `COMPANY_STATUS_ICONS: Record<RelationStatus, IconComponent | null>`, `COMPANY_FIELD_LABELS` étendu, `ZONES: Zone[]` (ordre canonique), `ZONE_LABELS: Record<Zone, string>`, `sortZones(zones: Zone[]): Zone[]`

- [ ] **Step 1 : Réécrire `src/lib/companies.ts`**

```ts
import { Archive, Building2, CircleCheck, Handshake, House, Moon, Network } from "lucide-react"

import type {
  CompanySector,
  CompanySize,
  CompanyType,
  RelationStatus,
} from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"

export const COMPANY_SECTOR_LABELS: Record<CompanySector, string> = {
  ASSURANCE: "Assurance",
  FINTECH: "Fintech",
  SAAS: "SaaS",
  SERVICES_RH: "Services RH",
  ESN_CONSEIL: "ESN / Conseil",
  LOGICIELS_ENTREPRISE: "Logiciels d'entreprise",
  ECOMMERCE: "E-commerce",
  IA_AUTOMATISATION: "IA / Automatisation",
  MARKETING_COMMUNICATION: "Marketing / Communication",
  BANQUE: "Banque",
  INDUSTRIE: "Industrie",
  HEALTHTECH: "Healthtech",
  SECTEUR_PUBLIC: "Secteur public",
  AUTRE: "Autre",
}

// Catégories légales (INSEE, décret n° 2008-1354) : le nom court tient dans un badge, l'effectif passe en tooltip.
export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  TPE: "TPE",
  PME: "PME",
  ETI: "ETI",
  GROUPE: "Grande entreprise",
}

export const COMPANY_SIZE_HEADCOUNTS: Record<CompanySize, string> = {
  TPE: "Moins de 10 salariés",
  PME: "10 à 249 salariés",
  ETI: "250 à 4 999 salariés",
  GROUPE: "5 000 salariés et plus",
}

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  CLIENT_FINAL: "Client final",
  ESN_RECRUTEMENT: "ESN / Recrutement",
  PARTENAIRE: "Partenaire",
  MA_SOCIETE: "Ma société",
}

export const COMPANY_TYPE_ICONS: Record<CompanyType, IconComponent | null> = {
  CLIENT_FINAL: Building2,
  ESN_RECRUTEMENT: Network,
  PARTENAIRE: Handshake,
  MA_SOCIETE: House,
}

export const RELATION_STATUS_LABELS: Record<RelationStatus, string> = {
  ACTIVE: "Active",
  DORMANTE: "Dormante",
  ARCHIVEE: "Archivée",
}

export const COMPANY_STATUS_ICONS: Record<RelationStatus, IconComponent | null> = {
  ACTIVE: CircleCheck,
  DORMANTE: Moon,
  ARCHIVEE: Archive,
}

// Partagés par les cards du formulaire entreprise et les blocs de sa vue détail (DESIGN.md § Arbitrages).
export const COMPANY_SECTION_TITLES = {
  identity: "Identité",
  classification: "Classification",
  legalEntity: "Entité légale",
  logo: "Logo",
} as const

export const COMPANY_FIELD_LABELS = {
  slug: "Slug",
  name: "Nom",
  websiteUrl: "Site web",
  sectors: "Secteurs",
  size: "Taille",
  legalEntityId: "Entité légale",
  types: "Types",
  relationStatus: "Statut de la relation",
  zones: "Zones",
  notes: "Notes",
  details: "Détails",
} as const
```

- [ ] **Step 2 : Créer `src/lib/zones.ts`**

```ts
import { Zone } from "@/generated/prisma/browser"

// Déclaration de l'enum Zone dans l'ordre canonique : ZONES le reprend tel quel.
export const ZONES = Object.values(Zone)

export const ZONE_LABELS: Record<Zone, string> = {
  GRAND_EST: "Grand Est",
  PARIS: "Paris",
  FRANCE: "France",
  LUXEMBOURG: "Luxembourg",
  BELGIQUE: "Belgique",
  SUISSE: "Suisse",
  ALLEMAGNE: "Allemagne",
  EUROPE: "Europe",
  MONDE: "Monde",
}

export function sortZones(zones: Zone[]): Zone[] {
  return [...zones].sort((a, b) => ZONES.indexOf(a) - ZONES.indexOf(b))
}
```

- [ ] **Step 3 : Écrire le test de `sortZones`**

Créer `src/lib/zones.test.ts` :

```ts
import { describe, expect, it } from "vitest"

import { sortZones } from "@/lib/zones"

describe("sortZones", () => {
  it("sorts zones into the canonical order regardless of submission order", () => {
    const sorted = sortZones(["MONDE", "LUXEMBOURG", "PARIS", "GRAND_EST"])

    expect(sorted).toEqual(["GRAND_EST", "PARIS", "LUXEMBOURG", "MONDE"])
  })
})
```

Run: `pnpm vitest run --project unit src/lib/zones.test.ts`
Expected: PASS.

- [ ] **Step 4 : Traductions françaises**

Dans `messages/fr.json`, remplacer les blocs `Projects.caseStudy.sector` et `Projects.caseStudy.companySize` par :

```json
      "sector": {
        "ASSURANCE": "Assurance",
        "FINTECH": "Fintech",
        "SAAS": "SaaS",
        "SERVICES_RH": "Services RH",
        "ESN_CONSEIL": "ESN / Conseil",
        "LOGICIELS_ENTREPRISE": "Logiciels d'entreprise",
        "ECOMMERCE": "E-commerce",
        "IA_AUTOMATISATION": "IA / Automatisation",
        "MARKETING_COMMUNICATION": "Marketing / Communication",
        "BANQUE": "Banque",
        "INDUSTRIE": "Industrie",
        "HEALTHTECH": "Healthtech",
        "SECTEUR_PUBLIC": "Secteur public",
        "AUTRE": "Autre"
      },
      "companySize": {
        "TPE": "TPE (moins de 10 salariés)",
        "PME": "PME (10 à 249 salariés)",
        "ETI": "ETI (250 à 4 999 salariés)",
        "GROUPE": "Grande entreprise (5 000 salariés et plus)"
      },
```

- [ ] **Step 5 : Traductions anglaises**

Dans `messages/en.json`, mêmes blocs :

```json
      "sector": {
        "ASSURANCE": "Insurance",
        "FINTECH": "Fintech",
        "SAAS": "SaaS",
        "SERVICES_RH": "HR Services",
        "ESN_CONSEIL": "Consulting",
        "LOGICIELS_ENTREPRISE": "Enterprise Software",
        "ECOMMERCE": "E-commerce",
        "IA_AUTOMATISATION": "AI / Automation",
        "MARKETING_COMMUNICATION": "Marketing / Communications",
        "BANQUE": "Banking",
        "INDUSTRIE": "Industry",
        "HEALTHTECH": "Healthtech",
        "SECTEUR_PUBLIC": "Public sector",
        "AUTRE": "Other"
      },
      "companySize": {
        "TPE": "Micro-enterprise (fewer than 10 employees)",
        "PME": "SME (10 to 249 employees)",
        "ETI": "Mid-sized company (250 to 4,999 employees)",
        "GROUPE": "Large enterprise (5,000+ employees)"
      },
```

- [ ] **Step 6 : Vérifier le typage**

Run: `just typecheck`
Expected: les seules erreurs restantes, s'il y en a, portent sur `src/lib/schemas/company.ts` (encore sur `EMARKETING`), corrigé à la Task 3. Aucune erreur sur les clés de traduction.

---

### Task 3 : Validation et Server Actions

**Files:**
- Modify: `src/lib/server-utils.ts` (après `stringValues`, ligne 20)
- Modify: `src/lib/schemas/company.ts`
- Modify: `src/server/actions/companies.types.ts`
- Modify: `src/server/actions/companies.ts`
- Test: `src/server/actions/companies.test.ts`

**Interfaces:**
- Consumes: enums de la Task 1, `sortZones` de la Task 2, `NONE_VALUE` et `nullifyNoneValue` existants
- Produces: `optionalStringField(formData, key): string | undefined`, `optionalStringValues(formData, key): string[] | undefined` dans `@/lib/server-utils` (réutilisés par leads et contacts) ; `companySchema` étendu, `CompanyInput` ; `COMPANY_SECTORS`, `COMPANY_SIZES`, `COMPANY_TYPES`, `RELATION_STATUSES` dérivés des enums

- [ ] **Step 1 : Écrire les tests qui échouent**

Dans `src/server/actions/companies.test.ts`, remplacer l'helper `buildFormData` par :

```ts
function buildFormData(
  overrides: Record<string, string> = {},
  sectors: string[] = ["SAAS"],
  lists: Record<string, string[]> = {},
): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  for (const sector of sectors) data.append("sectors", sector)
  for (const [key, values] of Object.entries(lists)) {
    for (const value of values) data.append(key, value)
  }
  return data
}

const CRM_FIELDS = ["types", "zones", "relationStatus", "notes", "details"] as const
```

Remplacer le test `it("rejects an empty sectors list", ...)` par :

```ts
  it("accepts an empty sectors list", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    const state = await createCompany(initialCompanyFormState, buildFormData({}, []))

    expect(state.ok).toBe(true)
    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ sectors: [] }) }),
    )
  })
```

Ajouter dans `describe("createCompany")` :

```ts
  it("rejects a submitted but empty types list", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({}, ["SAAS"], { types: [""] }),
    )

    expect(state.errors.types).toEqual(["Sélectionne au moins un type"])
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("rejects an unknown type", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({}, ["SAAS"], { types: ["FOURNISSEUR"] }),
    )

    expect(state.errors.types).toBeDefined()
  })

  it("stores the submitted types, zones, relation status, notes and details, with zones sorted into canonical order", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData(
        {
          relationStatus: "DORMANTE",
          notes: "  Rencontrée au salon  ",
          details: "# 🏢 À propos\n\nLeader assurance Luxembourg.",
        },
        ["SAAS"],
        { types: ["CLIENT_FINAL", "PARTENAIRE"], zones: ["LUXEMBOURG", "PARIS"] },
      ),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          types: ["CLIENT_FINAL", "PARTENAIRE"],
          zones: ["PARIS", "LUXEMBOURG"],
          relationStatus: "DORMANTE",
          notes: "Rencontrée au salon",
          details: "# 🏢 À propos\n\nLeader assurance Luxembourg.",
        }),
      }),
    )
  })

  it("rejects notes longer than 200 characters", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData({ notes: "a".repeat(201) }, ["SAAS"], { types: ["CLIENT_FINAL"] }),
    )

    expect(state.errors.notes).toEqual(["Les notes tiennent sur une ligne (200 caractères au plus)"])
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("leaves the relation status to the database default when the field is absent", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData())

    const data = vi.mocked(prisma.company.create).mock.calls[0]?.[0]?.data as Record<string, unknown>
    expect(data.relationStatus).toBeUndefined()
  })

  it("stores empty notes and details as null", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData({ notes: "   ", details: "   " }, ["SAAS"], { types: ["CLIENT_FINAL"] }),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ notes: null, details: null }) }),
    )
  })
```

Ajouter dans `describe("updateCompany")` :

```ts
  it("leaves every CRM field untouched when the form does not send it", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany("c1", initialCompanyFormState, buildFormData())

    const data = vi.mocked(prisma.company.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    for (const field of CRM_FIELDS) expect(data[field]).toBeUndefined()
  })
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: FAIL sur les nouveaux cas (champs ignorés) et sur « accepts an empty sectors list ».

- [ ] **Step 3 : Ajouter les lecteurs de champs facultatifs**

Dans `src/lib/server-utils.ts`, après `stringValues` :

```ts
// Absent, la valeur reste `undefined` (Prisma l'ignore) ; une liste vidée envoie une valeur vide, écartée ici, pour se distinguer d'une liste absente.
export function optionalStringField(formData: FormData, key: string): string | undefined {
  return formData.has(key) ? stringField(formData, key) : undefined
}

export function optionalStringValues(formData: FormData, key: string): string[] | undefined {
  return formData.has(key) ? stringValues(formData, key).filter((value) => value !== "") : undefined
}
```

- [ ] **Step 4 : Réécrire le schéma**

Remplacer le contenu de `src/lib/schemas/company.ts` par :

```ts
import { z } from "zod"

import {
  CompanySector,
  CompanySize,
  CompanyType,
  RelationStatus,
  Zone,
} from "@/generated/prisma/browser"
import { isCompanyLogoKey } from "@/lib/asset-keys"
import { nullifyNoneValue } from "@/lib/schemas/none-value"
import { SLUG_PATTERN } from "@/lib/schemas/slug"
import { sortZones } from "@/lib/zones"

export const COMPANY_SECTORS = Object.values(CompanySector)
export const COMPANY_SIZES = Object.values(CompanySize)
export const COMPANY_TYPES = Object.values(CompanyType)
export const RELATION_STATUSES = Object.values(RelationStatus)

const WEBSITE_URL_SCHEMA = z.url({ protocol: /^https?$/ })

export const NONE_VALUE = "aucune"

export const companySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Le slug est requis")
    .max(60, "Le slug ne peut pas dépasser 60 caractères")
    .regex(SLUG_PATTERN, "Le slug ne peut contenir que des minuscules, des chiffres et des tirets"),
  name: z
    .string()
    .trim()
    .min(1, "Le nom est requis")
    .max(120, "Le nom ne peut pas dépasser 120 caractères"),
  sectors: z.array(z.enum(CompanySector, { error: "Secteur inconnu" })),
  size: z
    .union([z.enum(CompanySize), z.literal(NONE_VALUE), z.literal("")], {
      error: "Taille inconnue",
    })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  websiteUrl: z
    // Zod 4 remonte le message de z.url() plutôt que l'`error` du z.union parent : un refine sur z.string() garde un seul message.
    .string()
    .trim()
    .refine((value) => value === "" || WEBSITE_URL_SCHEMA.safeParse(value).success, {
      error: "L'adresse du site n'est pas valide",
    })
    .transform((value) => (value === "" ? null : value)),
  legalEntityId: z
    .string()
    .trim()
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  logoFilename: z
    .string()
    .trim()
    .refine((value) => value === "" || isCompanyLogoKey(value), {
      error: "Le logo doit être choisi dans l'espace Assets",
    })
    .transform((value) => (value === "" ? null : value)),
  types: z
    .array(z.enum(CompanyType, { error: "Type inconnu" }))
    .min(1, "Sélectionne au moins un type")
    .optional(),
  relationStatus: z.enum(RelationStatus, { error: "Statut de relation inconnu" }).optional(),
  zones: z
    .array(z.enum(Zone, { error: "Zone inconnue" }))
    .transform((value) => sortZones(value))
    .optional(),
  notes: z
    .string()
    .trim()
    .max(200, "Les notes tiennent sur une ligne (200 caractères au plus)")
    .transform((value) => (value === "" ? null : value))
    .optional(),
  details: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .optional(),
})

export type CompanyInput = z.infer<typeof companySchema>
```

- [ ] **Step 5 : Mettre à jour les actions**

Dans `src/server/actions/companies.ts`, remplacer l'import de `@/lib/server-utils` par :

```ts
import {
  isPrismaError,
  optionalStringField,
  optionalStringValues,
  stringField,
  stringValues,
  violatedConstraint,
} from "@/lib/server-utils"
```

Remplacer `collectValues` par :

```ts
// Seule source des champs lus depuis le FormData : désynchronisé du schéma de validation, un échec réafficherait les mauvaises valeurs.
function collectValues(formData: FormData): CompanyFormState["values"] {
  return {
    slug: stringField(formData, "slug"),
    name: stringField(formData, "name"),
    sectors: stringValues(formData, "sectors"),
    size: stringField(formData, "size"),
    websiteUrl: stringField(formData, "websiteUrl"),
    legalEntityId: stringField(formData, "legalEntityId"),
    logoFilename: stringField(formData, "logoFilename"),
    types: optionalStringValues(formData, "types"),
    relationStatus: optionalStringField(formData, "relationStatus"),
    zones: optionalStringValues(formData, "zones"),
    notes: optionalStringField(formData, "notes"),
    details: optionalStringField(formData, "details"),
  }
}
```

`violatedConstraint` reste importé pour `mapUniqueViolation`, inchangé.

- [ ] **Step 6 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: PASS, les anciens cas compris.

- [ ] **Step 7 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur dans `src/lib/`, `src/server/actions/`, ni dans les composants admin qui importent `COMPANY_SECTORS`, `COMPANY_SIZES`, `COMPANY_SECTOR_LABELS` ou `COMPANY_SIZE_LABELS` (`CompanyForm.tsx`, `CompaniesTable.tsx`). Les erreurs restantes éventuelles viennent des fixtures traitées à la Task 4.

---

### Task 4 : Lecture publique

**Files:**
- Modify: `src/types/project.ts`
- Test: `src/server/queries/projects.integration.test.ts`
- Modify: `src/components/features/projects/ProjectsList.test.tsx` (fabrique `createCompany`, lignes 30-47)

**Interfaces:**
- Consumes: champs `Company` de la Task 1
- Produces: `PUBLIC_COMPANY_SELECT` exporté de `@/types/project` ; `ProjectWithRelations["clientMeta"]["company"]` réduit aux sept champs publics

- [ ] **Step 1 : Écrire le test d'intégration qui échoue**

Dans `src/server/queries/projects.integration.test.ts`, ajouter un bloc à la fin du fichier :

```ts
describe("findPublishedBySlug company payload", () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it("does not expose the CRM fields of a published project's company", async () => {
    await prisma.company.create({
      data: {
        slug: "acme",
        name: "Acme",
        sectors: ["SAAS"],
        types: ["CLIENT_FINAL"],
        relationStatus: "DORMANTE",
        zones: ["LUXEMBOURG"],
        notes: "Note interne",
        details: "# 🏢 À propos\n\nDétails internes.",
      },
    })
    await prisma.project.create({
      data: {
        slug: "mission",
        titleFr: "Mission",
        titleEn: "Mission",
        descriptionFr: "d",
        descriptionEn: "d",
        type: "CLIENT",
        status: "PUBLISHED",
        clientMeta: {
          create: { workMode: "REMOTE", company: { connect: { slug: "acme" } } },
        },
      },
    })

    const project = await findPublishedBySlug("mission", "fr")

    expect(Object.keys(project?.clientMeta?.company ?? {}).sort()).toEqual([
      "id",
      "logoFilename",
      "name",
      "sectors",
      "size",
      "slug",
      "websiteUrl",
    ])
  })
})
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `just db-test && pnpm vitest run --project integration src/server/queries/projects.integration.test.ts`
Expected: FAIL, la liste des clés contient aussi `notes`, `types`, `relationStatus`, `zones`, `legalEntityId`, `createdAt`, `updatedAt`.

- [ ] **Step 3 : Restreindre la lecture publique**

Remplacer le contenu de `src/types/project.ts` par :

```ts
import type { Prisma } from "@/generated/prisma/client"
import type { LocalizedProject, LocalizedTag } from "@/i18n/localize-content"

// Champs publics uniquement : les données CRM de l'entreprise (notes, types, statut) ne doivent jamais partir dans une page publique.
export const PUBLIC_COMPANY_SELECT = {
  id: true,
  slug: true,
  name: true,
  logoFilename: true,
  websiteUrl: true,
  sectors: true,
  size: true,
} as const satisfies Prisma.CompanySelect

export const PROJECT_INCLUDE = {
  tags: {
    include: { tag: true },
    orderBy: { displayOrder: "asc" },
  },
  clientMeta: {
    include: { company: { select: PUBLIC_COMPANY_SELECT } },
  },
} as const satisfies Prisma.ProjectInclude

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_INCLUDE
}>

type ProjectTagRaw = ProjectWithRelations["tags"][number]
type TagRaw = ProjectTagRaw["tag"]

export type LocalizedProjectWithRelations = LocalizedProject<TagRaw, ProjectWithRelations>
export type LocalizedProjectTag = LocalizedProjectWithRelations["tags"][number]
export type LocalizedTagRecord = LocalizedTag<TagRaw>
```

- [ ] **Step 4 : Lancer le test**

Run: `pnpm vitest run --project integration src/server/queries/projects.integration.test.ts`
Expected: PASS, les autres cas du fichier compris (`company.name` et `company.size` restent lus).

- [ ] **Step 5 : Aligner la fabrique de test des composants**

Dans `src/components/features/projects/ProjectsList.test.tsx`, remplacer `createCompany` par :

```ts
function createCompany(overrides?: Partial<Company>): Company {
  return {
    id: "company-id",
    slug: "personnel",
    name: "Personnel",
    websiteUrl: null,
    sectors: [],
    size: null,
    logoFilename: null,
    ...overrides,
  }
}
```

- [ ] **Step 6 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur. Si une autre fabrique de test ou un composant construit une entreprise publique avec `legalEntityId`, `createdAt` ou `updatedAt`, retirer ces champs de la même façon.

---

### Task 5 : Vérification d'ensemble

**Files:**
- Vérifie : `docs/BRAINSTORM.md` (puce « Outils de saisie des temps » déjà ajoutée à l'écriture du spec, dans la liste « Reportés » de la Feature 2)

**Interfaces:**
- Consumes: Tasks 1 à 4
- Produces: rien

- [ ] **Step 1 : Qualité**

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just typecheck`
Expected: aucune erreur.

Run: `just test`
Expected: suites `unit` et `integration` vertes.

- [ ] **Step 2 : BRAINSTORM**

Vérifier que `docs/BRAINSTORM.md`, Feature 2, liste « Reportés », contient la puce « Outils de saisie des temps ». L'ajouter avec ce texte si elle manque :

```markdown
* **Outils de saisie des temps** imposés par un client pour le CRA, avec le suivi de mission (écran `isMissions`) : champ de la card Relation de `isCompanyForm`. Une liste fixe ne couvre pas les logiciels internes des entreprises, la forme se décide quand le CRA en aura besoin
```

- [ ] **Step 3 : Rendu public**

Run: `just dev`, puis ouvrir l'étude de cas publiée d'une entreprise qui a une taille, en `/fr/projets/<slug>` puis `/en/projets/<slug>`.
Expected: la taille s'affiche avec le nouveau libellé (« PME (10 à 249 salariés) », « SME (10 to 249 employees) »…), le secteur renommé s'affiche « Marketing / Communication » s'il est porté. Puis `just stop`.
