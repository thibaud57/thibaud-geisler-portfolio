-- Renomme la ligne au lieu d'en créer une seconde : l'id ne change pas, les ClientMeta déjà
-- rattachés suivent, et le seed (upsert par slug) retrouve ensuite la même entreprise.
UPDATE "freelance"."Company"
SET "slug" = 'thibaud-geisler',
    "name" = 'Thibaud Geisler',
    "websiteUrl" = 'https://thibaud-geisler.com',
    "logoFilename" = 'branding/favicon-light.png'
WHERE "slug" = 'personnel';
