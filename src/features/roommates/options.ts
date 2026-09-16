export const SLEEP_OPTS = [
  { value: 'early_bird', label: 'Early bird' },
  { value: 'night_owl', label: 'Night owl' },
  { value: 'flexible', label: 'Flexible' },
] as const;

export const SOCIAL_OPTS = [
  { value: 'homebody', label: 'Homebody' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'very_social', label: 'Very social' },
] as const;

export const TIDY_OPTS = [
  { value: '2', label: 'Relaxed' },
  { value: '3', label: 'In between' },
  { value: '4', label: 'Tidy' },
  { value: '5', label: 'Very tidy' },
] as const;

export const SMOKING_OPTS = [
  { value: 'no', label: 'Non-smoker' },
  { value: 'outside_only', label: 'Outside only' },
  { value: 'yes', label: 'Smoker' },
  { value: 'no_preference', label: 'No preference' },
] as const;

export const PETS_OPTS = [
  { value: 'no', label: 'No pets' },
  { value: 'yes', label: 'Have / want pets' },
  { value: 'no_preference', label: 'No preference' },
] as const;

export const GUESTS_OPTS = [
  { value: 'rarely', label: 'Rarely' },
  { value: 'sometimes', label: 'Sometimes' },
  { value: 'often', label: 'Often' },
] as const;

export const GENDER_PREF_OPTS = [
  { value: 'no_preference', label: 'No preference' },
  { value: 'same', label: 'Same gender' },
  { value: 'any', label: 'Any' },
] as const;

export const STUDENT_AUDIENCE_OPTS = [
  { value: 'erasmus', label: 'Erasmus' },
  { value: 'full_time', label: 'Full-time' },
  { value: 'both', label: 'Erasmus & Full-time' },
] as const;

export const HOUSING_STATUS_OPTS = [
  { value: 'has_flat', label: 'I have a flat' },
  { value: 'needs_flat', label: 'Looking for a flat' },
] as const;

export const LIFESTYLE_TAGS = [
  'non_smoker', 'clean', 'studious', 'quiet', 'sociable', 'pet_lover', 'cook',
  'vegetarian', 'vegan', 'gym', 'early_riser', 'gamer', 'music_lover',
] as const;

export const tagLabel = (t: string) =>
  ({
    non_smoker: 'Non-smoker',
    clean: 'Tidy',
    studious: 'Studious',
    quiet: 'Quiet',
    sociable: 'Sociable',
    pet_lover: 'Pet lover',
    cook: 'Loves cooking',
    early_riser: 'Early riser',
    music_lover: 'Music lover',
  })[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
