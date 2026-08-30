-- ============================================================================
-- Hommie — 0008 — create profile rows on signup from auth metadata
-- ============================================================================

-- On signup the client passes { role, first_name, contact_name, ... } in
-- options.data (-> raw_user_meta_data). We create the base profile here and,
-- for landlords, the landlord_profiles row too.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_first text := nullif(new.raw_user_meta_data ->> 'first_name', '');
  v_contact text := nullif(new.raw_user_meta_data ->> 'contact_name', '');
  v_business text := nullif(new.raw_user_meta_data ->> 'business_name', '');
  v_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
begin
  v_role := coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'student');

  insert into public.profiles (id, role, first_name, display_name)
  values (new.id, v_role, v_first, coalesce(v_first, v_business, split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  if v_role = 'landlord' then
    insert into public.landlord_profiles (id, contact_name, business_name, phone)
    values (new.id, coalesce(v_contact, v_business, v_first, 'Landlord'), v_business, v_phone)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Keep profile deletion request in sync if an auth user is hard-deleted by staff.
create or replace function handle_deleted_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- profiles row is removed by the on delete cascade FK; nothing else needed.
  return old;
end;
$$;
