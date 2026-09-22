import type { StudyLevel, StudentAudience, HousingStatus, VerificationStatus } from '@/types/database';

/** A local flat photo not yet uploaded, or an already-stored one keyed by its path. */
export interface DraftFlatPhoto {
  /** Local `file://` uri (new) or a resolved https url (existing). */
  uri: string;
  mimeType?: string | null;
  /** Set when the photo already exists in storage — its object path + row id. */
  existing?: { id: string; storagePath: string };
}

export interface RoommateProfileCard {
  user_id: string;
  headline: string | null;
  about: string | null;
  age: number | null;
  preferred_city: string | null;
  preferred_areas: string[];
  budget_min: number | null;
  budget_max: number | null;
  move_in_from: string | null;
  smoking: 'yes' | 'no' | 'outside_only' | 'no_preference';
  sleep_schedule: 'early_bird' | 'night_owl' | 'flexible' | null;
  social_level: 'homebody' | 'balanced' | 'very_social' | null;
  cleanliness: number | null;
  lifestyle_tags: string[];
  student_audience: StudentAudience;
  housing_status: HousingStatus | null;
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    study_level: StudyLevel | null;
    verification: VerificationStatus;
  } | null;
  university: { name: string; short_name: string | null } | null;
}

export interface RoommateProfileDetail {
  user_id: string;
  is_published: boolean;
  headline: string | null;
  about: string | null;
  age: number | null;
  preferred_city: string | null;
  preferred_areas: string[];
  budget_min: number | null;
  budget_max: number | null;
  move_in_from: string | null;
  move_in_to: string | null;
  smoking: 'yes' | 'no' | 'outside_only' | 'no_preference';
  pets: 'yes' | 'no' | 'no_preference';
  cleanliness: number | null;
  sleep_schedule: 'early_bird' | 'night_owl' | 'flexible' | null;
  social_level: 'homebody' | 'balanced' | 'very_social' | null;
  guests_frequency: 'rarely' | 'sometimes' | 'often' | null;
  gender_preference: 'same' | 'any' | 'no_preference';
  lifestyle_tags: string[];
  university_id: string | null;
  student_audience: StudentAudience;
  housing_status: HousingStatus | null;
  flat_rent_month: number | null;
  flat_photos: { id: string; storage_path: string; position: number }[];
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    study_level: StudyLevel | null;
    interests: string[];
    verification: VerificationStatus;
  } | null;
  university: { name: string; short_name: string | null } | null;
  saved: boolean;
}

export interface Compatibility {
  score: number;
  reasons: string[];
  /** true while the viewer's own data is still loading — show a placeholder, not the number. */
  pending?: boolean;
}

export interface RoommateMatch extends RoommateProfileCard {
  compatibility: Compatibility;
}

export type RoommateSort = 'match' | 'newest' | 'budget_low';

export interface RoommateFilters {
  universityId?: string;
  budgetMax?: number;
  area?: string;
  sort?: RoommateSort;
  studentAudience?: 'erasmus' | 'full_time';
  housingStatus?: HousingStatus;
}

export interface RoommatePage {
  rows: RoommateProfileCard[];
  count: number;
}
