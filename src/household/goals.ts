export interface GoalInput { calories: string; protein: string; carbs: string; fat: string }
export interface Goals { goal_calories: number; goal_protein_g: number; goal_carbs_g: number; goal_fat_g: number }

export function parseGoals({ calories, protein, carbs, fat }: GoalInput):
  | { ok: true; goals: Goals }
  | { ok: false; errors: Partial<Record<keyof GoalInput, string>> } {
  const errors: Partial<Record<keyof GoalInput, string>> = {}

  const calTrimmed = calories.trim()
  const proTrimmed = protein.trim()
  const carbTrimmed = carbs.trim()
  const fatTrimmed = fat.trim()

  const calNum = Number(calTrimmed)
  const proNum = Number(proTrimmed)
  const carbNum = Number(carbTrimmed)
  const fatNum = Number(fatTrimmed)

  if (calTrimmed === '' || !Number.isInteger(calNum) || calNum < 500 || calNum > 10000) {
    errors.calories = 'A whole number from 500 to 10000.'
  }
  if (proTrimmed === '' || !Number.isInteger(proNum) || proNum < 1 || proNum > 1000) {
    errors.protein = 'A whole number from 1 to 1000.'
  }
  if (carbTrimmed === '' || !Number.isInteger(carbNum) || carbNum < 1 || carbNum > 1000) {
    errors.carbs = 'A whole number from 1 to 1000.'
  }
  if (fatTrimmed === '' || !Number.isInteger(fatNum) || fatNum < 1 || fatNum > 1000) {
    errors.fat = 'A whole number from 1 to 1000.'
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    goals: {
      goal_calories: calNum,
      goal_protein_g: proNum,
      goal_carbs_g: carbNum,
      goal_fat_g: fatNum,
    },
  }
}
