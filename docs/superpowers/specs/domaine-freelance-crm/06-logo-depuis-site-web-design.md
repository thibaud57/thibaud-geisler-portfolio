---
feature: "Feature 2 — Domaine freelance CRM"
subproject: "logo-depuis-site-web"
goal: "Récupérer d'un bouton l'icône que déclare la page du champ site web d'une entreprise et la ranger en PNG dans R2 comme logo de sa fiche."
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["03-formulaire-entreprise-enrichi-design.md"]
date: "2026-09-26"
---

# Logo récupéré depuis le site de l'entreprise

## Scope

Ajoute à la card Logo du formulaire entreprise un bouton « Récupérer depuis le site » qui lit la page à l'adresse du champ site web telle quelle, retient la meilleure icône qu'elle déclare, la convertit en PNG, la range dans R2 et l'affiche en aperçu avec sa taille et sa source ; la fiche pointe vers elle une fois enregistrée. Applique ADR-023 : garde réseau contre les appels vers des adresses internes, aucun service tiers. Exclut la reprise en lot (sub-project `20`, qui réutilise la fonction), toute détection d'un site mort ou d'un logo périmé (l'admin en juge et met lui-même une capture Wayback dans le champ site web) et toute modification du dépôt manuel existant.

### État livré

À la fin de ce sub-project, on peut : ouvrir la fiche d'une entreprise dont le site déclare un `apple-touch-icon`, cliquer « Récupérer depuis le site », voir l'icône en aperçu avec « 180 × 180 px · apple-touch-icon », enregistrer, et retrouver ce logo dans la liste des entreprises ; puis mettre dans le site web de PaySystem une capture Wayback antérieure à sa mise en vente et récupérer son logo de l'époque.

## Dependencies

- `03-formulaire-entreprise-enrichi-design.md` (statut: draft) : formulaire entreprise dans lequel la card Logo est extraite et enrichie

## Références de design

- **Maquette** : `isCompanyForm` (card Logo)
- **Design system** : `core/Card`, `core/Button`, `patterns/CompanyLogoTile`, `patterns/AssetPreview`
- Règle de lecture : `.claude/rules/design/claude-design.md`

## Files touched

