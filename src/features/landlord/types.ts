import type { ListingImage } from '@/features/accommodation/types';
import type { ListingStatus, PropertyType } from '@/types/database';

/** A local photo not yet uploaded, or an already-stored one keyed by its path. */
export interface DraftPhoto {
  /** Local `file://` uri (new) or a resolved https url (existing). */
  uri: string;
  mimeType?: string | null;
  /** Set when the photo already exists in storage — its object path + row id. */
  existing?: { id: string; storagePath: string };
}

/** Row shape for the "My Listings" list. */
export interface LandlordListingCard {
  id: string;
  title: string;
  status: ListingStatus;
  property_type: PropertyType;
  rent_month: number;
  city: string;
  area: string;
  views_count: number;
  saves_count: number;
  enquiries_count: number;
  updated_at: string;
  images: ListingImage[];
}

/** Full row for the manage + edit screens. */
export interface LandlordListingFull extends LandlordListingCard {
  description: string | null;
  deposit: number | null;
  bills_included: boolean;
  bills_note: string | null;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  roommate_suitable: boolean;
  max_occupants: number | null;
  address_line: string | null;
  approx_lat: number;
  approx_lng: number;
  nearest_university_id: string | null;
  distance_to_campus_km: number | null;
  amenities: string[];
  available_from: string | null;
  available_to: string | null;
  published_at: string | null;
  images: (ListingImage & { id: string })[];
}

export interface LandlordEnquiry {
  id: string;
  listing_id: string;
  listing_title: string;
  conversation_id: string | null;
  student_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  student: {
    first_name: string | null;
    avatar_url: string | null;
    university: string | null;
    city: string | null;
    move_in_from: string | null;
    move_in_to: string | null;
    budget_min: number | null;
    budget_max: number | null;
  };
}

/** Mutable form state for the create/edit wizard. Strings for numeric inputs. */
export interface ListingDraft {
  title: string;
  description: string;
  property_type: PropertyType | null;

  rent_month: string;
  deposit: string;
  bills_included: boolean;
  bills_note: string;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  roommate_suitable: boolean;
  max_occupants: string;

  city: string | null;
  area: string | null;
  address_line: string;
  approx_lat: number;
  approx_lng: number;
  nearest_university_id: string | null;
  distance_to_campus_km: string;
  amenities: string[];
  available_from: string;
  available_to: string;

  photos: DraftPhoto[];
}

/** Nicosia — starting point for the location pin. */
export const DEFAULT_PIN = { latitude: 35.1856, longitude: 33.3823 };

export const emptyDraft: ListingDraft = {
  title: '',
  description: '',
  property_type: null,
  rent_month: '',
  deposit: '',
  bills_included: false,
  bills_note: '',
  bedrooms: 1,
  bathrooms: 1,
  furnished: false,
  roommate_suitable: false,
  max_occupants: '',
  city: null,
  area: null,
  address_line: '',
  approx_lat: DEFAULT_PIN.latitude,
  approx_lng: DEFAULT_PIN.longitude,
  nearest_university_id: null,
  distance_to_campus_km: '',
  amenities: [],
  available_from: '',
  available_to: '',
  photos: [],
};
