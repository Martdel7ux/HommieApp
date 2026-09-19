import { Platform } from 'react-native';
import { createEventInCalendarAsync, requestCalendarPermissionsAsync } from 'expo-calendar/legacy';
import { analytics } from '@/services/analytics';
import { logger } from '@/services/logger';
import type { EventDetail } from './api';

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export type AddToCalendarResult = 'saved' | 'canceled' | 'denied' | 'failed';

/**
 * Opens the phone's own "new event" sheet pre-filled with this event, so the
 * user picks the calendar and confirms. iOS 17+ and Android need no calendar
 * permission for this; older iOS asks first.
 */
export async function addEventToCalendar(event: EventDetail): Promise<AddToCalendarResult> {
  try {
    if (Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 17) {
      const { granted } = await requestCalendarPermissionsAsync();
      if (!granted) return 'denied';
    }

    const start = new Date(event.starts_at);
    const end = event.ends_at
      ? new Date(event.ends_at)
      : new Date(start.getTime() + DEFAULT_DURATION_MS);

    const result = await createEventInCalendarAsync({
      title: event.title,
      startDate: start,
      endDate: end,
      location: [event.location_name, event.area, event.city].filter(Boolean).join(', '),
      notes: [event.description, `Hosted by ${event.host_name} · via Hommie`]
        .filter(Boolean)
        .join('\n\n'),
      alarms: [{ relativeOffset: -60 * 24 }],
    });

    if (result.action === 'canceled') return 'canceled';
    analytics.track('event_added_to_calendar', { event_id: event.id });
    return 'saved';
  } catch (e) {
    logger.warn('events.addToCalendar failed', { error: String(e) });
    return 'failed';
  }
}
