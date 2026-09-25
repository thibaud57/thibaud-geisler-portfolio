---
name: verify
description: Recette de build-and-drive du portfolio pour la vérification runtime (lancement de l'app, pilotage des surfaces, capture des preuves).
---

# Verify — recette runtime du portfolio

## Prérequis

Postgres doit tourner, sinon les pages qui lisent la base répondent 500 sans que ce soit lié au changement :

```bash
docker ps --format "{{.Names}}: {{.Status}}" | grep postgres   # attendu : healthy
just db                                                         # démarre Postgres + migrations de portfolio_dev si absent
```

## Lancer et attendre

`just dev` bloque le shell et ses logs sont la principale source de preuve : le rediriger vers un fichier, puis attendre la réponse HTTP plutôt qu'un délai fixe.

```bash
(pnpm dev > "$SCRATCH/verify-dev.log" 2>&1 &)
until curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/fr | grep -q 200; do sleep 2; done
just stop   # à la fin, libère le port 3000
```

## Surfaces et comment les piloter

| Surface | Pilotage |
|---|---|
| Page publique | `curl -s http://localhost:3000/fr/<route>` |
| En-têtes (CSP, sécurité) | `curl -s -D - -o /dev/null http://localhost:3000/fr/contact` |
| Route handler | `curl -s "http://localhost:3000/api/<route>"` |
| Server Action (formulaire) | voir ci-dessous, le POST se reconstruit à la main |
| Logs applicatifs (Pino) | `grep "<event>" "$SCRATCH/verify-dev.log"` |
| Authentification (Better Auth) | `curl -s http://localhost:3000/api/auth/get-session` (`null` sans session). Flux OAuth réel et garde admin : voir ci-dessous |
| Espace admin sans session | `curl -s -o /dev/null -D - http://localhost:3000/admin` : 307 vers `/admin/login`, sans préfixe de locale |
| Espace admin connecté | `just dev-login` puis `curl -b <jar>`, voir « Se connecter sans Google » |
| Base de données | `docker exec thibaud-geisler-portfolio-postgres-1 sh -c 'psql -U "$POSTGRES_USER" -d portfolio_dev -A -c "<SQL>"'` : les credentials viennent de l'environnement du conteneur, sans lire `.env` (base de test : `portfolio_test`, liste via `psql -d postgres -l`, sans `-d` psql cherche une base au nom de l'utilisateur, absente) |
| Erreurs remontées à Sentry | `sentry issue list tg-ws/thibaud-geisler-portfolio --limit 5 --fresh`, puis `sentry issue view <SHORT-ID>` (l'ingestion prend 15 à 60 s, boucler plutôt qu'attendre un délai fixe). Détail et pièges : [knowledges/sentry.md](../../../docs/knowledges/sentry.md) |

## Piloter une Server Action sans navigateur

Le formulaire n'a pas d'`action` HTTP classique (React gère la soumission). Reconstruire le POST à la main : les champs cachés `$ACTION_*` sont dans le HTML de la page, et le header `Next-Action` porte l'id de l'action.

```bash
curl -s http://localhost:3000/fr/contact -o page.html
grep -oE '<input[^>]*ACTION[^>]*>' page.html          # récupère les champs et l'id d'action

curl -s -X POST http://localhost:3000/fr/contact \
  -H "Next-Action: <id récupéré ci-dessus>" \
  -F '$ACTION_REF_1=' -F '$ACTION_1:0={"id":"<id>","bound":"$@1"}' \
  -F '$ACTION_1:1=[{"ok":null,"errors":{},"message":null}]' \
  -F '$ACTION_KEY=<clé récupérée>' \
  -F 'name=Test' -F 'email=test@exemple.fr' -F 'subject=Test' -F 'message=Test' -F 'website='
```

Sans le header `Next-Action`, Next.js rend la page normalement au lieu d'exécuter l'action : le 200 obtenu ne prouve rien.

## Piloter une Server Action de l'espace admin

Un formulaire rendu dans une modale fermée n'est pas dans le HTML : ni champs `$ACTION_*`, ni id d'action à y récupérer. L'id se lit dans le manifeste du build de dev, une fois la page servie au moins une fois :

```bash
find ".next/dev/server/app/admin/(protected)" -name server-reference-manifest.json | while read f; do echo "== $f"
  node -e 'const m=require(process.argv[1]); for (const [id,v] of Object.entries(m.node)) console.log(id, v.exportedName)' "./$f"; done
```

