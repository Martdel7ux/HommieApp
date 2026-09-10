-- ============================================================================
-- Hommie — 0020 — call the push-notify edge function on every new notification
-- ============================================================================
-- A new `notifications` row → POST to the `push-notify` function, which fans it
-- out to the user's devices via the Expo push API (respecting notification_prefs).
--
-- The shared secret lives in Supabase Vault, not in this file. After applying,
-- run once (with the value set as the function's WEBHOOK_SECRET):
--   select vault.create_secret('<WEBHOOK_SECRET>', 'push_webhook_secret');

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_push_on_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'push_webhook_secret'
  limit 1;

  perform net.http_post(
    url := 'https://ywleliavgtumbafptwci.supabase.co/functions/v1/push-notify',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(v_secret, '')
    ),
    body := jsonb_build_object(
      'type', 'INSERT',
      'table', 'notifications',
      'record', to_jsonb(new)
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    -- never let a push hiccup block the notification insert
    return new;
end;
$$;

drop trigger if exists push_notify_on_notification_insert on public.notifications;
create trigger push_notify_on_notification_insert
  after insert on public.notifications
  for each row execute function public.notify_push_on_notification();
