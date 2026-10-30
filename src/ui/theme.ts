export type ThemePref = 'system' | 'light' | 'dark'
export const THEME_KEY = 'calbud-theme'

function getSystemDark(): boolean {
  return matchMedia('(prefers-color-scheme: dark)').matches
}

export function parseTheme(raw: string | null | undefined): ThemePref {
  if (raw === 'light' || raw === 'dark') {
    return raw
  }
  return 'system'
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): 'light' | 'dark' {
  if (pref === 'system') {
    return systemDark ? 'dark' : 'light'
  }
  return pref
}

export function loadTheme(): ThemePref {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return parseTheme(raw)
  } catch {
    return 'system'
  }
}

export function saveTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(THEME_KEY, pref)
  } catch {
    // localStorage may be unavailable
  }
}

export function applyTheme(pref: ThemePref): void {
  const systemDark = getSystemDark()
  const resolved = resolveTheme(pref, systemDark)
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export function initTheme(): void {
  applyTheme(loadTheme())
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    applyTheme(loadTheme())
  })
}
