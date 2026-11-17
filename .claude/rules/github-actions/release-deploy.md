---
paths:
  - ".github/workflows/*.{yml,yaml}"
---

# GitHub Actions : release et déploiement

## À faire
- **Un workflow par rôle** : `ci.yml` qualité, `release-please.yml` release, `deploy.yml` build et déploiement, `security.yml` scan Trivy hebdomadaire de l'image `latest`. Le scan reste hors de `deploy.yml` : `security-events: write` n'a pas à côtoyer les secrets de déploiement et seul un run sur la branche par défaut alimente l'onglet Security
- **`deploy.yml` séparé de `ci.yml`**, déclenché sur push de tag `v*` (posé par release-please, authentifié par GitHub App) : il build l'image, la pousse sur GHCR puis déclenche le redeploy Dokploy par curl. Dokploy reste en pull-only. Ni pnpm ni Node sur le runner : le Dockerfile installe lui-même les dépendances et un install hors image exécuterait des lifecycle scripts dans un job qui porte `packages: write`. Voir PRODUCTION.md
- **Condition `startsWith(github.ref, 'refs/tags/v')` sur le job de `deploy.yml`** : un dispatch depuis une branche publierait `latest` hors release. Ne pas restreindre à `main`, le rollback se dispatche sur le ref d'un tag
- **`cancel-in-progress: false`** sur `release-please.yml` et `deploy.yml` : une release interrompue laisserait un état incomplet
- **`timeout-minutes` dimensionné au job** : 30 min pour le build et le push Docker de `deploy.yml`, plus long que les jobs de qualité

## À éviter
- Un `GITHUB_TOKEN` intégré pour poser le tag de release : il ne réveillerait pas `deploy.yml`, sans erreur. release-please passe par le token de la GitHub App (PRODUCTION.md § Gestion des Secrets)

## Gotchas
- Le redeploy Dokploy se rejoue trois fois avec un délai croissant : un redémarrage de Dokploy pendant l'appel ne fait pas échouer la release. Ses secrets passent par `env:` du step
- `cancel-in-progress: false` ne met pas tous les runs en file : un groupe garde un seul run `pending`, qu'un nouveau run remplace. Sans effet ici, un tag plus récent supplantant le précédent
- **GitHub désactive le `schedule` d'un dépôt public après 60 jours sans activité** : un gel du projet arrêterait le scan hebdomadaire de `security.yml` sans signal
