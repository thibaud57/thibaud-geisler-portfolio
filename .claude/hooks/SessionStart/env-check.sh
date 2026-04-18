#!/usr/bin/env bash

# Check just installé
if ! command -v just &> /dev/null; then
  echo "⚠️  just non installé (voir https://just.systems/man/en/packages.html)"
  exit 0
fi

# Check .env présent (requis par dotenv-required du Justfile)
if [ ! -f .env ]; then
  echo "⚠️  .env manquant (cp .env.example .env puis remplir les secrets)"
  exit 0
fi

# Délégation à just check (Node, pnpm, Docker, Postgres)
just check

exit 0
