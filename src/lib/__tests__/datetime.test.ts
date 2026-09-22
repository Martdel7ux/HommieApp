import {
  timeAgo,
  inboxTime,
  messageTime,
  dayLabel,
  eventDateLabel,
  eventTimeRange,
  eventDateBadge,
} from '../datetime';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe('timeAgo', () => {
  it('shows "just now" for anything under 45 seconds', () => {
    expect(timeAgo(new Date(Date.now() - 10_000).toISOString())).toBe('just now');
  });

  it('abbreviates minutes, hours and days', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60_000).toISOString())).toBe('5m ago');
    expect(timeAgo(new Date(Date.now() - 3 * HOUR).toISOString())).toBe('3h ago');
    expect(timeAgo(new Date(Date.now() - 2 * DAY).toISOString())).toBe('2d ago');
  });
});

describe('inboxTime', () => {
  it('shows a clock time for something sent today', () => {
    const now = new Date();
    expect(inboxTime(now.toISOString())).toMatch(/^\d{1,2}:\d{2} [AP]M$/);
  });

  it('shows "Yesterday" for something sent yesterday', () => {
    const yesterday = new Date(Date.now() - DAY);
    expect(inboxTime(yesterday.toISOString())).toBe('Yesterday');
  });

  it('shows the weekday within the last 7 days', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * DAY);
    expect(inboxTime(threeDaysAgo.toISOString())).toMatch(
      /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/,
    );
  });

  it('shows a short date for anything older than a week', () => {
    const overAWeekAgo = new Date(Date.now() - 10 * DAY);
    expect(inboxTime(overAWeekAgo.toISOString())).toMatch(/^\d{1,2} [A-Z][a-z]{2}$/);
  });
});

describe('messageTime', () => {
  it('formats a plain clock time', () => {
    expect(messageTime('2026-01-15T14:30:00.000Z')).toMatch(/^\d{1,2}:\d{2} [AP]M$/);
  });
});

describe('dayLabel', () => {
  it('labels today and yesterday specially', () => {
    expect(dayLabel(new Date().toISOString())).toBe('Today');
    expect(dayLabel(new Date(Date.now() - DAY).toISOString())).toBe('Yesterday');
  });

  it('spells out older days in full', () => {
    expect(dayLabel(new Date(Date.now() - 30 * DAY).toISOString())).toMatch(
      /^[A-Z][a-z]+day \d{1,2} [A-Z][a-z]+$/,
    );
  });
});

describe('eventDateLabel', () => {
  it('omits the year for events this year', () => {
    // noon local time avoids the date shifting across a UTC day boundary
    const thisYear = new Date(new Date().getFullYear(), 5, 15, 12).toISOString();
    expect(eventDateLabel(thisYear)).not.toMatch(/\d{4}/);
  });

  it('includes the year for events in a different year', () => {
    expect(eventDateLabel('2019-06-15T12:00:00.000Z')).toContain('2019');
  });
});

describe('eventTimeRange', () => {
  it('returns just the start time when there is no end time', () => {
    expect(eventTimeRange('2026-01-15T16:00:00.000Z')).toMatch(/^\d{1,2}:\d{2} [AP]M$/);
  });

  it('joins start and end with "to" when both exist', () => {
    const range = eventTimeRange('2026-01-15T16:00:00.000Z', '2026-01-15T19:00:00.000Z');
    expect(range).toMatch(/^\d{1,2}:\d{2} [AP]M to \d{1,2}:\d{2} [AP]M$/);
  });
});

describe('eventDateBadge', () => {
  it('splits a date into a day number and uppercase month', () => {
    // noon UTC avoids the date shifting across a local day boundary
    const badge = eventDateBadge('2026-09-15T12:00:00.000Z');
    expect(badge).toEqual({ day: '15', month: 'SEP' });
  });
});
