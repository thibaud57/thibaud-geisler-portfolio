---
feature: "Feature 1 — Espace admin"
subproject: "shell-admin"
goal: "Poser la coquille de navigation commune à tous les écrans de l'espace admin"
status: "draft"
complexity: "M"
tdd_scope: "none"
depends_on: ["05-protection-routes-admin-design.md"]
date: "2026-08-30"
---

# Shell de l'espace admin

## Scope

Installer les composants shadcn manquants, poser une sidebar repliable avec la seule section Portfolio, un header portant le compte et la déconnexion, et remplacer la page d'accueil minimale du sub-project `05` par un écran d'arrivée sobre.

Exclut tout écran métier : les listes et formulaires arrivent aux sub-projects `07` et suivants. Exclut également le fil d'ariane, reporté au sub-project `13` où apparaît la première hiérarchie réelle avec `/admin/projets/[id]`.

### État livré

À la fin de ce sub-project, on peut : parcourir l'espace admin avec une sidebar qui se replie à la souris comme au clavier, l'utiliser sur un téléphone où elle passe en tiroir sans débordement horizontal, et se déconnecter pour revenir à la page de connexion.

## Dependencies

- `05-protection-routes-admin-design.md` (statut: draft) — fournit le layout protégé qu'on habille ici, ainsi que `getCurrentUser()` pour alimenter le header.

## Files touched

