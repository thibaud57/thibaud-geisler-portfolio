---
paths:
  - "src/components/**/*.tsx"
  - "src/components/ui/**/*.tsx"
---

# shadcn/ui — Composants, CVA & Server/Client

## À faire
- **Skill shadcn auto-chargé** (`.claude/skills/shadcn/`) : couvre CLI (`search`, `view`, `add`), critical rules de composition, patterns officiels. Toujours l'utiliser pour discovery/audit/install avant d'écrire un composant custom
- **Mapping composants** : voir [docs/DESIGN.md § Mapping Composants](../../../docs/DESIGN.md) pour le détail par surface et les variants configurés
- Utiliser **`cn()`** (fourni par shadcn dans `src/lib/utils.ts`, wrapper `clsx` + `tailwind-merge`) pour composer/override les classes Tailwind dans les composants
- **CVA pour variants typés** : utiliser `class-variance-authority` pour définir les variants (`size`, `variant`) avec types extraits via `VariantProps<typeof xxxVariants>` et `defaultVariants` pour les valeurs par défaut
- La prop `className` peut **toujours surcharger** les classes du variant via `cn()` (résout les conflits Tailwind via `tailwind-merge`)
- **Composants primitifs Server-friendly** : `Button`, `Card`, `Input`, `Label`, `Badge` fonctionnent en Server Components (pas de hook interne)
- **Composants interactifs Client-only** : `Dialog`, `Sheet`, `Popover`, `Select`, `DropdownMenu`, `Tooltip` utilisent des hooks Radix → marqués `'use client'` automatiquement par shadcn
- **Isoler les îlots clients le plus bas possible** : un formulaire interactif = `'use client'`, mais sa page parente reste Server Component
- **États hover/focus/disabled intégrés** (DESIGN.md) : ne pas redéfinir manuellement sur les composants shadcn — déjà accessibles et stylés
- **Bordures plutôt qu'ombres** (DESIGN.md) : `Card`, `Dialog`, `Popover` utilisent `--border` par défaut, pas `shadow-*` — privilégier la hiérarchie via fond (`--card` vs `--background`) et bordures
- **Icônes** (DESIGN.md) : utiliser **Lucide React** (inclus avec shadcn) pour toutes les icônes d'interface (flèches, menu, settings, mail) ; **Simple Icons** via `@icons-pack/react-simple-icons` pour les logos marques et technologies (Python, React, Docker, LinkedIn). Style stroke uniquement, tailles cohérentes : 16px inline, 20px UI standard, 24px standalone

## À éviter
- Inliner des couleurs Tailwind brutes (`bg-green-600`) ou hex en dur (`text-[#5E7A5D]`) : utiliser les tokens sémantiques (`bg-primary`, `text-foreground`)
- Utiliser **`@apply`** pour refactorer un ensemble de classes : extraire en composants React
- **Recréer un composant** équivalent à un shadcn existant (Button, Input, Card) au lieu d'utiliser celui de la lib
- **Redéfinir les états** `hover:`/`focus:`/`disabled:` sur les composants shadcn : ils sont déjà intégrés et accessibles

## Gotchas
- Pour la **convention de structure des sous-dossiers UI** (séparation `ui/`, `magicui/`, `aceternity/`) : voir `DESIGN.md` § Stack UI > Convention de structure

## Exemples
```typescript
// ✅ CVA variants typés + cn() pour override par className
const buttonVariants = cva('inline-flex items-center justify-center', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      outline: 'border border-input bg-background',
    },
    size: { default: 'h-10 px-4', sm: 'h-9 px-3', lg: 'h-11 px-8' },
  },
  defaultVariants: { variant: 'default', size: 'default' },
})

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
}
```

```typescript
// ✅ Page Server Component qui consomme des composants shadcn primitifs
export default function ContactPage() {
  return (
    <main>
      <h1>Contact</h1>
      <ContactForm /> {/* îlot client en bas de l'arbre */}
    </main>
  )
}

// ✅ Composant Client uniquement pour le formulaire interactif
'use client'
export function ContactForm() {
  return (
    <form>
      <Input name="email" type="email" />
      <Textarea name="message" />
      <Button type="submit">Envoyer</Button>
    </form>
  )
}
```
