---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "ecran-entretiens"
goal: "Lister, créer, modifier et supprimer les entretiens depuis l'espace admin, et les montrer sur les fiches mission et lead."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["07-leads-donnees-design.md", "08-ecran-leads-design.md", "10-ecran-actions-prospection-design.md", "15-ecran-missions-design.md", "16-entretiens-donnees-design.md"]
date: "2026-09-27"
---

# Écran des entretiens

## Scope

Crée l'écran Entretiens (vues À venir et Journal, liste, page de création et de modification en cards, vue détail avec l'entretien précédent, suppression) et active son entrée de menu. Le formulaire choisit les correspondants parmi les personnes non opposées ou en crée une en ligne pour un correspondant inconnu ; l'issue ne s'affiche et ne se saisit que sur un entretien Fait. Ajoute un bloc Entretiens aux vues détail des missions et des leads, une card Entretiens aux pages des missions (avec « Nouvel entretien ») et des leads, la colonne « Entretiens » à la liste des leads et l'avertissement de cascade à la suppression d'une mission. Exclut tout Kanban (`16`) et une vue « Entretiens » des leads, que couvre la vue Missions en cours (`15`).

### État livré

À la fin de ce sub-project, on peut : cliquer « Nouvel entretien » dans la card Entretiens de la page d'une mission via une ESN, enregistrer un entretien Technique planifié demain avec un lead existant et une nouvelle personne créée en ligne, le retrouver dans À venir sous le titre « Entretien 1 · Technique », puis dans le bloc et la card Entretiens de la mission et du lead, affiché « RDV planifié ».

## Dependencies

- `07-leads-donnees-design.md` (statut: draft) : `findPersonOptions()` (personnes non opposées), `personFields`, `JOB_ROLES` et `JOB_ROLE_LABELS`, pour la création inline d'un correspondant inconnu
- `08-ecran-leads-design.md` (statut: draft) : `LeadsTable`, colonnes, vue détail et page des leads, motif de page en cards (`LeadForm`), `RelatedLinksCard`, `findCompanyOptions()` (posée pour la combobox Entreprise de `LeadForm`, réutilisée ici pour l'entreprise d'un nouveau correspondant), `SelectField`
- `10-ecran-actions-prospection-design.md` (statut: draft) : champ date et heure du formulaire des actions, sorti ici pour servir aux deux
- `15-ecran-missions-design.md` (statut: draft) : `MissionsTable`, vue détail, page et suppression d'une mission, étendues ici
- `16-entretiens-donnees-design.md` (statut: draft) : modèle, actions, lecture `AdminInterview`, `status`, `outcome`, correspondants `Person[]`, titre et entretien précédent déduits, gabarits selon le type

## Références de design

