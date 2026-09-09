-- ============================================================================
-- Hommie — 0018 — use the full name (first + last) for display_name on signup
-- ============================================================================
-- The sign-up form now collects a last name too. Compose display_name from
-- first + last so cards, message avatars and enquiry summaries read as a real
-- name rather than just the first name. Falls back the same way as before.
-- Supersedes the handle_new_user() body from 0015.

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
  v_full text := nullif(trim(concat_ws(' ', v_first, v_last)), '');
begin
  v_role := coalesce((v_meta ->> 'role')::user_role, 'student');

  insert into public.profiles (id, role, first_name, last_name, display_name, avatar_url)
  values (
    new.id,
    v_role,
    v_first,
    v_last,
    coalesce(v_full, v_business, split_part(new.email, '@', 1)),
    v_avatar
  )
  on conflict (id) do nothing;

  if v_role = 'landlord' then
    insert into public.landlord_profiles (id, contact_name, business_name, phone)
    values (new.id, coalesce(v_contact, v_business, v_full, v_first, 'Landlord'), v_business, v_phone)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;
