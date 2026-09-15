-- New listing_status value: a published listing now enters review before
-- going live to students. Added in its own migration since Postgres forbids
-- using a freshly-added enum value within the same transaction that added it.
alter type listing_status add value 'pending_review';
