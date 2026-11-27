---
name: verify
description: Recette de /verify pour le portfolio. Pilote l'application Next.js lancée, site public et espace admin, dans un navigateur et par requêtes HTTP. À lancer avant chaque commit qui touche du code exécutable.
argument-hint: [complet]
allowed-tools: Bash(just dev), Bash(curl -s http://localhost:3000/*), mcp__plugin_playwright_playwright__*
---

# verify - Recette du portfolio

## Principes

Repris du `/verify` intégré de Claude Code 2.1.318, relevé le 2026-11-24.

- Vérifier, c'est observer l'app lancée : la lancer, l'amener là où le code modifié s'exécute, capturer ce qu'elle rend. Ni tests, ni typecheck, ni import d'un module interne suivi d'un appel
- Périmètre : le diff complet, commits de la branche et working tree (`git diff @{u}..`, `git diff origin/HEAD...`, `git diff HEAD`), ou ce que l'appelant nomme. Dire le nombre de commits. Sans diff ni périmètre nommé, le dire et s'arrêter
- Le diff fait foi, toute description est une affirmation à son sujet : un écart entre les deux est un constat
- La surface est l'endroit où l'utilisateur, humain ou programme, rencontre le changement. Une fonction interne n'en est pas une : suivre son appelant jusqu'à l'écran, la route ou l'outil qui l'atteint
- Sans surface exécutable (doc, types, configuration sans effet, tests seuls) : SKIP en une ligne. Diff mixte : vérifier le code, ignorer les tests. Lire un test pour savoir quoi contrôler reste permis
- Jouer le plus petit chemin qui exécute le code modifié, de bout en bout par l'interface réelle : si l'utilisateur clique, cliquer, pas appeler l'action sous l'écran
- Relire son plan avant de lancer : s'il ne contient que build, typecheck et tests, il ne vérifie rien. Trouver une étape qui atteint la surface ou rendre BLOCKED
- Le changement confirmé, sonder autour à la même surface : champ vide, valeur trop longue, action faite deux fois, état périmé dans un second onglet, Échap au mauvais moment, erreurs voisines de celle du diff
- Capturer ce que l'app renvoie, la mémoire n'est pas une preuve. Un comportement inattendu se capture puis s'attribue au changement ou à l'environnement, il ne se contourne pas. Une casse sans rapport est un constat
- Isoler l'état partagé avec le poste : ports, fichiers temporaires, sessions
- Chemin qui supprime, publie, envoie ou écrit hors du dépôt, sans dry-run ni cible sûre : ne pas le jouer, vérifier autour, dire ce qui n'a pas été joué

## Modes

| Mode | Quand | Ce qui se joue |
|------|-------|----------------|
| Diff (défaut) | avant chaque commit de code | les flux dont la zone croise le diff, pilotés en direct, puis des sondes autour du changement |
| Complet (argument `complet`) | fin de feature, avant une mise en production | `just verify-all`, puis en direct les flux de la feature qu'aucun scénario ne couvre |

Les scénarios de `verify-all` pilotent l'app lancée de l'extérieur : tous par `just verify-all`, un seul par `just verify <parcours>` (nom de la dernière colonne de `Flux par zone`). Ce ne sont pas les tests du dépôt, que cette recette ne lance jamais.

## Lancer

```bash
just db                                                # Postgres et migrations de portfolio_dev
just dev > <dossier temporaire>/verify-dev.log 2>&1    # en background
```

- **Prérequis** : `.env` complet et jamais lu, conteneur Postgres `healthy` (`docker ps`). Pour l'espace admin, le compte admin s'est déjà connecté une fois par Google. Pour les scénarios, Chrome installé sur le poste. Données de la base de dev que les scénarios lisent sans les créer : `visiteur-projets` un projet client et un projet personnel publiés, `referencement` et `agents-portfolio` un projet publié, `visiteur-cv` le CV dans le bucket de dev
- **Prêt quand** : `http://localhost:3000/fr` répond 200. La première page compile à la demande, compter une minute. Lire le début du log avant d'attendre : le serveur y annonce son port
- **Arrêt** : `just stop`
- **Isolation** : navigateur vierge, log dans un dossier temporaire, entités de test sous un préfixe propre au passage

## Piloter

Deux domaines dans la même application : le site public sous `/fr` et `/en`, l'espace admin sous `/admin`. S'y ajoutent les routes d'API et le serveur MCP. Tout ce qu'un utilisateur fait en cliquant se pilote dans un navigateur par le MCP Playwright.

### Site public

1. Ouvrir `http://localhost:3000/fr/<route>`
2. Agir sur l'écran que le diff touche
3. Capturer l'écran, relever les erreurs de console

```bash
curl -s http://localhost:3000/fr/contact -D - -o /dev/null    # en-têtes de sécurité et CSP
curl -s http://localhost:3000/sitemap.xml
curl -s http://localhost:3000/llms.txt
curl -s http://localhost:3000/api/assets/<clé> -o /dev/null -w "%{http_code}\n"
```

### Espace admin

```bash
just dev-login <dossier temporaire>/admin.jar
cp <dossier temporaire>/admin.jar .playwright-mcp/admin.txt
```

`just dev-login` crée une vraie session pour le compte admin, sans passer par Google. Le MCP ne lit en `file:` que le dossier `.playwright-mcp/` de la racine de la session. Il recopie dans sa sortie le code qu'on lui passe : le cookie se lit donc depuis le disque, jamais en clair dans le code.

```js
async (page) => {
  await page.goto("file:///<racine de la session>/.playwright-mcp/admin.txt")
  const jar = await page.evaluate(() => document.body.innerText)
  const cookies = jar.split("\n").map((l) => l.replace(/^#HttpOnly_/, "")).filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("\t")).filter((p) => p.length >= 7)
    .map((p) => ({ name: p[5], value: p[6].trim(), url: "http://localhost:3000" }))
  await page.context().addCookies(cookies)
  await page.goto("http://localhost:3000/admin/<écran>")
  return cookies.map((c) => c.name)   // les noms, jamais les valeurs
}
```

- Supprimer `.playwright-mcp/admin.txt` dès les cookies posés
- En fin de passage : `clearCookies()` dans le navigateur, déconnexion, puis suppression du jar, qui vaut une session admin

```bash
curl -s http://localhost:3000/api/auth/sign-out -X POST -b <jar> -c <jar> \
  -H "Origin: http://localhost:3000" -H "Content-Type: application/json" -d '{}'
```

- **Sans session** : `curl -s http://localhost:3000/admin -o /dev/null -D -` répond 307 vers `/admin/login`
- **Garde admin** : `curl -s http://localhost:3000/admin/<écran> -H "Cookie: better-auth.session_token=forged.value" -o <dossier temporaire>/forged.html`. Le proxy laisse passer ce cookie forgé, la garde serveur doit tout refuser : aucun texte propre à l'écran ne doit figurer dans la réponse
- **Listes** : 25 lignes par page, filtrer par le champ de recherche avant de lire les lignes. `?detail=<id>` ouvre la vue détail sans clic

Une action doit aussi se protéger elle-même : sans cookie le proxy répond 307 avant l'action, avec un cookie forgé c'est l'action qui répond 401. Seul un POST direct le prouve, depuis un script `.mjs` d'un dossier temporaire. L'id de l'action se lit dans le `server-reference-manifest.json` de la page, sous `.next/dev/server/app/admin/(protected)`, une fois la page servie. Le corps se construit avec le `encodeReply` que Next embarque, jamais à la main : un champ mal préfixé arrive `undefined` et renvoie de fausses erreurs de validation.

```js
const req = require("module").createRequire("<racine du dépôt>/package.json")
const { encodeReply } = req("next/dist/compiled/react-server-dom-turbopack/client.edge.js")
const fd = new FormData()
fd.append("slug", "<préfixe du passage>-a")
const body = await encodeReply([{ ok: null, errors: {}, message: null }, fd])   // (prevState, formData)
// action liée par bind(null, id) : encodeReply([id, prevState, fd]) ; action à arguments simples : encodeReply([id])
await fetch("http://localhost:3000/admin/<écran>", { method: "POST", body, redirect: "manual",
  headers: { "Next-Action": "<id>", Accept: "text/x-component", Origin: "http://localhost:3000", Cookie: "<cookie forgé ou absent>" } })
```

### Base et logs

```bash
docker exec -i thibaud-geisler-portfolio-postgres-1 psql -U portfolio -d portfolio_dev -A <<< '<SQL>'
grep -c 'event.*"<événement>"' <dossier temporaire>/verify-dev.log
```

- Les tables du CRM vivent dans le schéma `freelance`, l'authentification dans `auth`, le reste dans `public`
- Semer une fiche en SQL demande un `id` et un `"updatedAt"` explicites. Les ids sont du texte libre : un id lisible sous préfixe passe dans `/admin/<écran>/<id>` et dans `?detail=`
- Erreurs remontées à Sentry : `sentry issue list <org>/<projet> --limit 5 --fresh`, l'ingestion prend 15 à 60 s. Détail dans `docs/knowledges/sentry.md`

### Serveur MCP

```bash
curl -s http://localhost:3000/api/mcp/<domaine> -X POST -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"verify","version":"0"}}}'
```

- Domaines : `crm` et `portfolio`. Sans clé, la requête répond 401
- **Clé jetable** : un script `.mjs` d'un dossier temporaire importe `defaultKeyHasher` de `node_modules/@better-auth/api-key/dist/index.mjs`, hache un secret `tgp_…` et écrit un `insert into auth.apikey` envoyé à `psql` sur stdin : id fixe, `"referenceId"` = id d'une ligne de `auth."user"`, `permissions` `'{"crm":["read","write"]}'` (ajouter `"portfolio"` pour ce domaine), `"rateLimitTimeWindow"` 3600000, `"rateLimitMax"` 1000, dates explicites. Supprimer la ligne en fin de passage
- **Outils** : le même script importe le client par `pathToFileURL("<racine du dépôt>/node_modules/@modelcontextprotocol/client/dist/index.mjs")` et ouvre un `StreamableHTTPClientTransport` sur `/api/mcp/<domaine>` avec l'en-tête `Authorization: Bearer <clé lue d'un fichier>`
- Le secret reste dans un fichier, jamais dans une commande : `curl -H @<fichier>` pour une requête directe

### Image de production

Une montée de Next, de Prisma ou du SDK Sentry se prouve sur l'image que le déploiement construit. Elle se build et tourne sans aucun secret, contre un Postgres jetable :

```bash
docker build -t portfolio-verif --build-arg NEXT_PUBLIC_SENTRY_DSN="$(gh variable get NEXT_PUBLIC_SENTRY_DSN)" .   # idem pour les autres NEXT_PUBLIC_*
docker network create verif-net
docker run -d --name verif-pg --network verif-net -e POSTGRES_USER=verif -e POSTGRES_PASSWORD=verif -e POSTGRES_DB=portfolio postgres:18-alpine
docker run -d --name verif-app --network verif-net -p 3100:3000 \
  -e DATABASE_URL="postgresql://verif:verif@verif-pg:5432/portfolio" \
  -e SKIP_ENV_VALIDATION=true -e SENTRY_ENVIRONMENT=verification portfolio-verif
docker rm -f verif-app verif-pg && docker network rm verif-net && docker rmi portfolio-verif   # en fin de passage
```

- `docker logs verif-app` liste les migrations appliquées, puis les routes publiques répondent 200 sur une base vide
- Attendus sans secrets, sans rapport avec le changement : `/api/auth/*` en 500, images `/_next/image` en 400, action de contact en `smtp_error`

### Ce qui se capture

- **Écrans** : 1280 et 390 px de large, français et anglais, thème clair et sombre, états de l'écran touché (vide, erreur de validation, suppression refusée), modales comprises
- **Evidence** : une capture par écran, les erreurs de console de `localhost:3000`, les lignes d'événement du log, l'état en base
- **Diff visuel** : mesurer plutôt que regarder (`getBoundingClientRect`, `getComputedStyle`, capture d'un élément) et comparer à l'extrait de design que l'appelant fournit, sinon aux règles de `docs/DESIGN.md`. Un écart à la maquette qui applique une règle de `docs/DESIGN.md` est conforme. Tout autre écart est un constat, jamais corrigé en silence

## Effets et limites

- Le formulaire de contact envoie un vrai e-mail : ne le soumettre que si le diff le touche, une seule fois. En mode complet sans ce diff, l'ouvrir sans l'envoyer et le dire dans le rapport
- Une erreur provoquée part au Sentry réel, image de production comprise (`SENTRY_ENVIRONMENT=verification` isole ses événements). Résoudre les issues créées en fin de passage par `sentry issue resolve <SHORT-ID>`, après avoir vérifié leur `firstSeen`
- Un dépôt d'asset écrit dans le bucket R2 de dev : le supprimer par l'écran Assets avant de rendre la main
- La récupération du logo d'une entreprise appelle le site saisi et écrit le logo dans le bucket R2 de dev : n'y mettre qu'une page de test, puis remettre `"logoFilename"` à null en SQL avant de supprimer l'asset, refusé sinon comme encore utilisé
- Créer, enregistrer ou supprimer un projet ou un tag fait renuméroter toute sa liste par l'app : le rang et la date de modification des vrais projets, et des vrais tags de la même catégorie, sont réécrits à chaque fois. Créer au rang proposé par le formulaire garde les rangs identiques, un autre rang ou un glisser les décale. `publication` et `agents-portfolio` passent par là
- `just verify-all` prend plusieurs minutes et écrit dans la base de dev : `publication`, `prospection`, `calendrier`, `opportunites-entretiens`, `opportunite-acceptee`, `signaux`, `contacts`, `opposition`, `revue-hebdo`, `agents-crm` et `agents-portfolio` créent leurs entités sous un préfixe `verify-<hex>` et les retirent en fin de passage, même après un échec. Tous les scénarios admin ouvrent une vraie session par `just dev-login` et la ferment en fin de passage. `agents-crm` et `agents-portfolio` créent de vraies clés d'API par l'écran Clés d'API et les suppriment en fin de passage. Les `visiteur-*` et `referencement` ne font que lire, comme `admin-mobile`. Jamais deux passages à la fois
- La base de dev porte les données réelles du propriétaire. Toute entité de test est fictive (domaine `example.com`), préfixée par passage et supprimée dans l'ordre des contraintes : projet, puis entreprise et tags, puis assets. Une entité existante modifiée pour un test se restaure et se compare champ par champ. Jamais `just db-reset`
- `just db` applique les migrations en attente, migrations de données comprises
- La connexion par Google demande un vrai compte et un vrai navigateur : geste du propriétaire, la recette en contrôle le log et les tables `auth`
- `just stop` tue ce qui écoute sur le port 3000, quel qu'en soit le propriétaire
- L'onglet de réservation du formulaire de contact charge Calendly et ses cookies tiers une fois activé
- Chercher la valeur d'un secret dans le build exigerait de lire `.env` : geste du propriétaire

## Flux par zone

Zones sous `src/`, sauf mention.

| Zone du diff | Flux à piloter | Scénario `verify-all` |
|--------------|----------------|-----------------------|
| `app/[locale]/`, `components/`, `i18n/`, `messages/` (racine) | Site : ouvrir la page touchée en `/fr` et en `/en`, à 1280 et 390 px, changer de langue et de thème depuis l'en-tête | `visiteur-projets`, `visiteur-pages`, `visiteur-preferences`, `visiteur-mobile` |
| `components/cookies/` | Site, navigateur vierge : refuser les cookies, recharger : choix enregistré, bandeau absent | `visiteur-consentement` |
| Page et action de contact (`server/actions/contact.ts`, `lib/mailer.ts`) | Site : soumettre le formulaire par le navigateur : message de succès, événement dans le log | aucun |
| `app/admin/(protected)/<écran>/`, `server/actions/`, `server/queries/` | Admin : sur l'écran touché, créer, modifier puis supprimer une entité de test. Un refus attendu (entité encore utilisée) s'affiche sans rien écrire | celui de l'écran |
| `server/portfolio/`, écrans `projets`, `tags`, `entreprises` | Admin puis site : créer un tag, une entreprise et un projet en brouillon (page publique introuvable), publier (listes, page, `sitemap.xml`, `llms.txt`), renommer (visible à la requête suivante), dépublier, supprimer | `publication` |
| `server/crm/`, écrans `entreprises`, `leads`, `actions-prospection` (journal, pipeline) | Admin : créer entreprise, lead et action, la glisser dans Fait, y répondre, relire les fiches et l'état en base | `prospection` |
| `actions-prospection/calendrier`, `lib/crm/action-calendar.ts` | Admin : une relance à faire est posée à son jour, glissée sur un autre jour, conservée au rechargement | `calendrier` |
| écrans `opportunites`, `entretiens` | Admin : créer une opportunité puis un entretien avec un lead : le lead passe en RDV planifié. Passer l'opportunité d'un lead à Acceptée : elle rejoint Acceptées, le lead affiche « Deal » hors de En cours, son client entre dans Travaillées | `opportunites-entretiens`, `opportunite-acceptee` |
| `components/features/admin/signals/`, `server/actions/signals.ts`, `lib/crm/signals.ts` | Admin : « Nouveau signal » sur la page d'une entreprise, badge « Récent » dans la card et la vue détail, filtre « Récent » de la liste Entreprises | `signaux` |
| écran `contacts` | Admin : créer un contact, promouvoir un lead en contact : une personne, deux fiches liées | `contacts` |
| `persons/OptOutPersonDialog`, `server/crm/person-guards.ts` | Admin : « Ne plus contacter » sur un lead : nom effacé, relance disparue du journal, sorti des contacts | `opposition` |
| écran `revues-hebdo`, `lib/crm/review-counters.ts` | Admin : les compteurs suivent le travail de la semaine, la revue s'enregistre sur un vendredi libre | `revue-hebdo` |
| `proxy.ts`, `lib/auth.ts`, `lib/get-current-user.ts`, `lib/admin-whitelist.ts`, `app/admin/layout.tsx`, `app/admin/login/`, `app/api/auth/` | sans session : 307. Cookie forgé : « Accès non autorisé », aucun contenu de l'écran. `just dev-login` puis déconnexion : une ligne `auth.session` en moins | `admin-acces` |
| `proxy.ts`, `i18n/routing.ts` | Site, navigateur vierge : `/` redirige en 307 vers `/en` avec une langue anglaise, vers `/fr` avec une langue non gérée, `/fr` reste `/fr` | `visiteur-langue` |
| `components/layout/admin/`, `components/ui/sidebar.tsx`, `config/admin-nav-items.ts` | Admin à 390 px : sidebar masquée, tiroir ouvert par le header, entrée du tiroir menant à son écran, aucun débordement horizontal | `admin-mobile` |
| `app/api/assets/`, `server/assets/`, `lib/r2.ts` | Site : le lien du CV de l'accueil télécharge un PDF non vide | `visiteur-cv` |
| `app/api/assets/`, `server/assets/`, `lib/r2.ts`, écran `assets` | `GET /api/assets/<clé>` : 200 pour l'asset d'un projet publié, 404 sinon. Dossiers privés par `/admin/api/assets/<clé>` avec le jar. Admin : l'écran Assets liste les fichiers | aucun |
| `app/api/mcp/`, `server/mcp/`, `lib/mcp-domains.ts`, écran `cles-api` | MCP : `initialize` sans clé : 401. Avec une clé créée par l'écran, appeler l'outil touché puis relire la fiche par l'écran admin | `agents-crm`, `agents-portfolio` |
| `app/sitemap.ts`, `app/robots.ts`, `app/llms.txt/`, `lib/seo.ts` | `sitemap.xml`, `robots.txt` et `llms.txt` ne listent que les pages et projets publiés | `referencement`, `publication` |
| `env.ts`, `instrumentation.ts`, `instrumentation-client.ts`, racine : `next.config.ts`, `sentry.*.config.ts` | démarrage sans erreur dans le log, en-têtes de `/fr/contact`, une page de chaque domaine | aucun |
| Racine : `package.json`, `pnpm-lock.yaml`, `Dockerfile`, `compose.yaml` | image de production : build, migrations listées, routes publiques en 200 | tous |
| Racine : `prisma/` | `just db`, relancer le serveur, rejouer l'écran qui lit la table touchée. Migration de données : la jouer d'abord sur une base temporaire, jamais par `just db-restore` qui vise `portfolio_dev`. Créer `portfolio_replay`, y appliquer par `psql` sur stdin le `migration.sql` de chaque migration antérieure, restaurer un dump par `pg_restore --data-only --disable-triggers --no-owner`, compter, appliquer les nouvelles migrations une à une, recompter, puis `drop database` |

## Pièges

Environnement et serveur :

- `/fr` répond 404 avec un titre étranger au site : le port 3000 est tenu par un autre programme. Vérifier son propriétaire (`netstat -ano`, `tasklist //FI "PID eq <pid>"`), lancer `PORT=3001 just dev` et arrêter par le PID du listener 3001. Les scénarios de `verify-all` visent `localhost:3000` en dur : sur 3001 ils ne se jouent pas, libérer 3000 d'abord
- La boucle d'attente sur 3000 ne voit jamais de 200 : le port était pris un instant et `pnpm dev` a basculé seul sur 3001. Le log le dit dès sa première ligne
- Sur un autre port que 3000, la déconnexion par `curl` répond 403 `INVALID_ORIGIN` : supprimer en SQL la ligne `auth.session` créée par `dev-login`
- Toutes les pages répondent 500 avec `SyntaxError: Unexpected non-whitespace character after JSON` : `just build` a tourné pendant `just dev` et corrompu le cache `.next`. Arrêter le serveur par son PID, puis relancer
- Une écriture sur une colonne neuve renvoie `unknown_error` sans rien écrire : le serveur, lancé avant la migration, garde l'ancien client Prisma. Le relancer
- `just build` échoue en `TS2307` après la suppression d'une route temporaire pendant que le serveur tournait : supprimer `.next/dev/types/validator.ts` et `.next/dev/types/routes.d.ts`, qui se régénèrent
- Tous les assets répondent 404 : le bucket R2 de dev est vide ou désynchronisé, ce n'est pas un défaut de code
- Un argument qui commence par `/` arrive transformé en chemin Windows sous Git Bash : préfixer la commande par `MSYS_NO_PATHCONV=1`. Un chemin passé à `just dev-login` s'écrit en `C:/…`
- Le shell développe `$$` dans un SQL passé en argument : l'envoyer sur stdin

Lire ce que l'app renvoie :

- Une fiche inexistante répond 200 en dev, le streaming a déjà envoyé les en-têtes : prouver « introuvable » par le texte rendu dans le navigateur
- « Accès non autorisé » et « This page could not be found » figurent dans le HTML de toute page admin, valide et connectée comprise : Next sérialise ces écrans dans le payload. Prouver une page par son contenu propre, jamais par la présence ou l'absence de ces textes
- Un événement du log reste introuvable : Pino est en pretty et colorisé en dev, des codes ANSI séparent `event` de sa valeur. Chercher `event.*"<nom>"`
- Un nom d'événement apparaît sur une ligne `prisma:error` : Prisma logue l'extrait du code appelant sur une violation de contrainte que l'action intercepte pourtant. Compter les lignes `event:`
- Le log porte « Could not validate `instant` … 401 » sous cookie forgé : attendu. « encountered uncached data … outside of `<Suspense>` » sur une page admin est un vrai défaut
- `?error=state_mismatch` après une connexion Google : callback rejoué, repartir d'une fenêtre neuve
- Après une déconnexion par `curl` sans `-c`, le jar renvoie le cookie supprimé et `/admin` répond 200 au lieu de 307
- Les URLs d'image sont encodées dans le HTML (`/_next/image?url=%2Fapi%2Fassets%2F…`) : chercher aussi cette forme
- La première requête après une invalidation par un outil MCP sert encore l'ancienne valeur, la suivante la nouvelle. Une action admin est lisible dès la requête suivante
- Un `total` ne prouve rien sur la base de dev, déjà peuplée : contrôler la présence de l'id semé dans les lignes rendues

Piloter le navigateur :

- `browser_navigate` refuse une URL `file:` : lire le jar par le `page.goto` de `browser_run_code_unsafe`. Une capture n'est acceptée que sous `.playwright-mcp/`
- « Browser is already in use » au premier appel : un Chrome d'une session précédente tient le profil du MCP. Fermer cette session, ou piloter depuis un script `.mjs` d'un dossier temporaire, sur un profil temporaire : `createRequire("<cache npx>/_npx/<hash>/node_modules/@playwright/mcp/package.json")("playwright-core")` puis `chromium.launch({ channel: "chrome", headless: true })`. Si la révision du navigateur manque, passer `executablePath` vers le `chrome-headless-shell` déjà installé
- Les pages déjà visitées restent cachées dans le DOM : cibler `form:visible`, `table:visible tbody tr`, `article:visible`, `[role="dialog"][data-state="open"]` en dernier. Repartir d'un `goto` donne un DOM propre
- Une erreur d'hydratation `data-aria-hidden` sort quand un clic part dès que la table existe ou que le menu mobile du site s'ouvre : attendre 1,5 s après le chargement
- Une modale semble rester ouverte : lire `data-state="closed"`, l'animation de sortie la garde visible près d'une seconde. Échap ferme d'abord la couche la plus haute, une infobulle comprise
- Un popover se referme entre deux appels du MCP : l'ouvrir et y cliquer dans le même appel
- Un glisser ne fait rien : les listes admin suivent le drag natif HTML5 (`locator.dragTo`), le calendrier et le kanban les événements pointeur (`mouse.down`, un petit `move`, un `move` en `steps`, `up`)
- Un clic sur un lien vers un formulaire lourd reste pendu : suivre son `href` par `goto` avec `waitUntil: "commit"`, puis attendre un élément de la page
- Un écart d'hydratation lié au fuseau ne se voit pas en heure de Paris : ouvrir un contexte en `timezoneId: "UTC"`, le fuseau du serveur de production
- L'éditeur de texte riche se lit par son champ caché et se pilote au clavier. Sur un contenu existant, vider par `Control+A` puis `Delete`. Après l'enregistrement, recharger par un `goto` neuf
- Sur la page de contact, le widget Calendly vit dans son onglet et empêche `networkidle` une fois monté : attendre `load`. Seules les erreurs de console de `localhost:3000` comptent, les domaines tiers en émettent toujours
- Un avertissement `[c15t] Local mode…` sort en console sur chaque page : attendu

## Rapport

```
## Vérification : <ce qui a changé, en une ligne>

**Verdict :** PASS | FAIL | BLOCKED | SKIP

**Attendu :** <ce que le changement doit faire d'après le diff et ce qui est annoncé, leur écart s'il y en a un>

**Méthode :** <mode, ce qui a été lancé>

### Étapes

1. ✅/❌/⚠️/🔍 <action sur l'app lancée> → <ce qu'elle a rendu>
   <evidence : capture, réponse HTTP, ligne de log, état en base>

**Capture :** <l'image ou l'extrait qui montre le changement>

### Constats

<ce qui a fait hésiter pendant le pilotage>
```

- Une étape est une action sur l'app lancée : build, installation, tests et typecheck n'en sont pas
- 🔍 marque une sonde hors du chemin nominal. Au moins une : un rapport sans sonde ne rejoue que le cas nominal, encore PASS mais à moitié fait
- Constats : frictions, surprises, casse sans rapport avec le changement, notes d'environnement, une ligne par sonde même quand elle tient. ⚠️ en tête pour ce qui mérite d'interrompre le lecteur. Rien de ce qui se lit déjà sur la PR

- **PASS** : l'app a tourné et le changement fait ce qu'il doit à sa surface. Tests verts, build propre ou code qui semble juste ne suffisent pas
- **FAIL** : il ne le fait pas, il casse autre chose, ou l'annonce et le diff divergent sur le fond. Dans le doute, FAIL avec la capture brute
- **BLOCKED** : impossible d'atteindre un état où le changement s'observe (build cassé, base absente, session admin impossible). Dire où ça s'arrête, sans jugement sur le changement
- **SKIP** : aucune surface exécutable, en une ligne
- Pas de succès partiel : 3 sur 4 est un FAIL tant que le quatrième n'est pas passé ou expliqué
- L'evidence voyage dans le rapport : réponses et lignes de log en ligne, chemin d'une capture seulement si le lecteur partage le disque

## Tenir la recette

- Modifier ce fichier seulement s'il a induit en erreur : commande fausse, étape manquante
- Un parcours métier livré prend une ligne dans `Flux par zone`
- Ni liste d'assertions, ni récit daté, ni scénario qui redit un test
