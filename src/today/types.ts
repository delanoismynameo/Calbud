import type { Extras } from '../food/extras'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export interface MealLog {
  id: string
  user_id: string
  logged_on: string
  meal_type: MealType
  food_id: string | null
  name: string
  quantity_g: number
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  extra?: Extras
  created_at: string
  image_url?: string | null  // front-of-package photo from Open Food Facts
  photo_url?: string | null  // household photo for custom foods
}
