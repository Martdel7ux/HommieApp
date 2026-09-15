-- Notify the landlord when their listing's review status changes: submitted
-- for review, approved, or rejected back to draft. Mirrors on_enquiry_created
-- (0019) — a DB trigger so it fires regardless of whether the status change
-- came from the mobile app (submit) or the separate admin-web tool
-- (approve/reject), which has no access to this codebase's client helpers.
create or replace function on_listing_status_changed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'pending_review' and (old is null or old.status is distinct from 'pending_review') then
    insert into notifications (user_id, type, title, body, data)
    values (new.landlord_id, 'system', 'Listing submitted for review',
            new.title || ' is now waiting on Hommie to review it.',
            jsonb_build_object('listing_id', new.id));
  elsif old.status = 'pending_review' and new.status = 'active' then
    insert into notifications (user_id, type, title, body, data)
    values (new.landlord_id, 'system', 'Listing approved',
            new.title || ' is now live for students to see.',
            jsonb_build_object('listing_id', new.id));
  elsif old.status = 'pending_review' and new.status = 'draft' then
    insert into notifications (user_id, type, title, body, data)
    values (new.landlord_id, 'system', 'Listing needs changes',
            new.title || ' was sent back to drafts. Edit and resubmit when ready.',
            jsonb_build_object('listing_id', new.id));
  end if;
  return new;
end;
$$;

create trigger accommodation_listings_status_notify
  after insert or update on accommodation_listings
  for each row execute function on_listing_status_changed();