Chaque page ne liste que les actions que ses composants importent, et le POST vise cette page : `deleteCompany` sur `/admin/entreprises`, `createCompany`/`updateCompany` sur `/admin/entreprises/nouvelle` ou `[id]`, `deleteProject`/`reorderProjects` sur `/admin/projets`, `createProject`/`updateProject` sur `/admin/projets/nouveau` ou `[id]`, `uploadAsset`/`deleteAsset` sur `/admin/assets`.

Le corps se construit avec le vrai `encodeReply` que Next embarque, jamais à la main. Un script du scratchpad ne résout pas `next/...` depuis son propre dossier, d'où le `createRequire` pointé sur le dépôt :

```js
const req = require("module").createRequire("<racine du dépôt>/package.json")
const { encodeReply } = req("next/dist/compiled/react-server-dom-turbopack/client.edge.js")

const fd = new FormData()
fd.append("slug", "verify-xx-a")                                  // les champs du formulaire
const body = await encodeReply([{ ok: null, errors: {}, message: null }, fd])  // (prevState, formData)
// action liée par bind(null, id) : encodeReply([id, prevState, fd])
// action à arguments simples, deleteTag(id) : encodeReply([id]), corps texte

await fetch("http://localhost:3000/admin/tags", {
  method: "POST", body, redirect: "manual",
  headers: { "Next-Action": "<id>", Accept: "text/x-component",
             Origin: "http://localhost:3000", Cookie: "<cookies du jar>" },
})
// la valeur retournée est la ligne qui contient `"ok":` ; en dev, une ligne `1:D"$…"` de debug peut la précéder
```

Un champ à valeurs multiples (`sectors`, `formats`, `tagIds`) s'ajoute une fois par valeur : les actions le lisent par `getAll`, un seul `append` ne teste pas ce piège. Un fichier se dépose avec `fd.append("file", new Blob([octets], { type: "image/png" }), "x.png")`, à côté de `folder`, `slug` et `filename`.

Toute entité de test (tag, entreprise, projet, asset) prend un préfixe de slug propre au run et se supprime avant de rendre la main, dans l'ordre imposé par les `Restrict` : projet, puis entreprise et tags, puis assets. Une entité de la base de dev modifiée pour un test se restaure et se vérifie en base champ par champ. Jamais `db-reset`.

Les deux refus d'accès ne se lisent pas pareil, et c'est ce qui prouve la défense en profondeur : sans cookie, le proxy répond **307** avant même l'action ; avec un cookie forgé, qui passe le proxy, c'est la garde `getCurrentUser()` de l'action qui répond **401**. Seul le second prouve que l'action se protège elle-même.

## Parcours de bout en bout de l'espace admin

Le contenu public vient de l'admin : c'est ce parcours qui prouve l'epic, pas les écrans pris un par un. Il s'enchaîne avec les actions réelles, et chaque étape se vérifie en base **et** côté vitrine :

