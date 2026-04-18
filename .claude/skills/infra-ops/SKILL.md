---
name: infra-ops
description: Opérations Docker et Database (Prisma/Postgres). Couvre `docker-up/down`, `db` (readiness), `db-migrate LABEL`, `db-reset`, `db-studio`. Jamais d'auto-invocation par Claude, uniquement sur demande explicite, car effets de bord destructifs possibles (db-reset = DROP de la DB dev).
disable-model-invocation: true
allowed-tools: Bash(just docker-up), Bash(just docker-down), Bash(just db), Bash(just db-migrate *), Bash(just db-reset), Bash(just db-studio)
---

# infra-ops - Opérations Docker + Database

Ta mission est d'exécuter des opérations Docker et Database selon la demande explicite de l'utilisateur.

## Workflow

### Docker

| Action | Commande |
|---|---|
| Lancer postgres + nextjs en détaché | `just docker-up` |
| Stopper et retirer les containers | `just docker-down` |

### Database

| Action | Commande | Notes |
|---|---|---|
| Readiness (docker-up + migrate deploy) | `just db` | Idempotent, safe à relancer |
| Créer une migration dev | `just db-migrate <LABEL>` | LABEL obligatoire (snake-case, ex: `add-project-slug`) |
| Reset complet DB dev | `just db-reset` | ⚠️ DROP + recreate + migrate. `[confirm]` Just demande confirmation |
| Ouvrir Prisma Studio | `just db-studio` | Background (UI locale, http://localhost:5555) |

## Règles

- **Jamais d'auto-invocation** : l'utilisateur doit l'avoir demandé explicitement
- `db-reset` → confirmer que l'environnement est **dev** (jamais en prod), rappeler que ça drop tout
- `db-migrate` sans LABEL → demander le label avant de lancer (Prisma bloque interactivement sinon)
- `db-studio` en background uniquement
- `docker-down` ne supprime pas les volumes (`portfolio_pgdata`, `portfolio_assets` persistent)
