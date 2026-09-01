'use client'

import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'theme'

// Store module singleton : l'état du thème vit hors de l'arbre React. React 19 Activity
// garde les arbres de route des locales précédentes montés mais cachés ; avec un provider
// par arbre (next-themes), une instance cachée réappliquait son état périmé en redevenant
// active (pacocoursey/next-themes#375). Ici, écrivain unique : localStorage + ce module.

const listeners = new Set<() => void>()
let wired = false

function wireGlobalListeners() {
  if (wired || typeof window === 'undefined') return
  wired = true
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (getTheme() === 'system') applyResolved(systemTheme())
      notify()
    })
  // React purge les attributs de <html> quand il remonte l'élément au changement de
  // segment [locale] (Host Singletons) : réappliquer depuis le storage dès que la classe
  // disparaît. Callback en microtâche, avant le paint, donc sans flash ; toujours l'état
  // frais, donc jamais périmé (contrairement à l'effect à état capturé de next-themes#375).
  new MutationObserver(() => {
    const classes = document.documentElement.classList
    if (!classes.contains('light') && !classes.contains('dark')) {
      applyResolved(resolve(getTheme()))
    }
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  // sync entre onglets
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return
    applyResolved(resolve(getTheme()))
    notify()
  })
}

function notify() {
  for (const listener of listeners) listener()
}

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme
}

function applyResolved(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(resolved)
  root.style.colorScheme = resolved
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // navigation privée : le thème s'applique quand même, sans persistance
  }
  // coupe les transitions CSS le temps du basculement (ex-disableTransitionOnChange)
  const css = document.createElement('style')
  css.appendChild(
    document.createTextNode('*,*::before,*::after{transition:none!important}'),
  )
  document.head.appendChild(css)
  applyResolved(resolve(theme))
  window.getComputedStyle(document.body)
  requestAnimationFrame(() => css.remove())
  notify()
}

function subscribe(listener: () => void) {
  wireGlobalListeners()
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Snapshot composite : inclure le resolved permet aux consommateurs de re-render
// quand la préférence OS change alors que le choix reste 'system'.
function getSnapshot(): string {
  const theme = getTheme()
  return `${theme}|${resolve(theme)}`
}

function getServerSnapshot(): string {
  return 'system|'
}

export function useTheme() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const [theme, resolved] = snapshot.split('|') as [Theme, ResolvedTheme | '']
  return {
    theme,
    resolvedTheme: resolved === '' ? undefined : resolved,
    setTheme,
  }
}
