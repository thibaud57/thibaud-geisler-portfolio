# Entité légale saisie depuis la fiche entreprise : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saisir et modifier l'entité légale d'une entreprise directement dans sa fiche, avec le seul nom obligatoire, et la montrer en entier dans la vue détail.

**Architecture:** `LegalEntity` rend sa forme juridique et son siège facultatifs et gagne `rcsNumber`. Les champs de l'entité, préfixés `legalEntity`, rejoignent le schéma Zod de l'entreprise ; l'action écrit l'entité dans la même requête que l'entreprise (création ou `upsert` imbriqués) et la supprime avec elle dans une transaction, sauf si elle sert aux pages légales. Une nouvelle card `LegalEntityCard` remplace l'ancien choix d'entité. Pour l'entité éditrice seulement, la même écriture pose la date d'assujettissement et le régime de TVA sur le `Publisher` lié, lus par les mentions légales et le JSON-LD de la page À propos.

**Tech Stack:** Prisma 7 (écritures imbriquées, `$transaction` interactive), Zod 4, Next.js 16 Server Actions, Vitest 4, shadcn/ui (Command, Select, Separator), next-intl pour les pages légales.

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/05-entite-legale-depuis-fiche-design.md`

## Global Constraints

- **Prérequis** : plans `02`, `03` et `04` implémentés (`companySchema`, `optionalStringField`, `CompaniesTable` avec vue détail par blocs, `AdminCompanyDetail`).
- **`LegalForm`, enum à 13 valeurs exactes**, dans cet ordre de groupes : France `ENTREPRENEUR_INDIVIDUEL`, `EURL`, `SARL`, `SAS`, `SASU`, `SA`, `SNC`, `SCI`, `ASSOCIATION` ; Luxembourg `SARL_LU`, `SARL_S_LU`, `SA_LU` ; États-Unis `INCORPORATED_US` (portée par un sous-traitant américain des pages légales). Aucun autre pays ; un pays de plus vaut une nouvelle migration.
- **Pays du siège** `FR`, `LU`, `BE`, `CH`, `DE`, `NL`, `GB`, `US` ; **devises** `EUR`, `CHF`, `USD`, `GBP` (défaut `EUR`).
- **Card toujours affichée, aucun bouton ni bascule** : vide, rien n'est enregistré ; dès qu'un champ a une valeur, la raison sociale et les quatre champs du siège deviennent tous requis (le modèle les exige ensemble). SIRET 14 chiffres (espaces retirés) ; TVA deux lettres puis 8 à 12 lettres ou chiffres ; capital entier positif ou nul ; numéro RCS ignoré pour un siège en France.
- **Champs du `FormData`** : `legalEntityName`, `legalEntityStatusKey`, `legalEntitySiret`, `legalEntityVatNumber`, `legalEntityRcsCity`, `legalEntityRcsNumber`, `legalEntityPhone`, `legalEntityCapitalAmount`, `legalEntityCapitalCurrency`, `legalEntityStreet`, `legalEntityPostalCode`, `legalEntityCity`, `legalEntityCountry`, `legalEntityVatLiableSince`, `legalEntityVatRegime`.
- **TVA de l'éditeur** (décision 17 du propriétaire, 2026-09-30) : `legalEntityVatLiableSince` et `legalEntityVatRegime` sont facultatifs, pris en compte seulement pour l'entité éditrice, renseignés ensemble ou pas du tout, et exigent `legalEntityVatNumber` une fois renseignés. `updateCompany` les écrit sur le `Publisher` lié à l'entité seulement quand ce lien existe déjà, jamais de `Publisher` créé depuis ce formulaire.
- **Cache** : toute écriture ou suppression d'entreprise invalide `projects` et `legal-entity`.
- **`Legal.legalStatus` réindexé par valeur d'enum** : `entrepreneurIndividuel` devient `ENTREPRENEUR_INDIVIDUEL`, `sarl` devient `SARL`, `incorporated` devient `INCORPORATED_US`, mêmes libellés FR et EN.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/next-intl/translations.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`.

## Review Focus

- **Champs repliés non envoyés** : si le bloc « Autres informations » était retiré du DOM une fois replié, l'action lirait ces champs comme vides et effacerait capital, RCS et téléphone. Le bloc reste dans le DOM, masqué par l'attribut `hidden`. Vérifié à la Task 6, Step 3.
- **Siège vidé** : avec l'ancienne cascade, supprimer l'adresse supprimait l'entité, et avec elle, par leurs propres cascades, l'éditeur et ses traitements. La relation passe en `SetNull` (Task 1). Avec la raison sociale et le siège complet désormais requis ensemble dès qu'un champ est rempli, vider le siège d'une entité existante sans vider aussi le reste n'est plus un cas atteignable depuis le formulaire : la branche `currentAddressId ? { delete: true } : undefined` de `toUpdateData` reste en défense, mais aucun test ne la couvre plus par la Server Action elle-même.
- **Entité de l'éditeur** : supprimer une entreprise ne doit jamais emporter l'entité de l'éditeur ni celle d'un sous-traitant. Couvert par le test « only detaches a legal entity used as publisher or processor ».
- **Collision de slug** : une nouvelle entité prend le slug de l'entreprise ; s'il est déjà pris par une entité de l'ancien seed, l'erreur tombe sur la raison sociale, pas sur le slug de l'entreprise. Couvert par le test « maps a legal entity slug collision to the legal name ».
- **Mentions légales** : une forme juridique ou un siège absents font répondre la page introuvable au lieu de lever une erreur de traduction. Vérifié à la Task 6, Step 6.

---

### Task 1 : Modèle, migration et libellés publics

**Files:**
- Modify: `prisma/schema.prisma` (enum `LegalForm`, modèle `LegalEntity`, enum `VatRegime` redéfini, modèle `Publisher`)
- Create: `prisma/migrations/<horodatage>_legal_entity_optional_fields/migration.sql`
- Modify: `messages/fr.json` et `messages/en.json` (`Legal.legalStatus`, lignes 405-409)
- Modify: `src/app/[locale]/(public)/mentions-legales/page.tsx` (ligne 69)
- Modify: `src/app/[locale]/(public)/confidentialite/page.tsx` (lignes 114 et 189)
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx` (ligne 122)
- Create: `src/lib/legal/vat-status.ts`
- Modify: `src/lib/seo/json-ld.ts` et `src/lib/seo/json-ld.test.ts`

**Interfaces:**
- Consumes: rien
- Produces: enum `LegalForm` (13 valeurs) ; `LegalEntity.legalForm: LegalForm | null`, `LegalEntity.addressId: string | null`, `LegalEntity.address: Address | null` (supprimer l'adresse remet `addressId` à null), `LegalEntity.rcsNumber: string | null` ; enum `VatRegime` (`REEL_SIMPLIFIE`, `REEL_NORMAL`) ; `Publisher.vatRegime: VatRegime | null`, `Publisher.vatLiableSince: Date | null` ; `isVatLiable(publisher, now?): boolean` ; `ProfilePagePersonInput["legal"]["vatId"]?: string`

- [ ] **Step 1 : Modifier le modèle**

Dans `prisma/schema.prisma`, avant le modèle `LegalEntity`, ajouter l'enum :

```prisma
// Formes juridiques des deux marchés visés, France puis Luxembourg, plus l'Incorporated américaine
// que portent déjà des sous-traitants des pages légales. Un nouveau pays = une migration, accepté :
// la liste est fermée et courte, l'enum garantit la valeur en base et dans le code.
enum LegalForm {
  ENTREPRENEUR_INDIVIDUEL
  EURL
  SARL
  SAS
  SASU
  SA
  SNC
  SCI
  ASSOCIATION
  SARL_LU
  SARL_S_LU
  SA_LU
  INCORPORATED_US

  @@schema("public")
}
```

Dans le modèle `LegalEntity`, remplacer :

```prisma
  legalStatusKey  String
```

par `legalForm       LegalForm?`, ajouter après `rcsCity String?` :

```prisma
  rcsNumber       String?
```

et remplacer :

```prisma
  addressId String  @unique
  address   Address @relation(fields: [addressId], references: [id], onDelete: Cascade)
```

par :

```prisma
  // SetNull : vider le siège depuis la fiche supprime l'adresse, l'entité doit rester.
  addressId String?  @unique
  address   Address? @relation(fields: [addressId], references: [id], onDelete: SetNull)
```

Remplacer l'enum `VatRegime` :

```prisma
enum VatRegime {
  FRANCHISE
  ASSUJETTI

  @@schema("public")
}
```

par :

```prisma
// Régime d'imposition une fois assujetti : il fixe les déclarations (CA12 annuelle avec acomptes
// pour le réel simplifié, CA3 pour le réel normal). En franchise, pas de régime : le champ reste vide.
enum VatRegime {
  REEL_SIMPLIFIE
  REEL_NORMAL

  @@schema("public")
}
```

au-dessus de `model Publisher`, ajouter :

```prisma
// L'éditeur du site. Assujetti = date et régime renseignés ensemble, avec le numéro de TVA de
// l'entité légale ; vides = franchise en base, et les pages légales affichent la mention 293 B.
```

et, dans le modèle `Publisher`, remplacer :

```prisma
  apeCode          String
  registrationType String
  vatRegime        VatRegime
  publicEmail      String
