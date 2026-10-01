---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "ecran-missions"
goal: "Lister, filtrer, créer, modifier et supprimer les missions depuis l'espace admin, les montrer sur les fiches entreprise et lead, et déduire le statut « Deal » d'un lead de ses missions acceptées."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["02-entreprise-enrichie-donnees-design.md", "03-formulaire-entreprise-enrichi-design.md", "04-liste-entreprises-enrichie-design.md", "07-leads-donnees-design.md", "08-ecran-leads-design.md", "10-ecran-actions-prospection-design.md", "14-missions-donnees-design.md"]
date: "2026-09-27"
---

# Écran des missions

## Scope

Crée l'écran Missions (vues En cours, Acceptées et Toutes, liste, page de création et de modification en cards, vue détail, suppression) et une entrée de menu dans le groupe CRM. Ajoute un bloc « Missions » aux vues détail et une card de liens aux pages des entreprises (en tant qu'ESN ou client final) et des leads (missions apportées), étend le dérivé `worked` d'une entreprise aux missions acceptées (ESN ou client final), calcule ses clients finaux depuis ses missions acceptées (`endClients`) et ajoute la colonne « Clients finaux » à la liste des entreprises, compte les missions dans le refus de suppression d'une entreprise et déduit le statut affiché « Deal » d'un lead dès qu'une de ses missions est acceptée. Exclut le suivi de mission (phases, chantiers, CRA), les entretiens (`16`, `17`) et le retrait de « RDV planifié » (`16`).

### État livré

À la fin de ce sub-project, on peut : ouvrir Missions dans le menu, créer une mission via une ESN chez un client final, apportée par un lead, avec son démarrage au mois ; la retrouver dans En cours, puis, passée à Acceptée, dans Acceptées ; voir le lead afficher « Deal » et sortir des vues En cours et Chauds ; voir la mission dans les vues détail et sur les pages du lead, de l'ESN et du client final, l'ESN et le client final apparaître dans la vue Travaillées des entreprises et le client final dans la colonne « Clients finaux » de l'ESN.

## Dependencies

- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : enum `Zone` (`src/lib/zones.ts`)
- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : éditeur Pages CMS Editor (`Editor`) du champ Détails
- `04-liste-entreprises-enrichie-design.md` (statut: draft) : `CompaniesTable`, vue détail d'une entreprise
- `07-leads-donnees-design.md` (statut: draft) : `findPersonOptionsWithLeadRole()` (`src/server/queries/persons.ts`), `personDisplayName` (`src/lib/persons.ts`), `NONE_VALUE` (`src/lib/schemas/person.ts`)
- `08-ecran-leads-design.md` (statut: draft) : `LeadsTable`, vues des leads, motifs de page en cards (`LeadForm`) et de vue détail, pages du lead et de l'entreprise, `RelatedLinksCard`, `SelectField`
- `10-ecran-actions-prospection-design.md` (statut: draft) : état de `LeadsTable` et `LeadsViewPage` après ses ajouts
- `14-missions-donnees-design.md` (statut: draft) : modèle, validation, actions et lecture des missions

## Références de design

