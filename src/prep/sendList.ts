import type { GroceryItem } from './grocery'
import { groceryKey, formatGroceryItem } from './grocery'

export function groceryText(items: GroceryItem[], ticked: Set<string>): string {
  const remaining = items.filter(item => !ticked.has(groceryKey(item)))
  return remaining.map(formatGroceryItem).join('\n')
}

export type SendResult = 'shared' | 'copied' | 'cancelled'

export interface SendNav {
  share?: (data: { text: string }) => Promise<void>
  clipboard?: { writeText: (text: string) => Promise<void> }
}

export async function sendText(text: string, nav: SendNav): Promise<SendResult> {
  if (nav.share) {
    try {
      await nav.share({ text })
      return 'shared'
    } catch (err: unknown) {
      if ((err as { name?: string } | null)?.name === 'AbortError') {
        return 'cancelled'
      }
      throw err
    }
  }

  if (nav.clipboard) {
    await nav.clipboard.writeText(text)
    return 'copied'
  }

  throw new Error('This browser can neither share nor copy.')
}

export const KEEP_LINK_KEY = 'calbud:keep-link'

// A Keep note's address as copied from keep.google.com, e.g. https://keep.google.com/u/0/#LIST/1abc
export function isKeepLink(text: string): boolean {
  return /^https:\/\/keep\.google\.com\/\S*$/.test(text.trim())
}

export function loadKeepLink(): string | null {
  try {
    const saved = localStorage.getItem(KEEP_LINK_KEY)
    return saved && isKeepLink(saved) ? saved : null
  } catch {
    return null
  }
}

export function saveKeepLink(link: string | null): void {
  try {
    if (link) localStorage.setItem(KEEP_LINK_KEY, link.trim())
    else localStorage.removeItem(KEEP_LINK_KEY)
  } catch {
    // localStorage may be unavailable
  }
}

// Copies the list, then opens the note so it can be pasted in.
export async function copyAndOpen(text: string, link: string, nav: SendNav, open: (url: string) => void): Promise<'copied'> {
  if (!nav.clipboard) throw new Error('This browser cannot copy.')
  await nav.clipboard.writeText(text)
  open(link)
  return 'copied'
}
