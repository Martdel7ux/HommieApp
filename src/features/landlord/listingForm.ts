import { resolveImage } from '@/lib/images';
import { STORAGE_BUCKETS } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import type { ListingDraft, LandlordListingFull } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidOptionalDate(v: string): boolean {
  return v === '' || DATE_RE.test(v);
}

/** Per-step gate for the wizard "Continue" button. */
export function stepValid(step: number, d: ListingDraft): boolean {
  switch (step) {
    case 0:
      return d.title.trim().length >= 4 && !!d.property_type;
    case 1: {
      const rent = Number(d.rent_month);
      return d.rent_month !== '' && Number.isFinite(rent) && rent >= 0;
    }
    case 2:
      return (
        !!d.city &&
        !!d.area &&
        isValidOptionalDate(d.available_from) &&
        isValidOptionalDate(d.available_to)
      );
    case 3:
      return d.photos.length >= 1;
    default:
      return true;
  }
}

export function draftFromListing(l: LandlordListingFull): ListingDraft {
  return {
    title: l.title,
    description: l.description ?? '',
    property_type: l.property_type,
    rent_month: String(l.rent_month),
    deposit: l.deposit != null ? String(l.deposit) : '',
    bills_included: l.bills_included,
    bills_note: l.bills_note ?? '',
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    furnished: l.furnished,
    roommate_suitable: l.roommate_suitable,
    max_occupants: l.max_occupants != null ? String(l.max_occupants) : '',
    city: l.city,
    area: l.area,
    address_line: l.address_line ?? '',
    approx_lat: l.approx_lat,
    approx_lng: l.approx_lng,
    nearest_university_id: l.nearest_university_id,
    distance_to_campus_km: l.distance_to_campus_km != null ? String(l.distance_to_campus_km) : '',
    amenities: l.amenities ?? [],
    available_from: l.available_from ?? '',
    available_to: l.available_to ?? '',
    photos: [...(l.images ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((img) => ({
        uri: resolveImage(img.storage_path, STORAGE_BUCKETS.listingImages) ?? img.storage_path,
        existing: { id: img.id, storagePath: img.storage_path },
      })),
  };
}

const num = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** The writable columns of `accommodation_listings` derived from the draft. */
export function draftToPayload(d: ListingDraft): Partial<Tables<'accommodation_listings'>> {
  return {
    title: d.title.trim(),
    description: d.description.trim() || null,
    property_type: d.property_type ?? 'apartment',
    rent_month: num(d.rent_month) ?? 0,
    deposit: num(d.deposit),
    bills_included: d.bills_included,
    bills_note: d.bills_included ? d.bills_note.trim() || null : null,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    furnished: d.furnished,
    roommate_suitable: d.roommate_suitable,
    max_occupants: num(d.max_occupants),
    city: d.city ?? '',
    area: d.area ?? '',
    address_line: d.address_line.trim() || null,
    approx_lat: d.approx_lat,
    approx_lng: d.approx_lng,
    nearest_university_id: d.nearest_university_id,
    distance_to_campus_km: num(d.distance_to_campus_km),
    amenities: d.amenities,
    available_from: d.available_from || null,
    available_to: d.available_to || null,
  };
}
