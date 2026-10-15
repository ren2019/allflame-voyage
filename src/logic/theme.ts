export type Theme = 'light' | 'dark'

/** Keep the original key and map both previous product themes to their readable successor. */
export function restoreTheme(): Theme {
  let stored: string | null = null
  try { stored = localStorage.getItem('theme') } catch { /* preference storage may be unavailable */ }
  const theme = stored === 'light' || stored === 'harvest' ? 'light'
    : stored === 'dark' || stored === 'allflame' ? 'dark'
    : window.location.pathname.includes('harvest') ? 'light' : 'dark'
  applyTheme(theme)
  return theme
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.body.classList.remove('theme-harvest')
}

export function saveTheme(theme: Theme) {
  applyTheme(theme)
  try { localStorage.setItem('theme', theme) } catch { /* keep this tab usable without storage */ }
}
