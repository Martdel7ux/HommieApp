import type { Tables } from '@/types/database';
import type { Compatibility, RoommateProfileCard } from './types';

type StudentProfile = Pick<
  Tables<'profiles'>,
  'city' | 'budget_min' | 'budget_max' | 'move_in_from'
>;

/**
 * Client-side estimate of roommate compatibility, mirroring the weights of the
 * `roommate_compatibility` SQL function but comparing against the viewer's own
 * student profile (budget / city / move-in) so it works before they have built
 * a dedicated roommate profile.
 *
 * This is a rough helpfulness signal, NOT a scientific match. Always surface the
 * `reasons`, never the number alone.
 */
export function estimateCompatibility(
  me: StudentProfile | null | undefined,
  other: RoommateProfileCard,
): Compatibility {
  if (!me) return { score: 0, reasons: ['Complete your profile to see match reasons'] };

  let score = 0;
  const reasons: string[] = [];

  // Budget overlap — 30
  if (me.budget_min != null && me.budget_max != null && other.budget_min != null && other.budget_max != null) {
    const overlaps = Math.min(me.budget_max, other.budget_max) >= Math.max(me.budget_min, other.budget_min);
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
  if (me.city && other.preferred_city && me.city === other.preferred_city) {
    score += 20;
    reasons.push('Same city');
  } else if (me.city && other.preferred_areas.includes(me.city)) {
    score += 12;
    reasons.push('Overlapping areas');
  }

  // Move-in timing — 25
  if (me.move_in_from && other.move_in_from) {
    const days = Math.abs(
      (new Date(me.move_in_from).getTime() - new Date(other.move_in_from).getTime()) / 86_400_000,
    );
    if (days <= 31) {
      score += 25;
      reasons.push('Similar move-in period');
    } else if (days <= 62) {
      score += 12;
    }
  }

  // Lifestyle signal — 20 (we only have the other person's side, so this is a
  // small positive nudge for a well-described profile)
  if (other.lifestyle_tags.length >= 2 || other.sleep_schedule) {
    score += 12;
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
