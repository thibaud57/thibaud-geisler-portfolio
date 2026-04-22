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

# Diagnostic complet (Node, pnpm, Docker, Postgres) via just check
OUTPUT=$(just check 2>&1)
WARNINGS=$(echo "$OUTPUT" | grep "⚠️" || true)

# Affiche le diagnostic à l'utilisateur (lu dans le transcript)
echo "$OUTPUT"

# Si warnings détectés, injecte une instruction impérative à Claude via additionalContext
if [ -n "$WARNINGS" ]; then
  jq -n --arg ctx "⚠️ ENV-CHECK REPORT: certains services ne sont pas opérationnels.

$WARNINGS

AVANT d'exécuter TOUTE tâche touchant DB/Prisma/Docker/infra, tu DOIS :
1. Énumérer les blocages à l'utilisateur
2. Proposer les actions correctives (just docker-up, cp .env.example .env, etc.)
3. Attendre confirmation avant de lancer la tâche

Si la tâche ne touche pas DB/infra (doc, UI, refactor), signaler les warnings et continuer." '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: $ctx
    }
  }'
fi

exit 0
