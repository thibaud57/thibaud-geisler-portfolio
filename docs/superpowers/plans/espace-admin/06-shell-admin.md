# Shell de l'espace admin — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Habiller l'espace admin d'une sidebar repliable et d'un header, de sorte qu'on puisse y naviguer et s'en déconnecter.

**Architecture:** Le layout protégé du sub-project précédent accueille un `SidebarProvider` shadcn, une sidebar alimentée par un fichier de configuration, et un header qui porte l'identité du compte. Les champs de l'utilisateur sont extraits côté serveur avant d'atteindre le seul composant client de l'ensemble, celui qui porte la déconnexion.

**Tech Stack:** shadcn/ui (style `radix-nova`), Next.js 16 App Router, Tailwind 4, Lucide, Better Auth.

**Spec:** `docs/superpowers/specs/espace-admin/06-shell-admin-design.md`

## Global Constraints

- **shadcn/ui seul.** Magic UI et Aceternity UI sont réservés aux surfaces marketing du site public.
- **Les quatre pages d'attente sont obligatoires.** Avec `typedRoutes: true`, un lien vers une route inexistante **fait échouer le build**, il ne produit pas une 404.
- L'objet `user` est tainté : extraire les champs côté serveur, ne jamais le passer entier à un composant client.
- Conteneur admin en pleine largeur moins la sidebar, **pas** de `max-w-7xl` centré. Padding vertical de `py-6` à `py-8`.
- Titres en Geist Sans, **jamais** `font-display`, réservé aux surfaces marketing. Sur un `<h1>`, cela impose `font-sans font-semibold tracking-tight` : `@layer base` y pose `font-display text-4xl font-bold tracking-tight`, qu'une utilitaire de taille seule n'écrase pas.
- Tokens CSS uniquement (`bg-primary`, `text-muted-foreground`), jamais de couleur en dur. `cn()` pour composer les classes.
- Icônes Lucide, taille standard 20px. Mobile-first, bascule au breakpoint `md:`.
- Pas de fil d'ariane (sub-project `13`), pas de `LanguageSwitcher` (ADR-021), pas de `'use cache'` dans l'arbre admin.
- Installation via `pnpm dlx shadcn@latest add`, jamais `pnpm add shadcn-ui` qui est un package déprécié.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/shadcn-ui/components.md`, `.claude/rules/shadcn-ui/setup.md`, `.claude/rules/nextjs/server-client-components.md`, `.claude/rules/tailwind/conventions.md`, `.claude/rules/theming/theme-store.md`, `.claude/rules/nextjs/auth.md`.

---

### Task 1 : Installer les composants et déclarer la navigation

**Files:**
- Create: `src/components/ui/sidebar.tsx`, `separator.tsx`, `tooltip.tsx`, `avatar.tsx`, `collapsible.tsx`, `scroll-area.tsx` (générés par le CLI, **s'ils sont absents**)
- Create: `src/config/admin-nav-items.ts`
- Create: `src/app/admin/(protected)/projets/page.tsx`, `(protected)/tags/page.tsx`, `(protected)/entreprises/page.tsx`, `(protected)/assets/page.tsx`
- Modify: `docs/DESIGN.md` (§ Mapping Composants) : la ligne « Navigation admin → Sidebar » rejoint la section Navigation, la ligne « Primitifs d'interface » se vide entièrement (Tooltip, Separator, ScrollArea, Avatar, Collapsible installés) et disparaît de la section Post-MVP

**Interfaces:**
- Consomme : rien.
- Produit : `ADMIN_NAV_ITEMS` et les quatre routes, consommés par la sidebar de la Task 2.

> Les pages d'attente sont créées **dans cette tâche**, avant la sidebar. Sans elles, le premier lien écrit ferait échouer la compilation.

- [ ] **Step 1: Installer les composants shadcn**

```bash
ls src/components/ui/   # n'installer que ce qui manque
pnpm dlx shadcn@latest add sidebar separator tooltip avatar collapsible scroll-area
```

Lister d'abord : un sub-project antérieur a pu poser certains de ces composants, et les réinstaller les écraserait. La formule vaut pour tous les sub-projects de l'epic, chacun installant « ce qui est absent » plutôt qu'une liste figée.

Le CLI lit `components.json`, applique le style `radix-nova` et installe les dépendances Radix nécessaires. Il peut ajouter `src/hooks/use-mobile.ts`, dont la sidebar se sert pour détecter le format : c'est attendu.

**Passer d'abord `--dry-run`.** Le composant `sidebar` du registry tire `sheet`, `button`, `input` et `skeleton`, tous déjà présents dans `src/components/ui/`. Le CLI proposera de les écraser, ce qui effacerait les ajustements du design system. Refuser leur écrasement et ne laisser passer que les composants réellement nouveaux.

Deux raisons de plus de ne jamais lancer un `shadcn add --overwrite` non filtré sur ce dossier : `badge.tsx` porte une prop CVA maison (`meta`), absente du registry ; et `motion-item.tsx`, `lead-paragraph.tsx`, `labeled-text.tsx` et `stacked-skeleton.tsx` sont des composants **maison** logés dans `src/components/ui/`, que le CLI traiterait comme du vendored.

- [ ] **Step 2: Déclarer les entrées de navigation**

```typescript
import { Building2, FolderKanban, ImageIcon, Tags } from 'lucide-react'

