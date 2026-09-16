import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { guard } from '@/services/errors';
import { uploadImage } from '@/lib/upload';
import { resolveAvatar } from '@/lib/images';
import type { ListingStatus } from '@/types/database';
import { draftToPayload } from './listingForm';
import type {
  DraftPhoto,
  LandlordEnquiry,
  LandlordListingCard,
  LandlordListingFull,
  ListingDraft,
} from './types';

const CARD_SELECT = `
  id, title, status, property_type, student_audience, rent_month, city, area,
  views_count, saves_count, enquiries_count, updated_at,
  images:accommodation_listing_images ( storage_path, position )
`;

const FULL_SELECT = `
  id, title, status, property_type, student_audience, rent_month, city, area,
  views_count, saves_count, enquiries_count, updated_at,
  description, deposit, bills_included, bills_note, bedrooms, bathrooms,
  furnished, roommate_suitable, max_occupants, address_line, approx_lat, approx_lng,
  nearest_university_id, distance_to_campus_km, amenities, available_from, available_to,
  published_at,
  images:accommodation_listing_images ( id, storage_path, position )
`;

async function syncPhotos(listingId: string, ownerId: string, photos: DraftPhoto[]) {
  // Rows the landlord removed in the editor.
  const keptIds = new Set(
    photos.map((p) => p.existing?.id).filter((id): id is string => !!id),
  );
  const { data: current } = await supabase
    .from('accommodation_listing_images')
    .select('id, storage_path')
    .eq('listing_id', listingId);

  const removed = (current ?? []).filter((r) => !keptIds.has(r.id));
  if (removed.length) {
    await supabase
      .from('accommodation_listing_images')
      .delete()
      .in(
        'id',
        removed.map((r) => r.id),
      );
    const paths = removed
      .map((r) => r.storage_path)
      .filter((p) => !/^https?:\/\//i.test(p));
    if (paths.length) {
      await supabase.storage.from(STORAGE_BUCKETS.listingImages).remove(paths).catch(() => undefined);
    }
  }

  // Walk the draft order: reposition kept rows, upload + insert new ones.
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    if (photo.existing) {
      await supabase
        .from('accommodation_listing_images')
        .update({ position: i })
        .eq('id', photo.existing.id);
      continue;
    }
    const path = await uploadImage(
      STORAGE_BUCKETS.listingImages,
      `${ownerId}/${listingId}`,
      photo.uri,
      { contentType: photo.mimeType ?? 'image/jpeg' },
    );
    await supabase
      .from('accommodation_listing_images')
      .insert({ listing_id: listingId, storage_path: path, position: i });
  }
}

