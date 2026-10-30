# Feature tasks 66-69: rules that apply to every one

Each brief says "read this file first". Follow all of it.

## Before you start
- You are on git branch `redesign`. Do not commit, switch branch, or touch any file not listed under "Files" in your brief.
- The app was just restyled. Match the look of the code around your change. Colours come only from the token classes (`bg-cream`, `bg-card`, `text-ink`, `text-muted`, `border-line`, `bg-coral-light`, `bg-coral-deep`, `hover:bg-coral-deeper`, `text-link`, `text-section`, `text-danger`, `text-warn`, `shadow-card`, `bg-green-soft`, `text-green-ink`). Never use `slate-`, `gray-`, `blue-`, `red-`, `amber-` classes or hex colours, and no `dark:` variants. `text-white` only on a filled `bg-coral-deep` button. Coral-coloured text is `text-link`, never `text-coral-deep`.
- Style patterns to copy: card `bg-card rounded-3xl shadow-card p-4`; input `bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3 focus:outline-none focus:ring-2 focus:ring-coral`; primary button `bg-coral-deep hover:bg-coral-deeper text-white rounded-2xl font-bold py-3`; secondary button `bg-coral-light text-link rounded-2xl font-semibold`; section title `text-[13px] font-bold uppercase tracking-[1.5px] text-section`. A disabled button keeps its prefix: `disabled:opacity-50 disabled:cursor-not-allowed`.
- Edit with the edit tool, one block at a time. Never rewrite a whole existing file from scratch. Write new files in chunks of about 100 lines.
- Some files contain non-ASCII characters (`‹ › … · —`). When you edit a line that has one, copy it exactly: a mangled character like `â€¹` breaks the build. After each edit check the tags on the line still end with `>`.
- Do not change anything else: no change to existing behaviour, props that already exist, routes, or visible text outside what the brief names.
- You cannot run npm, npx or node in this sandbox. Do not try to work around it and do not create config files. Claude runs `npx tsc -b` and `npm test` after you. Write code that type-checks under strict TypeScript: no `any`, and no unused imports or variables.
- Do one brief only. Do not start any other task.

## Reply
Your last message lists: the files changed or created; each numbered step marked done or not done; anything you skipped or were unsure about. Do not say a screen "looks right": Claude checks it in a browser.
