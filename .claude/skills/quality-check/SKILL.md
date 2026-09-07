---
name: quality-check
description: Lance les vérifications qualité du code (lint, format, typecheck, tests, build, audit des dépendances). Appelle `just lint`, `just format` en cas d'échec de formatage, `just typecheck`, `just test` (ou granulaires `just test-unit`, `just test-integration`, `just test-watch`), `just build` pour vérifier que le bundle Next.js compile, et `just audit` pour les vulnérabilités des dépendances. À invoquer après modification de code, avant commit/PR, ou sur demande ("lance les tests", "check le code", "valide le build", "audit les deps").
allowed-tools: Bash(just lint), Bash(just format), Bash(just typecheck), Bash(just test), Bash(just test-unit), Bash(just test-integration), Bash(just test-watch), Bash(just build), Bash(just audit)
---

# quality-check - Vérifications qualité

Ta mission est de lancer les vérifications qualité du projet et reporter les résultats.

## Input

Optionnel : l'utilisateur peut préciser quel check (`lint`, `format`, `typecheck`, `test`, `test-unit`, `test-integration`, `test-watch`, `build`, `audit`). Sinon, enchaîner les 3 principaux (`lint` + `typecheck` + `test`). `format`, `build` et `audit` ne font PAS partie du workflow par défaut : à lancer à la demande ou avant PR sur `main`.

## Workflow

### Par défaut (tout enchaîner)

1. `just lint` : ESLint sur `src/`, Prettier en vérification, `prisma validate` sur le schéma, `actionlint` sur `.github/workflows`
2. `just typecheck` : `tsc --noEmit`
3. `just test` : unit + integration

Stopper au premier échec, afficher l'erreur brute sans troncature.

### Check ciblé

| Commande | Recette |
|---|---|
| lint | `just lint` (ESLint, Prettier en vérification, `prisma validate`, `actionlint` ; ne corrige rien) |
| format | `just format` (Prettier et `prisma format` réécrivent, à lancer si `lint` échoue sur le formatage) |
| typecheck | `just typecheck` |
| test | `just test` |
| test-unit | `just test-unit` (exclut `.integration.test.*`) |
| test-integration | `just test-integration` (uniquement `.integration.test.*`) |
| test-watch | `just test-watch` (background) |
| build | `just build` (pas enchaîné par défaut, lourd) |
| audit | `just audit` (`pnpm audit --audit-level=high`, pas enchaîné par défaut) |

## Règles

- Stopper au premier échec, afficher l'output brut
- `test-watch` toujours en background
- `build` à ne pas enchaîner automatiquement dans le workflow par défaut (lourd, utile avant PR `main` ou pour vérifier un bundle)
- `audit` à ne pas enchaîner automatiquement non plus : il **sort en code 1 dès qu'une vulnérabilité est trouvée**, ce qui déclencherait le « stopper au premier échec » sur des CVE que la CI elle-même ne bloque pas (`continue-on-error`). Le rapporter comme une information à lire, pas comme un échec : préciser la sévérité, le paquet concerné, et si ce paquet est une dépendance de développement ou un transitif jamais chargé en production
- Si `typecheck` échoue sur `PageProps` / `LayoutProps` → suggérer `pnpm exec next typegen` pour régénérer les types Next
- Si `lint` échoue sur le formatage (`pnpm format:check`) → suggérer `just format` pour corriger, puis relancer `lint`
