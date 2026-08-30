import { supabase, STORAGE_BUCKETS, StorageBucket } from '@/lib/supabase';

/**
 * Resolve a stored image reference to a displayable URL.
 *
 * - Absolute URLs (http/https) are returned unchanged — used by seed data and
 *   any externally-hosted image.
 * - Otherwise the value is treated as an object path inside `bucket` and turned
 *   into a Supabase public URL.
 */
export function resolveImage(
  path: string | null | undefined,
  bucket: StorageBucket = STORAGE_BUCKETS.listingImages,
): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function resolveAvatar(path: string | null | undefined): string | undefined {
  return resolveImage(path, STORAGE_BUCKETS.avatars);
}
