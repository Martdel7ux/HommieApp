-- ============================================================================
-- Hommie — 0024 — student ID verification
-- ============================================================================
-- Mirrors the landlord verification pattern (0002_profiles.sql) onto
-- `profiles`, so students can submit a photo of their student ID and an
-- admin can approve/reject it via admin-web.

alter table profiles
  add column verification verification_status not null default 'unverified',
  add column verification_submitted_at timestamptz,
  add column verified_at timestamptz,
  add column verified_by uuid references auth.users(id),
  add column verification_doc_path text;

create index profiles_verification_idx on profiles (verification);

-- ----------------------------------------------------------------------------
-- Prevent self-verification: a student may move unverified -> submitted
-- only. Admin-web updates (auth.uid() differs from the row's own id) bypass
-- this guard entirely. Mirrors guard_landlord_verification() exactly.
-- ----------------------------------------------------------------------------
create or replace function guard_profile_verification()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() = new.id then
    if new.verification = 'verified' and old.verification <> 'verified' then
      raise exception 'Verification can only be granted by Hommie staff';
    end if;
    if new.verification = 'submitted' and old.verification = 'unverified' then
      new.verification_submitted_at = now();
    end if;
    -- keep staff-only columns unchanged on self-update
    new.verified_at = old.verified_at;
    new.verified_by = old.verified_by;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_verification
  before update on profiles
  for each row execute function guard_profile_verification();

-- ----------------------------------------------------------------------------
-- Admin-web needs to be able to update verification fields on any profile.
-- Additive alongside "users can update their own profile" (RLS policies OR).
-- ----------------------------------------------------------------------------
create policy "admins can update verification"
  on profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- Admin-web needs to read the uploaded ID doc from the private bucket to
-- generate a signed preview URL. Additive alongside 0009's owner-only policy.
-- ----------------------------------------------------------------------------
create policy "verification-docs admin read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());

-- ----------------------------------------------------------------------------
-- Notify the student when their verification status changes. Mirrors
-- on_listing_status_changed() (0023) — fires regardless of whether the
-- change came from the mobile app (submit) or admin-web (approve/reject).
-- ----------------------------------------------------------------------------
create or replace function on_profile_verification_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.verification = 'submitted' and (old is null or old.verification is distinct from 'submitted') then
    insert into notifications (user_id, type, title, body, data)
    values (new.id, 'system', 'ID submitted for review',
            'We''re checking your student ID — this usually takes 1–2 business days.',
            jsonb_build_object('kind', 'verification'));
  elsif old.verification = 'submitted' and new.verification = 'verified' then
    insert into notifications (user_id, type, title, body, data)
    values (new.id, 'system', 'You''re verified!',
            'Your student ID has been approved. You now have the Hommie Verified badge.',
            jsonb_build_object('kind', 'verification'));
  elsif old.verification = 'submitted' and new.verification = 'unverified' then
    insert into notifications (user_id, type, title, body, data)
    values (new.id, 'system', 'We couldn''t verify your ID',
            'Please upload a clearer photo of your student ID and try again.',
            jsonb_build_object('kind', 'verification'));
  end if;
  return new;
end;
$$;

create trigger profiles_verification_notify
  after insert or update on profiles
  for each row execute function on_profile_verification_changed();
