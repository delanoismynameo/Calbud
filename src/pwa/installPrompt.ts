// The parts of Chrome's beforeinstallprompt event that are used (it isn't in TypeScript's DOM types).
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallPrompt {
  canInstall: () => boolean                    // an event is being kept
  subscribe: (listener: () => void) => () => void   // called whenever canInstall may have changed; returns an unsubscribe function
  prompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'>
}

// Starts listening on `target` straight away:
//  'beforeinstallprompt': call event.preventDefault(), keep the event, notify the listeners.
//  'appinstalled': forget the kept event, notify.
// prompt(): no kept event → 'unavailable'. Otherwise take the kept event, forget it (it works only once), notify,
//  then await event.prompt() and return (await event.userChoice).outcome.
export function createInstallPrompt(target: EventTarget): InstallPrompt {
  let kept: InstallPromptEvent | null = null
  const listeners = new Set<() => void>()

  function notify() {
    for (const l of listeners) l()
  }

  target.addEventListener('beforeinstallprompt', (e: Event) => {
    const promptEvent = e as InstallPromptEvent
    promptEvent.preventDefault()
    kept = promptEvent
    notify()
  })

  target.addEventListener('appinstalled', () => {
    kept = null
    notify()
  })

  return {
    canInstall() {
      return kept !== null
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    async prompt() {
      if (!kept) return 'unavailable'
      const ev = kept
      kept = null
      notify()
      await ev.prompt()
      return (await ev.userChoice).outcome
    }
  }
}
