# JSON-LD Person enrichi avec address + taxID + identifier Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Étendre `buildProfilePagePerson` du sub-project SEO 05 existant pour ajouter les champs Schema.org `address` (PostalAddress), `taxID` (SIRET) et `identifier` (PropertyValue) au `mainEntity` Person sur `/a-propos`, lus via `getPublisher` du sub 1, avec extraction d'un helper réutilisable `buildPostalAddress` préparant Organization JSON-LD post-MVP.

**Architecture:** 3 fichiers MODIF uniquement (aucune création). Extension par composition du helper existant via spread conditionnel (`...(input.legal && { ... })`) pour rétro-compatibilité totale. Nouveau type partagé `AddressInput` aligné Prisma `Address` permet au caller de passer `publisher.address` direct. Nouveau helper pur exporté `buildPostalAddress` réutilisable post-MVP pour Organization JSON-LD.

**Tech Stack:** Next.js 16, TypeScript 6 strict, Vitest 4 (project unit jsdom), pnpm 10.

**Spec source :** [docs/superpowers/specs/conformite-legale/06-json-ld-enrich-person-legal-design.md](../../specs/conformite-legale/06-json-ld-enrich-person-legal-design.md)

**Discipline commit (CLAUDE.md projet) :** AUCUN `git commit` intermédiaire pendant l'implémentation. Un seul commit final après validation utilisateur explicite à la fin de Task 6.

**Rules applicables :**
- `.claude/rules/typescript/conventions.md` (alias `@/*`, types via `z.infer`/`typeof`, fonctions pures)
- `.claude/rules/nextjs/data-fetching.md` (queries directes Server Components, parallélisation `Promise.all`)
- `.claude/rules/nextjs/rendering-caching.md` (`'use cache'` + `cacheLife` + `cacheTag` Next 16)
- `.claude/rules/nextjs/server-client-components.md` (Server Component async, helpers purs réutilisables)
- `.claude/rules/vitest/setup.md` (project unit jsdom, factory pattern, Vitest 4 conventions)
- `.claude/rules/nextjs/tests.md` (no mock pour helpers purs, factory pattern fixtures)

---

## Task 1: TDD red: étendre les tests unit avec 4 nouveaux cas

**Files:**
- Modify: `src/lib/seo/json-ld.test.ts` (ajout de 4 cas + extension de la factory `buildProfileInput` pour supporter `legal?` via Partial<>)

- [ ] **Step 1.1: Étendre la factory `buildProfileInput` pour accepter `legal?` (déjà géré par TypeScript via Partial)**

Le contenu actuel de la factory (lignes 12-37 du fichier) accepte `Partial<ProfilePagePersonInput>` qui inclura automatiquement `legal?` une fois le type étendu en Task 2. Aucune modification de la factory nécessaire à cette étape : on l'utilisera tel quel avec un override `{ legal: { ... } }`.

- [ ] **Step 1.2: Ajouter les 4 nouveaux cas tests à la fin du `describe('buildProfilePagePerson', ...)` existant**

Localiser la fermeture du `describe('buildProfilePagePerson', ...)` (ligne ~152 du fichier, juste avant le `function buildBreadcrumbInput(...)`). Ajouter les 4 cas avant cette fermeture.

Insérer le code suivant juste avant le `})` de fermeture du `describe('buildProfilePagePerson', ...)` :

```typescript
  it('quand legal est fourni, mainEntity contient address PostalAddress, taxID, identifier PropertyValue', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        legal: {
          siret: '88041912200036',
          address: {
            street: '11 rue Gouvy',
            postalCode: '57000',
            city: 'Metz',
            country: 'France',
          },
        },
      }),
    )
    expect(result.mainEntity.address).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '11 rue Gouvy',
      postalCode: '57000',
      addressLocality: 'Metz',
      addressCountry: 'France',
    })
    expect(result.mainEntity.taxID).toBe('88041912200036')
    expect(result.mainEntity.identifier).toEqual({
      '@type': 'PropertyValue',
      propertyID: 'SIRET',
      value: '88041912200036',
    })
  })

  it('quand legal est absent, mainEntity n\'a pas address, taxID, identifier (rétro-compat sub SEO 05)', () => {
    const result = buildProfilePagePerson(buildProfileInput())
    expect(result.mainEntity.address).toBeUndefined()
    expect(result.mainEntity.taxID).toBeUndefined()
    expect(result.mainEntity.identifier).toBeUndefined()
  })

  it('garde-fou cohérence : taxID est strictement égal à identifier.value (même SIRET)', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        legal: {
          siret: '88041912200036',
          address: {
            street: '11 rue Gouvy',
            postalCode: '57000',
            city: 'Metz',
            country: 'France',
          },
        },
      }),
    )
    expect(result.mainEntity.taxID).toBe(result.mainEntity.identifier?.value)
  })
```