- **Maquette** : aucun écran de liste des missions ; l'écran reprend le motif des listes admin de `isLeads`, la vue détail celui de `dlgDetail`, la page en cards celle de `isCompanyForm`, et les faits d'une mission ceux de l'en-tête de `isMissions` (rôle, TJM, rythme, contrat, « via » l'ESN). `isCompanies` et `isLeads` pour les blocs ajoutés
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `core/Card`, `core/Select`, `core/Combobox`, `core/Input`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `src/lib/leads.ts` (libellés sans Deal, statut affiché et son libellé)
- **À créer** : `src/lib/lead-display-status.ts` et `src/lib/lead-display-status.test.ts`
- **À modifier** : `src/lib/lead-views.ts` et `src/lib/lead-views.test.ts` (vues lues sur le statut affiché)
- **À créer** : `src/lib/mission-views.ts` et `src/lib/mission-views.test.ts`
- **À modifier** : `src/lib/missions.ts` (titres des blocs, rythme affiché)
- **À modifier** : `src/lib/companies.ts` (clients finaux et travaillée depuis les missions acceptées, libellé des liens d'une entreprise)
- **À créer** : `src/lib/companies.test.ts`
- **À modifier** : `src/lib/details-templates.ts` et `src/lib/details-templates.test.ts` (gabarit mission)
- **À modifier** : `src/lib/admin-table-widths.ts` (colonnes des missions, colonne Clients finaux des entreprises)
- **À modifier** : `src/server/queries/leads.ts` (missions apportées dans `AdminLead`)
- **À modifier** : `src/server/queries/companies.ts` (missions de l'entreprise, compte des missions, types dans les options d'entreprise, `worked` étendu aux missions acceptées, `endClients`)
- **À créer** : `src/components/features/admin/MonthField.tsx` et `MonthField.test.tsx` (mois et année, un choix à moitié fait envoyé tel quel pour que la validation le refuse)
- **À modifier** : `src/lib/schemas/mission.ts` (rythme et jours sur site lisent « Non renseigné » comme une valeur vide)
- **À créer** : `src/components/features/admin/missions/MissionsTable.tsx`, `MissionForm.tsx`, `DeleteMissionDialog.tsx`, `MissionsViewPage.tsx`
- **À créer** : `src/app/admin/(protected)/missions/page.tsx`, `acceptees/page.tsx`, `toutes/page.tsx`, `nouvelle/page.tsx`, `[id]/page.tsx`, chacun avec son `loading.tsx`
- **À modifier** : `src/server/queries/missions.ts` (mission lue par son identifiant)
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (bloc Missions, colonne et ligne Clients finaux)
- **À modifier** : `src/components/features/admin/companies/DeleteCompanyDialog.tsx` (missions dans le refus)
- **À modifier** : `src/app/admin/(protected)/entreprises/[id]/page.tsx` (card Missions)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (statut affiché, bloc Missions apportées, filtre Statut)
- **À modifier** : `src/app/admin/(protected)/leads/[id]/page.tsx` (card Missions apportées)
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Missions)
- **À modifier** : `docs/DESIGN.md` (ligne « Mois de démarrage » de § Post-MVP vers § Formulaires, via le skill `design-doc`)

## Architecture approach

- **Menu et routes** (décidé le 2026-09-27) : entrée « Missions » dans le groupe CRM, entre Leads et Actions prospection, avec trois sous-entrées ; le groupe « Suivi mission » reste pour le suivi à venir, qui repartira des missions acceptées

| Vue | Route | Titre | Lignes | Tri par défaut |
|---|---|---|---|---|
| En cours | `/admin/missions` | Missions en cours | Proposée, En process, Offre reçue | démarrage le plus proche d'abord, sans démarrage en dernier |
| Acceptées | `/admin/missions/acceptees` | Missions acceptées | Acceptée | démarrage le plus récent d'abord |
| Toutes | `/admin/missions/toutes` | Toutes les missions | toutes, closes comprises | mise à jour la plus récente d'abord |

  Sous-titres : « Opportunités proposées, en process ou avec une offre reçue. », « Missions gagnées, point de départ du suivi de mission. », « Toutes les opportunités, en pause et closes comprises. » ; fonctions pures dans `src/lib/mission-views.ts`, sur le motif des vues des leads (`08`)
