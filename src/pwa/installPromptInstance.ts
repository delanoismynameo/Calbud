import { useSyncExternalStore } from 'react'
import { createInstallPrompt } from './installPrompt'

// One per app. main.tsx imports this file first, so it listens before Chrome fires the event.
export const installPrompt = createInstallPrompt(window)

export function useCanInstall(): boolean {
  return useSyncExternalStore(installPrompt.subscribe, installPrompt.canInstall, () => false)
}
