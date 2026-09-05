---
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "pnpm-lock.yaml"
  - ".npmrc"
---

# pnpm — Configuration allowBuilds, overrides + packageManager

## À faire
- Déclarer **`allowBuilds`** dans **`pnpm-workspace.yaml`** (scope : racine du repo, toujours ce fichier depuis pnpm 10.26, même en single-repo) pour autoriser explicitement les lifecycle scripts des deps qui en ont besoin (compilations de binaires natifs) — breaking v10 : désactivés par défaut pour la sécurité supply chain, sans cette config les binaires natifs ne se compilent pas et génèrent des erreurs runtime silencieuses
- **Lister chaque package explicitement** (les patterns glob ne sont pas supportés) : `allowBuilds: { "sharp": true, "@swc/core": true, ... }`
- Déclarer les **`overrides`** dans le même `pnpm-workspace.yaml`, et les commenter : un override force une version dans tout l'arbre, donc il doit dire pourquoi et quand le retirer
- Pinner la version de pnpm via **`"packageManager": "pnpm@10.33.0"`** dans `package.json` pour garantir la cohérence de version entre le dev local (corepack) et la CI (`pnpm/action-setup`)

## Gotchas
- **Le champ `pnpm` de `package.json` n'est plus lu du tout**, `allowBuilds` comme `overrides` : tout vit dans `pnpm-workspace.yaml`. pnpm l'annonce à l'installation (`The "pnpm" field in package.json is no longer read by pnpm. The following keys were ignored: …`), mais applique quand même l'install, donc le réglage est perdu sans échec
- **Une transitive figée dans le lockfile ne se met à jour par aucune commande de mise à jour** : ni `overrides`, ni `pnpm update <pkg> --depth Infinity`, ni `pnpm dedupe`, ni `pnpm install --force/--lockfile-only/--fix-lockfile`. Seule une re-résolution complète (lockfile supprimé) la débloque, et elle remonte alors toutes les autres. Vérifié le 2026-09-05 sur `vite@8.0.8` tiré par `@vitejs/plugin-react`, resté figé partout sauf en résolution fraîche, où il passe à 8.2.2
- **Avant d'ajouter un `overrides` pour une vulnérabilité transitive, vérifier la plage du parent** : si elle autorise déjà la version corrigée, l'override ne sert à rien et le vrai correctif est la re-résolution, à laisser à Dependabot ou à une PR `chore(deps)` dédiée
- **Patterns glob non supportés** — voir [issue #11171](https://github.com/pnpm/pnpm/issues/11171) ouverte, feature request. Lister les packages explicitement
- **pnpm 10 : lifecycle scripts désactivés par défaut** — sans config `allowBuilds`, les deps qui compilent des binaires natifs (`sharp`, `@swc/core`, `@prisma/engines`, `@parcel/watcher`, `unrs-resolver`, `msw`, `prisma`) sont installées mais leurs scripts de build (ex: compilation C/Rust) sont skippés silencieusement
- **`allowBuilds` ajoutée en 10.26.0** (map `package → boolean`). `onlyBuiltDependencies` et `neverBuiltDependencies` restent acceptées sur toute la ligne 10.x et ne sont supprimées qu'en **11.0** : les remplacer maintenant, pas au moment de la montée
- **pnpm 10 : `public-hoist-pattern` ne hisse plus rien par défaut** (eslint/prettier inclus). ~1-2% des packages qui supposent un `node_modules` plat peuvent casser — configurer explicitement via `public-hoist-pattern` dans `.npmrc` si besoin
- Après ajout d'une dep native → **`pnpm rebuild`** exécute les build scripts pour les packages maintenant autorisés (évite un `pnpm install` complet qui re-résout tout)

## Exemples
```yaml
# ✅ pnpm-workspace.yaml — allowBuilds explicite (pnpm >= 10.26)
allowBuilds:
  "@parcel/watcher": true
  "@prisma/engines": true
  "@swc/core": true
  msw: true
  prisma: true
  sharp: true
  unrs-resolver: true
```

```json
// ✅ package.json — packageManager pinné (engines runtime aussi)
{
  "packageManager": "pnpm@10.33.0",
  "engines": {
    "node": ">=24.0.0",
    "pnpm": ">=10.0.0"
  }
}
```

```yaml
# ✅ pnpm-workspace.yaml — overrides au même endroit qu'allowBuilds
overrides:
  vite: ^8.2.2
```

```json
// ❌ package.json — le champ pnpm entier est ignoré, allowBuilds comme overrides
{
  "pnpm": {
    "allowBuilds": { "sharp": true },
    "overrides": { "vite": "^8.2.2" }
  }
}
```

```yaml
# ❌ pnpm-workspace.yaml — pattern glob non supporté, pnpm ignore et warn
allowBuilds:
  "*": true
```
