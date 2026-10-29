import type { FoodRowFromDb } from '../food/recents'
export type MenuMeal = 'breakfast' | 'lunch' | 'dinner'
export const MENU_MEALS: MenuMeal[] = ['breakfast', 'lunch', 'dinner']
export interface MenuSlot {
  id: string
  household_id: string
  slot_date: string        // 'YYYY-MM-DD'
  meal: MenuMeal
  label: string
  prep_id: string | null
  meal_prep: { title: string; foods: FoodRowFromDb | null } | null   // embedded, see step 3
}
