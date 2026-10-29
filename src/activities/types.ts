export interface Activity {
  id: string
  user_id: string
  title: string
  scheduled_date: string
  start_time: string | null
  duration_min: number | null
  kcal_burned: number | null
  completed: boolean
  notes: string | null
  created_at: string
}

export type ActivityFields = Pick<Activity, 'title' | 'scheduled_date' | 'start_time' | 'duration_min' | 'kcal_burned' | 'notes'>
