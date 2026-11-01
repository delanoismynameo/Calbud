// Chrome on Android has the phone's own barcode reader (BarcodeDetector). It reads small codes, like an 8-digit
// gum barcode, that the zxing reader misses. Where it doesn't exist (iPhone, Firefox) this does nothing.
type FoundCode = { rawValue: string }
export type NativeDetector = { detect: (source: HTMLVideoElement) => Promise<FoundCode[]> }
export type DetectorClass = new (options: { formats: string[] }) => NativeDetector

const FORMATS = ['ean_13', 'upc_a', 'ean_8', 'upc_e']

export function browserDetector(): DetectorClass | undefined {
  return (globalThis as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector
}

// Checks the video four times a second and calls onFound once with the first code. Returns a function that stops it.
export function startNativeReader(
  video: HTMLVideoElement,
  onFound: (code: string) => void,
  Detector: DetectorClass | undefined = browserDetector(),
): () => void {
  if (!Detector) return () => {}
  let detector: NativeDetector
  try {
    detector = new Detector({ formats: FORMATS })
  } catch {
    return () => {}
  }
  let stopped = false
  let timer: ReturnType<typeof setTimeout> | undefined
  const tick = async () => {
    if (stopped) return
    try {
      if (video.readyState >= 2) {
        const found = await detector.detect(video)
        const code = found[0]?.rawValue
        if (!stopped && code) {
          stopped = true
          onFound(code)
          return
        }
      }
    } catch {
      // A frame that can't be read is skipped.
    }
    if (!stopped) timer = setTimeout(tick, 250)
  }
  timer = setTimeout(tick, 250)
  return () => {
    stopped = true
    clearTimeout(timer)
  }
}