- **Maquette** : `isEntretiens` (vues `futurs` et `tous`, colonnes, filtres Type et Statut), `dlgEntretienForm` (champs), `isCompanyForm` (mise en page en cards, arbitrage « Page ou modale d'édition »), `dlgDeleteEntretien`, `dlgDetail` ; colonne `entretiens` de `isLeads`
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `core/Card`, `core/AlertDialog`, `core/Select`, `core/RadioGroup`, `core/Combobox`, `core/Calendar`, `core/Popover`, `core/Input`, `core/Badge` ; pas de `patterns/ExternalUrl` des leads, un entretien ne portant aucun lien externe
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/lib/interview-views.ts` et `src/lib/interview-views.test.ts`
- **À modifier** : `src/lib/admin-table-widths.ts` (colonnes des entretiens, colonne Entretiens des leads)
- **À créer** : `src/components/features/admin/DateTimeField.tsx` (sorti de `ProspectingActionFormDialog`)
- **À modifier** : `src/components/features/admin/prospection/ProspectingActionFormDialog.tsx` (emploie `DateTimeField`)
- **À modifier** : `src/server/queries/missions.ts` (entretiens de la mission, missions proposables à un entretien)
- **À modifier** : `src/server/queries/leads.ts` (entretiens du lead avec leur mission)
- **À modifier** : `src/server/queries/interviews.ts` (entretien lu par son identifiant)
- **À créer** : `src/components/features/admin/entretiens/InterviewsTable.tsx`, `InterviewForm.tsx`, `DeleteInterviewDialog.tsx`, `InterviewsViewPage.tsx`
- **À créer** : `src/app/admin/(protected)/entretiens/page.tsx` et `loading.tsx`, `entretiens/journal/page.tsx` et `loading.tsx`, `entretiens/nouveau/page.tsx` et `loading.tsx`, `entretiens/[id]/page.tsx` et `loading.tsx`
- **À modifier** : `src/components/features/admin/missions/MissionsTable.tsx` (bloc Entretiens)
- **À modifier** : `src/app/admin/(protected)/missions/[id]/page.tsx` (card Entretiens avec « Nouvel entretien »)
- **À modifier** : `src/components/features/admin/missions/DeleteMissionDialog.tsx` (entretiens supprimés avec la mission)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (bloc Entretiens, colonne Entretiens)
- **À modifier** : `src/app/admin/(protected)/leads/[id]/page.tsx` (card Entretiens)
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Entretiens activée)
- **À modifier** : `docs/DESIGN.md` (ligne « Champ date et heure » de § Post-MVP vers § Formulaires, via le skill `design-doc`)

## Architecture approach

- **Vues** (`src/lib/interview-views.ts`, fonctions pures, motif des vues des leads et des missions) :

| Vue | Route | Lignes | Tri par défaut |
|---|---|---|---|
| À venir | `/admin/entretiens` | Planifié, date non passée | le prochain d'abord |
| Journal | `/admin/entretiens/journal` | tous | le plus récent d'abord |

  Titres et sous-titres de la maquette (`entrViewTitle`, `entrViewHint`). Le « statut » de la maquette couvre désormais le seul `status` ; l'issue (`outcome`), absente de la maquette, s'y ajoute (`16`). La vue À venir reçoit l'instant figé au montage de la table, comme les leads (`10`)
- **Liste** (`InterviewsTable`, motif `LeadsTable`) : colonnes Titre (déduit par `interviewPlaces` et `interviewTitle` du `16`, calculés sur tous les entretiens et jamais sur la seule vue), Mission, Mené par (logo et nom de l'ESN ou du client final de la mission), Date et heure, Type, Statut, Issue, Localité, Mode et TJM (lus sur la mission), Score, Décision, Correspondants ; colonnes affichées par défaut celles de la maquette (`entrCols`) dans À venir, toutes dans Journal, la vue complète (arbitrage « Colonnes par vue »), les autres masquables ; filtres Type, Statut et Issue ; recherche sur la mission, l'entreprise et les correspondants
- **Formulaire** (`InterviewForm`, page `/admin/entretiens/nouveau` ou `/admin/entretiens/<id>`, motif `LeadForm` du `08`, arbitrage « Page ou modale d'édition » de DESIGN.md) : cards reprenant les blocs de la vue détail. Colonne principale : Mission (Mission parmi les missions non closes, la mission déjà reliée restant affichée ; Mené par en `RadioGroup` de deux options nommées par l'entreprise, l'option ESN désactivée pour une mission en client direct), Échange (Type, Statut, Issue visible seulement si Statut vaut Fait, facultative, « Non renseignée » possible, Date et heure en `DateTimeField`, Correspondants en sélection multiple parmi les personnes non opposées (`findPersonOptions()`, `07`) ou « Nouvelle personne » ajoutée en ligne (nom, poste, entreprise choisie parmi `findCompanyOptions()` du `08`, email, LinkedIn), créée au rôle Contact à l'enregistrement (`16`) ; les correspondants déjà reliés restant affichés), Détails. Colonne latérale : Évaluation (Score, Décision, « Non renseignée » possible), Notes. Détails reçoit le gabarit du type à la création et le change avec le type tant que rien n'est écrit (`detailsAfterTemplateChange`, `16`). La page de création accepte une mission de départ par `?mission=<id>`, retenue seulement si la mission est proposable, et ramène alors à la page de la mission après l'enregistrement ; sinon elle ramène à l'écran Entretiens. La ligne porte Modifier (lien vers la page) et Supprimer ; le « Modifier » de la vue détail mène à la même page
- **Écart avec la maquette**, décidé au `16` : titre, entreprise (recherchée dans tout le CRM), localisation, mode, TJM et entretien lié ne se saisissent plus ; ils se déduisent de l'ordre ou se lisent sur la mission
- **Champ date et heure** (`src/components/features/admin/DateTimeField.tsx`) : le composant local du formulaire des actions (`10`) sort tel quel, date par `Popover` et `Calendar`, heure par un `Input` de type `time`, instant envoyé par `toInstant` avec le décalage du navigateur
- **Vue détail** : titre déduit, sous-titre « <mission> · <entreprise qui mène> », statut en tête ; blocs Échange (type, statut, issue, date et heure, mené par, correspondants, un correspondant opposé marqué « Ne plus contacter » lu sur son `optedOutAt`), Évaluation (score, décision), Mission (TJM, contrat, mode, localité, en lecture), Entretien précédent (son titre et sa date), Notes, Détails. Un bloc sans donnée disparaît (arbitrage du `08`)
- **Suppression** (`DeleteInterviewDialog`) : titre de la maquette avec le titre déduit ; texte « Les entretiens suivants de la mission se renumérotent. »
- **Missions** (`15`) : bloc Entretiens dans la vue détail (titre, date et heure, statut, du plus ancien au plus récent) ; card Entretiens sur la page de la mission (arbitrage « Élément rattaché à une fiche »), mêmes entretiens menant chacun à sa page, avec le bouton « Nouvel entretien » qui ouvre la page de création sur cette mission ; aucun bouton de ligne ; la confirmation de suppression d'une mission ajoute « Ses entretiens sont supprimés avec elle. »
- **Leads** (`08`) : bloc Entretiens dans la vue détail (type, mission, date et heure, statut, le plus récent d'abord) ; card Entretiens sur la page du lead, mêmes entretiens menant chacun à sa page ; colonne « Entretiens » (nombre, `_count` du `16`), affichée par défaut dans Tous comme la maquette, masquable ailleurs
- **Lectures** : `AdminMission` gagne ses entretiens (type, statut, date, création) ; `findMissionOptions()` rend les missions non closes avec leur ESN et leur client final ; `AdminLead` gagne pour chaque entretien son type et l'intitulé de sa mission ; `findInterviewByIdForAdmin(id)` lit un entretien pour sa page
- **Menu** : entrée « Entretiens » du groupe CRM activée, sous-entrées « À venir » et « Journal » (maquette)
- **Rules** : `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : depuis une mission
**GIVEN** une mission via une ESN et un lead non opposé
**WHEN** on clique « Nouvel entretien » dans la card Entretiens de sa page et enregistre un entretien Technique planifié demain, mené par l'ESN, avec le lead et une nouvelle personne créée en ligne
**THEN** la page de la mission revient, sa card Entretiens listant « Entretien 1 · Technique », qui apparaît aussi dans À venir, TJM et localité de la mission affichés
**AND** le lead affiche « RDV planifié »

### Scénario 2 : mené par
**GIVEN** une mission en client direct
**WHEN** on ouvre le formulaire d'un entretien de cette mission
**THEN** l'option ESN de « Mené par » est désactivée et le client final est choisi

### Scénario 3 : gabarit
**GIVEN** un nouvel entretien Recruteur/RH, Détails intact
**WHEN** on passe le type à Technique
**THEN** Détails prend le gabarit Technique ; une fois du texte saisi, changer de type ne le touche plus

### Scénario 4 : Journal et détail
**GIVEN** un Premier contact passé et un Technique à venir dans la même mission
**WHEN** on ouvre le Journal puis la vue détail du Technique
**THEN** le Technique vient en premier ; sa vue détail nomme le Premier contact comme entretien précédent

### Scénario 5 : fiches reliées
**GIVEN** l'entretien du scénario 1
**WHEN** on ouvre la vue détail puis la page de la mission et celle du lead
**THEN** chacune montre l'entretien dans son bloc ou sa card Entretiens ; dans Leads > Tous, la colonne Entretiens de ce lead vaut 1

### Scénario 6 : correspondant inconnu
**GIVEN** le formulaire d'un entretien
**WHEN** on y ajoute une nouvelle personne en correspondant (nom, poste Recruteur, email)
**THEN** l'entretien enregistré la compte parmi ses correspondants, créée au rôle Contact

### Scénario 7 : issue conditionnée au statut
**GIVEN** un entretien Planifié
**WHEN** on ouvre son formulaire
**THEN** Issue est masquée
**AND** passer le Statut à Fait affiche Issue, facultative

## Tests à écrire

### Unit
- `src/lib/interview-views.test.ts` :
  - keeps planned interviews still to come in the upcoming view, soonest first
  - keeps every interview in the journal, most recent first

## Edge cases

- **Entretien d'une mission close** : la mission reste affichée dans le formulaire, sans être proposée à un nouvel entretien ; le « Nouvel entretien » de sa page ouvre la page de création sans mission choisie
- **Correspondant passé en « ne plus contacter »** : il reste parmi les correspondants de ses entretiens, marqué dans la vue détail, et n'est plus proposé pour un autre
- **Entretien Planifié dont la date est passée** : il sort de À venir et reste au Journal jusqu'à ce que son statut soit mis à jour
- **Mission passée en client direct avec un entretien mené par l'ESN** : le formulaire montre l'option ESN désactivée mais choisie ; l'enregistrer impose le client final (`16`)

## Architectural decisions

### Décision : créer un entretien depuis une mission

**Options envisagées :**
- **A. Depuis l'écran Entretiens seulement**
- **B. Aussi par un bouton « Nouvel entretien » sur la ligne d'une mission**, formulaire déjà rattaché
- **C. Aussi depuis la card Entretiens de la page d'une mission**, page de création déjà rattachée

**Choix : C**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : un entretien appartient toujours à une mission, et un élément rattaché se crée depuis la page de sa fiche, jamais par un bouton de ligne (arbitrage « Élément rattaché à une fiche » de DESIGN.md)

### Décision : page ou modale

**Options envisagées :**
- **A. Modale**, comme la maquette (`dlgEntretienForm`)
- **B. Page en cards**, comme une entreprise

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27, consignée dans les arbitrages de DESIGN.md : un compte rendu d'entretien est un markdown long

### Décision : missions proposées

**Options envisagées :**
- **A. Toutes les missions**
- **B. Les missions non closes** (ni Refusée, ni Déclinée, ni Abandonnée), la mission déjà reliée restant affichée

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : on ne planifie pas d'entretien sur une opportunité close ; la liste reste courte
