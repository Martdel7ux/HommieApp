import {
  format,
  isToday,
  isYesterday,
  differenceInCalendarDays,
  formatDistanceToNowStrict,
} from 'date-fns';

/** Compact relative time: "2m ago", "15m ago", "1h ago", "3d ago". */
export function timeAgo(iso: string): string {
  const d = new Date(iso);
  const secs = (Date.now() - d.getTime()) / 1000;
  if (secs < 45) return 'just now';
  return `${formatDistanceToNowStrict(d, {
    roundingMethod: 'floor',
  })
    .replace(' minutes', 'm')
    .replace(' minute', 'm')
    .replace(' hours', 'h')
    .replace(' hour', 'h')
    .replace(' days', 'd')
    .replace(' day', 'd')
    .replace(' seconds', 's')
    .replace(' second', 's')
    .replace(' months', 'mo')
    .replace(' month', 'mo')
    .replace(' years', 'y')
    .replace(' year', 'y')} ago`;
}

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
