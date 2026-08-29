---
title: "ADR-021 — Notion remplacé par PostgreSQL"
status: "accepted"
description: "Décision actée : migration du CRM, de la comptabilité et des publications de Notion vers PostgreSQL, domaine par domaine"
date: "2026-08-29"
keywords: ["architecture", "adr", "notion", "postgresql", "crm", "comptabilite", "migration"]
scope: ["docs", "architecture"]
technologies: ["PostgreSQL", "Prisma", "Notion", "Claude Code"]
---

# 🎯 Contexte

L'activité freelance est aujourd'hui pilotée depuis un workspace Notion, via un dépôt d'orchestration Claude Code (`freelance-toolkit`). Ce dépôt ne contient **aucun code exécutable** : 87 fichiers markdown de skills, commandes et agents, 14 fichiers JSON qui sont des schémas descriptifs de bases Notion, et des assets de carrousel. Son propre `CLAUDE.md` l'énonce : « Source de vérité = Notion. Ce repo = couche d'orchestration IA au-dessus du workspace Notion. »

Quatorze bases Notion sont concernées : cinq pour le CRM (entreprises, prospects, actions, contacts, revues hebdomadaires), trois pour la comptabilité (facturation, déclarations sociales, déclarations de TVA), plus les publications, les entretiens, les chantiers, les comptes rendus d'activité et les projets.

L'usage a été assumé comme une phase de validation. L'espace admin lui succède.

---

# 🧩 Problème

Notion reste-t-il la source de vérité, et si non, comment migrer sans interrompre l'activité ?

---

# 🛠️ Options Envisagées

## Option A : Notion reste maître, l'espace admin est un miroir

**Description :** Une synchronisation Notion vers PostgreSQL alimente un espace admin en lecture seule.

**Avantages :**
- Aucune migration de données
- L'édition mobile de Notion est conservée

**Inconvénients :**
- Deux sources de vérité à réconcilier
- L'espace admin perd tout intérêt : on ne peut rien y faire
- Les règles métier restent inapplicables (la numérotation légale des factures dépend de la vigilance, pas d'une contrainte)

**Coût estimé :** Faible, pour une valeur faible

## Option B : PostgreSQL devient la source de vérité, migration en une fois

**Description :** Les quatorze bases migrent ensemble, Notion est abandonné.

**Avantages :**
- Bascule nette, pas de période à deux systèmes

**Inconvénients :**
- Chantier long avant toute mise en service
- Aucun retour d'usage avant la fin
- Risque concentré sur la comptabilité, la partie la moins tolérante à l'erreur

**Coût estimé :** Élevé, avec un risque concentré

## Option C : PostgreSQL source de vérité, migration par domaine

**Description :** Un domaine à la fois, utilisable dès qu'il est migré. Notion reste en place pour les autres pendant la transition.

**Avantages :**
- Valeur livrée à chaque étape
- Le risque est isolé domaine par domaine
- Les enseignements du premier domaine servent aux suivants

**Inconvénients :**
- Période de cohabitation entre les deux systèmes
- Discipline nécessaire pour ne pas laisser un domaine à moitié migré

**Coût estimé :** Modéré, étalé

---

# 🎉 Décision

**Option C actée : PostgreSQL devient la source de vérité, migration par domaine.**

Ordre retenu :

1. **Comptabilité.** Calculs purs, peu d'édition en mobilité, et c'est là que la base apporte le plus : numérotation séquentielle légale garantie par une contrainte transactionnelle, agrégats de TVA et de cotisations instantanés et exacts. Peu de risque, valeur immédiate.
2. **Publications LinkedIn.** Peu de relations, beaucoup de calcul (médiane, ratio d'engagement). Les tokens de design des carrousels sont déjà en convention shadcn, réutilisables tels quels.
3. **CRM.** Le plus relationnel, le plus consulté en déplacement, et celui dont le contenu ne se réduit pas à des colonnes : les fiches prospect portent des sections markdown structurées (`Signal`, `Hypothèse`, `Timeline`) qui demandent une modélisation explicite, champ texte ou tables filles.

**Les quatorze schémas JSON constituent une spécification Prisma quasi directe** : types, énumérations complètes, relations et cardinalités déjà tranchés, y compris l'unidirectionnalité.

**Règle attenante :** la grille de qualification, les calculs de cotisations et de TVA et les indicateurs hebdomadaires, aujourd'hui appliqués par des agents, redeviennent du code, conformément à [ADR-020](020-portfolio-bff.md).

---

# 🔄 Conséquences

## Positives

- Les règles métier deviennent applicables par la base : numérotation continue, unicité, intégrité référentielle
- Les indicateurs sont des agrégats SQL exacts et instantanés, au lieu de sept requêtes parallèles
- Publication et consultation depuis n'importe quel appareil, sans dépendance à un service tiers
- Le scoring et la comptabilité cessent de consommer des appels de modèle

## Négatives

- **L'espace admin doit être responsive dès sa conception**, puisqu'il remplace un outil utilisé en mobilité. Conventions dans [DESIGN.md](../DESIGN.md) § Responsive
- Les quinze commandes Claude Code du `freelance-toolkit` devront être recâblées sur PostgreSQL ou remplacées par les écrans
- Période de cohabitation à discipliner

---

# 📝 Notes complémentaires

**Ce qui reste dans Claude Code.** Les rituels conversationnels (revue hebdomadaire qualitative, comptes rendus d'activité, préparation d'entretiens) tirent leur valeur du dialogue adaptatif. Les transformer en formulaires les viderait de leur intérêt. Ils restent où ils sont.

**Le corpus de règles métier reste précieux** : environ deux mille lignes de références (grille de qualification, séquences de prospection, ligne éditoriale, anti-patterns). Elles se migrent, ne se recopient pas : les seuils et taux vont dans un module de configuration unique, jamais dupliqués entre le portfolio et les services. Le principe « un fait, un fichier propriétaire » du `freelance-toolkit` reste valable, et son avertissement aussi : une valeur recopiée produit un comportement faux sans jamais planter.

**Données personnelles de tiers.** Le fichier `dentsu.md` et les bases Contacts, Prospects et Entreprises contiennent des données nominatives de tiers, dont des adresses électroniques et du profilage d'équipe cliente. Leur migration vers une base applicative exposée impose de mettre à jour le [registre des traitements](../registre-traitements.md) et la politique de confidentialité. Le profilage d'équipe cliente ne doit pas être migré.

**Aucune API Notion dans le code** : la migration est manuelle et ponctuelle, il n'y a pas de synchronisation.

**Sources :**

Les chiffres de cet ADR proviennent d'une cartographie du dépôt local `freelance-toolkit`, réalisée le 29 août 2026 : décompte des fichiers versionnés par extension, lecture des quatorze schémas JSON sous `.claude/skills/*/references/`, et de son `CLAUDE.md` dont est tirée la citation sur la source de vérité. Ce dépôt étant privé et hors de ce projet, ces éléments ne sont pas vérifiables depuis ici.