- **À créer** : `src/server/company-logo/address-guard.ts` (plages d'adresses refusées, schéma et port autorisés)
- **À créer** : `src/server/company-logo/safe-fetch.ts` (requête sortante gardée : adresse de connexion vérifiée, redirections, délai, taille lue plafonnée)
- **À créer** : `src/server/company-logo/icon-candidates.ts` (icônes déclarées par la page, dans l'ordre d'essai)
- **À créer** : `src/server/company-logo/normalize-icon.ts` (conversion en PNG, taille minimale, taille maximale)
- **À créer** : `src/server/company-logo/fetch-company-logo.ts` (enchaînement page, candidats, téléchargement, conversion, rangement dans R2 ; réutilisé par `20`)
- **À créer** : `src/server/company-logo/address-guard.test.ts`, `safe-fetch.test.ts`, `icon-candidates.test.ts`, `normalize-icon.test.ts`, `fetch-company-logo.test.ts`
- **À créer** : `src/server/actions/company-logo.ts`, `src/server/actions/company-logo.types.ts`, `src/server/actions/company-logo.test.ts`
- **À modifier** : `src/lib/schemas/company.ts` (règle du champ site web exportée pour l'action)
- **À créer** : `src/components/features/admin/companies/CompanyLogoCard.tsx` (card Logo extraite du formulaire, avec le bouton)
- **À modifier** : `src/components/features/admin/companies/CompanyForm.tsx` (card extraite, slug et site web suivis pour activer le bouton)
- **À modifier** : `package.json` et `pnpm-lock.yaml` (`sharp` en dépendance directe)
- **À modifier** : `docs/VERSIONS.md` (section `sharp`)

## Architecture approach

- **Parcours** : le bouton appelle une Server Action avec la valeur courante des champs site web et slug (`.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md` : `getCurrentUser()` en tête, hors du `try`). L'action revalide l'adresse avec la règle du champ site web et le slug avec `SLUG_PATTERN`, récupère l'icône, la range dans le bucket admin sous `freelance/crm/entreprises/<slug>/logo-<empreinte>.png` (`COMPANY_LOGO_FOLDER`, clé passée par `validateAssetPath` comme au dépôt manuel), invalide `/admin/assets` et renvoie la clé, la taille d'origine et la source. La card place la clé dans son état `logoFilename`, que le champ caché existant envoie à l'enregistrement : l'action entreprise ne change pas
- **Nom tiré du contenu** : l'empreinte est le début du SHA-256 du PNG produit. Le logo en place n'est jamais écrasé avant l'enregistrement de la fiche, une même icône récupérée deux fois retombe sur le même fichier, et un nouveau logo change d'adresse, ce qui évite l'image périmée du cache de `next/image` sur les pages publiques
- **Adresse lue telle quelle** : le bouton lit la page à l'adresse du champ, site vivant ou capture Wayback, sans traitement propre à Wayback ni détection de site mort. Une page de capture pointe déjà ses icônes vers l'archive : vérifié le 2026-09-26 sur une capture de `paysystem.eu`, où `<link rel="icon">` et `apple-touch-icon` sont réécrits en `web.archive.org/web/<horodatage>im_/…`
- **Ordre d'essai** (ADR-023) : `apple-touch-icon` (et `apple-touch-icon-precomposed`), puis `<link rel="icon">` et `shortcut icon` de la plus grande taille déclarée, un SVG comptant comme la plus grande. Les icônes `.ico` sont ignorées. Jamais `og:image` ni une image de la page. Les adresses relatives se résolvent contre `<base href>` s'il existe, sinon contre l'adresse finale de la page. Le premier candidat qui se télécharge, se lit et atteint la taille minimale l'emporte
- **Lecture de la page** : seules les balises vides `<link>` et `<base>` servent, lues par une fonction du projet sur le début du document (jusqu'à `</head>`), sans bibliothèque d'analyse HTML ; `metascraper-logo-favicon` est écarté parce qu'il appelle lui-même `/favicon.ico` et le service de Google, hors de la garde
- **Conversion** (`sharp`, dépendance directe, déjà installé avec Next et pris en charge par le `Dockerfile`) : PNG, JPEG, WebP, GIF et SVG en entrée. Sortie PNG, 256 px au plus sur le grand côté, jamais agrandie, transparence gardée ; un SVG est rendu directement à 256 px. Refus sous 32 px sur le grand côté, la taille d'origine étant affichée sous l'aperçu
- **Garde réseau** (ADR-023, le `fetch` natif n'offrant ni protection SSRF ni plafond de taille) : requête `node:http`/`node:https` dont l'option `lookup` résout le nom, refuse toute réponse contenant une adresse interne et connecte sur l'adresse vérifiée, sans seconde résolution ; une adresse IP écrite en toutes lettres est vérifiée avant la requête
  - schémas `http` et `https`, ports 80 et 443 seulement
  - refusés : IPv4 non routables (`0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, multicast et réservées) ; IPv6 `::`, `::1`, `fc00::/7`, `fe80::/10`, multicast, et toute adresse IPv4 intégrée dans une IPv6 qui tombe dans ces plages
  - cinq redirections au plus, chacune revérifiée ; 10 secondes par requête (Internet Archive répond lentement)
  - réponse demandée non compressée (`Accept-Encoding: identity`), lecture en flux arrêtée au plafond : 1 Mo pour la page, 1 Mo pour une image
- **Messages** : `invalid_input`, `site_unreachable` (avec le code HTTP quand il existe), `address_blocked`, `no_icon_found`, `icon_too_small` (avec la plus grande taille lue), `unknown_error`, affichés en toutes lettres sous l'aperçu de la card ; aucun n'efface le logo en place
- **Journalisation** (`createActionLogger`) : hôte, source retenue, taille, motif d'échec ; jamais la page lue
- **Card Logo** (`CompanyLogoCard`) : aperçu en `object-contain` sur fond neutre, règle d'aperçu de `CompanyLogoTile` (`docs/DESIGN.md`), une icône carrée en `object-cover` dans le cadre 16/9 étant rognée ; « Choisir un logo » existant, bouton « Récupérer depuis le site » en `outline` à côté, désactivé tant que le site web ou le slug est vide ou qu'une récupération est en cours, libellé « Récupération… » pendant l'appel ; sous l'aperçu, « <largeur> × <hauteur> px · <source> » après une récupération réussie. Le formulaire suit la valeur des champs slug et site web pour activer le bouton
- **Revue de sécurité** : le réseau sortant est une surface sensible, `/security-review` passe à la fin de l'epic
- **Rules** : `.claude/rules/nextjs/assets.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/images-fonts.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/design/claude-design.md`, `.claude/rules/vitest/setup.md`

## Acceptance criteria

### Scénario 1 : site vivant
**GIVEN** une fiche dont le site web déclare un `apple-touch-icon` de 180 px
**WHEN** on clique « Récupérer depuis le site »
**THEN** l'icône s'affiche en aperçu avec « 180 × 180 px · apple-touch-icon », rangée dans `freelance/crm/entreprises/<slug>/`
**AND** après enregistrement, la liste des entreprises montre ce logo

### Scénario 2 : capture Wayback mise par l'admin
**GIVEN** la fiche de PaySystem dont l'admin a remplacé le site web par une capture Wayback de `paysystem.eu` antérieure à sa mise en vente
**WHEN** on clique « Récupérer depuis le site »
**THEN** l'icône archivée de l'époque s'affiche en aperçu, jamais celle de la page de vente

### Scénario 3 : bouton inactif
**GIVEN** une fiche sans site web, ou une nouvelle fiche sans slug
**WHEN** on regarde la card Logo
**THEN** le bouton « Récupérer depuis le site » est désactivé

### Scénario 4 : icône trop petite
**GIVEN** un site qui ne déclare qu'une icône de 16 px
**WHEN** on clique le bouton
**THEN** un message indique « icône trop petite (16 px) » et invite au dépôt manuel
**AND** rien n'est rangé et le logo en place ne change pas

### Scénario 5 : adresse interne refusée
**GIVEN** un site web `http://127.0.0.1:3000` ou un nom qui résout vers une adresse privée
**WHEN** on clique le bouton
**THEN** le message « adresse refusée » s'affiche, aucune connexion n'est ouverte vers cette adresse

### Scénario 6 : récupération abandonnée
**GIVEN** une fiche avec un logo, sur laquelle on vient de récupérer une autre icône
**WHEN** on clique « Annuler »
**THEN** la fiche garde son logo d'origine, l'icône récupérée reste visible dans Assets, supprimable

## Tests à écrire

### Unit
- `src/server/company-logo/address-guard.test.ts` :
  - blocks loopback, private, link-local, shared and unspecified IPv4 ranges
  - blocks IPv6 loopback, unique local and link-local addresses
  - blocks a private IPv4 address embedded in an IPv6 address
  - allows a public IPv4 and IPv6 address
  - rejects a non-http scheme and a port other than 80 or 443
  - rejects an internal IP literal, whatever its notation
  - accepts a public https address
- `src/server/company-logo/safe-fetch.test.ts` :
  - refuses a host name that resolves to a private address
  - refuses an internal IP literal before any request
  - re-checks the target of a redirect
  - truncates a page past its size limit
  - rejects an image past its size limit
  - reports the status of a failed response
- `src/server/company-logo/icon-candidates.test.ts` :
  - ranks apple-touch-icon before any other icon
  - orders icons by largest declared size, an svg first
  - resolves relative hrefs against the base element, then the page URL
  - skips ico icons, og:image and non-icon links
  - keeps a single candidate per address, as a wayback capture declares
- `src/server/company-logo/normalize-icon.test.ts` :
  - rejects an icon smaller than 32 px
  - never enlarges a 48 px icon
  - scales a large icon down to 256 px
  - renders an svg icon at 256 px
  - rejects a file that is not an image
- `src/server/company-logo/fetch-company-logo.test.ts` :
  - falls back to the next candidate when one fails
  - reports the largest too small size when no candidate is large enough
  - stops at a blocked address
  - stores the icon under the company folder with a content-derived name
- `src/server/actions/company-logo.test.ts` :
  - rejects a call without a session before any network access
  - rejects an invalid website URL or slug without fetching
  - lowercases the slug before storing
  - returns the stored key, size and source
  - maps a blocked address, an unreachable site, a missing icon and a too small icon to their messages

## Edge cases

- **Site derrière une protection anti-robot** (réponse 403) : `site_unreachable` avec le code, le dépôt manuel reste
- **Site qui ne déclare qu'un `favicon.ico`** : `no_icon_found`, le dépôt manuel reste
- **Site qui redirige vers un autre domaine** (rachat, fusion) : la redirection est suivie et revérifiée, l'icône est celle du domaine d'arrivée ; l'aperçu permet de juger avant d'enregistrer
- **SVG pensé pour le thème sombre** (blanc sur fond transparent) : quasi invisible sur fond clair ; l'aperçu le montre, le dépôt manuel le remplace
- **Slug modifié après la récupération** : le fichier reste dans le dossier de l'ancien slug et la fiche pointe vers lui, comme pour un logo choisi à la main
- **Capture Wayback sans icône archivée** : `no_icon_found`

## Architectural decisions

### Décision : moment du rangement dans R2

**Options envisagées :**
- **A. Au clic, sous un nom tiré du contenu** : l'aperçu réutilise celui de la card, l'action entreprise ne change pas ; une récupération abandonnée laisse un fichier inutilisé dans Assets
- **B. À l'enregistrement de la fiche** : rien ne reste en cas d'abandon, mais l'image voyage dans le formulaire et l'action entreprise écrit à la fois dans R2 et dans la base

**Choix : A**

**Rationale :**
- Choix du propriétaire
- Le logo en place n'est jamais touché avant l'enregistrement, grâce au nom tiré du contenu

### Décision : format rangé

**Options envisagées :**
- **A. Tout convertir en PNG** avec `sharp` : SVG exploitable, aucun script stocké, taille bornée ; une dépendance directe de plus
- **B. Garder le fichier tel quel** : aucune dépendance ; SVG tiers refusé pour ne pas servir de script sur le domaine, beaucoup de sites sans icône exploitable

**Choix : A**

**Rationale :**
- Choix du propriétaire
- `sharp` est déjà installé avec Next pour l'optimisation des images et déjà pris en charge par le `Dockerfile`

### Décision : sources lues

**Options envisagées :**
- **A. Toutes les sources permises par ADR-023** : `apple-touch-icon`, `<link rel="icon">`, icônes du manifest, `/favicon.ico`, avec extraction des images d'un ICO et lecture brute des captures Wayback
- **B. Les icônes que la page déclare, telle quelle** : `apple-touch-icon` puis `<link rel="icon">`, hors ICO

**Choix : B**

**Rationale :**
- Choix du propriétaire : on prend ce que le site déclare, sans rien inventer
- Un `favicon.ico` fait le plus souvent 16 ou 32 px, sous le seuil ; un site qui publie un manifest déclare presque toujours un `apple-touch-icon`
- Une capture Wayback lue telle quelle pointe déjà ses icônes vers l'archive

### Décision : requête sortante gardée

**Options envisagées :**
- **A. `fetch` natif précédé d'une résolution DNS vérifiée** : simple, mais `fetch` résout le nom une seconde fois, ce qui laisse passer un nom qui change d'adresse entre les deux (DNS rebinding)
- **B. `node:http` et `node:https` avec une option `lookup` qui vérifie l'adresse de connexion** : sans dépendance, la connexion part sur l'adresse vérifiée
- **C. Une bibliothèque de filtrage** (`request-filtering-agent`, agent `undici`) : moins de code, une dépendance de plus sur un chemin de sécurité

**Choix : B**

**Rationale :**
- Ferme le DNS rebinding sans dépendance, avec les modules natifs de Node
- Redirections, délai et plafond de taille se contrôlent au même endroit
