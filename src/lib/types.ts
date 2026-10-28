export interface Profile {
  id: string
  household_id: string | null
  display_name: string
  color: string
  goal_calories: number
  goal_protein_g: number
  goal_carbs_g: number
  goal_fat_g: number
  timezone: string
  created_at: string
}

export interface Household {
  id: string
  name: string
  invite_code: string
  created_at: string
}
