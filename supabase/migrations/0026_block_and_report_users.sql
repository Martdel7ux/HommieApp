-- ============================================================================
-- Hommie — 0026 — block users (chat-scoped) + report-user enforcement
-- ============================================================================

create table blocked_users (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references profiles(id) on delete cascade,
  blocked_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create index blocked_users_blocker_idx on blocked_users (blocker_id);

alter table blocked_users enable row level security;

create policy "users read their own blocks"
  on blocked_users for select to authenticated
  using (blocker_id = auth.uid());

create policy "users create their own blocks"
  on blocked_users for insert to authenticated
  with check (blocker_id = auth.uid());

-- ----------------------------------------------------------------------------
-- A blocked sender cannot send further messages in a shared conversation.
-- Must drop + recreate (not add a second permissive policy) — a second
-- permissive policy would OR together with the existing one and be MORE
-- permissive, not less.
-- ----------------------------------------------------------------------------
drop policy "participants send messages as themselves" on messages;

create policy "participants send messages as themselves"
  on messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
    and not exists (
      select 1
      from conversation_participants cp
      join blocked_users bu on bu.blocker_id = cp.user_id and bu.blocked_id = auth.uid()
      where cp.conversation_id = messages.conversation_id
        and cp.user_id <> auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Neither party can start a NEW conversation with the other once blocked.
-- NOTE: this check lives inside start_conversation() itself, not in an RLS
-- policy on conversation_participants — that table's INSERT policy is never
-- consulted here because start_conversation() is security definer and the
-- function/table share an owner (no FORCE ROW LEVEL SECURITY is set
-- anywhere in this project), so RLS is bypassed for that insert regardless
-- of policy content. Tightening that policy would be a pure no-op.
-- ----------------------------------------------------------------------------
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

  if exists (
    select 1 from blocked_users
    where (blocker_id = auth.uid() and blocked_id = p_other_user)
       or (blocker_id = p_other_user and blocked_id = auth.uid())
  ) then
    raise exception 'blocked' using errcode = 'B0001';
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
