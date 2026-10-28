---
paths:
  - "src/components/**/*.tsx"
  - "src/hooks/use-form-action-submit.ts"
---

# shadcn/ui : composants, CVA et Server/Client

## À faire
- **Skill shadcn auto-chargé** (`.claude/skills/shadcn/`) : couvre CLI (`search`, `view`, `add`), critical rules de composition, patterns officiels. Toujours l'utiliser pour discovery/audit/install avant d'écrire un composant custom
- **Mapping composants** : voir [docs/DESIGN.md § Mapping Composants](../../../docs/DESIGN.md) pour le détail par surface et les variants configurés
- **CVA pour variants typés** : définir les variants (`size`, `variant`) avec `class-variance-authority`, types extraits via `VariantProps<typeof xxxVariants>`, `defaultVariants` pour les valeurs par défaut. La prop `className` surcharge toujours le variant via `cn()`
- **Isoler les îlots clients le plus bas possible** : un formulaire interactif = `'use client'`, mais sa page parente reste Server Component
- **États hover/focus/disabled intégrés** (DESIGN.md) : ne jamais les redéfinir par `hover:`/`focus:`/`disabled:` sur un composant shadcn, ils sont déjà accessibles et stylés
- **Bordures plutôt qu'ombres** (DESIGN.md) : poser `--border` sur `Card` et `Dialog`, jamais `shadow-*` ; hiérarchiser par le fond (`--card` contre `--background`) et les bordures. Garder l'ombre du registry sur les seules surfaces flottantes (`Popover`, menus, liste d'un `Select`, `Sheet`)
- **Icônes** (DESIGN.md) : **Lucide React** pour toutes les icônes d'interface, **Simple Icons** via `@icons-pack/react-simple-icons` pour les logos marques et technologies. Style stroke, tailles 16px inline, 20px UI standard, 24px standalone
- **Imports d'icônes nommés uniquement, jamais `import *`** : un wildcard charge toute la librairie même pour une seule icône, aucun bundler ne le tree-shake. Un resolver dynamique (`resolveTagIcon`) passe par le registre statique de `src/lib/icons.tsx`
- Composer les classes et les couleurs selon `tailwind/conventions.md` (`cn()`, tokens sémantiques, pas de `@apply` réutilisable)
- Composants de l'espace admin (`EnumSelectItems`, `DetailDialog`, largeurs de `DataTable`) : voir `shadcn-ui/admin.md`

## À éviter
- **Recréer un composant** équivalent à un shadcn existant (Button, Input, Card) au lieu d'utiliser celui de la lib

## Gotchas
- **Un contrôle de formulaire Radix dans un `<form action>` perd son choix à chaque envoi** (`Select`, `RadioGroup`, `Switch`, `Slider`) : React réinitialise le formulaire après l'action, puis ces contrôles écoutent l'événement `reset` pour revenir à leur valeur du premier rendu par leur callback de changement (`onValueChange`, `onCheckedChange` pour `Switch`). Comportement voulu par Radix depuis `radix-ui` 1.6.2, pas un bug à attendre de corriger (constaté sur `@radix-ui/react-select` 2.3, le 2026-09-17). Le contournement (`onSubmit` + `startTransition(() => formAction(formData))`, sans reset) vit dans le hook `useFormActionSubmit` : l'appeler plutôt que le réécrire, tout formulaire admin portant un `Select` passe par lui
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