```

par :

```prisma
  apeCode          String
  registrationType String
  // La franchise cesse au fait générateur : les factures d'avant restent sans TVA.
  vatLiableSince   DateTime?  @db.Date
  vatRegime        VatRegime?
  publicEmail      String
```

(commentaire du modèle `Publisher` inchangé si déjà présent, sinon ajouter au-dessus : `// L'éditeur du site. Assujetti = date et régime renseignés ensemble, avec le numéro de TVA de l'entité légale ; vides = franchise en base, et les pages légales affichent la mention 293 B.`)

- [ ] **Step 2 : Migration**

Run: `pnpm prisma migrate dev --create-only --name legal_entity_optional_fields`

Le fichier généré doit contenir, puis on ajoute à la fin la conversion des valeurs existantes :

```sql
-- CreateEnum
CREATE TYPE "public"."LegalForm" AS ENUM ('ENTREPRENEUR_INDIVIDUEL', 'EURL', 'SARL', 'SAS', 'SASU', 'SA', 'SNC', 'SCI', 'ASSOCIATION', 'SARL_LU', 'SARL_S_LU', 'SA_LU', 'INCORPORATED_US');

ALTER TABLE "public"."LegalEntity" DROP CONSTRAINT "LegalEntity_addressId_fkey";

ALTER TABLE "public"."LegalEntity" ADD COLUMN     "legalForm" "public"."LegalForm",
ADD COLUMN     "rcsNumber" TEXT,
ALTER COLUMN "addressId" DROP NOT NULL;

ALTER TABLE "public"."LegalEntity" ADD CONSTRAINT "LegalEntity_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "public"."Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Deux clients luxembourgeois de l'ancien seed, rangés dans des formes françaises.
UPDATE "public"."LegalEntity" SET "legalForm" = 'SARL_LU' WHERE "slug" = 'cloudsmart-sarl';
UPDATE "public"."LegalEntity" SET "legalForm" = 'SA_LU' WHERE "slug" = 'foyer-group-sa';

UPDATE "public"."LegalEntity" SET "legalForm" = 'ENTREPRENEUR_INDIVIDUEL' WHERE "legalStatusKey" = 'entrepreneurIndividuel' AND "legalForm" IS NULL;
UPDATE "public"."LegalEntity" SET "legalForm" = 'SARL' WHERE "legalStatusKey" = 'sarl' AND "legalForm" IS NULL;
UPDATE "public"."LegalEntity" SET "legalForm" = 'INCORPORATED_US' WHERE "legalStatusKey" = 'incorporated' AND "legalForm" IS NULL;

ALTER TABLE "public"."LegalEntity" DROP COLUMN "legalStatusKey";

-- Franchise et assujetti n'existent plus comme valeurs : la colonne repart à zéro, l'admin ressaisit.
ALTER TABLE "public"."Publisher" ALTER COLUMN "vatRegime" DROP NOT NULL;
UPDATE "public"."Publisher" SET "vatRegime" = NULL;

ALTER TYPE "public"."VatRegime" RENAME TO "VatRegime_old";
CREATE TYPE "public"."VatRegime" AS ENUM ('REEL_SIMPLIFIE', 'REEL_NORMAL');
ALTER TABLE "public"."Publisher" ALTER COLUMN "vatRegime" TYPE "public"."VatRegime" USING NULL::"public"."VatRegime";
DROP TYPE "public"."VatRegime_old";

ALTER TABLE "public"."Publisher" ADD COLUMN "vatLiableSince" DATE;
```

Run: `pnpm prisma migrate dev`, puis `pnpm prisma generate`, puis `just db-test`
Expected: migration appliquée en dev et en test, client généré, aucune nouvelle migration proposée.

- [ ] **Step 3 : Libellés publics français**

Dans `messages/fr.json`, remplacer le bloc `Legal.legalStatus` par :

```json
    "legalStatus": {
      "ENTREPRENEUR_INDIVIDUEL": "Entrepreneur Individuel",
      "EURL": "EURL",
      "SARL": "SARL",
      "SAS": "SAS",
      "SASU": "SASU",
      "SA": "SA",
      "SNC": "SNC",
      "SCI": "SCI",
      "ASSOCIATION": "Association",
      "SARL_LU": "S.à r.l. (Luxembourg)",
      "SARL_S_LU": "S.à r.l.-S (Luxembourg)",
      "SA_LU": "SA (Luxembourg)",
      "INCORPORATED_US": "Incorporated (US)"
    },
```

- [ ] **Step 4 : Libellés publics anglais**

Dans `messages/en.json`, même bloc :

```json
    "legalStatus": {
      "ENTREPRENEUR_INDIVIDUEL": "Sole proprietorship",
      "EURL": "EURL",
      "SARL": "LLC",
      "SAS": "SAS",
      "SASU": "SASU",
      "SA": "SA",
      "SNC": "SNC",
      "SCI": "SCI",
      "ASSOCIATION": "Association",
      "SARL_LU": "S.à r.l. (Luxembourg)",
      "SARL_S_LU": "S.à r.l.-S (Luxembourg)",
      "SA_LU": "SA (Luxembourg)",
      "INCORPORATED_US": "Incorporated (US)"
    },
```

- [ ] **Step 5 : Garde des mentions légales et TVA de l'éditeur**

Dans `src/app/[locale]/(public)/mentions-legales/page.tsx`, remplacer :

```tsx
  if (!publisher?.publisher || !hosting) notFound()
```

par :

```tsx
  // Facultatifs en base, mais requis ici pour l'éditeur comme pour l'hébergeur.
  if (
    !publisher?.publisher ||
    !hosting ||
    !publisher.address ||
    !hosting.address ||
    !publisher.legalForm ||
    !hosting.legalForm
  ) {
    notFound()
  }
```

Remplacer les deux lectures de la forme juridique, pour l'hébergeur puis pour l'éditeur :

```tsx
    `legalStatus.${hosting.legalStatusKey}` as Parameters<typeof tLegal>[0],
```

par :

```tsx
    `legalStatus.${hosting.legalForm}` as Parameters<typeof tLegal>[0],
```

et :

```tsx
            {tLegal(`legalStatus.${publisher.legalStatusKey}` as Parameters<typeof tLegal>[0])}
```

par :

```tsx
            {tLegal(`legalStatus.${publisher.legalForm}` as Parameters<typeof tLegal>[0])}
```

Ajouter l'import :

```tsx
import { isVatLiable } from "@/lib/legal/vat-status"
```

puis remplacer la condition d'affichage de la TVA :

```tsx
        {pub.vatRegime === "FRANCHISE" ? (
          <p className="text-sm text-muted-foreground">{t("identity.vatNotApplicable")}</p>
        ) : publisher.vatNumber ? (
          <p>
            <span className="font-semibold">{t("identity.vatNumberLabel")} :</span>{" "}
            {publisher.vatNumber}
          </p>
        ) : null}
```

par :

```tsx
        {isVatLiable(pub) ? (
          <p>
            <span className="font-semibold">{t("identity.vatNumberLabel")} :</span>{" "}
            {publisher.vatNumber}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">{t("identity.vatNotApplicable")}</p>
        )}
```

- [ ] **Step 6 : Pays d'un sous-traitant sans siège**

Dans `src/app/[locale]/(public)/confidentialite/page.tsx`, remplacer les deux calculs de pays :

```tsx
              const country = regionFormatter.of(entry.address.country) ?? entry.address.country
```

par :

```tsx
              const country = entry.address
                ? (regionFormatter.of(entry.address.country) ?? entry.address.country)
                : null
```

(une occurrence dans la table des destinataires, une dans la liste des transferts).

- [ ] **Step 7 : `vatID` du JSON-LD**

Créer `src/lib/legal/vat-status.ts` :

```ts
// Assujetti = date de bascule renseignée et déjà passée ; la franchise ne porte aucune valeur.
export function isVatLiable(
  publisher: { vatLiableSince: Date | null } | null | undefined,
  now: Date = new Date(),
): boolean {
  return !!publisher?.vatLiableSince && publisher.vatLiableSince <= now
}
```

Dans `src/lib/seo/json-ld.ts`, ajouter `vatId?: string` à `ProfilePagePersonInput["legal"]` et `vatID?: string` à `ProfilePagePerson["mainEntity"]`, entre `taxID` et `identifier`. Dans `buildProfilePagePerson`, remplacer :

```ts
      ...(input.legal && {
        address: buildPostalAddress(input.legal.address),
        taxID: input.legal.siret,
        identifier: {
```

par :

```ts
      ...(input.legal && {
        address: buildPostalAddress(input.legal.address),
        taxID: input.legal.siret,
        ...(input.legal.vatId && { vatID: input.legal.vatId }),
        identifier: {
```

Dans `src/lib/seo/json-ld.test.ts`, après le cas « quand legal est fourni » qui utilise `LEGAL_FIXTURE`, ajouter :

```ts
  it("adds vatID when the publisher is VAT liable", () => {
    const result = buildProfilePagePerson(
      buildProfileInput({ legal: { ...LEGAL_FIXTURE, vatId: "FR00000000000" } }),
    )

    expect(result.mainEntity.vatID).toBe("FR00000000000")
  })

  it("leaves vatID out without a VAT number", () => {
    const result = buildProfilePagePerson(buildProfileInput({ legal: LEGAL_FIXTURE }))

    expect(result.mainEntity.vatID).toBeUndefined()
  })
```

