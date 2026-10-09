---
title: "pnpm — Package Manager"
version: "11.28.2"
description: "Référence technique pour pnpm 11 : installation, builds autorisés, délai de publication, scripts et CI."
date: "2026-10-09"
keywords: ["pnpm", "package-manager", "monorepo", "nodejs", "supply-chain"]
scope: ["docs"]
technologies: ["Node.js", "TypeScript", "Next.js"]
---

# Description

`pnpm` est le package manager utilisé dans le portfolio. Contrairement à npm/yarn, pnpm utilise un store content-addressable partagé et des symlinks, ce qui réduit drastiquement l'espace disque et le temps d'installation. Depuis la v10, les lifecycle scripts sont désactivés par défaut ; la v11 (avril 2026) durcit encore la chaîne d'approvisionnement : une dépendance à scripts de build non déclarée fait échouer l'install, et une version publiée depuis moins d'un jour est refusée par défaut. Le projet est passé de 10.33.0 à 11.28.2 le 9 octobre 2026.

---

# Concepts Clés

## Store content-addressable

### Description

pnpm stocke chaque version de chaque package une seule fois dans un store global (~/.local/share/pnpm/store). Les projets référencent ces packages via des symlinks dans `node_modules`. Gain massif en espace disque quand plusieurs projets utilisent les mêmes dépendances. Contrepartie : certains outils buggent avec les symlinks (préserveSymlinks TypeScript).

### Exemple

```bash
pnpm store path      # affiche le chemin du store
pnpm store status    # vérifie l'intégrité du store
pnpm store prune     # supprime les packages non utilisés
```

### Points Importants

- Un seul téléchargement par version de package sur la machine
- Les symlinks créent un `node_modules` plus strict que npm (dépendances transitives non accessibles par défaut)
- `shamefullyHoist=true` simule le comportement npm plat (à éviter)
- Ne jamais activer `preserveSymlinks: true` dans tsconfig.json
- pnpm 11 passe le store en v11 (index SQLite) : les paquets absents sont re-téléchargés à la demande, sans action à mener

---

## Builds autorisés (`allowBuilds`, `strictDepBuilds`)

### Description

Depuis pnpm 10, les lifecycle scripts (`preinstall`, `install`, `postinstall`) des dépendances sont désactivés par défaut pour bloquer les attaques supply-chain. Ils s'autorisent dans `allowBuilds` du `pnpm-workspace.yaml` (map package → booléen, apparue en 10.26.0). pnpm 11 supprime les anciennes clés (`onlyBuiltDependencies`, `neverBuiltDependencies`, `ignoredBuiltDependencies`) et active **`strictDepBuilds`** : une dépendance à scripts de build absente de la liste ne se contente plus d'un warning, elle fait échouer l'install. Chaque dépendance concernée se déclare donc, à `true` si son script est nécessaire, à `false` si le projet s'en passe.

### Exemple

```yaml
# pnpm-workspace.yaml
# Chaque package est listé explicitement, les patterns glob ne sont pas supportés
allowBuilds:
  "@parcel/watcher": true
  "@prisma/engines": true
  "@swc/core": true
  esbuild: false   # binaire fourni par @esbuild/<plateforme>, script déjà ignoré en pnpm 10
  msw: true
  prisma: true
  sharp: true
  unrs-resolver: true
```

```bash
# Écrire les entrées sans prompt (pnpm 11)
pnpm approve-builds esbuild      # → esbuild: true
pnpm approve-builds '!esbuild'   # → esbuild: false
```

### Points Importants

- Protection contre les packages malveillants qui exécutent du code à l'install
- Prisma, sharp ou `@swc/core` ont besoin de leurs scripts (génération de client, binaires natifs)
- `esbuild` (tiré par Vite et tsx) n'en a pas besoin : son binaire arrive par un paquet optionnel par plateforme. Il a fallu le déclarer à `false` lors du passage en pnpm 11, l'install échouant sinon (`ERR_PNPM_IGNORED_BUILDS`)
- `pnpm install` lancé sans terminal (CI, agent) refuse de purger `node_modules` lors d'un changement de version majeure de pnpm (`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`) : le relancer avec `CI=true`

---

## Délai minimum de publication (`minimumReleaseAge`)

### Description

pnpm 11 refuse par défaut d'installer une version publiée depuis moins de 1 440 minutes (un jour), pour laisser le temps à un paquet compromis d'être détecté et retiré. Le réglage par défaut n'est pas strict pour la résolution : si aucune version de la plage n'a l'âge requis, pnpm retombe sur la plus récente. En revanche, `pnpm install --frozen-lockfile` réapplique la règle à chaque entrée du lockfile et échoue sur une entrée trop jeune.

