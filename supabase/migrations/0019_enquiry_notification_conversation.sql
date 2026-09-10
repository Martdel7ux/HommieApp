-- ============================================================================
-- Hommie — 0019 — carry conversation_id on the "New enquiry" notification
-- ============================================================================
-- The enquiry row already has conversation_id by the time this trigger runs
-- (the student starts the conversation, sends the message, then inserts the
-- enquiry). Including it means the notification — in-app and push — can deep
-- link straight to the thread. Supersedes on_enquiry_created() from 0006.

create or replace function on_enquiry_created()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update accommodation_listings
    set enquiries_count = enquiries_count + 1
  where id = new.listing_id;

  insert into notifications (user_id, type, title, body, data)
  values (new.landlord_id, 'enquiry', 'New enquiry',
          left(new.message, 140),
          jsonb_build_object(
            'enquiry_id', new.id,
            'listing_id', new.listing_id,
            'conversation_id', new.conversation_id
          ));
  return new;
end;
$$;
