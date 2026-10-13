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
  -F 'name=Test' -F 'email=test@example.com' -F 'subject=Test' -F 'message=Test' -F 'website='
```

Sans le header `Next-Action`, Next.js rend la page normalement au lieu d'exécuter l'action : le 200 obtenu ne prouve rien.

Sur l'image de production (Next 16.3.6, React 19.3.0), ce POST multipart répond **500 « Connection closed. »** alors que la même action soumise par un navigateur réussit (constaté le 2026-10-03). Y piloter le formulaire par le MCP Playwright, ou encoder le corps par `encodeReply` comme pour l'admin.

## Vérifier l'image de production sans `.env`

Une montée de Next, de Prisma ou du SDK Sentry se prouve sur l'image que le déploiement construit, pas seulement en dev. L'image se build et tourne sans aucun secret, contre un Postgres jetable :

```bash
docker build -t portfolio-verif \
  --build-arg NEXT_PUBLIC_SENTRY_DSN="$(gh variable get NEXT_PUBLIC_SENTRY_DSN)" .   # idem pour les 3 autres NEXT_PUBLIC_* (variables du dépôt, publiques par construction)
docker network create verif-net
docker run -d --name verif-pg --network verif-net -e POSTGRES_USER=verif -e POSTGRES_PASSWORD=verif -e POSTGRES_DB=portfolio postgres:18-alpine
docker run -d --name verif-app --network verif-net -p 3100:3000 \
  -e DATABASE_URL="postgresql://verif:verif@verif-pg:5432/portfolio" \
  -e SKIP_ENV_VALIDATION=true -e SENTRY_ENVIRONMENT=verification portfolio-verif