- [ ] **Step 8 : Données légales du JSON-LD de la page À propos**

Dans `src/app/[locale]/(public)/a-propos/page.tsx`, remplacer :

```tsx
    legal: publisher?.siret ? { siret: publisher.siret, address: publisher.address } : undefined,
```

par :

```tsx
    legal:
      publisher?.siret && publisher.address
        ? {
            siret: publisher.siret,
            address: publisher.address,
            ...(isVatLiable(publisher.publisher) && publisher.vatNumber
              ? { vatId: publisher.vatNumber }
              : {}),
          }
        : undefined,
```

et importer `isVatLiable` depuis `@/lib/legal/vat-status`.

- [ ] **Step 9 : Vérifier le typage**

Run: `just typecheck`
Expected: aucune erreur dans les pages légales ; des erreurs peuvent rester dans l'admin entreprises, traitées aux Tasks 2 à 5.

---

### Task 2 : Référentiels et validation de l'entité

**Files:**
- Create: `src/lib/legal-entities.ts`
- Create: `src/lib/schemas/legal-entity.ts`
- Create: `src/lib/schemas/legal-entity.test.ts`
- Modify: `src/lib/schemas/company.ts`

**Interfaces:**
- Consumes: enum `LegalForm` (Task 1), enum `VatRegime` (Task 1)
- Produces:
  - `LEGAL_FORM_GROUPS`, `LEGAL_FORMS: LegalForm[]`, `LEGAL_FORM_LABELS: Record<LegalForm, string>`
  - `REGISTERED_OFFICE_COUNTRIES`, `CAPITAL_CURRENCIES`, `DEFAULT_CURRENCY`, `NO_COUNTRY`, `countryName(code: string): string`, `sirenFromSiret(siret: string | null): string | null`, `LEGAL_ENTITY_FIELD_LABELS`
  - `VAT_REGIMES: VatRegime[]`, `VAT_REGIME_LABELS: Record<VatRegime, string>`, `NO_VAT_REGIME`
  - `legalEntityFields` (objet de schémas Zod à étaler, dont `legalEntityVatLiableSince` et `legalEntityVatRegime`), `refineLegalEntity(data, ctx)`
  - `companySchema` avec ces champs, sans `legalEntityId`

- [ ] **Step 1 : Créer `src/lib/legal-entities.ts`**

```ts
import type { LegalForm, VatRegime } from "@/generated/prisma/client"

export const LEGAL_FORM_GROUPS: { country: string; forms: readonly LegalForm[] }[] = [
  {
    country: "France",
    forms: ["ENTREPRENEUR_INDIVIDUEL", "EURL", "SARL", "SAS", "SASU", "SA", "SNC", "SCI", "ASSOCIATION"],
  },
  {
    country: "Luxembourg",
    forms: ["SARL_LU", "SARL_S_LU", "SA_LU"],
  },
  {
    country: "États-Unis",
    forms: ["INCORPORATED_US"],
  },
]

export const LEGAL_FORMS: LegalForm[] = LEGAL_FORM_GROUPS.flatMap((group) => group.forms)

// Le groupe suffit à situer une forme hors de France : inutile de répéter le pays dans les messages publics.
export const LEGAL_FORM_LABELS: Record<LegalForm, string> = {
  ENTREPRENEUR_INDIVIDUEL: "Entrepreneur individuel",
  EURL: "EURL",
  SARL: "SARL",
  SAS: "SAS",
  SASU: "SASU",
  SA: "SA",
  SNC: "SNC",
  SCI: "SCI",
  ASSOCIATION: "Association",
  SARL_LU: "S.à r.l.",
  SARL_S_LU: "S.à r.l.-S",
  SA_LU: "SA",
  INCORPORATED_US: "Incorporated",
}

export const REGISTERED_OFFICE_COUNTRIES = ["FR", "LU", "BE", "CH", "DE", "NL", "GB", "US"] as const

export const NO_COUNTRY = "aucun"

export const CAPITAL_CURRENCIES = ["EUR", "CHF", "USD", "GBP"] as const

export const DEFAULT_CURRENCY = "EUR"

// Décision 17 : la franchise se dit par l'absence de régime, jamais par une valeur dédiée.
export const VAT_REGIMES: VatRegime[] = ["REEL_SIMPLIFIE", "REEL_NORMAL"]

export const VAT_REGIME_LABELS: Record<VatRegime, string> = {
  REEL_SIMPLIFIE: "Réel simplifié",
  REEL_NORMAL: "Réel normal",
}

export const NO_VAT_REGIME = "aucun"

const COUNTRY_NAMES = new Intl.DisplayNames(["fr"], { type: "region" })

export function countryName(code: string): string {
  return COUNTRY_NAMES.of(code) ?? code
}

export function sirenFromSiret(siret: string | null): string | null {
  return siret && siret.length === 14 ? siret.slice(0, 9) : null
}

export const LEGAL_ENTITY_FIELD_LABELS = {
  name: "Raison sociale",
  legalForm: "Forme juridique",
  siret: "SIRET",
  vatNumber: "N° TVA intracommunautaire",
  rcsCity: "Ville du RCS",
  rcsNumber: "Numéro RCS",
  phone: "Téléphone",
  capitalAmount: "Capital social",
  capitalCurrency: "Devise",
  registration: "Immatriculation",
  registeredOffice: "Siège social",
  street: "Rue",
  postalCode: "Code postal",
  city: "Ville",
  country: "Pays",
  vatSectionTitle: "TVA de l'éditeur",
  vatLiableSince: "Assujetti à la TVA depuis le",
  vatRegime: "Régime",
} as const
```

- [ ] **Step 2 : Créer `src/lib/schemas/legal-entity.ts`**

```ts
import { z } from "zod"

import type { VatRegime } from "@/generated/prisma/client"
import { CAPITAL_CURRENCIES, LEGAL_FORMS, NO_COUNTRY, NO_VAT_REGIME, VAT_REGIMES } from "@/lib/legal-entities"

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === "" ? null : value))
  .optional()

export const legalEntityFields = {
  legalEntityName: z
    .string()
    .trim()
    .max(160, "La raison sociale ne peut pas dépasser 160 caractères")
    .optional(),
  legalEntityStatusKey: z
    .union([z.enum(LEGAL_FORMS), z.literal("")], { error: "Forme juridique inconnue" })
    .transform((value) => (value === "" ? null : value))
    .optional(),
  legalEntitySiret: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine((value) => value === "" || /^\d{14}$/.test(value), {
      error: "Le SIRET compte 14 chiffres",
    })
    .transform((value) => (value === "" ? null : value))
    .optional(),
  legalEntityVatNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, "").toUpperCase())
    .refine((value) => value === "" || /^[A-Z]{2}[A-Z0-9]{8,12}$/.test(value), {
      error: "Le numéro de TVA commence par deux lettres, suivies de 8 à 12 caractères",
    })
    .transform((value) => (value === "" ? null : value))
    .optional(),
  // Décision 17 : pris en compte seulement pour l'entité éditrice, la card ne les affiche que là.
  legalEntityVatLiableSince: z.preprocess(
    (value) => (value === "" ? null : value),
    z.coerce.date({ error: "Date invalide" }).nullable(),
  ).optional(),
  legalEntityVatRegime: z
    .union([z.enum(VAT_REGIMES), z.literal(NO_VAT_REGIME), z.literal("")], {
      error: "Régime de TVA inconnu",
    })
    .transform((value) => (value === "" || value === NO_VAT_REGIME ? null : value))
    .optional(),
  legalEntityRcsCity: optionalText,
  legalEntityRcsNumber: optionalText,
  legalEntityPhone: optionalText,
  legalEntityCapitalAmount: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+$/.test(value), {
      error: "Le capital est un nombre entier",
    })
    .transform((value) => (value === "" ? null : Number(value)))
    .optional(),
  legalEntityCapitalCurrency: z
    .union([z.enum(CAPITAL_CURRENCIES), z.literal("")], { error: "Devise inconnue" })
    .transform((value) => (value === "" ? null : value))
    .optional(),
  legalEntityStreet: optionalText,
  legalEntityPostalCode: optionalText,
  legalEntityCity: optionalText,
  legalEntityCountry: z
    .string()
    .trim()
    .transform((value) => (value === "" || value === NO_COUNTRY ? null : value))
    .refine((value) => value === null || /^[A-Z]{2}$/.test(value), { error: "Pays inconnu" })
    .optional(),
}

type LegalEntityValues = {
  legalEntityName?: string | undefined
  legalEntityStatusKey?: LegalForm | null | undefined
  legalEntitySiret?: string | null | undefined
  legalEntityVatNumber?: string | null | undefined
  legalEntityVatLiableSince?: Date | null | undefined
  legalEntityVatRegime?: VatRegime | null | undefined
  legalEntityRcsCity?: string | null | undefined
  legalEntityRcsNumber?: string | null | undefined
  legalEntityPhone?: string | null | undefined
  legalEntityCapitalAmount?: number | null | undefined
  legalEntityStreet?: string | null | undefined
  legalEntityPostalCode?: string | null | undefined
  legalEntityCity?: string | null | undefined
  legalEntityCountry?: string | null | undefined
}

const ADDRESS_FIELDS = [
  "legalEntityStreet",
  "legalEntityPostalCode",
  "legalEntityCity",
  "legalEntityCountry",
] as const

// Au-delà de la raison sociale et du siège, un champ qui compte pour « l'entité a une valeur ».
// La devise (toujours un défaut non vide) et les champs de TVA (décision 17, propres au Publisher) en sont exclus.
const OTHER_ENTITY_FIELDS = [
  "legalEntityStatusKey",
  "legalEntitySiret",
  "legalEntityVatNumber",
  "legalEntityRcsCity",
  "legalEntityRcsNumber",
  "legalEntityPhone",
  "legalEntityCapitalAmount",
] as const

export function refineLegalEntity(data: LegalEntityValues, ctx: z.RefinementCtx): void {
  const hasAnyField =
    Boolean(data.legalEntityName) ||
    ADDRESS_FIELDS.some((field) => data[field]) ||
    OTHER_ENTITY_FIELDS.some((field) => data[field])

  if (hasAnyField) {
    if (!data.legalEntityName) {
      ctx.addIssue({
        code: "custom",
        path: ["legalEntityName"],
        message: "La raison sociale est requise",
      })
    }

    // Dès que l'entité a une valeur, le siège est requis en entier : plus de « tout ou rien » optionnel.
    for (const field of ADDRESS_FIELDS) {
      if (!data[field]) {
        ctx.addIssue({ code: "custom", path: [field], message: "Requis pour un siège complet" })
      }
    }
  }

  // Décision 17 : date et régime vont ensemble, avec le numéro de TVA qui motive l'assujettissement.
  if (data.legalEntityVatLiableSince && !data.legalEntityVatRegime) {
    ctx.addIssue({ code: "custom", path: ["legalEntityVatRegime"], message: "Choisissez le régime" })
  }
  if (data.legalEntityVatRegime && !data.legalEntityVatLiableSince) {
    ctx.addIssue({
      code: "custom",
      path: ["legalEntityVatLiableSince"],
      message: "La date d'assujettissement est requise",
    })
  }
  if (data.legalEntityVatLiableSince && data.legalEntityVatRegime && !data.legalEntityVatNumber) {
    ctx.addIssue({
      code: "custom",
      path: ["legalEntityVatNumber"],
      message: "Le numéro de TVA est requis une fois assujetti",
    })
  }
}
```

