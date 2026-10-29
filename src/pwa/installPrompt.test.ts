import { describe, it, expect, vi } from 'vitest'
import { createInstallPrompt, type InstallPromptEvent } from './installPrompt'

function fakeEvent(outcome: 'accepted' | 'dismissed') {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as InstallPromptEvent
  const prompt = vi.fn(async () => {})
  Object.assign(e, { prompt, userChoice: Promise.resolve({ outcome }) })
  return { e, prompt }
}

describe('createInstallPrompt', () => {
  it('before any event, canInstall() is false and await prompt() is unavailable', () => {
    const target = new EventTarget()
    const inst = createInstallPrompt(target)
    expect(inst.canInstall()).toBe(false)
    expect(inst.prompt()).resolves.toBe('unavailable')
  })

  it("after dispatching event: e.defaultPrevented is true, canInstall() is true, listener called once", () => {
    const target = new EventTarget()
    const inst = createInstallPrompt(target)
    const { e } = fakeEvent('accepted')
    const listener = vi.fn()
    inst.subscribe(listener)
    target.dispatchEvent(e)
    expect(e.defaultPrevented).toBe(true)
    expect(inst.canInstall()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("await prompt() with 'accepted' event returns 'accepted', calls event's prompt once, canInstall() is false after", async () => {
    const target = new EventTarget()
    const inst = createInstallPrompt(target)
    const { e, prompt } = fakeEvent('accepted')
    target.dispatchEvent(e)
    expect(inst.canInstall()).toBe(true)
    const result = await inst.prompt()
    expect(result).toBe('accepted')
    expect(prompt).toHaveBeenCalledTimes(1)
    expect(inst.canInstall()).toBe(false)
  })

  it("with 'dismissed' event: returns 'dismissed', canInstall() is false; second prompt() gives 'unavailable'", async () => {
    const target = new EventTarget()
    const inst = createInstallPrompt(target)
    const { e } = fakeEvent('dismissed')
    target.dispatchEvent(e)
    const result = await inst.prompt()
    expect(result).toBe('dismissed')
    expect(inst.canInstall()).toBe(false)
    expect(await inst.prompt()).toBe('unavailable')
  })

  it("after beforeinstallprompt then appinstalled event: canInstall() is false, listener called twice", () => {
    const target = new EventTarget()
    const inst = createInstallPrompt(target)
    const { e } = fakeEvent('accepted')
    const listener = vi.fn()
    inst.subscribe(listener)
    target.dispatchEvent(e)
    target.dispatchEvent(new Event('appinstalled'))
    expect(inst.canInstall()).toBe(false)
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it("after unsubscribe, a new event no longer calls that listener", () => {
    const target = new EventTarget()
    const inst = createInstallPrompt(target)
    const listener = vi.fn()
    const unsub = inst.subscribe(listener)
    unsub()
    const { e } = fakeEvent('accepted')
    target.dispatchEvent(e)
    expect(listener).not.toHaveBeenCalled()
  })
})
