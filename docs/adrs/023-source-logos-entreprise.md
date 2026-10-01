---
title: "ADR-023 — Logos d'entreprise récupérés depuis le site de l'entreprise"
status: "accepted"
description: "Décision actée : le logo d'une entreprise est lu sur son propre site (ou sa dernière capture Wayback si le site a disparu) puis stocké dans R2, sans Logo.dev ni autre service tiers"
date: "2026-09-26"
keywords: ["architecture", "adr", "logo", "crm", "assets", "r2", "logo.dev", "wayback", "ssrf"]
scope: ["docs", "architecture"]
technologies: ["Cloudflare R2", "Next.js", "Logo.dev", "Wayback Machine"]
---

# 🎯 Contexte

Le logo d'une entreprise s'affiche depuis `Company.logoFilename`, une clé du bucket `portfolio-admin` sous `freelance/crm/entreprises/<slug>/` ([ADR-011](011-stockage-assets.md), amendement du 2026-09-22), sur les listes de l'espace admin comme sur les pages publiques des projets clients publiés. Depuis le sub-project `espace-admin/10`, ce fichier se dépose à la main.

Le CRM tenu dans Notion affiche ses logos par une formule qui appelle Logo.dev à chaque affichage (`img.logo.dev/<domaine>?token=pk_…`). La Feature 2 « Domaine freelance » de `BRAINSTORM.md` prévoyait de reprendre ce service, appelé une fois puis stocké sous un nom prévisible.

Ordre de grandeur donné par le propriétaire le 2026-09-26 : un millier d'entreprises au CRM, une centaine consultées par jour. Certaines entreprises avec lesquelles il a travaillé ont disparu : `paysystem.eu`, client d'un projet publié, est en vente sur Sedo, et Logo.dev renvoie pour ce domaine un logo qui n'est plus le sien.

---

# 🧩 Problème

D'où tirer le logo qui alimente `logoFilename`, sans abonnement, avec le droit de le stocker, et de façon qu'il reste juste pour une entreprise qui a fermé ou changé de marque.

---

# 🛠️ Options Envisagées

## Option A : Logo.dev en affichage direct, rien de stocké

**Description :** Le navigateur charge `img.logo.dev/<domaine>?token=pk_…` à chaque affichage, comme la formule Notion. Le logo déposé ne sert plus qu'à corriger un logo absent ou faux.

