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
      <div className="max-w-md mx-auto bg-blue-700 text-white rounded-lg shadow-xl p-3 flex items-center gap-3">
        <span className="flex-1 text-sm">A new version of Calbud is ready.</span>
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="bg-white text-blue-700 font-semibold rounded px-3 py-2 text-sm"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="text-sm text-blue-100 underline"
        >
          Later
        </button>
      </div>
    </div>
  )
}
