set minimum-version := "1.58.0"
set dotenv-load
set dotenv-required
set default-list
# Sans lui, un commentaire en corps de recette part au shell et s'affiche : check ne serait plus muet
set ignore-comments
# bash sur tous les OS (Git Bash sous Windows) : set windows-shell est deprecie depuis just 1.56
set shell := ["bash", "-cu"]
# Recettes [script] : un seul bash pour tout le corps, le sourcing de .env.test persiste entre les lignes
set script-interpreter := ["bash", "-eu"]

PORT := env("PORT", "3000")

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

# Lint ESLint sur src/ + formatage
[group('quality')]
lint:
    pnpm lint
    pnpm format:check
    pnpm prisma validate
    actionlint

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

# Lance tous les tests (unit + integration)
[group('quality')]
test: test-unit test-integration

# Tests unitaires (Vitest)
[group('quality')]
test-unit:
    pnpm vitest run --project unit

# Tests d'intégration (DB de test via .env.test s'il existe)
[group('quality')]
[script]
test-integration:
    if [ -f ./.env.test ]; then set -a && . ./.env.test && set +a; fi
    pnpm vitest run --project integration

# Tests en mode watch
[group('quality')]
[script]
test-watch:
    if [ -f ./.env.test ]; then set -a && . ./.env.test && set +a; fi
    pnpm test:watch

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

# Démarre Postgres + migrations pour la DB de test
[group('db')]
[script]
db-test:
    docker compose up -d --wait postgres
    set -a && . ./.env.test && set +a
    pnpm prisma migrate deploy

# Réinitialise la DB de test (drop, sans données)
[confirm('Cela va DROP la DB de test. Continuer ?')]
[group('db')]
[script]
db-test-reset:
    set -a && . ./.env.test && set +a
    pnpm prisma migrate reset --force

# Prisma Studio sur la DB de test
[group('db')]
[script]
db-test-studio:
    set -a && . ./.env.test && set +a
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
    @command -v node >/dev/null 2>&1 || echo "⚠️ Node requis (voir engines de package.json)"
    @command -v pnpm >/dev/null 2>&1 || echo "⚠️ pnpm requis (voir packageManager de package.json)"
    @command -v actionlint >/dev/null 2>&1 || echo "⚠️ actionlint requis pour just lint (winget install rhysd.actionlint)"
    @test -d node_modules || echo "⚠️ Dépendances absentes, lancer just install"
    @test -d .next/types || echo "⚠️ Types Next absents, lancer just install (postinstall les génère)"
    @[ -n "${DATABASE_URL:-}" ] || echo "⚠️ DATABASE_URL manquant dans .env"
    @[ -n "${NEXT_PUBLIC_SITE_URL:-}" ] || echo "⚠️ NEXT_PUBLIC_SITE_URL manquant dans .env"
    @docker info > /dev/null 2>&1 || echo "⚠️ Docker non disponible"
    @docker compose ps postgres --format json 2>/dev/null | grep -q '"Health":"healthy"' || echo "⚠️ PostgreSQL non accessible, lancer just db"
