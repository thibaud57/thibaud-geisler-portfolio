UPDATE "public"."Project"
SET "coverFilename" = replace("coverFilename", 'projets/client/foyer/', 'projets/client/webapp-gestion-sinistres/')
WHERE "coverFilename" LIKE 'projets/client/foyer/%';

UPDATE "public"."Project"
SET "coverFilename" = replace("coverFilename", 'projets/client/theodo-extend/', 'projets/client/chatbot-agents-ia/')
WHERE "coverFilename" LIKE 'projets/client/theodo-extend/%';

UPDATE "public"."Project"
SET "coverFilename" = replace("coverFilename", 'projets/client/wanted-design/', 'projets/client/referent-ia-automatisation/')
WHERE "coverFilename" LIKE 'projets/client/wanted-design/%';

UPDATE "public"."Project"
SET "coverFilename" = replace("coverFilename", 'projets/client/paysystem/', 'projets/client/saas-gestion-paie/')
WHERE "coverFilename" LIKE 'projets/client/paysystem/%';

UPDATE "public"."Project"
SET "coverFilename" = replace("coverFilename", 'projets/client/cloudsmart/', 'projets/client/erp-odoo-android/')
WHERE "coverFilename" LIKE 'projets/client/cloudsmart/%';

UPDATE "freelance"."Company"
SET "logoFilename" = 'freelance/crm/entreprises/' || "slug" || '/logo.png'
WHERE "logoFilename" IS NOT NULL;
