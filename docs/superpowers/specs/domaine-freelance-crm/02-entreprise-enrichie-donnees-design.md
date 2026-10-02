---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "entreprise-enrichie-donnees"
goal: "Porter sur Company les champs de la fiche entreprise du CRM (types, statut de la relation, zones, notes), corriger secteurs et tailles et fermer le site public aux champs CRM."
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: []
date: "2026-09-26"
---

# Données de la fiche entreprise enrichie

## Scope

Ajoute au modèle `Company` les champs de la fiche entreprise du CRM, avec leur migration, leur validation et leurs Server Actions ; renomme et complète les secteurs ; aligne les libellés de taille sur les catégories légales ; restreint la lecture publique d'une entreprise aux seuls champs affichés. Exclut le formulaire (`03`), la liste et la vue détail (`04`), l'entité légale (`05`), le logo (`06`) et les outils de saisie des temps, reportés au suivi de mission. Travaillée, prospect, premier contact et clients finaux ne sont plus des champs de `Company` : ce sont des propriétés dérivées, introduites plus tard dans `AdminCompany` respectivement par les sub-projects `04`, `08`, `10` et `15`.

### État livré

À la fin de ce sub-project, on peut : appliquer la migration sur la base de dev et constater que les entreprises liées à un projet client portent le type `CLIENT_FINAL`, que `thibaud-geisler` porte `MA_SOCIETE`, faire passer les tests unitaires des actions entreprises avec les nouveaux champs et vérifier qu'une page projet publique ne transporte aucun champ CRM.

## Dependencies

Aucune : ce sub-project est autoporté.

## Files touched

