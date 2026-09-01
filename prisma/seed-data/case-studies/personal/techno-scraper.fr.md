## Contexte

Deux de mes outils ont besoin des mêmes métadonnées musicales : morceaux, artistes, labels, dates de sortie, BPM, tonalité. Une application desktop qui re-tagge mes fichiers audio, et un service de collecte sur les artistes et les labels.

Le problème : aucune plateforme ne couvre le catalogue en entier. J'en interroge donc trois, chacune pour ce qu'elle fait le mieux :

- **Beatport** : les métadonnées les plus complètes, mais un catalogue limité aux sorties distribuées
- **Bandcamp** : l'autoproduction et les labels indépendants, qui ne passent par aucun distributeur
- **SoundCloud** : les profils d'artistes et de labels, et la seule des trois à proposer une API officielle en OAuth

J'ai donc construit une **gateway** : elle interroge les trois et renvoie toujours le même format, quelle que soit celle qui a répondu.

**Mon rôle** : conception, développement et exploitation, seul.

## Réalisations marquantes

### Un contrat de sortie unique pour trois sources

Quelle que soit la plateforme interrogée, les routes renvoient les mêmes objets. Celui qui consomme l'API écrit sa logique une fois et change de source sans rien réécrire.

**Défis techniques** : chaque source a ses propres structures et ses propres conventions. L'une range les remixeurs dans des champs dédiés, l'autre se contente d'un nom de label en texte libre. Et trois systèmes de pagination impossibles à réconcilier, dont un sans total fiable et un qui n'en a aucun.

**Solutions** : un schéma pivot commun, avec une règle simple, on n'invente rien. Un champ que la source ne fournit pas ressort vide, jamais rempli au jugé. La pagination passe par un **curseur opaque** que l'appelant renvoie tel quel sans le lire, ce qui lui évite de subir les changements de la source. Et une convention claire : une liste vide n'est pas une erreur, ce qui permet de distinguer « cette source n'a rien » de « cette source est cassée ».

### Un blocage qui se jouait au niveau TLS

Même adresse IP, mêmes en-têtes : un appel en ligne de commande passait, le même appel depuis Python se faisait refuser. Ce qui distinguait les deux n'était donc pas l'adresse IP, mais **la signature TLS du client**.

**Solutions** : je suis passé à un client HTTP dont la signature ressemble à celle d'un navigateur, appliquée une fois pour toutes à la session partagée par tous les appels sortants. J'ai noté dès le départ ce que cette technique ne fait pas : elle joue sur la couche transport, elle ne passe donc pas un challenge JavaScript. Quand un incident est arrivé plus tard, cette note m'a évité de chercher au mauvais endroit.

### Une réponse en succès qui renvoyait une liste incomplète

Une route répondait en code 200, avec une liste bien formée, sauf qu'il manquait une partie des résultats. La page source annonçait un nombre d'éléments faux : **5 annoncés pour 355 réels, 1 pour 736, 0 pour 322**.

Impossible pour l'appelant de s'en rendre compte : pas d'erreur, une réponse valide, juste des éléments qui manquaient à l'appel.

**Solutions** : quinze combinaisons testées pour trouver d'où venait le problème, puis passage par un autre canal d'accès, correctement paginé celui-là. J'ai écarté le correctif rapide, qui consistait à lire une page dont le compteur est juste : il plafonnait à 21 éléments, donc il réduisait l'erreur au lieu de la supprimer.

### Supprimer un point de défaillance unique

Toutes les routes d'une source passaient par un même point d'entrée. Le jour où cet hôte est devenu injoignable, la source entière est tombée, alors que son API de données répondait toujours.

**Solutions** : j'ai supprimé cette dépendance plutôt que d'attendre le rétablissement. J'ai aussi refusé de garder l'ancien chemin comme solution de secours : il reposait sur le même hôte, et un chemin de secours qu'on n'emprunte jamais finit par ne plus marcher sans que personne s'en aperçoive.

### Rester dans les quotas de l'API officielle

L'API OAuth limite sévèrement le nombre de tokens qu'on peut générer. En créer un à chaque requête entrante suffit à épuiser le quota dès le premier pic de trafic.

**Solutions** : un service de token centralisé, avec cache en mémoire, renouvellement anticipé et dédoublonnage quand plusieurs requêtes en demandent un en même temps. Un **circuit breaker** retient la panne pendant trente secondes et répond sans rappeler le réseau ; passé ce délai, une seule requête refait un vrai essai. Dernier détail qui compte : un cache réseau peut fausser la date d'un token, je me fie donc à l'heure d'expiration renvoyée par le serveur plutôt qu'à une durée du type « valable une heure ».

### Détecter la casse silencieuse d'un scraper

Le vrai risque, pour un scraper, n'est pas le plantage bruyant mais la panne muette : une source change sa structure, l'extraction casse, et personne ne le voit.

**Solutions** : les erreurs remontent dans **Sentry**, regroupées sur une clé qui inclut la source et le code renvoyé. Une source cassée déclenche donc une seule alerte au lieu de plusieurs centaines. Les données sont nettoyées avant l'envoi et la capture des variables locales est désactivée, sinon la configuration se retrouve dans les traces avec une clé d'API en clair. Enfin, un identifiant de requête suit tout le parcours, de l'alerte jusqu'au log correspondant.

## Résultats

- Trois plateformes derrière **un seul format de sortie**
- Une route qui renvoyait des listes incomplètes repérée et corrigée : **jusqu'à 736 éléments manquants sur une seule requête**
- Une alerte dès qu'une source change de structure, au lieu d'une extraction qui casse en silence
- Des tests **sans aucun appel réseau réel**, sur des réponses figées
- Typage strict et lint bloquants en intégration continue, versioning et changelog automatisés
- **Coût nul** : le VPS était déjà là, aucun service payant ajouté

## Apprentissages

- Diagnostiquer un blocage qui se joue au niveau de la signature TLS, et connaître la limite exacte de la parade
- Concevoir un contrat d'API commun à plusieurs sources : normalisation, curseur opaque, sémantique d'erreur explicite
- Gérer des tokens OAuth sous quota : cache, concurrence, circuit breaker, expiration fiable
- Rendre observable un service dont la panne principale est silencieuse
- Une réponse en succès qui renvoie une liste incomplète coûte plus cher qu'une panne franche : la panne se voit et se traite, la liste tronquée part chez l'appelant qui la prend pour argent comptant
- Noter les limites d'un outil au moment où on le choisit fait gagner un temps fou le jour où ça casse

## Évolutions prévues

- Ajouter un provider Discogs
- Ajouter un provider Beatstats
- Faire communiquer la gateway et le service de collecte artistes et labels par le réseau interne du VPS

## Liens

Code source disponible sur demande (non public par choix stratégique).
