import { addDays } from '../prep/week'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export interface StripDay {
  date: string
  dow: string
  dom: number
  isSelected: boolean
  isFuture: boolean
}

export function stripDays(selected: string, today: string): StripDay[] {
  return Array.from({ length: 5 }, (_, i) => {
    const date = addDays(selected, i - 2)
    const [y, m, d] = date.split('-').map(Number)
    const dow = DOW[new Date(y, m - 1, d).getDay()]
    const dom = d
    const isSelected = date === selected
    const isFuture = date > today
    return { date, dow, dom, isSelected, isFuture }
  })
}
