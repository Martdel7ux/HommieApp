import { Platform } from 'react-native';
import { createEventInCalendarAsync, requestCalendarPermissionsAsync } from 'expo-calendar/legacy';
import { analytics } from '@/services/analytics';
import { logger } from '@/services/logger';
import type { EventDetail } from './api';

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export type AddToCalendarResult = 'saved' | 'canceled' | 'denied' | 'failed';

// RFC 5545 §3.3.11: escape backslash, semicolon, comma, then turn real
// newlines into the literal two-char sequence "\n".
function icsEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildIcs(event: EventDetail, start: Date, end: Date): string {
  const location = [event.location_name, event.area, event.city].filter(Boolean).join(', ');
  const description = [event.description, `Hosted by ${event.host_name} · via Hommie`]
    .filter(Boolean)
    .join('\n\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Hommie//Events//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@hommieapp.com`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    location ? `LOCATION:${icsEscape(location)}` : null,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder',
    'TRIGGER:-P1D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter((line): line is string => line != null)
    .join('\r\n');
}

/** Web has no calendar API — download an .ics file for the browser/OS to open instead. */
function downloadIcs(event: EventDetail, start: Date, end: Date): AddToCalendarResult {
  try {
    const blob = new Blob([buildIcs(event, start, end)], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'event'}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return 'saved';
  } catch (e) {
    logger.warn('events.addToCalendar.web failed', { error: String(e) });
    return 'failed';
  }
}

/**
 * Opens the phone's own "new event" sheet pre-filled with this event, so the
 * user picks the calendar and confirms. iOS 17+ and Android need no calendar
 * permission for this; older iOS asks first. On web (no calendar API at
 * all) it downloads a .ics file instead, for the browser/OS to open.
 */
export async function addEventToCalendar(event: EventDetail): Promise<AddToCalendarResult> {
  const start = new Date(event.starts_at);
  const end = event.ends_at ? new Date(event.ends_at) : new Date(start.getTime() + DEFAULT_DURATION_MS);

  if (Platform.OS === 'web') {
    const result = downloadIcs(event, start, end);
    if (result === 'saved') analytics.track('event_added_to_calendar', { event_id: event.id });
    return result;
  }

  try {
    if (Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) < 17) {
      const { granted } = await requestCalendarPermissionsAsync();
      if (!granted) return 'denied';
    }

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
