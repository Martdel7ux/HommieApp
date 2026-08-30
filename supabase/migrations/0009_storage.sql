-- ============================================================================
-- Hommie — 0009 — storage buckets + policies
-- ============================================================================
-- Path convention: <bucket>/<owner_uid>/<entity_id>/<filename>
-- The first path segment is always the owner's auth uid, which the policies
-- below enforce for writes.

do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values
    ('avatars',            'avatars',            true,  5242880, array['image/jpeg','image/png','image/webp']),
    ('listing-images',     'listing-images',     true,  5242880, array['image/jpeg','image/png','image/webp']),
    ('marketplace-images', 'marketplace-images', true,  5242880, array['image/jpeg','image/png','image/webp']),
    ('community-images',   'community-images',   true,  5242880, array['image/jpeg','image/png','image/webp']),
    ('verification-docs',  'verification-docs',  false, 10485760, array['image/jpeg','image/png','application/pdf'])
  on conflict (id) do nothing;
exception
  when insufficient_privilege then
    raise notice 'skipped storage.buckets seed (privilege) — create buckets in the dashboard';
end $$;

-- Storage RLS policies. Wrapped defensively so the migration does not fail if
-- the role cannot create policies on storage.objects on a given host, or if a
-- policy already exists — in that case configure them in the dashboard
-- (Storage → Policies).
do $$
declare
  b text;
  stmts text[];
  s text;
begin
  -- public-read buckets: anyone reads, owner-only writes (owner = path segment 1)
  foreach b in array array['avatars','listing-images','marketplace-images','community-images']
  loop
    stmts := array[
      format('create policy %I on storage.objects for select using (bucket_id = %L)', b || ' read', b),
      format('create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)', b || ' owner insert', b),
      format('create policy %I on storage.objects for update to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)', b || ' owner update', b),
      format('create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and (storage.foldername(name))[1] = auth.uid()::text)', b || ' owner delete', b)
    ];
    foreach s in array stmts
    loop
      begin
        execute s;
      exception
        when duplicate_object then null;
        when insufficient_privilege then raise notice 'skipped storage policy (privilege): %', s;
      end;
    end loop;
  end loop;

  -- verification-docs: private; owner only
  begin
    execute 'create policy "verification-docs owner rw" on storage.objects for all to authenticated
      using (bucket_id = ''verification-docs'' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = ''verification-docs'' and (storage.foldername(name))[1] = auth.uid()::text)';
  exception
    when duplicate_object then null;
    when insufficient_privilege then raise notice 'skipped verification-docs policy (privilege)';
  end;
end $$;
