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
| Authentification (Better Auth) | `curl -s http://localhost:3000/api/auth/get-session` (`null` sans session). Flux OAuth réel : voir ci-dessous |
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

Google exige un vrai navigateur et un vrai compte : le développeur clique, la recette prépare l'entrée et contrôle la base. Tant qu'aucune page de connexion n'appelle `authClient.signIn.social`, une route temporaire démarre le flux en recopiant le cookie d'état :

```typescript
// src/app/api/verify-auth/route.ts (temporaire)
import { auth } from "@/lib/auth"

export async function GET() {
  const res = await auth.api.signInSocial({ body: { provider: "google", callbackURL: "/fr" }, asResponse: true })
  const { url } = (await res.json()) as { url: string }
  const headers = new Headers({ Location: url })
  for (const cookie of res.headers.getSetCookie()) headers.append("Set-Cookie", cookie)
  return new Response(null, { status: 302, headers })
}
```

Compter `auth."user"`, `auth.session` et `auth.account` avant puis après chaque connexion. Le compte refusé se teste en navigation privée, sinon Google reprend le compte déjà connecté.

## Gotchas

- Une route de test temporaire est un pilotage légitime (elle atteint une vraie surface HTTP), mais la supprimer avant de rendre la main : `rm -rf src/app/api/<route-de-test>`. `cat > fichier` ne crée pas les dossiers manquants, d'où un 404 trompeur : créer le dossier d'abord.
- `just dev` lancé en arrière-plan survit à la fin du shell qui l'a lancé, mais ses logs s'arrêtent d'être capturés si la redirection appartenait à ce shell : rediriger vers un fichier du scratchpad, pas compter sur la sortie de la commande.
- Les logs Pino locaux ne sont pas filtrés des données personnelles, seul ce qui part vers un service externe l'est. Une donnée sensible visible dans le fichier de log local est le comportement attendu.
- `/api/assets/*` lit le bucket R2 de dev (`R2_ASSETS_BUCKET` du `.env`), pas le disque : des 404 sur tous les assets signalent un bucket vide ou désynchronisé, pas un défaut de code. Le repeupler avec `aws s3 sync` depuis les fichiers source, token de dev (forme de la commande : `docs/PRODUCTION.md` § Checklist Release).
- Supprimer une route temporaire pendant que `pnpm dev` tournait laisse `.next/dev/types/validator.ts` la référencer : le `pnpm build` suivant échoue en `TS2307`. Supprimer `.next/dev/types/validator.ts` et `.next/dev/types/routes.d.ts` (régénérés) avant de builder.
- Un compte refusé atterrit sur `/fr/admin/login?error=FORBIDDEN` en 404 tant que le proxy next-intl préfixe `/admin` et qu'aucune page de connexion n'existe : l'URL et l'absence de ligne en base font la preuve, pas le rendu.
- Les noms des variables serveur (`GOOGLE_CLIENT_SECRET`, `SMTP_PASS`…) figurent dans un chunk de `.next/static` : c'est le schéma de t3-env, attendu. Seule la présence d'une *valeur* serait un défaut, et la chercher exige de lire `.env` : le développeur lance lui-même le grep.
- Les images passent par l'optimiseur : dans le HTML, leurs URLs sont encodées (`/_next/image?url=%2Fapi%2Fassets%2F...`). Un `grep "/api/assets/"` sur la page n'en voit qu'une partie, chercher aussi la forme encodée et requêter l'URL `/_next/image` elle-même.
