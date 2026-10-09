---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "contacts"
goal: "Ajouter à une personne le rôle Contact (réseau professionnel durable) dans l'espace admin : formulaire avec choix d'un nouveau contact ou d'un contact depuis un lead, liste, vue détail et suppression ; une personne opposée depuis sa fiche lead sort du réseau."
status: "implemented"
complexity: "L"
tdd_scope: "partial"
depends_on: ["07-leads-donnees-design.md", "08-ecran-leads-design.md", "09-actions-prospection-donnees-design.md", "10-ecran-actions-prospection-design.md"]
date: "2026-09-29"
---

# Contacts et relations

## Scope

Ajoute le modèle `Contact` comme rôle d'une personne (clé `personId`, types, statut), sa validation, ses Server Actions (création, modification, suppression) et l'écran Contacts : liste avec recherche, colonnes masquables et filtres, page de création et de modification en cards avec Détails pré-rempli, vue détail avec bloc Pipeline symétrique du bloc Réseau du lead, suppression. À la création, choisir un lead sans rôle Contact (« Depuis un lead ») remplit le formulaire depuis lui, en lecture ; l'opposition RGPD reste un geste de la fiche lead (`08`) et retire désormais le rôle Contact, aucun état opposé n'existant côté contacts (décision du propriétaire du 2026-10-09). Exclut les blocs Opportunités (`15`) et Signaux (`19`), tout historique d'échanges structuré (l'historique reste du texte dans Détails ou une action de prospection) et la reprise des contacts Notion (`20`).

### État livré

À la fin de ce sub-project, on peut : ouvrir Contacts dans le menu, créer un contact avec ses types, son entreprise et sa localité, le retrouver dans la liste et sa vue détail ; créer un autre contact en choisissant « Depuis un lead » un lead non pourvu du rôle Contact, voir le formulaire se remplir depuis lui en lecture, enregistrer et voir la personne porter les deux rôles ; supprimer le contact d'une personne aux deux rôles et constater qu'elle reste, toujours lead ; passer en « ne plus contacter » depuis sa fiche lead une personne aux deux rôles et la voir sortir de la liste Contacts.

## Dependencies

- `07-leads-donnees-design.md` (statut: implemented) : modèles `Person` et `Lead`, `personFields`, `linkedin.ts`, `job-roles.ts`, `persons.ts` (`PERSON_FIELD_LABELS`, `personDisplayName`, `OPTED_OUT_CLEARED`), `PersonLockedError`, `optOutPerson`, `erasePersonExchanges`
- `08-ecran-leads-design.md` (statut: implemented) : motif de page en cards (`LeadForm`), `PERSON_SECTION_TITLES`, `OptOutPersonDialog`, `ErasePersonExchangesDialog`, `DetailDialog` à `onEdit` facultatif, `findCompanyOptions`, `details-templates.ts`
- `09-actions-prospection-donnees-design.md` (statut: implemented) : modèle `ProspectingAction` (`personId`, `occurredAt`, `respondedAt`, `status`), source de la dernière interaction dérivée
- `10-ecran-actions-prospection-design.md` (statut: implemented) : `src/lib/person-retention.ts` (`retentionEndOf`, `isRetentionOver`), échéance de revue

## Références de design

