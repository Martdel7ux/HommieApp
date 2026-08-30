-- ============================================================================
-- Hommie — 0012 — make the one-to-one conversation guard idempotent
-- ============================================================================
-- The BEFORE INSERT guard fired before `on conflict do nothing` could resolve,
-- so re-inserting an existing participant (e.g. re-running the seed) failed with
-- "Conversations are one-to-one". Allow a no-op re-insert of an existing pair.

create or replace function guard_conversation_participants()
returns trigger language plpgsql as $$
declare
  n integer;
begin
  if exists (
    select 1 from conversation_participants
    where conversation_id = new.conversation_id and user_id = new.user_id
  ) then
    return new; -- already a participant; the insert will be a no-op via ON CONFLICT
  end if;

  select count(*) into n from conversation_participants where conversation_id = new.conversation_id;
  if n >= 2 then
    raise exception 'Conversations are one-to-one in Hommie V1';
  end if;
  return new;
end;
$$;
