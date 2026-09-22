# Build sans base — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le build indépendant de la base et retirer le seed, l'espace admin devenant la source du contenu.

**Architecture:** Chaque lecture de la base du site public passe sous `<Suspense>` et s'ouvre par `await io()`, qui l'exclut du prerender ; la requête garde son `'use cache'` et se met en cache à la première requête. `/projets/[slug]` perd `generateStaticParams`, `htmlLimitedBots` reprend la protection des crawlers HTML-only. Le pipeline perd sa Postgres, l'image son `DATABASE_URL` de build, le dépôt son seed ; `just db-dump` et `just db-restore` remettent une base de dev en état et servent au transfert vers la production.

**Tech Stack:** Next.js 16.3.3 (`cacheComponents`, `io()` depuis 16.3.0, `partialPrefetching`, `htmlLimitedBots`), Prisma 7, GitHub Actions, Docker.

**Spec:** `docs/superpowers/specs/espace-admin/14-build-sans-base-design.md`

## Global Constraints

- **Aucune lecture de la base au build** : le test est `just build` avec Postgres arrêté. Il doit passer à la fin de la Task 1 et rester vert ensuite.
- **`io()` dans les composants, `connection()` dans les route handlers seulement** : `connection()` bloque le prefetch et porte un bug ouvert avec plusieurs `<Suspense>` (`.claude/rules/nextjs/rendering-caching.md`). `sitemap.ts` et `llms.txt/route.ts` n'ont pas d'arbre React, ils prennent `connection()`.
- **Les requêtes gardent `'use cache'`, `cacheLife` et `cacheTag`** : rien ne change dans `src/server/queries/`. Le cache joue à la requête au lieu du build, `updateTag` depuis l'admin continue d'invalider.
- **`generateStaticParams` ne doit ni rester ni rendre un tableau vide** sur `/projets/[slug]` : un tableau vide casse le build avec Cache Components, un paramètre fictif est déconseillé par Next. La fonction part.
- **`htmlLimitedBots` remplace la liste par défaut de Next** : l'expression reprend cette liste et y ajoute `TelegramBot`, `Bluesky`, `Mastodon`. Jamais `/.*/`.
- **Le seed est supprimé en entier** : `prisma/seed.ts`, `prisma/utils.ts`, `prisma/seed-data/` avec `legal.ts` et ses 22 case studies, et avec eux `src/server/queries/legal.integration.test.ts`, seul lecteur de `legal.ts` (le spec explique pourquoi ce test n'est pas réécrit). `content/legal/` n'est pas touché.
- **`ci.yml` garde sa Postgres et `migrate deploy`** pour les tests d'intégration, et perd seulement l'étape `just db-seed` qui précède `just build`.
- Aucun commit intermédiaire ne part vers le remote. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/data-fetching.md`, `.claude/rules/nextjs/metadata-seo.md`, `.claude/rules/nextjs/production-deployment.md`, `.claude/rules/docker/dockerfile.md`, `.claude/rules/github-actions/workflows.md`, `.claude/rules/prisma/client-setup.md`.

---

### Task 1 : Rendu public différé

**Files:**
- Modify: `src/app/[locale]/(public)/projets/page.tsx`
- Modify: `src/app/[locale]/(public)/projets/[slug]/page.tsx`
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`
- Modify: `src/app/[locale]/(public)/mentions-legales/page.tsx`
- Modify: `src/app/[locale]/(public)/confidentialite/page.tsx`
- Modify: `src/components/layout/Footer.tsx`
- Modify: `src/app/sitemap.ts`
- Modify: `src/app/llms.txt/route.ts`
- Modify: `src/instrumentation.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consomme : `io` et `connection` de `next/cache` et `next/server`, les requêtes de `src/server/queries/` telles quelles, `StackedSkeleton` de `src/components/ui/stacked-skeleton.tsx`.
- Produit : un build qui passe sans base. Rien que les Tasks 2 et 3 consomment par import.

- [ ] **Step 1: Prouver que le build dépend de la base aujourd'hui**

```bash
just docker-down
just build
```

Expected: échec, Prisma ne joint pas la base pendant le prerender (`PrismaClientInitializationError` ou équivalent dans la sortie de `next build`). C'est la ligne de départ : la Task est finie quand cette même commande passe.

- [ ] **Step 2: Différer la liste des projets**

Dans `src/app/[locale]/(public)/projets/page.tsx`, la page monte `ProjectsListAsync` sous `<Suspense>`, et le composant s'ouvre par `await io()` :

```tsx
import { Suspense } from "react"
import { io } from "next/cache"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
// imports existants conservés

export default async function ProjetsPage({ params }: PageProps<"/[locale]/projets">) {
  // ... locale, t, tMeta, breadcrumbJsonLd inchangés

  return (
    <PageShell title={t("pageTitle")} subtitle={t("pageSubtitle")}>
      <Suspense fallback={<StackedSkeleton heights={["h-12", "h-64", "h-64", "h-64"]} />}>
        <ProjectsListAsync locale={locale} />
      </Suspense>
      <JsonLd data={breadcrumbJsonLd} />
    </PageShell>
  )
}

async function ProjectsListAsync({ locale }: { locale: Locale }) {
  await io()
  const projects = await findManyPublished({ locale })
  return <ProjectsList projects={projects} />
}
```

`findManyPublished` garde son `'use cache'` : au build, `io()` suspend et le squelette part dans la coquille ; à la requête, `io()` résout aussitôt et la requête se met en cache.

- [ ] **Step 3: Retirer `generateStaticParams` de la page de projet et descendre `params` sous `<Suspense>`**

Dans `src/app/[locale]/(public)/projets/[slug]/page.tsx` :
- supprimer `generateStaticParams` et son commentaire de cinq lignes sur les crawlers HTML-only, ainsi que les imports devenus inutiles (`routing`, `findAllPublishedSlugs`) ;
- la page ne fait plus `await setupLocalePage(params)` : elle passe la promesse à son composant de contenu, sous `<Suspense>`.

```tsx
import { Suspense } from "react"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"

export default function CaseStudyPage({ params }: PageProps<"/[locale]/projets/[slug]">) {
  return (
    <PageShell>
      <Suspense fallback={<StackedSkeleton heights={["h-48", "h-96", "h-32"]} />}>
        <CaseStudyContentAsync params={params} />
      </Suspense>
    </PageShell>
  )
}

async function CaseStudyContentAsync({ params }: Pick<PageProps<"/[locale]/projets/[slug]">, "params">) {
  const { locale, slug } = await setupLocalePage(params)
  const project = await findPublishedBySlug(slug, locale)
  if (!project) notFound()
  // ... le reste du composant inchangé (tMeta, JSON-LD, rendu)
}
```

Pas d'`io()` ici : « The data comes from an awaited async database query wrapped in `<Suspense>`. The `await` is the suspension point » et `params` est déjà une donnée de requête sans `generateStaticParams`. `generateMetadata` reste tel quel : sans paramètres au build, elle ne s'exécute qu'à la requête. Le `loading.tsx` du segment reste, il couvre la navigation.

- [ ] **Step 4: Différer les trois lectures de la page À propos**

Dans `src/app/[locale]/(public)/a-propos/page.tsx`, chaque composant async qui lit la base s'ouvre par `await io()` et se monte sous `<Suspense>` :

```tsx
import { Suspense } from "react"
import { io } from "next/cache"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"

// dans le JSX de la page :
      <MotionItem>
        <section className="border-y border-border py-16 sm:py-20 lg:py-24">
          <Suspense fallback={<StackedSkeleton heights={["h-24"]} />}>
            <StatsAsync />
          </Suspense>
        </section>
      </MotionItem>

      <section className="flex flex-col gap-6">
        <h2>{t("stack.title")}</h2>
        <Suspense fallback={<StackedSkeleton heights={["h-32"]} />}>
          <StackAsync locale={locale} />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <ProfileJsonLdAsync locale={locale} />
      </Suspense>

// et en tête de chacun des trois composants :
async function ProfileJsonLdAsync({ locale }: { locale: Locale }) {
  await io()
  // ... inchangé
}

async function StatsAsync() {
  await io()
  // ... inchangé
}

async function StackAsync({ locale }: { locale: Locale }) {
  await io()
  // ... inchangé
}
```

`getCachedProfileJsonLd` garde son `'use cache'` : appelé après `io()`, il n'est plus atteint au build et se met en cache à la requête.

- [ ] **Step 5: Différer le contenu des deux pages légales**

Dans `src/app/[locale]/(public)/mentions-legales/page.tsx` et `src/app/[locale]/(public)/confidentialite/page.tsx`, même motif : `<Suspense>` autour du composant de contenu dans la page, `await io()` en première ligne du composant.

```tsx
// mentions-legales/page.tsx
      <PageShell title={t("title")} subtitle={t("lastUpdated")}>
        <Suspense fallback={<StackedSkeleton heights={["h-40", "h-40", "h-40"]} />}>
          <MentionsLegalesContentAsync locale={locale} />
        </Suspense>
      </PageShell>

async function MentionsLegalesContentAsync({ locale }: { locale: Locale }) {
  await io()
  const [t, tLegal, publisher, hosting, legalContent] = await Promise.all([
    // ... inchangé
```

Idem pour `ConfidentialiteContentAsync`. Les requêtes `getPublisher`, `getHostingProvider`, `getDataProcessors` de `src/server/queries/legal.ts` ne changent pas.

- [ ] **Step 6: Différer le SIRET du pied de page**

`src/components/layout/Footer.tsx` est rendu sur toutes les pages publiques : tant que `FooterCopyrightAsync` lit la base au build, chaque page en dépend. Le composant s'ouvre par `await io()`, et le repli devient un texte, pas un squelette : ce pied apparaît sur chaque page, un squelette clignoterait à chaque visite.

```tsx
import { io } from "next/cache"

// dans le JSX, le premier <Suspense> :
          <Suspense fallback={<p>© {env.NEXT_PUBLIC_BUILD_YEAR} Thibaud Geisler</p>}>
            <FooterCopyrightAsync />
          </Suspense>

async function FooterCopyrightAsync() {
  await io()
  const publisher = await getPublisher()
  return (
    <p>
      © {env.NEXT_PUBLIC_BUILD_YEAR} Thibaud Geisler
      {publisher?.siret && ` - SIRET ${formatSiret(publisher.siret)}`}
    </p>
  )
}
```

L'import de `Skeleton` reste utilisé par le second `<Suspense>` de la navigation légale.

- [ ] **Step 7: Sitemap et llms.txt à la demande**

Pas d'arbre React dans ces deux fichiers, donc `connection()` :

```ts
// src/app/sitemap.ts
import { connection } from "next/server"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection()
  const projects = await findAllPublishedSlugs()
  // ... inchangé
}
```

```ts
// src/app/llms.txt/route.ts
import { connection } from "next/server"

export async function GET(): Promise<Response> {
  await connection()
  const projects = await findManyPublished({ locale: "en" })
  // ... inchangé, l'en-tête Cache-Control reste
}
```

- [ ] **Step 8: Retirer l'invalidation au démarrage**

Dans `src/instrumentation.ts`, supprimer le bloc entier, commentaire compris :

```ts
    // Invalide le cache build (rempli au build CI avec données seed ephemeral)
    // pour forcer le fill avec les vraies données prod au premier hit après deploy.
    if (process.env["NEXT_PHASE"] === "phase-production-server") {
      const { revalidateTag } = await import("next/cache")
      revalidateTag("projects", "max")
      revalidateTag("tags", "max")
      revalidateTag("legal-entity", "max")
      revalidateTag("legal-content", "max")
    }
```

Plus rien n'est cuit au build, il n'y a plus rien à purger.

- [ ] **Step 9: `partialPrefetching` et `htmlLimitedBots`**

Dans `next.config.ts`, à côté de `cacheComponents: true` :

```ts
  cacheComponents: true,
  // Sans generateStaticParams sur /projets/[slug], la coquille d'un slug jamais visité est servie
  // à l'instant puis complétée en arrière-plan, y compris dès qu'un <Link> vers lui entre dans le
  // viewport (ISR avec Cache Components).
  partialPrefetching: true,
  // Reprend la liste par défaut de Next (l'option la remplace, elle ne l'étend pas) et y ajoute les
  // crawlers HTML-only que le prerender des slugs protégeait : sans rendu bloquant, ils liraient
  // les métadonnées streamées après </head>. Jamais /.*/ : bugs connus avec Cache Components
  // (.claude/rules/nextjs/metadata-seo.md).
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|TelegramBot|Bluesky|Mastodon/i,
```

La liste par défaut est celle de `node_modules/next/dist/shared/lib/router/utils/html-bots.js` dans Next 16.3.3 : la recopier depuis ce fichier plutôt que d'ici si la version a bougé.

- [ ] **Step 10: Le build passe sans base**

```bash
just docker-down
just build
```

Expected: `✓ Compiled successfully`, aucune erreur Prisma, et au récapitulatif `/[locale]/projets`, `/[locale]/projets/[slug]`, `/[locale]/a-propos`, `/[locale]/mentions-legales`, `/[locale]/confidentialite` en `◐ (Partial Prerender)`, `/sitemap.xml` et `/llms.txt` en `ƒ (Dynamic)`. Plus aucune ligne `/fr/projets/<slug>` prérendue individuellement.

- [ ] **Step 11: Vérifier le comportement à la requête**

```bash
just db
just dev
```

Puis, dans un navigateur ou par `curl` :
- `/fr/projets` affiche les projets ; les logs du serveur montrent la requête Prisma à la première visite, aucune à la seconde ;
- `/fr/projets/<slug>` d'un projet publié s'affiche, `/fr/projets/inexistant` rend la 404 ;
- `/fr/a-propos` affiche les trois compteurs et la stack, et la console du navigateur ne porte aucune `HierarchyRequestError` (page à trois frontières `<Suspense>`, cf. Edge cases du spec) ;
- `/fr/mentions-legales` affiche le SIRET, le pied de page aussi ;
- `curl -s -A "TelegramBot (like TwitterBot)" http://localhost:3000/fr/projets/<slug> | grep -c 'og:title'` retourne `1` et la balise précède `</head>` ; même contrôle avec `-A "Bluesky Cardyb/1.1"` et `-A "http.rb/5.1.1 (Mastodon/4.3.0; +https://example.org/)"` ;
- `curl -s http://localhost:3000/sitemap.xml | grep -c '/projets/'` retourne le nombre de projets publiés × 2 locales.

- [ ] **Step 12: Lint, typecheck, tests, commit**

```bash
just lint && just typecheck && just test
git add "src/app/[locale]/(public)/projets/page.tsx" "src/app/[locale]/(public)/projets/[slug]/page.tsx" "src/app/[locale]/(public)/a-propos/page.tsx" "src/app/[locale]/(public)/mentions-legales/page.tsx" "src/app/[locale]/(public)/confidentialite/page.tsx" src/components/layout/Footer.tsx src/app/sitemap.ts src/app/llms.txt/route.ts src/instrumentation.ts next.config.ts
git commit -m "feat(build-sans-base): diffère toute lecture de la base hors du prerender"
```

---

### Task 2 : Pipeline, image et suppression du seed

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `Dockerfile`
- Modify: `prisma.config.ts`
- Delete: `prisma/seed.ts`, `prisma/utils.ts`, `prisma/seed-data/companies.ts`, `prisma/seed-data/projects.ts`, `prisma/seed-data/tags.ts`, `prisma/seed-data/case-studies/`
- Delete: `src/server/queries/legal.integration.test.ts`
- Modify: `Justfile`
- Modify: `.gitignore`

**Interfaces:**
- Consomme : le build sans base de la Task 1.
- Produit : `just db-dump` et `just db-restore FILE`, seules commandes qui déplacent du contenu entre bases. `prisma db seed` n'existe plus.

- [ ] **Step 1: `deploy.yml` sans base**

Retirer du job `build-and-deploy` :
- tout le bloc `services:` (le service `postgres` et ses options) ;
- le bloc `env:` du job qui pose `DATABASE_URL` ;
- l'étape `Apply Prisma migrations + minimal seed on CI Postgres` en entier ;
- dans `docker/setup-buildx-action`, le `with: driver-opts: network=host`, et dans `docker/build-push-action` les lignes `network: host` et `allow: network.host` : ils n'existaient que pour atteindre la Postgres du runner ;
- dans `build-args:`, la ligne `DATABASE_URL=${{ env.DATABASE_URL }}`.

Le job garde : checkout, pnpm, node, `pnpm install --frozen-lockfile`, login GHCR, metadata, buildx, build & push avec les quatre `NEXT_PUBLIC_*` et le secret Sentry, trigger Dokploy.

Dans `ci.yml`, job `quality`, supprimer l'étape `- run: just db-seed` et le commentaire de trois lignes qui la précède (« generateStaticParams des pages projet lit la DB : sans seed il renvoie [] ... »). Tout le reste du job reste : le service `postgres`, `DATABASE_URL`, `prisma migrate deploy`, `just test`, `just build`. La recette `db-seed` disparaît du `Justfile` au Step 5, la CI casserait sans ce retrait.

```bash
actionlint .github/workflows/deploy.yml .github/workflows/ci.yml
```

Expected: aucune sortie.

- [ ] **Step 2: `Dockerfile` sans `DATABASE_URL` ni seed**

Dans le stage `builder` :
- supprimer le bloc `ARG DATABASE_URL` / `ENV DATABASE_URL=$DATABASE_URL` et son commentaire de quatre lignes (« DATABASE_URL au build = connection string vers Postgres ephemeral... ») ;
- supprimer le bloc `# --- Bundle du seed Prisma ---` en entier, commentaire et `RUN pnpm exec esbuild prisma/seed.ts ...` compris ;
- dans le titre du stage, `# Stage: builder — Build Next.js (standalone) + bundle du seed Prisma` devient `# Stage: builder — Build Next.js (standalone)`.

Dans le stage `deploy-prisma`, le commentaire « requis pour que le runner standalone puisse lancer `prisma migrate deploy` et `prisma db seed` au startup » devient « requis pour que le runner standalone puisse lancer `prisma migrate deploy` au startup ».

Dans le stage `runner`, le commentaire `# --- Artifacts Prisma (client + adapter en deps prod, schema, migrations, seed bundlé) ---` devient `# --- Artifacts Prisma (client + adapter en deps prod, schema, migrations) ---`. La `COPY --from=builder /app/prisma ./prisma` reste : elle porte `schema.prisma` et `migrations/`.

`ENV SKIP_ENV_VALIDATION=true` reste : les variables serveur sont injectées au runtime par Dokploy.

- [ ] **Step 3: `prisma.config.ts` sans seed**

Supprimer la clé `seed` et son commentaire de trois lignes dans `migrations:` :

```ts
  migrations: {
    path: "prisma/migrations",
  },
```

- [ ] **Step 4: Supprimer le seed et le test qui en dépendait**

```bash
git rm -r prisma/seed.ts prisma/utils.ts prisma/seed-data src/server/queries/legal.integration.test.ts
```

`prisma/utils.ts` (`parseOrThrow`) n'avait que le seed pour consommateur. `legal.integration.test.ts` importait ses lignes depuis `prisma/seed-data/legal` et n'est pas réécrit : le spec (§ Fichiers touchés) détaille pourquoi. `src/lib/prisma-test-setup.ts` ne change pas, son `TRUNCATE` doit continuer à couvrir les tables légales pour les autres tests. Vérifier qu'il ne reste rien :

```bash
git grep -n "seed-data\|prisma/seed\|prisma/utils\|parseOrThrow" -- ':!docs' ':!.claude'
```

Expected: aucune sortie.

- [ ] **Step 5: `Justfile` et `.gitignore`**

`db-seed` disparaît, deux recettes le remplacent. Le dump exclut le schéma `auth` : ses sessions n'ont rien à faire dans une autre base, et c'est aussi ce que le transfert vers la production exigera. Format custom (`-Fc`) pour que `pg_restore` puisse rejouer dans l'ordre des contraintes.

```just
# Réinitialise la DB de dev (drop + recreate + migrate, sans données : just db-restore ensuite)
[confirm('Cela va DROP la DB de dev. Continuer ?')]
[group('db')]
db-reset:
    pnpm prisma migrate reset --force

# Dump des données de la DB de dev (tout sauf le schéma auth), dans dumps/ ignoré par git
[group('db')]
[script]
db-dump:
    mkdir -p dumps
    docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d portfolio_dev -Fc --data-only --exclude-schema=auth' > "dumps/portfolio_dev-$(date +%Y%m%d-%H%M%S).dump"
    ls -1t dumps | head -1

# Restaure un dump dans la DB de dev, à lancer sur une base vidée par just db-reset
[group('db')]
db-restore FILE:
    docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d portfolio_dev --data-only --disable-triggers' < "{{ FILE }}"
```

`--disable-triggers` laisse `pg_restore` insérer sans se soucier de l'ordre des clés étrangères, ce que l'utilisateur `postgres` du conteneur, superutilisateur, autorise. `setup` ne peuple plus rien :

```just
# Setup complet : dépendances, base prête. Les données de dev : just db-restore <dump>
[group('setup')]
setup: install db
```

Dans `.gitignore`, ajouter `dumps/`.

- [ ] **Step 6: Vérifier**

```bash
pnpm prisma db seed
```

Expected: Prisma répond qu'aucun seed n'est configuré (message `No seed command found` ou équivalent selon la version), code de sortie non nul.

```bash
just db-dump
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d portfolio_dev -A -t -c "SELECT count(*) FROM public.\"Project\""'
just db-reset
just db-restore dumps/<fichier affiché par db-dump>
docker compose exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d portfolio_dev -A -t -c "SELECT count(*) FROM public.\"Project\""'
```

Expected: un fichier dans `dumps/`, le même comptage de projets avant et après, et `pg_restore --list dumps/<fichier> | grep -c 'auth'` retourne `0`.

```bash
just test
```

Expected: tous les fichiers unitaires verts, et 4 fichiers d'intégration verts, pas 5 : `about` et `projects` côté queries, `projects` côté actions, la route `assets`.

```bash
just docker-down
just build
```

Expected: toujours vert, sans base.

- [ ] **Step 7: Construire l'image comme la CI la construira**

La seule preuve que l'image se construit sans `DATABASE_URL` est de la construire. Sans les quatre `NEXT_PUBLIC_*`, le build sortirait des `undefined` dans le sitemap et les canonicals, donc les passer avec des valeurs de dev :

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=http://localhost:3000 \
  --build-arg NEXT_PUBLIC_CALENDLY_URL_FR=https://calendly.com/x/fr \
  --build-arg NEXT_PUBLIC_CALENDLY_URL_EN=https://calendly.com/x/en \
  -t portfolio-sans-base:test .
```

Expected: image construite, aucune étape esbuild, aucune mention de `DATABASE_URL` dans la sortie. Compte tenu de la durée (plusieurs minutes), lancer en arrière-plan et relire la sortie. Supprimer l'image ensuite : `docker rmi portfolio-sans-base:test`.

- [ ] **Step 8: Commit**

```bash
git add .github/workflows/deploy.yml .github/workflows/ci.yml Dockerfile prisma.config.ts Justfile .gitignore
git commit -m "feat(build-sans-base): retire la base du pipeline et supprime le seed"
```

Les suppressions sont déjà dans l'index depuis le `git rm` du Step 4.

---

### Task 3 : Docs, rules et ADR

**Files:**
- Create: `docs/adrs/022-rendu-public-sans-donnee-au-build.md`
- Modify: `docs/PRODUCTION.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `.claude/rules/nextjs/routing.md`
- Modify: `.claude/rules/nextjs/rendering-caching.md`
- Modify: `.claude/rules/nextjs/data-fetching.md`
- Modify: `.claude/rules/nextjs/metadata-seo.md`
- Modify: `.claude/rules/prisma/schema-migrations.md`
- Modify: `.claude/skills/infra-ops/SKILL.md`
- Modify: `.claude/skills/setup-ops/SKILL.md`
- Modify: `.claude/skills/verify/SKILL.md`
- Modify: `docs/VERSIONS.md`
- Modify: `docs/knowledges/prisma.md`
- Modify: `docs/knowledges/nodejs.md`
- Modify: `docs/superpowers/specs/espace-admin/README.md`

**Interfaces:**
- Consomme : l'état livré des Tasks 1 et 2, à décrire tel qu'il est.
- Produit : une documentation, des rules et des skills qui ne mentionnent plus ni Postgres de CI, ni seed, ni prerender des slugs.

Chaque document ci-dessous est gouverné par un skill : `architecture-doc` pour l'ADR et `ARCHITECTURE.md`, `production-doc` pour `PRODUCTION.md`, `rules-doc` pour `.claude/rules/**`, `versions-doc` pour `VERSIONS.md`, `knowledge-doc` pour `docs/knowledges/**`, et **`skill-creator` pour les trois `SKILL.md`**, qu'on n'édite jamais directement. Charger le skill et lire son template avant d'écrire, c'est une règle du projet.

- [ ] **Step 1: L'ADR**

`docs/adrs/022-rendu-public-sans-donnee-au-build.md`, au format de l'ADR-021 (frontmatter `title`, `status: "accepted"`, `description`, `date`, `keywords`, `scope`, `technologies` ; sections Contexte, Problème, Options Envisagées, Décision, Conséquences). Contenu à porter :

- **Contexte** : le site public prérendait ses pages avec leur contenu, ce qui imposait une base peuplée au build, d'où une Postgres éphémère et un seed en CI. L'espace admin est devenu la source du contenu au sub-project `13`.
- **Problème** : comment construire l'image sans base, et que devient le seed.
- **Options** : A, garder le prerender avec un seed d'amorçage minimal (le mécanisme reste branché à la CI, il faut décider ce qui est « amorçage » à chaque modèle) ; B, différer toute lecture de la base à la requête par `io()` sous `<Suspense>`, le cache `'use cache'` jouant à l'exécution, et supprimer le seed, un dump et son restore remettant une base locale en état ; C, builder sur le VPS où la base est joignable (Dokploy rebuild, ce que `PRODUCTION.md` documente comme impraticable : BuildKit sandbox, base inaccessible).
- **Décision** : B, avec `partialPrefetching` et `htmlLimitedBots` étendu, en citant les trois phrases de la doc Next.js 16.3.5 qui portent le motif (`io()` : « awaiting this promise stops prerendering so the code that follows is excluded from the prerender output » ; routes dynamiques sans `generateStaticParams` : « param values are unknown during prerendering, making params runtime data » ; self-hosting : « Cache Components works by default with Next.js... including deployment as a Node.js server and when used with a Docker container »).
- **Conséquences** : la première visite de chaque page après un démarrage calcule ; un redémarrage vide le cache mémoire ; les Core Web Vitals sont à remesurer en production ; le streaming derrière Traefik conditionne le gain de premier octet ; `ci.yml` garde sa base pour les tests d'intégration.

- [ ] **Step 2: `PRODUCTION.md`**

Cinq passages, dans l'ordre du document :

**§ Accès Dashboard Dokploy**, la ligne « `Schedules` : tâches ponctuelles, dont `manual-seed` » devient « `Schedules` : tâches ponctuelles. Aucune depuis la suppression de `manual-seed` (septembre 2026, sub-project `14`) ».

**§ Étapes de Déploiement**, la ligne « Côté GHA » devient :

> **Côté GHA (`deploy.yml`)** : tag `v*` push → build Docker → push GHCR (`latest` + `X.Y.Z` + `X.Y` + `sha-XXX`) → curl POST `api/compose.redeploy` Dokploy avec retry 3×. Le build ne touche aucune base : le site public ne cuit pas de contenu au prerender ([ADR-022](adrs/022-rendu-public-sans-donnee-au-build.md)).

**§ Checklist Release**, bloc Sentry : supprimer la ligne « `/fr/projets` affiche les projets de la base de production et non ceux du seed du build CI (confirme que l'invalidation `NEXT_PHASE` s'exécute toujours au boot) ».

**§ Checklist Release**, ajouter un bloc, à cocher au premier tag qui embarque ce sub-project :

> **Contenu depuis l'espace admin (à cocher au premier tag embarquant le build sans base) :**
> - [ ] Avant le merge vers `main` : la base de dev est validée depuis l'espace admin, entreprises, tags, projets et données légales
> - [ ] Avant le merge vers `main` : sauvegarde de la base de production datée du jour (Database `portfolio-db` → Backups)
> - [ ] Avant le merge vers `main` : `just db-dump` de la base locale (tout sauf le schéma `auth`), répétition à blanc par `just db-reset` puis `just db-restore` en local, puis restore dans `portfolio-db` après vidage des tables de contenu
> - [ ] Avant le merge vers `main` : buckets synchronisés comme au bloc Cloudflare R2 ci-dessus
> - [ ] Après déploiement : suppression du Schedule `manual-seed` dans Dokploy (Compose `Portfolio-app` → Schedules), il n'a plus de commande à lancer
> - [ ] Après déploiement : `curl -N https://thibaud-geisler.com/fr/projets` montre la coquille avant le contenu ; si tout arrive d'un bloc, le streaming est mis en tampon par le proxy et le gain de premier octet est perdu
> - [ ] Après déploiement : trois `curl -s -A "<user-agent>"` sur une page de projet avec `TelegramBot (like TwitterBot)`, `Bluesky Cardyb/1.1` et `http.rb/5.1.1 (Mastodon/4.3.0; +https://example.org/)` trouvent `og:title` avant `</head>`
> - [ ] Après déploiement : PageSpeed Insights sur les quatre pages clés × deux locales, comparé à [baselines/](baselines/), et nouveau relevé daté

**§ Checklist Pré-MEP**, « Smoke test du livrable » : remplacer « Le prerender exige une base accessible **au build**, c'est ce que reproduit la Postgres éphémère de `deploy.yml` (§ Déploiement) : un build sans base n'est pas représentatif » par « Le build n'exige aucune base depuis [ADR-022](adrs/022-rendu-public-sans-donnee-au-build.md) : un `DATABASE_URL` joignable n'est nécessaire qu'au `just docker-up` qui suit ».

**§ Checklist Post-MEP** : la ligne « Seed BDD initial » devient un constat daté, et l'avertissement final aussi :

> - [x] **Seed BDD initial** : effectué au premier déploiement (mai 2026) par le Schedule Dokploy `manual-seed`. Le seed et le Schedule ont disparu avec le sub-project `14` de l'espace admin (septembre 2026) : le contenu vient de l'espace admin, et une base vide se remplit par transfert (§ Checklist Release, bloc Contenu depuis l'espace admin)

> ℹ️ **Il n'existe plus de seed** : `prisma db seed` n'est pas configuré et le dépôt ne porte plus aucune donnée de contenu. Une base se remplit par `just db-restore` d'un dump, jamais par rejeu de fichiers du dépôt.

- [ ] **Step 3: `ARCHITECTURE.md`**

Trois passages :

**Use-case 1**, les étapes 2 et 3 deviennent :

> 2. La liste est un Server Component async sous `<Suspense>`, ouvert par `await io()` : exclu du prerender, il s'exécute à la requête et sa query porte `'use cache'` + `cacheTag('projects')`
> 3. La première visite après un démarrage calcule et met en cache, les suivantes sont servies du cache jusqu'à `updateTag('projects')` depuis l'espace admin

**§ Caching**, le paragraphe « Les quatre tags sont purgés au démarrage par `src/instrumentation.ts`... » devient :

> Aucun tag n'est purgé au démarrage : le build ne cuit aucune donnée ([ADR-022](adrs/022-rendu-public-sans-donnee-au-build.md)), le cache se remplit à la première requête. Invalidation par `updateTag` depuis les Server Actions de l'espace admin.

**§ CI/CD**, la ligne `deploy.yml` devient :

> - **`deploy.yml`** : sur push tag `v*`, ou `workflow_dispatch` sur le ref d'un tag pour rejouer un déploiement (tout autre ref est sauté) → build Docker sans base → push GHCR → trigger Dokploy redeploy.

- [ ] **Step 4: Les quatre rules**

`.claude/rules/nextjs/routing.md`, la règle sur `generateStaticParams` devient :

> - Ne pas poser `generateStaticParams` sur `/projets/[slug]` : sans lui, les paramètres sont des données de requête, la page passe la promesse `params` à un composant sous `<Suspense>` et se rend à la première visite, puis est servie du disque. Avec `cacheComponents`, un `generateStaticParams` ne peut pas rendre un tableau vide et un paramètre fictif est déconseillé par Next : le build ne doit pas dépendre de la base ([ADR-022](../../../docs/adrs/022-rendu-public-sans-donnee-au-build.md)). Les métadonnées des crawlers HTML-only sont couvertes par `htmlLimitedBots`, cf. `nextjs/metadata-seo.md`. `dynamicParams` ne doit PAS être exporté (build cassé avec `cacheComponents`)

`.claude/rules/nextjs/rendering-caching.md` :
- la règle « `'use cache'` XOR `<Suspense>` » gagne une phrase : « Exception : un composant sous `<Suspense>` qui s'ouvre par `await io()` puis appelle une fonction `'use cache'`. Le composant est exclu du prerender, la fonction se met en cache à la requête : c'est le motif de tout le site public, qui ne lit jamais la base au build » ;
- l'avertissement sur `connection()` gagne : « Préférer `io()` (Next 16.3.0) dans les composants : il suspend comme un `await` ordinaire, n'attend pas une vraie navigation et laisse le code aval être mis en cache et préchargé. `connection()` reste pour les route handlers sans arbre React (`sitemap.ts`, `llms.txt`) ».

`.claude/rules/nextjs/data-fetching.md`, l'exemple « generateStaticParams pour routes dynamiques /[slug] » avec son commentaire « Requiert DB accessible au build » est remplacé par :

```typescript
// ✅ Route dynamique /[slug] sans generateStaticParams : params descend sous <Suspense>
export default function Page({ params }: PageProps<"/[locale]/projets/[slug]">) {
  return (
    <Suspense fallback={<Skeleton />}>
      <Content params={params} />
    </Suspense>
  )
}

async function Content({ params }) {
  const { locale, slug } = await params
  const project = await findPublishedBySlug(slug, locale) // 'use cache' interne, mis en cache à la requête
  return <CaseStudy project={project} />
}
```

`.claude/rules/nextjs/metadata-seo.md`, la règle « Ne PAS désactiver le streaming globalement via `htmlLimitedBots: /.*/`... Le levier propre est `generateStaticParams` » devient : « Ne PAS désactiver le streaming globalement via `htmlLimitedBots: /.*/` : bugs connus avec `cacheComponents` + PPR sur 16.2.x-16.3.0 (mêmes issues). Le levier est une expression **ciblée** qui reprend la liste par défaut de Next (`node_modules/next/dist/shared/lib/router/utils/html-bots.js`, l'option la remplace au lieu de l'étendre) et ajoute les crawlers HTML-only manquants : `TelegramBot`, `Bluesky`, `Mastodon`. À vérifier après déploiement par un `curl -A` avec chacun d'eux ».

Ensuite, contrôler qu'aucune autre occurrence ne subsiste :

```bash
grep -rn -i "postgres éphémère\|postgres ephemeral\|db seed\|db-seed\|manual-seed\|seed-data\|prisma/seed\|seedé\|NEXT_PHASE" .claude/rules .claude/skills .claude/CLAUDE.md docs/*.md docs/knowledges README.md
```

Expected: seules les occurrences qui décrivent le passé au passé (Post-MEP, ADR-022, README des specs). Toute autre occurrence se corrige dans le même esprit.

- [ ] **Step 5: Skills, rule Prisma, VERSIONS et knowledges**

**Les trois skills**, via `Skill[skill-creator]` :
- `.claude/skills/infra-ops/SKILL.md` : dans `allowed-tools`, `Bash(just db-seed)` remplacé par `Bash(just db-dump)` et `Bash(just db-restore *)` ; dans le tableau, la ligne « Seed la DB depuis `prisma/seed-data/` | `just db-seed` » remplacée par deux lignes, « Dump des données de la DB de dev, sans le schéma `auth` | `just db-dump` | Non destructif, écrit dans `dumps/` » et « Restaure un dump dans la DB de dev | `just db-restore <fichier>` | ⚠️ Sur une base vidée par `db-reset` seulement, `pg_restore` empile sinon » ; la note de `db-reset` « sans seed (`just db-seed` ensuite) » devient « sans données (`just db-restore` ensuite) ».
- `.claude/skills/setup-ops/SKILL.md` : la ligne `setup` devient « install + db (Postgres up + migrate deploy). Les données : `just db-restore <dump>` ».
- `.claude/skills/verify/SKILL.md` : « un tag seedé renommé pour un test » devient « un tag de la base de dev renommé pour un test ».

**La rule Prisma**, via `rules-doc` : dans `.claude/rules/prisma/schema-migrations.md`, « Exécuter `pnpm prisma db seed` explicitement : le seeding automatique est supprimé en v7 » devient « Aucun seed configuré : `migrations.seed` est absent de `prisma.config.ts`, le contenu vient de l'espace admin et une base locale se remplit par `just db-restore` ([ADR-022](../../../docs/adrs/022-rendu-public-sans-donnee-au-build.md)). Prisma 7 n'en lance de toute façon aucun automatiquement ».

**`docs/VERSIONS.md`**, via `versions-doc`, quatre passages :
- ligne `@next/env` du tableau : « Chargement `.env` dans `prisma.config.ts`, `prisma/seed.ts`, `vitest.env-loader.ts` » perd `prisma/seed.ts` ;
- § `@next/env`, « Sans ce paquet, la CLI Prisma et le seed tournent... » perd « et le seed » ;
- le bloc `prisma.config.ts` reproduit dans la fiche Prisma perd sa clé `seed` et son commentaire, pour correspondre au fichier réel ;
- § TypeScript, « `allowJs` élargit ce que `tsc --noEmit` vérifie (le seed bundlé et les configs JS entrent dans le périmètre) » devient « (les configs JS entrent dans le périmètre) ». Le point « Seeding automatique supprimé » des breaking changes Prisma 7 reste : c'est un fait sur Prisma.

**`docs/knowledges/`**, via `knowledge-doc` : dans `prisma.md`, retirer la seule phrase propre au projet, « En production le seed est pré-bundlé, voir `prisma.config.ts` du projet », le reste de la section Seeding décrit Prisma et reste ; dans `nodejs.md`, « Utile pour `prisma/seed.ts`, scripts de migration, tâches one-shot » devient « Utile pour les scripts standalone et les tâches one-shot ».

- [ ] **Step 6: `README.md` des specs**

Dans `docs/superpowers/specs/espace-admin/README.md`, § À traiter avant la mise en production, les deux lignes « Retirer le Schedule Dokploy `manual-seed` » et « Saisir les données réelles depuis l'espace admin » deviennent :

> | Retirer le Schedule Dokploy `manual-seed` | `11`, `14` | ⬜ Après le déploiement du `14` : le seed n'existe plus, le Schedule n'a plus de commande à lancer. Geste manuel de la Checklist Release, bloc Contenu depuis l'espace admin |
> | Saisir les données réelles depuis l'espace admin | `11`, `12`, `13`, `14` | ⬜ Entreprises, tags, projets et données légales en base de dev, puis transfert unique vers la production à la release du `14` par `just db-dump` et restore. Le seed a disparu |

- [ ] **Step 7: Lint et commit**

```bash
just lint
git add docs/adrs/022-rendu-public-sans-donnee-au-build.md docs/PRODUCTION.md docs/ARCHITECTURE.md docs/VERSIONS.md docs/knowledges/prisma.md docs/knowledges/nodejs.md .claude/rules/nextjs/routing.md .claude/rules/nextjs/rendering-caching.md .claude/rules/nextjs/data-fetching.md .claude/rules/nextjs/metadata-seo.md .claude/rules/prisma/schema-migrations.md .claude/skills/infra-ops/SKILL.md .claude/skills/setup-ops/SKILL.md .claude/skills/verify/SKILL.md docs/superpowers/specs/espace-admin/README.md
git commit -m "docs(build-sans-base): acte le rendu public sans donnée au build"
```

---

### Task 4 : Vérifier de bout en bout

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Build sans base, une dernière fois**

```bash
just docker-down && just build
```

Expected: vert.

- [ ] **Step 2: Cache à la requête**

`just db && just dev`, puis deux visites de `/fr/projets` et deux d'un `/fr/projets/<slug>`. Les logs Prisma montrent une requête par page à la première visite, aucune à la seconde.

- [ ] **Step 3: Invalidation depuis l'admin**

Modifier le titre français d'un projet publié depuis `/admin/projets/[id]`, enregistrer, recharger `/fr/projets`. Le nouveau titre apparaît.

- [ ] **Step 4: Crawlers HTML-only**

Les trois `curl -A` du Step 11 de la Task 1, sur une page de projet. `og:title` avant `</head>` dans les trois réponses.

- [ ] **Step 5: Suite complète**

```bash
just lint && just typecheck && just test
```

Expected: tout vert.

- [ ] **Step 6: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Les trois commits de tâche sont squashés par `/implement-subproject` en un seul, dont le message proposé :

```
feat(build-sans-base): rend le build indépendant de la base et retire le seed
```
