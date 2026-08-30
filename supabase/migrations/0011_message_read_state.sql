-- ============================================================================
-- Hommie — 0011 — mark the sender's own last_read_at on send, + read RPC
-- ============================================================================
-- Without this, sending a message makes conversations.last_message_at newer than
-- the sender's own last_read_at, so their own conversation shows as "unread".

create or replace function bump_conversation_on_message()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update conversations
    set last_message_at = new.created_at,
        last_message_preview = left(new.body, 140)
  where id = new.conversation_id;

  -- the sender has, by definition, read up to their own message
  update conversation_participants
    set last_read_at = new.created_at
  where conversation_id = new.conversation_id and user_id = new.sender_id;

  -- notify the other participant(s)
  insert into notifications (user_id, type, title, body, data)
  select cp.user_id, 'message', 'New message', left(new.body, 140),
         jsonb_build_object('conversation_id', new.conversation_id)
  from conversation_participants cp
  where cp.conversation_id = new.conversation_id
    and cp.user_id <> new.sender_id
    and cp.muted = false;

  return new;
end;
$$;

-- Mark a conversation read for the current user.
create or replace function mark_conversation_read(p_conversation_id uuid)
returns void language sql security definer set search_path = public as $$
  update conversation_participants
    set last_read_at = now()
  where conversation_id = p_conversation_id and user_id = auth.uid();
$$;

grant execute on function mark_conversation_read(uuid) to authenticated;

-- Total unread conversations for the current user (for the Messages tab badge).
create or replace function unread_conversation_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int
  from conversation_participants cp
  join conversations c on c.id = cp.conversation_id
  where cp.user_id = auth.uid()
    and cp.archived = false
    and c.last_message_at > cp.last_read_at;
$$;

grant execute on function unread_conversation_count() to authenticated;
