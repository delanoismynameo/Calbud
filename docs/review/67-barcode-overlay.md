# 67: Faster barcode scanner with a hotspot overlay

Read `docs/review/features-common.md` first and follow it.

## What and why
The scanner (`BarcodeScanner`) feels slow: the zxing reader tries a frame only every 500 ms and looks for many barcode types, and nothing shows where to hold the barcode. Make it faster and add an overlay that shows a "hotspot" box.

## Files
`src/food/BarcodeScanner.tsx` (100 lines). No other file.

## Steps
1. **Faster reader.** Import `BarcodeFormat` and `DecodeHintType` from `@zxing/library` (already installed). Build the reader like this, with the hints as a module-level constant above the component:
   ```ts
   const HINTS = new Map<DecodeHintType, unknown>([
     [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E]],
   ])
   // …
   const reader = new BrowserMultiFormatOneDReader(HINTS as Map<DecodeHintType, any>, { delayBetweenScanAttempts: 80, delayBetweenScanSuccess: 300 })
   ```
   (If `tsc` objects to the `any` cast, type the map as `Map<DecodeHintType, any>` with a one-line `// eslint-disable-next-line @typescript-eslint/no-explicit-any` above it.) Remove the old comment about "1D barcodes only" and replace it with one line saying the formats are limited to grocery barcodes for speed.
2. **Sharper picture.** Change the video constraints to `{ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } }`.
3. **Overlay.** Wrap the `<video>` in `<div className="relative overflow-hidden rounded-2xl">`. Inside that div, after the video, add an overlay `<div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">` holding a hotspot box: `<div className="relative h-1/3 w-4/5 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">` (the big shadow dims everything outside the box) containing a thin scan line `<div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-coral animate-pulse" />`. These camera-overlay colours (`border-white/90`, the black shadow) are allowed here because the overlay sits on the video, nowhere else.
4. Change the hint line above the video from "Point the camera at the barcode." to "Line the barcode up inside the box." Keep it a `<p className="text-muted text-xs">`. Also fix its indentation (it is currently one space short).
5. Change the video's own class from `w-full rounded-lg bg-black aspect-[4/3] object-cover` to `w-full bg-black aspect-[4/3] object-cover` (the wrapper now rounds the corners).
6. Do not change the manual "Or type the barcode" form, the Cancel button, the error handling, or the props.

## Done means
- Only `BarcodeScanner.tsx` changed. The scanner still calls `onCode` once with the text and stops the camera.
- Reply as in `features-common.md`.
