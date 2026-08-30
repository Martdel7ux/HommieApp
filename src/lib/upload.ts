import { File } from 'expo-file-system';
import { supabase, type StorageBucket } from '@/lib/supabase';
import { guard } from '@/services/errors';

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function extensionForMime(mime: string | null | undefined): string {
  return (mime && EXT_BY_TYPE[mime]) || 'jpg';
}

/**
 * Upload a local image (a `file://` URI from expo-image-picker) into a public
 * bucket. `dir` MUST start with the owner's auth uid — storage RLS requires it
 * (`<bucket>/<uid>/<entity>/<file>`). Returns the stored object path.
 */
export async function uploadImage(
  bucket: StorageBucket,
  dir: string,
  localUri: string,
  opts: { contentType?: string; name?: string } = {},
): Promise<string> {
  return guard(async () => {
    const contentType = opts.contentType ?? 'image/jpeg';
    const name = opts.name ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extensionForMime(contentType)}`;
    const path = `${dir.replace(/\/$/, '')}/${name}`;

    const bytes = await new File(localUri).arrayBuffer();
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType,
      upsert: false,
    });
    if (error) throw error;
    return path;
  }, { scope: 'upload.image' });
}
