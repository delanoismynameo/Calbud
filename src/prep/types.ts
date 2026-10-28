export interface Ingredient {
  name: string
  qty: number | null
  unit: string
}

export interface MealPrep {
  id: string
  household_id: string
  created_by: string | null
  title: string
  recipe_url: string | null
  scheduled_date: string    // 'YYYY-MM-DD'
  start_time: string | null // 'HH:MM:SS'
  duration_min: number
  status: 'planned' | 'done'
  servings: number
  ingredients: Ingredient[]
  notes: string | null
  created_at: string        // timestamptz as ISO string
}

export type PrepFields = Pick<
  MealPrep,
  'title' | 'scheduled_date' | 'start_time' | 'duration_min' | 'servings' | 'recipe_url' | 'ingredients' | 'notes'
>
