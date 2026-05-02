---
title: "pnpm — Package Manager"
version: "10.33.0"
description: "Référence technique pour pnpm 10 : installation, scripts, workspace et CI."
date: "2026-04-13"
keywords: ["pnpm", "package-manager", "monorepo", "nodejs"]
scope: ["docs"]
technologies: ["Node.js", "TypeScript", "Next.js"]
---

# Description

`pnpm` est le package manager utilisé dans le portfolio. Contrairement à npm/yarn, pnpm utilise un store content-addressable partagé et des symlinks, ce qui réduit drastiquement l'espace disque et le temps d'installation. En v10, les lifecycle scripts sont désactivés par défaut (sécurité supply-chain), nécessitant un opt-in explicite pour les packages qui en ont besoin.

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

---

## Lifecycle scripts désactivés (v10)

### Description

Depuis pnpm 10, les lifecycle scripts (`preinstall`, `install`, `postinstall`) sont désactivés par défaut pour bloquer les attaques supply-chain. Pour les autoriser sur des packages spécifiques, les lister dans `onlyBuiltDependencies` du `pnpm-workspace.yaml` ou utiliser `--allow-build`.

### Exemple

```yaml
# pnpm-workspace.yaml
packages:
  - '.'

onlyBuiltDependencies:
  - esbuild
  - @prisma/client
  - prisma
```

### Points Importants

- Protection contre les packages malveillants qui exécutent du code à l'install
- Les packages comme Prisma, esbuild ont besoin de leurs scripts (génération de client, binaires)
- `pnpm approve-builds` : commande interactive pour autoriser des builds
- Sans approbation, certains packages installent des binaires incomplets

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

- `pnpm <script>` fonctionne comme `pnpm run <script>` si le nom n'entre pas en conflit avec une commande pnpm
- `pnpm exec` lance sans préfixe `./node_modules/.bin/`
- `pnpm dlx` pour les CLIs one-shot (shadcn, create-next-app)
- Les scripts héritent des variables d'env du shell courant

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
# .github/workflows/ci.yml
- uses: pnpm/action-setup@v6
  with:
    version: 10
- run: pnpm install --frozen-lockfile
```

### Points Importants

- `--frozen-lockfile` est automatique en CI (variable `CI=true`)
- Protège contre les modifications involontaires du lockfile en pipeline
- Commit systématiquement `pnpm-lock.yaml`
- Pour régénérer le lockfile : `pnpm install --no-frozen-lockfile`

---

# Commandes Clés

## Activation via corepack

### Description

Méthode recommandée en 2026 pour installer/activer pnpm : via `corepack` (bundled avec Node.js 16.13+). `corepack use` écrit le champ `packageManager` dans `package.json` pour épingler la version au projet.

### Syntaxe

```bash
# Mettre à jour corepack (requis Node.js 16.13+)
npm install --global corepack@latest

# Activer pnpm via corepack
corepack enable pnpm

# Épingler la version pnpm dans le package.json du projet courant
corepack use pnpm@10.33.0
# → ajoute "packageManager": "pnpm@10.33.0" dans package.json

# Activer une version globalement (optionnel)
corepack prepare pnpm@10.33.0 --activate
```

### Points Importants

- Pas besoin d'installer pnpm globalement (`npm install -g pnpm`) : `corepack enable` suffit
- `corepack use` épingle la version au projet, garantit la reproductibilité entre développeurs et CI
- Le champ `packageManager` de `package.json` est lu par pnpm, npm, yarn et corepack

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
pnpm dlx shadcn@latest init
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
```

### Points Importants

- `-D` pour les outils de build, test, types (pas en prod)
- `-E` pour les versions sensibles (Next.js, React, Prisma)
- `pnpm update --latest` : ignore les contraintes semver (à utiliser avec précaution)
- Toujours vérifier les breaking changes après `update`

---

# Bonnes Pratiques

## ✅ Recommandations

- Utiliser pnpm 10+ pour bénéficier de la sécurité lifecycle scripts
- Committer `pnpm-lock.yaml` systématiquement
- Autoriser explicitement les builds nécessaires via `onlyBuiltDependencies`
- Utiliser `pnpm exec prisma` plutôt que `npx prisma` pour garantir la version du projet
- `pnpm dlx` pour les CLIs one-shot (shadcn, create-next-app)

## ❌ Anti-Patterns

- Ne pas activer `preserveSymlinks: true` dans tsconfig.json (casse la résolution des types)
- Ne pas activer `shamefullyHoist=true` (masque les dépendances transitives implicites)
- Ne pas utiliser `npx` dans un projet pnpm (risque de versions divergentes)
- Ne pas ignorer le warning sur les builds non approuvés
- Ne pas committer `node_modules/`

---

# 🔗 Ressources

## Documentation Officielle

- [pnpm : Site](https://pnpm.io)
- [CLI Reference](https://pnpm.io/pnpm-cli)
- [Continuous Integration](https://pnpm.io/continuous-integration)

## Ressources Complémentaires

- [pnpm v10 release](https://github.com/pnpm/pnpm/releases/tag/v10.0.0)
- [TypeScript + pnpm](https://pnpm.io/typescript)
