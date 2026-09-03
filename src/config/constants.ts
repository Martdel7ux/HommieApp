/** App-wide constants and enums shared by the client and (conceptually) the DB. */

export const APP_NAME = 'Hommie';
export const SUPPORT_EMAIL = 'support@hommie.app';
export const LAUNCH_DATE = '2026-10-11';

export const IMAGE_UPLOAD = {
  maxBytes: 5 * 1024 * 1024, // 5 MB per image
  maxListingImages: 10,
  maxMarketplaceImages: 6,
  maxCommunityImages: 4,
  compressQuality: 0.7,
  maxDimension: 1600,
} as const;

export const PAGE_SIZE = {
  listings: 12,
  messages: 30,
  conversations: 20,
  community: 15,
  marketplace: 12,
  roommates: 12,
  jobs: 12,
  enquiries: 20,
} as const;

export const USER_ROLES = ['student', 'landlord'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STUDENT_STATUS = [
  'new_to_cyprus',
  'looking_for_accommodation',
  'looking_for_roommate',
  'already_settled',
] as const;
export type StudentStatus = (typeof STUDENT_STATUS)[number];

export const STUDY_LEVELS = [
  'foundation',
  'undergraduate_y1',
  'undergraduate_y2',
  'undergraduate_y3',
  'undergraduate_y4',
  'postgraduate',
  'phd',
  'erasmus_exchange',
] as const;
export type StudyLevel = (typeof STUDY_LEVELS)[number];

export const PROPERTY_TYPES = [
  'studio',
  'apartment',
  'house',
  'shared_room',
  'private_room',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const LISTING_STATUS = ['draft', 'active', 'paused', 'rented', 'archived'] as const;
export type ListingStatus = (typeof LISTING_STATUS)[number];

export const VERIFICATION_STATUS = ['unverified', 'submitted', 'verified'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUS)[number];

export const COMMUNITY_CATEGORIES = [
  'housing_help',
  'new_in_cyprus',
  'campus_life',
  'recommendations',
  'general',
] as const;
export type CommunityCategory = (typeof COMMUNITY_CATEGORIES)[number];

export const MARKETPLACE_CATEGORIES = [
  'furniture',
  'electronics',
  'books',
  'kitchen',
  'transport',
  'other',
] as const;
export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

export const MARKETPLACE_CONDITIONS = ['new', 'like_new', 'good', 'fair', 'for_parts'] as const;
export type MarketplaceCondition = (typeof MARKETPLACE_CONDITIONS)[number];

export const JOB_TYPES = ['part_time', 'internship', 'full_time', 'contract', 'seasonal'] as const;
export type JobType = (typeof JOB_TYPES)[number];

export const JOB_WORK_MODES = ['on_site', 'remote', 'hybrid', 'on_campus'] as const;
export type JobWorkMode = (typeof JOB_WORK_MODES)[number];

export const CONVERSATION_CONTEXTS = ['accommodation', 'roommate', 'marketplace', 'general'] as const;
export type ConversationContext = (typeof CONVERSATION_CONTEXTS)[number];

export const REPORT_REASONS = [
  'spam',
  'scam_or_fraud',
  'inappropriate',
  'harassment',
  'wrong_category',
  'not_available',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const CYPRUS_CITIES = [
  'Nicosia',
  'Engomi',
  'Strovolos',
  'Aglantzia',
  'Latsia',
  'Lakatamia',
  'Limassol',
  'Larnaca',
  'Paphos',
] as const;

/** Neighbourhoods used for the accommodation "Area" filter. */
export const CYPRUS_AREAS = [
  'Engomi',
  'Aglantzia',
  'Strovolos',
  'Pallouriotissa',
  'Latsia',
  'Lakatamia',
  'Old Town',
  'Kaimakli',
  'Pyla',
  'City Centre',
] as const;

export const AMENITIES = [
  'wifi',
  'air_conditioning',
  'heating',
  'washing_machine',
  'dishwasher',
  'furnished',
  'balcony',
  'parking',
  'elevator',
  'pet_friendly',
  'study_desk',
  'near_bus_stop',
  'private_bathroom',
] as const;
export type Amenity = (typeof AMENITIES)[number];