- **À créer** : `src/config/admin-nav-items.ts` (entrées de navigation)
- **À créer** : `src/components/layout/AdminSidebar.tsx`
- **À créer** : `src/components/layout/AdminHeader.tsx`
- **À créer** : `src/components/layout/AdminUserMenu.tsx` (Client Component portant la déconnexion)
- **À modifier** : `src/app/admin/layout.tsx` (montage du shell autour des enfants)
- **À modifier** : `src/app/admin/page.tsx` (écran d'arrivée)
- **À créer** : `src/app/admin/projets/page.tsx`, `src/app/admin/tags/page.tsx`, `src/app/admin/entreprises/page.tsx`, `src/app/admin/assets/page.tsx` — pages d'attente, remplacées par les sub-projects `07` à `13`
- **À créer** : `src/components/ui/` — composants installés via le CLI shadcn : `sidebar`, `separator`, `tooltip`, `avatar`, `collapsible`, `scroll-area`

## Architecture approach

**shadcn/ui seul.** `docs/DESIGN.md` réserve Magic UI et Aceternity UI aux surfaces marketing : « L'espace admin (post-MVP) utilise shadcn/ui seul ». Le style `radix-nova` déclaré dans `components.json` s'applique, le site public et l'espace admin partageant `src/components/ui/`.

**La sidebar shadcn gère nativement le mobile**, en basculant en tiroir sous le breakpoint. C'est la raison pour laquelle elle est retenue plutôt qu'une navigation maison : le récap de conception pose que « l'espace admin remplace Notion, donc il doit être utilisable au téléphone », et cette exigence est satisfaite par le composant lui-même plutôt que par du code à écrire.

**L'état replié persiste via le cookie de shadcn**, qui est son comportement par défaut. Le conserver ne coûte rien et évite de replier la sidebar à chaque navigation.

**La configuration de navigation vit dans un fichier dédié**, sur le modèle de `src/config/nav-items.ts`. Avec un écart assumé : les libellés y sont en dur, l'espace admin étant monolingue par l'ADR-021, là où la navigation publique tire les siens de next-intl via un slug.

**Le header sélectionne les champs de l'utilisateur.** `getCurrentUser()` taint l'objet retourné : le layout en extrait le nom, l'email et l'image pour les passer au menu utilisateur, jamais l'objet complet. C'est exactement l'usage que le taint est censé imposer.

**La déconnexion est un Client Component isolé.** Elle appelle `authClient.signOut()` puis redirige vers la page de connexion. L'isoler dans son propre fichier évite de rendre client l'ensemble du header, qui reste un Server Component.

**Le conteneur admin occupe toute la largeur disponible.** `docs/DESIGN.md` le précise : « pleine largeur moins la sidebar, pas de `max-w-7xl` centré », avec un padding vertical de `py-6` à `py-8`, « où la densité prime sur le souffle ». Les titres restent en Geist Sans, `font-display` étant réservé aux surfaces marketing.

**Les quatre routes de la sidebar sont créées comme pages d'attente.** Ce n'est pas du confort : `typedRoutes: true` fait vérifier les liens à la compilation, donc une entrée pointant vers une route inexistante ferait **échouer le build**, pas produire une 404. Chaque page ne porte que son titre et une mention indiquant qu'elle reste à construire, et sera remplacée par le sub-project qui lui correspond. C'est le prix d'un shell qui navigue réellement avant que les écrans n'existent.

**Pas de fil d'ariane.** Avec quatre entrées de même niveau, il afficherait toujours une seule ligne, redondante avec l'entrée surlignée dans la sidebar. Il prendra son sens au sub-project `13`, quand `/admin/projets/[id]` introduira une profondeur réelle.

**Pas de `LanguageSwitcher`.** L'ADR-021 le note explicitement : l'espace admin est en français uniquement, ce composant n'y a pas de sens.

**Pas de `'use cache'`** dans l'arbre admin, contrainte héritée du sub-project `05`.

Rules applicables : `.claude/rules/shadcn-ui/components.md`, `.claude/rules/shadcn-ui/setup.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/react/hooks.md`, `.claude/rules/next-themes/theming.md`, `.claude/rules/nextjs/auth.md`.

## Acceptance criteria

### Scénario 1 : Navigation entre sections
**GIVEN** une session valide et la sidebar affichée
**WHEN** on parcourt les entrées de la section Portfolio
**THEN** l'entrée correspondant à la page courante est visuellement distinguée
**AND** aucune entrée ne pointe vers une route inexistante

### Scénario 2 : Repli de la sidebar
**GIVEN** la sidebar déployée sur un écran large
**WHEN** on actionne le contrôle de repli à la souris puis au clavier
**THEN** elle se replie et se déploie dans les deux cas
**AND** son état est conservé après un rechargement de la page

### Scénario 3 : Comportement mobile
**GIVEN** une fenêtre de moins de 768 pixels de large
**WHEN** on affiche une page de l'espace admin
**THEN** la sidebar est masquée et accessible par un déclencheur dans le header
**AND** la page ne défile pas horizontalement

### Scénario 4 : Identité affichée sans fuite
**GIVEN** une session valide
**WHEN** le header s'affiche
**THEN** l'email du compte connecté est visible
**AND** le rendu n'échoue pas, ce qui prouve que l'objet `user` tainté n'a pas été transmis au client

### Scénario 5 : Déconnexion
**GIVEN** une session valide
**WHEN** on active la déconnexion depuis le menu du compte
**THEN** la session est fermée
**AND** on est ramené sur `/admin/login`
**AND** un retour sur `/admin` redirige de nouveau vers la connexion

### Scénario 6 : Absence de sélecteur de langue
**GIVEN** n'importe quelle page de l'espace admin
**WHEN** on inspecte le shell
**THEN** aucun sélecteur de langue n'est monté
**AND** aucune URL de l'espace admin ne porte de préfixe de locale

## Edge cases

- **`typedRoutes: true` transforme un lien mort en échec de build** : c'est ce qui impose de créer les quatre pages d'attente dans ce sub-project plutôt que de les laisser aux suivants. Un lien vers une route inexistante ne produit pas une 404, il empêche de compiler
- **Pages d'attente à ne pas oublier** : chaque sub-project ultérieur doit remplacer la sienne, et non en créer une seconde à côté
- **Objet `user` tainté** : passer `user` entier au menu utilisateur ferait échouer le rendu. Les champs sont sélectionnés dans le layout, côté serveur
- **Bascule de thème** : le `ThemeToggle` existant est déjà un Client Component autonome, il se monte tel quel
- **Débordement horizontal sur mobile** : c'est le défaut le plus courant d'un shell à sidebar, et il ne se voit pas sur un écran large. Le scénario 3 le vérifie explicitement
- **Double scroll** : une `ScrollArea` mal placée peut produire deux barres de défilement imbriquées, une pour la sidebar et une pour la page

## Architectural decisions

### Décision : report du fil d'ariane

**Options envisagées :**
- **A. Le reporter au sub-project `13`**, quand `/admin/projets/[id]` introduira une hiérarchie réelle.
- **B. Le construire maintenant en le dérivant du chemin**, ce qui le rendrait automatique pour toutes les pages à venir.

**Choix : A**

**Rationale :**
- La navigation est plate à ce stade : le fil afficherait systématiquement une seule ligne, déjà signalée par l'entrée surlignée dans la sidebar
- La dérivation depuis le chemin suppose un mapping de segment vers libellé, donc une logique à maintenir et à tester, pour un affichage sans valeur tant qu'il n'y a rien à hiérarchiser
- Au sub-project `13`, on saura ce que le fil doit réellement afficher pour une page d'édition, ce qu'on ne peut que supposer aujourd'hui
- Le composant `Breadcrumb` de shadcn reste installable en une commande le moment venu
