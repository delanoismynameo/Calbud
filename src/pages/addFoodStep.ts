// Add food's second screen (a picked food, or Create a food) is its own history entry,
// marked in the router's location state, so the phone's back button returns to the
// search instead of leaving the page.
export type AddFoodStep = 'food' | 'create'

export function stepState(step: AddFoodStep): { addFoodStep: AddFoodStep } {
  return { addFoodStep: step }
}

// The step a history entry is on, or null for the search (and for any other state).
export function stepFrom(state: unknown): AddFoodStep | null {
  if (typeof state !== 'object' || state === null || !('addFoodStep' in state)) return null
  const step = state.addFoodStep
  return step === 'food' || step === 'create' ? step : null
}
