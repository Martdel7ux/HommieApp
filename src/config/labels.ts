/** Human-readable labels for enum values used across the app. */
import type {
  StudentStatus,
  StudyLevel,
  PropertyType,
  ListingStatus,
  VerificationStatus,
  CommunityCategory,
  MarketplaceCategory,
  MarketplaceCondition,
} from '@/types/database';

export const studentStatusLabels: Record<StudentStatus, string> = {
  new_to_cyprus: 'New to Cyprus',
  looking_for_accommodation: 'Looking for accommodation',
  looking_for_roommate: 'Looking for a roommate',
  already_settled: 'Already settled',
};

export const studyLevelLabels: Record<StudyLevel, string> = {
  foundation: 'Foundation',
  undergraduate_y1: 'Undergraduate — Year 1',
  undergraduate_y2: 'Undergraduate — Year 2',
  undergraduate_y3: 'Undergraduate — Year 3',
  undergraduate_y4: 'Undergraduate — Year 4',
  postgraduate: 'Postgraduate',
  phd: 'PhD',
  erasmus_exchange: 'Erasmus / Exchange',
};

export const propertyTypeLabels: Record<PropertyType, string> = {
  studio: 'Studio',
  apartment: 'Apartment',
  house: 'House',
  shared_room: 'Shared room',
  private_room: 'Private room',
};

export const listingStatusLabels: Record<ListingStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  paused: 'Paused',
  rented: 'Rented',
  archived: 'Archived',
};

export const verificationLabels: Record<VerificationStatus, string> = {
  unverified: 'Unverified',
  submitted: 'Verification submitted',
  verified: 'Hommie Verified',
};

export const communityCategoryLabels: Record<CommunityCategory, string> = {
  housing_help: 'Housing Help',
  new_in_cyprus: 'New in Cyprus',
  campus_life: 'Campus Life',
  recommendations: 'Recommendations',
  general: 'General',
};

export const marketplaceCategoryLabels: Record<MarketplaceCategory, string> = {
  furniture: 'Furniture',
  electronics: 'Electronics',
  books: 'Books',
  kitchen: 'Kitchen',
  transport: 'Transport',
  other: 'Other',
};

export const marketplaceConditionLabels: Record<MarketplaceCondition, string> = {
  new: 'New',
  like_new: 'Like new',
  good: 'Good',
  fair: 'Fair',
  for_parts: 'For parts',
};

export const amenityLabels: Record<string, string> = {
  wifi: 'Wi-Fi',
  air_conditioning: 'Air conditioning',
  heating: 'Heating',
  washing_machine: 'Washing machine',
  dishwasher: 'Dishwasher',
  furnished: 'Furnished',
  balcony: 'Balcony',
  parking: 'Parking',
  elevator: 'Elevator',
  pet_friendly: 'Pet friendly',
  study_desk: 'Study desk',
  near_bus_stop: 'Near bus stop',
  private_bathroom: 'Private bathroom',
};

export function enumOptions<T extends string>(labels: Record<T, string>) {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}
