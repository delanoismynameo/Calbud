import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  formatTime,
  getDefaultMealTime,
  shouldNotifyForMeal,
  isNotificationDue,
  isReminderDue,
  getDueMealTypes,
  MEAL_LABELS,
  MEAL_TIMES,
} from './notifications'

describe('formatTime', () => {
  it('formats time in 12-hour format with AM', () => {
    expect(formatTime('07:30:00')).toBe('7:30 AM')
    expect(formatTime('09:00:00')).toBe('9:00 AM')
  })

  it('formats time in 12-hour format with PM', () => {
    expect(formatTime('13:30:00')).toBe('1:30 PM')
    expect(formatTime('18:00:00')).toBe('6:00 PM')
  })

  it('handles midnight correctly', () => {
    expect(formatTime('00:00:00')).toBe('12:00 AM')
    expect(formatTime('00:30:00')).toBe('12:30 AM')
  })

  it('handles noon correctly', () => {
    expect(formatTime('12:00:00')).toBe('12:00 PM')
  })

  it('returns empty string for null', () => {
    expect(formatTime(null)).toBe('')
  })
})

describe('getDefaultMealTime', () => {
  it('returns default time for a specific meal type based on MEAL_TIMES', () => {
    // Breakfast: 6:30 AM = 390 minutes -> 06:30:00
    expect(getDefaultMealTime('breakfast')).toBe('06:30:00')
    // Lunch: 1:00 PM = 780 minutes -> 13:00:00
    expect(getDefaultMealTime('lunch')).toBe('13:00:00')
    // Dinner: 7:00 PM = 1140 minutes -> 19:00:00
    expect(getDefaultMealTime('dinner')).toBe('19:00:00')
    // Snack: 12:00 AM (midnight) = 1440 minutes -> 24:00:00
    expect(getDefaultMealTime('snack')).toBe('24:00:00')
  })
})

describe('shouldNotifyForMeal', () => {
  it('returns true when within 10 minutes of reminder time', () => {
    // 7:30 AM = 450 minutes
    expect(shouldNotifyForMeal('07:30:00', 440, 'breakfast')).toBe(true)  // 7:20 AM (10 min before)
    expect(shouldNotifyForMeal('07:30:00', 450, 'breakfast')).toBe(true)  // 7:30 AM (exact)
    expect(shouldNotifyForMeal('07:30:00', 460, 'breakfast')).toBe(true)  // 7:40 AM (10 min after)
  })

  it('returns false when more than 10 minutes from reminder time', () => {
    expect(shouldNotifyForMeal('07:30:00', 400, 'breakfast')).toBe(false)  // 6:40 AM (50 min before)
    expect(shouldNotifyForMeal('07:30:00', 500, 'breakfast')).toBe(false)  // 8:20 AM (50 min after)
  })

  it('returns false for null reminder time', () => {
    expect(shouldNotifyForMeal(null, 450, 'breakfast')).toBe(false)
  })
})

describe('isNotificationDue', () => {
  it('returns true when reminder is in the next 15 minutes', () => {
    // 15:00:00 = 900 minutes from midnight (3:00 PM)
    // currentMinutes 890 = 2:50 PM (10 min before reminder)
    expect(isNotificationDue('15:00:00', 890)).toBe(true)
    // currentMinutes 900 = 3:00 PM (exact time)
    expect(isNotificationDue('15:00:00', 900)).toBe(false)  // diff = 0, not > 0
    // currentMinutes 895 = 2:55 PM (5 min before reminder)
    expect(isNotificationDue('15:00:00', 895)).toBe(true)
  })

  it('returns false when reminder time has passed', () => {
    // currentMinutes 920 = 3:20 PM (20 min after 3:00 PM)
    expect(isNotificationDue('15:00:00', 920)).toBe(false)  // diff is negative
  })

  it('returns false when more than 15 minutes from reminder time', () => {
    // currentMinutes 850 = 2:10 PM (50 min before 3:00 PM)
    expect(isNotificationDue('15:00:00', 850)).toBe(false)  // diff = 50, not <= 15
  })
})

describe('isReminderDue', () => {
  it('is due from the reminder time until 30 minutes after', () => {
    expect(isReminderDue('15:00:00', 900)).toBe(true)
    expect(isReminderDue('15:00', 915)).toBe(true)
    expect(isReminderDue('15:00:00', 930)).toBe(true)
  })

  it('is not due before the time or long after it', () => {
    expect(isReminderDue('15:00:00', 899)).toBe(false)
    expect(isReminderDue('15:00:00', 931)).toBe(false)
  })

  it('is false when there is no reminder or the time is junk', () => {
    expect(isReminderDue(null, 900)).toBe(false)
    expect(isReminderDue('soon', 900)).toBe(false)
  })
})

describe('getDueMealTypes', () => {
  it('returns empty array for null reminder time', () => {
    expect(getDueMealTypes(null, 450)).toEqual([])
  })

  it('returns meal types when reminder is due in the future', () => {
    // Reminder at 3:00 PM (900 min), current time 2:55 PM (895 min) - reminder is in 5 min
    const result = getDueMealTypes('15:00:00', 895)
    expect(result.length).toBeGreaterThan(0)
    expect(result).toContain('breakfast')
    expect(result).toContain('lunch')
    expect(result).toContain('dinner')
    expect(result).toContain('snack')
  })
})

describe('MEAL_LABELS', () => {
  it('has correct labels for all meal types', () => {
    expect(MEAL_LABELS['breakfast']).toBe('Breakfast')
    expect(MEAL_LABELS['lunch']).toBe('Lunch')
    expect(MEAL_LABELS['dinner']).toBe('Dinner')
    expect(MEAL_LABELS['snack']).toBe('Snack')
  })
})

describe('MEAL_TIMES', () => {
  it('has correct minute values for meal times', () => {
    // Breakfast: 6:30 AM = 390 minutes
    expect(MEAL_TIMES['breakfast'].minutes).toBe(390)
    
    // Lunch: 1:00 PM = 780 minutes
    expect(MEAL_TIMES['lunch'].minutes).toBe(780)
    
    // Dinner: 7:00 PM = 1140 minutes
    expect(MEAL_TIMES['dinner'].minutes).toBe(1140)
    
    // Snack: midnight = 1440 minutes
    expect(MEAL_TIMES['snack'].minutes).toBe(1440)
  })
})