### Exemple

```yaml
# pnpm-workspace.yaml — ce qu'écrit `pnpm add sentry@<version publiée hier>`
minimumReleaseAgeExclude:
  - '@sentry/nextjs@11.6.0'
```

```text
$ pnpm install --frozen-lockfile    # après retrait de l'exception, avant les 24 h
lucide-react@1.54.0 was published at 2026-10-09T06:11:00.000Z, within the minimumReleaseAge cutoff
The lockfile contains entries that the active policies reject.
```

### Points Importants

- `pnpm add` d'une version trop récente écrit seul des `minimumReleaseAgeExclude` (une entrée par paquet du même lot, `@sentry/*` en compte une quinzaine) : les retirer une fois le délai passé, puis vérifier par `pnpm install --frozen-lockfile`
- Constaté le 9 octobre 2026 : sans ces exceptions, l'install figée de la CI et du Dockerfile échoue tant que le lockfile contient une version de moins de 24 h
- Dependabot applique un cooldown par défaut de 3 jours aux mises à jour de version, ce qui couvre ce délai. Ses mises à jour de sécurité y échappent : une PR de sécurité vers une version publiée le jour même peut faire échouer la CI
- `minimumReleaseAgeStrict: true` (implicite dès qu'on pose `minimumReleaseAge` explicitement) fait échouer la résolution au lieu de retomber sur une version trop jeune

---

## Scripts et exécution

### Description

`pnpm run <script>` exécute un script défini dans `package.json`. `pnpm exec <command>` lance un binaire du `node_modules/.bin`. `pnpm dlx <package>` exécute un package sans l'installer comme dépendance (équivalent `npx`).

### Exemple

```bash
pnpm run dev              # next dev
pnpm run build            # next build
pnpm exec prisma migrate dev
pnpm dlx shadcn@latest add button
```

### Points Importants

- `pnpm <script>` fonctionne comme `pnpm run <script>` si le nom n'entre pas en conflit avec une commande pnpm. Depuis pnpm 11, un script nommé `clean`, `setup`, `deploy` ou `rebuild` masque la commande intégrée (`pnpm pm <nom>` pour l'atteindre)
- `pnpm exec` lance sans préfixe `./node_modules/.bin/`
- `pnpm dlx` pour les CLIs one-shot (shadcn, create-next-app)
- Les scripts héritent des variables d'env du shell courant. Les réglages pnpm passés par variable s'écrivent `pnpm_config_*` depuis la v11 (`npm_config_*` n'est plus lu)

---

## Frozen lockfile en CI

### Description

Pour garantir la reproductibilité des builds, `pnpm install --frozen-lockfile` échoue si le lockfile est désynchronisé. Automatique en CI (détection de la variable `CI=true`), manuel en local.

### Exemple

```bash
# Local : lockfile mis à jour automatiquement
pnpm install

# CI : échoue si lockfile désync
pnpm install --frozen-lockfile
```

```yaml
# .github/workflows/ci.yml — sans `version:`, lue dans `packageManager`
- uses: pnpm/action-setup@<sha> # vX.Y.Z
- run: pnpm install --frozen-lockfile
```

### Points Importants

- `--frozen-lockfile` est automatique en CI (variable `CI=true`)
- Protège contre les modifications involontaires du lockfile en pipeline
- Commit systématiquement `pnpm-lock.yaml`
- Pour régénérer le lockfile : `pnpm install --no-frozen-lockfile` (la forme `--frozen-lockfile false` disparaît en pnpm 12)
- Le lockfile reste en `lockfileVersion: '9.0'` de pnpm 9 à 12 : le passage en pnpm 11 n'a demandé aucune régénération

---

# Commandes Clés

## Activation via corepack

### Description

Méthode recommandée pour installer/activer pnpm : via `corepack`, distribué avec Node.js jusqu'à la ligne 24 incluse (à installer par `npm install -g corepack` à partir de Node 25). `corepack use` écrit le champ `packageManager` dans `package.json`, avec le hash de la version, pour l'épingler au projet.

### Syntaxe

```bash
# Activer pnpm via corepack
corepack enable pnpm

# Épingler la version pnpm dans le package.json du projet courant
corepack use pnpm@11.28.2
# → "packageManager": "pnpm@11.28.2+sha512.<hash>" dans package.json

# Activer une version globalement (optionnel)
corepack prepare pnpm@11.28.2 --activate
```

### Points Importants

- Pas besoin d'installer pnpm globalement (`npm install -g pnpm`) : `corepack enable` suffit
- `corepack use` épingle la version au projet, garantit la reproductibilité entre développeurs, Dockerfile et CI
- Le champ `packageManager` de `package.json` est lu par pnpm, `pnpm/action-setup` et corepack. pnpm 11 remplace `managePackageManagerVersions` et `packageManagerStrict*` par `pmOnFail`
- pnpm 12 (binaire natif en Rust) est écarté tant que Dependabot ne le supporte pas, et des échecs Corepack + pnpm 12 ont été rapportés avec d'anciens Corepack (`docs/VERSIONS.md` § Montées Bloquées)

---

## Initialisation de projet

### Description

Création d'un nouveau `package.json` via `pnpm init`. En pratique, on utilise plutôt `pnpm dlx create-next-app` directement (scaffolding complet) ou `pnpm init --bare` pour un projet minimal.

### Syntaxe

```bash
# Init standard (package.json avec prompts)
pnpm init

# Init minimal sans prompts, ESM, épingle pnpm
pnpm init --bare --init-type module --init-package-manager

# Scaffolding one-shot via dlx (pas d'installation pnpm globale)
pnpm dlx create-next-app@latest my-app
pnpm dlx shadcn@latest init -t next -b radix
```

### Points Importants

- `--bare` (v10.25.0+) crée un `package.json` minimal sans prompts interactifs
- `--init-type module` impose ESM (recommandé pour Next.js 16 + Prisma 7)
- `--init-package-manager` ajoute `packageManager: pnpm@X.Y.Z` (équivalent à `corepack use pnpm@...`)
- `pnpm dlx` est l'équivalent de `npx` : exécute un package sans l'installer en dépendance

---

## Installation et ajout de dépendances

### Description

Les opérations courantes de gestion des dépendances : installer toutes les deps, ajouter/supprimer un package, passer en dev ou peer dep.

### Syntaxe

```bash
pnpm install                          # installe toutes les deps du package.json
pnpm add <package>                    # ajoute en dependencies
pnpm add -D <package>                 # ajoute en devDependencies
pnpm add -E <package>                 # version exacte (sans ^ ou ~)
pnpm remove <package>                 # supprime une dép
pnpm update <package>                 # met à jour vers la dernière version compatible
pnpm outdated                         # liste les deps obsolètes
pnpm peers check                      # liste les peers non satisfaites (pnpm 11)
```

### Points Importants

- `-D` pour les outils de build, test, types (pas en prod)
- `-E` pour les versions sensibles (Next.js, React, Prisma)
- `pnpm update --latest` : ignore les contraintes semver (à utiliser avec précaution : il tirerait aussi les rc publiées sur `latest`, comme Prisma 8)
- Toujours vérifier les breaking changes après `update`
- `pnpm peers check` signale les peers déclarées par `eslint-plugin-react`, `-import` et `-jsx-a11y` (ESLint <= 9) : attendu sous ESLint 10, `eslint-config-next` les patche

---

# Bonnes Pratiques

## ✅ Recommandations

- Committer `pnpm-lock.yaml` systématiquement
- Déclarer dans `allowBuilds` chaque dépendance à scripts de build, à `true` ou `false`, sans attendre l'échec de l'install
- Retirer les `minimumReleaseAgeExclude` une fois les 24 h passées
- Utiliser `pnpm exec prisma` plutôt que `npx prisma` pour garantir la version du projet
- `pnpm dlx` pour les CLIs one-shot (shadcn, create-next-app)
- Mettre les réglages pnpm dans `pnpm-workspace.yaml` : depuis la v11, `.npmrc` ne porte plus que le registre et l'authentification

## ❌ Anti-Patterns

- Ne pas activer `preserveSymlinks: true` dans tsconfig.json (casse la résolution des types)
- Ne pas activer `shamefullyHoist=true` (masque les dépendances transitives implicites)
- Ne pas utiliser `npx` dans un projet pnpm (risque de versions divergentes)
- Ne pas laisser une version de moins de 24 h dans le lockfile poussé : la CI et le Dockerfile échoueraient
- Ne pas passer `version:` à `pnpm/action-setup` : un second pin diverge de `packageManager` au premier bump
- Ne pas committer `node_modules/`

---

# 🔗 Ressources

## Documentation Officielle

- [pnpm : Site](https://pnpm.io)
- [CLI Reference](https://pnpm.io/pnpm-cli)
- [Migration v10 → v11](https://pnpm.io/migration)
- [Settings : dependency resolution (`minimumReleaseAge`)](https://pnpm.io/settings/dependency-resolution)
- [Continuous Integration](https://pnpm.io/continuous-integration)

## Ressources Complémentaires

- [pnpm 11.0 release](https://pnpm.io/blog/releases/11.0)
- [TypeScript + pnpm](https://pnpm.io/typescript)
