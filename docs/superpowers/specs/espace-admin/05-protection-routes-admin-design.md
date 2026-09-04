---
feature: "Feature 1 — Espace admin"
subproject: "protection-routes-admin"
goal: "Rendre /admin inaccessible sans session valide et le sortir du routing localisé"
status: "draft"
complexity: "M"
tdd_scope: "partial"
depends_on: ["04-auth-better-auth-google-design.md"]
date: "2026-09-03"
---

# Protection des routes de l'espace admin

## Scope

Sortir `/admin` du routing localisé, y poser une redirection optimiste dans le proxy, et une vérification réelle de session dans le layout. S'y ajoutent la page de connexion, une page d'accueil admin minimale et la page `unauthorized`.

Exclut toute navigation et tout écran métier : la sidebar, le header et la structure du shell appartiennent au sub-project `06`. La page d'accueil créée ici ne porte qu'un titre, le temps de disposer de quelque chose à protéger.

### État livré

À la fin de ce sub-project, on peut : accéder à `/admin` sans session et être redirigé vers la page de connexion, s'authentifier avec Google, revenir sur `/admin` et y rester. L'URL ne comporte jamais de préfixe de locale.

## Dependencies

- `04-auth-better-auth-google-design.md` (statut: draft) — fournit `auth`, `authClient` et les routes `/api/auth/*` sans lesquelles il n'y a ni session à vérifier ni moyen d'en ouvrir une.

## Files touched

