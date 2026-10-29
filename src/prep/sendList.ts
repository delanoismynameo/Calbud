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
      if (err instanceof Error && err.name === 'AbortError') {
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
