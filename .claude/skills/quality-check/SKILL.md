---
name: quality-check
description: Lance les vérifications qualité du code (lint, typecheck, tests). Appelle `just lint`, `just typecheck`, `just test` (ou granulaires `just test-unit`, `just test-integration`, `just test-watch`). À invoquer après modification de code, avant commit/PR, ou sur demande ("lance les tests", "check le code", "valide le build").
allowed-tools: Bash(just lint), Bash(just typecheck), Bash(just test), Bash(just test-unit), Bash(just test-integration), Bash(just test-watch)
---

# quality-check - Vérifications qualité

Ta mission est de lancer les vérifications qualité du projet et reporter les résultats.

## Input

Optionnel : l'utilisateur peut préciser quel check (`lint`, `typecheck`, `test`, `test-unit`, `test-integration`, `test-watch`). Sinon, enchaîner les 3 principaux.

## Workflow

### Par défaut (tout enchaîner)

1. `just lint` — ESLint sur `src/`
2. `just typecheck` — `tsc --noEmit`
3. `just test` — unit + integration

Stopper au premier échec, afficher l'erreur brute sans troncature.

### Check ciblé

| Commande | Recette |
|---|---|
| lint | `just lint` |
| typecheck | `just typecheck` |
| test | `just test` (unit + integration) |
| test-unit | `just test-unit` (exclut `.integration.test.*`) |
| test-integration | `just test-integration` (uniquement `.integration.test.*`) |
| test-watch | `just test-watch` (background, watch mode) |

## Règles

- Stopper au premier échec, afficher l'output brut
- `test-watch` toujours en background
- Si `typecheck` échoue sur `PageProps` / `LayoutProps` → suggérer `pnpm exec next typegen` pour régénérer les types Next
