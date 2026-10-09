---
paths:
  - "src/components/**/*.tsx"
  - "src/hooks/use-form-action-submit.ts"
---

# shadcn/ui — Composants, CVA & Server/Client

## À faire
- **Skill shadcn auto-chargé** (`.claude/skills/shadcn/`) : couvre CLI (`search`, `view`, `add`), critical rules de composition, patterns officiels. Toujours l'utiliser pour discovery/audit/install avant d'écrire un composant custom
- **Mapping composants** : voir [docs/DESIGN.md § Mapping Composants](../../../docs/DESIGN.md) pour le détail par surface et les variants configurés
- **CVA pour variants typés** : définir les variants (`size`, `variant`) avec `class-variance-authority`, types extraits via `VariantProps<typeof xxxVariants>`, `defaultVariants` pour les valeurs par défaut. La prop `className` surcharge toujours le variant via `cn()`
- **Composants primitifs Server-friendly** : `Button`, `Card`, `Input`, `Badge` n'ont aucun hook et se rendent en Server Component
- **Composants Client-only** : `Label` (il enveloppe une primitive Radix), `Dialog`, `Sheet`, `Popover`, `Select`, `DropdownMenu`, `Tooltip` sont marqués `'use client'` par shadcn
- **Isoler les îlots clients le plus bas possible** : un formulaire interactif = `'use client'`, mais sa page parente reste Server Component
- **États hover/focus/disabled intégrés** (DESIGN.md) : ne jamais les redéfinir par `hover:`/`focus:`/`disabled:` sur un composant shadcn, ils sont déjà accessibles et stylés
- **Bordures plutôt qu'ombres** (DESIGN.md) : `Card`, `Dialog`, `Popover` utilisent `--border`, pas `shadow-*`. Hiérarchie par le fond (`--card` vs `--background`) et les bordures
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
