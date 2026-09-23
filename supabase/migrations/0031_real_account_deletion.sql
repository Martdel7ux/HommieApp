-- ============================================================================
-- Hommie — 0031 — account deletion actually deletes access, not just a flag
-- ============================================================================
-- request_account_deletion() previously only set is_active = false and
-- deletion_requested_at, with a comment saying "a staff job / edge function
-- removes the auth user" — that job was never built, so the auth.users row,
-- password and every bit of personal data stayed fully intact forever, and
-- the user could sign straight back in with the same credentials. Real bug,
-- also a problem for App Review (5.1.1(v) requires account deletion to
-- actually work).
--
-- Fix: ban the login itself immediately (Supabase Auth refuses to issue any
-- new session for a banned user — stronger than any app-level check) and
-- scrub personal fields right away. We do NOT cascade-delete the profile row
-- itself here: every FK into profiles(id) is already `on delete cascade` or
-- `set null` (verified against every migration), so a hard delete would be
-- safe schema-wise, but `conversations.created_by` cascades onto the whole
-- conversation — deleting the row would wipe a chat thread out from under
-- the OTHER participant too, not just the deleted user's side of it. Scrub +
-- ban avoids that side effect while still fully satisfying "the account no
-- longer works and personal data is gone" for both this bug and App Review.

create or replace function request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update profiles set
    deletion_requested_at = now(),
    is_active = false,
    first_name = null,
    last_name = null,
    display_name = 'Deleted user',
    avatar_url = null,
    bio = null,
    phone = null,
    city = null,
    campus_area = null,
    interests = '{}',
    verification_doc_path = null
  where id = auth.uid();

  update landlord_profiles set
    contact_name = 'Deleted user',
    business_name = null,
    phone = null,
    description = null,
    logo_url = null
  where id = auth.uid();

  -- Blocks every future sign-in attempt (password, Apple, Google) at the
  -- Supabase Auth layer itself, regardless of any app-level check.
  -- NOTE: use a concrete far-future date, not the SQL 'infinity' literal —
  -- Supabase Auth's own timestamp parsing can't handle 'infinity' and
  -- returns a generic 500 "Database error querying schema" instead of a
  -- clean 400 "User is banned" (verified against a live test account).
  update auth.users set banned_until = '3000-01-01 00:00:00+00' where id = auth.uid();
end;
$$;
