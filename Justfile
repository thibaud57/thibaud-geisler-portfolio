set dotenv-load := true
set dotenv-required := true
set windows-shell := ["bash", "-cu"]

PORT := env("PORT", "3000")
DOTENV_TEST := "set -a && . ./.env.test && set +a"

default:
    @just --list

# ─── Dev ─────────────────────────────────────────────────────────────
[group('dev')]
dev:
    pnpm dev

[group('dev')]
[windows]
stop:
    @powershell -Command "Get-NetTCPConnection -LocalPort {{PORT}} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"

[group('dev')]
[unix]
stop:
    @pkill -f "next dev" || true

# ─── Quality ─────────────────────────────────────────────────────────
[group('quality')]
build:
    pnpm build

[group('quality')]
lint:
    pnpm lint

[group('quality')]
typecheck:
    pnpm next typegen
    pnpm typecheck

[group('quality')]
test: test-unit test-integration

[group('quality')]
test-unit:
    pnpm vitest run --exclude "**/*.integration.test.{ts,tsx}" --passWithNoTests

[group('quality')]
test-integration:
    pnpm vitest run integration.test

[group('quality')]
test-watch:
    pnpm test:watch

# ─── Infrastructure ──────────────────────────────────────────────────
[group('infra')]
docker-up:
    docker compose up -d

[group('infra')]
docker-down:
    docker compose down

# ─── Database ────────────────────────────────────────────────────────
[group('db')]
db-migrate LABEL:
    pnpm prisma migrate dev --name {{LABEL}}

[group('db')]
[confirm('Cela va DROP la DB de dev. Continuer ?')]
db-reset:
    pnpm prisma migrate reset --force

[group('db')]
db-studio:
    pnpm prisma studio

[group('db')]
db:
    docker compose up -d --wait postgres
    pnpm prisma migrate deploy

[group('db')]
seed:
    pnpm prisma db seed

[group('db')]
db-test:
    docker compose up -d --wait postgres
    @{{DOTENV_TEST}} && pnpm prisma migrate deploy

[group('db')]
[confirm('Cela va DROP la DB de test. Continuer ?')]
db-test-reset:
    @{{DOTENV_TEST}} && pnpm prisma migrate reset --force --skip-seed

[group('db')]
db-test-studio:
    @{{DOTENV_TEST}} && pnpm prisma studio

# ─── Setup ───────────────────────────────────────────────────────────
[group('setup')]
install:
    pnpm install

[group('setup')]
setup: install db

[group('setup')]
check:
    @echo "→ Node.js: $(node --version)"
    @echo "→ pnpm: $(pnpm --version)"
    @docker info > /dev/null 2>&1 && echo "✓ Docker opérationnel" || echo "⚠️  Docker non disponible"
    @test -f .env && echo "✓ .env présent" || echo "⚠️  .env manquant (copier .env.example)"
    @docker compose ps postgres --format json 2>/dev/null | grep -q '"Health":"healthy"' && echo "✓ PostgreSQL accessible" || echo "⚠️  PostgreSQL non accessible (just docker-up)"