- [ ] **Step 3 : Intégrer au schéma de l'entreprise**

Dans `src/lib/schemas/company.ts` :

- ajouter l'import :

```ts
import { legalEntityFields, refineLegalEntity } from "@/lib/schemas/legal-entity"
```

- retirer le champ `legalEntityId` de l'objet ;
- ajouter `...legalEntityFields,` à la fin de l'objet, après `notes` ;
- ajouter un `.superRefine((data, ctx) => refineLegalEntity(data, ctx))` à la fin de `companySchema`.

- [ ] **Step 4 : Tests unitaires des règles de TVA**

Créer `src/lib/schemas/legal-entity.test.ts` :

```ts
import { describe, expect, it } from "vitest"
import { z } from "zod"

import { legalEntityFields, refineLegalEntity } from "./legal-entity"

const schema = z.object(legalEntityFields).superRefine(refineLegalEntity)

function parse(overrides: Record<string, string> = {}) {
  return schema.safeParse({
    legalEntityName: "Acme SAS",
    legalEntityStreet: "11 rue Gouvy",
    legalEntityPostalCode: "57000",
    legalEntityCity: "Metz",
    legalEntityCountry: "FR",
    legalEntityVatNumber: "",
    legalEntityVatLiableSince: "",
    legalEntityVatRegime: "",
    ...overrides,
  })
}

describe("refineLegalEntity publisher VAT fields", () => {
  it("accepts a legal entity with neither vat liability date nor regime", () => {
    const result = parse()

    expect(result.success).toBe(true)
  })

  it("requires a vat regime once the liability date is filled", () => {
    const result = parse({ legalEntityVatLiableSince: "2026-01-01" })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.legalEntityVatRegime).toEqual([
        "Choisissez le régime",
      ])
    }
  })

  it("requires a liability date once the vat regime is filled", () => {
    const result = parse({ legalEntityVatRegime: "REEL_SIMPLIFIE" })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.legalEntityVatLiableSince).toEqual([
        "La date d'assujettissement est requise",
      ])
    }
  })

  it("requires a vat number once liable", () => {
    const result = parse({
      legalEntityVatLiableSince: "2026-01-01",
      legalEntityVatRegime: "REEL_SIMPLIFIE",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.legalEntityVatNumber).toEqual([
        "Le numéro de TVA est requis une fois assujetti",
      ])
    }
  })

  it("accepts an entity with liability date, regime and vat number filled together", () => {
    const result = parse({
      legalEntityVatLiableSince: "2026-01-01",
      legalEntityVatRegime: "REEL_SIMPLIFIE",
      legalEntityVatNumber: "FR00000000000",
    })

    expect(result.success).toBe(true)
  })
})
```

Run: `pnpm vitest run --project unit src/lib/schemas/legal-entity.test.ts`
Expected: PASS.

- [ ] **Step 5 : Vérifier le typage**

Run: `just typecheck`
Expected: les erreurs restantes portent sur `legalEntityId` dans les actions, les requêtes, le formulaire et les tests, corrigés aux Tasks 3 à 5.

---

### Task 3 : Actions : écriture et suppression de l'entité

**Files:**
- Modify: `src/server/actions/companies.ts`
- Modify: `src/server/actions/companies.types.ts`
- Test: `src/server/actions/companies.test.ts`

**Interfaces:**
- Consumes: `CompanyInput` (Task 2, dont `legalEntityVatLiableSince` et `legalEntityVatRegime`)
- Produces: `companyFields`, `toCreateData`, `toUpdateData` (écrit la TVA sur le `Publisher` lié) ; `CompanyFormMessage` avec `"siret_taken"` et sans `"legal_entity_taken"` ; `createCompany`, `updateCompany`, `deleteCompany` inchangés en signature

- [ ] **Step 1 : Adapter les mocks et helpers de test**

Dans `src/server/actions/companies.test.ts`, remplacer le mock de `@/lib/prisma` par :

```ts
vi.mock("@/lib/prisma", () => {
  const prisma = {
    company: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    legalEntity: { delete: vi.fn() },
    address: { delete: vi.fn() },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation((callback: (tx: typeof prisma) => unknown) =>
    callback(prisma),
  )
  return { prisma }
})
```

Retirer `legalEntityId: NONE_VALUE` de `BASE_FIELDS`, et supprimer les trois tests devenus sans objet : « stores the "aucune" sentinel as null for the legal entity id », « stores an empty legal entity id as null », « assigns a legal entity uniqueness violation to the legal entity field, not the slug ».

Ajouter, après `buildFormData` :

```ts
// Un nom et un siège complet par défaut : depuis que les deux sont requis ensemble (dès qu'un champ
// de l'entité est rempli), un test qui ne porte pas sur l'adresse n'a pas à la répéter à chaque appel.
function withLegalEntity(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    legalEntityName: "Acme SAS",
    legalEntityStreet: "11 rue Gouvy",
    legalEntityPostalCode: "57000",
    legalEntityCity: "Metz",
    legalEntityCountry: "FR",
    ...overrides,
  }
}
```

Dans `afterEach` du bloc `updateCompany`, rien ne change ; au début du bloc `updateCompany`, ajouter :

```ts
  beforeEach(() => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ legalEntity: null } as never)
  })
```

(importer `beforeEach` de `vitest`).

- [ ] **Step 2 : Écrire les tests qui échouent**

Ajouter dans `describe("createCompany")` :

```ts
  it("creates the legal entity with the company, with the company slug", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityStatusKey: "SAS" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: {
            create: objectMatch({
              slug: "acme",
              name: "Acme SAS",
              legalForm: "SAS",
              address: {
                create: { street: "11 rue Gouvy", postalCode: "57000", city: "Metz", country: "FR" },
              },
            }),
          },
        }),
      }),
    )
  })

  it("rejects a legal entity without a name", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityName: "" }), ["SAAS"], { types: ["CLIENT_FINAL"] }),
    )

    expect(state.errors.legalEntityName).toEqual(["La raison sociale est requise"])
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("strips spaces from a SIRET and rejects one that is not 14 digits", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    const invalid = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "123 456 789 0123" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )
    await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "111 222 333 00044" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(invalid.errors.legalEntitySiret).toEqual(["Le SIRET compte 14 chiffres"])
    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: { create: objectMatch({ siret: "11122233300044" }) },
        }),
      }),
    )
  })

  it("rejects an unknown legal form", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityStatusKey: "kg" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(state.errors.legalEntityStatusKey).toBeDefined()
  })

  it("rejects a partial registered office address", async () => {
    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({ legalEntityStreet: "", legalEntityPostalCode: "", legalEntityCountry: "" }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    expect(state.errors.legalEntityStreet).toEqual(["Requis pour un siège complet"])
    expect(state.errors.legalEntityPostalCode).toBeDefined()
    expect(state.errors.legalEntityCountry).toBeDefined()
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it("ignores the RCS number when the registered office is in France", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityRcsNumber: "B123456",
          legalEntityStreet: "11 rue Gouvy",
          legalEntityPostalCode: "57000",
          legalEntityCity: "Metz",
          legalEntityCountry: "FR",
        }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    expect(prisma.company.create).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({ legalEntity: { create: objectMatch({ rcsNumber: null }) } }),
      }),
    )
  })

  it("maps a SIRET uniqueness violation to the SIRET field", async () => {
    vi.mocked(prisma.company.create).mockRejectedValue(uniqueViolation("LegalEntity_siret_key"))

    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntitySiret: "11122233300044" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(state.message).toBe("siret_taken")
    expect(state.errors.legalEntitySiret).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it("maps a legal entity slug collision to the legal name", async () => {
    vi.mocked(prisma.company.create).mockRejectedValue(uniqueViolation("LegalEntity_slug_key"))

    const state = await createCompany(
      initialCompanyFormState,
      buildFormData(withLegalEntity(), ["SAAS"], { types: ["CLIENT_FINAL"] }),
    )

    expect(state.errors.legalEntityName).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it("invalidates the legal entity cache tag after a write", async () => {
    vi.mocked(prisma.company.create).mockResolvedValue({ id: "c1" } as never)

    await createCompany(initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })
```

