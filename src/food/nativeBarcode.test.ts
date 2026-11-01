import { describe, it, expect, vi, afterEach } from 'vitest'
import { startNativeReader } from './nativeBarcode'

afterEach(() => {
  vi.useRealTimers()
})

function createFakeDetector(results: { rawValue: string }[][]) {
  const state = { calls: 0 }
  const FakeDetector = class {
    detect = async () => {
      const r = results[Math.min(state.calls, results.length - 1)]
      state.calls++
      return r
    }
  }
  return { class: FakeDetector as unknown as new (options: { formats: string[] }) => { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> }, state }
}

describe('startNativeReader', () => {
  it('with Detector undefined returns a function and onFound is never called after 1000 ms', async () => {
    vi.useFakeTimers()
    const video = { readyState: 4 } as unknown as HTMLVideoElement
    const onFound = vi.fn()
    const stop = startNativeReader(video, onFound, undefined)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onFound).not.toHaveBeenCalled()
    stop()
  })

  it('a detector that returns [{ rawValue: "02289902" }] calls onFound exactly once with "02289902" after 300 ms, and still exactly once after another 1000 ms', async () => {
    vi.useFakeTimers()
    const video = { readyState: 4 } as unknown as HTMLVideoElement
    const onFound = vi.fn()
    const { class: FakeDetector } = createFakeDetector([[{ rawValue: '02289902' }]])
    const stop = startNativeReader(video, onFound, FakeDetector)
    await vi.advanceTimersByTimeAsync(300)
    expect(onFound).toHaveBeenCalledTimes(1)
    expect(onFound).toHaveBeenCalledWith('02289902')
    await vi.advanceTimersByTimeAsync(1000)
    expect(onFound).toHaveBeenCalledTimes(1)
    stop()
  })

  it('a detector that returns [] then [{ rawValue: "02289902" }] calls onFound after 600 ms and not after 300 ms', async () => {
    vi.useFakeTimers()
    const video = { readyState: 4 } as unknown as HTMLVideoElement
    const onFound = vi.fn()
    const { class: FakeDetector } = createFakeDetector([[], [{ rawValue: '02289902' }]])
    const stop = startNativeReader(video, onFound, FakeDetector)
    await vi.advanceTimersByTimeAsync(300)
    expect(onFound).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(onFound).toHaveBeenCalledTimes(1)
    expect(onFound).toHaveBeenCalledWith('02289902')
    stop()
  })

  it('calling the returned stop function before 250 ms means onFound is never called after 1000 ms', async () => {
    vi.useFakeTimers()
    const video = { readyState: 4 } as unknown as HTMLVideoElement
    const onFound = vi.fn()
    const { class: FakeDetector } = createFakeDetector([[{ rawValue: '02289902' }]])
    const stop = startNativeReader(video, onFound, FakeDetector)
    await vi.advanceTimersByTimeAsync(100)
    stop()
    await vi.advanceTimersByTimeAsync(1000)
    expect(onFound).not.toHaveBeenCalled()
  })

  it('with a video whose readyState is 0 the detector\'s detect is never called after 1000 ms', async () => {
    vi.useFakeTimers()
    const video = { readyState: 0 } as unknown as HTMLVideoElement
    const onFound = vi.fn()
    const { class: FakeDetector, state } = createFakeDetector([[{ rawValue: '02289902' }]])
    const stop = startNativeReader(video, onFound, FakeDetector)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onFound).not.toHaveBeenCalled()
    expect(state.calls).toBe(0)
    stop()
  })

  it('a Detector whose constructor throws does not throw and onFound is never called', async () => {
    vi.useFakeTimers()
    const video = { readyState: 4 } as unknown as HTMLVideoElement
    const onFound = vi.fn()
    const FakeDetector = class {
      constructor() { throw new Error('test error') }
    } as unknown as new (options: { formats: string[] }) => { detect: (video: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
    expect(() => startNativeReader(video, onFound, FakeDetector)).not.toThrow()
    await vi.advanceTimersByTimeAsync(300)
    expect(onFound).not.toHaveBeenCalled()
  })
})
