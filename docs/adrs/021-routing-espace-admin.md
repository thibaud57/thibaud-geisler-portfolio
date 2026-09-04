---
title: "ADR-021 — Routing de l'espace admin : hors du segment de locale"
status: "accepted"
description: "Décision actée : l'espace admin vit sous /admin, hors [locale]/, en français uniquement"
date: "2026-08-29"
keywords: ["architecture", "adr", "routing", "i18n", "admin", "nextjs", "proxy"]
scope: ["docs", "architecture"]
technologies: ["Next.js", "next-intl"]
---

# 🎯 Contexte

Le site public est bilingue, servi sous `[locale]/` avec le route group `(public)/` (cf. [ADR-010](010-i18n.md)). La documentation projetait initialement de placer l'espace admin sous ce même segment, ce qui l'aurait rendu bilingue lui aussi.

L'espace admin est single-user (cf. [ADR-002](002-auth-better-auth-google-oauth.md)) et son unique utilisateur est francophone.

---

# 🧩 Problème

L'espace admin doit-il être soumis au routing localisé, et quelle structure de dossiers en découle ?

---

# 🛠️ Options Envisagées

## Option A : Sous `[locale]/`, espace admin bilingue

**Description :** Un route group `(admin)/` sous `[locale]/`. URLs `/fr/admin` et `/en/admin`. Chaque page appelle `setRequestLocale`, chaque libellé existe en deux versions dans `messages/{fr,en}.json`.

**Avantages :**
- Cohérence structurelle avec le site public
- Ouvre la porte à un usage par un tiers anglophone si le périmètre single-user changeait un jour

**Inconvénients :**
- Un espace admin représente plusieurs centaines de clés de traduction (libellés de formulaires, en-têtes de colonnes, statuts, messages d'erreur, actions), à écrire deux fois et à maintenir cohérentes à chaque évolution
- Aucun bénéfice réel : l'utilisateur unique est francophone
- Le volume de clés croît avec chaque écran, donc le coût est permanent

**Coût estimé :** Doublement permanent de l'effort de libellés

## Option B : Hors `[locale]/`, français uniquement

**Description :** Un dossier `src/app/admin/` à la racine de `app/`, hors du segment de locale. URL `/admin`. Le proxy soustrait ce préfixe au routing i18n.

**Avantages :**
- Aucune clé à doubler
- Structure plus simple : un dossier réel plutôt qu'un route group imbriqué
- Cohérent avec le périmètre single-user acté

**Inconvénients :**
- Une bascule vers un espace admin bilingue exigerait de traduire rétroactivement toutes les clés accumulées
- Asymétrie de structure entre les deux surfaces de l'application

**Coût estimé :** Nul, hors le branchement de proxy qui est requis dans les deux options

---

# 🎉 Décision

**Option B actée : l'espace admin vit sous `/admin`, hors `[locale]/`.**

**Structure retenue :** un dossier réel `src/app/admin/`, pas un route group. Les parenthèses ne produisent aucun segment d'URL, donc un `(admin)/dashboard/` aurait donné `/dashboard` et imposé deux notions pour une seule chose.

**Le coût côté proxy est identique dans les deux options.** Ajouter la vérification de session impose de toute façon d'envelopper le handler `next-intl` dans une fonction qui teste le préfixe, que ce préfixe soit `/admin` ou `/(fr|en)/admin`. Une dizaine de lignes dans les deux cas. Cette décision ne se joue donc pas sur la complexité technique, mais sur le volume de traduction.

---

# 🔄 Conséquences

## Positives

- Plusieurs centaines de clés de traduction évitées, et l'économie croît avec chaque écran ajouté
- Structure de dossiers plus lisible : `[locale]/` pour le public, `admin/` pour le privé
- Le test de préfixe dans le proxy exprime directement l'intention, sans avoir à composer avec les préfixes de locale

## Négatives

- L'application devient asymétrique : une surface localisée, une surface non localisée
- Une bascule ultérieure vers un espace admin bilingue imposerait une traduction rétroactive dont le coût croît avec le nombre d'écrans. C'est précisément ce qui justifie de trancher maintenant
- Le composant `LanguageSwitcher` n'a pas de sens dans l'admin, il faudra que le layout admin ne le monte pas

---

# 📝 Notes complémentaires

Cette décision restreint le périmètre du routing localisé acté par [ADR-010](010-i18n.md), sans le remettre en cause : le site public reste intégralement bilingue.

Elle a un effet sur la structure décrite par [ADR-001](001-monolithe-nextjs-fullstack.md) : la séparation logique passe désormais par le route group `(public)/` sous `[locale]/` et le segment `admin/` à la racine de `app/`.

L'implémentation du proxy et du layout protégé appartient à la spec d'implémentation, pas à cet ADR.