- **À modifier** : `src/proxy.ts` (enveloppe du handler next-intl, exclusion du routing i18n sur `/admin`, redirection optimiste)
- **À créer** : `src/lib/admin-routes.ts` (fonctions pures de qualification du chemin)
- **À créer** : `src/lib/admin-routes.test.ts`
- **À créer** : `src/lib/get-current-user.ts` (vérification réelle de session, avec Taint API)
- **À créer** : `src/app/admin/layout.tsx` (layout protégé, et **root layout de l'arbre `/admin`** : le seul autre root layout du dépôt vit sous `[locale]`, celui-ci doit donc rendre son propre `<html>`/`<body>`, importer `globals.css` et le script de thème, comme `global-not-found.tsx`)
- **À créer** : `src/app/admin/page.tsx` (page d'accueil minimale, remplacée au sub-project `06`)
- **À créer** : `src/app/admin/login/page.tsx` (page de connexion)
- **À créer** : `src/app/admin/unauthorized.tsx` (voisin du layout qui lève la frontière, donc couvert par le document qu'il rend)
- **À modifier** : `next.config.ts` (`experimental.authInterrupts` et `experimental.taint`)
- **À modifier** : `tsconfig.json` (ajout de `react/experimental` au champ `types`, requis par le Taint API)

## Architecture approach

**Le proxy enveloppe le handler next-intl plutôt que de l'exclure par le matcher.** Une fonction `proxy` teste le préfixe du chemin : si la requête vise `/admin`, elle ne passe jamais par `createMiddleware(routing)` et échappe donc au préfixage de locale ; sinon elle lui est déléguée telle quelle. Écarter `/admin` du matcher aurait le même effet sur l'i18n mais priverait de tout point d'accroche pour la redirection optimiste, qui doit s'exécuter au même endroit.

**La vérification du proxy n'est pas une sécurité.** `getSessionCookie(request)`, importée de `better-auth/cookies`, teste la seule présence du cookie sans appel base ni validation de signature. La documentation Better Auth le signale en majuscules dans son propre exemple : c'est une redirection optimiste destinée à l'expérience utilisateur. Elle évite d'afficher un écran vide à un visiteur non connecté, rien de plus. `getSessionCookie` est préférée à `getCookieCache`, qui embarquerait des données de session dans le cookie sans bénéfice pour un simple test de présence.

**La sécurité réelle est dans le layout, et dans chaque Server Action.**  `getCurrentUser()` appelle `auth.api.getSession()` avec les en-têtes de la requête, ce qui valide la session en base. Sans session, il appelle `unauthorized()`. Le layout `/admin` l'invoque, donc toute page de l'arbre en hérite. C'est la protection en couches décrite par ARCHITECTURE.md § Autorisation : le proxy oriente, le layout autorise, chaque action se garde elle-même.

`getCurrentUser()` sera **aussi** appelée en tête de chaque Server Action de l'espace admin, à partir du sub-project `07`. Le layout ne couvre que le rendu des pages : une Server Action exportée reste un endpoint HTTP joignable sans jamais charger l'écran qui la monte. Ce helper est donc écrit ici pour deux usages, pas un seul.

**L'objet `user` est tainté.** `experimental_taintObjectReference` sur l'objet complet empêche qu'il soit passé par mégarde à un Client Component. Les écrans qui ont besoin d'afficher un nom ou un email sélectionnent explicitement le champ voulu. Les deux drapeaux `experimental.authInterrupts` et `experimental.taint` sont activés dans ce sub-project précisément, celui qui introduit `unauthorized()` et le taint.

**La qualification du chemin est une fonction pure et testée.** Décider qu'une requête vise l'espace admin, et que `/admin/login` en est exclue, est une règle de sécurité : une erreur y rendrait la connexion impossible par boucle de redirection, ou pire, laisserait passer une route qui devait être protégée. Cette logique vit dans `src/lib/admin-routes.ts`, hors du proxy, pour être testable sans monter Next.js.

**Aucun `'use cache'` dans l'arbre admin.** Avec `cacheComponents: true`, le contenu est dynamique par défaut et le cache est opt-in. Ne jamais l'activer sous `/admin` évite le contournement documenté par `docs/VERSIONS.md` § Post-MVP > Better Auth, qui impose d'extraire les cookies avant le scope de cache. Un écran d'administration n'a de toute façon aucune raison d'être mis en cache.

**La CSP n'est pas modifiée.** La connexion passe par `authClient.signIn.social()`, c'est-à-dire un appel same-origin suivi d'une navigation JavaScript vers Google. La directive `form-action` ne s'applique qu'aux soumissions de formulaire et n'est donc pas sollicitée. Ce point est vérifié explicitement plutôt que supposé, car Chrome et Safari bloquent les redirections issues d'un formulaire sous `form-action 'self'` là où Firefox les autorise : un bouton implémenté en formulaire produirait un bug qui ne se reproduit pas sur tous les navigateurs.

**Aucun rate limiting spécifique.** L'ADR-002 a supprimé le brute force par construction : il n'existe aucun endpoint de mot de passe, l'authentification étant déléguée à Google. Ajouter un compteur protégerait d'une menace absente de cette architecture.

Rules applicables : `.claude/rules/nextjs/auth.md`, `.claude/rules/nextjs/proxy.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/next-intl/setup.md`, `.claude/rules/vitest/setup.md`.

## Acceptance criteria

### Scénario 1 : Accès anonyme redirigé
**GIVEN** aucun cookie de session
**WHEN** on demande `/admin`
**THEN** la réponse redirige vers `/admin/login`
**AND** aucune requête base n'a été émise par le proxy

### Scénario 2 : Absence de préfixe de locale
**GIVEN** `localePrefix: 'always'` dans la configuration next-intl
**WHEN** on demande `/admin` puis `/admin/login`
**THEN** aucune des deux URLs n'est réécrite en `/fr/admin` ou `/en/admin`
**AND** les pages publiques restent préfixées comme avant

### Scénario 3 : Pas de boucle de redirection
**GIVEN** aucun cookie de session
**WHEN** on demande `/admin/login`
**THEN** la page s'affiche
**AND** aucune redirection n'est émise

### Scénario 4 : Session valide acceptée
**GIVEN** une session ouverte avec le compte autorisé
**WHEN** on demande `/admin`
**THEN** la page d'accueil admin s'affiche

### Scénario 5 : Cookie présent mais session invalide
**GIVEN** un cookie de session forgé ou expiré
**WHEN** on demande `/admin`
**THEN** le proxy laisse passer, la présence du cookie suffisant à son test
**AND** le layout appelle `unauthorized()` et la page `unauthorized` s'affiche

### Scénario 6 : Connexion complète
**GIVEN** la page de connexion affichée
**WHEN** on lance la connexion Google et qu'on la mène à son terme
**THEN** on est ramené sur `/admin`
**AND** aucune violation de CSP n'apparaît dans la console du navigateur

### Scénario 7 : Objet user non transmissible au client
**GIVEN** `getCurrentUser()` qui taint l'objet retourné
**WHEN** un Client Component tente de recevoir cet objet en prop
**THEN** le rendu échoue avec l'erreur du Taint API plutôt que de laisser fuir la donnée

## Tests à écrire

### Unit

- `src/lib/admin-routes.test.ts` :
  - `/admin` est reconnu comme chemin admin
  - `/admin/projets` et tout sous-chemin le sont également
  - `/admin/login` est reconnu comme chemin admin mais **exempté** de la vérification de session
  - `/administration` n'est **pas** reconnu comme chemin admin, un préfixe ne devant pas suffire
  - `/` et `/fr/projets` ne sont pas reconnus comme chemins admin
  - `/api/auth/callback/google` n'est pas soumis à la vérification, sans quoi le retour du flux OAuth boucherait

Aucun test n'est écrit sur le proxy lui-même, sur `getCurrentUser()` ni sur les pages : monter Next.js pour vérifier qu'un handler de librairie redirige relève du test de framework. La logique qui pouvait mal tourner est extraite et couverte.

## Edge cases

- **Boucle de redirection** : c'est le risque principal. Si `/admin/login` n'est pas exempté, un visiteur non connecté est redirigé indéfiniment. Le scénario 3 existe pour ça
- **Préfixe trompeur** : une comparaison par `startsWith('/admin')` classerait `/administration` comme route admin. La fonction doit exiger une correspondance exacte ou un séparateur suivant
- **Callback OAuth** : `/api/auth/*` est déjà exclu par le matcher existant, mais l'oublier lors d'une réécriture du matcher casserait le retour de Google, avec une erreur peu lisible
- **Cookie sans session valide** : le proxy laisse passer, c'est attendu. Sa vérification ne prouve rien, seul le layout tranche
- **Drapeaux expérimentaux** : `authInterrupts` et `taint` doivent être activés dans ce sub-project, celui qui introduit leur usage. Les poser en avance produirait une configuration inutilisée, les poser en retard un build en échec
- **`LanguageSwitcher` hors de l'admin** : l'ADR-021 le note, `/admin` étant monolingue. Le layout créé ici ne monte aucun composant de navigation, donc le point ne se pose qu'au sub-project `06`
- **`unauthorized.tsx` à la racine** : il vit hors de `[locale]`, comme `/admin`. Il ne peut donc pas utiliser `useTranslations` et porte des libellés français en dur, à l'image de `global-error.tsx`

## Architectural decisions

### Décision : sortie du routing localisé

**Options envisagées :**
- **A. Envelopper `createMiddleware` dans une fonction `proxy`** qui teste le préfixe et court-circuite le routing i18n sur `/admin`. Un seul point de décision, qui sert aussi à la redirection optimiste.
- **B. Exclure `/admin` du matcher** de `proxy.ts`. Plus déclaratif, mais le proxy ne s'exécute alors plus du tout sur ces routes.

**Choix : A**

**Rationale :**
- L'option B rendrait impossible la redirection optimiste, puisque le proxy ne serait plus appelé sur `/admin` : il faudrait de toute façon revenir à A dès qu'on veut orienter un visiteur non connecté
- Un seul endroit décide de ce qu'est une route admin, au lieu de dupliquer cette connaissance entre une expression régulière de matcher et une condition applicative
- L'ADR-021 anticipe précisément ce choix en notant que « ajouter la vérification de session impose de toute façon d'envelopper le handler next-intl dans une fonction qui teste le préfixe »
- `.claude/rules/nextjs/proxy.md` confirme que rien n'interdit d'envelopper de la logique custom dans l'export par défaut