1. Créer un tag, une entreprise (deux secteurs), déposer son logo sous `freelance/crm/entreprises/<slug>/`, puis une couverture sous `projets/client/<slug-projet>/`.
2. Créer un projet `DRAFT` qui les utilise, à l'ordre pré-rempli n+1 : le créer ailleurs renumérote tous les projets de la base de dev. En base, `ClientMeta` et `ProjectTag` existent.
3. En brouillon : `/fr/projets/<slug>` répond **404** et `/api/assets/freelance/crm/entreprises/<slug>/logo.png` aussi (logo servi seulement si un projet de l'entreprise est publié).
4. Passer en `PUBLISHED` : le projet apparaît sur `/fr/projets` et `/en/projets`, sa page répond 200, la couverture et le logo sont servis, `sitemap.xml` et `llms.txt` le listent.
5. Renommer le tag et l'entreprise : `/fr/projets` et `/fr/a-propos` montrent les nouveaux noms dès la requête suivante.
6. Refus attendus : supprimer le tag (`tag_in_use`), l'entreprise (`company_in_use`), la couverture et le logo (`asset_in_use`, `usedBy` nomme le slug). Une clé citée seulement dans `caseStudyMarkdownFr` bloque aussi la suppression.
7. Repasser en `DRAFT` : le 404, la disparition des listes et du sitemap, et le 404 du logo reviennent.
8. Supprimer le projet : `ClientMeta` et `ProjectTag` partent avec, le tag et l'entreprise restent. Ensuite, tout se supprime.
9. Sans session : une action de chaque famille (tags, entreprises, projets, assets) répond 307 sans cookie et 401 avec un cookie forgé, sans rien écrire en base.

Un objet R2 se prouve par un GET sur sa route (`/api/assets/…`, ou `/admin/api/assets/…` avec le jar pour `freelance/`) : 200 présent, 404 absent. Le client `aws` exigerait les clés du `.env`.

## Piloter le flux OAuth Google

Google exige un vrai navigateur et un vrai compte : le développeur clique sur « Continuer avec Google » depuis `http://localhost:3000/admin/login`, la recette contrôle le log et la base. Compter `auth."user"`, `auth.session` et `auth.account` avant puis après chaque connexion. Le compte refusé se teste dans une fenêtre privée neuve et doit revenir sur `/admin/login?error=FORBIDDEN` sans créer de ligne.

## Se connecter sans Google

`just dev-login <jar>` crée une vraie session pour `ADMIN_EMAIL` (plugin Better Auth `testUtils`, hors de l'instance de l'app) et écrit son cookie au format curl. La garde réelle est exercée : session en base et whitelist. Prérequis : le compte admin existe, donc une connexion Google a déjà eu lieu une fois.

```bash
just dev-login "$SCRATCH/admin.jar"            # chemin Windows (C:/…) : un /c/… de Git Bash échoue côté Node
curl -s -b "$SCRATCH/admin.jar" http://localhost:3000/admin -o admin.html
grep -oE 'data-state="(expanded|collapsed)"' admin.html    # repli de la sidebar rendu côté serveur
printf 'localhost\tFALSE\t/\tFALSE\t0\tsidebar_state\tfalse\n' >> "$SCRATCH/admin.jar"   # simuler un repli persisté
curl -s -b "$SCRATCH/admin.jar" -c "$SCRATCH/admin.jar" -X POST -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" -d '{}' http://localhost:3000/api/auth/sign-out   # déconnexion, jar mis à jour
rm -f "$SCRATCH/admin.jar"                     # le jar vaut une session admin valide
```

Compter `auth.session` avant et après la déconnexion : une ligne en moins.

## Piloter l'admin dans un navigateur (MCP Playwright)

Clics, modales, glisser-déposer et rendu visuel se pilotent avec le MCP Playwright, sur la même session que `just dev-login`. Le code de `browser_run_code_unsafe` tourne dans une VM sans `require` ni `import` et le MCP recopie ce code dans sa sortie : le cookie se lit donc depuis le disque, jamais en clair dans le code.

```bash
cp "$SCRATCH/admin.jar" .playwright-mcp/admin.txt   # dossier gitignoré, seule racine lisible en file://
```

```js
async (page) => {
  await page.goto("file:///<racine du dépôt>/.playwright-mcp/admin.txt")
  const jar = await page.evaluate(() => document.body.innerText)
  const cookies = jar.split("\n").map((l) => l.replace(/^#HttpOnly_/, "")).filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t")).filter((p) => p.length >= 7)
    .map((p) => ({ name: p[5], value: p[6].trim(), url: "http://localhost:3000" }))
  await page.context().addCookies(cookies)
  await page.goto("http://localhost:3000/admin/tags")
  return cookies.map((c) => c.name)   // les noms, jamais les valeurs
}
```

Supprimer `.playwright-mcp/admin.txt` aussitôt les cookies posés : `eslint .` le lit aussi. En fin de run, `clearCookies()` côté navigateur puis la déconnexion par curl ci-dessus. Mesurer plutôt que regarder : `getBoundingClientRect` et `getComputedStyle` donnent les écarts et couleurs exacts, une capture d'élément (`locator.screenshot`) donne le rendu à comparer à la maquette. Relever les `console` de type `warning` et `error` pendant chaque scénario.

## Contrôler la fidélité à la maquette

Quand la spec a une section « Références de design », l'écran livré se compare à la maquette, pas seulement au fonctionnel : au 07, un écran qui passait tous les tests ne lui ressemblait pas.

- **Source** : l'extrait que `/implement-subproject` passe à `/verify` quand il en passe un, c'est ce que les implementers ont reçu. Sinon les exports locaux : `.design-sync/maquette/Espace admin.dc.html` pour les écrans, `.design-sync/design-system/components/` pour les fiches de composants (procédure et fraîcheur dans `.design-sync/NOTES.md`). Chaque écran s'y trouve par son identifiant (`isTags`, `dlgDeleteTag`…), les valeurs calculées (libellés, colonnes, items) dans le script en fin de fichier
- **Arbitrages d'abord** : `docs/DESIGN.md` § Arbitrages liste les écarts tranchés par le propriétaire. Un écart qui en applique un est conforme
- **Comparer écran par écran**, modales et états compris (vide, erreur de validation, suppression refusée) : disposition, ordre et largeur des colonnes, composants, libellés, boutons et leur ordre. Mesurer les largeurs et écarts au `getBoundingClientRect`, capturer chaque modale au `locator.screenshot`
- **Un écart non consigné est un échec**, rapporté avec l'écran, la ligne de la maquette et la mesure. Jamais corrigé en silence : c'est au propriétaire de trancher entre la maquette et le code

## Prouver que la garde admin tient

Un cookie forgé passe le proxy, qui ne teste que sa présence : c'est la garde serveur qui doit tout refuser, **y compris le payload RSC de la page**, pas seulement l'écran affiché.

```bash
curl -s -H "Cookie: better-auth.session_token=forged.value" http://localhost:3000/admin -o forged.html
grep -c "Accès non autorisé" forged.html   # attendu : 1
grep -c "<texte propre à la page>" forged.html   # attendu : 0, sinon le contenu fuit dans le flight
```

Le taint se prouve avec une sonde jetable, à retirer aussitôt : un Client Component vide (`"use client"`, `export function TaintProbe(_props: { user: unknown }) { return null }`) monté par la page avec `user={await getCurrentUser()}`. Le développeur recharge `/admin` connecté, le log doit porter `⨯ Error: N'expose jamais l'objet user complet…`.

## Gotchas

- Une route de test temporaire est un pilotage légitime (elle atteint une vraie surface HTTP), mais la supprimer avant de rendre la main : `rm -rf src/app/api/<route-de-test>`. `cat > fichier` ne crée pas les dossiers manquants, d'où un 404 trompeur : créer le dossier d'abord.
- `just dev` lancé en arrière-plan survit à la fin du shell qui l'a lancé, mais ses logs s'arrêtent d'être capturés si la redirection appartenait à ce shell : rediriger vers un fichier du scratchpad, pas compter sur la sortie de la commande.
- Les logs Pino locaux ne sont pas filtrés des données personnelles, seul ce qui part vers un service externe l'est. Une donnée sensible visible dans le fichier de log local est le comportement attendu.
- `/api/assets/*` lit le bucket R2 de dev (`R2_ASSETS_BUCKET` du `.env`), pas le disque : des 404 sur tous les assets signalent un bucket vide ou désynchronisé, pas un défaut de code. Le repeupler avec `aws s3 sync` depuis les fichiers source, token de dev (forme de la commande : `docs/PRODUCTION.md` § Checklist Release).
- Supprimer une route temporaire pendant que `pnpm dev` tournait laisse `.next/dev/types/validator.ts` la référencer : le `pnpm build` suivant échoue en `TS2307`. Supprimer `.next/dev/types/validator.ts` et `.next/dev/types/routes.d.ts` (régénérés) avant de builder.
- Un layout qui lève `unauthorized()` ne retient pas le payload de ses pages : Next les rend en parallèle et sérialise la page quand même. Seul le grep du cookie forgé le révèle, l'écran affiché est correct dans les deux cas. Confirmé en production : `just build` puis `pnpm start` (le dev écrit dans `.next/dev`, le build de production y survit).
- « Accès non autorisé » figure aussi dans le HTML d'une page admin **connectée** : Next sérialise l'UI de `unauthorized.tsx` dans le payload pour le client. Le compter ne prouve rien, seule l'absence du contenu propre à la page compte sous cookie forgé.
- « encountered uncached data… » sur une page d'un segment imbriqué (`/admin/tags`) alors que `/admin` est propre : il manque le `loading.tsx` du segment. Celui de `(protected)/` appartient au layout partagé, la navigation entre pages sœurs ne le traverse pas. N'apparaît qu'en dev sous session valide, le build reste vert.
- Une constante exportée par un module `"use client"` (ex. `SIDEBAR_COOKIE_NAME` de `sidebar.tsx`) arrive dans un Server Component en référence client, pas en valeur : `cookies().get(<constante>)` ne trouve rien, sans erreur ni au typage ni au build. Seul le `data-state` rendu sous cookie posé le révèle.
- Après une déconnexion par curl sans `-c`, le jar renvoie le cookie supprimé : `/admin` répond 200 (écran « Accès non autorisé ») au lieu du 307 qu'obtient un navigateur, dont le cookie est effacé.
- `?error=state_mismatch` après une connexion signifie un callback rejoué avec un `state` déjà consommé (onglet Google réutilisé, double clic), pas un défaut : repartir d'une fenêtre neuve.
- En dev, une requête au cookie forgé logue « Could not validate `instant`… `NEXT_HTTP_ERROR_FALLBACK;401` » : c'est la validation de navigation de Next qui trace l'`unauthorized()`, attendu. « encountered uncached data… outside of `<Suspense>` » sur une page admin, lui, est un vrai défaut : la page lit `headers()` hors de la frontière de `(protected)/loading.tsx`.
- Les noms des variables serveur (`GOOGLE_CLIENT_SECRET`, `SMTP_PASS`…) figurent dans un chunk de `.next/static` : c'est le schéma de t3-env, attendu. Seule la présence d'une *valeur* serait un défaut, et la chercher exige de lire `.env` : le développeur lance lui-même le grep.
- Un `FormData` encodé à la main avec le préfixe `1_` (au lieu du `_1_` qu'emploie `encodeReply`) n'échoue pas : l'action s'exécute, reçoit des champs `undefined` et renvoie des erreurs de validation en anglais (« expected string, received undefined »), qui ressemblent à un défaut du schéma. Constaté le 2026-09-17 sur Next 16.3.3.
- Pino est formaté en pretty en dev, pas en JSON, et colorisé : des codes ANSI séparent `event` de ses deux-points dans le fichier de log. Chercher `grep -c 'event.*"tag:created"'` ; `"event":"tag:created"` comme `event: "tag:created"` ne trouvent rien et font croire que l'action n'a pas logué (constaté le 2026-09-17).
- `just build` lancé pendant que `pnpm dev` tourne corrompt un JSON du cache `.next` : toutes les pages répondent 500 avec `SyntaxError: Unexpected non-whitespace character after JSON`, sans rapport avec le code. Arrêter ce serveur par le PID qu'affiche « Another next dev server is already running » (`taskkill //PID <pid> //T //F`), puis relancer `pnpm dev` (constaté le 2026-09-17, `just stop` ne l'avait pas arrêté).
- Le client Prisma logue lui-même en `prisma:error`, avec un extrait du code source appelant, les violations de contrainte que l'action intercepte pourtant proprement (`P2002` slug déjà pris, `P2003` tag rattaché). L'action a bien renvoyé son message métier. Mais un grep des noms d'événements tombe aussi sur cet extrait de code : compter les événements sur les lignes `event:`, pas sur leur seul nom.
- Le glisser-déposer des listes admin et des tags du formulaire projet est le drag natif HTML5 (`draggable="true"`) : `locator.dragTo(cible)` le déclenche, une suite de `page.mouse.move` ne fait rien.
- Après une navigation client, Next 16 garde la page précédente cachée dans le DOM : deux formulaires coexistent (`/admin/projets/nouveau` puis `[id]`) et un `getByLabel` échoue en strict mode. Cibler `form:visible`.
- Dans la modale de dépôt, choisir le fichier remplace le « Nom du fichier » déjà saisi par le nom du fichier : choisir le fichier d'abord, puis renommer.
- Git Bash réécrit en chemin Windows tout argument qui commence par `/` : `node script.mjs /admin/assets` reçoit `C:/Program Files/Git/admin/assets`. Préfixer la commande par `MSYS_NO_PATHCONV=1`.
- Les images passent par l'optimiseur : dans le HTML, leurs URLs sont encodées (`/_next/image?url=%2Fapi%2Fassets%2F...`). Un `grep "/api/assets/"` sur la page n'en voit qu'une partie, chercher aussi la forme encodée et requêter l'URL `/_next/image` elle-même.