- [ ] **Step 1.3: Ajouter le 4e cas isolé sur `buildPostalAddress` (helper pur exporté)**

Ajouter à la fin du fichier (après le `describe('buildBreadcrumbList', ...)` existant) un nouveau bloc `describe` :

```typescript
import { buildPostalAddress } from './json-ld'

describe('buildPostalAddress', () => {
  it('mappe les 4 champs Prisma (street, postalCode, city, country) vers le format Schema.org PostalAddress (streetAddress, postalCode, addressLocality, addressCountry)', () => {
    const result = buildPostalAddress({
      street: '7 place de la Gare',
      postalCode: '57200',
      city: 'Sarreguemines',
      country: 'France',
    })
    expect(result).toEqual({
      '@type': 'PostalAddress',
      streetAddress: '7 place de la Gare',
      postalCode: '57200',
      addressLocality: 'Sarreguemines',
      addressCountry: 'France',
    })
  })
})
```

Note : l'import `buildPostalAddress` doit être ajouté en haut du fichier, dans la liste d'imports existants depuis `'./json-ld'` (lignes 3-8) :

```typescript
import {
  buildBreadcrumbList,
  buildPostalAddress,
  buildProfilePagePerson,
  type ProfilePagePersonInput,
  type BreadcrumbListInput,
} from './json-ld'
```

- [ ] **Step 1.4: Lancer les tests, ils doivent ÉCHOUER (red phase)**

