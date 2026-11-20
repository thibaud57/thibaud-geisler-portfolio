-- Functional Software, Inc. (Sentry), sous-traitant du suivi des erreurs (registre, Traitement 4).
-- Adresse et certification DPF relues sur https://sentry.io/privacy/ et https://sentry.io/legal/dpa/ (Schedule 3) le 2026-11-20.
-- Données hébergées en région UE (Francfort), mais entité américaine : accès possible depuis les États-Unis, d'où le DPF.
-- Deux instructions rejouables : la seconde lit la ligne que la première a écrite.

-- Entité et adresse (l'adresse n'est écrite que si l'entité n'existe pas encore)
WITH "new_address" AS (
  INSERT INTO "public"."Address" ("id", "street", "postalCode", "city", "country", "updatedAt")
  SELECT uuidv7(), '45 Fremont Street, 8th Floor', '94105', 'San Francisco', 'US', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM "public"."LegalEntity" WHERE "slug" = 'functional-software'
  )
  RETURNING "id"
)
INSERT INTO "public"."LegalEntity" ("id", "slug", "name", "legalForm", "addressId", "updatedAt")
SELECT uuidv7(), 'functional-software', 'Functional Software, Inc. (Sentry)', 'INCORPORATED_US'::"public"."LegalForm", "id", now()
FROM "new_address"
ON CONFLICT ("slug") DO NOTHING;

-- Traitement rattaché à cette entité
INSERT INTO "public"."DataProcessing" (
  "id", "slug", "processorLegalEntityId", "kind", "purposeFr", "purposeEn",
  "dataCategories", "retentionPolicyKey", "legalBasis", "outsideEuFramework", "displayOrder", "updatedAt"
)
SELECT
  uuidv7(),
  'sentry-error-monitoring',
  "LegalEntity"."id",
  'ERROR_MONITORING'::"public"."ProcessingKind",
  'Diagnostic et correction des erreurs applicatives du site',
  'Diagnosis and fixing of the site''s application errors',
  ARRAY['IP_ADDRESS', 'TECHNICAL_LOGS']::"public"."DataCategory"[],
  'errors30Days',
  'LEGITIMATE_INTERESTS'::"public"."LegalBasis",
  'DATA_PRIVACY_FRAMEWORK'::"public"."OutsideEuFramework",
  (SELECT COALESCE(MAX("displayOrder"), 0) + 1 FROM "public"."DataProcessing"),
  now()
FROM "public"."LegalEntity"
WHERE "LegalEntity"."slug" = 'functional-software'
ON CONFLICT ("slug") DO NOTHING;
