import { useState } from 'react'

// Invite code in monospace with a Copy button; used in setup and on the Us page.
export default function CopyCode({ code, large = false }: { code: string; large?: boolean }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('failed')
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input readOnly value={code} onFocus={(e) => e.target.select()} aria-label="Invite code"
          className={`flex-1 min-w-0 font-mono text-center bg-slate-900 rounded p-3 ${large ? 'text-2xl tracking-widest' : 'text-base'}`} />
        <button type="button" onClick={copy}
          className="px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm">
          {status === 'copied' ? 'Copied' : 'Copy'}
        </button>
      </div>
      {status === 'failed' && <p className="text-red-400 text-sm">Copy failed. Select the code instead.</p>}
    </div>
  )
}
