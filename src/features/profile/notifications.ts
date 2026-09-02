import type { Json } from '@/types/database';

export interface NotificationPrefs {
  push: boolean;
  messages: boolean;
  enquiries: boolean;
  events: boolean;
  community: boolean;
  emailDigest: boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  push: true,
  messages: true,
  enquiries: true,
  events: true,
  community: true,
  emailDigest: false,
};

/** Read a profile's stored notification_prefs blob, filling in defaults. */
export function readNotificationPrefs(raw: Json | null | undefined): NotificationPrefs {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const pick = (k: keyof NotificationPrefs) =>
    typeof obj[k] === 'boolean' ? (obj[k] as boolean) : DEFAULT_NOTIFICATION_PREFS[k];
  return {
    push: pick('push'),
    messages: pick('messages'),
    enquiries: pick('enquiries'),
    events: pick('events'),
    community: pick('community'),
    emailDigest: pick('emailDigest'),
  };
}

export const NOTIFICATION_ROWS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: 'messages', label: 'Messages', hint: 'When someone replies to you' },
  { key: 'enquiries', label: 'Enquiries', hint: 'Replies about a listing you contacted' },
  { key: 'events', label: 'Event reminders', hint: 'Before an event you RSVP’d to' },
  { key: 'community', label: 'Community activity', hint: 'Replies and likes on your posts' },
];
