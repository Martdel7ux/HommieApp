// Web push service worker — handles a push arriving while the tab/app isn't
// open (that's the whole point of service-worker-based push) and routes a
// click to the right screen. Registered from src/features/notifications/push.ts
// at the fixed path /push-worker.js (must stay at this path/scope — browsers
// tie a push subscription to the worker's registration).
//
// Deliberately plain JS, not TypeScript: this file ships byte-for-byte via
// Expo's `public/` passthrough (see docs/PUSH_NOTIFICATIONS_SETUP.md), it
// is never run through Metro/Babel, so no app code (imports, JSX, etc.) can
// be reused here — not even routeForNotification from
// src/features/notifications/api.ts. The switch below is a deliberate,
// hand-kept copy of that function's logic; update both together.
function routeForNotification(type, data) {
  data = data || {};
  switch (type) {
    case 'message':
    case 'enquiry':
      return data.conversation_id
        ? `/messages/${data.conversation_id}`
        : data.listing_id
          ? `/listing/${data.listing_id}`
          : null;
    case 'event_reminder':
      return data.event_id ? `/events/${data.event_id}` : null;
    case 'community_reply':
    case 'community_like':
      return data.post_id ? `/community/${data.post_id}` : null;
    case 'listing_saved':
      return data.listing_id ? `/accommodation/${data.listing_id}` : null;
    case 'roommate_saved':
      return data.profile_id ? `/roommates/${data.profile_id}` : null;
    case 'system':
      return data.kind === 'verification'
        ? '/profile/verification'
        : data.listing_id
          ? `/listing/${data.listing_id}`
          : null;
    default:
      return null;
  }
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_e) {
    payload = { title: 'Hommie', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Hommie';
  const options = {
    body: payload.body || '',
    data: payload.data || {},
    tag: payload.data && payload.data.notification_id,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const path = routeForNotification(data.type, data) || '/notifications';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.postMessage({ type: 'hommie-push-click', path });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(path);
      }
    }),
  );
});
