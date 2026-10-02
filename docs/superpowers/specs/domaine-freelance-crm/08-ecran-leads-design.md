---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "ecran-leads"
goal: "Lister, filtrer, créer, modifier, supprimer et opposer (RGPD en deux temps) les leads depuis l'espace admin, avec les vues En cours, Chauds, À qualifier, Stand-by et Tous ; active aussi la vue Prospects des entreprises."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["01-rgpd-prospection-design.md", "02-entreprise-enrichie-donnees-design.md", "03-formulaire-entreprise-enrichi-design.md", "07-leads-donnees-design.md"]
date: "2026-09-29"
---

# Écran des leads

## Scope

Crée l'écran Leads de l'espace admin : cinq vues dans le menu, liste avec recherche, colonnes masquables et filtres, page de création et de modification en cards (Identité, Coordonnées, Détails, Pipeline, Notes) avec le champ Détails pré-rempli selon l'origine, vue détail, suppression et opposition RGPD en deux temps (`OptOutPersonDialog`, `ErasePersonExchangesDialog`). Active aussi la vue Prospects des entreprises, dérivée du rôle Lead. Exclut les éléments rattachés à la personne (actions `10`, opportunités `15`, entretiens `17`, signaux `19`), qui ajoutent chacun leur card sous le formulaire et leur bloc à la vue détail, les colonnes Actions et Entretiens, le rôle Contact (`13`) et le calcul automatique du score (agents internes).

### État livré

À la fin de ce sub-project, on peut : ouvrir Leads dans le menu et arriver sur la vue En cours, créer un lead outbound depuis la page « Nouveau lead » et trouver Détails pré-rempli par Hypothèse / Angle et Contexte, le retrouver dans En cours puis dans À qualifier, ouvrir sa vue détail, le modifier sur sa page, l'opposer (« Ne plus contacter » puis, sur sa fiche déjà opposée, « Effacer les échanges ») et ne plus le voir que dans Tous, marqué comme tel ; ouvrir Entreprises > Prospects et y retrouver les entreprises non travaillées portant au moins un lead actif.

## Dependencies

- `01-rgpd-prospection-design.md` (statut: draft) : rubrique « Demandes RGPD » de `docs/PRODUCTION.md`, complétée ici par les boutons et les actions de l'écran
- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : libellés des zones (`src/lib/zones.ts`)
- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : éditeur Pages CMS Editor installé et `src/lib/details-templates.ts` créé
- `07-leads-donnees-design.md` (statut: draft) : modèles `Person` et `Lead`, validation, actions et lectures

## Références de design

