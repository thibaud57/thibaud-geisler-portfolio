-- Destinataires des sessions d'agent-os (registre, Traitement 7) : Telegram, OpenRouter, Jina AI, Bright Data,
-- et Sentry, dont le traitement couvre aussi les erreurs des sessions.
-- Adresses relues le 2026-11-27 : OpenRouter sur https://openrouter.ai/terms (section 22) et son DPA (Schedule 1),
-- Jina AI sur https://jina.ai/legal (Imprint), Bright Data sur https://brightdata.com/license.
-- Telegram Messenger Inc. ne publie pas d'adresse postale (https://telegram.org/privacy, section 1.4) : entité sans adresse.
-- Instructions rejouables : chaque traitement lit l'entité que l'instruction précédente a écrite.

-- Telegram Messenger Inc., responsable de traitement distinct (relais des questions et alertes des agents)
INSERT INTO "public"."LegalEntity" ("id", "slug", "name", "updatedAt")
VALUES (uuidv7(), 'telegram-messenger', 'Telegram Messenger Inc.', now())
ON CONFLICT ("slug") DO NOTHING;

-- OpenRouter, Inc., sous-traitant de la détection d'injection (modèle Jev de TypeSafe AI)
WITH "new_address" AS (
  INSERT INTO "public"."Address" ("id", "street", "postalCode", "city", "country", "updatedAt")
  SELECT uuidv7(), '169 Madison Avenue #2404', '10016', 'New York', 'US', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM "public"."LegalEntity" WHERE "slug" = 'openrouter'
  )
  RETURNING "id"
)
INSERT INTO "public"."LegalEntity" ("id", "slug", "name", "legalForm", "addressId", "updatedAt")
SELECT uuidv7(), 'openrouter', 'OpenRouter, Inc.', 'INCORPORATED_US'::"public"."LegalForm", "id", now()
FROM "new_address"
ON CONFLICT ("slug") DO NOTHING;

-- Jina AI GmbH (groupe Elastic), sous-traitant de la recherche et de la lecture web
WITH "new_address" AS (
  INSERT INTO "public"."Address" ("id", "street", "postalCode", "city", "country", "updatedAt")
  SELECT uuidv7(), 'Prinzessinnenstraße 19-20', '10969', 'Berlin', 'DE', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM "public"."LegalEntity" WHERE "slug" = 'jina-ai'
  )
  RETURNING "id"
)
INSERT INTO "public"."LegalEntity" ("id", "slug", "name", "addressId", "updatedAt")
SELECT uuidv7(), 'jina-ai', 'Jina AI GmbH', "id", now()
FROM "new_address"
ON CONFLICT ("slug") DO NOTHING;

-- Bright Data Ltd., sous-traitant de la lecture web
WITH "new_address" AS (
  INSERT INTO "public"."Address" ("id", "street", "postalCode", "city", "country", "updatedAt")
  SELECT uuidv7(), '4 Hamahshev St.', '4250714', 'Netanya', 'IL', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM "public"."LegalEntity" WHERE "slug" = 'bright-data'
  )
  RETURNING "id"
)
INSERT INTO "public"."LegalEntity" ("id", "slug", "name", "addressId", "updatedAt")
SELECT uuidv7(), 'bright-data', 'Bright Data Ltd.', "id", now()
FROM "new_address"
ON CONFLICT ("slug") DO NOTHING;

-- Traitements rattachés à ces entités
INSERT INTO "public"."DataProcessing" (
  "id", "slug", "processorLegalEntityId", "kind", "purposeFr", "purposeEn",
  "dataCategories", "retentionPolicyKey", "legalBasis", "outsideEuFramework", "displayOrder", "updatedAt"
)
SELECT
  uuidv7(),
  'telegram-agent-relay',
  "LegalEntity"."id",
  'MESSAGING'::"public"."ProcessingKind",
  'Relais au responsable des questions, demandes d''autorisation et alertes de ses agents IA, qui peuvent citer une fiche de prospection',
  'Relay of the controller''s AI agents'' questions, approval requests and alerts, which may quote a prospecting record',
  ARRAY['IDENTITY', 'CONTACT', 'PROFESSIONAL_INFO']::"public"."DataCategory"[],
  'telegramChat',
  'LEGITIMATE_INTERESTS'::"public"."LegalBasis",
  'STANDARD_CONTRACTUAL_CLAUSES'::"public"."OutsideEuFramework",
  (SELECT COALESCE(MAX("displayOrder"), 0) + 1 FROM "public"."DataProcessing"),
  now()
