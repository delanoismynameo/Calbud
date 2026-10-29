import { useOnline } from '../lib/useOnline'

export default function OfflineBanner() {
  const online = useOnline()

  if (online) return null

  return (
    <div role="status" className="bg-amber-900 text-amber-100 text-sm text-center px-4 py-2">
      You&apos;re offline. Calbud needs a connection to load and save; it will catch up when you&apos;re back.
    </div>
  )
}