- **Maquette** : `isLeads`, `isLeadForm` (champs), `isCompanyForm` (mise en page en cards, arbitrage « Page ou modale d'édition »), `dlgDeleteLead`, `dlgDetail`
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/ExternalUrl`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `core/Card`, `core/AlertDialog`, `core/Checkbox`, `core/Select`, `core/Combobox`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/app/admin/(protected)/leads/page.tsx` et `loading.tsx` (vue En cours)
- **À créer** : `src/app/admin/(protected)/leads/chauds/`, `a-qualifier/`, `stand-by/`, chacun `page.tsx` et `loading.tsx`
- **À créer** : `src/app/admin/(protected)/leads/tous/page.tsx` et `loading.tsx` (lit aussi `searchParams.detail`)
- **À créer** : `src/components/features/admin/leads/LeadsViewPage.tsx` (coquille commune aux cinq pages : titre, sous-titre, bouton « Nouveau lead », table de la vue)
- **À créer** : `src/components/features/admin/leads/LeadsTable.tsx` (colonnes, filtres, vue détail, actions de ligne, `initialDetailId`)
- **À créer** : `src/components/features/admin/leads/LeadForm.tsx` (formulaire en cards, création et modification, prop `relatedCards`)
- **À créer** : `src/components/features/admin/SelectField.tsx` (champ de formulaire partagé avec `ContactForm` `13`, `15`, `17`, `18`, `19` ; la date de rencontre emploie `OptionalDateField`, créé au `05`)
- **À créer** : `src/app/admin/(protected)/leads/nouveau/page.tsx` et `loading.tsx`, `src/app/admin/(protected)/leads/[id]/page.tsx` et `loading.tsx`
- **À créer** : `src/components/features/admin/leads/DeleteLeadDialog.tsx`
- **À créer** : `src/components/features/admin/persons/OptOutPersonDialog.tsx` (`OptOutTarget`, forme commune au lead et au contact), `ErasePersonExchangesDialog.tsx`
- **À créer** : `src/lib/lead-views.ts` et `src/lib/lead-views.test.ts` (appartenance et tri de chaque vue, titres)
- **À modifier** : `src/lib/details-templates.ts` (gabarits lead inbound et outbound, bascule selon l'origine) et **à créer** `src/lib/details-templates.test.ts`
- **À modifier** : `src/lib/leads.ts` (titre du bloc Pipeline)
- **À modifier** : `src/lib/persons.ts` (titres des blocs Identité, Coordonnées, Détails, Notes, Opposition)
- **À modifier** : `src/lib/admin-table-widths.ts` (largeurs des colonnes des leads, colonnes visibles par vue, largeurs du squelette)
- **À modifier** : `src/server/queries/companies.ts` (options d'entreprise du formulaire : identifiant et nom seulement ; dérivé `isProspect`)
- **À modifier** : `src/components/features/admin/DetailDialog.tsx` (bouton « Modifier » facultatif, absent pour une fiche en opposition)
- **À modifier** : `src/components/features/admin/DataTable.tsx` (prop `initialDetailId`, ouvre la vue détail de cette ligne au chargement)
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Leads et ses cinq sous-entrées ; entrée Prospects sous Entreprises)
- **À créer** : `src/components/features/admin/RelatedLinksList.tsx` (lignes « libellé : méta » des fiches rattachées, miroir `.design-sync/design-system/components/post-mvp/cards/RelatedLinksList.*`)
- **À créer** : `src/components/features/admin/RelatedLinksCard.tsx` (enveloppe `RelatedLinksList` d'un titre et d'une action d'en-tête, reprise par `15` et `17`)
- **À modifier** : `src/server/queries/leads.ts` (leads d'une entreprise)
- **À modifier** : `src/app/admin/(protected)/entreprises/[id]/page.tsx` et `src/app/admin/(protected)/entreprises/nouvelle/page.tsx` (card Leads passée à `CompanyForm` via `relatedCards`, en lecture, vide à la création)
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (bloc « Leads » de la vue détail de l'entreprise, `04`)
- **À modifier** : `src/app/admin/(protected)/entreprises/page.tsx` (lit aussi `searchParams.detail`)
- **À créer** : `src/app/admin/(protected)/entreprises/prospects/page.tsx` et `loading.tsx`
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (vue Prospects, `VIEW_FILTER.prospects`, `initialDetailId`)
- **À modifier** : `docs/PRODUCTION.md` (rubrique « Demandes RGPD » : boutons « Ne plus contacter » et « Effacer les échanges », noms concrets)
- **À modifier** : `docs/DESIGN.md` (ligne « Fiches rattachées » de § Post-MVP vers § Cards et grilles, via le skill `design-doc`)

## Architecture approach

- **Vues** (`src/lib/lead-views.ts`, fonctions pures) : même motif que les vues des entreprises (`04`), chaque page passe sa vue à `LeadsTable`, qui filtre en mémoire et reconstruit ses colonnes. Une fiche en opposition (`optedOutAt` non nul) n'entre que dans Tous

| Vue | Route | Titre | Lignes | Tri par défaut |
|---|---|---|---|---|
| En cours | `/admin/leads` | Leads en cours | statut Nouveau, Suspect ou Discussion | date de rencontre, plus récentes d'abord |
| Chauds | `/admin/leads/chauds` | Leads chauds | intérêt Hot, statut ni Perdu ni Hors ICP | date de rencontre, plus récentes d'abord |
| À qualifier | `/admin/leads/a-qualifier` | Leads à qualifier | statut Nouveau | date de rencontre, plus anciennes d'abord |
| Stand-by | `/admin/leads/stand-by` | Leads en stand-by | statut Stand-by | date de rencontre, plus anciennes d'abord |
| Tous | `/admin/leads/tous` | Tous les leads | toutes, fiches en opposition comprises | nom, fiches en opposition en dernier |

  Sous-titres : ceux de la maquette (`leadViewHint`). Une date de rencontre absente se range après les autres, quel que soit le sens. RDV planifié et Deal, jamais stockés (`07`), n'entrent pas encore dans ces filtres : leur calcul rejoindra les vues quand les entretiens (`16`) et les opportunités (`15`) existeront
- **Pages** : chaque page garde son `getCurrentUser()` et son `loading.tsx` d'une ligne (`.claude/rules/nextjs/auth.md`), lit `findAllLeadsForAdmin` et les options d'entreprise, sans `'use cache'` comme les autres écrans admin
- **Liste** (`DataTable`) : recherche sur le nom et le nom de l'entreprise. Colonnes : Nom (toujours affiché), Statut, Intérêt (cellule vide si non renseigné, `LeadInterest?` ne porte pas de valeur « inconnu »), Score, Origine, Canal, Date de rencontre (`formatShortDate`, triable), Poste, Entreprise (tuile `CompanyLogoTile` et nom), Localité, LinkedIn et Email (`ExternalUrl`), Téléphone, Notes (une ligne, `TruncateTooltip`), Actions (Modifier, lien vers la page du lead ; Supprimer). Statut, Intérêt, Origine et Canal en `EnumBadge` (`04`, glyphe et libellé). Le bouton « Nouveau lead » de l'en-tête mène à `/admin/leads/nouveau`. Poste est absent de la maquette mais présent dans Notion, où il sert à qualifier : ajouté, décision du propriétaire
- **Colonnes visibles par défaut** (arbitrage « Colonnes par vue ») : celles de la maquette (`LEAD_VIEW_COLS`), moins Stack, Actions et Entretiens, plus Poste ; Tous les montre toutes
- **Filtres** : Statut, Intérêt (Hot, Warm, Cold seulement, sans option pour l'absence de valeur), Origine, Poste, Localité, chacun à une valeur par ligne désormais que la localité est au singulier ; la vue Chauds reste `interest === "HOT"`
- **Fiche en opposition** dans Tous : nom remplacé par l'email ou le lien LinkedIn (`personDisplayName`), badge « Ne plus contacter » à la place du statut, action Modifier absente, Supprimer disponible, action « Effacer les échanges » disponible tant que `exchangesErasedAt` n'est pas posée
- **Lien profond vers une vue détail** : `DataTable` gagne une prop `initialDetailId?: string` qui ouvre la vue détail de cette ligne au chargement ; les pages `/admin/leads/tous` et `/admin/entreprises` la lisent depuis `searchParams.detail`, pour les lignes de `RelatedLinksList` qui visent `?detail=<id>` sur ces deux routes
- **Formulaire** (`LeadForm`, page `/admin/leads/nouveau` ou `/admin/leads/<id>`, motif `CompanyForm` : titre et boutons Annuler, Enregistrer en tête, deux colonnes de cards, retour à la liste après enregistrement ; arbitrage « Page ou modale d'édition » de DESIGN.md) :
  - champs de la maquette (`isLeadForm`) rangés dans les cards des blocs de la vue détail : Identité (Nom et Poste, Entreprise en combobox des entreprises du CRM et Localité en `Select` simple), Coordonnées (Email et Téléphone, LinkedIn en pleine largeur), Détails (éditeur, ADR-024) dans la colonne principale ; Pipeline (Statut et Intérêt en `Select` avec l'option « Non renseigné » (`NONE_VALUE`), Origine et Canal, Date de rencontre en `Calendar` français et Score de 0 à 10) et Notes (une ligne, aide « Une ligne de marqueurs, séparés par | ») dans la colonne latérale ; `Select` avec un glyphe devant chaque option pour Statut, Intérêt, Origine et Canal
  - cards Identité, Coordonnées, Détails et Notes : le `CardTitle` sert de libellé (`aria-labelledby`), aucun libellé répété dedans
  - un lead se crée toujours de zéro, plus de choix « Nouvelle personne / Personne existante »
  - une seule Server Action par écriture : `createLead` crée toujours la personne et le rôle ; `updateLead` écrit les deux lignes (`07`)
  - le formulaire reçoit une prop `relatedCards` rendue dans sa colonne principale après Détails (arbitrage « Élément rattaché à une fiche ») : les éléments rattachés à la personne (actions `10`, opportunités apportées `15`, entretiens `17`, signaux `19`) y ajoutent chacun leur card, présente aussi à la création en liste vide avec bouton désactivé
  - la page d'un lead en opposition renvoie vers Tous : sa fiche ne se modifie plus (`07`)
  - le formulaire envoie toujours tous les champs (`07`) ; `useFormActionSubmit` pour les `Select` ; messages de doublon et d'opposition du `07` sous le champ Email ou LinkedIn
  - Détails se pré-remplit quand l'origine est choisie : Outbound donne Hypothèse / Angle et Contexte ; Inbound donne Contexte, l'opportunité proposée ayant sa propre fiche (`14`) et le signal le sien (`19`). Changer d'origine remplace le gabarit tant que Détails est vide ou égal au gabarit de l'origine précédente ; un texte saisi n'est jamais écrasé. En modification, aucun gabarit ne s'applique
- **Gabarits** (`src/lib/details-templates.ts`, forme du gabarit entreprise du `03`, titres et puces de la fiche Notion) :
  - Outbound : `# 💡 Hypothèse / Angle` (Hypothèse de besoin, Angle de pitch, Objectif du contact), `# 🎯 Contexte` ; le signal qui a déclenché la prospection devient une ligne du modèle Signal (`19`), les conditions annoncées d'une offre de poste relèvent de l'opportunité (`14`)
  - Inbound : `# 🎯 Contexte`
- **Vue détail** (`DetailDialog`, arbitrage « Blocs d'une vue détail ») : en-tête avec le nom et le poste seul en sous-titre, le statut en badge ; blocs Identité (Entreprise cliquable en `?detail=` vers sa vue détail, Localité), Coordonnées (Email, Téléphone, LinkedIn en pleine largeur), Détails rendu par `MarkdownContent` en variante `admin` (`04`) en pleine largeur, Pipeline (Statut n'y figurant pas, déjà en tête : Intérêt, Score, Origine, Canal, Date de rencontre), Notes, Réseau (lien `?detail=` vers la vue détail du contact quand `hasContactRole` est vrai, encore toujours faux avant `13`), puis, en `RelatedLinksList` et en `?detail=`, les blocs ajoutés par `10` (Actions), `15` (Opportunités apportées), `17` (Entretiens) et `19` (Signaux). Bloc sans donnée retiré. Fiche en opposition : un seul bloc Opposition (email, LinkedIn, date du stop, date d'effacement des échanges si posée), sans bouton Modifier (`onEdit` devenu facultatif dans `DetailDialog`)
- **Suppression** (`DeleteLeadDialog`, `ConfirmDeleteDialog`) : « Supprimer « <nom> » ? » et « Un lead perdu se garde plutôt avec le statut « Perdu ». Si cette personne n'est pas aussi un contact, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur. » ; `hasContactRole` (`07`, toujours `false` avant `13`) prévu dans `AdminLead` pour que `13` fasse varier ce texte sans y retoucher ; pour une fiche en opposition, « La trace de son opposition disparaît : plus rien n'empêchera de recontacter cette personne. », puisque la supprimer efface la seule trace du « stop »
- **Opposition RGPD, deux dialogues** (`src/components/features/admin/persons/`, `AlertDialog`) :
  - `OptOutPersonDialog` : bouton de l'en-tête de la page, à côté d'Annuler, en modification seulement ; confirmation « Ne plus contacter « <nom> » ? » et « La fiche est vidée : seuls l'email, le lien LinkedIn et la date sont gardés, pour ne jamais recontacter cette personne. Ses actions et ses signaux restent dans son historique, sans être réutilisés, sauf si elle en demande l'effacement. Action irréversible. », plus une case à cocher « La personne demande aussi l'effacement de nos échanges » qui, cochée, enchaîne `optOutPerson` puis `erasePersonExchanges` (`07`) dans la même confirmation ; affiche un toast et mène à Tous
  - `ErasePersonExchangesDialog` : disponible dans Leads > Tous sur une fiche déjà opposée sans `exchangesErasedAt`, appelle seule `erasePersonExchanges`
- **Page entreprise** : `CompanyForm` (`03`) reçoit sa prop `relatedCards` avec la card Leads (`RelatedLinksCard` enveloppant `RelatedLinksList`), ses leads par nom avec leur poste en méta, chacun menant à sa page ; présente aussi à la création, vide avec « Après l'enregistrement de l'entreprise. ». La maquette ne porte aucune action dans l'en-tête de cette card côté entreprise : pas de bouton de création (décision du propriétaire, 2026-10-02), à la différence des cards Opportunités (`15`) et Signaux (`19`), déjà décidées avec un bouton
- **Vue détail de l'entreprise** (`CompaniesTable`, `04`) : bloc « Leads » en fin de vue détail, en `RelatedLinksList`, chaque ligne menant en `?detail=` à la vue détail du lead ; premier des trois blocs de fin de vue détail d'une entreprise (Leads, Opportunités `15`, Signaux `19`), chacun ajouté par son plan à la suite du précédent
- **Vue Prospects des entreprises** (`src/server/queries/companies.ts`, `AdminCompany.isProspect`) : une entreprise est prospect si elle n'est pas travaillée (`worked`, dérivé du `04`) et porte au moins une personne au rôle Lead, non opposée, au statut Nouveau, Suspect ou Discussion. Page `/admin/entreprises/prospects` sur le motif des autres vues d'entreprise, entrée de menu Prospects sous Entreprises, `VIEW_FILTER.prospects` dans `CompaniesTable` ; colonnes et facettes des entreprises inchangées
- **Menu** : l'entrée Leads reçoit son `href` et ses cinq sous-entrées, dans l'ordre des vues ci-dessus
- **Rules** : `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : arrivée sur En cours
**GIVEN** des leads aux statuts Nouveau, Discussion, Perdu et Stand-by
**WHEN** on clique Leads dans le menu
**THEN** la page `/admin/leads` affiche « Leads en cours » avec les seuls leads Nouveau et Discussion, les plus récemment rencontrés d'abord

### Scénario 2 : création d'un lead outbound
**GIVEN** la page « Nouveau lead » ouverte
**WHEN** on choisit l'origine Outbound
**THEN** Détails se remplit des sections Hypothèse / Angle et Contexte
**AND** en passant à Inbound sans rien avoir écrit, Détails ne garde que Contexte
**AND** après enregistrement, le lead apparaît dans En cours et dans À qualifier

### Scénario 3 : doublon signalé
**GIVEN** une personne existante avec un lien LinkedIn
**WHEN** on crée un lead avec le même profil copié autrement
**THEN** le champ LinkedIn affiche « Ce lead existe déjà : » suivi du nom, la page garde la saisie

### Scénario 4 : vue détail
**GIVEN** un lead avec entreprise, localité, notes et Détails
**WHEN** on clique sa ligne
**THEN** la vue détail montre Identité, Coordonnées, Détails, Pipeline et Notes mis en forme, le statut en tête

### Scénario 5 : opposition simple
**GIVEN** un lead ouvert sur sa page
**WHEN** on clique « Ne plus contacter » sans cocher la case d'effacement, puis confirme
**THEN** il disparaît de toutes les vues sauf Tous, où il porte le badge « Ne plus contacter » sans action Modifier, avec l'action « Effacer les échanges » disponible
**AND** sa vue détail ne montre que l'email, le LinkedIn et la date du stop

### Scénario 6 : opposition avec effacement
**GIVEN** un lead ouvert sur sa page
**WHEN** on clique « Ne plus contacter », coche « La personne demande aussi l'effacement de nos échanges » et confirme
**THEN** la personne est opposée et ses échanges effacés dans le même geste
**AND** sa vue détail dans Tous montre la date d'effacement, sans action « Effacer les échanges »

### Scénario 7 : filtres
**GIVEN** la vue Tous
**WHEN** on filtre sur la localité Luxembourg et le poste Recruteur
**THEN** seuls les leads à la localité Luxembourg et au poste Recruteur restent

### Scénario 8 : vue Prospects
**GIVEN** une entreprise non travaillée avec un lead non opposé au statut Discussion et une entreprise travaillée avec un lead au même statut
**WHEN** on ouvre Entreprises > Prospects
**THEN** seule la première entreprise apparaît

## Tests à écrire

### Unit
- `src/lib/lead-views.test.ts` :
  - keeps only new, suspect and discussion leads in the in-progress view
  - keeps hot leads outside lost and out-of-profile in the hot view
  - keeps opted-out leads out of every view but all
  - sorts leads without a meeting date last, whatever the direction
- `src/lib/details-templates.test.ts` :
  - gives the outbound template the hypothesis and context sections
  - gives the inbound template the context section only
  - swaps the template when the origin changes before anything is written
  - keeps written details when the origin changes

`isProspect` (`src/server/queries/companies.ts`) n'a pas de test dédié : `toAdminCompany` n'est pas exportée (comme `worked` avant elle), sa règle se vérifie par le parcours manuel (vue Prospects).

## Edge cases

- **Lead sans entreprise** : colonne Entreprise vide (`EmptyValue`) dans la liste, ligne Entreprise vide dans le bloc Identité de la vue détail
- **Lead sans poste** : sous-titre de la vue détail absent, l'en-tête ne garde que le nom
- **Entreprise supprimée** entre l'ouverture du formulaire et l'envoi : message `company_not_found` du `07` sous le champ Entreprise
- **Vue sans ligne** : état vide générique de la liste, texte propre aux leads
- **Fiche en opposition sans email** : son nom affiché est le lien LinkedIn
- **Entreprise sans lead** : bloc « Leads » absent de sa vue détail (arbitrage « bloc sans donnée »), card Leads de sa page à « Aucun lead dans cette entreprise. »
- **Page d'un lead en opposition ouverte par son adresse** : renvoi vers Tous, jamais de formulaire
- **Effacement déjà posé** : `ErasePersonExchangesDialog` ne s'affiche plus dans Tous une fois `exchangesErasedAt` posée, qu'elle vienne de la case de `OptOutPersonDialog` ou d'un appel séparé

## Architectural decisions

### Décision : page d'arrivée

**Options envisagées :**
- **A. Tous**, comme la liste des entreprises et la maquette
- **B. En cours**, la vue de travail quotidienne de Notion, absente du menu de la maquette

**Choix : B**

**Rationale :**
- Choix du propriétaire ; les cinq vues figurent au menu, Tous restant à un clic

### Décision : page ou modale

**Options envisagées :**
- **A. Modale**, comme la maquette (`isLeadForm`)
- **B. Page en cards**, comme une entreprise

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27, consignée dans les arbitrages de DESIGN.md : le lead se remplit longuement (Détails en markdown) et regroupe ses actions, opportunités, entretiens et signaux, gérés dans des cards de sa page

### Décision : où voir une fiche en opposition

**Options envisagées :**
- **A. Dans toutes les vues** où son statut la placerait
- **B. Seulement dans Tous**, marquée

**Choix : B**

**Rationale :**
- Une fiche vidée n'a plus rien à faire dans une vue de travail
- Elle reste trouvable pour la supprimer à l'échéance des 3 ans (`01`)

### Décision : un dialogue d'opposition ou deux

**Options envisagées :**
- **A. Un seul dialogue** qui poserait toujours `optOutPerson` puis `erasePersonExchanges`, sans distinction
- **B. Deux dialogues** : `OptOutPersonDialog` avec une case facultative qui enchaîne les deux actions, `ErasePersonExchangesDialog` seul pour l'effacement demandé après coup

**Choix : B**

**Rationale :**
- Les deux actions RGPD restent distinctes en base (`optedOutAt`, `exchangesErasedAt`) et la personne peut demander l'effacement après avoir déjà été opposée : un seul dialogue ne couvrirait pas ce cas
- La case de `OptOutPersonDialog` évite un aller-retour dans Tous pour la situation la plus fréquente (les deux demandes ensemble)
