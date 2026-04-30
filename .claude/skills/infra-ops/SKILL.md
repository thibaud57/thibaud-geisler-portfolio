---
name: infra-ops
description: Opérations Docker et Database (Prisma/Postgres). Couvre `docker-up/down`, `db` (readiness), `db-migrate LABEL`, `db-reset`, `db-studio`, `seed`, et les équivalents DB test (`db-test`, `db-test-reset`, `db-test-studio`). Jamais d'auto-invocation par Claude, uniquement sur demande explicite, car effets de bord destructifs possibles (db-reset = DROP de la DB dev, db-test-reset = DROP de la DB test).
disable-model-invocation: true
allowed-tools: Bash(just docker-up), Bash(just docker-down), Bash(just db), Bash(just db-migrate *), Bash(just db-reset), Bash(just db-studio), Bash(just seed), Bash(just db-test), Bash(just db-test-reset), Bash(just db-test-studio)
---

# infra-ops - Opérations Docker + Database

Ta mission est d'exécuter des opérations Docker et Database selon la demande explicite de l'utilisateur.

## Workflow

### Docker

| Action | Commande |
|---|---|
| Lancer tout le compose (validation image) | `just docker-up` |
| Stopper et retirer les containers | `just docker-down` |

### Database (dev)

| Action | Commande | Notes |
|---|---|---|
| Readiness (Postgres up + migrate deploy) | `just db` | Idempotent, safe à relancer |
| Créer une migration dev | `just db-migrate <LABEL>` | LABEL obligatoire (snake-case, ex: `add-project-slug`) |
| Reset complet DB dev | `just db-reset` | ⚠️ DROP + recreate + migrate. `[confirm]` Just demande confirmation |
| Ouvrir Prisma Studio | `just db-studio` | Background (UI locale, http://localhost:5555) |
| Seed la DB depuis `prisma/seed-data/` | `just seed` | Idempotent (upsert par slug). Pas destructif. Requiert tables migrées (`just db`) |

### Database (test)

Recettes jumelles de la DB dev, qui chargent `.env.test` (DATABASE_URL = `portfolio_test`) au lieu de `.env`. Utiles pour garder la DB test alignée sur le schéma après chaque nouvelle migration créée via `db-migrate`.

| Action | Commande | Notes |
|---|---|---|
| Migrer la DB test (migrate deploy) | `just db-test` | Idempotent. À relancer après chaque nouvelle migration locale pour que les tests integration voient le schéma à jour |
| Reset complet DB test | `just db-test-reset` | ⚠️ DROP + recreate + migrate. `[confirm]` Just demande confirmation. `--skip-seed` (les tests créent leurs fixtures inline) |
| Ouvrir Prisma Studio sur la DB test | `just db-test-studio` | Background (UI locale, http://localhost:5555). Pour inspecter les fixtures d'un test integration qui échoue |

## Règles

- **Jamais d'auto-invocation** : l'utilisateur doit l'avoir demandé explicitement
- `db-reset` / `db-test-reset` → confirmer que l'environnement est bien celui ciblé (jamais en prod), rappeler que ça drop tout
- `db-migrate` sans LABEL → demander le label avant de lancer (Prisma bloque interactivement sinon). Après création : proposer `just db-test` pour réaligner la DB test
- `db-studio` / `db-test-studio` en background uniquement
- `docker-down` ne supprime pas les volumes (`portfolio_pgdata`, `portfolio_assets` persistent)
