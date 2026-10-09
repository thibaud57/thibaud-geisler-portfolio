---
paths:
  - "package.json"
  - "pnpm-*.yaml"
---

# pnpm — Configuration allowBuilds, overrides + packageManager

## À faire
- Déclarer **`allowBuilds`** dans **`pnpm-workspace.yaml`** (racine du repo, même en single-repo) et y **lister chaque dépendance à scripts de build** : `true` si son script est nécessaire (binaire natif compilé ou téléchargé), `false` si le projet s'en passe (`esbuild`, dont le binaire vient de `@esbuild/<plateforme>`). Depuis pnpm 11 (`strictDepBuilds`), une dépendance absente de la liste fait échouer l'install
- Écrire ces entrées par **`pnpm approve-builds <pkg>`** (ou `'!<pkg>'` pour refuser), non interactif depuis pnpm 11
- Déclarer les **`overrides`** dans le même `pnpm-workspace.yaml`, et les commenter : un override force une version dans tout l'arbre, il doit dire pourquoi et quand le retirer
- Pinner pnpm par **`"packageManager": "pnpm@<version>+sha512.<hash>"`** dans `package.json`, écrit par `corepack use pnpm@<version>` : seule source pour le dev local (corepack), le Dockerfile et la CI (`pnpm/action-setup`)
- Après l'ajout d'une dep native autorisée, lancer **`pnpm rebuild`** : il exécute les build scripts sans re-résoudre tout l'arbre
- Retirer les **`minimumReleaseAgeExclude`** qu'écrit `pnpm add` pour une version de moins de 24 h dès que le délai est passé, puis vérifier par `pnpm install --frozen-lockfile` (cf. Gotchas)

## À éviter
- Mettre `allowBuilds` ou `overrides` dans le champ `pnpm` de `package.json` : ce champ n'est plus lu du tout
- Mettre un réglage pnpm dans `.npmrc` : depuis pnpm 11, il ne porte plus que le registre et l'authentification, le reste (`publicHoistPattern`…) va dans `pnpm-workspace.yaml`
- Utiliser un pattern glob dans `allowBuilds` (`"*": true`) : non supporté ([issue #11171](https://github.com/pnpm/pnpm/issues/11171)), pnpm l'ignore avec un warning
- Ajouter un `overrides` pour une vulnérabilité transitive sans vérifier la plage du parent : si elle autorise déjà la version corrigée, le vrai correctif est la re-résolution (Dependabot ou une PR `chore(deps)` dédiée)

## Gotchas
- **`minimumReleaseAge` vaut 1 440 min (1 jour) par défaut depuis pnpm 11**, et `pnpm install --frozen-lockfile` le réapplique à chaque entrée du lockfile : une version de moins de 24 h fait échouer l'install de la CI et du Dockerfile. Le cooldown par défaut de Dependabot (3 jours) couvre ses mises à jour de version, pas ses mises à jour de sécurité
- **Le champ `pnpm` ignoré ne fait pas échouer l'install** : pnpm l'annonce (`The "pnpm" field in package.json is no longer read by pnpm…`) puis installe quand même, le réglage est perdu sans erreur
- **Une transitive figée dans le lockfile ne se met à jour par aucune commande de mise à jour** : ni `overrides`, ni `pnpm update <pkg> --depth Infinity`, ni `pnpm dedupe`, ni `pnpm install --force/--lockfile-only/--fix-lockfile`. Seule une re-résolution complète (lockfile supprimé) la débloque, et elle remonte alors toutes les autres (vérifié le 2026-09-05 sur `vite@8.0.8`, passé à 8.2.2 en résolution fraîche)
- `onlyBuiltDependencies`, `neverBuiltDependencies` et `ignoredBuiltDependencies` sont supprimés depuis pnpm 11.0 : `allowBuilds` (map `package → boolean`, apparue en 10.26) les remplace tous
- **pnpm 12 transforme toute clé inconnue de `pnpm-workspace.yaml` en erreur** (`ERR_PNPM_UNRECOGNIZED_WORKSPACE_SETTINGS`) quand `packageManager` épingle la version qui tourne : n'y garder que des clés reconnues
- **`public-hoist-pattern` ne hisse rien par défaut depuis pnpm 10** (eslint/prettier inclus) : un package qui suppose un `node_modules` plat peut casser, `publicHoistPattern` se règle dans `pnpm-workspace.yaml`

## Exemples
```yaml
# ✅ pnpm-workspace.yaml — chaque dépendance à scripts listée, overrides commentés
allowBuilds:
  sharp: true
  prisma: true
  esbuild: false   # binaire fourni par @esbuild/<plateforme>
overrides:
  vite: ^8.2.2   # pourquoi, et quand le retirer
```

```json
// ❌ package.json — champ pnpm entier ignoré
{ "pnpm": { "allowBuilds": { "sharp": true } } }
```
