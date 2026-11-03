// Sends the meal-reminder web push. Run it on a schedule (every 5-15 minutes).
//
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...), CRON_SECRET.
// The caller sends the CRON_SECRET in an `x-cron-secret` header.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY') ?? '',
  Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
)

// Same window as the in-app toast: from the reminder time until 30 minutes after.
const WINDOW_MINUTES = 30

interface Row {
  id: string
  user_id: string
  subscription: webpush.PushSubscription
  last_sent_on: string | null
  profiles: { reminder_time: string | null; timezone: string } | null
}

/** The person's local date (YYYY-MM-DD) and minutes since midnight right now. */
function localNow(timeZone: string, now: Date): { day: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone, hourCycle: 'h23',
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(now).map((p) => [p.type, p.value])
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) }
}

// Same push services as the push_subscriptions check constraint (migration 20261103000001).
const PUSH_HOST = /^(fcm\.googleapis\.com|web\.push\.apple\.com|([a-z0-9-]+\.)+push\.apple\.com|([a-z0-9-]+\.)+push\.services\.mozilla\.com|([a-z0-9-]+\.)+notify\.windows\.com)$/

function isPushEndpoint(endpoint: unknown): boolean {
  if (typeof endpoint !== 'string') return false
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && !url.username && !url.port && PUSH_HOST.test(url.hostname)
  } catch {
    return false
  }
}

/** Constant-time comparison: accumulate XOR across all bytes, never short-circuit. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let acc = 0
  for (let i = 0; i < a.length; i++) {
    acc |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return acc === 0
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CRON_SECRET')
  if (!secret || !constantTimeEqual(req.headers.get('x-cron-secret') ?? '', secret)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, subscription, last_sent_on, profiles!inner(reminder_time, timezone)')
    .not('profiles.reminder_time', 'is', null)

  if (error) {
    console.error('Error loading subscriptions:', error)
    return new Response(JSON.stringify({ error: 'Failed to load subscriptions' }), { status: 500 })
  }

  const now = new Date()
  const sent: string[] = []

  for (const row of (data ?? []) as unknown as Row[]) {
    if (!isPushEndpoint(row.subscription?.endpoint)) continue
    const reminder = row.profiles?.reminder_time
    if (!reminder) continue
    const [h, m] = reminder.split(':').map(Number)
    let local: { day: string; minutes: number }
    try {
      local = localNow(row.profiles!.timezone, now)
    } catch {
      continue // unknown timezone name
    }
    const late = local.minutes - (h * 60 + m)
    if (late < 0 || late > WINDOW_MINUTES) continue
    if (row.last_sent_on === local.day) continue

    try {
      await webpush.sendNotification(
        row.subscription,
        JSON.stringify({ title: 'Meal reminder', body: 'Time to log your meal.' }),
        { TTL: 3600 }
      )
      await supabase.from('push_subscriptions').update({ last_sent_on: local.day }).eq('id', row.id)
      sent.push(row.user_id)
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        // The phone dropped this subscription: forget it.
        await supabase.from('push_subscriptions').delete().eq('id', row.id)
      } else {
        console.error(`Push to ${row.user_id} failed:`, e)
      }
    }
  }

  return new Response(JSON.stringify({ success: true, sent: sent.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
