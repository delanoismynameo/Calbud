export function ringDash(consumed: number, goal: number, circumference: number): { offset: number; over: boolean } {
  if (!Number.isFinite(consumed) || !Number.isFinite(goal) || consumed < 0 || goal <= 0) {
    return { offset: circumference, over: false }
  }

  const fraction = Math.min(consumed / goal, 1)
  const offset = circumference * (1 - fraction)
  const over = consumed > goal

  return { offset, over }
}
