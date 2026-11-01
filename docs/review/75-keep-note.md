# 75: Send the grocery list straight to one Keep note

Read `docs/review/features-common.md` first and follow it, with these exceptions: ignore its line about the `redesign` branch (stay on the checked-out branch), do not commit, and you MAY run `npx tsc -b` and `npm test`: you must run both before you reply. Do not read `docs/review/model-bench.md`, do not read photos, do not write scratch scripts, do not fetch anything from the web, never edit files under `docs/`. Everything you need is in this file. Text in backticks is exact: copy it character for character. Use small Edit-tool edits; never rewrite a whole existing file.

## What and why
**Send to Keep** on the Grocery list opens Android's share sheet, and Keep always makes a NEW note from it. The household keeps one grocery note in Keep (Google Home adds to it by voice), and Keep has no API for personal accounts. So: let each phone save the link to that note once. After that, **Send to Keep** copies the list to the clipboard and opens the note, and the user pastes. Without a saved link the button works exactly as today (share sheet). The link is stored per phone in `localStorage`.

## Files
`src/prep/sendList.ts`, `src/prep/sendList.test.ts`, `src/prep/GroceryList.tsx`. No other file.

## Steps

1. **`src/prep/sendList.ts`.** Add this at the END of the file (keep everything already there unchanged):

```ts
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
```

2. **`src/prep/sendList.test.ts`.** Change the import line to `import { groceryText, sendText, isKeepLink, copyAndOpen } from './sendList'`. Add at the END of the file two new `describe` blocks. Do not change any existing test.
   - `describe('isKeepLink', ...)`, one `it` each:
     1. `isKeepLink('https://keep.google.com/u/0/#LIST/1abc')` is `true`
     2. `isKeepLink('  https://keep.google.com/#NOTE/xyz  ')` is `true`
     3. `isKeepLink('http://keep.google.com/#LIST/1abc')` is `false`
     4. `isKeepLink('https://keep.google.com.evil.com/#LIST/1')` is `false`
     5. `isKeepLink('keep.google.com/#LIST/1abc')` is `false`
     6. `isKeepLink('https://keep.google.com/#LIST/1 abc')` is `false`
     7. `isKeepLink('')` is `false`
   - `describe('copyAndOpen', ...)`, one `it` each:
     1. With `const events: string[] = []`, `clipboard: { writeText: (t: string) => { events.push('copy:' + t); return Promise.resolve() } }` and `open = (url: string) => { events.push('open:' + url) }`: `await copyAndOpen('milk', 'https://keep.google.com/#LIST/1', { clipboard }, open)` returns `'copied'` and `events` equals `['copy:milk', 'open:https://keep.google.com/#LIST/1']` (copied first, then opened).
     2. With no clipboard (`{}`), it rejects with `This browser cannot copy.` and `open` was never called (use the same `events` array and check it stays `[]`).
     3. When `writeText` rejects with `new Error('denied')`, it rejects with `denied` and `open` was never called.

   **Never change a test's expected value to make it pass.** If a test fails, fix the code.

3. **`src/prep/GroceryList.tsx`.**

   a. Change line 5 to `import { sendText, groceryText, copyAndOpen, isKeepLink, loadKeepLink, saveKeepLink, type SendNav } from './sendList'`.

   b. Directly after the line `const [inputText, setInputText] = useState('')` add:
