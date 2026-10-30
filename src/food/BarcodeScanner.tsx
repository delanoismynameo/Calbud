import { useState, useRef, useEffect } from 'react'
import { BrowserMultiFormatOneDReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

interface BarcodeScannerProps {
  onCode: (code: string) => void
  onCancel: () => void
}

const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8, BarcodeFormat.UPC_E]],
])

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
      // Limited to grocery barcodes for speed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new BrowserMultiFormatOneDReader(HINTS as Map<DecodeHintType, any>, { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 300 })
      try {
        controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } },
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
        <p className="text-warn text-sm">{cameraError}</p>
      ) : (
        <>
          <p className="text-muted text-xs">Line the barcode up inside the box.</p>
          <div className="relative overflow-hidden rounded-2xl">
            <video
              ref={videoRef}
              className="w-full bg-black aspect-[4/3] object-cover"
              muted
              playsInline
            />
            <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-1/3 w-4/5 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-coral animate-pulse" />
              </div>
            </div>
          </div>
        </>
      )}

      <form onSubmit={handleSubmit}>
        <label htmlFor="barcode-input" className="block text-muted text-sm mb-1">Or type the barcode</label>
        <div className="flex gap-2">
          <input
            id="barcode-input"
            name="barcode"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            defaultValue=""
            className="min-w-0 flex-1 bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral"
          />
          <button type="submit" className="px-4 py-3 bg-coral-deep hover:bg-coral-deeper rounded-2xl text-white font-bold">Look up</button>
        </div>
      </form>

      <button
        type="button"
        onClick={onCancel}
        className="w-full py-3 bg-coral-light hover:bg-coral-deep/10 text-link rounded-2xl font-semibold"
      >
        Cancel
      </button>
    </div>
  )
}
