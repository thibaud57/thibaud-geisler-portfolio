set dotenv-load
set dotenv-required
set windows-shell := ["bash", "-cu"]

PORT := env("PORT", "3000")
DOTENV_TEST := "set -a && . ./.env.test && set +a"
DOTENV_TEST_OPT := "if [ -f ./.env.test ]; then set -a && . ./.env.test && set +a; fi"

default:
    @just --list

# ── Dev ───────────────────────────────────────────────────────────────────────

# Démarre le serveur Next.js (port $PORT, 3000 par défaut)
[group('dev')]
dev:
    pnpm dev

# Arrête le serveur Next.js (Windows libère le port $PORT, Unix tue le process `next dev`)
[group('dev')]
[windows]
stop:
    @powershell -Command "Get-NetTCPConnection -LocalPort {{PORT}} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"

[group('dev')]
[unix]
stop:
    @pkill -f "next dev" || true

# ── Quality ───────────────────────────────────────────────────────────────────

# Build de production Next.js
[group('quality')]
build:
    pnpm build

# Lint ESLint sur src/
[group('quality')]
lint:
    pnpm lint

# Vérifie les types (typegen Next.js + tsc)
[group('quality')]
typecheck:
    pnpm next typegen
    pnpm typecheck

# Lance tous les tests (unit + integration)
[group('quality')]
test: test-unit test-integration

# Tests unitaires (Vitest)
[group('quality')]
test-unit:
    pnpm vitest run --project unit --passWithNoTests

# Tests d'intégration (DB de test)
[group('quality')]
test-integration:
    @{{DOTENV_TEST_OPT}} && pnpm vitest run --project integration --no-file-parallelism

# Tests en mode watch
[group('quality')]
test-watch:
    @{{DOTENV_TEST_OPT}} && pnpm test:watch

# ── Infrastructure ────────────────────────────────────────────────────────────

# Démarre les services Docker (profil validation)
[group('infra')]
docker-up:
    docker compose --profile validation up -d

# Arrête les services Docker
[group('infra')]
docker-down:
    docker compose down

# ── Database ──────────────────────────────────────────────────────────────────

# Crée et applique une migration Prisma
[group('db')]
db-migrate LABEL:
    pnpm prisma migrate dev --name {{LABEL}}

# Réinitialise la DB de dev (drop + recreate + migrate + seed)
[group('db')]
[confirm('Cela va DROP la DB de dev. Continuer ?')]
db-reset:
    pnpm prisma migrate reset --force

# Ouvre Prisma Studio (http://localhost:5555)
[group('db')]
db-studio:
    pnpm prisma studio

# Démarre Postgres + applique les migrations (DB prête)
[group('db')]
db:
    docker compose up -d --wait postgres
    pnpm prisma migrate deploy

# Insère les données de seed
[group('db')]
seed:
    pnpm prisma db seed

# Démarre Postgres + migrations pour la DB de test
[group('db')]
db-test:
    docker compose up -d --wait postgres
    @{{DOTENV_TEST}} && pnpm prisma migrate deploy

# Réinitialise la DB de test (drop, sans seed)
[group('db')]
[confirm('Cela va DROP la DB de test. Continuer ?')]
db-test-reset:
    @{{DOTENV_TEST}} && pnpm prisma migrate reset --force --skip-seed

# Prisma Studio sur la DB de test
[group('db')]
db-test-studio:
    @{{DOTENV_TEST}} && pnpm prisma studio

# ── Setup ─────────────────────────────────────────────────────────────────────

# Installe les dépendances (pnpm)
[group('setup')]
install:
    pnpm install

# Bootstrap complet (install + DB + seed)
[group('setup')]
setup: install db seed

# Diagnostique l'environnement local
[group('setup')]
check:
    @echo "→ Node.js: $(node --version)"
    @echo "→ pnpm: $(pnpm --version)"
    @docker info > /dev/null 2>&1 && echo "✓ Docker opérationnel" || echo "⚠️  Docker non disponible"
    @test -f .env && echo "✓ .env présent" || echo "⚠️  .env manquant (copier .env.example)"
    @docker compose ps postgres --format json 2>/dev/null | grep -q '"Health":"healthy"' && echo "✓ PostgreSQL accessible" || echo "⚠️  PostgreSQL non accessible (just db)"
