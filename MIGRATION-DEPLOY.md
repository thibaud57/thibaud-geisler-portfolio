# Supprimer le PAT de la chaîne de release

`deploy.yml` se déclenche sur `push: tags: ['v*']`. Ce tag n'est posé que parce que
release-please tourne avec `RELEASE_PLEASE_PAT` : un tag créé par le `GITHUB_TOKEN`
intégré ne déclenche aucun workflow. Le PAT n'est donc pas un confort, il est ce qui
fait partir le déploiement.

La chaîne fonctionne (14 runs verts, dernière release 1.4.2 le 2026-08-25). Ce qui suit
ne corrige pas une panne, il retire une échéance : un PAT expire, sa date n'est notée
nulle part, et le jour venu le déploiement cessera de partir **sans erreur visible**.
Le PAT porte en plus les droits du compte, là où le token intégré est borné au dépôt.

## Ce qu'il faut changer

### 1. `deploy.yml` — rendre le workflow appelable

Remplacer le déclencheur sur tag par un `workflow_call`, garder le manuel :

```yaml
on:
  workflow_call:
  workflow_dispatch:
```

Le `push: tags` disparaît : c'est désormais release-please qui appelle ce workflow.

### 2. `release-please.yml` — exposer les sorties et appeler le deploy

Le job `release-please` ne déclare aujourd'hui aucun `outputs:`. Sans lui, rien ne permet
de savoir si une release a été créée. L'ajouter :

```yaml
jobs:
  release-please:
    runs-on: ubuntu-24.04
    timeout-minutes: 15
    outputs:
      release_created: ${{ steps.release.outputs.release_created }}
    steps:
      - uses: googleapis/release-please-action@v5
        id: release
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json

  deploy:
    needs: release-please
    if: needs.release-please.outputs.release_created == 'true'
    uses: ./.github/workflows/deploy.yml
    secrets: inherit
```

Deux points à ne pas rater :

- `id: release` sur le step, sinon `steps.release.outputs` ne référence rien et la
  condition sera toujours fausse : la release sortirait sans jamais être déployée.
- **`secrets: inherit`** : un workflow appelé ne reçoit aucun secret par défaut. Sans
  cette ligne, `DOKPLOY_URL`, `DOKPLOY_TOKEN` et `DOKPLOY_COMPOSE_ID` seront vides et
  l'échec surviendra à l'étape de déploiement, pas avant.

### 3. Permissions

`deploy.yml` pousse une image avec `secrets.GITHUB_TOKEN`. Vérifier que le bloc
`permissions:` de `release-please.yml` couvre ce dont le workflow appelé a besoin
(`packages: write` en plus de `contents: write` et `pull-requests: write`) : les
permissions du workflow appelant s'appliquent à l'appelé.

## Vérifier

1. Lancer `deploy.yml` à la main (`workflow_dispatch`) : il doit passer, ce qui prouve
   que le retrait du déclencheur sur tag n'a rien cassé.
2. À la release suivante, vérifier que le job `deploy` apparaît **dans le run de
   `release-please`** et non plus comme un run séparé.

## Nettoyer, seulement après

Supprimer le secret `RELEASE_PLEASE_PAT` des réglages du dépôt, et révoquer le jeton
côté compte GitHub. Ne pas le faire avant d'avoir vu une release complète passer : en
cas de retour en arrière, il faudrait le recréer.

## Pourquoi pas le chaînage direct

techno-tagger enchaîne son build dans le workflow de release, sans workflow séparé. Ça
ne convient pas ici : ce dépôt doit pouvoir redéployer sans refaire une release, ce que
le `workflow_dispatch` de `deploy.yml` permet et qu'un job chaîné interdirait.
