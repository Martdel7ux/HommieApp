import type { StudyLevel } from '@/types/database';

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
  profile: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
    avatar_url: string | null;
    study_level: StudyLevel | null;
  } | null;
  university: { name: string; short_name: string | null } | null;
}

export interface Compatibility {
  score: number;
  reasons: string[];
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
}

export interface RoommatePage {
  rows: RoommateProfileCard[];
  count: number;
}
