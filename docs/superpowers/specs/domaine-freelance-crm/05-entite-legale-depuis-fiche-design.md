---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "entite-legale-depuis-fiche"
goal: "Saisir et modifier l'entité légale d'une entreprise directement dans sa fiche, avec le seul nom obligatoire, et la montrer en entier dans la vue détail."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["02-entreprise-enrichie-donnees-design.md", "03-formulaire-entreprise-enrichi-design.md", "04-liste-entreprises-enrichie-design.md"]
date: "2026-09-26"
---

# Entité légale saisie depuis la fiche entreprise

## Scope

Remplace le rattachement à une entité légale existante par une saisie directe dans la card Entité légale du formulaire entreprise : raison sociale seule obligatoire, forme juridique groupée par pays, SIRET, TVA et siège visibles, RCS, téléphone et capital repliés. L'entité s'écrit avec l'entreprise, part avec elle à la suppression sauf si elle sert aux pages légales, et s'affiche en entier dans la vue détail. Pour l'entité éditrice du site seulement, la card gagne aussi le statut de TVA (date d'assujettissement et régime), qui pilote la mention affichée sur les mentions légales et le `vatID` du JSON-LD de la page À propos. Exclut le pré-remplissage assisté (reporté aux agents internes) et tout écran d'administration de l'éditeur ou des sous-traitants.

### État livré

À la fin de ce sub-project, on peut : créer une entreprise en ne renseignant que la raison sociale de son entité légale, compléter plus tard sa forme juridique (SAS, sous France), son SIRET et son siège, rouvrir la fiche et tout retrouver, lire ces informations dans la vue détail, constater que les mentions légales publiques reflètent une modification de l'entité légale de la société du propriétaire, et poser la date d'assujettissement à la TVA de l'éditeur pour voir les mentions légales et le JSON-LD basculer en conséquence.

## Dependencies

- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : `companySchema` et `optionalStringField` des actions de l'entreprise
- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : formulaire entreprise dans lequel la card s'insère, contrat « champ absent, champ inchangé »
- `04-liste-entreprises-enrichie-design.md` (statut: draft) : vue détail dont le bloc Entité légale est enrichi

## Références de design

