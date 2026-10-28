import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'

interface BarcodeScannerProps {
  onCode: (code: string) => void
  onCancel: () => void
}

export default function BarcodeScanner({ onCode, onCancel }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onCodeRef = useRef(onCode)
  onCodeRef.current = onCode
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    let cancelled = false
    let controls: IScannerControls | undefined

    const startCamera = async () => {
      // 1D barcodes only (EAN, UPC): faster than also looking for QR codes.
      const reader = new BrowserMultiFormatOneDReader()
      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          video,
          (result, _err, ctl) => {
            if (result) {
              ctl.stop()
              onCodeRef.current(result.getText())
            }
          },
        )
        // Left before the camera started: turn it off now.
        if (cancelled) controls.stop()
      } catch {
        if (!cancelled) setCameraError('Camera not available. Type the barcode below.')
      }
    }

    startCamera()

    return () => {
      cancelled = true
      if (controls) controls.stop()
    }
  }, [])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget as HTMLFormElement
    const data = new FormData(form)
    const text = (data.get('barcode') as string).trim()
    if (text) onCode(text)
  }

  return (
    <div className="space-y-3">
      {cameraError ? (
        <p className="text-yellow-400 text-sm">{cameraError}</p>
      ) : (
        <>
          <p className="text-gray-400 text-xs">Point the camera at the barcode.</p>
          <video
            ref={videoRef}
            className="w-full rounded-lg bg-black aspect-[4/3] object-cover"
            muted
            playsInline
          />
        </>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="barcode-input" className="block text-gray-400 text-sm mb-1">Or type the barcode</label>
        <div className="flex gap-2">
          <input
            id="barcode-input"
            name="barcode"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue=""
            className="min-w-0 flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-3 text-white focus:outline-none focus:border-blue-500"
          />
          <button type="submit" className="py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold">Look up</button>
        </div>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded text-white font-semibold"
      >
        Cancel
      </button>
    </div>
  )
}