**Avantages :**
- Aucun code de récupération, qualité d'image normalisée par le service
- Quota largement suffisant : plafond de 500 000 requêtes par mois sur le plan gratuit, pour environ 6 600 estimées au pire (3 000 dans l'admin, 3 600 sur le public), le navigateur gardant chaque logo 24 h (`Cache-Control: max-age=86400`)

**Inconvénients :**
- Le logo suit le domaine du jour : une entreprise fermée, rachetée ou dont le domaine a changé de main affiche un mauvais logo ou un monogramme, sans moyen de le figer
- Garder l'image au-delà du cache navigateur, c'est la stocker, ce que le plan gratuit n'autorise pas (Option B)
- Attribution obligatoire : Logo.dev range explicitement les CRM internes dans l'usage commercial (« Internal tools at a company: dashboards, CRMs, back-office apps »)
- Sur les pages publiques, l'adresse IP de chaque visiteur part chez un tiers, à déclarer dans la politique de confidentialité
- Deux modes d'affichage à tenir dès qu'un logo déposé corrige Logo.dev
- Neuf incidents « Site Unreachable » ou « Assertion Failed » publiés sur `status.logo.dev` entre février et août 2026, sans SLA

**Coût estimé :** Faible en code, gratuit

## Option B : Logo.dev appelé une fois, stocké dans R2

**Description :** Le plan du BRAINSTORM : appel à l'enregistrement, fichier stocké sous un nom prévisible, plus d'appel à l'affichage.

**Avantages :**
- Qualité normalisée et logo figé une fois stocké

**Inconvénients :**
- Interdit sur le plan gratuit : « Don't automate bulk logo downloads. The exception is self-hosting for your own app, licensed on Pro, Enterprise, and custom plans » (page fair use)
- Sous licence Pro, le droit de stocker ne vaut que « for as long as your subscription is active » (page self-hosting)

**Coût estimé :** 150 $ par mois (plan Pro), écarté par le propriétaire

## Option C : un autre service gratuit

**Description :** Brandfetch, services de favicon de Google ou de DuckDuckGo, icon.horse.

**Avantages :**
- Couverture large, aucun code d'extraction

**Inconvénients :**
- Brandfetch impose le hotlink sur son Logo API (« you must hotlink the logos we serve rather than caching them ») et limite le cache de son Brand API à 30 jours renouvelables
- Les services de Google et de DuckDuckGo n'ont aucune condition d'utilisation publiée et plafonnent souvent à 16 ou 32 px
- icon.horse s'arrête à 1 000 icônes par mois en gratuit
- Clearbit Logo API a fermé le 8 décembre 2025 (annonce HubSpot)
- Aucun n'accorde par écrit le droit de stocker durablement sans abonnement

**Coût estimé :** Gratuit, mais sans droit de stockage

## Option D : le site de l'entreprise, sa capture Wayback en repli, stocké dans R2

**Description :** Un bouton « Récupérer le logo » lit la page à l'adresse `websiteUrl`, retient l'icône que le site déclare (`apple-touch-icon`, `<link rel="icon">` de la plus grande taille), la télécharge et la stocke dans R2. Quand le site n'est plus d'actualité (`paysystem.eu` renvoie vers une page de vente Sedo, constaté le 2026-09-26), l'admin remplace l'adresse du champ par celle d'une capture Wayback (`web.archive.org/web/<horodatage>/<url>`), que le bouton lit brute grâce au suffixe `id_` (`web.archive.org/web/<horodatage>id_/<url>`). À défaut, le dépôt manuel reste.

**Avantages :**
- Ni clé, ni quota, ni abonnement : l'actif vient de l'entreprise elle-même
- Le logo est figé : il reste juste après la fermeture de l'entreprise. Vérifié sur PaySystem le 2026-09-26 : capture du 2023-06-08, icône de 192 px déclarée et archivée, retrouvée à partir du seul domaine
- Un seul mode d'affichage (`logoFilename`), admin et public, pages publiques inchangées

**Inconvénients :**
- Qualité variable : `apple-touch-icon` passe l'audit Lighthouse sur 42 % des sites (Web Almanac 2022), d'autres ne publient qu'un favicon de 32 px, suffisant pour la tuile de 28 px de l'admin, juste pour l'en-tête de 56 px d'une étude de cas
- Le serveur appelle une URL saisie par l'admin : surface SSRF. Le `fetch` natif de Node n'a ni protection SSRF ni plafond de taille de réponse (issues undici #2019 et #1692), à construire soi-même
- SVG à assainir ou refuser, ICO illisible par `sharp`
- Les conditions d'Internet Archive réservent l'accès à « scholarship and research purposes only », d'après l'analyse de Marks & Clerk : un appel ponctuel, déclenché à la main pour une seule entreprise, reste loin de la collecte en masse

**Coût estimé :** Moyen, un sub-project de taille M

---

# 🎉 Décision

**Option D actée : le logo est lu à l'adresse du champ site web, le site de l'entreprise ou sa capture Wayback, puis stocké dans R2.**

`logoFilename` reste la seule source affichée, dans l'admin comme sur le site public. Logo.dev n'est appelé nulle part dans ce dépôt, sa clé publiable reste cantonnée à Notion. Le bucket, le dossier et les routes d'ADR-011 ne changent pas.

Seules les icônes déclarées par le site comptent (`apple-touch-icon`, `<link rel="icon">`, icônes du manifest, `/favicon.ico` en dernier recours), jamais l'image de partage `og:image` ni le logo d'en-tête : rectangulaires, souvent blancs, ils tiennent mal dans une tuile carrée.

Le bouton s'active dès que le site web est renseigné et lit l'adresse du champ telle quelle. Aucune détection automatique d'un site mort : c'est l'admin qui juge qu'un site n'est plus d'actualité et le remplace par sa capture Wayback. La même fonction sert à la reprise en lot des entreprises venues de Notion. L'ordre des sources, la taille minimale, les formats acceptés et la protection SSRF se fixent dans le spec `domaine-freelance-crm/06`.

Usage de la marque : afficher le logo d'une entreprise pour l'identifier relève de l'usage pour « désigner ou mentionner » ses produits ou services (article L713-6, 3° du Code de la propriété intellectuelle, article 14.1.c de la directive 2015/2436), à condition de rester loyal et de ne suggérer aucun lien commercial fictif. Le risque est le même quelle que soit la source de l'image.

---

# 🔄 Conséquences

## Positives

- Aucune dépendance à un service tiers pour afficher un logo, aucun quota à surveiller, aucune attribution à publier
- Le logo d'un ancien client reste celui de l'époque, même quand son domaine change de main
- Aucune donnée de visiteur ne part vers un tiers pour afficher un logo
- Le lien « Site web » d'une entreprise disparue mène à son archive plutôt qu'à une page de vente de domaine, pages publiques comprises

## Négatives

- Premier fetch sortant du serveur vers une URL arbitraire : garde SSRF à écrire (résolution DNS puis refus des adresses privées et de loopback, redirections contrôlées, délai, taille lue en flux), et `/security-review` à passer sur le sub-project
- Certaines entreprises ne déclarent qu'une icône basse définition ou rien d'exploitable : le dépôt manuel reste nécessaire pour celles-là
- La phrase de la Feature 2 de `BRAINSTORM.md` qui prévoit un appel Logo.dev est remplacée par cet ADR

---

# 📝 Notes complémentaires

Sources consultées le 2026-09-26 :

- Logo.dev : pages `docs/platform/self-hosting`, `fair-use`, `caching`, `rate-limits`, `attribution` et `pricing` sur logo.dev ; historique de `status.logo.dev`
- Brandfetch : `docs.brandfetch.com/logo-api/overview` et `brandfetch.com/terms`
- Clearbit : annonce de fermeture sur `developers.hubspot.com/changelog`
- Wayback Machine : `archive.org/help/wayback_api.php` (API de disponibilité) et FAQ du suffixe `id_` sur les forums d'Internet Archive ; conditions d'utilisation citées par Marks & Clerk, « Wayback to the Future »
- Qualité des icônes : HTTP Archive, Web Almanac 2022, chapitre PWA
- `fetch` natif : issues `nodejs/undici` #2019 (protection SSRF) et #1692 (taille maximale de réponse)
- Bibliothèque d'extraction candidate : `metascraper-logo` et `metascraper-logo-favicon` (microlinkhq), à évaluer au spec : le second sonde lui-même `/favicon.ico` et peut solliciter le service de Google, deux appels qui échapperaient à la garde SSRF
