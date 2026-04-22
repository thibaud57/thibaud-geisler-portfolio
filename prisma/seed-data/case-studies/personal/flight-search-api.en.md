<!-- TODO: translate to English -->

## Contexte

En préparant un voyage multi-destinations (Amérique du Sud), j'ai réalisé que les comparateurs de vols (Google Flights, Kayak) ne permettent **pas de range dynamique sur les dates en multi-city**.

Concrètement : pour un voyage **Paris → Rio → Buenos Aires → Paris** avec des dates flexibles (départ entre le 1er et le 15 juin, puis Rio → Buenos Aires entre le 20 et le 30 juin), **impossible** avec ces comparateurs. Je dois entrer une date fixe pour chaque vol.

Avec 3-4-5 vols et des fenêtres de dates flexibles, ça fait **des centaines de combinaisons à tester manuellement**. Seul Kiwi propose cette fonctionnalité, mais ses prix sont systématiquement plus élevés.

**Objectif** : créer un bot qui teste automatiquement toutes les combinaisons de dates possibles pour un vol multi-city et extrait le **top 10 des prix les moins chers**.

**Mon rôle** : conception, développement et déploiement de bout en bout en autonomie.

## Réalisations marquantes

### Scraping Google Flights

Crawl des pages Google Flights pour extraire les prix des vols via sélecteurs CSS.

**Défis techniques** : détection anti-bot de Google, structure HTML complexe et dynamique, gestion des captchas.

**Solutions** : navigateur stealth avec headers Chrome réalistes, proxies résidentiels IP françaises, retry logic avec backoff exponentiel + rotation proxy si captcha détecté.

### Pivot vers Kayak (le gros défi)

Après Google Flights, ajout de Kayak pour comparer les prix entre sources (Kayak agrège +50 compagnies).

**Défis techniques** : **Kayak ultra-agressif anti-bot**, toutes mes tentatives initiales échouaient (stealth basique, proxies résidentiels, techniques standards). Fingerprinting avancé détectant l'automatisation.

**Solutions** : **pivot vers un navigateur avec anti-fingerprinting avancé**, capture réseau des requêtes API internes, parsing JSON au lieu du HTML.

### Génération combinaisons multi-city

Générer toutes les combinaisons possibles de dates pour chaque étape du voyage.

**Défis techniques** : explosion combinatoire (ex : 3 étapes × 15 jours chacun = des milliers de requêtes), temps de crawl prohibitif si on teste tout.

**Solutions** : optimisation algorithmique et parallélisation contrôlée pour réduire le temps de crawl tout en évitant les blocages.

## Résultats

- **200 combinaisons testées en 5 min** (Google Flights), 10 min (Kayak)
- **100-200€ d'économie** trouvés vs combinaisons au hasard
- **Coût opérationnel** : ~10$/1500 requêtes (Google), ~20$ (Kayak)
- Tracking prix possible via cron pour surveiller l'évolution

## Apprentissages

- Scraping avancé et anti-détection (navigateurs stealth, anti-fingerprinting)
- Gestion du fingerprinting navigateur avancé
- Architecture async Python (FastAPI, asyncio)
- TDD rigoureux (317 tests, 90% coverage)
- Documentation technique via ADRs
- Ne pas sous-estimer les protections anti-bot modernes, toujours avoir un plan B (et C)

## Évolutions prévues

- Ouvrir à d'autres types de recherche (pas que multi-city)
- Mettre en place un MCP
- Interface web pour visualiser les résultats
- Alertes prix (webhook quand un prix baisse)

## Liens

Code source disponible sur demande (non public par choix stratégique).
