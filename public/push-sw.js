// Push handlers for Calbud, loaded into the PWA service worker by vite.config.ts (workbox.importScripts).

// Handle push events
self.addEventListener('push', (event) => {
  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      console.error('Error parsing push data:', e)
      data = {
        title: 'Meal Reminder',
        body: 'Time to log your meal!',
      }
    }
  } else {
    data = {
      title: 'Meal Reminder',
      body: 'Time to log your meal!',
    }
  }

  const options = {
    body: data.body || 'New notification from Calbud',
    icon: data.icon || 'icon-192.png',
    badge: data.badge || 'icon-192.png',
    data: {
      ...data,
      url: self.registration.scope, // the app lives under a base path, so ignore any absolute url sent
    },
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Calbud', options))
})

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  const url = event.notification.data?.url || self.registration.scope

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) {
          return client.focus()
        }
      }
      // If no window is open, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
      return null
    })
  )

  event.notification.close()
})

// Handle notification close
self.addEventListener('notificationclose', (event) => {
})

