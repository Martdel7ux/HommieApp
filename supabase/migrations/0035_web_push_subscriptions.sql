-- Web push has no "Expo push token" equivalent — the browser hands back a
-- raw PushSubscription (endpoint + p256dh/auth keys) instead, which the
-- push-notify edge function sends to directly via the Web Push protocol
-- (VAPID), bypassing Expo's push service entirely for these rows. Native
-- rows are untouched.
--
-- web_push_endpoint is its own column (not nested in jsonb) specifically so
-- a plain, non-partial unique index can back an upsert's ON CONFLICT target
-- via supabase-js (PostgREST's upsert can't target a partial/expression
-- index) — Postgres never treats two NULLs as a duplicate, so this index
-- is a no-op for every native row (which always has a NULL endpoint).

alter table push_tokens
  alter column expo_push_token drop not null,
  add column web_push_endpoint text,
  add column web_push_keys jsonb;

alter table push_tokens
  add constraint push_tokens_token_shape check (
    (platform = 'web' and web_push_endpoint is not null and web_push_keys is not null and expo_push_token is null)
    or
    (platform in ('ios', 'android') and expo_push_token is not null and web_push_endpoint is null and web_push_keys is null)
  );

create unique index push_tokens_web_endpoint_uniq on push_tokens (user_id, web_push_endpoint);
