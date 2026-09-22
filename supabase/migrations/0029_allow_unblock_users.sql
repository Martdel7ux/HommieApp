-- ============================================================================
-- Hommie — 0029 — allow users to unblock (delete their own block row)
-- ============================================================================
-- 0026 added blocked_users with select/insert policies only, so a block was
-- permanent from the client's point of view. Add a delete policy so a user
-- can remove a block they created.

create policy "users delete their own blocks"
  on blocked_users for delete to authenticated
  using (blocker_id = auth.uid());
