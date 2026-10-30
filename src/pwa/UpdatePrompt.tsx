import { useRegisterSW } from 'virtual:pwa-register/react'

export default function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url: string, registration: ServiceWorkerRegistration | undefined) {
      if (registration) {
        setInterval(() => {
          registration.update()
        }, 60 * 60 * 1000)
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update()
          }
        })
      }
    },
  })

  if (!needRefresh) return null

  return (
    <div className="fixed bottom-16 inset-x-0 z-20 px-4">
      <div className="max-w-md mx-auto bg-card text-ink shadow-card rounded-2xl p-3 flex items-center gap-3">
        <span className="flex-1 text-sm">A new version of Calbud is ready.</span>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="bg-coral-deep hover:bg-coral-deeper text-white font-bold rounded-2xl px-3 py-2 text-sm"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="text-sm text-muted underline"
        >
          Later
        </button>
      </div>
    </div>
  )
}
