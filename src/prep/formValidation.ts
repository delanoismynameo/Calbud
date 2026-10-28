import type { MealPrep, PrepFields } from './types'
import { parseIngredients, formatIngredients } from './ingredients'

export interface PrepFormInput {
  title: string
  date: string
  startTime: string
  duration: string
  servings: string
  recipeUrl: string
  ingredients: string
  notes: string
}

export type { PrepFields }

function isInt(s: string): boolean {
  return /^\d+$/.test(s)
}

export function parsePrepForm(input: PrepFormInput):
  | { ok: true; fields: PrepFields }
  | { ok: false; errors: Partial<Record<keyof PrepFormInput, string>> }
{
  const errors: Partial<Record<keyof PrepFormInput, string>> = {}

  // title
  const titleTrimmed = input.title.trim()
  if (titleTrimmed === '') {
    errors.title = 'Give it a name.'
  } else if (titleTrimmed.length > 80) {
    errors.title = 'Keep this under 80 characters.'
  }

  // date
  const dateTrimmed = input.date.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateTrimmed)) {
    errors.date = 'Pick a date.'
  }

  // startTime
  const startTimeTrimmed = input.startTime.trim()
  let start_time: string | null = null
  if (startTimeTrimmed === '') {
    start_time = null
  } else if (/^\d{2}:\d{2}$/.test(startTimeTrimmed)) {
    start_time = startTimeTrimmed + ':00'
  } else {
    errors.startTime = 'Use a time like 14:30.'
  }

  // duration
  const durationTrimmed = input.duration.trim()
  let duration_min = 60
  if (durationTrimmed === '') {
    duration_min = 60
  } else if (isInt(durationTrimmed)) {
    const num = Number(durationTrimmed)
    if (num < 1 || num > 600) {
      errors.duration = 'Enter minutes from 1 to 600.'
    } else {
      duration_min = num
    }
  } else {
    errors.duration = 'Enter minutes from 1 to 600.'
  }

  // servings
  const servingsTrimmed = input.servings.trim()
  let servings = 1
  if (servingsTrimmed === '') {
    servings = 1
  } else if (isInt(servingsTrimmed)) {
    const num = Number(servingsTrimmed)
    if (num < 1 || num > 50) {
      errors.servings = 'Enter servings from 1 to 50.'
    } else {
      servings = num
    }
  } else {
    errors.servings = 'Enter servings from 1 to 50.'
  }

  // recipeUrl
  const recipeUrlTrimmed = input.recipeUrl.trim()
  let recipe_url: string | null = null
  if (recipeUrlTrimmed === '') {
    recipe_url = null
  } else if (/^https?:\/\//.test(recipeUrlTrimmed)) {
    recipe_url = recipeUrlTrimmed
  } else {
    errors.recipeUrl = 'Links must start with http:// or https://.'
  }

  // ingredients – never errors
  const ingredientsTrimmed = input.ingredients.trim()
  const ingredients = [...parseIngredients(ingredientsTrimmed)]

  // notes
  const notesTrimmed = input.notes.trim()
  const notes = notesTrimmed === '' ? null : notesTrimmed

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  return {
    ok: true,
    fields: {
      title: titleTrimmed,
      scheduled_date: dateTrimmed,
      start_time,
      duration_min,
      servings,
      recipe_url,
      ingredients,
      notes,
    },
  }
}

export function prepFormFrom(prep: MealPrep): PrepFormInput {
  return {
    title: prep.title,
    date: prep.scheduled_date,
    startTime: prep.start_time ? prep.start_time.slice(0, 5) : '',
    duration: String(prep.duration_min),
    servings: String(prep.servings),
    recipeUrl: prep.recipe_url ?? '',
    ingredients: formatIngredients(prep.ingredients),
    notes: prep.notes ?? '',
  }
}
