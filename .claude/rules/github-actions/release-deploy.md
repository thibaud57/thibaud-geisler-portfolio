---
paths:
  - ".github/workflows/*.{yml,yaml}"
---

# GitHub Actions : release et déploiement

## À faire
- **Un workflow par rôle** : `ci.yml` qualité, `release-please.yml` release, build et déploiement, `security.yml` scan Trivy hebdomadaire de l'image `latest`. Le scan reste hors de `release-please.yml` : `security-events: write` n'a pas à côtoyer les secrets de déploiement et seul un run sur la branche par défaut alimente l'onglet Security
- **Le build et le déploiement sont le job `deploy` de `release-please.yml`**, séparé de `ci.yml` et exécuté quand release-please crée une release (`release_created`), en checkout sur le tag créé : il build l'image, la pousse sur GHCR puis déclenche le redeploy Dokploy par curl. Dokploy reste en pull-only. Ni pnpm ni Node sur le runner : le Dockerfile installe lui-même les dépendances et un install hors image exécuterait des lifecycle scripts dans un job qui porte `packages: write`. Voir PRODUCTION.md
- **Job `deploy` gaté sur `release_created` ou sur un dispatch dont l'input `tag` commence par `v`** : sans ce garde, un dispatch publierait `latest` hors release. Le rollback passe par cet input (`gh workflow run release-please.yml -f tag=vX.Y.Z`), release-please est alors sauté et le checkout se fait sur ce tag
- **`cancel-in-progress: false`** sur `release-please.yml` : une release interrompue laisserait un état incomplet
- **`timeout-minutes` dimensionné au job** : 30 min pour le build et le push Docker du job `deploy`, plus long que les jobs de qualité

## À éviter
- Un `GITHUB_TOKEN` intégré pour release-please : la CI de la PR de release ne tournerait pas sans approbation. release-please passe par le token de la GitHub App (PRODUCTION.md § Gestion des Secrets)

## Gotchas
- Le redeploy Dokploy se rejoue trois fois avec un délai croissant : un redémarrage de Dokploy pendant l'appel ne fait pas échouer la release. Ses secrets passent par `env:` du step
- `cancel-in-progress: false` ne met pas tous les runs en file : un groupe garde un seul run `pending`, qu'un nouveau run remplace. Sans effet ici : le run suivant reprend toute PR de release mergée restée sans release
- **GitHub désactive le `schedule` d'un dépôt public après 60 jours sans activité** : un gel du projet arrêterait le scan hebdomadaire de `security.yml` sans signal
