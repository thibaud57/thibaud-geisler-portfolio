---
paths:
  - ".github/workflows/*.{yml,yaml}"
---

# GitHub Actions — Release, déploiement et tokens

## À faire
- **Un workflow par rôle** : `ci.yml` qualité, `release-please.yml` release, `deploy.yml` build et déploiement, `security.yml` scan Trivy hebdomadaire de l'image `latest`. Le scan reste hors de `deploy.yml` : `security-events: write` n'a pas à côtoyer les secrets de déploiement, et seul un run sur la branche par défaut alimente l'onglet Security
- **`deploy.yml` séparé de `ci.yml`**, déclenché sur push de tag `v*` (posé par release-please, authentifié par GitHub App) : il build l'image, la pousse sur GHCR puis déclenche le redeploy Dokploy par curl. Dokploy reste en pull-only. Ni pnpm ni Node sur le runner : le Dockerfile installe lui-même les dépendances, et un install hors image exécuterait des lifecycle scripts dans un job qui porte `packages: write`. Voir PRODUCTION.md
- **Condition `startsWith(github.ref, 'refs/tags/v')` sur le job de `deploy.yml`** : un dispatch depuis une branche publierait `latest` hors release. Ne pas restreindre à `main`, le rollback se dispatche sur le ref d'un tag
- **`cancel-in-progress: false`** sur `release-please.yml` et `deploy.yml` : une release interrompue laisserait un état incomplet
- **`timeout-minutes` dimensionné au job** : 30 min pour le build et le push Docker de `deploy.yml`, plus long que les jobs de qualité
- **Token de GitHub App quand l'événement produit doit déclencher un autre workflow** : `actions/create-github-app-token` avant le step qui pousse, puis `steps.<id>.outputs.token`. Le `id:` du step est **load-bearing** : sans lui l'expression résout à vide, l'action retombe sur `github.token`, le run reste vert et plus rien ne se déclenche. Laisser `owner` et `repositories` vides scope le token au dépôt courant, et restreindre ses droits par les inputs `permission-<scope>` : sans eux, il reçoit toutes les permissions de l'installation de l'App. release-please demande `contents`, `issues` et `pull-requests` en écriture
- Mettre `permissions:` à `contents: read` quand le `GITHUB_TOKEN` ne sert pas : les droits réels vivent dans les permissions de l'App

## À éviter
- **Compter sur le `GITHUB_TOKEN` intégré pour réveiller un autre workflow** : GitHub ne déclenche aucun workflow sur les événements qu'il émet (garde-fou anti-récursion). Un tag poussé ainsi ne lance pas le workflow abonné à `push: tags`, sans erreur : le run est vert et la chaîne s'arrête

## Gotchas
- Le redeploy Dokploy se rejoue trois fois avec un délai croissant : un redémarrage de Dokploy pendant l'appel ne fait pas échouer la release. Ses secrets passent par `env:` du step (cf. `github-actions/workflows.md` § À éviter)
- `cancel-in-progress: false` ne met pas tous les runs en file : un groupe garde un seul run `pending`, qu'un nouveau run remplace. Sans effet ici, un tag plus récent supplantant le précédent
- **GitHub désactive le `schedule` d'un dépôt public après 60 jours sans activité** : un gel du projet arrêterait le scan hebdomadaire de `security.yml` sans signal
- Qualité, cache et service Postgres : voir `github-actions/workflows.md`

## Exemples
```yaml
# ✅ Token d'App avec id, passé à l'action qui pousse le tag
- uses: actions/create-github-app-token@<sha> # vX.Y.Z
  id: app-token
  with:
    client-id: ${{ vars.RELEASE_APP_CLIENT_ID }}
    private-key: ${{ secrets.RELEASE_APP_PRIVATE_KEY }}
    permission-contents: write
    permission-issues: write
    permission-pull-requests: write
- uses: googleapis/release-please-action@<sha> # vX.Y.Z
  with:
    token: ${{ steps.app-token.outputs.token }}

# ❌ GITHUB_TOKEN par défaut : le tag ne déclenche jamais deploy.yml
- uses: googleapis/release-please-action@<sha>
```
