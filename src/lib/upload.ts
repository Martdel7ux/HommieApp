import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase, type StorageBucket } from '@/lib/supabase';
import { guard } from '@/services/errors';

/**
 * Upload a local image (a `file://` URI from expo-image-picker) into a public
 * bucket. `dir` MUST start with the owner's auth uid — storage RLS requires it
 * (`<bucket>/<uid>/<entity>/<file>`). Returns the stored object path.
 *
 * Always re-encodes to JPEG first, regardless of the picked file's original
 * format — iPhone photo libraries default to HEIC, which every storage
 * bucket's mime allowlist rejects outright (real user report: "mime type
 * image/heic is not supported"), and which desktop browsers can't render at
 * all even if it were allowed — the web app needs these same images to
 * display. Re-encoding here, once, fixes every upload call site at once.
 */
export async function uploadImage(
  bucket: StorageBucket,
  dir: string,
  localUri: string,
  opts: { name?: string } = {},
): Promise<string> {
  return guard(async () => {
    const context = ImageManipulator.manipulate(localUri);
    const image = await context.renderAsync();
    const { uri: jpegUri } = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });

    const name = opts.name ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
    const path = `${dir.replace(/\/$/, '')}/${name}`;

    // fetch(uri).arrayBuffer() reads a local file:// URI (native) or a blob:
    // URI (web, what ImageManipulator's web implementation returns) the same
    // way — expo-file-system's File class would be the obvious choice, but
    // its web build is a total no-op stub (`new File()` just warns
    // "not supported on web" and every method is missing), so it fails this
    // same upload path for every photo on web, not just HEIC ones.
    const bytes = await (await fetch(jpegUri)).arrayBuffer();
    const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
      contentType: 'image/jpeg',
      upsert: false,
    });
    if (error) throw error;
    return path;
  }, { scope: 'upload.image' });
}
