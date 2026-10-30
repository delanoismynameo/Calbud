import { useTheme } from './useTheme'
import type { ThemePref } from './theme'

const OPTIONS: { label: string; value: ThemePref }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
]

export default function ThemeToggle(): JSX.Element {
  const [pref, setPref] = useTheme()

  return (
    <div className="bg-card rounded-3xl shadow-card p-5">
      <h2 className="text-[13px] font-bold uppercase tracking-[1.5px] text-section mb-3">
        Appearance
      </h2>
      <div className="flex rounded-2xl bg-coral-light p-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            aria-pressed={pref === opt.value}
            onClick={() => setPref(opt.value)}
            className={
              pref === opt.value
                ? 'flex-1 rounded-xl bg-card text-ink shadow-card font-bold py-2'
                : 'flex-1 py-2 text-muted'
            }
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
