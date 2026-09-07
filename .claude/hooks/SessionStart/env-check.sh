#!/usr/bin/env bash

# En premier : plusieurs bash.exe cohabitent sous Windows, celui de Git et le lanceur WSL de
# System32. `just` prend le premier du PATH Windows, et si c'est WSL aucune recette ne démarre.
# À tester avant tout le reste : l'échec (`execvpe(/bin/bash) failed`) ne dit pas pourquoi.
if command -v where.exe &> /dev/null; then
  FIRST_BASH="$(where.exe bash 2> /dev/null | head -1 | tr -d '\r')"
  case "$FIRST_BASH" in
    *System32* | *WindowsApps*)
      echo "⚠️  bash résout vers '$FIRST_BASH' (lanceur WSL) : placer 'C:\\Program Files\\Git\\bin' avant System32 dans le PATH, sinon aucune recette just ne s'exécute"
      exit 0
      ;;
  esac
fi

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
STATUS=$?

# `check` ne signale jamais rien de lui-même : un code non nul veut dire que just n'a pas pu
# l'exécuter. Sans ce garde, l'échec passerait pour un environnement sain.
if [ "$STATUS" -ne 0 ]; then
  echo "⚠️  just check a échoué (code $STATUS), l'environnement n'a pas été diagnostiqué :"
  echo "$OUTPUT"
  exit 0
fi

WARNINGS=$(echo "$OUTPUT" | grep "⚠️" || true)

# Affiche le diagnostic à l'utilisateur (lu dans le transcript)
echo "$OUTPUT"

# Si warnings détectés, injecte une instruction impérative à Claude via additionalContext
if [ -n "$WARNINGS" ]; then
  jq -n --arg ctx "⚠️ ENV-CHECK REPORT: certains services ne sont pas opérationnels.

$WARNINGS

AVANT d'exécuter TOUTE tâche touchant DB/Prisma/Docker/infra, tu DOIS :
1. Énumérer les blocages à l'utilisateur
2. Proposer les actions correctives (just db, cp .env.example .env, etc. ; just docker-up réservé validation image)
3. Attendre confirmation avant de lancer la tâche

Si la tâche ne touche pas DB/infra (doc, UI, refactor), signaler les warnings et continuer." '{
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: $ctx
    }
  }'
fi

exit 0