- **Maquette** : `isCompanyForm` (card Entité légale, sans le bouton « Pré-remplir » ni l'état « Suggérée / Confirmée »), `dlgDetail`
- **Design system** : `core/Card`, `core/Input`, `core/Label`, `core/Select`, `core/Combobox`, `core/Separator`, `core/Button`, `patterns/DetailDialog`, `patterns/EmptyValue`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `prisma/schema.prisma` (`LegalEntity.legalStatusKey` remplacé par `legalForm LegalForm?`, `addressId` facultatif, `rcsNumber` ajouté, enum `LegalForm` créé ; enum `VatRegime` redéfini à `REEL_SIMPLIFIE`/`REEL_NORMAL`, `Publisher.vatRegime` rendu facultatif, `Publisher.vatLiableSince` ajouté)
- **À créer** : `prisma/migrations/<horodatage>_legal_entity_optional_fields/migration.sql` (colonnes, formes juridiques corrigées de deux clients, `VatRegime` redéfini et valeurs existantes remises à null)
- **À créer** : `src/lib/legal-entities.ts` (`LEGAL_FORMS`, `LEGAL_FORM_GROUPS`, `LEGAL_FORM_LABELS`, pays du siège, devises, libellés des champs de l'entité, SIREN tiré du SIRET, `VAT_REGIMES`, `VAT_REGIME_LABELS`)
- **À créer** : `src/lib/schemas/legal-entity.ts` (validation des champs de l'entité, préfixés `legalEntity`, dont `legalEntityVatLiableSince` et `legalEntityVatRegime`)
- **À créer** : `src/lib/schemas/legal-entity.test.ts` (règles d'assujettissement à la TVA)
- **À créer** : `src/lib/legal/vat-status.ts` (`isVatLiable`, partagé par les mentions légales et le JSON-LD)
- **À modifier** : `src/lib/schemas/company.ts` (champs de l'entité intégrés, `legalEntityId` retiré)
- **À modifier** : `src/server/actions/companies.ts` (écriture imbriquée, suppression de l'entité avec l'entreprise, invalidation `legal-entity`, TVA écrite sur le `Publisher` lié)
- **À modifier** : `src/server/actions/companies.types.ts` (message `siret_taken`)
- **À modifier** : `src/server/actions/companies.test.ts`
- **À modifier** : `src/server/queries/companies.ts` (entité légale, siège et éditeur inclus, `findAvailableLegalEntities` retiré)
- **À créer** : `src/components/features/admin/companies/LegalEntityCard.tsx` (bloc TVA de l'éditeur inclus)
- **À modifier** : `src/components/features/admin/companies/CompanyForm.tsx` (nouvelle card, prop `legalEntities` retirée)
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (bloc Entité légale de la vue détail)
- **À modifier** : `src/app/admin/(protected)/entreprises/nouvelle/page.tsx` et `src/app/admin/(protected)/entreprises/[id]/page.tsx` (plus de liste d'entités à charger)
- **À modifier** : `src/app/[locale]/(public)/mentions-legales/page.tsx` (forme juridique et siège désormais facultatifs, mention de TVA sur `vatLiableSince`), `src/app/[locale]/(public)/confidentialite/page.tsx` (siège facultatif) et `src/app/[locale]/(public)/a-propos/page.tsx` (siège facultatif, `vatId` du JSON-LD)
- **À modifier** : `src/lib/seo/json-ld.ts` et `src/lib/seo/json-ld.test.ts` (`vatID` du bloc `legal`)
- **À modifier** : `messages/fr.json` et `messages/en.json` (`Legal.legalStatus` indexé par les 13 valeurs de l'enum `LegalForm`)
- **À créer** : `src/components/features/admin/OptionalDateField.tsx` (date seule effaçable, pour la date d'assujettissement à la TVA ; réutilisée par `08` et `19`)
- **À modifier** : `docs/DESIGN.md` (ligne « Date facultative » de § Post-MVP vers § Formulaires, via le skill `design-doc`)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`) : `LegalEntity.legalStatusKey` devient `legalForm LegalForm?`, nouvel enum `public` à 13 valeurs ; `addressId` passe à `String? @unique` avec `address Address?`, et `rcsNumber String?` s'ajoute. La relation vers le siège passe de `onDelete: Cascade` à `SetNull` : supprimer un siège vidé depuis la fiche supprimerait sinon l'entité, et avec elle l'éditeur ou les traitements qui en dépendent. L'éditeur et les sous-traitants gardent leurs valeurs ; les mentions légales étendent leur garde existante (page introuvable si l'éditeur ou l'hébergeur n'a plus de forme juridique ou de siège), la politique de confidentialité laisse vide le pays d'un sous-traitant sans siège, le JSON-LD de la page À propos omet les données légales d'un éditeur sans siège. Le rendu actuel ne change pas
- **Migration** : colonnes rendues facultatives, colonne ajoutée, enum créé ; `legalStatusKey` converti vers `legalForm` à partir des clés réellement en base (`entrepreneurIndividuel`, `sarl`, `incorporated`) ; `incorporated` devient `INCORPORATED_US`, un sous-traitant américain des pages légales la portant déjà ; correction au passage des deux entités de l'ancien seed rangées dans des formes françaises alors qu'elles sont luxembourgeoises : `cloudsmart-sarl` (`sarl`) devient `SARL_LU`, `foyer-group-sa` (`sa`) devient `SA_LU`
- **Forme juridique en enum** (`LegalForm`, décision du propriétaire du 2026-09-30) : 13 valeurs, France puis Luxembourg puis la forme américaine déjà portée par un sous-traitant des pages légales, aucun autre pays :

| Pays | Valeurs (libellé) |
|---|---|
| France | `ENTREPRENEUR_INDIVIDUEL` (Entrepreneur individuel), `EURL` (EURL), `SARL` (SARL), `SAS` (SAS), `SASU` (SASU), `SA` (SA), `SNC` (SNC), `SCI` (SCI), `ASSOCIATION` (Association) |
| Luxembourg | `SARL_LU` (S.à r.l.), `SARL_S_LU` (S.à r.l.-S), `SA_LU` (SA) |
| États-Unis | `INCORPORATED_US` (Incorporated) |

  `src/lib/legal-entities.ts` expose `LEGAL_FORMS` (les 13 valeurs), `LEGAL_FORM_GROUPS` (le tableau ci-dessus) et `LEGAL_FORM_LABELS` (libellé par valeur, pour l'admin). Chaque valeur a aussi son libellé dans `messages/{fr,en}.json` sous `Legal.legalStatus`, indexé par la valeur de l'enum, avec le pays entre parenthèses pour une forme hors de France (« SA (Luxembourg) », « Incorporated (US) ») ; les autres pays (Belgique, Suisse, Allemagne, Pays-Bas, Royaume-Uni) et leurs clés sortent du plan, un pays de plus valant une nouvelle migration
- **Pays du siège** : codes ISO 3166-1 alpha-2 `FR`, `LU`, `BE`, `CH`, `DE`, `NL`, `GB`, `US`, affichés en français par `Intl.DisplayNames` ; un code déjà en base hors de cette liste reste proposé. **Devises** : `EUR`, `CHF`, `USD`, `GBP`
- **Card** (`LegalEntityCard`, colonne principale, à la place de l'ancien choix d'entité) :
  - sans entité, un bouton « Renseigner l'entité légale » ouvre les champs ; une fois l'entité enregistrée, la card montre toujours ses champs et ne propose pas de la retirer
  - visibles, par paires `sm:grid-cols-2` : Raison sociale | Forme juridique (combobox avec recherche, groupes par pays), SIRET | N° TVA ; séparateur, titre « Siège social », Rue | Code postal, Ville | Pays
  - repliés sous « Autres informations », ouvert d'office si l'un d'eux a une valeur : Ville du RCS | Numéro RCS (seulement quand le pays du siège n'est pas la France), Téléphone | Capital et devise
- **Validation** (`src/lib/schemas/legal-entity.ts`, `.claude/rules/zod/schemas.md`) :
  - champs du `FormData` préfixés `legalEntity` : `legalEntityEnabled` (`"true"` / `"false"`, absent = entité inchangée), `legalEntityName`, `legalEntityStatusKey`, `legalEntitySiret`, `legalEntityVatNumber`, `legalEntityRcsCity`, `legalEntityRcsNumber`, `legalEntityPhone`, `legalEntityCapitalAmount`, `legalEntityCapitalCurrency`, `legalEntityStreet`, `legalEntityPostalCode`, `legalEntityCity`, `legalEntityCountry`
  - raison sociale obligatoire quand l'entité est activée ; tout le reste facultatif
  - SIRET : espaces retirés, 14 chiffres ; TVA : espaces retirés, majuscules, deux lettres puis 8 à 12 lettres ou chiffres
  - capital : entier positif ou nul ; devise par défaut `EUR`
  - siège tout ou rien : dès qu'un des quatre champs est rempli, les quatre sont requis
  - numéro RCS ignoré pour un siège en France, le SIREN tiré du SIRET en tenant lieu
- **Écriture** (`.claude/rules/nextjs/server-actions.md`) : l'entité s'écrit dans la même requête Prisma que l'entreprise (création imbriquée, `upsert` à la modification, siège créé, mis à jour ou supprimé selon la saisie), donc tout ou rien. Nouvelle entité : `slug` égal à celui de l'entreprise. Un SIRET déjà pris renvoie `siret_taken` sur le champ SIRET
- **Suppression** : `deleteCompany` supprime, dans une transaction, l'entreprise puis son entité légale et son siège, sauf si l'entité est l'éditeur du site ou un sous-traitant (`publisher` ou `processings`), auquel cas elle est seulement détachée
- **Cache** (`.claude/rules/nextjs/rendering-caching.md`) : après toute écriture ou suppression, `updateTag("legal-entity")` s'ajoute à `projects` : l'entité de la société du propriétaire est celle de l'éditeur, lue par les pages légales publiques
- **TVA de l'éditeur** (décision 17 du propriétaire, 2026-09-30) : `Publisher.vatLiableSince` et `Publisher.vatRegime` sont facultatifs et renseignés ensemble ; leur absence dit la franchise, sans valeur qui la représenterait. `updateCompany` les écrit sur le `Publisher` lié à l'entité, seulement quand ce lien existe (`publisher: { update: … }` dans l'`upsert` de l'entité) : jamais de `Publisher` créé depuis ce formulaire. Assujetti = `vatLiableSince` passée ou du jour : `src/lib/legal/vat-status.ts` expose `isVatLiable`, partagé par les mentions légales (numéro de TVA intracommunautaire affiché à la place de la mention 293 B) et le JSON-LD de la page À propos (`vatID`). Le cache `legal-entity` dure plusieurs jours : une date saisie à l'avance ne bascule qu'à son expiration, une date du jour ou passée bascule dès l'enregistrement via `updateTag`
- **Vue détail** : le bloc Entité légale liste raison sociale, forme juridique, SIRET (formaté par `formatSiret`), N° TVA, immatriculation (« RCS <ville> <SIREN> » en France, ville et numéro sinon), téléphone, capital et devise, siège sur plusieurs lignes ; il disparaît si l'entreprise n'a pas d'entité
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/next-intl/translations.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/design/claude-design.md`

## Acceptance criteria

### Scénario 1 : entité minimale
**GIVEN** le formulaire d'une entreprise sans entité légale
**WHEN** on clique « Renseigner l'entité légale », saisit seulement la raison sociale et enregistre
**THEN** l'entreprise a une entité légale portant ce nom, sans forme juridique ni siège

### Scénario 2 : entité complétée
**GIVEN** cette entreprise
**WHEN** on choisit la forme SAS (groupe France), saisit un SIRET avec espaces, un numéro de TVA et un siège complet, puis enregistre
**THEN** l'entité les porte, le SIRET sans espaces, et la vue détail les affiche avec l'immatriculation tirée du SIRET

### Scénario 3 : siège incomplet
**GIVEN** une entité dont seule la ville du siège est remplie
**WHEN** on enregistre
**THEN** la rue, le code postal et le pays sont signalés comme requis, rien n'est enregistré

### Scénario 4 : SIRET invalide ou pris
**GIVEN** un SIRET de 13 chiffres, puis un SIRET déjà porté par une autre entité
**WHEN** on enregistre
**THEN** le champ SIRET affiche l'erreur correspondante, rien n'est enregistré

### Scénario 5 : suppression
**GIVEN** une entreprise cliente avec son entité légale et son siège
**WHEN** on la supprime
**THEN** l'entité et le siège disparaissent avec elle
**AND** une entité qui sert d'éditeur ou de sous-traitant n'est jamais supprimée, seulement détachée

### Scénario 6 : mentions légales à jour
**GIVEN** l'entité légale de la société du propriétaire
**WHEN** on modifie son téléphone depuis la fiche entreprise
**THEN** les mentions légales publiques affichent la nouvelle valeur après enregistrement

### Scénario 7 : passage à l'assujettissement
**GIVEN** l'entité légale de l'éditeur sans date ni régime de TVA, les mentions légales affichant la mention 293 B
**WHEN** on choisit une date d'assujettissement passée et un régime dans la card Entité légale, avec un numéro de TVA, et on enregistre
**THEN** les mentions légales publiques affichent le numéro de TVA intracommunautaire à la place de la mention 293 B, et le JSON-LD de la page À propos porte `vatID`

## Tests à écrire

### Unit
- `src/server/actions/companies.test.ts` :
  - creates the legal entity with the company when enabled, with the company slug
  - rejects an enabled legal entity without a name
  - strips spaces from a SIRET and rejects one that is not 14 digits
  - rejects an unknown legal form
  - rejects a partial registered office address
  - ignores the RCS number when the registered office is in France
  - upserts the legal entity on update
  - deletes the stored registered office when the four address fields are emptied
  - leaves the legal entity untouched when the form does not send it
  - maps a SIRET uniqueness violation to the SIRET field
  - maps a legal entity slug collision to the legal name
  - deletes the legal entity and its address with the company
  - only detaches a legal entity used as publisher or processor
  - invalidates the legal entity cache tag after a write
  - writes the vat liability date and regime on the publisher when the entity has one
  - ignores vat fields when the entity has no publisher
- `src/lib/schemas/legal-entity.test.ts` :
  - accepts a legal entity with neither vat liability date nor regime
  - requires a vat regime once the liability date is filled
  - requires a liability date once the vat regime is filled
  - requires a vat number once liable
  - accepts an entity with liability date, regime and vat number filled together
- `src/lib/seo/json-ld.test.ts` :
  - mainEntity porte `vatID` quand `legal.vatId` est fourni
  - mainEntity n'a pas de `vatID` quand `legal.vatId` est absent

## Edge cases

- **Entreprise dont l'entité légale existe déjà** (les cinq de l'ancien seed) : la card s'ouvre directement sur ses champs, son `slug` n'est jamais modifié
- **Siège hors de la liste des pays** : son code reste proposé et affiché par son nom
- **Siège vidé** : les quatre champs vides suppriment le siège existant, l'entité reste
- **Forme juridique sans libellé public** : impossible, l'enum PostgreSQL garantit une valeur parmi les treize ou absente ; chaque valeur a son message dans `messages/{fr,en}.json`
- **Date d'assujettissement future** : la mention 293 B reste affichée jusqu'à son échéance, le cache `legal-entity` (plusieurs jours) ne la recalcule qu'à son expiration naturelle

## Architectural decisions

### Décision : saisie directe ou rattachement

**Options envisagées :**
- **A. Rattacher une entité existante** (comportement du `08` de l'espace admin) : aucune création possible, les entités viennent de l'ancien seed
- **B. Saisie directe** dans la card, une entité par entreprise

**Choix : B**

**Rationale :**
- Choix du propriétaire ; le rattachement ne servait qu'à relier des entités créées par un seed désormais supprimé

### Décision : champs obligatoires

**Options envisagées :**
- **A. Modèle actuel** : forme juridique et siège complet obligatoires
- **B. Raison sociale seule obligatoire**, siège tout ou rien, informations des mentions légales repliées

**Choix : B**

**Rationale :**
- Choix du propriétaire : une fiche prospect se crée sans friction, sa propre société se remplit en entier pour les mentions légales
- Les champs visibles sont ceux dont une facture aura besoin (nom, SIRET, TVA, adresse)

### Décision : formes juridiques groupées par pays

**Options envisagées :**
- **A. Par famille juridique** : chaque forme une seule fois
- **B. Par pays** : une SA luxembourgeoise distincte d'une SA française

**Choix : B**

**Rationale :**
- Choix du propriétaire ; la valeur garde le pays, ce qui corrige au passage deux clients luxembourgeois rangés en formes françaises par l'ancien seed

### Décision : enum plutôt que clé libre

**Options envisagées :**
- **A. Clé texte libre** (`legalStatusKey String?`), validée côté Zod seulement, comme les autres pays envisagés
- **B. Enum PostgreSQL** (`legalForm LegalForm?`), la base garantissant elle-même la valeur

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-30 : l'activité vise deux marchés, France et Luxembourg, plus la forme américaine qu'un sous-traitant des pages légales porte déjà ; une liste fermée et courte
- L'enum garantit la valeur en base comme dans le code, jamais une clé oubliée ou mal orthographiée
- Un pays de plus coûte une migration ; accepté, la liste n'évoluant pas souvent

### Décision : date d'assujettissement et régime plutôt qu'un régime seul

**Options envisagées :**
- **A. Un régime seul**, avec une valeur franchise et une valeur assujetti, sans date de bascule
- **B. Dérivé de la présence du numéro de TVA** : assujetti dès qu'un numéro est saisi
- **C. Date d'assujettissement et régime**, la franchise se disant par leur absence

**Choix : C**

**Rationale :**
- Décision du propriétaire (17, 2026-09-30) : la Comptabilité (Feature 5) a besoin de la date de bascule autant que du régime pour ses déclarations, qu'un régime seul ne porterait pas
- Un numéro de TVA peut être saisi avant la bascule effective (préparation d'une facture) : le dériver de sa présence confondrait la donnée d'identification avec le fait générateur
- La franchise se dit par l'absence des deux champs, sans valeur qui doublerait l'information déjà portée par la date
