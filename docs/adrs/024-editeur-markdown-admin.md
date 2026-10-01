---
title: "ADR-024 — Éditeur markdown des champs texte longs de l'espace admin"
status: "accepted"
description: "Décision actée : les champs markdown de l'espace admin se saisissent avec Pages CMS Editor (Tiptap, installé par la CLI shadcn), le markdown restant le format stocké et rendu"
date: "2026-09-27"
keywords: ["architecture", "adr", "markdown", "editeur", "tiptap", "shadcn", "admin", "crm"]
scope: ["docs", "architecture"]
technologies: ["Tiptap", "Pages CMS Editor", "shadcn/ui", "react-markdown"]
---

# 🎯 Contexte

L'espace admin saisit du markdown dans une simple zone de texte : l'étude de cas d'un projet (`caseStudyMarkdownFr` / `caseStudyMarkdownEn`), rendue sur le site public par `MarkdownContent` (`react-markdown`, `remark-gfm`, classes `prose`). La Feature 2 « Domaine freelance » en ajoute d'autres : le champ Détails des entreprises, des leads et des contacts, qui reprend le corps de page structuré des fiches Notion (gabarits À propos, Signaux, Mission, Signal, Hypothèse / Angle, Contexte…).

Dans une zone de texte brute, la syntaxe se tape à l'aveugle et le rendu ne se voit qu'après l'enregistrement. Le propriétaire rédige ces fiches dans Notion depuis des années, avec ses raccourcis (`#` pour un titre, `-` pour une liste) et son menu `/`.

Contraintes :

- le markdown reste le format stocké : `MarkdownContent` le rend, les agents internes le liront et l'écriront, la reprise Notion (`domaine-freelance-crm/20`) y verse les corps de page
- composants copiés dans le projet par la CLI shadcn, comme le reste de l'interface
- politique de sécurité du site : `script-src 'self' 'unsafe-inline'` sans `'unsafe-eval'` en production, `style-src 'self' 'unsafe-inline'` (`next.config.ts`)

---

# 🧩 Problème

Comment saisir confortablement les champs markdown de l'admin, au plus près de Notion, sans changer le format stocké ni le rendu existant.

---

# 🛠️ Options Envisagées

## Option A : composant maison « Écrire / Aperçu »

**Description :** zone de texte markdown et onglet d'aperçu qui réutilise `MarkdownContent`, comme sur GitHub, avec une ligne d'aide sur la syntaxe.

**Avantages :**
- Aucune dépendance
- Le markdown saisi est stocké à l'octet près

**Inconvénients :**
- La syntaxe reste à taper, le rendu se voit dans un second onglet
- Loin de l'habitude Notion

**Coût estimé :** faible

## Option B : Minimal Tiptap

**Description :** éditeur Tiptap à barre d'outils fixe, distribué en registre shadcn ; markdown en entrée et en sortie par l'extension officielle `@tiptap/markdown`.

**Avantages :**
- Raccourcis markdown de Tiptap (`#`, `-`, `>`) et barre d'outils complète
- Markdown stocké

**Inconvénients :**
- 53 fichiers et 17 dépendances à la lecture du registre, dont une seconde bibliothèque d'icônes (`@radix-ui/react-icons`, le projet utilisant `lucide-react`), la coloration de code (`lowlight`) et un zoom d'image
- 12 composants shadcn requis
- Images, couleurs et blocs de code à élaguer, inutiles pour des notes
- Pas de menu `/`

**Coût estimé :** moyen

## Option C : Pages CMS Editor

**Description :** « a simple, Notion-like WYSIWYG editor component for shadcn/ui », bâti sur Tiptap : menu `/`, bulle de mise en forme sur la sélection, raccourcis Tiptap, prop `format` à `"markdown"`, prop `enableImages` pour couper les images.

**Avantages :**
- Le plus proche de Notion : menu `/`, bulle, raccourcis (« Type # at the beginning of a new line and it will magically transform to a heading », doc Tiptap)
- 5 fichiers et 16 dépendances à la lecture du registre, surtout Tiptap, plus `tippy.js` pour les menus ; `lucide-react` déjà présent ; aucun composant shadcn requis
- Markdown stocké

**Inconvénients :**
- Projet amont jeune (100 étoiles, 32 commits le 2026-09-27) : une fois copié, son code est maintenu par le projet
- Tiptap relit puis réécrit le markdown : espaces et marques de liste peuvent être normalisés à l'enregistrement
- Licence à confirmer à l'installation

**Coût estimé :** faible à moyen

## Option D : Plate ou Shadcn Editor

**Description :** cadres d'édition complets distribués en registres shadcn (Plate sur Slate, 324 éléments de registre ; Shadcn Editor sur Lexical, version complète `editor-x`), tous deux avec import et export markdown.

**Avantages :**
- Très complets (blocs, tableaux, commentaires, IA pour Plate)

**Inconvénients :**
- Sur-dimensionnés pour quelques champs de notes
- Poids et surface de maintenance les plus élevés

**Coût estimé :** élevé

---

# 🎉 Décision

**Option C actée : Pages CMS Editor, choisi par le propriétaire le 2026-09-27.**

L'éditeur s'installe par la CLI shadcn (`npx shadcn@latest add https://editor.pagescms.org/r/editor.json`) et s'emploie avec `format="markdown"` et les images coupées. Il sert à tous les champs markdown de l'admin : Détails des entreprises, des leads et des contacts, et étude de cas des projets. Le formulaire envoie sa valeur par un champ caché, comme les autres champs contrôlés. Le markdown reste le seul format stocké ; `MarkdownContent` en reste le seul rendu, dans les vues détail de l'admin comme sur le site public.

Le premier sub-project qui livre un champ Détails (`domaine-freelance-crm/03`) l'installe et y fait passer l'étude de cas des projets.

---

# 🔄 Conséquences

## Positives

- Saisie proche de Notion : titres, listes et citations se forment à la frappe, menu `/` et bulle de mise en forme
- Format stocké et rendu inchangés : aucune migration, site public intact
- Peu de code possédé (5 fichiers), aucune bibliothèque d'icônes en double

## Négatives

- Tiptap et ses extensions entrent dans le bundle de l'admin ; les pages publiques n'importent jamais l'éditeur
- La première modification d'une étude de cas existante peut réécrire sa forme (espaces, puces) sans en changer le rendu
- Le HTML brut d'un markdown importé (les `<br>` des citations Notion) passe par l'analyse de Tiptap : la reprise (`domaine-freelance-crm/20`) convertit ces balises en retours à la ligne
- Compatibilité avec la politique de sécurité du site à vérifier à l'installation (Tiptap n'évalue pas de code ; les styles en ligne sont déjà permis)

---

# 📝 Notes complémentaires

Sources consultées le 2026-09-27 :

- Pages CMS Editor : dépôt `github.com/pagescms/editor` (présentation, props, politique HTML du mode markdown) et registre `editor.pagescms.org/r/editor.json` (fichiers et dépendances)
- Minimal Tiptap : dépôt `github.com/Aslam97/minimal-tiptap` et registre `raw.githubusercontent.com/Aslam97/shadcn-minimal-tiptap/main/registry/block-registry.json`
- Tiptap : documentation des extensions Heading et Bullet list (`tiptap.dev/docs/editor/extensions/nodes/…`)
- Plate : `platejs.org/docs/markdown` ; Shadcn Editor : `github.com/htmujahid/shadcn-editor`
