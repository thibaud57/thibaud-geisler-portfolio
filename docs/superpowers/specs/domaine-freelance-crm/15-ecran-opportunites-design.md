---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "ecran-opportunites"
goal: "Lister, filtrer, créer, modifier et supprimer les opportunités depuis l'espace admin, les montrer sur les fiches entreprise et lead, et déduire le statut « Deal » d'un lead de ses opportunités acceptées."
status: "draft"
complexity: "L"
tdd_scope: "partial"
depends_on: ["02-entreprise-enrichie-donnees-design.md", "03-formulaire-entreprise-enrichi-design.md", "04-liste-entreprises-enrichie-design.md", "07-leads-donnees-design.md", "08-ecran-leads-design.md", "10-ecran-actions-prospection-design.md", "13-contacts-design.md", "14-opportunites-donnees-design.md"]
date: "2026-09-27"
---

# Écran des opportunités

## Scope

Crée l'écran Opportunités (vues En cours, Acceptées et Toutes, liste, page de création et de modification en cards, vue détail, suppression) et une entrée de menu dans le groupe CRM, entre Revues hebdo et Entretiens. Ajoute un bloc « Opportunités » aux vues détail et une card de liens aux pages des entreprises (en tant qu'ESN ou client final) et des leads (opportunités apportées), étend le dérivé `worked` d'une entreprise aux opportunités acceptées (ESN ou client final), calcule ses clients finaux depuis ses opportunités acceptées (`endClients`) et ajoute la colonne « Clients finaux » à la liste des entreprises, compte les opportunités dans le refus de suppression d'une entreprise et déduit le statut affiché « Deal » d'un lead dès qu'une de ses opportunités est acceptée. Exclut le suivi de mission (phases, chantiers, CRA), les entretiens (`16`, `17`) et le retrait de « RDV planifié » (`16`).

### État livré

À la fin de ce sub-project, on peut : ouvrir Opportunités dans le menu, créer une opportunité via une ESN chez un client final, apportée par un lead, avec son démarrage au mois ; la retrouver dans En cours, puis, passée à Acceptée, dans Acceptées ; voir le lead afficher « Deal » et sortir des vues En cours et Chauds ; voir l'opportunité dans les vues détail et sur les pages du lead, de l'ESN et du client final, l'ESN et le client final apparaître dans la vue Travaillées des entreprises et le client final dans la colonne « Clients finaux » de l'ESN.

## Dependencies

- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : enum `Zone` (`src/lib/zones.ts`)
- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : éditeur Pages CMS Editor (`Editor`) du champ Détails
- `04-liste-entreprises-enrichie-design.md` (statut: draft) : `CompaniesTable`, vue détail d'une entreprise
- `07-leads-donnees-design.md` (statut: draft) : `findPersonOptionsWithLeadRole()` (`src/server/queries/persons.ts`), `personDisplayName` (`src/lib/persons.ts`), `NONE_VALUE` (`src/lib/schemas/person.ts`)
- `08-ecran-leads-design.md` (statut: draft) : `LeadsTable`, vues des leads, motifs de page en cards (`LeadForm`) et de vue détail, pages du lead et de l'entreprise, `RelatedLinksCard`, `RelatedLinksList`, prop `relatedCards` des formulaires, prop `initialDetailId` de `DataTable`, `SelectField`
- `10-ecran-actions-prospection-design.md` (statut: draft) : état de `LeadsTable` et `LeadsViewPage` après ses ajouts
- `13-contacts-design.md` (statut: draft) : `personDetailHref` (`src/lib/person-links.ts`), pour l'apporteur d'une opportunité, qui peut être lead ou contact
- `14-opportunites-donnees-design.md` (statut: draft) : modèle, validation, actions et lecture des opportunités

## Références de design