export const ADMIN_NAV_ITEMS = [
  { href: '/admin/projets', label: 'Projets', icon: FolderKanban },
  { href: '/admin/tags', label: 'Tags', icon: Tags },
  { href: '/admin/entreprises', label: 'Entreprises', icon: Building2 },
  { href: '/admin/assets', label: 'Assets', icon: ImageIcon },
] as const

export const ADMIN_NAV_SECTION = 'Portfolio'
```

Les libellés sont en dur, contrairement à `src/config/nav-items.ts` qui passe par next-intl : l'espace admin est monolingue (ADR-021), un slug de traduction n'aurait rien à résoudre.

Seule la section Portfolio est déclarée. Freelance, Dev et Documents appartiennent à d'autres features et n'ont aucune route à cibler.

- [ ] **Step 3: Créer les quatre pages d'attente**

Le même squelette pour chacune, en adaptant le titre :

```typescript
export default function AdminProjetsPage() {
  return (
    <div className="w-full py-6 lg:py-8">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Projets</h1>
      <p className="mt-2 text-muted-foreground">Écran à construire.</p>
    </div>
  )
}
```

À décliner en `AdminTagsPage` (« Tags »), `AdminEntreprisesPage` (« Entreprises ») et `AdminAssetsPage` (« Assets »).

**Les deux classes du `h1` sont toutes deux nécessaires.** `src/app/globals.css` applique en `@layer base` `h1 { @apply font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl }`. Une utilitaire de taille écrase la taille et la graisse, jamais la famille : un `<h1 className="text-2xl font-semibold">` rendrait en Sansation à 600, graisse qui n'est pas chargée (Sansation est importée en `700` seul). `font-sans` rétablit Geist Sans, que les pages internes gardent, et `font-semibold` la graisse des titres. Le `tracking-tight` de la base est en revanche conservé : l'écran admin reprend le réglage H3 tel quel, 24px en 600, ce que `docs/DESIGN.md` prescrit.

Le conteneur suit le design system admin : pleine largeur, sans `max-w-7xl` centré, rythme vertical `py-6` à `py-8`.

- [ ] **Step 4: Vérifier que le projet compile**

```bash
just typecheck && just build
```

Expected: build réussi. Un échec ici, avant même d'avoir écrit un lien, signalerait un problème d'installation des composants.

---

### Task 2 : Sidebar

**Files:**
- Create: `src/components/layout/AdminSidebar.tsx`

**Interfaces:**
- Consomme : `ADMIN_NAV_ITEMS` et `ADMIN_NAV_SECTION` de la Task 1.
- Produit : `<AdminSidebar />`, monté par le layout de la Task 4.

- [ ] **Step 1: Écrire la sidebar**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { ADMIN_NAV_ITEMS, ADMIN_NAV_SECTION } from '@/config/admin-nav-items'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4 text-sm font-medium tracking-[0.25em] text-balance text-muted-foreground uppercase">
        Espace admin
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sm font-medium tracking-[0.25em] text-muted-foreground uppercase">
            {ADMIN_NAV_SECTION}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
                <SidebarMenuItem key={href}>
                  <SidebarMenuButton asChild isActive={pathname === href} tooltip={label}>
                    <Link href={href}>
                      <Icon />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <AdminSignOutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

`collapsible="icon"` garde les icônes visibles une fois repliée, ce qui reste navigable au lieu de disparaître complètement. Le `tooltip` sur chaque bouton n'apparaît que dans cet état replié, quand le libellé est masqué.

**La déconnexion est au pied du rail, pas dans le header.** `docs/DESIGN.md` § Mapping Composants, ligne « Navigation admin », le fixe : le pied porte une bordure haute qui « détache la déconnexion de la navigation, une action n'étant pas une destination ». Comme pour l'en-tête, cette bordure est propre à ce projet, le registry livrant `SidebarFooter` en `flex flex-col gap-2 p-2` nu.

Le `SidebarHeader` et le `SidebarGroupLabel` sont des intitulés de section : ils prennent la famille Label de la scale, `text-sm font-medium uppercase tracking-[0.25em] text-muted-foreground`. `text-balance` s'ajoute au-delà d'une dizaine de caractères, l'interlettrage large faisant vite déborder : « Espace admin » en compte 12, « Portfolio » 9.

**Le `SidebarHeader` prend `h-14` et une bordure basse**, les mêmes que la barre de contenu à sa droite. `docs/DESIGN.md` le pose en § Layout : les deux filets se prolongent alors en une seule ligne d'horizon, et l'intitulé du rail se lit comme un en-tête plutôt que comme le premier élément de la navigation. Sans hauteur fixe l'en-tête se cale sur son contenu, et les deux se décalent d'une douzaine de pixels sur chaque écran. Le registry shadcn ne pose ni l'une ni l'autre : `SidebarHeader` y est un `flex flex-col gap-2 p-2` nu.

Ce composant est client parce qu'il lit `usePathname()` pour surligner l'entrée active.

- [ ] **Step 2: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur. Un échec sur les `href` signifierait qu'une page d'attente de la Task 1 manque.

---

### Task 3 : Déconnexion, header et bascule de thème

**Files:**
- Create: `src/components/layout/AdminSignOutButton.tsx`
- Create: `src/components/layout/AdminHeader.tsx`
- Create: `src/components/layout/AdminThemeToggle.tsx`

**Interfaces:**
- Consomme : `authClient` de `src/lib/auth-client.ts`, `useTheme` de `src/lib/theme.ts`.
- Produit : `<AdminSignOutButton />`, monté par la sidebar de la Task 2, et `<AdminHeader email={string} />`, monté par le shell de la Task 4. Le shell passe **uniquement l'email**, jamais l'objet `user`.

> Le bouton de déconnexion vit dans la sidebar (DESIGN.md), le header ne porte que le déclencheur de repli, le nom de l'écran, l'email affiché et la bascule de thème. Un `DropdownMenu` de compte n'a plus lieu d'être : il ne contiendrait qu'une adresse email non actionnable.

- [ ] **Step 1: Écrire le bouton de déconnexion**

```typescript
'use client'

import { LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { authClient } from '@/lib/auth-client'
import { SidebarMenuButton } from '@/components/ui/sidebar'

export function AdminSignOutButton() {
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.push('/admin/login')
  }

  return (
    <SidebarMenuButton onClick={handleSignOut} tooltip="Se déconnecter">
      <LogOut />
      <span>Se déconnecter</span>
    </SidebarMenuButton>
  )
}
```

`SidebarMenuButton` et non un `Button` nu : c'est ce qui donne au pied la même hauteur et le même comportement replié que les entrées de navigation, `tooltip` compris. La bordure haute du `SidebarFooter`, posée à la Task 2, suffit à le distinguer d'une destination.

- [ ] **Step 2: Écrire le header**

```typescript
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { AdminThemeToggle } from '@/components/layout/AdminThemeToggle'

export function AdminHeader({ email }: { email: string }) {
  return (
    <header className="flex h-14 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="ml-auto flex items-center gap-2">
        <AdminThemeToggle />
        <Avatar className="size-7">
          <AvatarFallback>{email.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
```

Ce fichier n'a pas de directive `'use client'` : il reste un Server Component qui compose un composant client. C'est ce qui évite de rendre client tout le header.

Il reçoit une chaîne, pas un objet utilisateur. C'est ce qui satisfait le taint posé par `getCurrentUser()`.

Pas de `DropdownMenu` de compte : la déconnexion vit dans la sidebar, et un menu ne contiendrait plus qu'une adresse email non actionnable. L'avatar affiche l'initiale, et `title={email}` suffit à révéler l'adresse complète.

`AvatarFallback` seul, sans `AvatarImage` : l'image Google exigerait de déclarer son domaine dans `images.remotePatterns`, ce qui déborde du périmètre.

`SidebarTrigger` est ce qui ouvre le tiroir sur mobile et replie la sidebar sur écran large.

**La hauteur de 56px est commune au header et au `SidebarHeader`** (DESIGN.md § Layout) : les deux filets se prolongent alors en une seule ligne d'horizon.

- [ ] **Step 3: Écrire `AdminThemeToggle`**

**Le `ThemeToggle` public ne se réutilise pas ici.** Deux raisons, chacune suffisante : il appelle `useTranslations`, or `NextIntlClientProvider` n'est monté que sous `[locale]` et l'admin est hors de ce segment, donc il lèverait au rendu ; et il s'appuie sur `AnimatedThemeToggler` de Magic UI, que ce sub-project s'interdit dans l'admin. En écrire une version courte : le hook `useTheme` de `src/lib/theme.ts`, un `Button` shadcn, un `aria-label` français en dur, et le même placeholder tant que `resolvedTheme` est indéfini, sans quoi le rendu serveur et le client divergent.

- [ ] **Step 4: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 4 : Assembler le shell et l'écran d'arrivée

**Files:**
- Modify: `src/app/admin/(protected)/layout.tsx`
- Modify: `src/app/admin/(protected)/page.tsx`

**Interfaces:**
- Consomme : `<AdminSidebar />` de la Task 2, `<AdminHeader />` de la Task 3, `getCurrentUser()` du sub-project `05`.
- Produit : l'espace admin navigable, base des sub-projects `07` et suivants.

- [ ] **Step 1: Monter le shell dans le composant `Guard`**

Le fichier modifié est celui du **groupe protégé**, pas le root layout. Le sub-project `05` a scindé l'arbre : `admin/layout.tsx` porte le document (`<html>`, `<body>`, `globals.css`, thème, `<Toaster />`) et **ne bouge pas ici** ; `admin/(protected)/layout.tsx` porte la garde dans un composant `Guard` déjà monté sous `<Suspense>`. Le shell habille ce `Guard`, ce qui le tient hors de `/admin/login`.

```typescript
import { cookies } from 'next/headers'
import { Suspense, type CSSProperties, type ReactNode } from 'react'

import { AdminHeader } from '@/components/layout/AdminHeader'
import { AdminSidebar } from '@/components/layout/AdminSidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { getCurrentUser } from '@/lib/get-current-user'

async function Shell({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  const email = user.email

  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value !== 'false'

  return (
    <SidebarProvider
      defaultOpen={defaultOpen}
      style={{ '--sidebar-width': '13rem' } as CSSProperties}
    >
      <AdminSidebar />
      <SidebarInset>
        <AdminHeader email={email} />
        <main className="px-4 md:px-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AdminShellSkeleton />}>
      <Shell>{children}</Shell>
    </Suspense>
  )
}
```

Quatre points.

La ligne `const email = user.email` est ce qui rend le reste possible : elle extrait la donnée côté serveur. Écrire `<AdminHeader user={user} />` ferait échouer le rendu, l'objet étant tainté.

**La lecture du cookie est la moitié manquante de la persistance du repli.** Le composant shadcn écrit `sidebar_state` tout seul, mais ne le relit pas : sans `defaultOpen`, la sidebar revient déployée à chaque rechargement alors que le cookie est correctement écrit, et le scénario 2 du spec échoue sur sa dernière ligne. Le symptôme fait chercher du côté de l'écriture, où il n'y a rien à corriger. Vérifier le nom exact du cookie dans le `sidebar.tsx` généré par le CLI, la constante y est exportée.

**Tout ce qui est dynamique reste dans `Shell`.** `getCurrentUser()` lit `headers()`, `cookies()` est un accès dynamique lui aussi : avec `cacheComponents: true`, l'un comme l'autre hors de la frontière `<Suspense>` fait échouer le build sur « Uncached data was accessed outside of `<Suspense>` ». Le layout exporté, lui, reste synchrone.

Le `style` sur `SidebarProvider` porte les 13rem du design system, contre les 16rem par défaut : le composant étale le `style` reçu après ses propres variables, c'est donc l'API prévue et non une surcharge. Le mobile n'est pas concerné, la version mobile reposant sa largeur sur le `Sheet`.

`SidebarInset` occupe la largeur restante sans conteneur centré, conformément au design system. Le `<main>` ne porte que le retrait horizontal : le rythme vertical `py-6` à `py-8` appartient à chaque page, qui l'applique sur son conteneur racine.

Aucun `'use cache'` ici ni dans les descendants.

- [ ] **Step 1 bis: Remplacer le fallback vide par un squelette de shell**

Le sub-project `05` avait posé un fallback vide, faute de shell à esquisser. Écrire `AdminShellSkeleton` dans le même fichier : un bloc de 13rem à gauche et une barre de 56px en haut, en `Skeleton` shadcn. Sans lui, la première peinture est une page blanche et le shell surgit d'un coup, ce qui se voit d'autant plus que la vérification de session touche la base.

- [ ] **Step 2: Écrire l'écran d'arrivée**

```typescript
import Link from 'next/link'

import { ADMIN_NAV_ITEMS } from '@/config/admin-nav-items'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminHomePage() {
  return (
    <div className="w-full py-6 lg:py-8">
      <h1 className="font-sans text-2xl font-semibold tracking-tight">Espace admin</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="transition duration-300 ease-out hover:scale-[1.01] hover:shadow-xl">
              <CardHeader className="flex flex-row items-center gap-3">
                <Icon className="size-5 text-muted-foreground" />
                <CardTitle className="text-base">{label}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

**Le survol est un scale plus une ombre, pas un accent de contour.** La `Card` shadcn en `radix-nova` dessine son cadre avec `ring-1 ring-foreground/10` et garde une bordure de 0px : un `hover:border-*` n'a aucun effet visible. Et la card entière est enveloppée d'un `<Link>`, donc cliquable, ce qui range son survol dans les surfaces cliquables de DESIGN.md § États des Composants, `scale-[1.01]` plus ombre en `300ms ease-out`.

Des raccourcis, pas un tableau de bord : les chiffres d'audience appartiennent à la feature Analytics et les indicateurs CRM au domaine freelance.

Réutiliser `ADMIN_NAV_ITEMS` évite d'avoir deux listes de sections à maintenir en parallèle.

- [ ] **Step 3: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur.

---

### Task 5 : Vérifier le shell

**Files:** aucun fichier du dépôt.

**Interfaces:**
- Consomme : tout ce qui précède.
- Produit : la confirmation que le shell est utilisable, y compris au téléphone.

- [ ] **Step 1: Démarrer et se connecter**

```bash
just dev
```

Se connecter, puis arriver sur `/admin`.

Expected: la sidebar, le header et les quatre cartes de raccourci s'affichent.

- [ ] **Step 2: Vérifier la navigation et l'entrée active**

Parcourir les quatre entrées de la sidebar.

Expected: chaque page d'attente s'affiche, et l'entrée correspondante est visuellement distinguée dans la sidebar.

- [ ] **Step 3: Vérifier le repli à la souris et au clavier**

Actionner le déclencheur, puis recommencer en atteignant le bouton par tabulation et en l'activant à l'entrée ou à l'espace.

Expected: la sidebar se replie et se déploie dans les deux cas. Une fois repliée, les icônes restent visibles et leur infobulle apparaît au survol.

- [ ] **Step 4: Vérifier la persistance de l'état**

Sidebar repliée, recharger la page.

Expected: elle est toujours repliée.

Si elle revient déployée, ce n'est **pas** l'écriture du cookie qui est en cause : vérifier dans les outils de développement que `sidebar_state` vaut bien `false`, puis regarder du côté du `defaultOpen` de la Task 4. Le composant écrit ce cookie tout seul, il ne le relit jamais.

- [ ] **Step 5: Vérifier le comportement mobile**

Réduire la fenêtre sous 768 pixels, ou utiliser l'émulation mobile des outils de développement.

Expected: la sidebar disparaît et s'ouvre en tiroir via le déclencheur du header.

- [ ] **Step 6: Vérifier l'absence de débordement horizontal**

En format mobile, tenter de faire défiler la page latéralement, sur l'écran d'arrivée comme sur une page d'attente.

Expected: aucun défilement horizontal. C'est le défaut le plus fréquent d'un shell à sidebar, et il est invisible sur un écran large.

- [ ] **Step 7: Vérifier l'absence de double barre de défilement**

Sur écran large, avec une page suffisamment longue.

Expected: une seule barre de défilement verticale. Deux barres imbriquées signaleraient une `ScrollArea` mal placée dans la sidebar.

- [ ] **Step 8: Vérifier la bascule de thème**

Basculer en mode sombre depuis le header.

Expected: le shell entier suit, sidebar et header compris, sans zone restée claire, ce qui trahirait une couleur écrite en dur au lieu d'un token.

- [ ] **Step 9: Vérifier la déconnexion**

Vérifier que l'initiale affichée dans le header est celle du bon compte, puis se déconnecter depuis le pied de la sidebar.

Expected: retour sur `/admin/login`, et une nouvelle demande de `/admin` redirige de nouveau vers la connexion.

Vérifier au passage que le pied porte bien sa bordure haute et que « Se déconnecter » se replie en icône comme les entrées de navigation.

- [ ] **Step 9 bis: Vérifier que le shell n'entoure pas la connexion**

Déconnecté, afficher `/admin/login`.

Expected: ni sidebar ni header. Leur présence signalerait que le shell a été monté dans le root layout au lieu du groupe protégé.

- [ ] **Step 10: Vérifier l'absence de sélecteur de langue**

Inspecter le shell.

Expected: aucun `LanguageSwitcher`, et aucune URL de l'espace admin ne porte de préfixe de locale.

- [ ] **Step 11: Lancer la suite de tests**

```bash
just test
```

Expected: tous les tests verts. Ce sub-project n'en ajoute aucun, mais la suite existante ne doit pas régresser.

- [ ] **Step 11 bis: Vérifier le build de production**

```bash
pnpm build
```

Expected: aucune erreur. C'est le build, et non le typage, qui sanctionne un `cookies()` ou un `getCurrentUser()` sorti du composant `Shell`.

- [ ] **Step 12: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): shell de navigation avec sidebar repliable
```
