---
name: dev-server
description: Démarre ou arrête l'application Next.js en local. Appelle `just dev` pour lancer le serveur en arrière-plan sur le port 3000, ou `just stop` pour libérer le port. À invoquer quand l'utilisateur demande de démarrer, tuer, relancer, ou voir l'app en local.
allowed-tools: Bash(just dev), Bash(just stop)
---

# dev-server - Démarrage et arrêt du serveur Next.js

Ta mission est de démarrer ou arrêter le serveur Next.js local selon l'intention de l'utilisateur.

## Input

L'utilisateur précise : **démarrer** (dev) ou **arrêter** (stop). Si ambigu, demander.

## Workflow

### Démarrer

1. Lancer `just dev` en arrière-plan (`run_in_background: true`)
2. Attendre que le serveur soit prêt (chercher `Ready` dans stdout)
3. Afficher l'URL `http://localhost:3000` + rappel commande d'arrêt `just stop`

### Arrêter

1. Lancer `just stop` (Windows: PowerShell kill par port, Unix: `pkill -f "next dev"`)
2. Confirmer la libération du port 3000

## Règles

- `just dev` toujours en background, jamais bloquant
- Une seule instance à la fois. Si port déjà occupé, suggérer `just stop` avant de relancer
- Ne jamais tuer d'autre process que `next dev` (la recette `stop` est scopée au port 3000 / process name)
