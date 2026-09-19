-- ============================================================================
-- Hommie — 0028 — day-before reminders for events a user is going to
-- ============================================================================
-- Every 15 minutes, find "going" RSVPs whose event starts within the next 24h
-- and hasn't been reminded yet, and insert an `event_reminder` notification.
-- The existing push_notify_on_notification_insert trigger (0020) then fans it
-- out as a push (respecting the user's `events` notification pref).
--
-- People who RSVP inside the 24h window are skipped — they just tapped RSVP,
-- so an immediate "coming up" push would be noise.

create extension if not exists pg_cron;

alter table public.event_rsvps
  add column if not exists reminder_sent_at timestamptz;

create or replace function public.send_event_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with due as (
    select r.event_id, r.user_id, e.title, e.starts_at, e.location_name
    from event_rsvps r
    join events e on e.id = r.event_id
    where r.state = 'going'
      and r.reminder_sent_at is null
      and e.is_published
      and e.starts_at > now()
      and e.starts_at <= now() + interval '24 hours'
      and r.created_at <= e.starts_at - interval '24 hours'
    for update of r skip locked
  ),
  marked as (
    update event_rsvps r
    set reminder_sent_at = now()
    from due
    where r.event_id = due.event_id and r.user_id = due.user_id
    returning due.*
  ),
  inserted as (
    insert into notifications (user_id, type, title, body, data)
    select
      user_id,
      'event_reminder',
      title || ' is tomorrow',
      to_char(starts_at at time zone 'Europe/Nicosia', 'FMDy, FMDD Mon "at" HH24:MI')
        || ' · ' || location_name,
      jsonb_build_object('event_id', event_id)
    from marked
    returning 1
  )
  select count(*) into v_count from inserted;

  return v_count;
end;
$$;

revoke all on function public.send_event_reminders() from public, anon, authenticated;

select cron.schedule(
  'send-event-reminders',
  '*/15 * * * *',
  $$select public.send_event_reminders()$$
);