- **Liste** (`MissionsTable`, motif `LeadsTable`) : colonnes Intitulé, Statut, Apporteur, ESN, Client final (logo et nom), TJM (« 580 € »), Contrat, Mode, Rythme (« 4 j dont 2 sur site »), Localité, Démarrage (« avril 2026 »), Durée (« 6 mois »), Notes, masquables sauf Intitulé et Actions, toutes visibles par défaut dans Toutes (arbitrage « Colonnes par vue »), En cours et Acceptées en masquant selon leur objet ; filtres Statut, Contrat, Mode, Localité ; recherche sur l'intitulé, le rôle, l'ESN et le client final
- **Formulaire** (`MissionForm`, page `/admin/missions/nouvelle` ou `/admin/missions/<id>`, motif `LeadForm` du `08`, arbitrage « Page ou modale d'édition » de DESIGN.md, `.claude/rules/shadcn-ui/components.md`) : cards reprenant les blocs de la vue détail. Colonne principale : Mission (Intitulé, Rôle, Statut), Relations (Apporteur parmi les personnes au rôle Lead non opposées, `findPersonOptionsWithLeadRole()` du `07`, l'apporteur déjà relié restant affiché ; ESN parmi les seules entreprises de type ESN / Recrutement, « Aucune » pour un client direct ; Client final parmi toutes les entreprises sauf l'ESN choisie), Détails (éditeur, ADR-024). Colonne latérale : Conditions (TJM, Contrat, Mode, Rythme et Jours sur site en listes de 1 à 5 et de 0 à 5, Localité en `SelectField`), Calendrier (Démarrage en `MonthField`, Durée en mois), Notes. Détails pré-rempli à la création : Contexte, Profil recherché, Contenu technique. La ligne porte Modifier (lien vers la page) et Supprimer ; le « Modifier » de la vue détail mène à la même page ; « Nouvelle mission » mène à `/admin/missions/nouvelle`
- **Mois de démarrage** (`MonthField`, décidé le 2026-09-27) : deux `Select` côte à côte, Mois et Année, de l'année passée à dans deux ans, plus « Non renseigné » ; envoie `AAAA-MM` ou une valeur vide, lu depuis la mission par `toMonthValue` (`14`)
- **Vue détail** : titre, sous-titre « rôle · via <ESN> » ou « rôle · client direct », statut en tête ; blocs Conditions (TJM, contrat, mode, rythme, localité), Calendrier (démarrage, durée), Relations (apporteur marqué « Ne plus contacter » s'il s'est opposé, ESN, client final), Notes, Détails (`MarkdownContent` en variante `admin`, `04`). Un bloc sans donnée disparaît (arbitrage du `08`)
- **Suppression** (`DeleteMissionDialog`) : « Supprimer « <intitulé> » ? » et « L'apporteur, l'ESN et le client final restent. »
- **Statut du lead affiché** (`src/lib/lead-display-status.ts`, fonction pure) : « Deal » dès qu'une mission apportée est Acceptée, sinon le statut saisi. `LeadStatus` ne porte pas `DEAL` (`07`) : c'est une valeur affichée, jamais saisie ; la reprise Notion (`20`) crée une mission Acceptée pour chaque lead Deal. Les vues des leads (`08`) se lisent sur le statut affiché : En cours et Chauds excluent un lead « Deal ». Le filtre Statut de la liste des leads propose « Deal » à côté des statuts saisis ; le formulaire du lead ne le propose plus
- **Blocs ajoutés** : vue détail d'une entreprise, bloc « Missions » (intitulé, statut, rôle de l'entreprise : ESN ou client final, TJM) ; vue détail d'un lead, bloc « Missions apportées » (intitulé, statut, client final). Les lectures `AdminCompany` et `AdminLead` incluent ces missions, sans lecture de plus
- **Cards ajoutées** (arbitrage « Élément rattaché à une fiche ») : sur la page d'une entreprise, card « Missions » (intitulé, statut, rôle) ; sur la page d'un lead, card « Missions apportées » (intitulé, statut, client final) ; chaque mission mène à sa page (`RelatedLinksCard` du `08`)
- **Clients finaux et travaillée d'une entreprise** (`src/lib/companies.ts`, fonctions pures) : `joinedEndClientNames` lit les clients des missions Acceptée où l'entreprise est ESN, chacun une fois, triés `localeCompare("fr")` ; `worked` (`04`, sur les `ClientMeta`) s'étend aux missions Acceptée où l'entreprise est ESN ou client final. `AdminCompany.endClients` et `.worked` se calculent dans `src/server/queries/companies.ts`, jamais stockés (décidé le 2026-09-27). La colonne « Clients finaux » de `CompaniesTable` (largeur dans `admin-table-widths.ts`) est un livrable du `15`, le `04` ne la fournit plus ; visible par défaut dans Toutes et Travaillées, qui inclut désormais les entreprises à mission acceptée
- **Refus de suppression d'une entreprise** : « Cette entreprise est rattachée à <liens> et ne peut pas être supprimée. », où <liens> nomme les seuls comptes non nuls (« 2 projets », « 1 mission », « 2 projets et 1 mission »), le compte des missions venant de celles où elle est ESN ou client final (`_count`)
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : créer une mission
**GIVEN** un lead, une ESN et un client final
**WHEN** on crée depuis Missions une mission via l'ESN chez ce client, apportée par le lead, démarrage avril 2026
**THEN** elle apparaît dans En cours, Démarrage « avril 2026 », Détails pré-rempli par Contexte, Profil recherché et Contenu technique

