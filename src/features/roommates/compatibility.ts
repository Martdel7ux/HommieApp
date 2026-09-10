import type { Tables } from '@/types/database';
import type { Compatibility, RoommateProfileCard } from './types';

type StudentProfile = Pick<
  Tables<'profiles'>,
  'city' | 'budget_min' | 'budget_max' | 'move_in_from'
>;

type MyRoommatePrefs = Pick<
  Tables<'roommate_preferences'>,
  | 'preferred_city'
  | 'preferred_areas'
  | 'budget_min'
  | 'budget_max'
  | 'move_in_from'
  | 'sleep_schedule'
  | 'social_level'
  | 'cleanliness'
  | 'smoking'
>;

/** What the estimator compares the other person against. */
export interface CompatInput {
  budget_min: number | null;
  budget_max: number | null;
  city: string | null;
  preferred_areas: string[];
  move_in_from: string | null;
  sleep_schedule: RoommateProfileCard['sleep_schedule'];
  social_level: RoommateProfileCard['social_level'];
  cleanliness: number | null;
  smoking: RoommateProfileCard['smoking'] | null;
  /** true once the viewer has their own roommate profile — unlocks lifestyle scoring. */
  hasPrefs: boolean;
}

/**
 * Merge the viewer's own roommate preferences (when they have them) with their
 * student profile as a fallback. Returns null while nothing has loaded yet.
 */
export function buildCompatInput(
  student: StudentProfile | null | undefined,
  prefs: MyRoommatePrefs | null | undefined,
): CompatInput | null {
  if (!student && !prefs) return null;
  return {
    budget_min: prefs?.budget_min ?? student?.budget_min ?? null,
    budget_max: prefs?.budget_max ?? student?.budget_max ?? null,
    city: prefs?.preferred_city ?? student?.city ?? null,
    preferred_areas: prefs?.preferred_areas ?? [],
    move_in_from: prefs?.move_in_from ?? student?.move_in_from ?? null,
    sleep_schedule: prefs?.sleep_schedule ?? null,
    social_level: prefs?.social_level ?? null,
    cleanliness: prefs?.cleanliness ?? null,
    smoking: prefs?.smoking ?? null,
    hasPrefs: !!prefs,
  };
}

/**
 * Client-side estimate of roommate compatibility. The weights mirror the
 * `roommate_compatibility` SQL function (budget 30 / location 25 / move-in 20 /
 * lifestyle 25). Lifestyle only scores once the viewer has their own roommate
 * profile — otherwise the number would be identical for everyone.
 *
 * This is a rough helpfulness signal, NOT a scientific match. Always surface the
 * `reasons`, never the number alone.
 */
export function estimateCompatibility(
  input: CompatInput | null | undefined,
  other: RoommateProfileCard,
): Compatibility {
  if (!input) {
    return { score: 0, reasons: ['Finish your profile to see match reasons'], pending: true };
  }

  let score = 0;
  const reasons: string[] = [];

  // Budget overlap — 30
  if (
    input.budget_min != null &&
    input.budget_max != null &&
    other.budget_min != null &&
    other.budget_max != null
  ) {
    const overlaps =
      Math.min(input.budget_max, other.budget_max) >= Math.max(input.budget_min, other.budget_min);
    if (overlaps) {
      score += 30;
      reasons.push('Similar budget');
    } else {
      score += 8;
    }
  } else {
    score += 12;
  }

  // Location — 25
  if (input.city && other.preferred_city && input.city === other.preferred_city) {
    score += 15;
    reasons.push('Same city');
    if (input.preferred_areas.some((a) => other.preferred_areas.includes(a))) {
      score += 10;
      reasons.push('Overlapping areas');
    }
  } else if (input.city && other.preferred_areas.includes(input.city)) {
    score += 10;
    reasons.push('Overlapping areas');
  }

  // Move-in timing — 20
  if (input.move_in_from && other.move_in_from) {
    const days = Math.abs(
      (new Date(input.move_in_from).getTime() - new Date(other.move_in_from).getTime()) / 86_400_000,
    );
    if (days <= 31) {
      score += 20;
      reasons.push('Similar move-in period');
    } else if (days <= 62) {
      score += 10;
    }
  }

  // Lifestyle — 25 (only meaningful once the viewer has their own roommate profile)
  if (input.hasPrefs) {
    if (input.smoking && input.smoking === other.smoking && input.smoking !== 'no_preference') {
      score += 6;
      reasons.push('Matching smoking preference');
    }
    if (input.sleep_schedule && input.sleep_schedule === other.sleep_schedule) {
      score += 6;
      reasons.push('Similar sleep schedule');
    }
    if (
      input.cleanliness != null &&
      other.cleanliness != null &&
      Math.abs(input.cleanliness - other.cleanliness) <= 1
    ) {
      score += 7;
      reasons.push('Similar cleanliness');
    }
    if (input.social_level && input.social_level === other.social_level) {
      score += 6;
      reasons.push('Similar social style');
    }
  } else if (other.lifestyle_tags.length >= 2 || other.sleep_schedule) {
    // Can't compare lifestyle yet — small nudge for a well-described profile.
    score += 10;
    if (other.sleep_schedule === 'early_bird') reasons.push('Early riser');
    else if (other.sleep_schedule === 'night_owl') reasons.push('Night owl');
  }

  if (reasons.length === 0) reasons.push('A few things in common');
  return { score: Math.min(Math.round(score), 100), reasons };
}

/** Short label like "Design Student · Early Bird" for a match card. */
export function matchSubtitle(other: RoommateProfileCard, studyLevelLabel?: string): string {
  const bits: string[] = [];
  if (studyLevelLabel) bits.push(studyLevelLabel);
  const tag = other.lifestyle_tags[0];
  if (tag) bits.push(tag.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
  else if (other.sleep_schedule === 'early_bird') bits.push('Early bird');
  else if (other.sleep_schedule === 'night_owl') bits.push('Night owl');
  return bits.join(' · ') || other.preferred_city || 'Student';
}