- **Maquette** : la liste reprend `isCrmMissions` (motif des listes admin, comme `isLeads`), la page en cards `isMissionForm` (motif `isCompanyForm`), la vue détail `missionDetail` (rôle, TJM, rythme, contrat, « via » l'ESN dans l'en-tête) ; identifiants internes de la maquette, gardés tels quels (§ Conventions, renommage Mission vers Opportunity). `isCompanies` et `isLeads` pour les blocs ajoutés aux fiches entreprise et lead
- **Design system** : `patterns/DataTable`, `patterns/OptionsPopover`, `patterns/FacetFilter`, `patterns/SearchInput`, `patterns/PaginationFooter`, `patterns/DetailDialog`, `patterns/ConfirmDeleteDialog`, `patterns/BadgeList`, `patterns/TruncateTooltip`, `patterns/RowActionButton`, `patterns/EmptyState`, `patterns/EmptyValue`, `patterns/CompanyLogoTile`, `patterns/RelatedLinksList`, `patterns/EnumBadge`, `core/Card`, `core/Select`, `core/Combobox`, `core/Popover`, `core/Input`, `core/Badge`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À modifier** : `src/lib/leads.ts` (libellés sans Deal, statut affiché et son libellé)
- **À créer** : `src/lib/lead-display-status.ts` et `src/lib/lead-display-status.test.ts`
- **À modifier** : `src/lib/lead-views.ts` et `src/lib/lead-views.test.ts` (vues lues sur le statut affiché)
- **À créer** : `src/lib/opportunity-views.ts` et `src/lib/opportunity-views.test.ts`
- **À modifier** : `src/lib/opportunities.ts` (titres des blocs, rythme affiché)
- **À modifier** : `src/lib/companies.ts` (clients finaux et travaillée depuis les opportunités acceptées, libellé des liens d'une entreprise)
- **À créer** : `src/lib/companies.test.ts`
- **À modifier** : `src/lib/details-templates.ts` et `src/lib/details-templates.test.ts` (gabarit opportunité)
- **À modifier** : `src/lib/admin-table-widths.ts` (colonnes des opportunités, colonne Clients finaux des entreprises)
- **À modifier** : `src/server/queries/leads.ts` (opportunités apportées dans `AdminLead`)
- **À modifier** : `src/server/queries/companies.ts` (opportunités de l'entreprise, compte des opportunités, types dans les options d'entreprise, `worked` étendu aux opportunités acceptées, `endClients`)
- **À créer** : `src/components/features/admin/MonthField.tsx` et `MonthField.test.tsx` (bouton calendrier, grille des douze mois sous une année à faire défiler, « Effacer », valeur `AAAA-MM` entière ou vide)
- **À modifier** : `src/lib/schemas/opportunity.ts` (rythme et jours sur site lisent « Non renseigné » comme une valeur vide)
- **À créer** : `src/components/features/admin/opportunities/OpportunitiesTable.tsx`, `OpportunityForm.tsx`, `DeleteOpportunityDialog.tsx`, `OpportunitiesViewPage.tsx`
- **À créer** : `src/app/admin/(protected)/opportunites/page.tsx`, `acceptees/page.tsx`, `toutes/page.tsx`, `nouvelle/page.tsx`, `[id]/page.tsx`, chacun avec son `loading.tsx`
- **À modifier** : `src/server/queries/opportunities.ts` (opportunité lue par son identifiant ; `select` de `referrer` étendu de `lead` et `contact`, pour `personDetailHref`, `13`)
- **À modifier** : `src/components/features/admin/companies/CompaniesTable.tsx` (bloc Opportunités, colonne et ligne Clients finaux)
- **À modifier** : `src/components/features/admin/companies/DeleteCompanyDialog.tsx` (opportunités dans le refus)
- **À modifier** : `src/app/admin/(protected)/entreprises/[id]/page.tsx` et `nouvelle/page.tsx` (card Opportunités, présente et vide en création)
- **À modifier** : `src/components/features/admin/leads/LeadsTable.tsx` (statut affiché, bloc Opportunités apportées, filtre Statut)
- **À modifier** : `src/app/admin/(protected)/leads/[id]/page.tsx` et `nouveau/page.tsx` (card Opportunités apportées, présente et vide en création)
- **À modifier** : `src/config/admin-nav-items.ts` (entrée Opportunités, entre Revues hebdo et Entretiens)
- **À modifier** : `docs/DESIGN.md` (ligne « Mois de démarrage » de § Post-MVP vers § Formulaires, via le skill `design-doc`)

## Architecture approach

- **Menu et routes** (décidé le 2026-10-02) : entrée « Opportunités » dans le groupe CRM, entre Revues hebdo et Entretiens, avec trois sous-entrées ; le groupe « Suivi mission » reste pour le suivi à venir, qui repartira des opportunités acceptées

| Vue | Route | Titre | Lignes | Tri par défaut |
|---|---|---|---|---|
| En cours | `/admin/opportunites` | Opportunités en cours | Proposée, En process, Offre reçue | démarrage le plus proche d'abord, sans démarrage en dernier |
| Acceptées | `/admin/opportunites/acceptees` | Opportunités acceptées | Acceptée | démarrage le plus récent d'abord |
| Toutes | `/admin/opportunites/toutes` | Toutes les opportunités | toutes, closes comprises | mise à jour la plus récente d'abord |

  Sous-titres : « Opportunités proposées, en process ou avec une offre reçue. », « Opportunités gagnées, point de départ du suivi de mission. », « Toutes les opportunités, en pause et closes comprises. » ; fonctions pures dans `src/lib/opportunity-views.ts`, sur le motif des vues des leads (`08`)
- **Liste** (`OpportunitiesTable`, motif `LeadsTable`) : colonnes Intitulé, Statut (`EnumBadge`), Apporteur, ESN, Client final (logo et nom), TJM (« 580 € »), Contrat (`EnumBadge`), Mode (`EnumBadge`), Rythme (« 4 j dont 2 sur site »), Localité, Démarrage (« avril 2026 »), Durée (« 6 mois »), Notes, masquables sauf Intitulé et Actions, toutes visibles par défaut dans Toutes (arbitrage « Colonnes par vue »), En cours et Acceptées en masquant selon leur objet ; filtres Statut, Contrat, Mode, Localité ; recherche sur l'intitulé, le rôle, l'ESN et le client final. Une ligne ouvre le détail (`DetailDialog`) ; la page lit `searchParams.detail` et le passe en `initialDetailId` à `OpportunitiesTable`, qui le transmet à `DataTable` (motif du `08`), pour ouvrir le détail d'une opportunité depuis une autre fiche
- **Formulaire** (`OpportunityForm`, page `/admin/opportunites/nouvelle` ou `/admin/opportunites/<id>`, motif `LeadForm` du `08`, arbitrage « Page ou modale d'édition » de DESIGN.md, `.claude/rules/shadcn-ui/components.md`) : cards reprenant les blocs de la vue détail. Colonne principale : Opportunité (Intitulé ; Rôle, Statut), Relations (Apporteur pleine largeur parmi les personnes au rôle Lead non opposées, `findPersonOptionsWithLeadRole()` du `07`, l'apporteur déjà relié restant affiché ; ESN, Client final côte à côte, ESN parmi les seules entreprises de type ESN / Recrutement, « Aucune » pour un client direct ; Client final parmi toutes les entreprises sauf l'ESN choisie), Détails (éditeur, ADR-024), puis la card Entretiens transmise par la prop `relatedCards?: React.ReactNode` (arbitrage « Cards rattachées des pages », rendue dans la colonne principale après Détails, hors des champs ; le `17` y place la liste des entretiens, vide avec « Après l'enregistrement de l'opportunité. » et bouton désactivé en création). Colonne latérale : Conditions (TJM, Contrat ; Mode de travail, Localité ; Rythme, Jours sur site, en listes de 1 à 5 et de 0 à 5), Calendrier (Démarrage en `MonthField`, Durée (mois), côte à côte), Notes. Détails pré-rempli à la création : Contexte, Profil recherché, Contenu technique. Statut, Contrat et Mode de travail affichent leur glyphe dans leur `Select` (`EnumBadge`, `14`). La ligne porte Modifier (lien vers la page) et Supprimer ; le « Modifier » de la vue détail mène à la même page ; « Nouvelle opportunité » mène à `/admin/opportunites/nouvelle`
- **Mois de démarrage** (`MonthField`, redessiné le 2026-10-02, miroir `.design-sync/design-system/components/post-mvp/forms/MonthField.jsx`) : le même bouton calendrier que les autres champs de date (`Popover`), ouvrant un panneau avec une année à faire défiler (chevrons précédent/suivant) et une grille des douze mois ; un clic sur un mois le choisit et ferme le panneau, un bouton « Effacer » vide le champ. Envoie `AAAA-MM` ou une valeur vide dans un input caché, lu depuis l'opportunité par `toMonthValue` (`14`) ; une valeur par défaut malformée (ex. une année sans mois) passe telle quelle, la validation du `14` la refuse plutôt que de la corriger en silence
- **Vue détail** : titre, sous-titre le rôle, statut en tête ; blocs Relations (Apporteur via `personDetailHref`, `13`, en texte simple s'il n'a ni rôle Lead ni rôle Contact ; ESN et Client final en `?detail=` vers leur vue détail d'entreprise, `/admin/entreprises?detail=<id>` ; apporteur marqué « Ne plus contacter » s'il s'est opposé), Détails (`MarkdownContent` en variante `admin`, `04`), Conditions (TJM, Contrat, Mode de travail, Localité, Rythme et Jours sur site, dans l'ordre du formulaire), Calendrier (démarrage, durée), Notes, Entretiens (`RelatedLinksList`, `17`). Un bloc sans donnée disparaît (arbitrage du `08`)
- **Suppression** (`DeleteOpportunityDialog`) : « Supprimer « <intitulé> » ? » et « L'apporteur, l'ESN et le client final restent. »
- **Statut du lead affiché** (`src/lib/lead-display-status.ts`, fonction pure) : « Deal » dès qu'une opportunité apportée est Acceptée, sinon le statut saisi. `LeadStatus` ne porte pas `DEAL` (`07`) : c'est une valeur affichée, jamais saisie ; la reprise Notion (`20`) crée une opportunité Acceptée pour chaque lead Deal. Les vues des leads (`08`) se lisent sur le statut affiché : En cours et Chauds excluent un lead « Deal ». Le filtre Statut de la liste des leads propose « Deal » à côté des statuts saisis ; le formulaire du lead ne le propose plus
- **Blocs ajoutés** (arbitrage « Fiches rattachées », en `RelatedLinksList`, chaque ligne menant en `?detail=` à la vue détail de l'opportunité sur sa vue complète Toutes, `/admin/opportunites/toutes?detail=<id>`) : vue détail d'une entreprise, bloc « Opportunités » (intitulé, statut, rôle de l'entreprise : ESN ou client final, TJM), deuxième des trois blocs de fin de vue détail (Leads `08`, Opportunités, Signaux `19`) ; vue détail d'un lead, bloc « Opportunités apportées » (intitulé, statut, client final), après Actions (`10`), avant Entretiens (`17`) et Signaux (`19`). Les lectures `AdminCompany` et `AdminLead` incluent ces opportunités, sans lecture de plus
- **Cards ajoutées** (arbitrage « Cards rattachées des pages ») : sur la page d'une entreprise, card « Opportunités » (`RelatedLinksList`, TJM en `trailing`) à la suite de la card Leads du `08` ; sur la page d'un lead, card « Opportunités apportées » (`RelatedLinksList`, TJM en `trailing`) à la suite de la card Actions du `10` ; chaque ligne mène à la page d'édition de l'opportunité (arbitrage « cards des pages d'édition » de DESIGN.md, à la différence des blocs de la vue détail ci-dessus). Les deux cards sont présentes aussi en création, à la suite des cards déjà posées par les plans précédents : liste vide, « Après l'enregistrement de l'entreprise. » / « Après l'enregistrement du lead. ». Aucune des deux ne porte de bouton de création : une opportunité se crée depuis sa liste, la création depuis une fiche restant à décider
- **Clients finaux et travaillée d'une entreprise** (`src/lib/companies.ts`, fonctions pures) : `joinedEndClientNames` lit les clients des opportunités Acceptée où l'entreprise est ESN, chacun une fois, triés `localeCompare("fr")` ; `worked` (`04`, sur les `ClientMeta`) s'étend aux opportunités Acceptée où l'entreprise est ESN ou client final. `AdminCompany.endClients` et `.worked` se calculent dans `src/server/queries/companies.ts`, jamais stockés (décidé le 2026-09-27). La colonne « Clients finaux » de `CompaniesTable` (largeur dans `admin-table-widths.ts`) est un livrable du `15`, le `04` ne la fournit plus ; visible par défaut dans Toutes et Travaillées, qui inclut désormais les entreprises à opportunité acceptée
- **Refus de suppression d'une entreprise** : « Cette entreprise est rattachée à <liens> et ne peut pas être supprimée. », où <liens> nomme les seuls comptes non nuls (« 2 projets », « 1 opportunité », « 2 projets et 1 opportunité »), le compte des opportunités venant de celles où elle est ESN ou client final (`_count`)
- **Rules** : `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/react/hooks.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : créer une opportunité
**GIVEN** un lead, une ESN et un client final
**WHEN** on crée depuis Opportunités une opportunité via l'ESN chez ce client, apportée par le lead, démarrage avril 2026
**THEN** elle apparaît dans En cours, Démarrage « avril 2026 », Détails pré-rempli par Contexte, Profil recherché et Contenu technique

### Scénario 2 : opportunité acceptée et lead Deal
**GIVEN** l'opportunité du scénario 1 et son lead en Discussion, dans la vue Chauds
**WHEN** on passe l'opportunité à Acceptée
**THEN** elle quitte En cours pour Acceptées, et le lead affiche « Deal », hors des vues En cours et Chauds
**AND** l'ESN et le client final apparaissent désormais dans la vue Travaillées des entreprises

### Scénario 3 : fiches reliées
**GIVEN** l'opportunité acceptée
**WHEN** on ouvre les vues détail du lead, de l'ESN et du client final
**THEN** chacune montre l'opportunité dans son bloc ; la colonne et la ligne « Clients finaux » de l'ESN contiennent le client final
**AND** sur leurs pages, la card d'opportunités la liste, son intitulé menant à la page de l'opportunité, le TJM en `trailing`

### Scénario 4 : ESN choisie
**GIVEN** le formulaire d'une opportunité
**WHEN** on ouvre la liste ESN puis la liste Client final après avoir choisi une ESN
**THEN** la première ne propose que les entreprises de type ESN / Recrutement, la seconde ne propose pas l'ESN choisie

### Scénario 5 : entreprise utilisée
**GIVEN** une entreprise ESN d'une opportunité et d'aucun projet
**WHEN** on veut la supprimer
**THEN** le bouton de suppression est désactivé : « Cette entreprise est rattachée à 1 opportunité et ne peut pas être supprimée. »

## Tests à écrire

### Unit
- `src/lib/lead-display-status.test.ts` :
  - shows Deal once one of its opportunities is accepted
  - keeps the entered status otherwise
- `src/lib/lead-views.test.ts` :
  - keeps a lead with an accepted opportunity out of the ongoing and hot views
- `src/lib/opportunity-views.test.ts` :
  - keeps proposed, in-process and offered opportunities in the ongoing view, soonest start first
  - keeps accepted opportunities in the accepted view
- `src/lib/companies.test.ts` :
  - names each accepted opportunity's end client once, sorted
  - marks a company worked once one of its opportunities is accepted, as intermediary or as client
- `src/lib/details-templates.test.ts` :
  - gives the opportunity template its three sections
- `src/components/features/admin/MonthField.test.tsx` :
  - sends the chosen month as YYYY-MM
  - sends an incomplete month so that validation refuses it

## Edge cases

- **Opportunité sans démarrage** : rangée après les autres dans En cours et Acceptées
- **Apporteur opposé** : l'opportunité reste ; il est marqué « Ne plus contacter » dans la vue détail, et reste affiché dans le formulaire
- **Entreprise à la fois ESN d'une opportunité et client final d'une autre** : son bloc Opportunités liste les deux, chacune avec le rôle de l'entreprise
- **Lead Deal par opportunité, remis en Perdu à la main** : l'affichage reste « Deal » tant que l'opportunité est acceptée, le fait l'emportant sur la saisie
- **Valeur de démarrage malformée** : une valeur par défaut corrompue (ex. une année sans mois) traverse le champ sans être corrigée ; la validation du `14` la refuse avec « Mois de démarrage invalide »

## Architectural decisions

### Décision : place de l'écran

**Options envisagées :**
- **A. Entrée « Opportunités » du groupe CRM**, le groupe « Suivi mission » gardé pour le suivi
- **B. Entrée existante « Suivi mission > Missions »** : opportunités et suivi mêlés

**Choix : A**

**Rationale :**
- Décision du propriétaire du 2026-09-27 : une opportunité relève d'abord du pipeline commercial, le suivi ne concerne que les acceptées

### Décision : page ou modale

**Options envisagées :**
- **A. Modale**, comme les autres saisies de l'écran
- **B. Page en cards**, comme une entreprise

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27, consignée dans les arbitrages de DESIGN.md : l'opportunité se remplit longuement (Détails en markdown) et regroupe ses entretiens (`17`), et plus tard son suivi

### Décision : saisie du mois

**Options envisagées :**
- **A. Deux listes Mois et Année** : même rendu dans tous les navigateurs, mais une saisie à moitié faite (mois choisi, année non) possible
- **B. Bouton calendrier ouvrant une grille des douze mois sous une année à faire défiler**, avec « Effacer », comme les autres champs de date

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-10-02, revue de la maquette : cohérent avec les champs de date déjà en place, et un clic sur un mois complet évite la saisie à moitié faite des deux `Select`

### Décision : fiches en « Deal » à la migration

**Options envisagées :**
- **A. Garder la valeur en base sans la proposer** : deux sources pour le même fait
- **B. Passer les fiches en Discussion**, le statut affiché lisant les opportunités

**Choix : B**

**Rationale :**
- Décision du propriétaire du 2026-09-27 ; une seule source, l'opportunité acceptée
