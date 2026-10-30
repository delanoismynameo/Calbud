# Redesign tasks: rules that apply to every one

Each redesign brief (tasks 50–64) says "read this file first". Follow all of it.

## Before you start
- Read `docs/DESIGN_PLAN.md`: the sections "Ground rules for every task", "Visual spec" and "Dark mode". The target look is `dev/calbud-mockups-v2.html`.
- You are on git branch `redesign`. Do not commit, switch branch, or touch any file not listed under "Files" in your brief.
- Change the look only: no change to logic, hooks, routes, queries, existing props, or visible text.
- Colors come only from the token classes: `bg-cream`, `bg-card`, `text-ink`, `text-muted`, `border-line`, `bg-coral-light`, `bg-coral-deep`, `hover:bg-coral-deeper`, `text-link`, `text-section`, `text-danger`, `text-warn`, `shadow-card`, `bg-rose-soft`, `text-rose-ink`, and so on (all defined in `src/index.css` by task 50). Never use `slate-`, `gray-`, `blue-`, `red-`, `amber-` classes or hex colors. No `dark:` variants: the tokens switch with the theme by themselves.
- Edit with the edit tool, one component or JSX block at a time. Never rewrite a whole file from scratch. Write new files in chunks of about 100 lines.
- Check with `npx tsc -b` and `npm test`. Run `npm test` once before you change anything and note the number of passing tests. If a command is blocked by the sandbox, say so in your reply; do not work around it and do not create config files.
- Some files contain non-ASCII characters (`‹ › … · —` and emoji). When you edit a line that contains one, copy it exactly: a mangled character like `â€¹` breaks the build. After each edit, check the line still ends its tags correctly (`>`).
- Do one brief only. Do not start any other task.

## Style rules for reskin tasks
- Cards: `bg-card rounded-3xl shadow-card p-4` (or `p-5`). Rows inside a card or list: `rounded-2xl`.
- Page-level section titles: `text-[13px] font-bold uppercase tracking-[1.5px] text-section`.
- Primary button: `bg-coral-deep hover:bg-coral-deeper text-white rounded-2xl font-bold py-3`. Secondary button: `bg-coral-light text-link rounded-2xl font-semibold`. Destructive text button: `text-danger`.
- Inputs, selects, textareas: `bg-card border border-line rounded-2xl text-ink placeholder:text-muted px-4 py-3`, with `focus:outline-none focus:ring-2 focus:ring-coral`.
- Old to new: `bg-slate-900` → `bg-cream` (page) or `bg-coral-light/50` (inset row); `bg-slate-800` → card; `hover:bg-slate-700` → `hover:bg-coral-light`; `border-slate-*` → `border-line`; `text-white` → `text-ink`; `text-gray-*` → `text-muted`; blue button → primary button; `text-blue-400` link → `text-link underline`; `text-red-400` → `text-danger`; `text-amber-*` → `text-warn`; `bg-blue-500` progress fills → `bg-ring`; progress tracks → `bg-ring-track`.
- Coral-coloured text (links, selected/unselected labels) is always `text-link`, never `text-coral-deep` (the dark theme needs the lighter coral). `bg-coral-deep` is only for fills.
- `text-white` stays only on a filled `bg-coral-deep` button or the coral scan button.

## Done means (reskin tasks)
- `npx tsc -b` passes; `npm test` passes with the same number of tests as before.
- `grep -nE "slate-|gray-|blue-|red-|amber-|text-white|#[0-9a-fA-F]{3,6}" <your files>` finds nothing except the allowed `text-white` above.
- `git diff` shows only className/JSX changes in your files. Every visible string is unchanged.

## Reply
Your last message lists: the files changed; each numbered step marked done or not done; the last lines of the `npx tsc -b` and `npm test` output; anything you skipped or were unsure about. Do not say a screen "looks right": Claude checks it in a browser.