FROM "public"."LegalEntity"
WHERE "LegalEntity"."slug" = 'telegram-messenger'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "public"."DataProcessing" (
  "id", "slug", "processorLegalEntityId", "kind", "purposeFr", "purposeEn",
  "dataCategories", "retentionPolicyKey", "legalBasis", "outsideEuFramework", "displayOrder", "updatedAt"
)
SELECT
  uuidv7(),
  'openrouter-ai-screening',
  "LegalEntity"."id",
  'AI_SCREENING'::"public"."ProcessingKind",
  'Détection d''injection de prompt dans les pages web lues par les agents IA (modèle Jev de TypeSafe AI)',
  'Prompt injection detection in the web pages read by the AI agents (Jev model by TypeSafe AI)',
  ARRAY['IDENTITY', 'PROFESSIONAL_INFO']::"public"."DataCategory"[],
  'noContentRetention',
  'LEGITIMATE_INTERESTS'::"public"."LegalBasis",
  'STANDARD_CONTRACTUAL_CLAUSES'::"public"."OutsideEuFramework",
  (SELECT COALESCE(MAX("displayOrder"), 0) + 1 FROM "public"."DataProcessing"),
  now()
FROM "public"."LegalEntity"
WHERE "LegalEntity"."slug" = 'openrouter'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "public"."DataProcessing" (
  "id", "slug", "processorLegalEntityId", "kind", "purposeFr", "purposeEn",
  "dataCategories", "retentionPolicyKey", "legalBasis", "outsideEuFramework", "displayOrder", "updatedAt"
)
SELECT
  uuidv7(),
  'jina-web-search',
  "LegalEntity"."id",
  'WEB_SEARCH'::"public"."ProcessingKind",
  'Recherche et lecture de pages web par les agents IA, pour le sourcing et l''enrichissement des fiches de prospection',
  'Web search and page reading by the AI agents, to source and enrich prospecting records',
  ARRAY['IDENTITY', 'PROFESSIONAL_INFO']::"public"."DataCategory"[],
  'recipientTerms',
  'LEGITIMATE_INTERESTS'::"public"."LegalBasis",
  'DATA_PRIVACY_FRAMEWORK'::"public"."OutsideEuFramework",
  (SELECT COALESCE(MAX("displayOrder"), 0) + 1 FROM "public"."DataProcessing"),
  now()
FROM "public"."LegalEntity"
WHERE "LegalEntity"."slug" = 'jina-ai'
ON CONFLICT ("slug") DO NOTHING;

INSERT INTO "public"."DataProcessing" (
  "id", "slug", "processorLegalEntityId", "kind", "purposeFr", "purposeEn",
  "dataCategories", "retentionPolicyKey", "legalBasis", "outsideEuFramework", "displayOrder", "updatedAt"
)
SELECT
  uuidv7(),
  'brightdata-web-search',
  "LegalEntity"."id",
  'WEB_SEARCH'::"public"."ProcessingKind",
  'Lecture de pages web par les agents IA, pour le sourcing et l''enrichissement des fiches de prospection',
  'Web page reading by the AI agents, to source and enrich prospecting records',
  ARRAY['IDENTITY', 'PROFESSIONAL_INFO']::"public"."DataCategory"[],
  'recipientTerms',
  'LEGITIMATE_INTERESTS'::"public"."LegalBasis",
  'ADEQUACY_DECISION'::"public"."OutsideEuFramework",
  (SELECT COALESCE(MAX("displayOrder"), 0) + 1 FROM "public"."DataProcessing"),
  now()
FROM "public"."LegalEntity"
WHERE "LegalEntity"."slug" = 'bright-data'
ON CONFLICT ("slug") DO NOTHING;

-- Sentry : le suivi des erreurs couvre aussi les sessions des agents, dont un message d'erreur peut citer une fiche
UPDATE "public"."DataProcessing"
SET
  "purposeFr" = 'Diagnostic et correction des erreurs applicatives du site et des sessions de ses agents IA',
  "purposeEn" = 'Diagnosis and fixing of application errors on the site and in its AI agents'' sessions',
  "dataCategories" = ARRAY['IP_ADDRESS', 'TECHNICAL_LOGS', 'PROFESSIONAL_INFO']::"public"."DataCategory"[],
  "updatedAt" = now()
WHERE "slug" = 'sentry-error-monitoring';
