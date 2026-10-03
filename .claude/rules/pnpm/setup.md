---
paths:
  - "package.json"
  - "pnpm-*.yaml"
  - ".npmrc"
---

# pnpm — Configuration allowBuilds, overrides + packageManager

## À faire
- Déclarer **`allowBuilds`** dans **`pnpm-workspace.yaml`** (racine du repo, ce fichier depuis pnpm 10.26, même en single-repo) pour autoriser explicitement les lifecycle scripts des deps qui en ont besoin : désactivés par défaut en v10, sans cette config les binaires natifs ne se compilent pas et échouent au runtime en silence
- **Lister chaque package explicitement** : `allowBuilds: { "sharp": true, "@swc/core": true, ... }`
- Déclarer les **`overrides`** dans le même `pnpm-workspace.yaml`, et les commenter : un override force une version dans tout l'arbre, il doit dire pourquoi et quand le retirer
- Pinner la version de pnpm via **`"packageManager": "pnpm@10.33.0"`** dans `package.json` : seule source pour le dev local (corepack) et la CI (`pnpm/action-setup`)
- Après l'ajout d'une dep native autorisée, lancer **`pnpm rebuild`** : il exécute les build scripts sans re-résoudre tout l'arbre

## À éviter
- Mettre `allowBuilds` ou `overrides` dans le champ `pnpm` de `package.json` : ce champ n'est plus lu du tout
- Utiliser un pattern glob dans `allowBuilds` (`"*": true`) : non supporté ([issue #11171](https://github.com/pnpm/pnpm/issues/11171)), pnpm l'ignore avec un warning
- Ajouter un `overrides` pour une vulnérabilité transitive sans vérifier la plage du parent : si elle autorise déjà la version corrigée, le vrai correctif est la re-résolution (Dependabot ou une PR `chore(deps)` dédiée)

## Gotchas
- **Le champ `pnpm` ignoré ne fait pas échouer l'install** : pnpm l'annonce (`The "pnpm" field in package.json is no longer read by pnpm…`) puis installe quand même, le réglage est perdu sans erreur
- **Une transitive figée dans le lockfile ne se met à jour par aucune commande de mise à jour** : ni `overrides`, ni `pnpm update <pkg> --depth Infinity`, ni `pnpm dedupe`, ni `pnpm install --force/--lockfile-only/--fix-lockfile`. Seule une re-résolution complète (lockfile supprimé) la débloque, et elle remonte alors toutes les autres (vérifié le 2026-09-05 sur `vite@8.0.8`, passé à 8.2.2 en résolution fraîche)
- Sans `allowBuilds`, les deps à binaires natifs (`sharp`, `@swc/core`, `@prisma/engines`, `@parcel/watcher`, `unrs-resolver`, `msw`, `prisma`) s'installent mais leurs scripts de build sont sautés en silence
- **`allowBuilds` ajoutée en 10.26.0** (map `package → boolean`). `onlyBuiltDependencies` et `neverBuiltDependencies` restent acceptées sur la ligne 10.x et sont supprimées en **11.0**
- **pnpm 10 : `public-hoist-pattern` ne hisse plus rien par défaut** (eslint/prettier inclus) : un package qui suppose un `node_modules` plat peut casser, se configure dans `.npmrc` si besoin

## Exemples
```yaml
# ✅ pnpm-workspace.yaml — allowBuilds explicite et overrides au même endroit
allowBuilds:
  sharp: true
  prisma: true
overrides:
  vite: ^8.2.2   # pourquoi, et quand le retirer
```

```json
// ❌ package.json — champ pnpm entier ignoré
{ "pnpm": { "allowBuilds": { "sharp": true } } }
```
