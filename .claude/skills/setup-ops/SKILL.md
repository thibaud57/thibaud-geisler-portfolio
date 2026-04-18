---
name: setup-ops
description: Bootstrap et diagnostics de l'environnement local. Couvre `just install` (deps pnpm), `just setup` (install + DB readiness), `just check` (diagnostics Node, pnpm, Docker, .env, Postgres). À invoquer au premier clone, après un pull qui change les deps, ou pour diagnostiquer un problème d'env.
allowed-tools: Bash(just install), Bash(just setup), Bash(just check)
---

# setup-ops - Installation et diagnostics d'environnement

Ta mission est d'installer les dépendances, préparer l'environnement local, ou diagnostiquer son état.

## Input

L'utilisateur précise : **install**, **setup**, ou **check**. Par défaut : `check`.

## Workflow

| Action | Commande | Description |
|---|---|---|
| install | `just install` | `pnpm install` idempotent (réinstalle si lockfile changé) |
| setup | `just setup` | install + docker-up + migrate deploy (premier démarrage) |
| check | `just check` | Diagnostics Node, pnpm, Docker, .env, Postgres |

## Règles

- `setup` safe à relancer (install idempotent, migrate deploy idempotent)
- `check` diagnostique uniquement, jamais d'opération d'écriture
- Si `check` signale `⚠️  .env manquant` → suggérer `cp .env.example .env` + remplir les secrets
- Si `check` signale `⚠️  PostgreSQL non accessible` → suggérer `just docker-up`
