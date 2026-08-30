-- ============================================================================
-- Hommie — 0010 — realtime publication + helper views/RPCs
-- ============================================================================

-- Realtime: messaging + notifications drive live UI. RLS still applies to the
-- realtime stream, so clients only receive rows they are allowed to see.
--
-- Wrapped defensively: on some hosted projects `supabase_realtime` is not owned
-- by the migration role, and a table may already be a member. Neither case
-- should fail the migration — realtime for that table can be toggled later in
-- the dashboard (Database → Replication).
do $$
declare
  t text;
begin
  foreach t in array array[
    'messages', 'conversations', 'conversation_participants', 'notifications', 'enquiries'
  ]
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception
      when duplicate_object then null;      -- already published
      when insufficient_privilege then
        raise notice 'skipped realtime for %: insufficient privilege', t;
      when undefined_object then
        raise notice 'skipped realtime for %: supabase_realtime publication not found', t;
    end;
  end loop;
end $$;

-- Landlord dashboard aggregate for a listing.
create or replace function landlord_dashboard_summary()
returns table (
  active_listings integer,
  draft_listings integer,
  paused_listings integer,
  rented_listings integer,
  unread_enquiries integer,
  total_views integer,
  total_saves integer,
  total_enquiries integer
)
language sql stable security definer set search_path = public as $$
  select
    count(*) filter (where status = 'active')::int,
    count(*) filter (where status = 'draft')::int,
    count(*) filter (where status = 'paused')::int,
    count(*) filter (where status = 'rented')::int,
    coalesce((select count(*) from enquiries e where e.landlord_id = auth.uid() and e.is_read = false), 0)::int,
    coalesce(sum(views_count), 0)::int,
    coalesce(sum(saves_count), 0)::int,
    coalesce(sum(enquiries_count), 0)::int
  from accommodation_listings
  where landlord_id = auth.uid();
$$;

grant execute on function landlord_dashboard_summary() to authenticated;

-- Start (or fetch) a 1:1 conversation between the current user and another user.
create or replace function start_conversation(
  p_other_user uuid,
  p_context conversation_context default 'general',
  p_accommodation_listing_id uuid default null,
  p_marketplace_listing_id uuid default null,
  p_roommate_profile_id uuid default null
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if p_other_user = auth.uid() then
    raise exception 'You cannot start a conversation with yourself';
  end if;

  select c.id into v_id
  from conversations c
  join conversation_participants p1 on p1.conversation_id = c.id and p1.user_id = auth.uid()
  join conversation_participants p2 on p2.conversation_id = c.id and p2.user_id = p_other_user
  where c.context is not distinct from p_context
    and c.accommodation_listing_id is not distinct from p_accommodation_listing_id
    and c.marketplace_listing_id is not distinct from p_marketplace_listing_id
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into conversations (context, accommodation_listing_id, marketplace_listing_id, roommate_profile_id, created_by)
  values (p_context, p_accommodation_listing_id, p_marketplace_listing_id, p_roommate_profile_id, auth.uid())
  returning id into v_id;

  insert into conversation_participants (conversation_id, user_id) values (v_id, auth.uid()), (v_id, p_other_user);

  return v_id;
end;
$$;

grant execute on function start_conversation(uuid, conversation_context, uuid, uuid, uuid) to authenticated;
