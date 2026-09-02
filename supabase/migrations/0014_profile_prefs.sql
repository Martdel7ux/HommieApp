-- Profile: a phone number and a JSON blob of notification preferences,
-- both edited from the Profile screen's sub-pages.
alter table profiles add column if not exists phone text
  check (phone is null or char_length(phone) <= 32);

alter table profiles add column if not exists notification_prefs jsonb not null default '{}'::jsonb;