Ajouter dans `describe("updateCompany")` :

```ts
  it("upserts the legal entity on update", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(withLegalEntity({ legalEntityPhone: "+33 3 00 00 00 00" }), ["SAAS"], {
        types: ["CLIENT_FINAL"],
      }),
    )

    expect(prisma.company.update).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: {
            upsert: {
              create: objectMatch({ slug: "acme", phone: "+33 3 00 00 00 00" }),
              update: objectMatch({ phone: "+33 3 00 00 00 00" }),
            },
          },
        }),
      }),
    )
  })

  it("leaves the legal entity untouched when the form does not send it", async () => {
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany("c1", initialCompanyFormState, buildFormData())

    const data = vi.mocked(prisma.company.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    expect(data.legalEntity).toBeUndefined()
  })

  it("writes the vat liability date and regime on the publisher when the entity has one", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: { addressId: null, publisher: { id: "pub1" } },
    } as never)
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityVatLiableSince: "2026-01-01",
          legalEntityVatRegime: "REEL_SIMPLIFIE",
          legalEntityVatNumber: "FR00000000000",
        }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    expect(prisma.company.update).toHaveBeenCalledWith(
      objectMatch({
        data: objectMatch({
          legalEntity: {
            upsert: objectMatch({
              update: objectMatch({
                publisher: {
                  update: { vatRegime: "REEL_SIMPLIFIE", vatLiableSince: new Date("2026-01-01") },
                },
              }),
            }),
          },
        }),
      }),
    )
  })

  it("ignores vat fields when the entity has no publisher", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: { addressId: null, publisher: null },
    } as never)
    vi.mocked(prisma.company.update).mockResolvedValue({ id: "c1" } as never)

    await updateCompany(
      "c1",
      initialCompanyFormState,
      buildFormData(
        withLegalEntity({
          legalEntityVatLiableSince: "2026-01-01",
          legalEntityVatRegime: "REEL_SIMPLIFIE",
          legalEntityVatNumber: "FR00000000000",
        }),
        ["SAAS"],
        { types: ["CLIENT_FINAL"] },
      ),
    )

    const data = vi.mocked(prisma.company.update).mock.calls[0]?.[0]?.data as Record<string, unknown>
    const legalEntity = data.legalEntity as { upsert: { update: Record<string, unknown> } }
    expect(legalEntity.upsert.update.publisher).toBeUndefined()
  })
```

Remplacer le bloc `describe("deleteCompany")` par :

```ts
describe("deleteCompany", () => {
  afterEach(() => vi.clearAllMocks())

  it("deletes a company that is not referenced by any project", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ legalEntity: null } as never)
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    const state = await deleteCompany("c1")

    expect(state.ok).toBe(true)
    expect(updateTag).toHaveBeenCalledWith("projects")
    expect(updateTag).toHaveBeenCalledWith("legal-entity")
  })

  it("deletes the legal entity and its address with the company", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: { id: "le1", addressId: "a1", publisher: null, _count: { processings: 0 } },
    } as never)
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    await deleteCompany("c1")

    expect(prisma.legalEntity.delete).toHaveBeenCalledWith({ where: { id: "le1" } })
    expect(prisma.address.delete).toHaveBeenCalledWith({ where: { id: "a1" } })
  })

  it("only detaches a legal entity used as publisher or processor", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({
      legalEntity: { id: "le1", addressId: "a1", publisher: { id: "p1" }, _count: { processings: 0 } },
    } as never)
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    await deleteCompany("c1")

    expect(prisma.company.delete).toHaveBeenCalled()
    expect(prisma.legalEntity.delete).not.toHaveBeenCalled()
    expect(prisma.address.delete).not.toHaveBeenCalled()
  })

  it("translates a foreign key violation into an explicit message", async () => {
    vi.mocked(prisma.company.findUnique).mockResolvedValue({ legalEntity: null } as never)
    vi.mocked(prisma.company.delete).mockRejectedValue({ code: "P2003" })

    const state = await deleteCompany("c1")

    expect(state.message).toBe("company_in_use")
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    await expect(deleteCompany("c1")).rejects.toThrow()

    expect(prisma.company.delete).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 3 : Lancer les tests pour les voir échouer**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: FAIL sur les nouveaux cas (entité ignorée, message `siret_taken` absent, tag `legal-entity` non invalidé, suppression sans transaction, TVA jamais écrite sur le `Publisher`).

- [ ] **Step 4 : Messages**

Dans `src/server/actions/companies.types.ts`, remplacer `"legal_entity_taken"` par `"siret_taken"` dans `CompanyFormMessage`.

- [ ] **Step 5 : Données de l'entité**

Dans `src/server/actions/companies.ts`, ajouter les imports :

```ts
import type { LegalForm, Prisma } from "@/generated/prisma/client"

import { DEFAULT_CURRENCY } from "@/lib/legal-entities"
```

puis ajouter :

```ts
interface LegalEntityDraft {
  fields: {
    name: string
    legalForm: LegalForm | null
    siret: string | null
    vatNumber: string | null
    rcsCity: string | null
    rcsNumber: string | null
    phone: string | null
    capitalAmount: number | null
    capitalCurrency: string | null
  }
  address: { street: string; postalCode: string; city: string; country: string } | null
}

function toLegalEntityDraft(data: CompanyInput): LegalEntityDraft | undefined {
  // Après validation (refineLegalEntity), un nom présent garantit aussi un siège complet : aucun champ rempli n'en tient lieu.
  if (!data.legalEntityName) return undefined

  const address =
    data.legalEntityStreet && data.legalEntityPostalCode && data.legalEntityCity && data.legalEntityCountry
      ? {
          street: data.legalEntityStreet,
          postalCode: data.legalEntityPostalCode,
          city: data.legalEntityCity,
          country: data.legalEntityCountry,
        }
      : null
  const capitalAmount = data.legalEntityCapitalAmount ?? null

  return {
    fields: {
      name: data.legalEntityName ?? "",
      legalForm: data.legalEntityStatusKey ?? null,
      siret: data.legalEntitySiret ?? null,
      vatNumber: data.legalEntityVatNumber ?? null,
      rcsCity: data.legalEntityRcsCity ?? null,
      // En France, le SIREN tiré du SIRET tient lieu de numéro RCS.
      rcsNumber: address?.country === "FR" ? null : (data.legalEntityRcsNumber ?? null),
      phone: data.legalEntityPhone ?? null,
      capitalAmount,
      capitalCurrency:
        capitalAmount === null ? null : (data.legalEntityCapitalCurrency ?? DEFAULT_CURRENCY),
    },
    address,
  }
}

function companyFields(data: CompanyInput) {
  return {
    slug: data.slug,
    name: data.name,
    sectors: data.sectors,
    size: data.size,
    websiteUrl: data.websiteUrl,
    logoFilename: data.logoFilename,
    types: data.types,
    relationStatus: data.relationStatus,
    zones: data.zones,
    notes: data.notes,
    details: data.details,
  }
}
```

Ajouter `toCreateData` et `toUpdateData` :

```ts
function toCreateData(data: CompanyInput): Prisma.CompanyCreateInput {
  const legal = toLegalEntityDraft(data)
  return {
    ...companyFields(data),
    ...(legal
      ? {
          legalEntity: {
            create: {
              slug: data.slug,
              ...legal.fields,
              ...(legal.address ? { address: { create: legal.address } } : {}),
            },
          },
        }
      : {}),
  }
}

function toUpdateData(
  data: CompanyInput,
  currentAddressId: string | null,
  currentPublisherId: string | null,
): Prisma.CompanyUpdateInput {
  const legal = toLegalEntityDraft(data)
  const addressUpdate = legal?.address
    ? { upsert: { create: legal.address, update: legal.address } }
    : currentAddressId
      ? { delete: true }
      : undefined
  // Jamais de Publisher créé ici : seule l'entité de l'éditeur en porte un, posé hors de ce formulaire.
  const publisherUpdate = currentPublisherId
    ? {
        publisher: {
          update: {
            vatRegime: data.legalEntityVatRegime ?? null,
            vatLiableSince: data.legalEntityVatLiableSince ?? null,
          },
        },
      }
    : {}

  return {
    ...companyFields(data),
    ...(legal
      ? {
          legalEntity: {
            upsert: {
              create: {
                slug: data.slug,
                ...legal.fields,
                ...(legal.address ? { address: { create: legal.address } } : {}),
              },
              update: {
                ...legal.fields,
                ...(addressUpdate ? { address: addressUpdate } : {}),
                ...publisherUpdate,
              },
            },
          },
        }
      : {}),
  }
}
```

Dans `createCompany`, remplacer son `persist` par :

```ts
    (data) => prisma.company.create({ data: toCreateData(data) }),
