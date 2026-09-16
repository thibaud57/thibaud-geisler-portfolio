---
name: verify
description: Recette de build-and-drive du portfolio pour la vérification runtime (lancement de l'app, pilotage des surfaces, capture des preuves).
---

# Verify — recette runtime du portfolio

## Prérequis

Postgres doit tourner, sinon les pages qui lisent la base répondent 500 sans que ce soit lié au changement :

```bash
docker ps --format "{{.Names}}: {{.Status}}" | grep postgres   # attendu : healthy
just db-test                                                    # démarre Postgres + migrations si absent
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

Compter `auth.session` avant et après la déconnexion : une ligne en moins. Restent au navigateur du développeur les clics, le clavier, le tiroir mobile et le rendu visuel.

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
- Les images passent par l'optimiseur : dans le HTML, leurs URLs sont encodées (`/_next/image?url=%2Fapi%2Fassets%2F...`). Un `grep "/api/assets/"` sur la page n'en voit qu'une partie, chercher aussi la forme encodée et requêter l'URL `/_next/image` elle-même.
