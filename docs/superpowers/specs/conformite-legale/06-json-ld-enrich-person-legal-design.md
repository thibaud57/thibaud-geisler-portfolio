---
feature: "Feature 7 — Conformité légale"
subproject: "Enrichissement JSON-LD Person sur /a-propos avec address PostalAddress + taxID + identifier SIRET"
goal: "Étendre buildProfilePagePerson du sub-project SEO 05 existant pour ajouter les champs Schema.org address (PostalAddress), taxID (SIRET) et identifier (PropertyValue) au mainEntity Person sur /a-propos, lus via getPublisher du sub 1, avec extraction d'un helper réutilisable buildPostalAddress préparant Organization JSON-LD post-MVP"
status: "draft"
complexity: "S"
tdd_scope: "partial"
depends_on: ["01-schema-prisma-legal-entity-seed-design.md"]
date: "2026-04-28"
---

# Enrichissement JSON-LD Person sur /a-propos avec address PostalAddress + taxID + identifier SIRET

## Scope

Modifier `src/lib/seo/json-ld.ts` (livré par sub-project SEO 05 existant) pour ajouter au type retour `ProfilePagePerson.mainEntity` 3 champs Schema.org optionnels conditionnels : `address` (PostalAddress complet), `taxID` (SIRET en string), `identifier` (PropertyValue structuré avec `propertyID: 'SIRET'`). Étendre `ProfilePagePersonInput` avec un sous-objet optionnel `legal?: { siret: string, address: AddressInput }` qui, si fourni, déclenche la composition des 3 champs ci-dessus dans le retour. Extraire un nouveau type partagé `AddressInput` (4 champs : `street`, `postalCode`, `city`, `country`) qui matche directement la structure du modèle Prisma `Address` du sub 1, permettant au caller de passer `publisher.address` (sortie Prisma) sans aplatir les champs. Extraire un helper pur réutilisable `buildPostalAddress(address: AddressInput): SchemaOrgPostalAddress` qui encapsule le mapping naming non-trivial Prisma → Schema.org (`street → streetAddress`, `city → addressLocality`), placé dans le même fichier `json-ld.ts` à côté des helpers existants `mapExpertise` et `normalizeBase`. Modifier `src/app/[locale]/(public)/a-propos/page.tsx` pour appeler `getPublisher()` du sub 1 et passer le sous-objet `legal: { siret: publisher.siret, address: publisher.address }` à `getCachedProfileJsonLd`. Étendre `src/lib/seo/json-ld.test.ts` (déjà 14 cas pour le sub-project SEO 05) avec 4 nouveaux cas unit. **Exclut** : ajout de `Person.telephone` (anti-spam, sub 4 a déjà tranché), ajout de `Person.vatID` (Thibaud en franchise art. 293 B CGI, pas de N° TVA intracommunautaire), création d'un schéma `Organization` JSON-LD séparé pour les sous-traitants (post-MVP, hors scope feature 7), enrichissement de `BreadcrumbList` (pas d'adresse impliquée), helper `buildSiretIdentifier` dédié (1 callsite actuel, 5 lignes inline OK, à extraire post-MVP si Organization JSON-LD ajouté avec ses propres SIRET).

### État livré