Run: `pnpm test src/lib/seo/json-ld.test.ts`
Expected:
- Les 14 cas existants du sub-project SEO 05 passent toujours (rien n'a changé pour eux côté `json-ld.ts`).
- Les 4 nouveaux cas échouent :
  - 3 cas sur `buildProfilePagePerson` avec `legal` : échec TypeScript car `legal` n'est pas dans `ProfilePagePersonInput` actuel + échec runtime car `mainEntity.address`, `taxID`, `identifier` sont absents du retour.
  - 1 cas sur `buildPostalAddress` : échec d'import `Cannot find named export 'buildPostalAddress' from './json-ld'`.
- C'est attendu, c'est la phase red du TDD.

---

## Task 2: TDD green: étendre `json-ld.ts` avec types + helper + extension

**Files:**
- Modify: `src/lib/seo/json-ld.ts`

- [ ] **Step 2.1: Ajouter le type `AddressInput` exporté**

Localiser la zone des types existants (après les types `KnowsAboutEntry`, `ProfilePagePersonInput`, `ProfilePagePerson`, `BreadcrumbListInput`, `BreadcrumbList`, lignes ~5-59 du fichier).

Ajouter le nouveau type `AddressInput` AVANT la déclaration `function normalizeBase(...)` (ligne ~61) :

```typescript
export type AddressInput = {
  street: string
  postalCode: string
  city: string
  country: string
}

export type SchemaOrgPostalAddress = {
  '@type': 'PostalAddress'
  streetAddress: string
  postalCode: string
  addressLocality: string
  addressCountry: string
}
```

- [ ] **Step 2.2: Étendre `ProfilePagePersonInput` avec `legal?` optionnel**

Modifier le type `ProfilePagePersonInput` existant (lignes 14-24) en ajoutant le champ `legal?` à la fin :

```typescript
export type ProfilePagePersonInput = {
  locale: Locale
  siteUrl: string
  name: string
  jobTitle: string
  description: string
  email: string
  image: string
  sameAs: readonly string[]
  expertise: readonly Expertise[]
  legal?: {
    siret: string
    address: AddressInput
  }
}
```

- [ ] **Step 2.3: Étendre `ProfilePagePerson.mainEntity` avec les 3 champs optionnels**

Modifier le type `ProfilePagePerson` existant (lignes 26-42) en ajoutant 3 champs optionnels à la fin du `mainEntity` :

```typescript
export type ProfilePagePerson = {
  '@context': 'https://schema.org'
  '@type': 'ProfilePage'
  dateModified: string
  mainEntity: {
    '@type': 'Person'
    '@id': string
    name: string
    jobTitle: string
    description: string
    url: string
    email: string
    image: string
    sameAs: readonly string[]
    knowsAbout: KnowsAboutEntry[]
    address?: SchemaOrgPostalAddress
    taxID?: string
    identifier?: {
      '@type': 'PropertyValue'
      propertyID: 'SIRET'
      value: string
    }
  }
}
```

- [ ] **Step 2.4: Ajouter le helper exporté `buildPostalAddress`**

Insérer le helper APRÈS `function normalizeBase(...)` (ligne ~63) et AVANT `function mapExpertise(...)` (ligne ~65) :

```typescript
export function buildPostalAddress(address: AddressInput): SchemaOrgPostalAddress {
  return {
    '@type': 'PostalAddress',
    streetAddress: address.street,
    postalCode: address.postalCode,
    addressLocality: address.city,
    addressCountry: address.country,
  }
}
```

- [ ] **Step 2.5: Modifier `buildProfilePagePerson` pour composer les 3 champs conditionnels via spread**

Le contenu actuel de `buildProfilePagePerson` (lignes 77-98) :

```typescript
export function buildProfilePagePerson(
  input: ProfilePagePersonInput,
): ProfilePagePerson {
  const base = normalizeBase(input.siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: new Date().toISOString(),
    mainEntity: {
      '@type': 'Person',
      '@id': `${base}/#person`,
      name: input.name,
      jobTitle: input.jobTitle,
      description: input.description,
      url: `${base}/${input.locale}/a-propos`,
      email: input.email,
      image: input.image,
      sameAs: input.sameAs,
      knowsAbout: input.expertise.map(mapExpertise),
    },
  }
}
```

Remplacer entièrement par la version avec spread conditionnel des 3 nouveaux champs :

```typescript
export function buildProfilePagePerson(
  input: ProfilePagePersonInput,
): ProfilePagePerson {
  const base = normalizeBase(input.siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: new Date().toISOString(),
    mainEntity: {
      '@type': 'Person',
      '@id': `${base}/#person`,
      name: input.name,
      jobTitle: input.jobTitle,
      description: input.description,
      url: `${base}/${input.locale}/a-propos`,
      email: input.email,
      image: input.image,
      sameAs: input.sameAs,
      knowsAbout: input.expertise.map(mapExpertise),
      ...(input.legal && {
        address: buildPostalAddress(input.legal.address),
        taxID: input.legal.siret,
        identifier: {
          '@type': 'PropertyValue' as const,
          propertyID: 'SIRET' as const,
          value: input.legal.siret,
        },
      }),
    },
  }
}
```

Note : les `as const` sur `'PropertyValue'` et `'SIRET'` garantissent le typage littéral exact requis par le type `ProfilePagePerson.mainEntity.identifier`.

- [ ] **Step 2.6: Lancer les tests, ils doivent PASSER (green phase)**

Run: `pnpm test src/lib/seo/json-ld.test.ts`
Expected:
- 14 cas existants passent toujours (sub SEO 05 non régressé)
- 4 nouveaux cas passent (3 cas `buildProfilePagePerson` + 1 cas `buildPostalAddress` isolé)
- Total : 18 tests verts

- [ ] **Step 2.7: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. Les nouveaux types sont reconnus par TypeScript (`AddressInput`, `SchemaOrgPostalAddress`, extension de `ProfilePagePersonInput` et `ProfilePagePerson`).

---

## Task 3: Modifier `/a-propos/page.tsx` pour appeler getPublisher et passer legal

**Files:**
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`

- [ ] **Step 3.1: Ajouter l'import de `getPublisher`**

Localiser la zone des imports existants (lignes 1-33). Ajouter `getPublisher` à l'import depuis `@/server/queries/legal` (créé au sub 1) :

Insérer une nouvelle ligne d'import après `import { ... } from '@/server/queries/about'` (ligne 33) :

```typescript
import { getPublisher } from '@/server/queries/legal'
```

L'ordre alphabétique des imports peut être ajusté si le projet utilise un linter d'ordre d'imports, sinon l'ajout en fin de bloc imports est OK.

- [ ] **Step 3.2: Ajouter `getPublisher()` à `Promise.all` dans `AProposPage`**

Localiser le corps de `AProposPage` (lignes 55-79). Le contenu actuel :

```typescript
export default async function AProposPage({
  params,
}: PageProps<'/[locale]/a-propos'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('AboutPage')
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })

  const sameAs = SOCIAL_LINKS.filter((link) => link.slug !== 'email').map(
    (link) => link.url,
  )
  const emailEntry = SOCIAL_LINKS.find((link) => link.slug === 'email')
  const email = emailEntry?.url.replace(/^mailto:/, '') ?? ''

  const profileJsonLd = await getCachedProfileJsonLd({
    // ...
  })
  // ...
}
```

