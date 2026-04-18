---
name: git-ops
description: Opérations git conformes au workflow du projet (feature/* → develop → main, hotfix/* → main, SemVer vX.Y.Z). Crée des branches typées, commits Conventional, PRs vers develop ou main, tags de release. Jamais d'auto-invocation car effets de bord irréversibles (commit, push, PR, tag).
disable-model-invocation: true
allowed-tools: Bash(git *), Bash(gh *)
---

# git-ops - Workflow git projet

Ta mission est d'effectuer des opérations git selon le workflow documenté (PRODUCTION.md).

## Workflow git du projet

```
feature/* → develop → main → tag vX.Y.Z   (flux normal — fin d'epic)
hotfix/*  → main → tag vX.Y.Z              (flux hotfix — bug critique prod)
```

## Conventional Commits

Format : `type(scope optionnel): description`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `refactor` | Refactoring sans changement fonctionnel |
| `test` | Ajout ou modification de tests |
| `chore` | Maintenance, dépendances, configuration |

## Opérations

### Créer une branche feature

1. Vérifier branche courante : `git branch --show-current`
2. Se positionner sur develop + pull : `git checkout develop && git pull origin develop`
3. Créer : `git checkout -b feature/<nom-court>`

### Créer une branche hotfix

1. Se positionner sur main + pull : `git checkout main && git pull origin main`
2. Créer : `git checkout -b hotfix/<nom-court>`

### Commit

1. Lire `git diff --staged` pour comprendre les changements
2. Proposer un message `type(scope): description` cohérent
3. Demander validation avant `git commit -m`
4. **Jamais `--amend` sans demande explicite**

### PR vers develop (depuis feature/*)

1. Push : `git push -u origin feature/<nom>`
2. `gh pr create --base develop --title "..." --body "..."`
3. Body : Summary (1-3 bullets) + Test plan (checklist)

### PR vers main (hotfix/* ou develop en fin d'epic)

1. Push : `git push -u origin <branche>`
2. `gh pr create --base main --title "..." --body "..."`

### Tag release (après merge main validé en prod)

1. Sur main à jour : `git checkout main && git pull`
2. Incrémenter selon SemVer (MAJOR.MINOR.PATCH) selon la nature des changements
3. Tag + push : `git tag v<X.Y.Z> && git push --tags`

### Resync develop après hotfix

Après tag release sur main suite à un hotfix : `git checkout develop && git merge main && git push`

## Règles

- **Jamais force push sur main/master** (refuser + alerter)
- **Jamais `--no-verify`** sans demande explicite
- **Toujours NEW commit**, pas `--amend` par défaut
- Tags uniquement **après** validation prod (smoke test OK + Dokploy ✅)
- PR body obligatoire : Summary + Test plan
- Ne jamais committer `.env` ou fichiers de secrets
