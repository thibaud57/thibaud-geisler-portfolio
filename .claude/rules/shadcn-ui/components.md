---
paths:
  - "src/components/**/*.tsx"
  - "src/hooks/use-form-action-submit.ts"
  - "src/lib/admin/table-widths.ts"
  - "src/components/features/admin/**/*-table-widths.ts"
---

# shadcn/ui — Composants, CVA & Server/Client

## À faire
- **Skill shadcn auto-chargé** (`.claude/skills/shadcn/`) : couvre CLI (`search`, `view`, `add`), critical rules de composition, patterns officiels. Toujours l'utiliser pour discovery/audit/install avant d'écrire un composant custom
- **Mapping composants** : voir [docs/DESIGN.md § Mapping Composants](../../../docs/DESIGN.md) pour le détail par surface et les variants configurés
- **CVA pour variants typés** : définir les variants (`size`, `variant`) avec `class-variance-authority`, types extraits via `VariantProps<typeof xxxVariants>`, `defaultVariants` pour les valeurs par défaut. La prop `className` surcharge toujours le variant via `cn()`
- **Composants primitifs Server-friendly** : `Button`, `Card`, `Input`, `Badge` n'ont aucun hook et se rendent en Server Component
- **Composants Client-only** : `Label` (il enveloppe une primitive Radix), `Dialog`, `Sheet`, `Popover`, `Select`, `DropdownMenu`, `Tooltip` sont marqués `'use client'` par shadcn
- **Isoler les îlots clients le plus bas possible** : un formulaire interactif = `'use client'`, mais sa page parente reste Server Component
- **Options d'une énumération dans un `Select`** : `EnumSelectItems` (`src/components/features/admin/form/`), avec `values`, `labels` et la table `*_ICONS` quand l'énumération en a une (DESIGN.md § Icônes). Jamais une boucle de `SelectItem` écrite à la main : seule la sentinelle « Non renseigné » reste un `SelectItem` posé directement. La sentinelle `NONE_VALUE` n'existe que dans `OptionSelect` et `SingleSelectCombobox`, avec deux exceptions : l'identifiant d'un `CommandItem` cmdk (`LegalEntityCard`, `SingleSelectCombobox`) et le `Select` brut « Entreprise » de la ligne du nouveau contact (`InterviewForm`), gardé brut pour que son placeholder ne soit pas remplacé par « Aucune ». Hors de ces cas, `SelectField`, `OptionSelect`, `CompanyCombobox` et `PersonCombobox` exposent `T | null`, jamais la sentinelle
- **Disposition d'une vue détail (`DetailDialog`)** : `fullWidth: true` seulement sur un texte long ou une liste de fiches rattachées, jamais sur des badges, un lien ou une date ; la grille passe seule à deux colonnes (`TitledBlock`) et un dernier champ impair reste seul à gauche. Blocs dans l'ordre champs courts, Notes, Détails, fiches rattachées. En-tête par données seules (`image` pour un logo ou une couverture, `title`, `subtitle`, `badges` construits par `headerBadge`), jamais de JSX d'écran (DESIGN.md § Overlays, « Vue détail »)
- **Largeur d'une colonne de liste (`DataTable`, `<entité>-table-widths.ts` à côté de sa table, constantes communes dans `src/lib/admin/table-widths.ts`)** : un multiple de 8, au plus juste entre l'en-tête (icône de tri comprise) et le contenu des lignes à 95 %, mesurés sur les vraies données de la vue complète. Une colonne de badges prend son badge le plus large, qui ne se tronque ni ne passe à la ligne ; un texte long garde un plafond et se tronque. Un en-tête de plusieurs mots plus long que son contenu passe sur deux lignes (`wrapHeader`) plutôt que d'élargir la colonne
- **États hover/focus/disabled intégrés** (DESIGN.md) : ne jamais les redéfinir par `hover:`/`focus:`/`disabled:` sur un composant shadcn, ils sont déjà accessibles et stylés
- **Bordures plutôt qu'ombres** (DESIGN.md) : poser `--border` sur `Card` et `Dialog`, jamais `shadow-*` ; hiérarchiser par le fond (`--card` contre `--background`) et les bordures. Garder l'ombre du registry sur les seules surfaces flottantes (`Popover`, menus, liste d'un `Select`, `Sheet`)
- **Icônes** (DESIGN.md) : **Lucide React** pour toutes les icônes d'interface, **Simple Icons** via `@icons-pack/react-simple-icons` pour les logos marques et technologies. Style stroke, tailles 16px inline, 20px UI standard, 24px standalone
- **Imports d'icônes nommés uniquement, jamais `import *`** : `import *` charge les 5700+ icônes (5,7 Mo gzip) même pour une seule, aucun bundler ne tree-shake un wildcard. Un resolver dynamique (`resolveTagIcon`) passe par le registre statique de `src/lib/icons.tsx`
- Composer les classes et les couleurs selon `tailwind/conventions.md` (`cn()`, tokens sémantiques, pas de `@apply` réutilisable)

## À éviter
- **Recréer un composant** équivalent à un shadcn existant (Button, Input, Card) au lieu d'utiliser celui de la lib

## Gotchas
- **Un contrôle de formulaire Radix dans un `<form action>` perd son choix à chaque envoi** (`Select`, `RadioGroup`, `Switch`, `Slider`) : React réinitialise le formulaire après l'action, et ces contrôles écoutent l'événement `reset` pour revenir à leur valeur du premier rendu par leur callback de changement (`onValueChange`, `onCheckedChange` pour `Switch`). Comportement voulu par Radix depuis `radix-ui` 1.6.2, pas un bug à attendre de corriger (constaté sur `@radix-ui/react-select` 2.3, le 2026-09-17). Le contournement (`onSubmit` + `startTransition(() => formAction(formData))`, sans reset) vit dans le hook `useFormActionSubmit` : l'appeler plutôt que le réécrire, tout formulaire admin portant un `Select` passe par lui
- Pour la **convention de structure des sous-dossiers UI** (séparation `ui/`, `magicui/`, `aceternity/`) : voir `DESIGN.md` § Stack UI > Convention de structure

## Exemples
```typescript
// ✅ CVA variants typés + cn() pour override par className
const badgeVariants = cva('inline-flex items-center rounded-md', {
  variants: { variant: { default: 'bg-primary text-primary-foreground', outline: 'border' } },
  defaultVariants: { variant: 'default' },
})

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}

// ❌ État redéfini sur un composant shadcn déjà stylé
<Button className="hover:bg-green-700 focus:ring-2">Envoyer</Button>
```
