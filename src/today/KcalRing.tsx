import { ringDash } from './ringMath'

const RADIUS = 72
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function KcalRing({ consumed, goal }: { consumed: number; goal: number }) {
  const { offset, over } = ringDash(consumed, goal, CIRCUMFERENCE)

  let displayNumber: string
  let label: string

  if (goal <= 0) {
    displayNumber = Math.abs(consumed).toLocaleString()
    label = 'cal eaten'
  } else if (over) {
    displayNumber = Math.abs(goal - consumed).toLocaleString()
    label = 'cal over'
  } else {
    displayNumber = Math.abs(goal - consumed).toLocaleString()
    label = 'cal left'
  }

  const strokeClass = over ? 'stroke-danger' : 'stroke-kcal'
  const textClass = over ? 'text-danger' : 'text-ink'

  return (
    <div
      className="relative mx-auto flex h-[180px] w-[180px] items-center justify-center rounded-full bg-coral-light shadow-card"
      role="img"
      aria-label={`${displayNumber} ${label}`}
    >
      <svg
        width={160}
        height={160}
        viewBox="0 0 160 160"
        className="absolute"
        aria-hidden
      >
        <circle
          cx={80}
          cy={80}
          r={RADIUS}
          fill="none"
          strokeWidth={14}
          className="stroke-ring-track"
        />
        <circle
          cx={80}
          cy={80}
          r={RADIUS}
          fill="none"
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          transform="rotate(-90 80 80)"
          className={strokeClass}
          style={{ transition: 'stroke-dashoffset 0.4s' }}
        />
      </svg>
      <div className="relative flex flex-col items-center justify-center">
        <span className={`text-5xl font-extrabold tracking-tight leading-none ${textClass}`}>
          {displayNumber}
        </span>
        <span className="text-[13px] font-semibold uppercase tracking-wide text-muted mt-1">
          {label}
        </span>
      </div>
    </div>
  )
}
