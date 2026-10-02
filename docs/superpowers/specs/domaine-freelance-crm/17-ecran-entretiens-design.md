---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "ecran-entretiens"
goal: "Lister, créer, modifier et supprimer les entretiens depuis l'espace admin, et les montrer sur les fiches opportunité et lead."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["04-liste-entreprises-enrichie-design.md", "07-leads-donnees-design.md", "08-ecran-leads-design.md", "10-ecran-actions-prospection-design.md", "13-contacts-design.md", "15-ecran-opportunites-design.md", "16-entretiens-donnees-design.md"]
date: "2026-09-27"
---

# Écran des entretiens

## Scope

Crée l'écran Entretiens (vues À venir et Journal, liste, page de création et de modification en cards, vue détail avec l'entretien précédent, suppression) et active son entrée de menu. Le formulaire choisit les correspondants parmi les personnes non opposées (recherche « Chercher un lead ou un contact ») ou en crée une en ligne pour un correspondant inconnu, au type de contact choisi par l'utilisateur ; l'issue ne s'affiche et ne se saisit que sur un entretien Fait. Ajoute un bloc Entretiens aux vues détail des opportunités et des leads, une card Entretiens en `RelatedLinksList` aux pages des opportunités (avec « Nouvel entretien ») et des leads, la colonne « Entretiens » à la liste des leads et l'avertissement de cascade à la suppression d'une opportunité. Exclut tout Kanban (`16`) et une vue « Entretiens » des leads, que couvre la vue Opportunités en cours (`15`).

### État livré

À la fin de ce sub-project, on peut : cliquer « Nouvel entretien » dans la card Entretiens de la page d'une opportunité via une ESN, enregistrer un entretien Technique planifié demain avec un lead existant et une nouvelle personne créée en ligne au type de contact choisi, le retrouver dans À venir sous le titre « Entretien 1 · Technique », puis dans le bloc et la card Entretiens de l'opportunité et du lead, affiché « RDV planifié ».

## Dependencies

- `04-liste-entreprises-enrichie-design.md` (statut: draft) : `EnumBadge`, employé ici pour les glyphes des badges d'énumération et des selects
- `07-leads-donnees-design.md` (statut: draft) : `findPersonOptions()` (personnes non opposées), `personFields`, `JOB_ROLES` et `JOB_ROLE_LABELS`, pour la création inline d'un correspondant inconnu
- `08-ecran-leads-design.md` (statut: draft) : `LeadsTable`, colonnes, vue détail et page des leads, motif de page en cards (`LeadForm`), `RelatedLinksList` et `RelatedLinksCard`, `findCompanyOptions()` (posée pour la combobox Entreprise de `LeadForm`, réutilisée ici pour l'entreprise d'un nouveau correspondant), `SelectField`
- `10-ecran-actions-prospection-design.md` (statut: draft) : champ date et heure du formulaire des actions, sorti ici pour servir aux deux
- `13-contacts-design.md` (statut: draft) : `ContactType`, `CONTACT_TYPES`, `CONTACT_TYPE_LABELS`, `CONTACT_TYPE_ICONS`, route `/admin/contacts`, pour le type de contact d'un correspondant inconnu et les correspondants cliquables
- `15-ecran-opportunites-design.md` (statut: draft) : `OpportunitiesTable`, vue détail, page et suppression d'une opportunité, étendues ici
- `16-entretiens-donnees-design.md` (statut: draft) : modèle, actions, lecture `AdminInterview`, `status`, `outcome`, correspondants `Person[]`, titre et entretien précédent déduits, gabarits selon le type, `INTERVIEW_TYPE_ICONS`, `INTERVIEW_STATUS_ICONS`, `INTERVIEW_OUTCOME_ICONS`, `INTERVIEW_DECISION_ICONS`

## Références de design

