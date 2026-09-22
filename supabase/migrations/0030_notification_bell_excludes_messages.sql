-- ============================================================================
-- Hommie — 0030 — the notification bell no longer counts new messages
-- ============================================================================
-- New messages already have their own unread indicator on the Messages tab
-- (unread_conversation_count / the tab bar dot). Counting them in the bell
-- too was a duplicate signal. The underlying `notifications` row (type =
-- 'message') is still inserted as before — that's what triggers the push
-- notification — this only changes what the in-app bell counts as unread.

create or replace function unread_notification_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int
  from notifications
  where user_id = auth.uid() and is_read = false and type <> 'message';
$$;
