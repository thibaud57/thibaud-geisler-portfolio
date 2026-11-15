---
name: infra-ops
description: Opérations Docker et Database (Prisma/Postgres). Couvre `docker-up/down`, `db` (readiness), `db-migrate LABEL`, `db-reset`, `db-studio`, `db-dump`, `db-restore`. Jamais d'auto-invocation par Claude, uniquement sur demande explicite, car effets de bord destructifs possibles (db-reset = DROP de la DB dev).
disable-model-invocation: true
allowed-tools: Bash(just docker-up), Bash(just docker-down), Bash(just db), Bash(just db-migrate *), Bash(just db-reset), Bash(just db-studio), Bash(just db-dump), Bash(just db-restore *)
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
| Reset complet DB dev | `just db-reset` | ⚠️ DROP + recreate + migrate, sans données (`just db-restore` ensuite). `[confirm]` Just demande confirmation |
| Ouvrir Prisma Studio | `just db-studio` | Background (UI locale, http://localhost:5555) |
| Dump des données de la DB de dev, sans le schéma `auth` | `just db-dump` | Non destructif, écrit dans `dumps/` |
| Restaure un dump dans la DB de dev | `just db-restore <fichier>` | ⚠️ Sur une base vidée par `db-reset` seulement, `pg_restore` empile sinon |

## Règles

- **Jamais d'auto-invocation** : l'utilisateur doit l'avoir demandé explicitement
- **Pas de recette pour la base de test** : la suite d'intégration la recrée et la migre à chaque run (`vitest.global-setup.ts`)
- `db-reset` → confirmer que l'environnement est bien celui ciblé (jamais en prod), rappeler que ça drop tout
- `db-migrate` sans LABEL → demander le label avant de lancer (Prisma bloque interactivement sinon)
- `db-studio` en background uniquement
- `docker-down` ne supprime pas le volume `portfolio_pgdata`, les données Postgres persistent
