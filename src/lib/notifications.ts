import { supabase } from './supabase'

// Meal labels for display in notifications
export const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

// Time thresholds for default meal times (in minutes from midnight)
export const MEAL_TIMES: Record<string, { name: string; minutes: number }> = {
  breakfast: { name: 'Breakfast', minutes: 390 },  // 6:30 AM
  lunch: { name: 'Lunch', minutes: 780 },         // 1:00 PM
  dinner: { name: 'Dinner', minutes: 1140 },      // 7:00 PM
  snack: { name: 'Snack', minutes: 1440 },        // 12:00 AM (midnight)
}

/**
 * Format a time string (HH:MM:SS) for display
 */
export function formatTime(timeStr: string | null): string {
  if (!timeStr) return ''
  const [hours, minutes] = timeStr.split(':').map(Number)
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`
}

/**
 * Get the default meal time string for a given meal type
 */
export function getDefaultMealTime(mealType: string): string {
  const minutes = MEAL_TIMES[mealType]?.minutes ?? 0
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`
}

/**
 * Check if a reminder time is due for a meal notification
 * Returns the meal type if it's time to notify, null otherwise
 */
export function shouldNotifyForMeal(
  reminderTime: string | null,
  currentMinutes: number,
  mealType: string
): boolean {
  if (!reminderTime) return false

  const [hours, minutes] = reminderTime.split(':').map(Number)
  const reminderMinutes = hours * 60 + minutes

  // Notify if current time is within 10 minutes of the reminder time
  const diff = Math.abs(currentMinutes - reminderMinutes)
  return diff <= 10
}

/**
 * Request permission to send notifications
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied'
  }
  
  if (Notification.permission === 'granted') {
    return 'granted'
  }
  
  if (Notification.permission === 'denied') {
    return 'denied'
  }
  
  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Check if notifications are supported in this browser
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Check if Push API is supported (for web push)
 */
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(userId: string): Promise<string | null> {
  if (!isPushSupported()) return null
  const key = import.meta.env.VITE_VAPID_KEY
  if (!key) return null
  if ((await requestNotificationPermission()) !== 'granted') return null

  const registration = await navigator.serviceWorker.ready
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
    }))

  // RLS lets each person write only their own row.
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({ user_id: userId, subscription: subscription.toJSON() }, { onConflict: 'user_id' })
  if (error) return null

  return subscription.endpoint
}

/**
 * Is this phone subscribed to push? 'unsupported' when the browser can't do it
 * (on iPhone that means the app is not installed to the Home Screen).
 */
export async function getPushStatus(): Promise<'unsupported' | 'denied' | 'on' | 'off'> {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.ready
  return (await registration.pushManager.getSubscription()) ? 'on' : 'off'
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushSupported()) return false

  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()

  if (!subscription) return true

  // Unsubscribe
  await subscription.unsubscribe()

  // Forget it on the server too (RLS lets a person delete only their own row)
  const { error } = await supabase.from('push_subscriptions').delete().eq('user_id', userId)

  if (error) {
    console.error('Error unsubscribing from push:', error)
    return false
  }

  return true
}

/**
 * Convert a base64 string to Uint8Array for VAPID keys
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = atob(base64)
  const arrayLength = rawData.length
  const au8 = new Uint8Array(arrayLength)

  for (let i = 0; i < arrayLength; ++i) {
    au8[i] = rawData.charCodeAt(i)
  }

  return au8 as Uint8Array
}

/**
 * Check if a subscription endpoint should trigger a notification
 * based on the user's reminder time
 */
export function isNotificationDue(
  reminderTime: string | null,
  currentMinutes: number
): boolean {
  if (!reminderTime) return false

  const [hours, minutes] = reminderTime.split(':').map(Number)
  const reminderMinutes = hours * 60 + minutes

  // Notify if current time is within the next 15 minutes of reminder
  const diff = reminderMinutes - currentMinutes
  return diff > 0 && diff <= 15
}

/**
 * Is the reminder time here? True from the reminder time until 30 minutes after,
 * so opening the app a little late still shows it.
 */
export function isReminderDue(reminderTime: string | null, currentMinutes: number): boolean {
  if (!reminderTime) return false
  const [hours, minutes] = reminderTime.split(':').map(Number)
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return false
  const late = currentMinutes - (hours * 60 + minutes)
  return late >= 0 && late <= 30
}

/**
 * Get meal names that should trigger notifications now
 */
export function getDueMealTypes(
  reminderTime: string | null,
  currentMinutes: number
): string[] {
  if (!reminderTime) return []

  const result: string[] = []

  // Check each meal type to see if it's due
  for (const mealType of Object.keys(MEAL_TIMES)) {
    // For now, we'll assume meal times are relative to the reminder time
    // Users can set a general reminder time for all meals
    if (isNotificationDue(reminderTime, currentMinutes)) {
      result.push(mealType)
    }
  }

  return result
}