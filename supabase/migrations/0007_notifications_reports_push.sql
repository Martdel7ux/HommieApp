-- ============================================================================
-- Hommie — 0007 — notifications, reports, push tokens
-- ============================================================================

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where is_read = false;

alter table notifications enable row level security;

create policy "users read their own notifications"
  on notifications for select to authenticated using (user_id = auth.uid());

create policy "users update their own notifications"
  on notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users delete their own notifications"
  on notifications for delete to authenticated using (user_id = auth.uid());

-- Inserts happen through SECURITY DEFINER triggers/functions only — no direct
-- client insert policy.

-- ----------------------------------------------------------------------------
-- reports — moderation queue for listings, posts, users, messages, etc.
-- ----------------------------------------------------------------------------
create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles(id) on delete cascade,
  subject_type text not null check (subject_type in (
    'accommodation_listing', 'marketplace_listing', 'community_post',
    'community_comment', 'roommate_profile', 'user', 'message', 'event'
  )),
  subject_id uuid not null,
  reason report_reason not null,
  details text check (details is null or char_length(details) <= 1000),
  status report_status not null default 'open',
  handled_by uuid references auth.users(id),
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, subject_type, subject_id)
);

create index reports_status_idx on reports (status, created_at desc);
create index reports_subject_idx on reports (subject_type, subject_id);

alter table reports enable row level security;

create policy "users read their own reports"
  on reports for select to authenticated using (reporter_id = auth.uid());

create policy "users file reports as themselves"
  on reports for insert to authenticated
  with check (reporter_id = auth.uid());

-- ----------------------------------------------------------------------------
-- push_tokens — Expo push notification tokens (one row per device)
-- ----------------------------------------------------------------------------
create table push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  expo_push_token text not null,
  device_id text,
  platform text check (platform in ('ios', 'android', 'web')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, expo_push_token)
);

create index push_tokens_user_idx on push_tokens (user_id);

alter table push_tokens enable row level security;

create policy "users read their own push tokens"
  on push_tokens for select to authenticated using (user_id = auth.uid());

create policy "users register their own push tokens"
  on push_tokens for insert to authenticated with check (user_id = auth.uid());

create policy "users update their own push tokens"
  on push_tokens for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "users delete their own push tokens"
  on push_tokens for delete to authenticated using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Convenience RPCs
-- ----------------------------------------------------------------------------
create or replace function mark_notifications_read(p_ids uuid[])
returns void language sql security definer set search_path = public as $$
  update notifications set is_read = true
  where user_id = auth.uid() and id = any(p_ids);
$$;

grant execute on function mark_notifications_read(uuid[]) to authenticated;

create or replace function unread_notification_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications where user_id = auth.uid() and is_read = false;
$$;

grant execute on function unread_notification_count() to authenticated;

-- Request account deletion (soft — a staff job / edge function completes it).
create or replace function request_account_deletion()
returns void language sql security definer set search_path = public as $$
  update profiles
    set deletion_requested_at = now(), is_active = false
  where id = auth.uid();
$$;

grant execute on function request_account_deletion() to authenticated;
