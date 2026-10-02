---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "formulaire-entreprise-enrichi"
goal: "Saisir depuis le formulaire entreprise les champs CRM ajoutés au modèle : types, zones, statut de la relation, notes et détails, ce dernier avec l'éditeur markdown Pages CMS Editor installé pour tout l'admin."
status: "draft"
complexity: "L"
tdd_scope: "none"
depends_on: ["02-entreprise-enrichie-donnees-design.md"]
date: "2026-09-26"
---

# Formulaire de la fiche entreprise enrichie

## Scope

Étend le formulaire entreprise de l'espace admin avec les cards Identité (zones), Classification (types, secteurs facultatifs), Relation (statut, taille), Notes (ligne courte) et Détails (markdown, pleine largeur, gabarit à la création), dans la disposition de la maquette. Installe l'éditeur Pages CMS Editor (ADR-024) et y fait passer l'étude de cas des projets. Exclut les cards Entité légale et Logo, laissées telles quelles jusqu'aux sub-projects `05` et `06`, la liste et la vue détail (`04`), premier contact, travaillée et clients finaux, propriétés dérivées affichées en lecture seule à partir des sub-projects `10`, `04` et `15`, ainsi que les outils de saisie des temps, reportés au suivi de mission.

### État livré

À la fin de ce sub-project, on peut : créer une entreprise typée ESN / Recrutement avec deux zones, un statut, une taille, une ligne de notes et des détails saisis avec l'éditeur markdown, l'enregistrer, la rouvrir et retrouver toutes ces valeurs, le markdown compris ; puis retirer toutes ses zones, enregistrer et constater qu'elles sont bien vidées ; et, sous un build de production, ouvrir le formulaire entreprise et le formulaire projet sans violation de la politique de sécurité en console, les raccourcis markdown fonctionnels.

## Dependencies

- `02-entreprise-enrichie-donnees-design.md` (statut: draft) : champs, enums, libellés, validation et actions que le formulaire alimente

## Références de design