### Scénario 2 : mission acceptée et lead Deal
**GIVEN** la mission du scénario 1 et son lead en Discussion, dans la vue Chauds
**WHEN** on passe la mission à Acceptée
**THEN** elle quitte En cours pour Acceptées, et le lead affiche « Deal », hors des vues En cours et Chauds
**AND** l'ESN et le client final apparaissent désormais dans la vue Travaillées des entreprises

### Scénario 3 : fiches reliées
**GIVEN** la mission acceptée
**WHEN** on ouvre les vues détail du lead, de l'ESN et du client final
**THEN** chacune montre la mission dans son bloc ; la colonne et la ligne « Clients finaux » de l'ESN contiennent le client final
**AND** sur leurs pages, la card de missions la liste, son intitulé menant à la page de la mission

### Scénario 4 : ESN choisie
**GIVEN** le formulaire d'une mission
**WHEN** on ouvre la liste ESN puis la liste Client final après avoir choisi une ESN
**THEN** la première ne propose que les entreprises de type ESN / Recrutement, la seconde ne propose pas l'ESN choisie

### Scénario 5 : entreprise utilisée
**GIVEN** une entreprise ESN d'une mission et d'aucun projet
**WHEN** on veut la supprimer
**THEN** le bouton de suppression est désactivé : « Cette entreprise est rattachée à 1 mission et ne peut pas être supprimée. »

## Tests à écrire

### Unit
- `src/lib/lead-display-status.test.ts` :
  - shows Deal once one of its missions is accepted
  - keeps the entered status otherwise
- `src/lib/lead-views.test.ts` :
  - keeps a lead with an accepted mission out of the ongoing and hot views
- `src/lib/mission-views.test.ts` :
  - keeps proposed, in-process and offered missions in the ongoing view, soonest start first
  - keeps accepted missions in the accepted view
- `src/lib/companies.test.ts` :
  - names each accepted mission's end client once, sorted
  - marks a company worked once one of its missions is accepted, as intermediary or as client
- `src/lib/details-templates.test.ts` :
  - gives the mission template its three sections

## Edge cases

- **Mission sans démarrage** : rangée après les autres dans En cours et Acceptées
- **Apporteur opposé** : la mission reste ; il est marqué « Ne plus contacter » dans la vue détail, et reste affiché dans le formulaire
- **Entreprise à la fois ESN d'une mission et client final d'une autre** : son bloc Missions liste les deux, chacune avec le rôle de l'entreprise
- **Lead Deal par mission, remis en Perdu à la main** : l'affichage reste « Deal » tant que la mission est acceptée, le fait l'emportant sur la saisie

## Architectural decisions

### Décision : place de l'écran

**Options envisagées :**
- **A. Entrée « Missions » du groupe CRM**, le groupe « Suivi mission » gardé pour le suivi
- **B. Entrée existante « Suivi mission > Missions »** : opportunités et suivi mêlés

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : une mission est d'abord une opportunité du pipeline, le suivi ne concerne que les acceptées

### Décision : page ou modale

**Options envisagées :**
- **A. Modale**, comme les autres saisies de l'écran
- **B. Page en cards**, comme une entreprise

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27, consignée dans les arbitrages de DESIGN.md : la mission se remplit longuement (Détails en markdown) et regroupe ses entretiens (`17`), et plus tard son suivi

### Décision : saisie du mois

**Options envisagées :**
- **A. Champ mois natif du navigateur** : absent de Firefox
- **B. Deux listes Mois et Année**

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : même rendu dans tous les navigateurs, composé de `Select` déjà employés

### Décision : fiches en « Deal » à la migration

**Options envisagées :**
- **A. Garder la valeur en base sans la proposer** : deux sources pour le même fait
- **B. Passer les fiches en Discussion**, le statut affiché lisant les missions

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 ; une seule source, la mission acceptée
