---
paths:
  - "package.json"
  - "pnpm-workspace.yaml"
  - "pnpm-lock.yaml"
  - ".npmrc"
---

# pnpm — Configuration allowBuilds + packageManager

## À faire
- Déclarer **`allowBuilds`** dans **`pnpm-workspace.yaml`** (scope : racine du repo, toujours ce fichier pour pnpm 10.33+, même en single-repo) pour autoriser explicitement les lifecycle scripts des deps qui en ont besoin (compilations de binaires natifs) — breaking v10 : désactivés par défaut pour la sécurité supply chain, sans cette config les binaires natifs ne se compilent pas et génèrent des erreurs runtime silencieuses
- **Lister chaque package explicitement** (pnpm 10.33 ne supporte PAS de wildcard `*`) : `allowBuilds: { "sharp": true, "@swc/core": true, ... }`
- Pinner la version de pnpm via **`"packageManager": "pnpm@10.33.0"`** dans `package.json` pour garantir la cohérence de version entre le dev local (corepack) et la CI (`pnpm/action-setup`)

## Gotchas
- **`allowBuilds` vit dans `pnpm-workspace.yaml`, pas dans `package.json`** en pnpm 10.33+ — la config `pnpm.allowBuilds` dans `package.json` est silencieusement ignorée (aucune erreur, juste warning "Ignored build scripts")
- **Wildcard `"*": true` non supporté** en pnpm 10.33 — voir [issue #11171](https://github.com/pnpm/pnpm/issues/11171) ouverte, feature request. Lister les packages explicitement
- **pnpm 10 : lifecycle scripts désactivés par défaut** — sans config `allowBuilds`, les deps qui compilent des binaires natifs (`sharp`, `@swc/core`, `@prisma/engines`, `@parcel/watcher`, `unrs-resolver`, `msw`, `prisma`) sont installées mais leurs scripts de build (ex: compilation C/Rust) sont skippés silencieusement
- **pnpm 10.33 : `onlyBuiltDependencies` et `neverBuiltDependencies` supprimés** → remplacés par `allowBuilds` (map `pattern → boolean`)
- **pnpm 10 : `public-hoist-pattern` ne hisse plus rien par défaut** (eslint/prettier inclus). ~1-2% des packages qui supposent un `node_modules` plat peuvent casser — configurer explicitement via `public-hoist-pattern` dans `.npmrc` si besoin
- Après ajout d'une dep native → **`pnpm rebuild`** exécute les build scripts pour les packages maintenant autorisés (évite un `pnpm install` complet qui re-résout tout)

## Exemples
```yaml
# ✅ pnpm-workspace.yaml — pnpm 10.33 config avec allowBuilds explicite
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

```json
// ❌ package.json — pnpm.allowBuilds dans package.json (silencieusement ignoré pnpm 10.33+)
{
  "pnpm": {
    "allowBuilds": { "sharp": true }
  }
}
```

```yaml
# ❌ pnpm-workspace.yaml — wildcard non supporté, pnpm 10.33 ignore et warn
allowBuilds:
  "*": true
```