export const landlordApi = {
  async myListings(userId: string): Promise<LandlordListingCard[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('accommodation_listings')
        .select(CARD_SELECT)
        .eq('landlord_id', userId)
        .order('updated_at', { ascending: false })
        .returns<LandlordListingCard[]>();
      if (error) throw error;
      return data ?? [];
    }, { scope: 'landlord.myListings' });
  },

  async getListing(id: string): Promise<LandlordListingFull> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('accommodation_listings')
        .select(FULL_SELECT)
        .eq('id', id)
        .single<LandlordListingFull>();
      if (error) throw error;
      return data;
    }, { scope: 'landlord.getListing' });
  },

  /** Insert a listing (draft or submitted for review) + upload its photos. Returns the new id. */
  async createListing(
    userId: string,
    draft: ListingDraft,
    opts: { publish: boolean },
  ): Promise<string> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('accommodation_listings')
        .insert({
          landlord_id: userId,
          status: opts.publish ? 'pending_review' : 'draft',
          ...draftToPayload(draft),
        })
        .select('id')
        .single();
      if (error) throw error;
      const id = data.id as string;
      await syncPhotos(id, userId, draft.photos);
      return id;
    }, { scope: 'landlord.createListing' });
  },

  async updateListing(
    id: string,
    userId: string,
    draft: ListingDraft,
    opts: { publish?: boolean } = {},
  ): Promise<void> {
    return guard(async () => {
      const patch: Record<string, unknown> = draftToPayload(draft);
      if (opts.publish) patch.status = 'pending_review';
      const { error } = await supabase.from('accommodation_listings').update(patch).eq('id', id);
      if (error) throw error;
      await syncPhotos(id, userId, draft.photos);
    }, { scope: 'landlord.updateListing' });
  },

  async setStatus(id: string, status: ListingStatus): Promise<void> {
    return guard(async () => {
      const { error } = await supabase
        .from('accommodation_listings')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    }, { scope: 'landlord.setStatus' });
  },

  async duplicateListing(id: string, userId: string): Promise<string> {
    return guard(async () => {
      const src = await this.getListing(id);
      const { data, error } = await supabase
        .from('accommodation_listings')
        .insert({
          landlord_id: userId,
          status: 'draft',
          title: `${src.title} (copy)`.slice(0, 120),
          description: src.description,
          property_type: src.property_type,
          rent_month: src.rent_month,
          deposit: src.deposit,
          bills_included: src.bills_included,
          bills_note: src.bills_note,
          bedrooms: src.bedrooms,
          bathrooms: src.bathrooms,
          furnished: src.furnished,
          roommate_suitable: src.roommate_suitable,
          max_occupants: src.max_occupants,
          city: src.city,
          area: src.area,
          address_line: src.address_line,
          approx_lat: src.approx_lat,
          approx_lng: src.approx_lng,
          nearest_university_id: src.nearest_university_id,
          distance_to_campus_km: src.distance_to_campus_km,
          amenities: src.amenities,
          available_from: src.available_from,
          available_to: src.available_to,
        })
        .select('id')
        .single();
      if (error) throw error;
      const newId = data.id as string;

      const rows = [...(src.images ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((img, i) => ({ listing_id: newId, storage_path: img.storage_path, position: i }));
      if (rows.length) {
        await supabase.from('accommodation_listing_images').insert(rows);
      }
      return newId;
    }, { scope: 'landlord.duplicateListing' });
  },

  async deleteListing(id: string): Promise<void> {
    return guard(async () => {
      const { error } = await supabase.from('accommodation_listings').delete().eq('id', id);
      if (error) throw error;
    }, { scope: 'landlord.deleteListing' });
  },

  async myEnquiries(userId: string, listingId?: string): Promise<LandlordEnquiry[]> {
    return guard(async () => {
      let q = supabase
        .from('enquiries')
        .select(
          `
          id, listing_id, conversation_id, student_id, message, is_read, created_at,
          listing:accommodation_listings!enquiries_listing_id_fkey ( title )
        `,
        )
        .eq('landlord_id', userId)
        .order('created_at', { ascending: false });
      if (listingId) q = q.eq('listing_id', listingId);

      const { data, error } = await q.returns<
        {
          id: string;
          listing_id: string;
          conversation_id: string | null;
          student_id: string;
          message: string;
          is_read: boolean;
          created_at: string;
          listing: { title: string } | null;
        }[]
      >();
      if (error) throw error;
      const rows = data ?? [];
      if (!rows.length) return [];

      const { data: summaries } = await supabase
        .from('enquiry_student_summaries')
        .select('*')
        .in(
          'enquiry_id',
          rows.map((r) => r.id),
        );
      const byId = new Map((summaries ?? []).map((s) => [s.enquiry_id as string, s]));

      return rows.map((r) => {
        const s = byId.get(r.id);
        return {
          id: r.id,
          listing_id: r.listing_id,
          listing_title: r.listing?.title ?? 'Listing',
          conversation_id: r.conversation_id,
          student_id: r.student_id,
          message: r.message,
          is_read: r.is_read,
          created_at: r.created_at,
          student: {
            first_name: (s?.first_name as string | null) ?? null,
            avatar_url: resolveAvatar((s?.avatar_url as string | null) ?? null) ?? null,
            university: (s?.university as string | null) ?? null,
            city: (s?.city as string | null) ?? null,
            move_in_from: (s?.move_in_from as string | null) ?? null,
            move_in_to: (s?.move_in_to as string | null) ?? null,
            budget_min: (s?.budget_min as number | null) ?? null,
            budget_max: (s?.budget_max as number | null) ?? null,
          },
        } satisfies LandlordEnquiry;
      });
    }, { scope: 'landlord.myEnquiries' });
  },

  async markEnquiryRead(id: string): Promise<void> {
    return guard(async () => {
      const { error } = await supabase.from('enquiries').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    }, { scope: 'landlord.markEnquiryRead' });
  },
};
