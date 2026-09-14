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

## Gotchas

- Une route de test temporaire est un pilotage légitime (elle atteint une vraie surface HTTP), mais la supprimer avant de rendre la main : `rm -rf src/app/api/<route-de-test>`. `cat > fichier` ne crée pas les dossiers manquants, d'où un 404 trompeur : créer le dossier d'abord.
- `just dev` lancé en arrière-plan survit à la fin du shell qui l'a lancé, mais ses logs s'arrêtent d'être capturés si la redirection appartenait à ce shell : rediriger vers un fichier du scratchpad, pas compter sur la sortie de la commande.
- Les logs Pino locaux ne sont pas filtrés des données personnelles, seul ce qui part vers un service externe l'est. Une donnée sensible visible dans le fichier de log local est le comportement attendu.