```

Dans `updateCompany`, remplacer son `persist` par :

```ts
    async (data) => {
      const current = data.legalEntityName
        ? await prisma.company.findUnique({
            where: { id },
            select: {
              legalEntity: { select: { addressId: true, publisher: { select: { id: true } } } },
            },
          })
        : null
      return prisma.company.update({
        where: { id },
        data: toUpdateData(
          data,
          current?.legalEntity?.addressId ?? null,
          current?.legalEntity?.publisher?.id ?? null,
        ),
      })
    },
```

- [ ] **Step 6 : Collisions et cache**

Remplacer `mapUniqueViolation` par :

```ts
function mapUniqueViolation(
  err: unknown,
  values: CompanyFormState["values"],
): CompanyFormState | null {
  if (!isPrismaError(err, "P2002")) return null

  const constraint = violatedConstraint(err)
  if (constraint.includes("siret")) {
    return {
      ok: false,
      errors: { legalEntitySiret: ["Ce SIRET est déjà porté par une autre entité légale"] },
      message: "siret_taken",
      values,
    }
  }
  if (constraint.includes("LegalEntity_slug")) {
    return {
      ok: false,
      errors: {
        legalEntityName: ["Une entité légale porte déjà l'identifiant de cette entreprise"],
      },
      message: null,
      values,
    }
  }
  return {
    ok: false,
    errors: { slug: ["Ce slug est déjà utilisé par une autre entreprise"] },
    message: "slug_taken",
    values,
  }
}
```

et `invalidateCompanyCaches` par :

```ts
// L'entité légale de la société du propriétaire est celle de l'éditeur, lue par les pages légales.
function invalidateCompanyCaches(): void {
  updateTag("projects")
  updateTag("legal-entity")
  revalidatePath("/admin/entreprises")
}
```

Dans `collectValues`, retirer `legalEntityId` et ajouter les treize champs de l'entité, tous lus par `optionalStringField` :

```ts
    legalEntityName: optionalStringField(formData, "legalEntityName"),
    legalEntityStatusKey: optionalStringField(formData, "legalEntityStatusKey"),
    legalEntitySiret: optionalStringField(formData, "legalEntitySiret"),
    legalEntityVatNumber: optionalStringField(formData, "legalEntityVatNumber"),
    legalEntityRcsCity: optionalStringField(formData, "legalEntityRcsCity"),
    legalEntityRcsNumber: optionalStringField(formData, "legalEntityRcsNumber"),
    legalEntityPhone: optionalStringField(formData, "legalEntityPhone"),
    legalEntityCapitalAmount: optionalStringField(formData, "legalEntityCapitalAmount"),
    legalEntityCapitalCurrency: optionalStringField(formData, "legalEntityCapitalCurrency"),
    legalEntityStreet: optionalStringField(formData, "legalEntityStreet"),
    legalEntityPostalCode: optionalStringField(formData, "legalEntityPostalCode"),
    legalEntityCity: optionalStringField(formData, "legalEntityCity"),
    legalEntityCountry: optionalStringField(formData, "legalEntityCountry"),
```

- [ ] **Step 7 : Suppression transactionnelle**

Dans `deleteCompany`, remplacer `destroy` par :

```ts
    // L'entité part avec l'entreprise, sauf si elle sert aux pages légales (éditeur, sous-traitant) : sa suppression les emporterait par cascade.
    destroy: () =>
      prisma.$transaction(async (tx) => {
        const company = await tx.company.findUnique({
          where: { id },
          select: {
            legalEntity: {
              select: {
                id: true,
                addressId: true,
                publisher: { select: { id: true } },
                _count: { select: { processings: true } },
              },
            },
          },
        })
        await tx.company.delete({ where: { id } })

        const entity = company?.legalEntity
        if (entity && !entity.publisher && entity._count.processings === 0) {
          await tx.legalEntity.delete({ where: { id: entity.id } })
          if (entity.addressId) await tx.address.delete({ where: { id: entity.addressId } })
        }
      }),
```

- [ ] **Step 8 : Lancer les tests**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: PASS, les cas des plans `02` et `03` compris.

---

### Task 4 : Card Entité légale et formulaire

**Files:**
- Modify: `src/server/queries/companies.ts` (include de l'entité, `findAvailableLegalEntities` retiré)
- Create: `src/components/features/admin/OptionalDateField.tsx`
- Create: `src/components/features/admin/companies/LegalEntityCard.tsx`
- Modify: `src/components/features/admin/companies/CompanyForm.tsx`
- Modify: `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`
- Modify: `src/app/admin/(protected)/entreprises/[id]/page.tsx`
- Modify: `docs/DESIGN.md` (ligne « Date facultative »)

**Interfaces:**
- Consumes: Task 2 (`LEGAL_FORM_GROUPS`, `LEGAL_FORM_LABELS`, `REGISTERED_OFFICE_COUNTRIES`, `NO_COUNTRY`, `CAPITAL_CURRENCIES`, `DEFAULT_CURRENCY`, `countryName`, `LEGAL_ENTITY_FIELD_LABELS`, `VAT_REGIMES`, `VAT_REGIME_LABELS`, `NO_VAT_REGIME`)
- Produces: `OptionalDateField({ id, name, label, value, onChange, errors }: { id: string; name: string; label: string; value: Date | undefined; onChange: (date: Date | undefined) => void; errors: string[] | undefined })`, réutilisé par `08` et `19` ; `AdminCompany["legalEntity"]` et `AdminCompanyDetail["legalEntity"]` = `(LegalEntity & { address: Address | null; publisher: Publisher | null }) | null` ; `LegalEntityCard({ formId, errors, legalEntity })`, bloc TVA affiché seulement quand `legalEntity.publisher` est présent

- [ ] **Step 1 : Requêtes**

Dans `src/server/queries/companies.ts`, remplacer dans `adminCompanyInclude` :

```ts
  legalEntity: { select: { id: true, name: true } },
```

par :

```ts
  legalEntity: { include: { address: true, publisher: true } },
```

et supprimer `findAvailableLegalEntities`.

- [ ] **Step 2 : Champ date facultative partagé**

`src/components/features/admin/OptionalDateField.tsx` (date seule qu'on efface depuis son propre panneau, son état d'ouverture interne : la date d'assujettissement à la TVA ici, puis la date de rencontre (`08`) et la date d'un signal (`19`) l'emploient sans le piloter) :

```tsx
"use client"

import { useState } from "react"
import { fr } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FormField } from "@/components/ui/form-field"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatShortDate, toIsoDate } from "@/lib/projects"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  name: string
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  errors: string[] | undefined
}

export function OptionalDateField({ id, name, label, value, onChange, errors }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <FormField id={id} label={label} errors={errors}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-invalid={!!errors?.length}
            aria-describedby={`${id}-error`}
            className={cn("w-full justify-start font-normal", !value && "text-muted-foreground")}
          >
            <CalendarIcon aria-hidden data-icon="inline-start" />
            {value ? formatShortDate(value) : "Choisir une date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            locale={fr}
            mode="single"
            selected={value}
            defaultMonth={value ?? new Date()}
            onSelect={(date) => {
              onChange(date)
              setOpen(false)
            }}
          />
          <div className="flex justify-end border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(undefined)
                setOpen(false)
              }}
            >
              Effacer
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <input type="hidden" name={name} value={value ? toIsoDate(value) : ""} />
    </FormField>
  )
}
```

- [ ] **Step 3 : Créer `LegalEntityCard`**

```tsx
"use client"

import { useState } from "react"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { OptionalDateField } from "@/components/features/admin/OptionalDateField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import type { Address, LegalEntity, LegalForm, Publisher } from "@/generated/prisma/client"
import { COMPANY_SECTION_TITLES } from "@/lib/companies"
import {
  CAPITAL_CURRENCIES,
  countryName,
  DEFAULT_CURRENCY,
  LEGAL_ENTITY_FIELD_LABELS as LABELS,
  LEGAL_FORM_GROUPS,
  LEGAL_FORM_LABELS,
  NO_COUNTRY,
  NO_VAT_REGIME,
  REGISTERED_OFFICE_COUNTRIES,
  VAT_REGIME_LABELS,
  VAT_REGIMES,
} from "@/lib/legal-entities"
import type { CompanyFormState } from "@/server/actions/companies.types"

interface Props {
  formId: string
  errors: CompanyFormState["errors"]
  legalEntity: (LegalEntity & { address: Address | null; publisher: Publisher | null }) | null
}

