import { buildCompatInput, estimateCompatibility, matchSubtitle } from '../compatibility';
import type { RoommateProfileCard } from '../types';

function makeOther(overrides: Partial<RoommateProfileCard> = {}): RoommateProfileCard {
  return {
    user_id: 'other-1',
    headline: null,
    about: null,
    age: 21,
    preferred_city: 'Nicosia',
    preferred_areas: ['Engomi'],
    budget_min: 300,
    budget_max: 500,
    move_in_from: '2026-09-01',
    smoking: 'no',
    sleep_schedule: 'early_bird',
    social_level: 'balanced',
    cleanliness: 4,
    lifestyle_tags: ['tidy', 'quiet'],
    student_audience: 'full_time',
    housing_status: 'needs_flat',
    profile: {
      id: 'other-1',
      first_name: 'Elena',
      last_name: null,
      display_name: null,
      avatar_url: null,
      study_level: 'undergraduate_y2',
      verification: 'verified',
    },
    university: { name: 'University of Nicosia', short_name: 'UNIC' },
    ...overrides,
  };
}

describe('buildCompatInput', () => {
  it('returns null when neither the profile nor roommate prefs have loaded', () => {
    expect(buildCompatInput(null, null)).toBeNull();
    expect(buildCompatInput(undefined, undefined)).toBeNull();
  });

  it('prefers the viewer\'s own roommate preferences over their student profile', () => {
    const input = buildCompatInput(
      { city: 'Limassol', budget_min: 200, budget_max: 400, move_in_from: '2026-08-01' },
      {
        preferred_city: 'Nicosia',
        preferred_areas: ['Engomi'],
        budget_min: 300,
        budget_max: 500,
        move_in_from: '2026-09-01',
        sleep_schedule: 'early_bird',
        social_level: 'balanced',
        cleanliness: 4,
        smoking: 'no',
      },
    );
    expect(input).toMatchObject({ city: 'Nicosia', budget_min: 300, budget_max: 500, hasPrefs: true });
  });

  it('falls back to the student profile when there are no roommate prefs yet', () => {
    const input = buildCompatInput(
      { city: 'Limassol', budget_min: 200, budget_max: 400, move_in_from: '2026-08-01' },
      null,
    );
    expect(input).toMatchObject({
      city: 'Limassol',
      budget_min: 200,
      budget_max: 400,
      hasPrefs: false,
      sleep_schedule: null,
    });
  });
});

describe('estimateCompatibility', () => {
  it('returns a pending placeholder when the input has not loaded yet', () => {
    const result = estimateCompatibility(null, makeOther());
    expect(result.pending).toBe(true);
    expect(result.score).toBe(0);
  });

  it('scores a strong match highly and explains why', () => {
    const input = buildCompatInput(null, {
      preferred_city: 'Nicosia',
      preferred_areas: ['Engomi'],
      budget_min: 300,
      budget_max: 500,
      move_in_from: '2026-09-05',
      sleep_schedule: 'early_bird',
      social_level: 'balanced',
      cleanliness: 4,
      smoking: 'no',
    });
    const result = estimateCompatibility(input, makeOther());
    expect(result.pending).toBeUndefined();
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.reasons).toEqual(
      expect.arrayContaining(['Similar budget', 'Same city', 'Overlapping areas', 'Similar move-in period']),
    );
  });

  it('scores a poor match lower than a strong one', () => {
    const input = buildCompatInput(null, {
      preferred_city: 'Limassol',
      preferred_areas: ['Mesa Geitonia'],
      budget_min: 800,
      budget_max: 1000,
      move_in_from: '2027-03-01',
      sleep_schedule: 'night_owl',
      social_level: 'very_social',
      cleanliness: 1,
      smoking: 'yes',
    });
    const strongInput = buildCompatInput(null, {
      preferred_city: 'Nicosia',
      preferred_areas: ['Engomi'],
      budget_min: 300,
      budget_max: 500,
      move_in_from: '2026-09-05',
      sleep_schedule: 'early_bird',
      social_level: 'balanced',
      cleanliness: 4,
      smoking: 'no',
    });
    const other = makeOther();
    const weak = estimateCompatibility(input, other);
    const strong = estimateCompatibility(strongInput, other);
    expect(weak.score).toBeLessThan(strong.score);
  });

  it('never exceeds a score of 100', () => {
    const input = buildCompatInput(null, {
      preferred_city: 'Nicosia',
      preferred_areas: ['Engomi'],
      budget_min: 300,
      budget_max: 500,
      move_in_from: '2026-09-01',
      sleep_schedule: 'early_bird',
      social_level: 'balanced',
      cleanliness: 4,
      smoking: 'no',
    });
    const result = estimateCompatibility(input, makeOther());
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('gives a small nudge for a well-described profile when the viewer has no prefs yet', () => {
    const input = buildCompatInput({ city: null, budget_min: null, budget_max: null, move_in_from: null }, null);
    const result = estimateCompatibility(input, makeOther());
    expect(result.reasons).toContain('Early riser');
  });

  it('always returns at least one reason', () => {
    const input = buildCompatInput(null, {
      preferred_city: 'Larnaca',
      preferred_areas: [],
      budget_min: null,
      budget_max: null,
      move_in_from: null,
      sleep_schedule: null,
      social_level: null,
      cleanliness: null,
      smoking: 'no_preference',
    });
    const other = makeOther({
      preferred_city: 'Paphos',
      preferred_areas: [],
      budget_min: null,
      budget_max: null,
      move_in_from: null,
      sleep_schedule: null,
      social_level: null,
      cleanliness: null,
      smoking: 'no_preference',
      lifestyle_tags: [],
    });
    const result = estimateCompatibility(input, other);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});

describe('matchSubtitle', () => {
  it('combines the study level with a lifestyle tag', () => {
    expect(matchSubtitle(makeOther(), 'Undergraduate')).toBe('Undergraduate · Tidy');
  });

  it('falls back to sleep schedule when there are no lifestyle tags', () => {
    expect(matchSubtitle(makeOther({ lifestyle_tags: [] }), 'Undergraduate')).toBe('Undergraduate · Early bird');
  });

  it('falls back to the city when nothing else is available', () => {
    expect(matchSubtitle(makeOther({ lifestyle_tags: [], sleep_schedule: null }))).toBe('Nicosia');
  });

  it('falls back to "Student" when there is nothing at all to show', () => {
    expect(
      matchSubtitle(makeOther({ lifestyle_tags: [], sleep_schedule: null, preferred_city: null })),
    ).toBe('Student');
  });
});
