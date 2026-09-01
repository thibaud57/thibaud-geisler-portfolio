// Module sans directive : importable par le layout (Server Component), là où un module
// 'use client' n'exporterait qu'une référence et pas la chaîne.
// Script anti-FOUC : applique la classe de thème avant le premier paint, même logique
// de résolution que src/lib/theme.ts (localStorage 'theme', fallback préférence OS).
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.add(d?'dark':'light');r.style.colorScheme=d?'dark':'light'}catch(e){}})()`