- **À modifier** : `prisma/schema.prisma` (enums `CompanyType`, `RelationStatus`, `Zone` créés, `CompanySector` renommé et complété, champs de `Company`)
- **À créer** : `prisma/migrations/<horodatage>_company_crm_fields/migration.sql` (généré en `--create-only` puis édité : renommage de valeur, rattrapage des données)
- **À modifier** : `src/lib/schemas/company.ts` (listes lues depuis les enums Prisma, nouveaux champs, secteurs facultatifs)
- **À modifier** : `src/lib/companies.ts` (libellés des types, du statut de la relation, des tailles, des secteurs ajoutés, des nouveaux champs, `COMPANY_TYPE_ICONS`, `COMPANY_STATUS_ICONS`)
- **À créer** : `src/lib/zones.ts` (`ZONES` dans l'ordre canonique, `ZONE_LABELS`, `sortZones`, partagés avec leads et contacts)
- **À créer** : `src/lib/zones.test.ts` (`sortZones`)
- **À modifier** : `src/lib/server-utils.ts` (`optionalStringField`, `optionalStringValues` : champ absent du `FormData` distingué d'un champ vide, réutilisés par leads et contacts)
- **À modifier** : `src/server/actions/companies.ts` (lecture des nouveaux champs, champ absent laissé inchangé)
- **À modifier** : `src/server/actions/companies.test.ts` (cas des nouveaux champs ; le cas « rejects an empty sectors list » devient « accepts an empty sectors list »)
- **À modifier** : `src/types/project.ts` (`PROJECT_INCLUDE` : entreprise lue par `select` des champs publics)
- **À modifier** : `src/server/queries/projects.integration.test.ts` (aucun champ CRM dans le payload public)
- **À modifier** : `src/components/features/projects/ProjectsList.test.tsx` (fabrique d'entreprise alignée sur le type public)
- **À modifier** : `messages/fr.json` et `messages/en.json` (`Projects.caseStudy.sector` : clé renommée et trois ajouts ; `Projects.caseStudy.companySize` : catégories légales)
- **À modifier** : `docs/BRAINSTORM.md` (outils de saisie des temps reportés au suivi de mission)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`) : sur `Company`, schema `freelance` :
  - `types CompanyType[] @default([])` : `CLIENT_FINAL`, `ESN_RECRUTEMENT`, `PARTENAIRE`, `MA_SOCIETE`
  - `relationStatus RelationStatus @default(ACTIVE)` : `ACTIVE`, `DORMANTE`, `ARCHIVEE`
  - `zones Zone[] @default([])` : `GRAND_EST`, `PARIS`, `FRANCE`, `LUXEMBOURG`, `BELGIQUE`, `SUISSE`, `ALLEMAGNE`, `EUROPE`, `MONDE`, ordre canonique. L'enum `Zone` est partagé : leads et contacts le reprendront au singulier, l'absence de zone remplace la valeur « Inconnu » de Notion
  - `notes String?` : ligne courte de marqueurs (calquée sur la propriété Notes d'une ligne de Notion), au plus 200 caractères
  - `details String?` : corps de fiche markdown long (calqué sur le corps de page structuré de Notion), saisi avec l'éditeur Pages CMS Editor (`03`, ADR-024), rendu dans la vue détail par `MarkdownContent`
  - `CompanySector` : `EMARKETING` renommé `MARKETING_COMMUNICATION`, ajout de `INDUSTRIE`, `HEALTHTECH`, `SECTEUR_PUBLIC`
  - `CompanySize` inchangé en base
  - Travaillée, premier contact, clients finaux et prospect ne sont pas des colonnes : ce sont des propriétés dérivées d'`AdminCompany`, calculées dans `src/server/queries/companies.ts` et introduites respectivement par les sub-projects `04`, `10`, `15` et `08`
- **Migration** : générée par `prisma migrate dev --create-only --name company_crm_fields`, puis éditée à la main :
  - le renommage de valeur s'écrit `ALTER TYPE ... RENAME VALUE`, là où Prisma recrée le type, ce qui perdrait les lignes qui portent `EMARKETING`
  - `ADD VALUE` pour les trois secteurs, qui ne sont pas utilisés dans la même migration (PostgreSQL interdit d'employer une valeur ajoutée dans la transaction qui l'ajoute)
  - rattrapage : `types = {CLIENT_FINAL}` pour toute entreprise liée par `ClientMeta` à au moins un projet de `type` `CLIENT` ; `types = {MA_SOCIETE}` pour l'entreprise de slug `thibaud-geisler`
- **Validation** (`.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/typescript/conventions.md`) :
  - les listes de valeurs viennent des enums importés de `@/generated/prisma/browser` (`z.enum(CompanySector)`, etc.), les exports `COMPANY_SECTORS` et `COMPANY_SIZES` restent mais en dérivent
  - `sectors` perd son minimum : une entreprise peut n'avoir aucun secteur
  - **Champ absent, champ inchangé** : chaque nouveau champ est facultatif dans le schéma et n'est lu que si le `FormData` porte sa clé (`formData.has`). Le formulaire du `08` de l'espace admin, encore en place jusqu'au `03`, n'envoie aucun de ces champs : une modification faite par lui n'efface ni les types ni le statut posés par la migration. Le formulaire du `03` envoie toujours chaque champ, une liste vide comprise
  - `types` : au moins une valeur dès que le champ est envoyé, message « Sélectionne au moins un type »
  - `notes` : trim, vide enregistré à `null`, 200 caractères au plus, message « Les notes tiennent sur une ligne (200 caractères au plus) »
  - `details` : trim, vide enregistré à `null`
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`) :
  - `getCurrentUser()` en tête de chaque action, inchangé
  - les listes (`types`, `zones`) se lisent par `getAll` en écartant les chaînes vides, que le formulaire du `03` envoie pour signaler une liste vidée
  - invalidation inchangée : tag `projects` et chemin `/admin/entreprises` (`.claude/rules/nextjs/rendering-caching.md`)
- **Lecture publique** : `PROJECT_INCLUDE` remplace `company: true` par un `select` de `id`, `slug`, `name`, `logoFilename`, `websiteUrl`, `sectors`, `size`, les seuls champs que `CaseStudyHeader` et `ProjectCard` affichent. Les notes, détails, types et statut ne quittent jamais le serveur
- **Libellés** : `src/lib/companies.ts` porte les libellés des types (« Client final », « ESN / Recrutement », « Partenaire », « Ma société »), du statut (« Active », « Dormante », « Archivée »), des tailles, des secteurs ajoutés et `COMPANY_FIELD_LABELS.details = "Détails"` ; `src/lib/zones.ts` ceux des zones. Les champs à plusieurs valeurs ont un libellé au pluriel : « Types », « Secteurs », « Zones »
- **Glyphes** : `src/lib/companies.ts` exporte aussi `COMPANY_TYPE_ICONS: Record<CompanyType, IconComponent | null>` (Client final `Building2`, ESN / Recrutement `Network`, Partenaire `Handshake`, Ma société `House`) et `COMPANY_STATUS_ICONS: Record<RelationStatus, IconComponent | null>` (Active `CircleCheck`, Dormante `Moon`, Archivée `Archive`), imports nommés depuis `lucide-react`, type `IconComponent` de `@/lib/icons`
- **Tri des zones** : `src/lib/zones.ts` exporte `sortZones(zones: Zone[]): Zone[]`, qui trie selon l'ordre canonique de `ZONES`. Utilisée dans `companySchema` pour trier `zones` avant écriture ; les sub-projects `03` et `04` l'emploient à l'affichage
- **Tailles** : catégories légales ([INSEE, décret n° 2008-1354](https://www.insee.fr/fr/metadonnees/definition/c1057)). En admin, le badge porte le nom court (`COMPANY_SIZE_LABELS`) et son tooltip l'effectif (`COMPANY_SIZE_HEADCOUNTS`) : le badge tient dans une colonne étroite, l'effectif reste à un survol (décision du propriétaire, 2026-10-01). Le site public garde le libellé complet :

| Valeur | Admin, badge | Admin, tooltip | Site FR | Site EN |
|---|---|---|---|---|
| `TPE` | TPE | Moins de 10 salariés | TPE (moins de 10 salariés) | Micro-enterprise (fewer than 10 employees) |
| `PME` | PME | 10 à 249 salariés | PME (10 à 249 salariés) | SME (10 to 249 employees) |
| `ETI` | ETI | 250 à 4 999 salariés | ETI (250 à 4 999 salariés) | Mid-sized company (250 to 4,999 employees) |
| `GROUPE` | Grande entreprise | 5 000 salariés et plus | Grande entreprise (5 000 salariés et plus) | Large enterprise (5,000+ employees) |

- **Secteurs** : `MARKETING_COMMUNICATION` « Marketing / Communication » (EN « Marketing / Communications »), `INDUSTRIE` « Industrie » (« Industry »), `HEALTHTECH` « Healthtech » (« Healthtech »), `SECTEUR_PUBLIC` « Secteur public » (« Public sector »), en admin comme sur le site

## Acceptance criteria

### Scénario 1 : migration et rattrapage
**GIVEN** la base de dev avec ses entreprises, dont `thibaud-geisler` liée à des projets `PERSONAL`
**WHEN** la migration s'applique
**THEN** chaque entreprise liée à un projet `CLIENT` a `types = {CLIENT_FINAL}`
**AND** `thibaud-geisler` a `types = {MA_SOCIETE}`
**AND** l'entreprise qui portait `EMARKETING` porte `MARKETING_COMMUNICATION`

### Scénario 2 : création avec les nouveaux champs
**GIVEN** un `FormData` avec types `ESN_RECRUTEMENT`, deux zones et des notes
**WHEN** `createCompany` s'exécute
**THEN** l'entreprise est créée avec ces valeurs et le statut `ACTIVE` par défaut
**AND** le tag `projects` est invalidé

### Scénario 3 : types obligatoires
**GIVEN** un `FormData` qui envoie le champ `types` sans aucune valeur
**WHEN** `createCompany` ou `updateCompany` s'exécute
**THEN** l'action échoue avec « Sélectionne au moins un type » sur `types`, sans écrire en base

### Scénario 4 : ancien formulaire sans les nouveaux champs
**GIVEN** une entreprise de types `{CLIENT_FINAL}`
**WHEN** `updateCompany` reçoit un `FormData` sans aucune des clés des nouveaux champs
**THEN** `types`, `zones`, `relationStatus`, `notes` et `details` restent inchangés

### Scénario 5 : secteurs facultatifs
**GIVEN** un `FormData` valide sans aucun secteur
**WHEN** `createCompany` s'exécute
**THEN** l'entreprise est créée avec une liste de secteurs vide

### Scénario 6 : aucun champ CRM sur le site public
**GIVEN** un projet publié lié à une entreprise qui a des notes, des détails, des types et un statut
**WHEN** `findPublishedBySlug` lit le projet
**THEN** l'entreprise retournée ne porte que `id`, `slug`, `name`, `logoFilename`, `websiteUrl`, `sectors` et `size`

### Scénario 7 : libellés de taille
**GIVEN** une étude de cas publiée dont l'entreprise est de taille `TPE`
**WHEN** un visiteur l'ouvre en français puis en anglais
**THEN** il lit « TPE (moins de 10 salariés) » puis « Micro-enterprise (fewer than 10 employees) »

## Tests à écrire

### Unit
- `src/lib/zones.test.ts` :
  - sorts zones into the canonical order regardless of submission order
- `src/server/actions/companies.test.ts` :
  - accepts an empty sectors list
  - rejects a submitted but empty types list
  - rejects an unknown type
  - stores the submitted types, zones, relation status, notes and details, with zones sorted into canonical order
  - defaults the relation status to active when the field is absent on creation
  - rejects notes longer than 200 characters
  - stores empty notes and details as null
  - leaves every CRM field untouched when the form does not send it

### Integration
- `src/server/queries/projects.integration.test.ts` :
  - does not expose the CRM fields of a published project's company

## Edge cases

- **Liste vidée dans le formulaire** : une liste sans valeur n'envoie aucun champ ; le formulaire du `03` ajoute une valeur vide pour dire « vidé », que l'action écarte avant validation
- **Tranche Notion « 1-50 »** : sans équivalent exact parmi les catégories légales, elle se tranche fiche par fiche à la reprise (`20`), comme les types Notion Startup, PME et Grand compte qui deviennent des tailles

## Architectural decisions

### Décision : taxonomie du type

**Options envisagées :**
- **A. Les six valeurs de Notion**, rôle et profil mêlés (Startup, PME, Grand compte à côté de Client final)
- **B. Le rôle seul** : Client final, ESN / Recrutement, Partenaire, plus Ma société pour les sociétés du propriétaire

**Choix : B**

**Rationale :**
- PME et Grand compte doublonnent la taille ; Startup n'a pas de définition juridique et ne pilote aucune vue
- « ESN / Recrutement » remplace « ESN/Employeur » : un employeur direct est un client final
- « Ma société » donne un type explicite aux sociétés du propriétaire, sans étiquette fausse, et reste valable s'il en monte d'autres
- Prospect n'est plus un type stocké (brief v2, décision 5) : il se déduit du rôle Lead d'une personne de l'entreprise, la taxonomie ne garde que ce qui décrit l'entreprise elle-même

### Décision : libellés de taille

**Options envisagées :**
- **A. Tranches de Notion** (1-50, 50-250, 250-5000, 5000+) : reprise directe
- **B. Catégories légales françaises** : TPE, PME, ETI, grande entreprise, avec leur effectif

**Choix : B**

**Rationale :**
- Choix du propriétaire : les anciens libellés « TPE (1-50) » contredisaient la définition légale (moins de 10 personnes)
- Le prix est une reprise manuelle de la tranche « 1-50 » au `20`