- **Maquette** : `isContacts`, `isContactForm` (champs), `isCompanyForm` (mise en page en cards, arbitrage « Page ou modale d'édition »), `dlgDeleteContact`, `dlgDetail`
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/ExternalUrl`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `core/Card`, `core/AlertDialog`, `core/RadioGroup`, `core/Select`, `core/Combobox`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `prisma/schema.prisma` (enums `ContactType`, `ContactStatus`, modèle `Contact` réduit à son rôle, relation `Person.contact`)
- **À créer** : `prisma/migrations/<horodatage>_contacts/migration.sql`
- **À créer** : `src/lib/contacts.ts` (`CONTACT_TYPE_LABELS`, `CONTACT_STATUS_LABELS`, `CONTACT_TYPE_ICONS`, `CONTACT_STATUS_ICONS`, `CONTACT_FIELD_LABELS`, `CONTACT_SECTION_TITLES`)
- **À créer** : `src/lib/schemas/network-contact.ts` (`src/lib/schemas/contact.ts` porte déjà le formulaire de contact public)
- **À créer** : `src/server/actions/contacts.ts`, `src/server/actions/contacts.types.ts`, `src/server/actions/contacts.test.ts`
- **À créer** : `src/server/actions/person-guards.ts` (recherche d'identité, garde d'opposition et date d'opposition, partagées par les leads et les contacts)
- **À créer** : `src/server/queries/contacts.ts`
- **À modifier** : `src/lib/admin-routes.ts` (`ADMIN_CONTACTS_PATH`)
- **À modifier** : `src/server/queries/leads.ts` (`hasContactRole` calculé, `contactRole` pour le bloc Réseau)
- **À modifier** : `src/server/queries/persons.ts` (`findLeadsWithoutContactRole`, type `LeadWithoutContactRole`)
- **À modifier** : `src/server/actions/leads.ts`, `src/server/actions/leads.test.ts` (gardes déplacées dans `person-guards.ts`, `deleteLead` garde la personne si le rôle Contact reste, revalidation des contacts)
- **À modifier** : `src/server/actions/persons.ts`, `src/server/actions/persons.test.ts` (`optOutPerson` retire le rôle Contact et revalide `/admin/contacts`)
- **À modifier** : `src/lib/details-templates.ts` et `src/lib/details-templates.test.ts` (gabarit contact)
- **À modifier** : `src/lib/admin-table-widths.ts` (colonnes et squelette des contacts)
- **À modifier** : `src/lib/person-retention.ts` (`CONTACT_REVIEW_YEARS`)
- **À créer** : `src/components/features/admin/ReadOnlyField.tsx` (`ContactForm` en est le seul consommateur), `src/components/features/admin/CompanyCombobox.tsx` (sélecteur d'entreprise partagé avec `LeadForm`)
- **À créer** : `src/lib/detail-links.ts` (`detailHref`, liens `?detail=` des vues détail)
- **À modifier** : `src/components/features/admin/table-cells.tsx` (cellules entreprise, LinkedIn et badge partagées avec `LeadsTable`), `src/components/features/admin/companies/CompaniesTable.tsx` (`detailHref`), `src/components/ui/form-field.tsx` (libellé facultatif, le titre de card servant de libellé), `src/server/actions/leads.types.ts` (`lead_not_found`)
- **À créer** : `src/components/features/admin/contacts/ContactForm.tsx`, `ContactsTable.tsx`, `DeleteContactDialog.tsx`
- **À modifier** : `src/components/features/admin/persons/OptOutPersonDialog.tsx` et `src/components/features/admin/leads/LeadForm.tsx` (la confirmation annonce la sortie des contacts)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (bloc Réseau de la vue détail)
- **À créer** : `src/app/admin/(protected)/contacts/page.tsx` et `loading.tsx` (lit aussi `searchParams.detail`), `contacts/nouveau/page.tsx` et `loading.tsx`, `contacts/[id]/page.tsx` et `loading.tsx`
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Contacts activée)
- **À créer** : `src/lib/person-links.ts` et `src/lib/person-links.test.ts` (`personDetailHref`, lien vers la vue détail lead ou contact d'une personne au rôle ambigu)
- **À modifier** : `src/server/queries/prospecting-actions.ts` (`lead`, `contact` ajoutés au `select` de la personne d'une action)
- **À modifier** : `src/server/actions/prospecting-actions.ts` et `src/server/actions/companies.ts` (revalident aussi les listes de personnes)
- **À modifier** : `src/components/features/admin/leads/DeleteLeadDialog.tsx` (lead déjà supprimé)
- **À créer** : `src/server/actions/contacts.integration.test.ts`
- **À modifier** : `.claude/rules/nextjs/data-fetching.md` (exception des lectures admin, sans `'use cache'`)
- **À modifier** : `src/components/features/admin/prospection/action-detail.tsx` (`11`, bascule sur `personDetailHref`)
- **À modifier** : `docs/DESIGN.md` (arbitrages « Opposition d'un contact » et « Option d'un sélecteur de personne »), `docs/PRODUCTION.md` (procédure d'opposition)

## Architecture approach

- **Modèle** (`.claude/rules/prisma/schema-migrations.md`, schema `freelance`) : `Contact` ne porte plus que le rôle, sur le motif de `Lead` (`07`) :

| Champ | Type | Règle |
|---|---|---|
| `personId` | `String @id` vers `Person`, `onDelete: Cascade` | clé du rôle |
| `types` | `ContactType[]` : `COLLEGUE`, `CLIENT`, `PARTENAIRE`, `MENTOR`, `CONTACT_TECH`, `COMMERCIAL` | défaut `[]` |
| `status` | `ContactStatus` : `ACTIF`, `INACTIF`, `A_RECONTACTER` | défaut `ACTIF` |
| `createdAt`, `updatedAt` | `DateTime @db.Timestamptz` | |

  Identité, coordonnées, entreprise, localité (singulière), notes, détails et opposition vivent sur `Person` (`07`) ; `Person.contact Contact?` complète le modèle. Plus de `leadId`, `lastInteractionAt`, `zones`, `optedOutAt` propres au contact
- **Glyphes** : `src/lib/contacts.ts` exporte aussi `CONTACT_TYPE_ICONS: Record<ContactType, IconComponent | null>` (Collègue `Users`, Client `Building2`, Partenaire `Handshake`, Mentor `GraduationCap`, Contact tech `Code`, Commercial `Briefcase`) et `CONTACT_STATUS_ICONS: Record<ContactStatus, IconComponent | null>` (Actif `CircleCheck`, Inactif `Moon`, À recontacter `Bell`), imports nommés depuis `lucide-react`, type `IconComponent` de `@/lib/icons` ; affichés dans la grille de cases et le `Select` du formulaire (`EnumSelectItems`), les badges de la liste et de la vue détail (`EnumBadge`), le `Select` du type de contact d'un correspondant d'entretien (`17`)
- **Validation** (`src/lib/schemas/network-contact.ts`, `.claude/rules/zod/schemas.md`) : deux schémas, `newContactSchema` (`personFields` + `types` + `status`) pour une nouvelle personne et `attachContactSchema` (`personId` requis + `types` + `status`) pour poser le rôle sur un lead existant ; `createContact` choisit selon la présence de `personId` et ne valide que ce qu'il écrit. Le nom `contact.ts` est déjà pris par le formulaire de contact public
- **Une fiche par personne** : sans `personId`, l'action cherche une autre personne portant le même email ou le même lien LinkedIn avant d'écrire (`findIdentityConflict` de `src/server/actions/person-guards.ts`, partagé avec les leads, dans la transaction de l'écriture et après la garde d'opposition en modification) : un message qui nomme le rôle trouvé (`contact_exists`), « Ce contact existe déjà : <nom> », « Cette personne est déjà un lead : <nom>, choisissez-la « Depuis un lead » » ou « Cette personne existe déjà : <nom> » (le lead suit la même règle, « Cette personne est déjà un contact : <nom> »), ou, pour une personne opposée, « Cette personne s'est opposée à la prospection le JJ/MM/AAAA » (`contact_opted_out`). Avec `personId`, l'action verrouille la ligne de la personne (`SELECT … FOR UPDATE`), puis revérifie dans la même transaction qu'elle existe, porte le rôle Lead (« Cette personne n'est pas un lead »), n'est pas opposée et ne porte pas déjà le rôle Contact, sur le champ `personId` ; `optOutPerson` posant l'opposition par un `UPDATE` sur la même ligne avant de retirer le rôle Contact, un rattachement et une opposition simultanés ne peuvent pas laisser une personne opposée avec ce rôle. Les doublons lèvent une même `PersonConflictError` (`person-guards.ts`) que chaque action traduit dans ses codes
- **Actions** (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, motif `leads.ts` du `07`) : `createContact` crée la personne et le rôle dans une transaction, ou pose le rôle Contact sur une personne existante ; `updateContact(personId, …)` écrit la personne et le rôle, refusée (`PersonLockedError`, `contact_opted_out_locked`) si la personne s'est opposée entre-temps ; `deleteContact(personId)` retire le rôle et supprime la personne seulement si elle ne porte plus le rôle Lead. `deleteLead` (`07`) reçoit la même règle symétrique : la personne reste si elle garde le rôle Contact. Les deux passent par une seule suppression conditionnelle (`deletePersonIfRoleless`, aucun rôle restant), sans lecture préalable qui laisserait une fenêtre ; un rôle déjà supprimé ailleurs renvoie « Ce contact a déjà été supprimé » / « Ce lead a déjà été supprimé » et rafraîchit la liste. Une fiche modifiée ou supprimée ailleurs entre l'ouverture et l'envoi renvoie « Ce contact a été supprimé » / « Ce lead a été supprimé ». Chaque écriture revalide sa liste et celle de l'autre rôle (`revalidatePersonLists`, `/admin/contacts` et `/admin/leads`, variante `layout`), chacune lisant le résumé de l'autre rôle ; les écritures d'actions de prospection et d'entreprises aussi, la liste Contacts affichant la dernière interaction et l'entreprise. **Opposition** (décision du propriétaire du 2026-10-09) : elle se pose depuis la fiche lead seulement ; `optOutPerson` (`07`) refuse une personne sans rôle Lead, retire aussi le rôle Contact dans sa transaction et revalide `/admin/contacts`, la confirmation l'annonçant (« La personne sort aussi de vos contacts. ») ; aucun état opposé n'existe côté contacts
- **Lectures** (`src/server/queries/contacts.ts`, sans `'use cache'`) : `findContactByIdForAdmin(personId)` renvoie la personne et son rôle (`ContactRecord`), seul besoin de la page de modification ; `findAllContactsForAdmin` y ajoute ce que lit la liste et aplatit la personne et son rôle en un type `AdminContact` (`id` = `personId`, champs de la personne, `types`, `status`, `hasLeadRole`, `leadRole: { status, interest } | null` pour le bloc Pipeline, `lastInteractionAt` dérivé) ; `src/server/queries/persons.ts` expose `findLeadsWithoutContactRole()` (leads non opposés sans rôle Contact, réduits à ce qu'affiche le picker : nom et entreprise) ; les champs du lead choisi se chargent à la sélection par la Server Action en lecture `findLeadForContactAttach`
- **Rôle Contact du lead** (`src/server/queries/leads.ts`) : `AdminLead.contactRole: { types, status } | null`, lu depuis `person.contact`, porte le bloc Réseau de sa vue détail ; le booléen `hasContactRole` posé par le `07` disparaît, redondant
- **Dernière interaction dérivée** (remplace le champ saisi) : la plus tardive entre le `respondedAt` le plus récent et l'`occurredAt` le plus récent d'une action de la personne hors statut À faire (`09`), agrégée par personne (`groupBy`, `aggregate`) plutôt que chargée action par action. La colonne « Dernière interaction » lit ce dérivé
- **Revue** : « À conserver jusqu'au » et la facette Échéance lisent `reviewAt`, calculé à la lecture par `activityEndOf(…, CONTACT_REVIEW_YEARS)` (`10`, `src/lib/person-retention.ts`, la part de `retentionEndOf` qui ne dépend pas de l'opposition) à partir de `Contact.createdAt` (création du rôle) et de la dernière interaction dérivée ; `CONTACT_REVIEW_YEARS` (3, déclarée dans `person-retention.ts`) est un rappel métier, distinct du délai légal des prospects (`RETENTION_YEARS`, `01`), même si les deux valent trois ans ; plus de `contactReviewDateOf` propre au contact
- **Gabarit** (`src/lib/details-templates.ts`, forme du `03` et du `08`) : `CONTACT_DETAILS_TEMPLATE` (Profil, Relation, Historique, Liens, Notes libres), posé sur `details` seulement à la création d'une nouvelle personne, jamais en modification ni quand un lead est choisi (son gabarit ou son contenu déjà renseigné n'est pas écrasé)
- **Formulaire** (`ContactForm`, page `/admin/contacts/nouveau` ou `/admin/contacts/<id>`, motif `LeadForm` du `08`, arbitrage « Page ou modale d'édition » de DESIGN.md) :
  - une seule card Identité (Nom + Poste, Entreprise + Localité, précédés à la création d'un `RadioGroup` « Nouveau contact » (défaut) / « Depuis un lead »), Coordonnées (Email + Téléphone, LinkedIn en pleine largeur), Détails (éditeur, ou rendu markdown en lecture quand un lead est choisi) dans la colonne principale ; Relation (Statut, Types en sélection multiple avec glyphe) et Notes dans la colonne latérale. Grille Identité/Coordonnées identique à `LeadForm`. Cards Détails et Notes : le `CardTitle` sert de libellé (`aria-labelledby`), aucun libellé répété dedans
  - à la création, en « Depuis un lead », un `Combobox` sur `findLeadsWithoutContactRole()` (nom, puis entreprise en texte atténué, arbitrage « Option d'un sélecteur de personne ») ; le sélectionner charge et affiche Nom, Poste, Entreprise, Localité, Coordonnées, Détails et Notes depuis lui, en lecture (champ `Input` en lecture seule nommé par son libellé), sans rien écrire avant « Enregistrer » ; la saisie faite en « Nouveau contact » reste en place d'un mode à l'autre ; « Depuis un lead » sans lead choisi n'envoie rien et affiche « Choisissez un lead »
  - une seule Server Action par écriture (`createContact`, `updateContact`) ; aucun bouton « Ne plus contacter » (arbitrage « Opposition d'un contact »)
- **Vue détail** (`DetailDialog`, ordre du formulaire) : en-tête nom, sous-titre poste seul, statut en badge ; blocs Identité (Entreprise cliquable en `?detail=` vers sa vue détail, Localité), Coordonnées (Email, Téléphone, LinkedIn en pleine largeur), Détails, Relation (Types en pleine largeur avec glyphe, déjà dans l'en-tête pour le statut, dernière interaction, à conserver jusqu'au), Notes, puis Pipeline (`RelatedLinksList`, une ligne « Fiche lead : statut · intérêt », motif `relatedRows` de la maquette), vers la vue détail du lead (`/admin/leads?detail=<id>`, arbitrage « Fiches rattachées »), vide sans rôle Lead (arbitrage « Bloc vide d'une vue détail »)
- **Bloc Réseau du lead** (`LeadsTable.tsx`, remplace le bloc posé en stub par le `08`, en dernière position de la vue détail du lead, juste avant le bloc Actions du `10`) : `RelatedLinksList`, une ligne « Fiche contact : types · statut » (« Sans type » si aucun) quand `hasContactRole`, vers la vue détail du contact (`/admin/contacts?detail=<id>`)
- **`personDetailHref`** (`src/lib/person-links.ts`, fonction pure testée) : pour une personne dont le rôle n'est pas fixé par le contexte (l'apporteur d'une opportunité `15`, un correspondant d'entretien `17`, la personne d'une action), résout vers la vue détail du lead si elle porte ce rôle, sinon vers celle du contact, sinon `null` (pas de lien). Bascule aussi `buildActionDetail` (`10`, extrait en `action-detail.tsx` par le `11`), qui liait jusqu'ici la personne d'une action à sa seule fiche lead en attendant ce plan
- **Suppression** (`DeleteContactDialog`, motif `DeleteLeadDialog` du `08`) : « Supprimer « <nom> » ? » et « La fiche relation est retirée. Si cette personne n'est pas aussi un lead, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur. »
- **Liste** (`ContactsTable`, motif `LeadsTable`) : recherche sur le nom et l'entreprise ; colonnes Nom, Types (glyphes), Entreprise, Statut (`EnumBadge`), Dernière interaction, Localité, Email, LinkedIn, Notes affichées, Téléphone et « À conserver jusqu'au » masquables ; filtres Type, Statut, Localité et Échéance (« Dépassée ») ; actions de ligne Modifier et Supprimer
- **Lien profond vers une vue détail** : `/admin/contacts` lit `searchParams.detail` et le passe à `ContactsTable` (prop `initialDetailId`, qui amorce la vue détail ouverte comme `LeadsTable`), pour les lignes de `RelatedLinksList` qui visent `?detail=<id>` sur cette page
- **Page et menu** : `/admin/contacts`, titre « Contacts & relations » (maquette), bouton « Nouveau contact » menant à `/admin/contacts/nouveau` ; entrée Contacts activée, sans sous-entrée ; `[id]` est l'id de la personne
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : créer un contact, nouvelle personne
**GIVEN** l'écran Contacts
**WHEN** on crée un contact Collègue chez une entreprise, localité Luxembourg
**THEN** il apparaît dans la liste et sa vue détail montre ses types, sa localité et son entreprise
**AND** Détails porte le gabarit Profil, Relation, Historique, Liens, Notes libres

### Scénario 2 : poser le rôle depuis un lead
**GIVEN** une personne au rôle Lead, sans rôle Contact
**WHEN** on ouvre « Nouveau contact », choisit « Depuis un lead » puis cette personne, coche Mentor et enregistre
**THEN** le contact reprend ses champs en lecture, la personne porte désormais les deux rôles
**AND** elle n'est plus proposée par `findLeadsWithoutContactRole()`

### Scénario 3 : doublon
**GIVEN** une personne d'email lea@exemple.fr
**WHEN** on crée un contact « Nouveau contact » avec LEA@exemple.fr
**THEN** l'enregistrement est refusé : « Ce contact existe déjà : <nom> » sous Email

### Scénario 4 : rôle déjà posé entre l'affichage et l'envoi
**GIVEN** un lead proposé par le picker qui reçoit le rôle Contact d'un autre onglet avant l'enregistrement
**WHEN** on enregistre le formulaire
**THEN** l'action refuse sur le champ Lead : « Ce contact existe déjà : <nom> »

### Scénario 5 : ne plus contacter depuis la fiche lead
**GIVEN** une personne aux rôles Lead et Contact, avec email, LinkedIn, entreprise et notes
**WHEN** on la passe en « Ne plus contacter » depuis sa fiche lead, la confirmation annonçant qu'elle sort aussi des contacts
**THEN** elle disparaît de la liste Contacts
**AND** sa fiche lead ne garde que son email, son LinkedIn et la date

### Scénario 6 : suppression avec un autre rôle
**GIVEN** une personne aux rôles Lead et Contact
**WHEN** on supprime le contact
**THEN** le rôle Contact est retiré et la personne reste, toujours proposée comme lead

### Scénario 7 : suppression sans autre rôle
**GIVEN** une personne au seul rôle Contact
**WHEN** on la supprime
**THEN** le rôle est retiré et la personne est supprimée avec lui

### Scénario 8 : blocs symétriques
**GIVEN** une personne aux rôles Lead et Contact
**WHEN** on ouvre sa vue détail lead puis sa vue détail contact
**THEN** la vue détail lead montre un bloc Réseau (types, statut) qui mène, en `?detail=`, à la vue détail contact
**AND** la vue détail contact montre un bloc Pipeline (statut, intérêt) qui mène, en `?detail=`, à la vue détail lead

## Tests à écrire

### Unit
- `src/server/actions/contacts.test.ts` :
  - rejects a missing name
  - normalizes the LinkedIn profile link and lowercases the email
  - refuses a second contact with the same email or LinkedIn profile, naming it
  - points to the lead picker when the person only holds the lead role
  - names the stop date when the person opposed
  - creates the role on an existing person without writing its fields
  - attaches the role even when the lead's own fields would not validate
  - refuses to attach the contact role to a person who already has it
  - refuses to attach the contact role to a person who opposed
  - refuses to attach the contact role to a person that no longer exists
  - maps a missing company to its field
  - maps a concurrent duplicate on the LinkedIn profile to its field
  - refuses to attach the contact role to a person without the lead role
  - locks the person row before reading its roles and writing the contact
  - maps a unique violation on an unknown constraint to the email field
  - maps a unique violation without constraint details to the email field
  - maps a concurrent duplicate on the contact primary key to the lead field
  - maps a person deleted during the attach to person_not_found
  - rejects a call without a session, before touching the database
  - findLeadForContactAttach rejects a call without a session, before touching the database
  - findLeadForContactAttach only looks up a lead who is not opposed and not yet a contact
  - findLeadForContactAttach returns null when no such lead exists
  - ignores the contact being edited when checking duplicates
  - writes both the person fields and the role fields
  - names the lead role when the new identity belongs to a lead-only person
  - reports the lock rather than a duplicate when the person opposed since the page loaded
  - reports a contact deleted since the page loaded
  - refuses to edit an opted-out contact
  - deletes the person through one conditional statement that spares any other role
  - refuses a contact already deleted elsewhere, without touching the person
- `src/server/actions/leads.test.ts` (ajout) :
  - tells that the person is already a contact when only the contact role exists
  - reports the lock rather than a duplicate when the person opposed since the page loaded
  - reports a lead deleted since the page loaded
  - deletes the person through one conditional statement that spares any other role
  - refuses a lead already deleted elsewhere, without touching the person
- `src/server/actions/persons.test.ts` (ajout) :
  - removes the contact role when a person opts out
  - refuses to oppose a person without the lead role
- `src/lib/details-templates.test.ts` (ajout) :
  - gives the contact template its five sections
- `src/lib/person-links.test.ts` :
  - resolves to the lead detail route when the person has the lead role
  - resolves to the contact detail route when the person has only the contact role
  - prefers the lead route when the person has both roles
  - returns null when the person has neither role

### Integration
- `src/server/actions/contacts.integration.test.ts` (base réelle) :
  - deleteContact keeps a person who still holds the lead role
  - deleteContact deletes a person who holds no other role
  - createContact attach adds the contact role to a lead
  - createContact attach refuses an opposed lead and leaves no contact role
  - createContact attach refuses a person who is not a lead
  - deleteLead keeps a person who still holds the contact role
  - optOutPerson removes the contact role and keeps the lead role with its opposition date

## Edge cases

- **Lead choisi avec Détails déjà renseignés** : son contenu reste affiché, aucun gabarit ne s'applique
- **Lead choisi dont un champ change de valeur après la sélection** (entre-temps, un autre onglet) : la fiche garde la valeur lue à la sélection, la revalidation serveur ne porte que sur l'identité et le rôle
- **Contact sans dernière interaction** : la revue part de la date de création du rôle (`Contact.createdAt`)
- **Personne opposée après avoir reçu le rôle Contact** : l'opposition retire le rôle, sa page contact répond 404 et elle quitte la liste
- **Opposition pendant qu'un lead est promu « Depuis un lead »** : la ligne de la personne verrouillée des deux côtés sérialise les deux écritures ; le rattachement voit l'opposition, ou l'opposition retire le rôle tout juste posé
- **« Depuis un lead » choisi sans lead** : l'envoi est bloqué, « Choisissez un lead » sous le champ Lead
- **Lead choisi dont les champs ne passeraient plus la validation** (saisi avant une règle plus stricte) : le rattachement n'écrit que le rôle et ne les valide pas

## Architectural decisions

### Décision : données des blocs Réseau et Pipeline

**Options envisagées :**
- **A. Booléen seul** (`hasContactRole`, `hasLeadRole`) : le bloc symétrique referait une lecture séparée pour ses valeurs
- **B. Booléen et résumé du rôle** (`contactRole: { types, status } | null`, `leadRole: { status, interest } | null`) portés par `AdminLead` et `AdminContact`

**Choix : B**

**Rationale :**
- `findLeadByIdForAdmin` et `findContactByIdForAdmin` lisent déjà la personne avec ses deux rôles potentiels : ajouter le résumé du second rôle ne coûte rien à la requête
- Une lecture séparée pour un seul bloc, déjà chargé par la page, serait un aller-retour de plus sans raison

### Décision : opposition d'une personne au rôle Contact

**Options envisagées :**
- **A. Comme les leads** : bouton « Ne plus contacter » aussi sur la page d'un contact, fiche réduite gardée dans la liste Contacts, suppression avec avertissement
- **B. Côté lead seulement, rôle Contact gardé** : la personne opposée reste dans Contacts, réduite et non modifiable
- **C. Côté lead seulement, rôle Contact retiré** : l'opposition fait sortir la personne du réseau ; un contact se retire par « Supprimer »

**Choix : C** (propriétaire, 2026-10-09)

**Rationale :**
- L'opposition (art. 21) vise la prospection ; pour une relation de réseau, la réponse RGPD à une demande est l'effacement, déjà offert par « Supprimer », et le registre prévoit « Réseau : suppression à la demande de la personne »
- L'opposition vide nom, entreprise, notes et détails de la personne : la garder dans le réseau laisserait une ligne inexploitable
- La trace de l'opposition (email, LinkedIn, date) reste sur le rôle Lead, qu'un lead opposé ne peut pas perdre (`07`)
- Coût assumé : un contact sans rôle Lead à qui l'on aurait écrit puis qui dit « stop » se supprime, sans trace qui empêche de le recréer