- **Maquette** : `isCompanyForm`, cards Identité, Classification, Relation et Notes
- **Design system** : `core/Card`, `core/Input`, `core/Label`, `core/Select`, `core/Combobox`, `core/Checkbox`, `core/Badge`, `core/Button`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : composants copiés par `npx shadcn@latest add https://editor.pagescms.org/r/editor.json` sous `src/components/ui/` (Pages CMS Editor, ADR-024), corrections post-install de `.claude/rules/shadcn-ui/setup.md` appliquées
- **À créer** : `src/lib/details-templates.ts` (`COMPANY_DETAILS_TEMPLATE`)
- **À modifier** : `src/lib/typography.ts` (`ADMIN_MARKDOWN_CLASS`, échelle des champs markdown de l'admin)
- **À modifier** : `src/components/features/admin/companies/CompanyForm.tsx` (nom avant slug, aide du slug retirée, card Identité étendue aux zones triées, glyphes de Classification, card Entité légale déplacée en colonne latérale sous Notes, nouvelle card Détails, prop `relatedCards`, sentinelles des listes)
- **À créer** : `src/components/features/admin/companies/CompanyRelationCard.tsx` (card Relation : statut, taille)
- **À modifier** : `src/components/features/admin/projects/ProjectForm.tsx` (étude de cas des projets sur l'éditeur, noms de champs inchangés)
- **À modifier** : `src/lib/companies.ts` (titres des cards Relation, Notes et Détails)
- **À modifier** : `src/server/queries/companies.ts` (type `AdminCompanyDetail`, pour typer le `company` du formulaire)
- **À modifier** : `docs/DESIGN.md` (ligne « Champ markdown (admin) » de § Post-MVP vers § Formulaires, via le skill `design-doc`)

## Architecture approach

- **Disposition** : grille existante `lg:grid-cols-[1.7fr_1fr]`. Colonne principale : Identité, Classification, Détails, puis l'emplacement de la prop `relatedCards`. Colonne latérale collante : Relation, Logo (inchangé), Notes, Entité légale (contenu inchangé, propriété du `05` ; déplacée ici, sous Notes). La taille quitte Classification pour Relation, comme dans la maquette
- **Identité** : nom et slug côte à côte (nom avant slug), aide du slug retirée (décision du propriétaire, 2026-10-02), puis site web et zones chacun en pleine largeur. Les zones utilisent `MultiSelectCombobox` (9 valeurs, `ZONES` et `ZONE_LABELS` de `src/lib/zones.ts`), triées dans l'ordre canonique par `sortZones` à chaque sélection
- **Classification** : types en grille de `Checkbox` (4 valeurs, `COMPANY_TYPES` et `COMPANY_TYPE_LABELS`), glyphe `COMPANY_TYPE_ICONS` devant chaque libellé, aide persistante « Au moins un type est requis. » ; secteurs en `MultiSelectCombobox` sans l'aide « Au moins un secteur est requis. », les secteurs devenant facultatifs au `02`. La description de la card dit ce qu'elle contient : cocher les types, chercher les secteurs
- **Relation** (`CompanyRelationCard`) : statut de la relation et taille, deux `Select` côte à côte en `sm:grid-cols-2`, statut `ACTIVE` par défaut à la création. Chaque `SelectItem` du statut affiche le glyphe `COMPANY_STATUS_ICONS` devant le libellé, la taille reste sans glyphe. Travaillée, premier contact et clients finaux n'y figurent pas : ce sont des propriétés dérivées, affichées en lecture seule dans la vue détail à partir des sub-projects `04`, `10` et `15`
- **Notes** : `Input` d'une ligne, le `CardTitle` « Notes » sert de libellé (`aria-labelledby`), aucun `Label` répété, aide persistante « Une ligne de marqueurs, séparés par | », erreur si plus de 200 caractères
- **Détails** (`docs/adrs/024-editeur-markdown-admin.md`) : nouvelle card après Classification, dernière carte de la colonne principale avant `relatedCards`, éditeur Pages CMS Editor pleine largeur, `format="markdown"` et `enableImages={false}`, valeur envoyée au formulaire par un champ caché `details`. Le `CardTitle` sert de libellé (`aria-labelledby`), aucun `Label` répété. Échelle compacte, décidée par le propriétaire le 2026-10-01 : « # » 18 px, « ## » 16 px, « ### » 14 px, en semibold, texte 14 px, espacements serrés, portée par `ADMIN_MARKDOWN_CLASS` (`src/lib/typography.ts`) que le fichier copié de l'éditeur applique à sa zone d'édition, pour tout l'admin ; la lecture des Détails la reprend (`04`). Installé par `npx shadcn@latest add https://editor.pagescms.org/r/editor.json`, corrections post-install de `.claude/rules/shadcn-ui/setup.md` (import `cn`, paquet `cn` retiré). À la création, le champ est pré-rempli par `COMPANY_DETAILS_TEMPLATE` (`src/lib/details-templates.ts`) : titres seuls, séparés d'une ligne vide (À propos, Chiffres clés, Activités, Contexte de la relation, Liens, Notes libres) ; jamais appliqué sur une fiche existante. Les sections Notion qui ont leur modèle n'y figurent pas : siège (entité légale, `05`), expérience (projets et opportunités, `14`), signaux (modèle Signal, `19`)
- **Cards rattachées** : `CompanyForm` reçoit une prop `relatedCards?: React.ReactNode`, rendue dans la colonne principale juste après la card Détails, hors des champs du formulaire. Vide tant qu'aucun sub-project ne la peuple (Leads au `08`, Opportunités au `15`, Signaux au `19`)
- **Étude de cas des projets** : les deux `Textarea` `caseStudyMarkdownFr` / `caseStudyMarkdownEn` de `ProjectForm.tsx` passent sur ce même éditeur, mêmes noms de champs `FormData`, et la description de la card devient « Une zone par langue. Le rendu se relit sur le site public. » (la saisie n'est plus du markdown brut)
- **DESIGN.md** : la ligne « Champ markdown (admin) » de § Post-MVP (non installés) rejoint § Formulaires, via le skill `design-doc` (règle « un composant installé rejoint sa famille »)
- **Contrat du `02` : tout champ est toujours envoyé.** Les listes `types` et `zones` portent chacune un champ caché de valeur vide, toujours présent, que l'action écarte : une liste vidée s'envoie ainsi comme vide et non comme absente
- **Erreurs** : chaque champ affiche la première erreur serveur sous lui par `FormField`, comme les champs existants ; Notes et Détails, sans `FormField`, rendent la même erreur à la main
- **Soumission** : `useFormActionSubmit` inchangé, obligatoire avec des `Select` (`.claude/rules/shadcn-ui/components.md`)
- **Arbitrages appliqués** (`docs/DESIGN.md` § Arbitrages) : espacement `gap-4`, deux champs courts côte à côte, multi-sélection en pleine largeur avec les badges enroulés dessous, cases à cocher jusqu'à environ six valeurs, aide persistante sous l'erreur, aucun résumé de saisie sous les champs
- **Rules** : `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/react/hooks.md`, `.claude/rules/design/claude-design.md`

## Acceptance criteria

### Scénario 1 : création complète
**GIVEN** le formulaire « Nouvelle entreprise »
**WHEN** on coche ESN / Recrutement, choisit deux zones, le statut Dormante, une taille, saisit une ligne de notes et des détails avec l'éditeur, puis enregistre
**THEN** l'entreprise est créée avec ces valeurs et la liste des entreprises s'affiche
**AND** en rouvrant la fiche, chaque champ montre la valeur enregistrée, le markdown des détails compris, les zones triées dans l'ordre canonique quel que soit l'ordre de sélection

### Scénario 2 : liste vidée
**GIVEN** une entreprise avec deux zones
**WHEN** on retire les deux zones et enregistre
**THEN** l'entreprise n'a plus aucune zone

### Scénario 3 : type obligatoire
**GIVEN** le formulaire sans aucun type coché
**WHEN** on enregistre
**THEN** « Sélectionne au moins un type » s'affiche sous les types et rien n'est enregistré

### Scénario 4 : gabarit à la création
**GIVEN** le formulaire « Nouvelle entreprise »
**WHEN** on l'ouvre
**THEN** le champ Détails est pré-rempli par `COMPANY_DETAILS_TEMPLATE` (titres seuls, séparés d'une ligne vide)
**AND** en ouvrant le formulaire d'une fiche existante, le gabarit ne s'applique jamais, seul le contenu enregistré s'affiche

### Scénario 5 : build de production sans violation CSP
**GIVEN** l'application démarrée en mode production (`just build` puis démarrage de production)
**WHEN** on ouvre le formulaire entreprise puis le formulaire projet et qu'on utilise l'éditeur (raccourcis `#`, `-`, `>`, menu `/`)
**THEN** la console ne montre aucune violation de politique de sécurité (CSP)
**AND** le markdown saisi, enregistré puis relu, est identique

## Edge cases

- **Écran étroit** : sous 640 px, les paires de champs s'empilent et la colonne latérale passe sous la principale
- **`relatedCards` non fourni** : aucun sub-project ne le passe encore à ce stade ; rien ne s'affiche sous la card Détails