À la fin de ce sub-project, on peut : (a) charger `/fr/a-propos` en `pnpm build && pnpm start`, faire View Source et observer dans le `<script type="application/ld+json">` du `mainEntity` Person les nouveaux champs `address: { '@type': 'PostalAddress', streetAddress: '11 rue Gouvy', postalCode: '57000', addressLocality: 'Metz', addressCountry: 'France' }`, `taxID: '88041912200036'`, `identifier: { '@type': 'PropertyValue', propertyID: 'SIRET', value: '88041912200036' }` ; (b) idem sur `/en/a-propos` (les 3 champs sont identiques car données légales locale-agnostic) ; (c) Google Rich Results Test (https://search.google.com/test/rich-results) reste sur "Profile page eligible" sans warning bloquant après l'enrichissement ; (d) `pnpm test src/lib/seo/json-ld.test.ts` passe 14 cas existants + 4 nouveaux = 18 cas verts ; (e) si la DB n'a pas encore été seedée (cas dev sans publisher), le helper `buildProfilePagePerson` continue de fonctionner sans les 3 champs (rétro-compatibilité totale grâce à `legal?` optionnel).

## Dependencies

- `01-schema-prisma-legal-entity-seed-design.md` (statut: draft) — fournit la query `getPublisher()` qui retourne `LegalEntity & { address: Address, publisher: Publisher }`. Le caller `/a-propos/page.tsx` consomme cette query pour extraire les données légales (siret, address) et les passer au helper JSON-LD. Le type `Address` Prisma a exactement les 4 champs `street, postalCode, city, country` qui matchent `AddressInput` introduit ici, donc le caller passe `publisher.address` directement sans aplatissement.

## Files touched

- **À modifier** : `src/lib/seo/json-ld.ts` (extension : nouveau type `AddressInput`, type `SchemaOrgPostalAddress`, helper pur `buildPostalAddress`, extension de `ProfilePagePersonInput` avec `legal?: { siret, address }`, extension de `ProfilePagePerson.mainEntity` avec `address?`, `taxID?`, `identifier?` conditionnels, modification de `buildProfilePagePerson` pour composer les 3 champs via spread conditionnel quand `input.legal` est fourni)
- **À modifier** : `src/lib/seo/json-ld.test.ts` (ajout : 1 cas unit isolé sur `buildPostalAddress` + 3 cas unit sur `buildProfilePagePerson` couvrant `legal` fourni, `legal` absent rétro-compat, mapping address strict)
- **À modifier** : `src/app/[locale]/(public)/a-propos/page.tsx` (ajout : import `getPublisher` from `@/server/queries/legal`, appel parallélisé via `Promise.all` avec les autres queries existantes, extraction du sous-objet `legal` passé à `getCachedProfileJsonLd`)

**Non touchés** : `src/components/seo/json-ld.tsx` (composant React `<JsonLd>` wrapper inchangé), `src/lib/seo.ts` (helpers metadata existants), `src/lib/seo/og-fonts.ts` et `og-template.tsx` (Open Graph images), `prisma/schema.prisma` (sub 1 livre les modèles + relation Company, on consomme uniquement), `src/server/queries/legal.ts` (sub 1 livre la query, on consomme uniquement), `messages/{fr,en}.json` (aucune nouvelle clé i18n nécessaire, les valeurs métier viennent de la BDD), `src/components/features/legal/OpenCookiePreferencesButton.tsx` (sub 4 + sub 5), pages `/[locale]/(public)/mentions-legales` et `/confidentialite` (sub 4), `next.config.ts` (sub 2 CSP), `src/components/layout/Footer.tsx` (sub 7).

## Architecture approach

- **Extension par composition de l'helper existant `buildProfilePagePerson`** : le sub-project SEO 05 a livré ce helper avec une signature stricte (locale, siteUrl, name, jobTitle, description, email, image, sameAs, expertise) et un retour `ProfilePagePerson` typé. On étend l'input avec un sous-objet `legal?` optionnel et le retour avec 3 champs `mainEntity.address?`, `mainEntity.taxID?`, `mainEntity.identifier?` conditionnels. Pattern de spread conditionnel : `...(input.legal && { address, taxID, identifier })` qui ajoute les 3 propriétés ensemble si `legal` est fourni, ou rien sinon. Préserve la rétro-compatibilité totale : tout caller existant qui n'utilise pas `legal` continue de produire le même JSON-LD qu'avant. Voir `.claude/rules/typescript/conventions.md` (props optionnelles avec `?`, types dérivés via spread conditionnel).
- **Type partagé `AddressInput` aligné Prisma** : déclaré dans `json-ld.ts` avec exactement les 4 champs `street`, `postalCode`, `city`, `country` qui correspondent au modèle Prisma `Address` du sub 1. Cette correspondance permet au caller (`/a-propos/page.tsx`) de passer `publisher.address` (sortie Prisma typée `Address`) directement à `legal.address` sans aplatissement (`{ addressStreet, addressPostalCode, ... }`) ni mapping. DRY au niveau code consumer.
- **Helper pur réutilisable `buildPostalAddress(address: AddressInput): SchemaOrgPostalAddress`** : encapsule le mapping naming non-trivial Prisma → Schema.org (`street` → `streetAddress`, `postalCode` → `postalCode`, `city` → `addressLocality`, `country` → `addressCountry`). Placé dans `json-ld.ts` à côté des helpers existants `mapExpertise` et `normalizeBase`. Préparation pour Organization JSON-LD post-MVP : quand on ajoutera un schéma `Organization` pour les sous-traitants RGPD (IONOS, Calendly, Umami) ou les sociétés clientes (Foyer, CloudSmart, etc. via la relation `Company.legalEntity?` du sub 1), ce helper sera réutilisé sans duplication. Coût marginal d'extraction maintenant (~8 lignes), évite future duplication des règles de mapping naming Schema.org. Voir `.claude/rules/typescript/conventions.md` (fonctions pures, alias `@/*`).
- **Helper `buildSiretIdentifier` NON extrait** : le bloc `identifier: { '@type': 'PropertyValue', propertyID: 'SIRET', value: siret }` reste inline dans `buildProfilePagePerson` (5 lignes). 1 seul callsite actuel justifie la non-extraction (YAGNI). Si Organization JSON-LD post-MVP ajoute d'autres entités avec SIRET (IONOS hosting, sociétés clientes via relation Company), on extraira à ce moment-là. Cohérent avec le principe d'extraction au 2e callsite, pas au 1er.
- **Caller `/a-propos/page.tsx` parallélise les queries** : la page existante appelle déjà `getYearsOfExperience`, `countMissionsDelivered`, `countClientsSupported`, `findAllTags`, `getTranslations` via `Promise.all` (pattern déjà en place pour `StatsAsync` dans `<Suspense>`). Ajouter `getPublisher()` aux queries lancées en parallèle. Le retour `publisher.address` est passé tel quel à `legal.address`. Si `publisher.siret` est null (cas hypothétique non-seedé en dev), le ternaire dans le caller passe `legal: undefined` au helper, ce qui omet proprement les 3 champs JSON-LD. Voir `.claude/rules/nextjs/data-fetching.md` (`Promise.all` éviter waterfall, queries directes Server Components).
- **`getPublisher()` cachée via `'use cache' + cacheLife('days') + cacheTag('legal-entity')`** (sub 1) : l'appel depuis le Server Component `/a-propos/page.tsx` participe au Data Cache Next 16. Pas de `connection()` nécessaire car la query est dans un scope `'use cache'` qui absorbe le `new Date()` interne Prisma 7. Voir `.claude/rules/nextjs/rendering-caching.md` et `.claude/rules/nextjs/data-fetching.md`.
- **`getCachedProfileJsonLd` interne à `/a-propos/page.tsx` reste cachée** : la fonction interne actuelle wrap `buildProfilePagePerson` dans un scope `'use cache' + cacheLife('days')`. Le sous-objet `legal` est passé en argument, donc participe à la clé de cache (changement de SIRET ou d'adresse → invalidation auto au prochain re-cache). Pattern inchangé.
- **Tests unit ciblés sur les helpers purs** : project Vitest `unit` (env jsdom par défaut). Les 4 nouveaux cas testent la logique de mapping Schema.org (helper isolé) et la composition conditionnelle (`legal` fourni vs absent). Pas de mock Prisma (les tests testent le helper pur, pas la query). Pas de mock `next-intl` (le helper ne consomme pas de traductions). Voir `.claude/rules/vitest/setup.md` (project unit jsdom, factory pattern) et `.claude/rules/nextjs/tests.md` (no mock pour ce qui est déjà du pur, factory `buildProfileInput`).
- **Cohérence Schema.org `Person` vs `Organization` post-MVP** : les champs `address` (PostalAddress), `taxID`, `identifier` (PropertyValue) sont définis par Schema.org sur les 2 types `Person` et `Organization`. Le helper `buildPostalAddress` extrait ici sera donc directement réutilisable côté `buildOrganization` post-MVP (pour exposer IONOS hosting, Calendly, ou les sociétés clientes Foyer/CloudSmart via `Company.legalEntity` introduit au sub 1). Même chose pour le bloc inline `identifier` qu'on pourra extraire en helper `buildSiretIdentifier` au 2e callsite. Préparation architecturale propre.
- **ADRs liés** : ADR-001 (monolithe Next.js, helpers et composants dans la même app), ADR-006 (hub de démos, JSON-LD signe l'identité personnelle "Thibaud Geisler" en tant qu'asset commercial), ADR-010 (i18n FR/EN, mais ce sub-project n'introduit aucune nouvelle clé i18n car les valeurs viennent de la BDD via `getPublisher()`). Aucun ADR `proposed` bloquant.

## Acceptance criteria

### Scénario 1 : `/fr/a-propos` JSON-LD Person enrichi avec address + taxID + identifier

**GIVEN** la DB seedée par sub 1 (publisher Thibaud avec siret `88041912200036` et adresse `11 rue Gouvy 57000 Metz France`), build prod via `pnpm build && pnpm start`
**WHEN** un visiteur charge `/fr/a-propos` et fait View Source
**THEN** la page contient un seul `<script type="application/ld+json">` avec un objet `ProfilePage` au format identique au sub-project SEO 05 (mêmes champs racine `@context`, `@type`, `dateModified`, `mainEntity`)
**AND** `mainEntity.address` est présent et égal à `{ '@type': 'PostalAddress', streetAddress: '11 rue Gouvy', postalCode: '57000', addressLocality: 'Metz', addressCountry: 'France' }`
**AND** `mainEntity.taxID` est égal à `'88041912200036'`
**AND** `mainEntity.identifier` est présent et égal à `{ '@type': 'PropertyValue', propertyID: 'SIRET', value: '88041912200036' }`
**AND** les autres champs existants du sub 5 SEO (`name`, `jobTitle`, `description`, `url`, `email`, `image`, `sameAs`, `knowsAbout`) restent inchangés et corrects

### Scénario 2 : `/en/a-propos` JSON-LD identique (données légales locale-agnostic)

**GIVEN** la même DB seedée
**WHEN** un visiteur charge `/en/a-propos`
**THEN** `mainEntity.address`, `mainEntity.taxID`, `mainEntity.identifier` sont strictement identiques à ceux de `/fr/a-propos` (les données légales ne se traduisent pas)
**AND** les champs locale-spécifiques `mainEntity.url` et `mainEntity.description` sont en EN comme avant (sub 5)

### Scénario 3 : Google Rich Results Test reste vert après enrichissement

**GIVEN** l'app déployée avec le JSON-LD enrichi
**WHEN** je copie le JSON-LD depuis View Source de `/fr/a-propos` et je le colle dans Google Rich Results Test
**THEN** le statut "Profile page eligible" est confirmé sans erreur ni warning bloquant
**AND** Google reconnaît les nouveaux champs `address`, `taxID`, `identifier` comme valides Schema.org

### Scénario 4 : Helper `buildPostalAddress` mappe correctement Prisma → Schema.org

**GIVEN** un objet d'entrée `{ street: '7 place de la Gare', postalCode: '57200', city: 'Sarreguemines', country: 'France' }` (correspond à l'adresse IONOS hosting du sub 1, exemple représentatif d'une autre entité légale)
**WHEN** j'appelle `buildPostalAddress(input)`
**THEN** le retour est `{ '@type': 'PostalAddress', streetAddress: '7 place de la Gare', postalCode: '57200', addressLocality: 'Sarreguemines', addressCountry: 'France' }` (mapping `street → streetAddress` et `city → addressLocality` validés)

### Scénario 5 : `legal` absent → JSON-LD rétro-compatible (pas les 3 nouveaux champs)

**GIVEN** un appel à `buildProfilePagePerson` SANS le sous-objet `legal` (cas hypothétique : DB non seedée, ou caller futur qui ne fournit pas les données légales)
**WHEN** j'inspecte le retour
**THEN** `mainEntity` ne contient PAS les propriétés `address`, `taxID`, `identifier` (rétro-compatibilité totale avec le sub 5 SEO existant)
**AND** tous les autres champs (name, jobTitle, etc.) restent identiques à la version sub 5

### Scénario 6 : Tests unit verts (4 nouveaux cas)

**GIVEN** le sub-project complètement implémenté
**WHEN** je lance `pnpm test src/lib/seo/json-ld.test.ts`
**THEN** Vitest exécute les 14 cas existants du sub 5 + les 4 nouveaux cas de ce sub
**AND** les 18 tests passent (vert), aucune régression sur les cas existants

## Tests à écrire

### Unit

`src/lib/seo/json-ld.test.ts` (extension du fichier existant, déjà 14 cas pour le sub-project SEO 05) :

- **`buildPostalAddress` mappe les 4 champs Prisma vers le format Schema.org** : appel avec `{ street: '11 rue Gouvy', postalCode: '57000', city: 'Metz', country: 'France' }`, vérifier `result['@type'] === 'PostalAddress'`, `result.streetAddress === '11 rue Gouvy'`, `result.postalCode === '57000'`, `result.addressLocality === 'Metz'` (pas `city`), `result.addressCountry === 'France'`. Test isolé sur le helper pur, pas besoin de passer par `buildProfilePagePerson`.
- **`buildProfilePagePerson` avec `legal` fourni → mainEntity contient address, taxID, identifier** : appel via `buildProfileInput` factory étendue avec `legal: { siret: '88041912200036', address: { street: '11 rue Gouvy', postalCode: '57000', city: 'Metz', country: 'France' } }`, vérifier `result.mainEntity.address` est un objet avec `'@type': 'PostalAddress'` et les 4 champs mappés correctement, `result.mainEntity.taxID === '88041912200036'`, `result.mainEntity.identifier` égal à `{ '@type': 'PropertyValue', propertyID: 'SIRET', value: '88041912200036' }`.
- **`buildProfilePagePerson` SANS `legal` → mainEntity n'a PAS address, taxID, identifier (rétro-compat sub 5)** : appel via `buildProfileInput()` factory existante (pas de `legal`), vérifier `result.mainEntity.address === undefined`, `result.mainEntity.taxID === undefined`, `result.mainEntity.identifier === undefined`. Garantit qu'un caller existant qui n'utilise pas le nouveau champ `legal` continue de produire le même JSON-LD qu'avant ce sub-project.
- **`buildProfilePagePerson` valeurs SIRET cohérentes entre `taxID` et `identifier.value`** : appel avec `legal: { siret: '88041912200036', address: { ... } }`, vérifier `result.mainEntity.taxID === result.mainEntity.identifier.value` (cohérence interne du SIRET dupliqué dans 2 champs Schema.org). Garde-fou contre une régression où on passerait 2 SIRET différents par erreur.

Setup : étendre la factory existante `buildProfileInput(overrides?)` avec un `legal?` optionnel dans le type `Partial<ProfilePagePersonInput>` (déjà géré par TypeScript via Partial). Pas de fixture nouvelle dédiée, on utilise les valeurs canoniques Thibaud (SIRET, adresse 11 rue Gouvy Metz). Pas de mock nécessaire (helpers purs, pas de dépendance externe). Aucun mock de `next-intl`, `next/cache`, Prisma, `next/navigation`.

Tests délibérément exclus (no-lib-test, voir `~/.claude/CLAUDE.md` § Code > Tests) :
- Test du composant `<JsonLd>` (sub 5 a déjà ses propres tests dans `src/components/seo/json-ld.test.tsx`, et c'est juste un wrapper React de 5 lignes).
- Test du Server Component `/a-propos/page.tsx` (impossible à tester en jsdom : RSC async + Prisma + cache, couvert par les acceptance scenarios end-to-end via View Source).
- Test de l'intégration `getPublisher() → buildProfilePagePerson()` end-to-end (couvert par les acceptance scenarios + tests integration du sub 1 sur la query elle-même).
- Test de l'échappement `</script>` côté `<JsonLd>` (déjà couvert au sub 5).

`tdd_scope = partial` justifié par : 4 tests unit ciblés sur les helpers purs (mapping Schema.org de `buildPostalAddress`, composition conditionnelle de `buildProfilePagePerson` avec `legal`, garde-fou cohérence SIRET). Helpers réutilisables (futur Organization JSON-LD) donc tests contractualisant le mapping naming Prisma → Schema.org.

## Edge cases

- **`publisher.siret === null`** : cas hypothétique si la DB n'a pas le publisher seedé en dev local, ou si Thibaud bascule un jour vers une entité légale sans SIRET (très improbable). Le caller `/a-propos/page.tsx` utilise un ternaire `legal: publisher.siret ? { siret: publisher.siret, address: publisher.address } : undefined`, ce qui passe `legal: undefined` au helper et omet les 3 champs JSON-LD. Pas de crash, page reste valide, JSON-LD reste valide (juste sans les 3 champs).
- **`publisher.address === null`** : impossible techniquement car `LegalEntity.addressId` est `String @unique` NOT NULL au schema sub 1 (chaque LegalEntity a obligatoirement une Address). Le compilateur Prisma garantit que `publisher.address` est toujours présent quand on `include: { address: true }` dans la query.
- **Adresse contenant des caractères spéciaux HTML/JSON** (ex: `street: 'rue d&apos;Exemple'`) : le `JSON.stringify` natif échappe correctement les caractères. L'échappement `</script>` est déjà géré par le composant `<JsonLd>` du sub 5.
- **Ré-utilisation de `buildPostalAddress` côté Organization JSON-LD post-MVP** : le helper accepte n'importe quel objet conformant à `AddressInput` (4 champs string). Si on appelle `buildPostalAddress(ionosHosting.address)` (où `ionosHosting` est récupéré via `getDataProcessors()` ou `getHostingProvider()` du sub 1), le retour est correct sans modification. Préparation propre.
- **Caller futur passe `legal.siret` vide string `''`** : le helper compose `taxID: ''` et `identifier.value: ''`, ce qui n'est pas idéal sémantiquement mais ne casse rien. Pour éviter ce cas, le caller `/a-propos/page.tsx` utilise le ternaire `publisher.siret ? ...` qui exclut explicitement `null` mais aussi indirectement les empty strings (en JS, `'' ? a : b` retourne `b`). Garde-fou implicite.
- **Performance / impact bundle** : extension de fichiers existants uniquement, aucun nouveau import lourd (pas de nouvelle lib npm). Impact bundle = +0 KB côté client (le JSON-LD est rendu côté serveur via Server Component). +20 lignes côté `json-ld.ts` (helpers + types), négligeable.
- **Régression sur le `<JsonLd>` consommateur** : le composant React `<JsonLd data={profileJsonLd} />` accepte un `object` typé par `ProfilePagePerson`. Le typage TypeScript valide automatiquement que les nouveaux champs optionnels `address?`, `taxID?`, `identifier?` du retour étendu sont compatibles avec le type input du composant (qui accepte tout `object` valide JSON). Pas de modification de `<JsonLd>`.
- **Cache 'use cache' invalidation après changement de SIRET** : si Thibaud édite son SIRET via Prisma Studio (cas exceptionnel), le `cacheTag('legal-entity')` du sub 1 permet une invalidation manuelle via `revalidateTag('legal-entity', 'max')`. Le cache `getCachedProfileJsonLd` interne à `/a-propos/page.tsx` n'a pas son propre `cacheTag`, donc il s'invalidera au prochain `cacheLife('days')` (TTL 24h). Acceptable pour un changement aussi rare. Si invalidation immédiate critique, on pourra ajouter `cacheTag('profile-json-ld')` au `getCachedProfileJsonLd` post-MVP.

## Architectural decisions

### Décision : Extraction du helper `buildPostalAddress` réutilisable

**Options envisagées :**
- **A. Inline le mapping `street → streetAddress` etc. directement dans `buildProfilePagePerson`** : 8 lignes dans le bloc `address: { ... }`. Simple, 1 callsite actuel.
- **B. Extraire `buildPostalAddress(address: AddressInput): SchemaOrgPostalAddress` comme helper pur dans `json-ld.ts`** : ~8 lignes extraites, 1 callsite actuel, préparé pour réutilisation.
- **C. Créer un fichier dédié `src/lib/seo/postal-address.ts`** : extraction maximale, fichier isolé.

**Choix : B**

**Rationale :**
- L'option A est anti-DRY anticipé : le mapping naming Schema.org (`street → streetAddress`, `city → addressLocality`) est non-trivial et répétitif. Si demain un sub-project post-MVP ajoute un schéma `Organization` JSON-LD pour les sous-traitants RGPD (IONOS, Calendly) ou les sociétés clientes (Foyer, CloudSmart via `Company.legalEntity` introduit au sub 1), on dupliquera ces 8 lignes avec risque d'erreurs de naming Schema.org. Coût d'extraction ZÉRO maintenant (8 lignes déplacées dans un helper pur) vs coût de duplication FUTUR plus élevé.
- L'option C (fichier dédié) est sur-engineerie pour un helper de 8 lignes. `json-ld.ts` contient déjà d'autres helpers privés similaires (`mapExpertise`, `normalizeBase`). Cohérent de garder `buildPostalAddress` dans le même fichier, exporté pour réutilisation par d'éventuels futurs builders Organization/LocalBusiness/etc.
- L'option B est l'optimum : helper pur exporté, testable isolément (1 cas unit dédié), prêt à servir le moment où Organization JSON-LD sera ajouté post-MVP. Le user a explicitement validé ce choix lors du brainstorming, en lien direct avec la décision sub 1 d'ajouter `Company.legalEntity?` (pour permettre l'enrichissement futur des sociétés clientes en Organization).

### Décision : Type `AddressInput` partagé vs aplatissement chez le caller

**Options envisagées :**
- **A. Aplatir les 4 champs préfixés dans `legal`** : `legal: { siret, addressStreet, addressPostalCode, addressCity, addressCountry }`. Le caller `/a-propos/page.tsx` doit aplatir : `legal: { siret, addressStreet: publisher.address.street, addressPostalCode: publisher.address.postalCode, ... }` (4 lignes de mapping).
- **B. Sous-objet `address: AddressInput`** : `legal: { siret, address: { street, postalCode, city, country } }`. Le caller passe `legal: { siret, address: publisher.address }` (1 ligne, structure aligne Prisma).
- **C. Importer le type Prisma `Address` directement dans `json-ld.ts`** : `legal: { siret, address: PrismaAddress }`. Couplage direct.

**Choix : B**

**Rationale :**
- L'option A force le caller à aplatir manuellement les 4 champs, anti-DRY et erreur-prone (typo dans le naming, oubli d'un champ). Si la structure de `Address` Prisma évolue (ex: ajout d'un `additionalLine` post-MVP), il faut modifier le caller ET le type `legal`.
- L'option C couple `json-ld.ts` (couche présentation Schema.org) à Prisma (couche data). Mauvais découplage : si on remplace Prisma par un autre ORM, ou si on veut tester `buildProfilePagePerson` sans Prisma installé, ce couplage casse. Cohérent avec la convention projet de typer les helpers SEO indépendamment des types BDD (cf. `siteUrl: string` plutôt que `siteUrl: NextConfig['url']`).
- L'option B est l'équilibre : type local `AddressInput` qui matche la structure Prisma `Address` par convention de naming (volontaire, contractualisé via tests), mais sans couplage direct. Le caller passe `publisher.address` (`Address` Prisma) au paramètre `legal.address` (`AddressInput`) et ça fonctionne grâce à la compatibilité structurelle TypeScript (duck typing). Si la structure Prisma diverge un jour, le compilateur signalera l'incompatibilité et on adaptera proprement.

### Décision : Helper `buildSiretIdentifier` extrait OU inline

**Options envisagées :**
- **A. Inline le bloc `identifier: { '@type': 'PropertyValue', propertyID: 'SIRET', value: legal.siret }` dans `buildProfilePagePerson`** : 5 lignes, 1 callsite actuel, lisible.
- **B. Extraire `buildSiretIdentifier(siret: string): SchemaOrgPropertyValue` comme helper pur** : préparation pour réutilisation Organization JSON-LD post-MVP.

**Choix : A**

**Rationale :**
- L'option B est défendable par symétrie avec `buildPostalAddress`, mais le bloc `identifier` est BEAUCOUP plus court (5 lignes vs 8 lignes) et le mapping est trivial (pas de renaming Schema.org : `value` est `value`, `propertyID` est `propertyID`). Pas de risque d'erreur de naming en cas de duplication future.
- 1 seul callsite actuel = règle d'extraction au 2e callsite respectée. Si Organization JSON-LD post-MVP utilise aussi un `identifier` SIRET (pour IONOS hosting ou sociétés clientes), on extraira à ce moment-là.
- Cohérent avec le principe d'extraction parcimonieuse (cf. décision similaire au sub 4 sur `formatSiret` : extrait car réutilisé au sub 7 footer). Ici, pas de second callsite identifié dans les sub-projects feature 7, donc inline est OK.
- Trade-off accepté : 5 lignes à dupliquer si Organization JSON-LD est ajouté post-MVP. Coût de l'extraction au moment opportun = ~10 minutes, négligeable.