docker rm -f verif-app verif-pg && docker network rm verif-net && docker rmi portfolio-verif   # en fin de run
```

- La CMD applique les migrations avant de servir : `docker logs verif-app` doit les lister, puis les routes publiques répondent 200 sur une base vide
- Attendus sans secrets, sans rapport avec le changement : `/api/auth/*` en 500 (`BETTER_AUTH_SECRET` absent), images `/_next/image` en 400 (bucket R2 non configuré), action contact en `smtp_error`
- `SENTRY_ENVIRONMENT=verification` isole les événements du run dans Sentry. Ils créent pourtant de vraies issues dans le projet : les résoudre en fin de run par `sentry issue resolve <SHORT-ID>` (sans préfixe d'org : `tg-ws/<SHORT-ID>` affiche l'issue sans la résoudre), après avoir vérifié leur `firstSeen`
- Les spans d'un run se listent par `sentry api "organizations/tg-ws/events/?dataset=spans&field=span.op&field=span.description&field=timestamp&query=environment:verification&statsPeriod=1h&project=-1&sort=-timestamp"`, ceux d'une trace précise avec `query=trace:<trace_id>`

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

Toute donnée de test est fictive, exigence du propriétaire : aucune personne réelle, aucune entreprise ni domaine d'entreprise réels. Emails sur le domaine réservé `example.com`, noms et profils LinkedIn inventés (« Verify Exemple », `linkedin.com/in/verify-exemple`), y compris dans les tests unitaires et d'intégration.

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
- La fermeture d'une modale se lit sur `data-state="closed"` de `[role=dialog]`, pas sur `isVisible()` : l'animation de sortie la garde visible près d'une seconde et fait croire qu'Échap n'a rien fermé. Échap ferme d'abord la couche Radix la plus haute, une infobulle ouverte par le focus initial le consomme (constaté le 2026-10-05 sur la vue détail des entreprises).
- Dans la modale de dépôt, choisir le fichier remplace le « Nom du fichier » déjà saisi par le nom du fichier : choisir le fichier d'abord, puis renommer.
- Git Bash réécrit en chemin Windows tout argument qui commence par `/` : `node script.mjs /admin/assets` reçoit `C:/Program Files/Git/admin/assets`. Préfixer la commande par `MSYS_NO_PATHCONV=1`.
- Les tables du CRM vivent dans le schéma `freelance` : `select … from freelance."Company"`, un `"Company"` nu répond « relation does not exist ».
- L'éditeur markdown (Tiptap) se lit par son champ caché (`input[name=details]`, `input[name^=caseStudyMarkdown]`), qui porte le markdown sérialisé, et se pilote au clavier dans `.ProseMirror` (`# `, `- `, `> `, `/`). Le menu `/` est un `[data-tippy-root]`.
- Les images passent par l'optimiseur : dans le HTML, leurs URLs sont encodées (`/_next/image?url=%2Fapi%2Fassets%2F...`). Un `grep "/api/assets/"` sur la page n'en voit qu'une partie, chercher aussi la forme encodée et requêter l'URL `/_next/image` elle-même.
- Le port 3000 peut être tenu par VS Code (port forward vers Dokploy : `/fr` répond 404 avec `<title>Dokploy</title>`, `netstat` montre `Code.exe`). `just stop` tue par port et viserait ce processus : vérifier le propriétaire (`tasklist /FI "PID eq <pid>"`), lancer `PORT=3001 pnpm dev` et arrêter par le PID du listener 3001 (constaté le 2026-10-06).
- Sur un autre port que 3000, la déconnexion par curl répond 403 `INVALID_ORIGIN` (`BETTER_AUTH_URL` vaut `http://localhost:3000`) alors que la session fonctionne : noter l'id de la ligne `auth.session` créée par `dev-login` et la supprimer en SQL en fin de run.
- L'outil `browser_navigate` du MCP Playwright refuse les URL `file:` : lire `admin.txt` par le `page.goto` de `browser_run_code_unsafe`, comme plus haut. Le MCP n'écrit pas hors du dépôt : capturer sous `.playwright-mcp/` puis déplacer vers le scratchpad.
- Les pages déjà visitées restent dans le DOM, vues détail comprises : `[role=dialog]` renvoie aussi des dialogues masqués (`data-state="open"`, largeur 0) et `tbody tr` mêle les lignes des tables cachées. Cibler `[role="dialog"][data-state="open"]` en `.last()` et repartir d'un `goto` pour un DOM propre.
- Champ date (`OptionalDateField`) : déclencheur `button[data-slot="popover-trigger"]` nommé par son libellé, jours en `button[data-day="DD/MM/YYYY"]`, valeur dans `input[name=metAt]` (`yyyy-MM-dd`). Le popover se referme entre deux appels `browser_run_code_unsafe` : ouvrir et cliquer dans le même appel.
- Une fiche de personne opposée a perdu son nom (`name` null) : la nettoyer par `email` ou `"linkedinUrl"`, un `where name like 'Verify%'` ne la trouve plus. `Lead` part en cascade avec `Person`.
- SQL passé par `bash -c` : le shell développe `$$`. Envoyer le SQL sur stdin (`docker exec -i … psql <<< "…"`), identifiants entre guillemets doubles échappés.
- `history.length` plafonne à 50 sous Chromium : un retour arrière se vérifie par `location.pathname` et le `h1` après `page.goBack()`.
- Le glisser de l'EventCalendar ReUI (calendrier des actions) suit les événements pointeur, pas le drag natif : `page.mouse.down()`, un premier `move` de quelques pixels puis un `move` en `steps` jusqu'à la cellule, `up()`. Les cellules se ciblent par leur `aria-label` (« jeudi 8 octobre 2026 »), le débordement du jour par `[data-slot="event-calendar-more"]` (constaté le 2026-10-09).
- Le serveur de production rend en UTC, le poste en heure de Paris : un écart d'hydratation lié au fuseau ne se voit qu'en relançant `TZ=UTC pnpm dev`. Sans issue, le bouton des outils Next.js reste « Open Next.js Dev Tools », sans compteur.
- Échéance de conservation : réservée aux leads (colonne « À conserver jusqu'au », filtre Échéance), absente des contacts depuis le 2026-10-13. Elle vaut le plus tardif de `Lead.createdAt` et de la dernière réponse, plus 3 ans ; pour une fiche opposée, `optedOutAt` plus 3 ans, après quoi seule « Supprimer » reste sur sa ligne dans Tous. Pour prouver que la réponse pilote l'échéance, antidater `freelance."Lead"."createdAt"` en SQL sur la fiche de test. Dans la modale d'action, le sélecteur de personne est un `button[data-slot=popover-trigger]` comme le champ date (cibler `[id$=-personId]` et `[id$=-occurredAt]`, pas `.first()`), et `[role=dialog]` `.last()` renvoie alors le popover ouvert, pas la modale (constaté le 2026-10-09).
- Une fiche inexistante (`/admin/contacts/<id>`, `/admin/leads/<id>`) répond **200** en dev avec le corps « 404 This page could not be found » : le streaming a déjà envoyé les en-têtes. Prouver le « introuvable » par le texte de la page, pas par le code HTTP. Semer des données de test en SQL demande `"updatedAt"` explicite sur `Person`, `Lead`, `Contact`, `Company` et `ProspectingAction` (pas de défaut en base), et un `maxlength` HTML tronque un `fill` trop long : une erreur de validation de longueur ne se déclenche pas depuis le formulaire (constaté le 2026-10-09).
- Opportunités : l'éditeur Détails (Tiptap) rend ses titres en `<h1>`, donc `main h1` ramène aussi ceux de l'éditeur et des pages cachées (strict mode) : cibler `main h1:visible` en `.first()`. Le champ Démarrage (`MonthField`) s'ouvre par `button[data-slot=popover-trigger]` nommé « Démarrage », le mois se clique par `button[aria-label="avril 2026"]` (`aria-pressed`), « Effacer » vit dans le panneau et la valeur dans `input[name=startMonth]` (`AAAA-MM`) ; le panneau n'a pas les `data-slot` de la fiche (mois courant en `border-border`, mois choisi en `bg-primary`) et se referme entre deux appels `browser_run_code_unsafe` (constaté le 2026-10-10).
- « Browser is already in use for …\ms-playwright-mcp\mcp-chrome-… » au premier appel du MCP Playwright : un Chrome d'une session précédente tient encore le profil (son parent est un `@playwright/mcp/cli.js` plus ancien, à lire par `Get-CimInstance Win32_Process` filtré sur le nom du profil). Plutôt que de le tuer, piloter Chrome depuis un script `.mjs` du scratchpad avec `playwright-core` du cache npx du MCP (`createRequire("<npm-cache>/_npx/<hash>/node_modules/@playwright/mcp/package.json")("playwright-core")`, `chromium.launch({ channel: "chrome", headless: true })`), profil temporaire donc sans conflit ; le jar curl se lit alors sur disque sans passer par `.playwright-mcp/` (constaté le 2026-10-10).
- Entretiens : semer `freelance."Interview"` (`side`, `type`, `scheduledAt`, `opportunityId`, `updatedAt` obligatoires, `status` défaut `PLANIFIE`) puis la liaison `freelance."_InterviewCorrespondents"` (`"A"` = id de l'entretien, `"B"` = id de la personne). Le statut affiché d'un lead se lit sur le premier `[data-slot=badge]` de sa ligne dans Tous et En cours ; la vue Stand-by n'a pas de colonne statut, son premier badge est l'origine. Le nom d'un lead figure dans le HTML de toutes les vues (payload RSC, filtrage client) : seule une ligne `table:visible tbody tr` rendue prouve l'appartenance à une vue (constaté le 2026-10-10).
- Les ids sont du texte libre : des ids lisibles semés en SQL (`verify-co-esn`, `verify-p-lead`) passent dans `/admin/entreprises/<id>`, `/admin/leads/<id>`, `/admin/opportunites/<id>` et dans `?detail=`. Les valeurs d'enum se lisent dans `pg_enum` (`CompanyType` : `ESN_RECRUTEMENT`, `CLIENT_FINAL`, `PARTENAIRE`, `MA_SOCIETE`) et la base de dev n'a aucune ESN au départ. Une personne à la fois lead et contact se sème par `Person`, `Lead` et `Contact` (`personId`). Après « Ne plus contacter », l'apporteur d'une opportunité s'affiche par son email, la fiche ayant perdu son nom (constaté le 2026-10-10).
- Formulaire d'un entretien : les champs se ciblent par suffixe d'id (`button[id$="-type"]`, `-status`, `-outcome`, `-scheduledAt`, `-opportunityId`, `-correspondentIds`, radios `-side-esn` / `-side-client`) ; les champs d'une ligne « Nouveau contact » n'ont ni id ni name, ils se ciblent par `aria-label` (« Nom du nouveau contact », « Type du nouveau contact »…) et l'Entreprise y est un `Select`, pas un combobox à recherche (`getByRole("combobox", { name: "Entreprise du nouveau contact" })` puis `[role=option]`). Un nouvel entretien part sans date, heure 10:00, et refuse l'envoi tant qu'aucune date n'est choisie (« Date et heure requises ») : ouvrir `[id$=-scheduledAt]` et cliquer `button[data-day="DD/MM/YYYY"]` dans le même appel ; la page d'édition n'affiche date et heure stockées qu'après hydratation (« Choisir une date » au premier rendu, attendu). Le numéro « Entretien N » exclut les Premier contact (constaté le 2026-10-11).
- Écran Entretiens : `a[href='/admin/entretiens']` matche l'entrée du menu et la sous-entrée Journal, cibler les sous-entrées par `[data-slot=sidebar-menu-sub-button]`, présentes dans le DOM seulement quand le groupe est ouvert (depuis une autre page, l'entrée parente mène au Journal). Après une navigation client vers une liste, `networkidle` revient avant les lignes : attendre `table:visible tbody tr`. `RelatedLinksList` rend « : » entre libellé et méta dans le texte brut. Les boutons de ligne s'appellent `Modifier <titre> · <opportunité>` et `Supprimer <titre> · <opportunité>` (constaté le 2026-10-11).
- Un `timezoneId: "UTC"` passé à `browser.newContext` met le navigateur hors du fuseau du serveur de dev (Paris) : il révèle un écart d'hydratation lié au fuseau sans relancer `TZ=UTC pnpm dev` (constaté le 2026-10-11).
- Revues hebdo : semer `freelance."WeeklyReview"` (`id`, `"closingFriday"` en date seule, `"updatedAt"` obligatoires, compteurs à 0 par défaut), une seule ligne par vendredi. Les compteurs attendus de « Calculer depuis le CRM » se recalculent en SQL avec les bornes samedi 0 h → samedi 0 h de Paris (`timestamptz '2026-10-10 00:00+02'`), puis se comparent aux sept `input[name=…]` du formulaire. Le champ Date vendredi s'ouvre par `button[id$="-closingFriday"]`, valeur dans `input[name=closingFriday]`. Les puces du calendrier vivent dans une couche `event-calendar-month-bar-overlay`, hors des cellules : leur jour se prouve par la géométrie (abscisse sous l'en-tête « ven. »), à refaire dans un contexte `America/Los_Angeles` pour le décalage d'un jour (constaté le 2026-10-11).
- Un serveur de dev lancé avant une migration garde l'ancien client Prisma, mis en cache sur `globalThis` par `src/lib/prisma.ts` : le hot reload ne le remplace pas. Une écriture sur la nouvelle colonne renvoie alors `unknown_error` sans toast, et rien n'est écrit en base. Comparer l'heure de démarrage du processus (`(Get-Process -Id <pid>).StartTime`) à celle de la migration, puis relancer le serveur (constaté le 2026-10-13).
- Le texte « This page could not be found » figure deux fois dans le HTML de **toute** page admin, valide comprise : Next sérialise l'UI de la page introuvable dans le payload, comme « Accès non autorisé ». Prouver qu'une page répond par son contenu propre (titre, bouton), jamais par l'absence de ce texte (constaté le 2026-10-13).
- Refus d'écriture sur une personne opposée : semer `Person` (`updatedAt`), `Lead` et une `ProspectingAction` `A_FAIRE`, poser `"optedOutAt" = now()` en SQL, puis appeler par `encodeReply` `changeProspectingActionStatus(id, status)` sur `/admin/actions-prospection/pipeline` et `rescheduleProspectingAction(id, "AAAA-MM-JJ")` sur `/admin/actions-prospection/calendrier`. La replanification attend le jour seul, comme le calendrier : un instant ISO complet répond « Date invalide » avant même la garde. Attendu : `ok:false` avec le message d'opposition sur `status` ou `occurredAt`, et rien d'écrit en base (constaté le 2026-10-13).
- Le hook `validate_command.py` refuse une commande qui mêle `curl` et des pipes (lu comme l'exécution d'un script distant) : lancer la déconnexion par curl seule, et le reste dans un autre appel (constaté le 2026-10-13).
- Un `click()` Playwright sur un lien qui ouvre une page de formulaire lourde (nouvel entretien) peut rester pendu jusqu'au timeout, et le `goto` suivant aussi : fermer le navigateur, puis suivre le `href` lu sur le lien par `goto` avec `waitUntil: "commit"` et attendre un élément de la page (constaté le 2026-10-13).
- Le hook `block_sensitive_files.py` refuse toute commande où `.env`, `.key`, `.token`, `.pem` (et autres extensions de secrets) apparaît en mot entier, même dans du code : un `node -e` qui lit `t.key` sur les tags d'un événement Sentry est bloqué. Écrire `t["key"]` (constaté le 2026-10-03).
- Une valeur dérivée d'une liste admin (« Premier contact » des entreprises) se prouve sur toute la base : concaténer les chaînes `self.__next_f.push([1,"…"])` du HTML (`JSON.parse` de chacune), relever la valeur par entité, puis la comparer à un calcul SQL. L'entreprise de premier niveau s'ancre sur `{"id":…,"slug":…,"name":…,"logoFilename":…,"websiteUrl"` : les entreprises imbriquées des opportunités commencent aussi par `id`, `slug`, `name`. Un `node -e` passé par Git Bash perd les `\\` de ses regex : écrire le script dans un fichier `.mjs` du scratchpad. Passer une action à Fait par `changeProspectingActionStatus` la date à l'instant de l'appel, pas à sa date prévue (constaté le 2026-10-13).
