---
paths:
  - "**/*.test.tsx"
---

# Vitest — Tests de composants React (Testing Library)

## À faire
- Importer `render` depuis `@testing-library/react` et utiliser **`screen` global** pour les queries après `render()` (préféré aux utilitaires destructurés de `render()`)
- Prioriser les queries accessibles dans cet ordre : **`getByRole`** > `getByLabelText` > `getByPlaceholderText` > `getByText` > `getByTestId`
- **3 préfixes de query** : `getBy*` (throw si absent, sync), `queryBy*` (retourne `null` si absent, sync — utiliser pour vérifier l'**absence** d'un élément), `findBy*` (throw au timeout, async, pour éléments qui **apparaissent**)
- Pour attendre qu'un élément **apparaisse** : utiliser **`findBy*`** (combinaison `getBy + waitFor`, recommandé par `eslint-plugin-testing-library` règle `prefer-find-by`)
- Pour attendre un **changement d'état** sur un élément déjà présent (ex: bouton qui devient `disabled`) : utiliser **`waitFor(() => expect(...).toBe...)`** — `findBy` ne suffit pas car il n'attend que la présence, pas l'état
- Appeler **`userEvent.setup()`** AVANT chaque `render()` pour simuler le comportement navigateur réaliste (focus, hover, pointer events)
- Préférer **`userEvent`** à `fireEvent` : `fireEvent` envoie des événements DOM bruts sans la séquence complète (focus → keydown → keypress → input → keyup)
- Tester le **comportement utilisateur observable** (rendu, interactions, accessibilité), pas l'implémentation interne (state, hooks, refs)
- Wrapper les renders dans un **custom render** réutilisable pour injecter les providers (Theme, Intl, Router) sans répéter le boilerplate

## À éviter
- Utiliser `react-test-renderer` : **déprécié** React 19, utiliser `@testing-library/react`
- Utiliser `fireEvent` au lieu de `userEvent` : événements bruts sans simulation comportement navigateur (manque focus, hover, séquence keyboard)
- Utiliser le **snapshot testing systématique** : trop fragile, casse à chaque changement de markup sans valeur ajoutée — réserver aux structures vraiment stables
- Tester l'**implémentation interne** (`state`, hooks, props internes) au lieu du comportement observable : casse au moindre refactor

## Exemples
```typescript
// ✅ render + screen global + getByRole + userEvent.setup AVANT
const user = userEvent.setup()
render(<Form />)

await user.type(screen.getByRole('textbox', { name: /email/i }), 'a@b.c')
await user.click(screen.getByRole('button', { name: /submit/i }))

expect(screen.getByText(/success/i)).toBeInTheDocument()
```

```typescript
// ✅ findBy* pour async (préférer à waitFor + getBy)
const heading = await screen.findByRole('heading', { name: /loaded/i })

// ❌ waitFor + getBy : plus verbeux, même résultat
await waitFor(() => expect(screen.getByRole('heading')).toBeInTheDocument())
```

```typescript
// ✅ Custom render qui injecte les providers
function renderWithProviders(ui: ReactElement) {
  return render(<ThemeProvider><IntlProvider>{ui}</IntlProvider></ThemeProvider>)
}

// ❌ fireEvent : événement DOM brut, manque la séquence complète
fireEvent.click(button) // pas de focus, pas de pointer event

// ✅ userEvent : séquence navigateur complète
await user.click(button)
```
