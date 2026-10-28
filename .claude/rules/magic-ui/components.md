---
paths:
  - "src/components/magicui/**/*.tsx"
---

# Magic UI : composants animés copy-paste

## À faire
- Installer par le skill `shadcn` (registry `@magicui` déclaré dans `components.json`, voir [DESIGN.md § Outils & Discovery](../../../docs/DESIGN.md)) : composants copiés dans **`src/components/magicui/`**, à part de `src/components/ui/` (shadcn/ui pur)
- Importer **`motion`** via `motion/react`, jamais `framer-motion`
- Poser `'use client'` dans le fichier d'un composant qui utilise des hooks ou des APIs navigateur, seulement là : un Server Component parent l'importe directement
- Respecter le plafond d'effets par page, les durées et les easings de [DESIGN.md § Animations](../../../docs/DESIGN.md) ainsi que la répartition entre Magic UI, Aceternity UI et shadcn/ui de § Mapping Composants
- Confier l'entrée au scroll des sections marketing à **`MotionItem`** (`src/components/ui/motion-item.tsx`, DESIGN.md § Animations), pas à un composant Magic UI

## À éviter
- Utiliser le package **`magicui-cli`** : legacy, abandonné
- Utiliser Magic UI dans l'**espace admin** : DESIGN.md le réserve aux surfaces marketing du site public
- Réinstaller `clsx` ou `tailwind-merge`, que le paquet `cn` remplace

## Gotchas
- **Pas de versioning sémantique** (copy-paste via registry shadcn) : les composants restent figés à l'install, relancer `add --overwrite @magicui/<component>` pour récupérer l'upstream
- `v3.magicui.design` garde la variante Tailwind v3 : utiliser **`magicui.design`** (v4)
- Philosophie copy-paste (versionnement, modification, ownership) partagée avec shadcn-ui : voir `shadcn-ui/setup.md`

## Exemples
```typescript
// ✅ Server Component qui importe un effet client directement
export async function Cta() {
  const t = await getTranslations('Cta')
  return <Marquee>{t('label')}</Marquee>
}
```
