-- Anthropic Ireland, Limited, destinataire des fiches CRM lues par l'assistant IA.
-- Adresse relue sur https://www.anthropic.com/legal/privacy le 2026-11-07 (section 9, Contact Information).
-- Deux instructions rejouables : la seconde lit la ligne que la première a écrite.

-- Entité et adresse (l'adresse n'est écrite que si l'entité n'existe pas encore)
WITH "new_address" AS (
  INSERT INTO "public"."Address" ("id", "street", "postalCode", "city", "country", "updatedAt")
  SELECT uuidv7(), '6th Floor, South Bank House, Barrow Street', 'D04 TR29', 'Dublin 4', 'IE', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM "public"."LegalEntity" WHERE "slug" = 'anthropic-ireland'
  )
  RETURNING "id"
)
INSERT INTO "public"."LegalEntity" ("id", "slug", "name", "addressId", "updatedAt")
SELECT uuidv7(), 'anthropic-ireland', 'Anthropic Ireland, Limited', "id", now()
FROM "new_address"
ON CONFLICT ("slug") DO NOTHING;

-- Traitement rattaché à cette entité
INSERT INTO "public"."DataProcessing" (
  "id", "slug", "processorLegalEntityId", "kind", "purposeFr", "purposeEn",
  "dataCategories", "retentionPolicyKey", "legalBasis", "displayOrder", "updatedAt"
)
SELECT
  uuidv7(),
  'anthropic-ai-assistant',
  "LegalEntity"."id",
  'AI_ASSISTANT'::"public"."ProcessingKind",
  'Assistant IA (Claude) qui consulte et met à jour les fiches de prospection à la demande du responsable',
  'AI assistant (Claude) that reads and updates prospecting records at the controller''s request',
  ARRAY['IDENTITY', 'CONTACT', 'PROFESSIONAL_INFO']::"public"."DataCategory"[],
  'recipientTerms',
  'LEGITIMATE_INTERESTS'::"public"."LegalBasis",
  (SELECT COALESCE(MAX("displayOrder"), 0) + 1 FROM "public"."DataProcessing"),
  now()
FROM "public"."LegalEntity"
WHERE "LegalEntity"."slug" = 'anthropic-ireland'
ON CONFLICT ("slug") DO NOTHING;