- **Maquette** : `isEntretiens` (vues `futurs` et `tous`, colonnes, filtres Type et Statut), `isInterviewForm` (champs), `isCompanyForm` (mise en page en cards, arbitrage « Page ou modale d'édition »), `dlgDeleteEntretien`, `dlgDetail` ; colonne `entretiens` de `isLeads`
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `patterns/RelatedLinksList`, `patterns/EnumBadge`, `core/Card`, `core/AlertDialog`, `core/Select`, `core/RadioGroup`, `core/Combobox`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Badge` ; pas de `patterns/ExternalUrl` des leads, un entretien ne portant aucun lien externe
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/lib/interview-views.ts` et `src/lib/interview-views.test.ts`
- **À modifier** : `src/lib/admin-table-widths.ts` (colonnes des entretiens, colonne Entretiens des leads)
- **À créer** : `src/components/features/admin/DateTimeField.tsx` (sorti de `ProspectingActionFormDialog`)
- **À modifier** : `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx` (emploie `DateTimeField`)
- **À modifier** : `src/server/queries/opportunities.ts` (entretiens de l'opportunité, opportunités proposables à un entretien)
- **À modifier** : `src/server/queries/leads.ts` (entretiens du lead avec leur opportunité)
- **À modifier** : `src/server/queries/interviews.ts` (entretien lu par son identifiant ; `select` de `correspondents` étendu de `lead` et `contact`, pour `personDetailHref`, `13`)
- **À créer** : `src/components/features/admin/entretiens/InterviewsTable.tsx`, `InterviewForm.tsx`, `DeleteInterviewDialog.tsx`, `InterviewsViewPage.tsx`
- **À créer** : `src/app/admin/(protected)/entretiens/page.tsx` et `loading.tsx`, `entretiens/journal/page.tsx` et `loading.tsx`, `entretiens/nouveau/page.tsx` et `loading.tsx`, `entretiens/[id]/page.tsx` et `loading.tsx`
- **À modifier** : `src/components/features/admin/opportunities/OpportunitiesTable.tsx` (bloc Entretiens)
- **À modifier** : `src/app/admin/(protected)/opportunites/[id]/page.tsx` et `opportunites/nouvelle/page.tsx` (card Entretiens en `RelatedLinksList`, avec « Nouvel entretien », vide et désactivée à la création ; lecture de `?detail=`)
- **À modifier** : `src/components/features/admin/opportunities/DeleteOpportunityDialog.tsx` (entretiens supprimés avec l'opportunité)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (bloc Entretiens, colonne Entretiens, glyphes des badges)
- **À modifier** : `src/app/admin/(protected)/leads/[id]/page.tsx` et `leads/nouveau/page.tsx` (card Entretiens en `RelatedLinksList` ; lecture de `?detail=`)
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Entretiens activée)
- **À modifier** : `docs/DESIGN.md` (ligne « Champ date et heure » de § Post-MVP vers § Formulaires, via le skill `design-doc`)

## Architecture approach

- **Vues** (`src/lib/interview-views.ts`, fonctions pures, motif des vues des leads et des opportunités) :

| Vue | Route | Lignes | Tri par défaut |
|---|---|---|---|
| À venir | `/admin/entretiens` | Planifié, date non passée | le prochain d'abord |
| Journal | `/admin/entretiens/journal` | tous | le plus récent d'abord |

  Titres et sous-titres de la maquette (`entrViewTitle`, `entrViewHint`). Le « statut » de la maquette couvre désormais le seul `status` ; l'issue (`outcome`), absente de la maquette, s'y ajoute (`16`). La vue À venir reçoit l'instant figé au montage de la table, comme les leads (`10`)
- **Liste** (`InterviewsTable`, motif `LeadsTable`) : colonnes Titre (déduit par `interviewPlaces` et `interviewTitle` du `16`, calculés sur tous les entretiens et jamais sur la seule vue), Opportunité, Mené par (logo et nom de l'ESN ou du client final de l'opportunité), Date et heure, Type, Statut, Issue, Localité, Mode et TJM (lus sur l'opportunité), Score, Décision, Correspondants ; colonnes affichées par défaut celles de la maquette (`entrCols`) dans À venir, toutes dans Journal, la vue complète (arbitrage « Colonnes par vue »), les autres masquables ; filtres Type, Statut et Issue ; recherche sur l'opportunité, l'entreprise et les correspondants. Les badges Type, Statut, Issue et Décision passent par `EnumBadge` (glyphe `INTERVIEW_TYPE_ICONS`, `INTERVIEW_STATUS_ICONS`, `INTERVIEW_OUTCOME_ICONS`, `INTERVIEW_DECISION_ICONS` du `16`)
- **Formulaire** (`InterviewForm`, page `/admin/entretiens/nouveau` ou `/admin/entretiens/<id>`, motif `LeadForm` du `08`, arbitrage « Page ou modale d'édition » de DESIGN.md) : cards reprenant les blocs de la vue détail. Colonne principale :
  - card **Opportunité** : champ Opportunité (parmi les opportunités non closes, l'opportunité déjà reliée restant affichée) et Mené par (`RadioGroup` de deux options nommées par l'entreprise, l'option ESN désactivée pour une opportunité en client direct)
  - card **Échange** : Type et Date et heure (`DateTimeField`) sur la même ligne ; Statut et Issue sur la ligne suivante, Issue visible seulement si Statut vaut Fait (facultative, « Non renseignée » possible), Statut seul en pleine largeur sinon ; puis Correspondants, en sélection multiple parmi les personnes non opposées (`findPersonOptions()`, `07`, recherche « Chercher un lead ou un contact ») ou « Nouveau contact » ajouté en ligne (grille Nom et Poste, Entreprise (`findCompanyOptions()` du `08`) et Type de contact choisi par l'utilisateur, Email et LinkedIn ; aide « Chaque nouvelle personne devient un contact du type choisi. Le reste de sa fiche se complète depuis Contacts. »), créé au rôle Contact du type choisi à l'enregistrement (`16`) ; les correspondants déjà reliés restant affichés
  - card **Détails**, gabarit du type à la création, changé avec le type tant que rien n'est écrit (`detailsAfterTemplateChange`, `16`)

  Colonne latérale : card **Évaluation** (Score sans aide, Décision « Non renseignée » possible), card **Notes** (une ligne, aide « Une ligne de marqueurs, séparés par | »). Les `Select` de Type, Statut, Issue, Décision et Type de contact affichent le glyphe de chaque `SelectItem` (`EnumBadge`, glyphes du `16` et de `13`). La page de création accepte une opportunité de départ par `?opportunity=<id>`, retenue seulement si l'opportunité est proposable, et ramène alors à la page de l'opportunité après l'enregistrement ; sinon elle ramène à l'écran Entretiens. La ligne porte Modifier (lien vers la page) et Supprimer ; le « Modifier » de la vue détail mène à la même page
- **Écart avec la maquette**, décidé au `16` : titre, entreprise (recherchée dans tout le CRM), localisation, mode, TJM et entretien lié ne se saisissent plus ; ils se déduisent de l'ordre ou se lisent sur l'opportunité
- **Champ date et heure** (`src/components/features/admin/DateTimeField.tsx`) : le composant local du formulaire des actions (`10`) sort tel quel, date par `Popover` et `Calendar`, heure par un `Input` de type `time`, instant envoyé par `toInstant` avec le décalage du navigateur
- **Vue détail** : titre déduit, sous-titre = entreprise qui mène ; blocs **Opportunité** (ligne cliquable vers la vue détail de l'opportunité, `/admin/opportunites/toutes?detail=<id>`, puis TJM, Contrat, Mode, Localité en lecture), **Échange** (Type, Date et heure, Issue, Correspondants via `personDetailHref` (`13`, en texte simple pour un correspondant sans rôle Lead ni Contact), un correspondant opposé marqué « Ne plus contacter » lu sur son `optedOutAt` ; ni statut ni mené par, déjà portés par l'en-tête et le bloc Opportunité), **Détails**, **Évaluation** (score, décision), **Notes**, **Entretien précédent** (cliquable, vers `/admin/entretiens/journal?detail=<id>`). Un bloc sans donnée disparaît (arbitrage du `08`)
- **Suppression** (`DeleteInterviewDialog`) : titre de la maquette avec le titre déduit ; texte « Les entretiens suivants de l'opportunité se renumérotent. »
- **Opportunités** (`15`) : bloc Entretiens dans la vue détail, en `RelatedLinksList` (titre déduit, méta = statut, date en `trailing`), chaque ligne menant en `?detail=` à la vue détail de l'entretien sur sa vue complète (`/admin/entretiens/journal?detail=<id>`) ; card Entretiens en `RelatedLinksList`, distincte, sur la page d'édition de l'opportunité (arbitrage « Élément rattaché à une fiche »), même contenu mais chaque ligne menant cette fois à la page d'édition de l'entretien (arbitrage « cards des pages d'édition » de DESIGN.md), avec le bouton « Nouvel entretien » qui ouvre la page de création sur cette opportunité ; aucun bouton de ligne ; présente aussi sur la page de création, vide, bouton désactivé (« Après l'enregistrement de l'opportunité. ») ; la confirmation de suppression d'une opportunité ajoute « Ses entretiens sont supprimés avec elle. »
- **Leads** (`08`) : bloc Entretiens dans la vue détail, en `RelatedLinksList` (type, opportunité en méta, statut, date en `trailing`, le plus récent d'abord), chaque ligne menant en `?detail=` à la vue détail de l'entretien sur sa vue complète ; card Entretiens en `RelatedLinksList`, distincte, sur la page du lead, après la card Opportunités apportées (`15`), même contenu mais chaque ligne menant à la page d'édition de l'entretien, sans bouton de création (un entretien se crée depuis l'opportunité) ; présente aussi sur la page de création, vide (« Après l'enregistrement du lead. ») ; colonne « Entretiens » (nombre, `_count` du `16`), affichée par défaut dans Tous comme la maquette, masquable ailleurs
- **`?detail=`** : les pages À venir et Journal lisent `searchParams.detail` et l'ouvrent dans `InterviewsTable` au chargement (prop `initialDetailId` de `DataTable`, `08`), pour la navigation depuis l'Entretien précédent ou les cards des opportunités et des leads
- **Lectures** : `AdminOpportunity` gagne ses entretiens (type, statut, date, création) ; `findOpportunityOptions()` rend les opportunités non closes avec leur ESN et leur client final ; `AdminLead` gagne pour chaque entretien son type et l'intitulé de son opportunité ; `findInterviewByIdForAdmin(id)` lit un entretien pour sa page
- **Menu** : entrée « Entretiens » du groupe CRM activée, sous-entrées « À venir » et « Journal » (maquette)
- **Rules** : `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : depuis une opportunité
**GIVEN** une opportunité via une ESN et un lead non opposé
**WHEN** on clique « Nouvel entretien » dans la card Entretiens de sa page et enregistre un entretien Technique planifié demain, mené par l'ESN, avec le lead et une nouvelle personne créée en ligne
**THEN** la page de l'opportunité revient, sa card Entretiens listant « Entretien 1 · Technique », qui apparaît aussi dans À venir, TJM et localité de l'opportunité affichés
**AND** le lead affiche « RDV planifié »

### Scénario 2 : mené par
**GIVEN** une opportunité en client direct
**WHEN** on ouvre le formulaire d'un entretien de cette opportunité
**THEN** l'option ESN de « Mené par » est désactivée et le client final est choisi

### Scénario 3 : gabarit
**GIVEN** un nouvel entretien Recruteur/RH, Détails intact
**WHEN** on passe le type à Technique
**THEN** Détails prend le gabarit Technique ; une fois du texte saisi, changer de type ne le touche plus

### Scénario 4 : Journal et détail
**GIVEN** un Premier contact passé et un Technique à venir dans la même opportunité
**WHEN** on ouvre le Journal puis la vue détail du Technique
**THEN** le Technique vient en premier ; sa vue détail nomme le Premier contact comme entretien précédent, le lien ouvrant sa vue détail dans le Journal

### Scénario 5 : fiches reliées
**GIVEN** l'entretien du scénario 1
**WHEN** on ouvre la vue détail puis la page de l'opportunité et celle du lead
**THEN** chacune montre l'entretien dans son bloc ou sa card Entretiens ; dans Leads > Tous, la colonne Entretiens de ce lead vaut 1

### Scénario 6 : correspondant inconnu
**GIVEN** le formulaire d'un entretien
**WHEN** on y ajoute un « Nouveau contact » en correspondant (nom, type de contact Commercial, email)
**THEN** l'entretien enregistré la compte parmi ses correspondants, créée au rôle Contact du type choisi

### Scénario 7 : issue conditionnée au statut
**GIVEN** un entretien Planifié
**WHEN** on ouvre son formulaire
**THEN** Issue est masquée et Statut occupe la pleine largeur de sa ligne
**AND** passer le Statut à Fait affiche Issue à ses côtés, facultative

## Tests à écrire

### Unit
- `src/lib/interview-views.test.ts` :
  - keeps planned interviews still to come in the upcoming view, soonest first
  - keeps every interview in the journal, most recent first

## Edge cases

- **Entretien d'une opportunité close** : l'opportunité reste affichée dans le formulaire, sans être proposée à un nouvel entretien ; le « Nouvel entretien » de sa page ouvre la page de création sans opportunité choisie
- **Correspondant passé en « ne plus contacter »** : il reste parmi les correspondants de ses entretiens, marqué dans la vue détail, et n'est plus proposé pour un autre
- **Entretien Planifié dont la date est passée** : il sort de À venir et reste au Journal jusqu'à ce que son statut soit mis à jour
- **Opportunité passée en client direct avec un entretien mené par l'ESN** : le formulaire montre l'option ESN désactivée mais choisie ; l'enregistrer impose le client final (`16`)

## Architectural decisions

### Décision : créer un entretien depuis une opportunité

**Options envisagées :**
- **A. Depuis l'écran Entretiens seulement**
- **B. Aussi par un bouton « Nouvel entretien » sur la ligne d'une opportunité**, formulaire déjà rattaché
- **C. Aussi depuis la card Entretiens de la page d'une opportunité**, page de création déjà rattachée

**Choix : C**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : un entretien appartient toujours à une opportunité, et un élément rattaché se crée depuis la page de sa fiche, jamais par un bouton de ligne (arbitrage « Élément rattaché à une fiche » de DESIGN.md)

### Décision : page ou modale

**Options envisagées :**
- **A. Modale**, comme la maquette (`isInterviewForm`)
- **B. Page en cards**, comme une entreprise

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27, consignée dans les arbitrages de DESIGN.md : un compte rendu d'entretien est un markdown long

### Décision : opportunités proposées

**Options envisagées :**
- **A. Toutes les opportunités**
- **B. Les opportunités non closes** (ni Refusée, ni Déclinée, ni Abandonnée), l'opportunité déjà reliée restant affichée

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : on ne planifie pas d'entretien sur une opportunité close ; la liste reste courte
