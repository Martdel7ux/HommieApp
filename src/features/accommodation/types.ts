import type {
  PropertyType,
  ListingStatus,
  VerificationStatus,
} from '@/types/database';

export interface ListingImage {
  storage_path: string;
  position: number;
}

export interface ListingLandlord {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  landlord_profile: { verification: VerificationStatus; business_name: string | null } | null;
}

/** Shape returned for cards / lists (a subset of the full listing). */
export interface AccommodationCard {
  id: string;
  title: string;
  rent_month: number;
  deposit: number | null;
  bills_included: boolean;
  property_type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  roommate_suitable: boolean;
  city: string;
  area: string;
  available_from: string | null;
  amenities: string[];
  saves_count: number;
  views_count: number;
  published_at: string | null;
  status: ListingStatus;
  distance_to_campus_km: number | null;
  images: ListingImage[];
  landlord: ListingLandlord | null;
  nearest_university: { short_name: string | null; name: string } | null;
}

export interface DetailLandlord {
  id: string;
  first_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  landlord_profile:
    | { verification: VerificationStatus; business_name: string | null; contact_name: string | null }
    | null;
}

/** Everything the property detail screen needs (superset of the card). */
export interface AccommodationDetail {
  id: string;
  title: string;
  description: string | null;
  rent_month: number;
  deposit: number | null;
  bills_included: boolean;
  bills_note: string | null;
  property_type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  roommate_suitable: boolean;
  max_occupants: number | null;
  city: string;
  area: string;
  address_line: string | null;
  approx_lat: number;
  approx_lng: number;
  available_from: string | null;
  available_to: string | null;
  amenities: string[];
  saves_count: number;
  views_count: number;
  status: ListingStatus;
  distance_to_campus_km: number | null;
  nearest_university_id: string | null;
  images: ListingImage[];
  landlord: DetailLandlord | null;
  nearest_university: { id: string; short_name: string | null; name: string } | null;
  saved: boolean;
}

export type AccommodationSort = 'relevance' | 'newest' | 'rent_asc' | 'rent_desc';

export interface AccommodationFilters {
  query?: string;
  city?: string;
  area?: string;
  universityId?: string;
  propertyTypes?: PropertyType[];
  rentMin?: number;
  rentMax?: number;
  minBedrooms?: number;
  furnished?: boolean;
  billsIncluded?: boolean;
  roommateSuitable?: boolean;
  availableFrom?: string;
  sort?: AccommodationSort;
}

export interface AccommodationPage {
  rows: AccommodationCard[];
  count: number | null;
}
