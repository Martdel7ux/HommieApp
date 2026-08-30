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
  images: ListingImage[];
  landlord: ListingLandlord | null;
}

export interface AccommodationFilters {
  query?: string;
  city?: string;
  universityId?: string;
  propertyTypes?: PropertyType[];
  rentMin?: number;
  rentMax?: number;
  minBedrooms?: number;
  furnished?: boolean;
  billsIncluded?: boolean;
  roommateSuitable?: boolean;
  availableFrom?: string;
  sort?: 'relevance' | 'newest' | 'rent_asc' | 'rent_desc';
}