export function LegalEntityCard({ formId, errors, legalEntity }: Props) {
  const [statusKey, setStatusKey] = useState<LegalForm | "">(legalEntity?.legalForm ?? "")
  const [statusOpen, setStatusOpen] = useState(false)
  const [country, setCountry] = useState(legalEntity?.address?.country ?? NO_COUNTRY)
  const [vatLiableSince, setVatLiableSince] = useState<Date | undefined>(
    legalEntity?.publisher?.vatLiableSince ?? undefined,
  )
  const [moreOpen, setMoreOpen] = useState(
    legalEntity !== null &&
      [legalEntity.rcsCity, legalEntity.rcsNumber, legalEntity.phone, legalEntity.capitalAmount].some(
        (value) => value !== null,
      ),
  )

  const storedCountry = legalEntity?.address?.country
  const countries =
    storedCountry && !REGISTERED_OFFICE_COUNTRIES.some((code) => code === storedCountry)
      ? [...REGISTERED_OFFICE_COUNTRIES, storedCountry]
      : [...REGISTERED_OFFICE_COUNTRIES]

  const field = (name: string) => `${formId}-${name}`

  return (
    <Card>
      <CardHeader>
        <CardTitle>{COMPANY_SECTION_TITLES.legalEntity}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={field("legalEntityName")} label={LABELS.name} errors={errors.legalEntityName}>
            <Input
              id={field("legalEntityName")}
              name="legalEntityName"
              defaultValue={legalEntity?.name ?? ""}
              aria-invalid={!!errors.legalEntityName?.length}
              aria-describedby={`${field("legalEntityName")}-error`}
            />
          </FormField>

          <FormField
            id={field("legalEntityStatusKey")}
            label={LABELS.legalForm}
            errors={errors.legalEntityStatusKey}
          >
            <ComboboxPopover
              id={field("legalEntityStatusKey")}
              open={statusOpen}
              onOpenChange={setStatusOpen}
              triggerContent={
                <span className={statusKey ? undefined : "text-muted-foreground"}>
                  {statusKey ? LEGAL_FORM_LABELS[statusKey] : "Choisir une forme"}
                </span>
              }
              ariaInvalid={!!errors.legalEntityStatusKey?.length}
              ariaDescribedby={`${field("legalEntityStatusKey")}-error`}
              searchPlaceholder="Chercher une forme"
              emptyMessage="Aucune forme ne correspond."
            >
              <CommandGroup>
                <CommandItem
                  value="__none__"
                  keywords={["Aucune"]}
                  onSelect={() => {
                    setStatusKey("")
                    setStatusOpen(false)
                  }}
                >
                  Aucune
                </CommandItem>
              </CommandGroup>
              {LEGAL_FORM_GROUPS.map((group) => (
                <CommandGroup key={group.country} heading={group.country}>
                  {group.forms.map((form) => (
                    <CommandItem
                      key={form}
                      value={form}
                      keywords={[LEGAL_FORM_LABELS[form], group.country]}
                      data-checked={statusKey === form}
                      onSelect={() => {
                        setStatusKey(form)
                        setStatusOpen(false)
                      }}
                    >
                      {LEGAL_FORM_LABELS[form]}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </ComboboxPopover>
            <input type="hidden" name="legalEntityStatusKey" value={statusKey} />
          </FormField>

          <FormField id={field("legalEntitySiret")} label={LABELS.siret} errors={errors.legalEntitySiret}>
            <Input
              id={field("legalEntitySiret")}
              name="legalEntitySiret"
              inputMode="numeric"
              placeholder="14 chiffres"
              defaultValue={legalEntity?.siret ?? ""}
              aria-invalid={!!errors.legalEntitySiret?.length}
              aria-describedby={`${field("legalEntitySiret")}-error`}
            />
          </FormField>

          <FormField
            id={field("legalEntityVatNumber")}
            label={LABELS.vatNumber}
            errors={errors.legalEntityVatNumber}
          >
            <Input
              id={field("legalEntityVatNumber")}
              name="legalEntityVatNumber"
              defaultValue={legalEntity?.vatNumber ?? ""}
              aria-invalid={!!errors.legalEntityVatNumber?.length}
              aria-describedby={`${field("legalEntityVatNumber")}-error`}
            />
          </FormField>
        </div>

        <Separator />
        <span className="text-sm font-medium">{LABELS.registeredOffice}</span>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id={field("legalEntityStreet")} label={LABELS.street} errors={errors.legalEntityStreet}>
            <Input
              id={field("legalEntityStreet")}
              name="legalEntityStreet"
              defaultValue={legalEntity?.address?.street ?? ""}
              aria-invalid={!!errors.legalEntityStreet?.length}
              aria-describedby={`${field("legalEntityStreet")}-error`}
            />
          </FormField>
          <FormField
            id={field("legalEntityPostalCode")}
            label={LABELS.postalCode}
            errors={errors.legalEntityPostalCode}
          >
            <Input
              id={field("legalEntityPostalCode")}
              name="legalEntityPostalCode"
              defaultValue={legalEntity?.address?.postalCode ?? ""}
              aria-invalid={!!errors.legalEntityPostalCode?.length}
              aria-describedby={`${field("legalEntityPostalCode")}-error`}
            />
          </FormField>
          <FormField id={field("legalEntityCity")} label={LABELS.city} errors={errors.legalEntityCity}>
            <Input
              id={field("legalEntityCity")}
              name="legalEntityCity"
              defaultValue={legalEntity?.address?.city ?? ""}
              aria-invalid={!!errors.legalEntityCity?.length}
              aria-describedby={`${field("legalEntityCity")}-error`}
            />
          </FormField>
          <FormField id={field("legalEntityCountry")} label={LABELS.country} errors={errors.legalEntityCountry}>
            <Select name="legalEntityCountry" value={country} onValueChange={setCountry}>
              <SelectTrigger
                id={field("legalEntityCountry")}
                className="w-full"
                aria-invalid={!!errors.legalEntityCountry?.length}
                aria-describedby={`${field("legalEntityCountry")}-error`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_COUNTRY}>Non renseigné</SelectItem>
                {countries.map((code) => (
                  <SelectItem key={code} value={code}>
                    {countryName(code)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start"
          aria-expanded={moreOpen}
          aria-controls={field("legalEntityMore")}
          onClick={() => {
            setMoreOpen((open) => !open)
          }}
        >
          Autres informations
        </Button>

        {/* Reste dans le DOM sous hidden : replié, l'action lirait sinon ces champs vides et effacerait capital, RCS et téléphone. */}
        <div id={field("legalEntityMore")} hidden={!moreOpen} className="grid gap-4 sm:grid-cols-2">
          {country === "FR" ? (
            // En France, le SIREN tiré du SIRET tient lieu de numéro RCS : la ville du RCS s'apparie avec le téléphone.
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
              <FormField
                id={field("legalEntityRcsCity")}
                label={LABELS.rcsCity}
                errors={errors.legalEntityRcsCity}
              >
                <Input
                  id={field("legalEntityRcsCity")}
                  name="legalEntityRcsCity"
                  defaultValue={legalEntity?.rcsCity ?? ""}
                />
              </FormField>
              <FormField id={field("legalEntityPhone")} label={LABELS.phone} errors={errors.legalEntityPhone}>
                <Input
                  id={field("legalEntityPhone")}
                  name="legalEntityPhone"
                  type="tel"
                  defaultValue={legalEntity?.phone ?? ""}
                />
              </FormField>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <FormField
                  id={field("legalEntityRcsCity")}
                  label={LABELS.rcsCity}
                  errors={errors.legalEntityRcsCity}
                >
                  <Input
                    id={field("legalEntityRcsCity")}
                    name="legalEntityRcsCity"
                    defaultValue={legalEntity?.rcsCity ?? ""}
                  />
                </FormField>
                <FormField
                  id={field("legalEntityRcsNumber")}
                  label={LABELS.rcsNumber}
                  errors={errors.legalEntityRcsNumber}
                >
                  <Input
                    id={field("legalEntityRcsNumber")}
                    name="legalEntityRcsNumber"
                    defaultValue={legalEntity?.rcsNumber ?? ""}
                  />
                </FormField>
              </div>
              <div className="sm:col-span-2">
                <FormField id={field("legalEntityPhone")} label={LABELS.phone} errors={errors.legalEntityPhone}>
                  <Input
                    id={field("legalEntityPhone")}
                    name="legalEntityPhone"
                    type="tel"
                    defaultValue={legalEntity?.phone ?? ""}
                  />
                </FormField>
              </div>
            </>
          )}

          <div className="grid grid-cols-[2fr_1fr] gap-4 sm:col-span-2">
            <FormField
              id={field("legalEntityCapitalAmount")}
              label={LABELS.capitalAmount}
              errors={errors.legalEntityCapitalAmount}
            >
              <Input
                id={field("legalEntityCapitalAmount")}
                name="legalEntityCapitalAmount"
                inputMode="numeric"
                className="text-right tabular-nums"
                defaultValue={legalEntity?.capitalAmount?.toString() ?? ""}
                aria-invalid={!!errors.legalEntityCapitalAmount?.length}
                aria-describedby={`${field("legalEntityCapitalAmount")}-error`}
              />
            </FormField>
            <FormField
              id={field("legalEntityCapitalCurrency")}
              label={LABELS.capitalCurrency}
              errors={errors.legalEntityCapitalCurrency}
            >
              <Select
                name="legalEntityCapitalCurrency"
                defaultValue={legalEntity?.capitalCurrency ?? DEFAULT_CURRENCY}
              >
                <SelectTrigger id={field("legalEntityCapitalCurrency")} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPITAL_CURRENCIES.map((currency) => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>
        </div>

        {legalEntity?.publisher ? (
          <>
            <Separator />
            <span className="text-sm font-medium">{LABELS.vatSectionTitle}</span>
            <div className="grid gap-4 sm:grid-cols-2">
              <OptionalDateField
                id={field("legalEntityVatLiableSince")}
                name="legalEntityVatLiableSince"
                label={LABELS.vatLiableSince}
                value={vatLiableSince}
                onChange={setVatLiableSince}
                errors={errors.legalEntityVatLiableSince}
              />

              <FormField
                id={field("legalEntityVatRegime")}
                label={LABELS.vatRegime}
                errors={errors.legalEntityVatRegime}
              >
                <Select
                  name="legalEntityVatRegime"
                  defaultValue={legalEntity.publisher.vatRegime ?? NO_VAT_REGIME}
                >
                  <SelectTrigger
                    id={field("legalEntityVatRegime")}
                    className="w-full"
                    aria-invalid={!!errors.legalEntityVatRegime?.length}
                    aria-describedby={`${field("legalEntityVatRegime")}-error`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_VAT_REGIME}>Non renseigné</SelectItem>
                    {VAT_REGIMES.map((regime) => (
                      <SelectItem key={regime} value={regime}>
                        {VAT_REGIME_LABELS[regime]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4 : Brancher la card dans le formulaire**

Dans `src/components/features/admin/companies/CompanyForm.tsx` :

- importer `LegalEntityCard` ;
- retirer la prop `legalEntities` de `Props`, de la signature et l'import de `LegalEntity` ;
- remplacer toute la card Entité légale (le `Card` qui contient le `Select` `legalEntityId`) par :

```tsx
          <LegalEntityCard
            formId={formId}
            errors={state.errors}
            legalEntity={company?.legalEntity ?? null}
          />
```

Les imports de `Select` restent tant qu'un autre champ du formulaire s'en sert ; sinon les retirer.

- [ ] **Step 5 : Pages**

Dans `nouvelle/page.tsx` et `[id]/page.tsx`, retirer `findAvailableLegalEntities` de l'import, du `Promise.all` et la prop `legalEntities` passée à `CompanyForm`.

- [ ] **Step 6 : Mapping de `docs/DESIGN.md`**

Charger le skill `design-doc`, puis déplacer la ligne « Date facultative » de § Post-MVP (non installés) vers § Formulaires, sans sa dernière phrase (« Rejoint § … ») : le composant est installé.

- [ ] **Step 7 : Vérifier**

Run: `just typecheck`
Expected: aucune erreur hors `CompaniesTable.tsx` (bloc de la vue détail, Task 5).

---

### Task 5 : Bloc Entité légale de la vue détail

**Files:**
- Modify: `src/components/features/admin/companies/CompaniesTable.tsx` (fonction `buildCompanyDetail`)

**Interfaces:**
- Consumes: `AdminCompany["legalEntity"]` (Task 4), `LEGAL_FORM_LABELS`, `sirenFromSiret`, `countryName`, `LEGAL_ENTITY_FIELD_LABELS` (Task 2), `formatSiret` (`@/lib/legal/format-siret`)
- Produces: rien

- [ ] **Step 1 : Construire les lignes de l'entité**

Ajouter les imports :

```tsx
import {
  countryName,
  LEGAL_ENTITY_FIELD_LABELS as LEGAL_LABELS,
  LEGAL_FORM_LABELS,
  sirenFromSiret,
} from "@/lib/legal-entities"
import { formatSiret } from "@/lib/legal/format-siret"
```

ajouter `type DetailSection` à l'import existant de `@/components/features/admin/DetailDialog`, et, avant `buildCompanyDetail` :

```tsx
const CAPITAL_FORMATTER = new Intl.NumberFormat("fr")

function legalEntitySections(company: AdminCompany): DetailSection[] {
  const entity = company.legalEntity
  // Arbitrage « bloc sans donnée » : pas de bloc pour une entreprise sans entité légale.
  if (!entity) return []

  const siren = sirenFromSiret(entity.siret)
  const registration =
    entity.address?.country === "FR"
      ? entity.rcsCity && siren
        ? `RCS ${entity.rcsCity} ${siren}`
        : null
      : [entity.rcsCity, entity.rcsNumber].filter(Boolean).join(" ") || null

  return [
    {
      title: COMPANY_SECTION_TITLES.legalEntity,
      rows: [
        { label: LEGAL_LABELS.name, value: entity.name },
        {
          label: LEGAL_LABELS.legalForm,
          value: entity.legalForm ? <Badge variant="secondary">{LEGAL_FORM_LABELS[entity.legalForm]}</Badge> : null,
        },
        { label: LEGAL_LABELS.siret, value: entity.siret ? formatSiret(entity.siret) : null },
        { label: LEGAL_LABELS.vatNumber, value: entity.vatNumber },
        {
          label: LEGAL_LABELS.registeredOffice,
          fullWidth: true,
          value: entity.address ? (
            <span className="whitespace-pre-line">
              {`${entity.address.street}\n${entity.address.postalCode} ${entity.address.city}\n${countryName(entity.address.country)}`}
            </span>
          ) : null,
        },
        { label: LEGAL_LABELS.registration, value: registration },
        { label: LEGAL_LABELS.phone, value: entity.phone },
        {
          // Seul sans paire après le siège : pleine largeur plutôt qu'une case vide à côté.
          label: LEGAL_LABELS.capitalAmount,
          fullWidth: true,
          value:
            entity.capitalAmount !== null
              ? `${CAPITAL_FORMATTER.format(entity.capitalAmount)} ${entity.capitalCurrency ?? ""}`.trim()
              : null,
        },
      ],
    },
  ]
}
```

- [ ] **Step 2 : Remplacer l'ancien bloc**

Dans `buildCompanyDetail`, remplacer :

```tsx
      {
        title: COMPANY_SECTION_TITLES.legalEntity,
        rows: [{ value: company.legalEntity?.name }],
      },
```

par :

```tsx
      ...legalEntitySections(company),
```

- [ ] **Step 3 : Qualité**

Run: `just typecheck`
Expected: aucune erreur.

Run: `just lint`
Expected: aucune erreur (si le formatage échoue : `just format`, puis relancer).

Run: `just test`
Expected: suites `unit` et `integration` vertes.

---

### Task 6 : Parcours manuel

**Files:**
- Aucun fichier modifié

**Interfaces:**
- Consumes: Tasks 1 à 5
- Produces: rien

- [ ] **Step 1 : Entité vide puis minimale**

Run: `just dev`, se connecter. Créer une entreprise sans toucher à la card Entité légale, enregistrer.
Expected: enregistrement accepté, aucune erreur ; la vue détail n'a pas de bloc Entité légale.

Rouvrir la fiche, saisir seulement la raison sociale et un siège complet, sans forme juridique ni SIRET, enregistrer.
Expected: enregistrement accepté ; la vue détail montre le bloc Entité légale avec la raison sociale et le siège, des tirets ailleurs.

- [ ] **Step 2 : Entité complétée**

Rouvrir la fiche, choisir SAS (groupe France), saisir un SIRET avec espaces, un numéro de TVA, un siège complet en France, enregistrer.
Expected: la vue détail montre le SIRET formaté, la TVA, le siège sur trois lignes ; le champ Numéro RCS n'apparaît pas pour un siège en France.

- [ ] **Step 3 : Champs repliés**

Ouvrir « Autres informations », saisir un téléphone et un capital, enregistrer. Rouvrir la fiche : le bloc s'ouvre seul. Le replier, modifier seulement la raison sociale, enregistrer.
Expected: téléphone et capital sont conservés.

- [ ] **Step 4 : Siège requis dès qu'un champ est rempli**

Sur cette fiche, vider les quatre champs du siège en gardant la raison sociale, enregistrer.
Expected: rue, code postal, ville et pays signalés « Requis pour un siège complet » ; rien n'est enregistré, le siège reste celui d'avant en base (`just db-studio`).

- [ ] **Step 5 : Erreurs sur une entité neuve**

Sur une entreprise sans entité légale, saisir seulement la ville du siège, puis un SIRET de 13 chiffres, enregistrer.
Expected: la raison sociale, la rue, le code postal et le pays sont signalés « requis » (la raison sociale avec « La raison sociale est requise ») ; le SIRET avec « Le SIRET compte 14 chiffres » ; rien n'est enregistré.

- [ ] **Step 6 : Mentions légales**

Sur la fiche de la société du propriétaire (`thibaud-geisler`), modifier le téléphone de l'entité, enregistrer, ouvrir `/fr/mentions-legales`.
Expected: la page s'affiche comme avant ; les données de l'éditeur reflètent l'entité en base. Remettre la valeur d'origine.

- [ ] **Step 7 : TVA de l'éditeur**

Sur la même fiche, renseigner le numéro de TVA de l'entité (fictif, `FR00000000000`), « Assujetti à la TVA depuis le » à la date du jour et « Régime » à Réel simplifié, enregistrer, ouvrir `/fr/mentions-legales` et `/en/mentions-legales`.
Expected: le numéro de TVA intracommunautaire remplace la mention « TVA non applicable, article 293 B » dans les deux langues ; le JSON-LD de `/fr/a-propos` porte `vatID`. Vider ensuite les trois champs, enregistrer : la mention 293 B revient.

- [ ] **Step 8 : Suppression**

Supprimer l'entreprise de test.
Expected: elle disparaît de la liste ; `just db-studio` ne montre plus son entité légale ni son adresse. Puis `just stop`.
