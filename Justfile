set minimum-version := "1.58.0"
set dotenv-load
set dotenv-required
set default-list
# Sans lui, un commentaire en corps de recette part au shell et s'affiche : check ne serait plus muet
set ignore-comments
# bash sur tous les OS (Git Bash sous Windows) : set windows-shell est deprecie depuis just 1.56
set shell := ["bash", "-cu"]
# Recettes [script] : un seul bash pour tout le corps
set script-interpreter := ["bash", "-eu"]

PORT := env("PORT", "3000")
ZIZMOR_VERSION := "1.32.0"

# ── Dev ───────────────────────────────────────────────────────────────────────

# Démarre le serveur Next.js (PORT, 3000 par défaut)
[group('dev')]
dev:
    pnpm dev

# Arrête le serveur Next.js
[group('dev')]
[windows]
stop:
    # `//` : depuis Git Bash, MSYS convertirait `/PID` en chemin Windows
    -netstat -ano | awk '/:{{ PORT }} .*LISTENING/ {print $NF}' | sort -u | xargs -r -I{} taskkill //PID {} //T //F

# Arrête le serveur Next.js
[group('dev')]
[unix]
stop:
    -pkill -f "next dev"

# Crée une session admin de dev sans Google et écrit son cookie au format curl dans FILE
[group('dev')]
dev-login FILE:
    # react-server : auth.ts importe server-only, qui lève hors d'un Server Component et se résout en module vide sous cette condition
    pnpm exec tsx --conditions=react-server scripts/dev-login.ts {{ FILE }}

# ── Quality ───────────────────────────────────────────────────────────────────

# Build de production Next.js
[group('quality')]
build:
    pnpm build

# Lint des workflows GitHub Actions (actionlint puis zizmor)
[group('quality')]
lint-workflows:
    actionlint
    GH_TOKEN="${GH_TOKEN:-$(gh auth token)}" uvx zizmor@{{ ZIZMOR_VERSION }} .

# Lint ESLint sur src/ + formatage + schéma Prisma + workflows
[group('quality')]
lint: lint-workflows
    pnpm lint
    pnpm format:check
    pnpm prisma validate

# Reformate tout le depot
[group('quality')]
format:
    pnpm format
    pnpm prisma format

# Vérifie les types (typegen Next.js + tsc)
[group('quality')]
typecheck:
    pnpm typecheck

# Vulnérabilités des dépendances (même seuil que la CI, qui ne bloque pas)
[group('quality')]
audit:
    pnpm audit --audit-level=high

# Tous les projets Vitest ensemble, couverture fusionnée : plancher de 80 % (lignes et branches), anti-régression
[group('quality')]
test:
    pnpm vitest run --coverage --coverage.thresholds.lines=80 --coverage.thresholds.branches=80

# Tests unitaires (Vitest) : composants et lib en jsdom, code serveur en Node
[group('quality')]
test-unit:
    pnpm vitest run --project unit --project server

# Tests d'intégration : la suite recrée sa base <base de dev>_test (voir vitest.global-setup.ts)
[group('quality')]
test-integration:
    pnpm vitest run --project integration

# Tests en mode watch
[group('quality')]
test-watch:
    pnpm test:watch

# Un scénario de la recette /verify contre l'app lancée par just dev (ex : just verify prospection)
[group('quality')]
verify parcours *ARGS:
    node .claude/skills/verify/scripts/{{ parcours }}.mjs {{ ARGS }}

# Tous les scénarios de /verify à la suite (écrit dans la base de dev sous un préfixe de passage, puis nettoie)
[group('quality')]
verify-all:
    node .claude/skills/verify/scripts/run_all.mjs

# ── Infrastructure ────────────────────────────────────────────────────────────

# Démarre les services Docker (profil validation)
[group('infra')]
docker-up:
    docker compose --profile validation up -d

# Arrête les services Docker
[group('infra')]
docker-down:
    docker compose down

# ── DB ────────────────────────────────────────────────────────────────────────

# Démarre Postgres + applique les migrations (DB prête, idempotent)
[group('db')]
db:
    docker compose up -d --wait postgres
    pnpm prisma migrate deploy

# Crée et applique une migration Prisma
[group('db')]
db-migrate LABEL:
    pnpm prisma migrate dev --name {{ LABEL }}

# Réinitialise la DB de dev (drop + recreate + migrate, sans données : just db-restore ensuite)
[confirm('Cela va DROP la DB de dev. Continuer ?')]
[group('db')]
db-reset:
    pnpm prisma migrate reset --force

# Dump des données de la DB de dev (tout sauf le schéma auth), dans dumps/ ignoré par git
[group('db')]
[script]
db-dump:
    mkdir -p dumps
    docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d portfolio_dev -Fc --data-only --exclude-schema=auth' > "dumps/portfolio_dev-$(date +%Y%m%d-%H%M%S).dump"
    ls -1t dumps | head -1

# Restaure un dump dans la DB de dev, à lancer sur une base vidée par just db-reset
[group('db')]
db-restore FILE:
    docker compose exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d portfolio_dev --data-only --disable-triggers' < "{{ FILE }}"

# Ouvre Prisma Studio (http://localhost:5555)
[group('db')]
db-studio:
    pnpm prisma studio

# ── Setup ─────────────────────────────────────────────────────────────────────

# Installe les dépendances (pnpm)
[group('setup')]
install:
    pnpm install

# Setup complet : dépendances, base prête. Les données de dev : just db-restore <dump>
[group('setup')]
setup: install db

# Vérifie que l'environnement local est prêt : sortie vide = rien à signaler
[group('setup')]
check:
    @command -v node >/dev/null 2>&1 || echo "⚠️ Node requis (voir devEngines de package.json)"
    @command -v pnpm >/dev/null 2>&1 || echo "⚠️ pnpm requis (voir devEngines de package.json)"
    @command -v actionlint >/dev/null 2>&1 || echo "⚠️ actionlint requis pour just lint (winget install rhysd.actionlint)"
    @command -v uv >/dev/null 2>&1 || echo "⚠️ uv requis pour just lint (zizmor via uvx, winget install astral-sh.uv)"
    @test -d node_modules || echo "⚠️ Dépendances absentes, lancer just install"
    @test -d .next/types || echo "⚠️ Types Next absents, lancer just install (postinstall les génère)"
    @[ -n "${DATABASE_URL:-}" ] || echo "⚠️ DATABASE_URL manquant dans .env"
    @[ -n "${NEXT_PUBLIC_SITE_URL:-}" ] || echo "⚠️ NEXT_PUBLIC_SITE_URL manquant dans .env"
    @docker info > /dev/null 2>&1 || echo "⚠️ Docker non disponible"
    @docker compose ps postgres --format json 2>/dev/null | grep -q '"Health":"healthy"' || echo "⚠️ PostgreSQL non accessible, lancer just db"
