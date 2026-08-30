import { format, isToday, isYesterday, differenceInCalendarDays } from 'date-fns';

/** Inbox-style timestamp: "10:42 AM" today, "Yesterday", "Mon" this week, "12 Aug" older. */
export function inboxTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday';
  if (differenceInCalendarDays(new Date(), d) < 7) return format(d, 'EEE');
  return format(d, 'd MMM');
}

/** Message-bubble timestamp. */
export function messageTime(iso: string): string {
  return format(new Date(iso), 'h:mm a');
}

/** Day separator in a thread: "Today", "Yesterday", "Monday 12 August". */
export function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'EEEE d MMMM');
}
