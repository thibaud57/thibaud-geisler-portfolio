## Contexte

Les fiches de révision techniques disponibles en ligne sont souvent trop généralistes, trop verbeuses, ou rapidement obsolètes. Pour un dev mid/senior, relire une doc officielle ou un tutoriel débutant est une perte de temps.

**Objectif** : automatiser la création et la mise à jour de fiches de révision techniques de qualité professionnelle via un skill Claude Code et un workflow de génération batch avec audit multi-couche (format, exactitude technique, cohérence cross-leçons).

**Mon rôle** : conception complète du système (skill, workflow batch, agents d'audit).

## Réalisations marquantes

### Skill `prof` : création et mise à jour d'une leçon

Skill Claude Code qui génère une fiche de révision dense pour une techno donnée, à partir d'un titre et d'une liste de concepts. Valide les concepts, fait de la recherche web sur les versions stables et breaking changes, structure les chapitres dans l'ordre pédagogique, puis demande validation avant écriture.

**Défis techniques** : garantir la densité (pas trop court, pas trop long) sans redondance entre leçons, rester à jour sur les breaking changes et dépréciations à chaque génération, calibrer les limites de format pour une lecture fluide.

**Solutions** : matrice anti-redondance définie dans les plans pédagogiques, web research ciblé systématique avant écriture, validation utilisateur bloquante avant toute écriture, dépréciations marquées explicitement.

### `/create-lesson` : génération batch depuis un plan

Commande slash qui orchestre la création de N leçons en parallèle à partir d'un fichier plan pédagogique. 5 phases : rédaction → audit individuel → audit cohérence → consolidation index → rapport.

**Défis techniques** : coordination d'agents parallèles avec gestion des erreurs partielles, cohérence cross-leçons (versions, dépréciations, redondances), écriture atomique de l'index sans conflits.

**Solutions** : writers lancés en parallèle (erreurs isolées par leçon), un seul audit de cohérence sur tout le batch, consolidation de l'index en fin de pipeline pour éviter les conflits.

### Audit qualité multi-couche

Deux agents d'audit complémentaires : `lesson/auditor` (format + exactitude technique par leçon) et `lesson/coherence-auditor` (cohérence cross-leçons). Sortie structurée séparant blocages et recommandations.

**Défis techniques** : vérifier l'exactitude technique (APIs, versions) sans générer de faux positifs, détecter les doublons de traitement entre toutes les leçons existantes.

**Solutions** : auditor individuel avec lecture + web search sur la doc officielle, coherence-auditor en lecture seule s'appuyant sur le plan pédagogique pour identifier les concepts canoniques.

## Résultats

- Corpus de leçons denses maintenues à jour (versions, breaking changes, dépréciations) sur plusieurs technos backend, frontend et fondamentaux
- Couverture calibrée mid/senior : pas de rappels débutants, focus patterns modernes et pièges
- Architecture extensible : ajout d'une nouvelle techno via un plan pédagogique, sans toucher au skill

## Apprentissages

- Orchestration d'agents Claude (parallélisme, checkpoints, consolidation atomique)
- Conception de prompts système denses et contraignants
- Design de workflows multi-étapes avec quality gates
- Structuration pédagogique de contenus techniques complexes
- La matrice anti-redondance dans les plans est critique pour des leçons denses sans répétition