Remplacer les 3 lignes :
```typescript
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('AboutPage')
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })
```

Par cette parallélisation via `Promise.all` :

```typescript
  const { locale } = await setupLocalePage(params)
  const [t, tMeta, publisher] = await Promise.all([
    getTranslations('AboutPage'),
    getTranslations({ locale, namespace: 'Metadata' }),
    getPublisher(),
  ])
```

Note : la déstructuration positionnelle est cohérente avec le pattern Next.js classique. `setupLocalePage` doit rester séquentiel avant le `Promise.all` car il fait `notFound()` si la locale est invalide, et on ne veut pas lancer les queries si la page va répondre 404.

- [ ] **Step 3.3: Étendre l'appel `getCachedProfileJsonLd` avec le sous-objet `legal` conditionnel**

Localiser l'appel `await getCachedProfileJsonLd({ ... })` (lignes 68-78). Le contenu actuel passe 9 propriétés (locale, siteUrl, name, jobTitle, description, email, image, sameAs, expertise).

Ajouter une 10e propriété `legal` conditionnelle juste avant la fermeture `})` :

```typescript
  const profileJsonLd = await getCachedProfileJsonLd({
    locale,
    siteUrl,
    name: 'Thibaud Geisler',
    jobTitle: tMeta('jobTitle'),
    description: tMeta('aboutDescription'),
    email,
    image: `${siteUrl}${buildAssetUrl('branding/portrait.jpg')}`,
    sameAs,
    expertise: EXPERTISE,
    legal: publisher.siret
      ? {
          siret: publisher.siret,
          address: publisher.address,
        }
      : undefined,
  })
```

Note : le ternaire `publisher.siret ? { ... } : undefined` gère le cas hypothétique où `publisher.siret` serait `null` (DB non seedée en dev local). Pour MVP avec DB seedée correctement par sub 1, le SIRET est toujours `'88041912200036'`, donc le ternaire évalue toujours la branche `then`. Mais le compilateur Prisma type `siret` comme `String | null` (champ nullable au schema), d'où le ternaire défensif.

- [ ] **Step 3.4: Vérifier la compilation**

Run: `pnpm typecheck`
Expected: aucune erreur. `publisher.address` (type Prisma `Address`) est compatible structurellement avec `AddressInput` (les 4 champs `street`, `postalCode`, `city`, `country` matchent).

---

## Task 4: Smoke tests en dev

**Files:** aucun fichier modifié.

- [ ] **Step 4.1: Démarrer le serveur dev**

Run: `pnpm dev`
Expected: serveur démarre sur `http://localhost:3000`. Note : nécessite que sub 1 soit déjà implémenté ET la DB seedée (publisher Thibaud avec siret `88041912200036` et adresse `11 rue Gouvy 57000 Metz France`).

- [ ] **Step 4.2: Charger /fr/a-propos et faire View Source**

Ouvrir `http://localhost:3000/fr/a-propos` dans un navigateur, faire `Ctrl+U` (ou clic droit > View Source).
Expected: dans le HTML rendu, localiser le `<script type="application/ld+json">` (un seul sur la page) et vérifier qu'il contient :
- Tous les champs existants du sub SEO 05 (`@context`, `@type: "ProfilePage"`, `dateModified`, `mainEntity` avec `name`, `jobTitle`, `description`, `url`, `email`, `image`, `sameAs`, `knowsAbout`)
- Les 3 NOUVEAUX champs dans `mainEntity` :
  ```json
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "11 rue Gouvy",
    "postalCode": "57000",
    "addressLocality": "Metz",
    "addressCountry": "France"
  },
  "taxID": "88041912200036",
  "identifier": {
    "@type": "PropertyValue",
    "propertyID": "SIRET",
    "value": "88041912200036"
  }
  ```

- [ ] **Step 4.3: Charger /en/a-propos et vérifier l'identité des données légales**

Ouvrir `http://localhost:3000/en/a-propos` et View Source.
Expected: les 3 champs `address`, `taxID`, `identifier` sont strictement identiques à ceux de `/fr/a-propos` (les données légales ne se traduisent pas, elles sont locale-agnostic). Seuls les champs locale-spécifiques `mainEntity.url` (= `https://localhost:3000/en/a-propos`) et `mainEntity.description` (= EN translation) diffèrent.

