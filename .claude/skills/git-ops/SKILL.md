---
name: git-ops
description: Opérations git conformes au workflow du projet (<type>/<slug> → develop → main, hotfix/<slug> → main, release-please). Crée des branches de travail, commits Conventional, PRs vers develop ou main, merge en squash. Jamais d'auto-invocation car effets de bord irréversibles (commit, push, PR, merge).
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
---

# git-ops - Workflow git projet

Ta mission est d'effectuer des opérations git selon le workflow documenté (PRODUCTION.md). Types de commit et nommage des branches : convention Git commune (CLAUDE.md user § Git & intégration).

## Workflow git du projet

```
<type>/<slug> → develop → main   (flux normal, fin d'epic)
hotfix/<slug> → main             (flux hotfix, bug critique prod)
```

- **Tag et déploiement** : release-please pose le tag `vX.Y.Z` depuis `main`, le tag déclenche le déploiement. Release, checklist et rollback : PRODUCTION.md.
- **Resync de `develop`** : après chaque tag, flux normal ou hotfix : PRODUCTION.md § Flux Release.

## Opérations

### Créer une branche de travail

1. Vérifier branche courante : `git branch --show-current`
2. Se positionner sur develop + pull : `git checkout develop && git pull origin develop`
3. Créer : `git checkout -b <type>/<slug>`

### Créer une branche hotfix

1. Se positionner sur main + pull : `git checkout main && git pull origin main`
2. Créer : `git checkout -b hotfix/<slug>`

### Commit

1. Lire `git diff --staged` pour comprendre les changements
2. Proposer un message `type(scope): description` cohérent
3. Demander validation avant `git commit -m`
4. **Jamais `--amend` sans demande explicite**

### PR de travail vers develop

1. Push : `git push -u origin <type>/<slug>`
2. `gh pr create --base develop --title "..." --body "..."`
3. Body : Summary (1-3 bullets) + Test plan (checklist)

### PR vers main (promotion develop ou hotfix)

1. Push : `git push -u origin <branche>`
2. `gh pr create --base main --title "..." --body "..."`
3. Titre obligatoirement `feat:` / `fix:` / `feat!:`, sinon release-please skip : pas de tag, pas de déploiement. Un hotfix se titre `fix:`.

### Merge

Seulement CI verte : `gh pr merge <n> --squash`, le commit prend le titre de la PR.

- **PR de travail et hotfix** : ajouter `--delete-branch`
- **Promotion `develop → main`** : jamais `--delete-branch` (`delete_branch_on_merge` est désactivé, GitHub supprimerait `develop`)
- **Version forcée** : `gh pr merge <n> --squash --body "Release-As: X.Y.Z"`
- **Après une PR de travail** : `/git-sync --base=develop`

### Revert d'un changement livré

Jamais de commit direct sur `main` : une branche et une PR titrée `fix:`. `hotfix/<slug>` depuis `main` si la prod est touchée, sinon `fix/<slug>` depuis `develop`.

### Dépendances

- **Dependabot** : PRs en `chore(deps)`
- **Montée à livrer** : `fix(deps)`
- **PR de sécurité** (vers `main`) : retitrer `fix(deps):` avant le merge pour livrer le correctif

## Règles

- **Jamais force push sur main** (refuser + alerter)
- **Jamais `--no-verify`** sans demande explicite
- **Toujours NEW commit**, pas `--amend` par défaut
- **Jamais de tag manuel** (`git tag`, `git push --tags`) : release-please les pose
- Default branch GitHub = `main`, ne jamais la changer
- PR body obligatoire : Summary + Test plan
- Ne jamais committer `.env` ou fichiers de secrets
