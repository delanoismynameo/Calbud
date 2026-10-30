import { useState } from 'react'
import type { ThemePref } from './theme'
import { loadTheme, saveTheme, applyTheme } from './theme'

export function useTheme(): [ThemePref, (pref: ThemePref) => void] {
  const [pref, setPrefState] = useState<ThemePref>(loadTheme)

  const setPref = (pref: ThemePref): void => {
    saveTheme(pref)
    applyTheme(pref)
    setPrefState(pref)
  }

  return [pref, setPref]
}