- [ ] **Step 4.4: Tester avec Google Rich Results Test**

Copier le contenu du `<script type="application/ld+json">` depuis View Source de `/fr/a-propos` et le coller dans `https://search.google.com/test/rich-results`. (Ou tester via l'URL directe une fois déployé en prod.)
Expected: statut "Profile page eligible" confirmé, aucune erreur ni warning bloquant lié aux nouveaux champs `address`, `taxID`, `identifier`.

- [ ] **Step 4.5: Vérifier l'absence de violations CSP en console**

Ouvrir DevTools console sur `/fr/a-propos`.
Expected: aucune violation CSP. Aucun warning React. Le JSON-LD étant rendu côté serveur via Server Component, aucune ressource externe n'est chargée pour le générer.

- [ ] **Step 4.6: Arrêter le serveur dev**

Run: `Ctrl+C`.

---

## Task 5: Smoke tests en build prod

**Files:** aucun fichier modifié.

- [ ] **Step 5.1: Builder l'app en mode production**

Run: `pnpm build`
Expected: build réussi. Vérifier dans le rapport `next build` que `/[locale]/a-propos` est marqué `ƒ Dynamic` (lecture queries Prisma cachées) ou `● SSG` selon la stratégie de cache appliquée par Next 16. Pas d'augmentation significative du First Load JS (les helpers ajoutés sont pure logique côté serveur, pas dans le bundle client).

- [ ] **Step 5.2: Démarrer le serveur prod**

Run: `pnpm start`
Expected: serveur démarre sur `http://localhost:3000` en mode production.

- [ ] **Step 5.3: Refaire les smoke tests Step 4.2 à 4.5 en prod**

Reproduire les 4 tests : View Source `/fr/a-propos`, View Source `/en/a-propos`, Google Rich Results Test, console CSP.
Expected: comportement identique à dev. Aucune divergence dev/prod.

- [ ] **Step 5.4: Arrêter le serveur prod**

Run: `Ctrl+C`.

---

## Task 6: Vérifications finales et préparation commit

- [ ] **Step 6.1: Lancer le typecheck global**

Run: `pnpm typecheck`
Expected: aucune erreur.

- [ ] **Step 6.2: Lancer le lint**

Run: `pnpm lint`
Expected: aucune erreur.

- [ ] **Step 6.3: Lancer la suite de tests complète**

Run: `pnpm test`
Expected: tous les tests verts. Les 18 tests `json-ld.test.ts` (14 existants + 4 nouveaux) passent. Aucune régression sur les tests existants des autres modules (sub 1 `legal.integration.test.ts`, sub 3 `consent-language-sync.integration.test.tsx`, sub 4 `format-siret.test.ts`, sub 5 `CalendlyWidget.integration.test.tsx`).

- [ ] **Step 6.4: Lancer un build final**

Run: `pnpm build`
Expected: build réussi sans warning bloquant.

- [ ] **Step 6.5: Vérifier le diff git**

Run: `git status`
Expected output (les fichiers attendus) :
- modified: `src/lib/seo/json-ld.ts`
- modified: `src/lib/seo/json-ld.test.ts`
- modified: `src/app/[locale]/(public)/a-propos/page.tsx`

Vérifier qu'il n'y a pas de fichier inattendu.

- [ ] **Step 6.6: DEMANDER VALIDATION USER avant tout `git add` / `git commit`**

NE PAS lancer `git commit` directement. La discipline projet (CLAUDE.md projet § Workflow Git > Discipline commit) interdit les commits auto-initiés.

Présenter à l'utilisateur :
1. La liste des fichiers modifiés (output `git status`)
2. Un résumé : "Sub-project 6/7 implémenté : JSON-LD Person enrichi avec address PostalAddress + taxID SIRET + identifier PropertyValue sur /a-propos, helper buildPostalAddress extrait pour réutilisation post-MVP, 4 nouveaux tests unit verts (helper isolé + 3 cas buildProfilePagePerson), 18 tests json-ld.test.ts au total, smoke tests dev + prod OK, Google Rich Results Test reste vert"
3. Une proposition de message de commit Conventional :
   ```
   feat(seo): enrich Person JSON-LD with address, taxID and identifier from getPublisher

   - buildProfilePagePerson étendu avec sous-objet legal? optionnel (siret + address) → mainEntity.address PostalAddress + taxID SIRET + identifier PropertyValue
   - Nouveau helper pur exporté buildPostalAddress (réutilisable post-MVP pour Organization JSON-LD)
   - Nouveau type AddressInput aligné Prisma Address (caller passe publisher.address direct)
   - /a-propos/page.tsx appelle getPublisher en parallèle des autres queries
   - 4 tests unit ajoutés (helper isolé + 3 cas buildProfilePagePerson) → 18 tests json-ld.test.ts au total

   Refs: docs/superpowers/specs/conformite-legale/06-json-ld-enrich-person-legal-design.md
   ```

Attendre l'accord explicite de l'utilisateur avant de lancer `git add` puis `git commit`.

- [ ] **Step 6.7: Après validation user uniquement, commiter**

Run (uniquement après accord explicite user) :
```bash
git add src/lib/seo/json-ld.ts src/lib/seo/json-ld.test.ts src/app/[locale]/\(public\)/a-propos/page.tsx
git commit -m "$(cat <<'EOF'
feat(seo): enrich Person JSON-LD with address, taxID and identifier from getPublisher

- buildProfilePagePerson étendu avec sous-objet legal? optionnel (siret + address) → mainEntity.address PostalAddress + taxID SIRET + identifier PropertyValue
- Nouveau helper pur exporté buildPostalAddress (réutilisable post-MVP pour Organization JSON-LD)
- Nouveau type AddressInput aligné Prisma Address (caller passe publisher.address direct)
- /a-propos/page.tsx appelle getPublisher en parallèle des autres queries
- 4 tests unit ajoutés (helper isolé + 3 cas buildProfilePagePerson) → 18 tests json-ld.test.ts au total

Refs: docs/superpowers/specs/conformite-legale/06-json-ld-enrich-person-legal-design.md
EOF
)"
```

Run: `git status`
Expected: working tree clean.

- [ ] **Step 6.8: Mettre à jour le statut du spec**

Modifier le frontmatter de `docs/superpowers/specs/conformite-legale/06-json-ld-enrich-person-legal-design.md` :
- Changer `status: "draft"` en `status: "implemented"`

Cette modification peut être commitée séparément en `chore(specs): mark json-ld-enrich-person-legal as implemented` après accord user.

---

## Self-Review

**Spec coverage check :**

| Spec section | Task(s) couvrant |
|---|---|
| `/fr/a-propos` JSON-LD enrichi (Scénario 1) | Task 2 + Task 3 + Task 4 Step 4.2 |
| `/en/a-propos` identique (Scénario 2) | Task 4 Step 4.3 |
| Google Rich Results Test vert (Scénario 3) | Task 4 Step 4.4 |
| `buildPostalAddress` mapping correct (Scénario 4) | Task 1 Step 1.3 + Task 2 Step 2.4 |
| `legal` absent → rétro-compat (Scénario 5) | Task 1 Step 1.2 (test) + Task 2 Step 2.5 (spread conditionnel) |
| 18 tests verts (Scénario 6) | Task 6 Step 6.3 |
| Caller `/a-propos/page.tsx` parallélise via Promise.all | Task 3 Step 3.2 |
| Ternaire défensif `publisher.siret` null safe | Task 3 Step 3.3 |
| Helper `buildPostalAddress` exporté réutilisable | Task 2 Step 2.4 |

Aucun gap identifié.

**Placeholder scan :** aucun TBD/TODO/à définir dans le plan. Code complet à chaque step. Les modifications sont chirurgicales (insertion ou remplacement de blocs précis), pas de "similar to before" ambigu.

**Type consistency :** `AddressInput` défini Task 2 Step 2.1 utilisé Task 1 Step 1.2 (test) + Task 2 Step 2.4 (helper) + Task 2 Step 2.5 (extension). `SchemaOrgPostalAddress` défini Task 2 Step 2.1 utilisé Task 2 Step 2.3 (extension type retour). `buildPostalAddress` défini Task 2 Step 2.4 importé Task 1 Step 1.3 (test). `ProfilePagePersonInput.legal` étendu Task 2 Step 2.2 utilisé Task 1 (tests via override factory) + Task 3 Step 3.3 (caller). Cohérent.

---

## Execution Handoff

**Plan complet et sauvegardé dans `docs/superpowers/plans/conformite-legale/06-json-ld-enrich-person-legal.md`.**

Ce plan sera consommé par `/implement-subproject conformite-legale 06` lors de l'implémentation effective.

**Pas d'implémentation tout de suite** : on est dans le workflow `/decompose-feature` qui boucle sur les 7 sub-projects. Le sub-project 7/7 (`footer-extension-nav-legale-siret`) est le dernier de la feature, dans l'ordre topologique.
