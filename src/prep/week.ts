const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

function parse(s: string): [number, number, number] {
  return s.split('-').map(Number) as [number, number, number]
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = parse(date)
  const cur = new Date(y, m - 1, d + n)
  const year = cur.getFullYear()
  const month = String(cur.getMonth() + 1).padStart(2, '0')
  const day = String(cur.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function weekStart(date: string): string {
  const [y, m, d] = parse(date)
  const dow = new Date(y, m - 1, d).getDay()
  const result = new Date(y, m - 1, d - dow)
  const year = result.getFullYear()
  const month = String(result.getMonth() + 1).padStart(2, '0')
  const day = String(result.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function weekDays(start: string): string[] {
  const days: string[] = []
  for (let i = 0; i < 7; i++) {
    days.push(addDays(start, i))
  }
  return days
}

export function weekLabel(start: string): string {
  const [sy, sm, sd] = parse(start)
  const eDate = new Date(sy, sm - 1, sd + 6)
  const startMonth = MONTHS[sm - 1]
  const endMonth = MONTHS[eDate.getMonth()]
  return `${startMonth} ${sd}\u2013${endMonth} ${eDate.getDate()}`
}

export function dayLabel(date: string): string {
  const [y, m, d] = parse(date)
  const dow = new Date(y, m - 1, d).getDay()
  return `${DAYS[dow]} ${MONTHS[m - 1]} ${d}`
}