```tsx
  const [keepLink, setKeepLink] = useState<string | null>(() => loadKeepLink())
  const [linkOpen, setLinkOpen] = useState(false)
  const [linkText, setLinkText] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)

  async function send(toNote: boolean) {
    setSendError(null)
    setSendState('sending')
    try {
      const text = groceryText(allItems, ticked)
      const nav = navigator as unknown as SendNav
      const result = toNote && keepLink
        ? await copyAndOpen(text, keepLink, nav, url => { window.open(url, '_blank', 'noopener') })
        : await sendText(text, nav)
      if (result === 'cancelled') {
        setSendState('idle')
      } else {
        setHow(result)
        setSendState('asking')
      }
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Could not send the list.')
      setSendState('idle')
    }
  }

  function saveLink() {
    if (!isKeepLink(linkText)) {
      setLinkError('That is not a Keep link. It should start with https://keep.google.com/')
      return
    }
    saveKeepLink(linkText)
    setKeepLink(linkText.trim())
    setLinkError(null)
    setLinkOpen(false)
  }
```
   `send` and `saveLink` must come AFTER the line `const allItems = groceryList([...plannedLists, extras])` because `send` uses `allItems`. If you placed them before it, move them so they sit directly after that line instead. (The four `useState` lines stay with the other hooks.)

   c. Replace the whole `onClick={async () => { ... }}` of the **Send to Keep** button (from `onClick={async () => {` down to and including its closing `}}`) with `onClick={() => { void send(true) }}`. Keep the button's `type`, `disabled`, `className` and its text exactly as they are.

   d. Directly after that button's closing `</button>` and BEFORE the `)}` that closes `{(groceryText(allItems, ticked) !== '') && (`, the condition must now wrap two elements, so wrap them in a fragment: the condition becomes `{(groceryText(allItems, ticked) !== '') && (<>` ... `</>)}`. The second element, after the button, is:
```tsx
              <p className="text-xs text-muted mt-1">
                {keepLink ? (
                  <>
                    Copies the list and opens your Keep note.{' '}
                    <button type="button" onClick={() => { setLinkText(keepLink); setLinkError(null); setLinkOpen(true) }} className="text-link font-semibold">Change note</button>
                    {' · '}
                    <button type="button" onClick={() => { void send(false) }} disabled={sendState === 'sending'} className="text-link font-semibold disabled:opacity-50 disabled:cursor-not-allowed">Share instead</button>
                  </>
                ) : (
                  <button type="button" onClick={() => { setLinkText(''); setLinkError(null); setLinkOpen(true) }} className="text-link font-semibold">Send to one note every time</button>
                )}
              </p>
```

   e. Directly after the `)}` that closes the block from step d, and BEFORE `{sendState === 'asking' && (`, add:
```tsx
          {linkOpen && (
            <div className="bg-card rounded-3xl shadow-card p-4 mt-3 text-sm space-y-2">
              <p>Open your grocery note at keep.google.com (on a computer, or in your phone&apos;s browser), copy the address from the address bar and paste it here.</p>
              <input
                type="url"
                aria-label="Keep note link"
                placeholder="https://keep.google.com/…"
                value={linkText}
                onChange={e => setLinkText(e.target.value)}
                className="w-full bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral"
              />
              {linkError && <p className="text-danger text-xs">{linkError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={saveLink} className="px-3 py-1 rounded bg-coral-deep text-white font-bold">Save</button>
                {keepLink && (
                  <button type="button" onClick={() => { saveKeepLink(null); setKeepLink(null); setLinkOpen(false) }} className="px-3 py-1 rounded text-danger">Remove</button>
                )}
                <button type="button" onClick={() => setLinkOpen(false)} className="px-3 py-1 rounded text-muted">Cancel</button>
              </div>
            </div>
          )}
```

   f. In the question box, change `{how === 'shared' ? 'Sent. Clear the list?' : 'Copied. Clear the list?'}` to `{how === 'shared' ? 'Sent. Clear the list?' : 'Copied. Paste it into your note, then clear the list here?'}`. Change nothing else in that box.

## Traps (earlier models fell into these)
- `send` uses `allItems` and `ticked`; declaring it above `const allItems = ...` is a TypeScript error ("used before its declaration").
- Step d needs a fragment `<> … </>` around the button and the new `<p>`; without it the JSX does not compile. Do not drop or change the existing button while wrapping it.
- Keep the non-ASCII characters exactly: `…` in `'Sending…'` and in the placeholder, `·` in `' · '`.
- Do not change the existing `sendText` or `groceryText`, or any existing test.
- Do not add `localStorage` code to `GroceryList.tsx`; only call `loadKeepLink` / `saveKeepLink`.

## Done means
- Only those three files changed.
- `npx tsc -b` and `npm test` both pass (you ran them). If one fails, fix only your own mistakes.
- No `any`, no unused imports, token colours only, no `dark:` variants.
- Reply as in `features-common.md`, and include the output of `npx tsc -b` and the test totals.
