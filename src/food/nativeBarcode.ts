import { compressUpcE } from './barcode'
// Chrome on Android has the phone's own barcode reader (BarcodeDetector). It reads small codes, like an 8-digit
// gum barcode, that the zxing reader misses. Where it doesn't exist (iPhone, Firefox) this does nothing.
type FoundCode = { rawValue: string; format?: string }
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
        const first = found[0]
        const code = first?.format === 'upc_e' ? (compressUpcE(first.rawValue) ?? first.rawValue) : first?.rawValue
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

// Phones without a built-in reader (iPhone) get the same kind of reader from the barcode-detector package
// (ZXing C++ compiled to WebAssembly). It is only downloaded on those phones, and its .wasm file ships with the app.
let fallback: Promise<DetectorClass | undefined> | undefined

export function fallbackDetector(): Promise<DetectorClass | undefined> {
  fallback ??= loadFallback()
  return fallback
}

async function loadFallback(): Promise<DetectorClass | undefined> {
  try {
    const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
      import('barcode-detector/ponyfill'),
      import('zxing-wasm/reader/zxing_reader.wasm?url'),
    ])
    prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) } })
    return BarcodeDetector as unknown as DetectorClass
  } catch {
    return undefined
  }
}
