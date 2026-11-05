import { readAmount } from './recipeDraft'

export interface ConvertUnit {
  label: string
  per: number
}

// Exact weight conversions. Cups aren't here: what a cup weighs depends on the food.
const WEIGHT_UNITS: ConvertUnit[] = [
  { label: 'pounds', per: 453.592 },
  { label: 'ounces', per: 28.3495 },
  { label: 'kilograms', per: 1000 },
]

const LIQUID_UNITS: ConvertUnit[] = [
  { label: 'fl oz', per: 29.5735 },
  { label: 'cups', per: 236.588 },
  { label: 'tablespoons', per: 14.7868 },
  { label: 'teaspoons', per: 4.92892 },
]

/** The units offered for a food measured in g or ml; `per` is how many g or ml one of the unit is. */
export function convertUnits(unit: 'g' | 'ml'): ConvertUnit[] {
  return unit === 'ml' ? LIQUID_UNITS : WEIGHT_UNITS
}

/** A typed amount of a unit in g or ml, to one decimal place; null when it isn't a usable amount. */
export function convertAmount(text: string, per: number): number | null {
  const n = readAmount(text)
  return n == null ? null : Math.round(n * per * 10) / 10
}
