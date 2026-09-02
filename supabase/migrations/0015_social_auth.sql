-- ============================================================================
-- Hommie — 0015 — social sign-in (Apple / Google) support
-- ============================================================================
-- Native "Sign in with Apple" and Google Sign-In hand Supabase an ID token via
-- auth.signInWithIdToken(). That path can't pass options.data, so:
--   1. handle_new_user() now also reads the name/avatar claims the OAuth
--      providers put in raw_user_meta_data (given_name, family_name, name,
--      picture, avatar_url, full_name).
--   2. A social sign-up always lands as role 'student' (the trigger default).
--      apply_selected_role() lets the just-registered user switch to the role
--      they picked on the welcome screen, but only before onboarding is done.
-- ----------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_role user_role;
  v_first text := nullif(coalesce(
    v_meta ->> 'first_name',
    v_meta ->> 'given_name',
    nullif(split_part(coalesce(v_meta ->> 'name', v_meta ->> 'full_name', ''), ' ', 1), ''),
    ''
  ), '');
  v_last text := nullif(coalesce(
    v_meta ->> 'last_name',
    v_meta ->> 'family_name',
    ''
  ), '');
  v_avatar text := nullif(coalesce(v_meta ->> 'avatar_url', v_meta ->> 'picture', ''), '');
  v_contact text := nullif(v_meta ->> 'contact_name', '');
  v_business text := nullif(v_meta ->> 'business_name', '');
  v_phone text := nullif(v_meta ->> 'phone', '');
begin
  v_role := coalesce((v_meta ->> 'role')::user_role, 'student');

  insert into public.profiles (id, role, first_name, last_name, display_name, avatar_url)
  values (
    new.id,
    v_role,
    v_first,
    v_last,
    coalesce(v_first, v_business, split_part(new.email, '@', 1)),
    v_avatar
  )
  on conflict (id) do nothing;

  if v_role = 'landlord' then
    insert into public.landlord_profiles (id, contact_name, business_name, phone)
    values (new.id, coalesce(v_contact, v_business, v_first, 'Landlord'), v_business, v_phone)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- apply_selected_role — used right after a social sign-up so the user ends up
-- with the role they chose on the welcome screen. Security definer so it can
-- bypass the "role can't change" check on profiles; bounded to pre-onboarding
-- accounts so it can never be used to escalate an established account.
-- ----------------------------------------------------------------------------
create or replace function apply_selected_role(p_role user_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_updated int;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
    set role = p_role
    where id = v_uid and onboarding_completed = false;
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    -- either no such profile, or onboarding already finished: no-op, not an error
    return;
  end if;

  if p_role = 'landlord' then
    insert into public.landlord_profiles (id, contact_name)
    values (
      v_uid,
      coalesce((select coalesce(first_name, display_name) from public.profiles where id = v_uid), 'Landlord')
    )
    on conflict (id) do nothing;
  end if;
end;
$$;

grant execute on function apply_selected_role(user_role) to authenticated;
