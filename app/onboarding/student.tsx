import { useMemo, useState } from 'react';
import { View, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Screen, Text, Button, TextField, Select, ChipGroup, Banner, LoadingState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/features/profile/api';
import { qk } from '@/lib/queryClient';
import { analytics } from '@/services/analytics';
import { toAppError } from '@/services/errors';
import { CYPRUS_CITIES } from '@/config/constants';
import {
  studentStatusLabels,
  studyLevelLabels,
  enumOptions,
} from '@/config/labels';

type Draft = {
  first_name: string;
  university_id: string | null;
  city: string | null;
  study_level: string | null;
  student_status: string | null;
  move_in_from: string;
  budget_min: string;
  budget_max: string;
  interests: string[];
};

const INTERESTS = [
  'football', 'basketball', 'running', 'gym', 'photography', 'music', 'gaming',
  'cooking', 'baking', 'coffee', 'art', 'cinema', 'travel', 'languages',
  'volunteering', 'startups', 'reading', 'yoga', 'hiking',
];

const STEPS = ['About you', 'Your studies', 'Your plans', 'Interests'] as const;

export default function StudentOnboarding() {
  const theme = useTheme();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: universities, isLoading } = useQuery({
    queryKey: qk.universities,
    queryFn: profileApi.getUniversities,
  });

  const [draft, setDraft] = useState<Draft>({
    first_name: profile?.first_name ?? '',
    university_id: null,
    city: null,
    study_level: null,
    student_status: null,
    move_in_from: '',
    budget_min: '',
    budget_max: '',
    interests: [],
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const uniOptions = useMemo(
    () => (universities ?? []).map((u) => ({ value: u.id, label: u.name, sublabel: `${u.city}${u.campus_area ? ` · ${u.campus_area}` : ''}` })),
    [universities],
  );

  const canAdvance = useMemo(() => {
    if (step === 0) return draft.first_name.trim().length > 0 && !!draft.city;
    if (step === 1) return !!draft.university_id && !!draft.study_level;
    if (step === 2) return !!draft.student_status;
    return true;
  }, [step, draft]);

  const dateValid = /^\d{4}-\d{2}-\d{2}$/.test(draft.move_in_from) || draft.move_in_from === '';

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await profileApi.updateProfile(user.id, {
        first_name: draft.first_name.trim(),
        university_id: draft.university_id,
        city: draft.city,
        study_level: draft.study_level as never,
        student_status: draft.student_status as never,
        move_in_from: draft.move_in_from || null,
        budget_min: draft.budget_min ? Number(draft.budget_min) : null,
        budget_max: draft.budget_max ? Number(draft.budget_max) : null,
        interests: draft.interests,
        onboarding_completed: true,
      });
      analytics.track('onboarding_completed', { role: 'student' });
      await refreshProfile();
      // AuthGate routes into the student app.
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      analytics.track('onboarding_step_viewed', { role: 'student', step: STEPS[nextStep], index: nextStep });
    } else {
      finish();
    }
  };

  if (isLoading) return <Screen><LoadingState label="Getting things ready…" /></Screen>;

  return (
    <Screen keyboardAvoiding>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
        {/* progress */}
        <View style={{ flexDirection: 'row', gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= step ? theme.colors.primary : theme.colors.surfaceSunken,
              }}
            />
          ))}
        </View>

        <View style={{ gap: 4 }}>
          <Text variant="caption" muted>
            Step {step + 1} of {STEPS.length}
          </Text>
          <Text variant="h1">{STEPS[step]}</Text>
        </View>

        {error ? <Banner tone="danger" message={error} /> : null}

        <ScrollView contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }} showsVerticalScrollIndicator={false}>
          {step === 0 && (
            <>
              <TextField
                label="First name"
                value={draft.first_name}
                onChangeText={(v) => set('first_name', v)}
                autoCapitalize="words"
              />
              <Select
                label="Campus / city"
                options={CYPRUS_CITIES.map((c) => ({ value: c, label: c }))}
                value={draft.city}
                onChange={(v) => set('city', v)}
              />
              <Text variant="caption" muted>
                You can add a profile photo later from your profile.
              </Text>
            </>
          )}

          {step === 1 && (
            <>
              <Select label="University" options={uniOptions} value={draft.university_id} onChange={(v) => set('university_id', v)} />
              <Select
                label="Study level / year"
                options={enumOptions(studyLevelLabels)}
                value={draft.study_level}
                onChange={(v) => set('study_level', v)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="label" color={theme.colors.textSecondary}>
                  Current status
                </Text>
                <ChipGroup
                  options={enumOptions(studentStatusLabels)}
                  value={draft.student_status}
                  onChange={(v) => set('student_status', v as string)}
                />
              </View>
              <TextField
                label="Move-in period (optional)"
                placeholder="YYYY-MM-DD"
                value={draft.move_in_from}
                onChangeText={(v) => set('move_in_from', v)}
                error={dateValid ? undefined : 'Use the format YYYY-MM-DD'}
              />
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <TextField
                  containerStyle={{ flex: 1 }}
                  label="Budget min (€)"
                  keyboardType="number-pad"
                  value={draft.budget_min}
                  onChangeText={(v) => set('budget_min', v.replace(/[^0-9]/g, ''))}
                />
                <TextField
                  containerStyle={{ flex: 1 }}
                  label="Budget max (€)"
                  keyboardType="number-pad"
                  value={draft.budget_max}
                  onChangeText={(v) => set('budget_max', v.replace(/[^0-9]/g, ''))}
                />
              </View>
            </>
          )}

          {step === 3 && (
            <View style={{ gap: theme.spacing.sm }}>
              <Text muted>Pick a few things you&apos;re into — this helps with roommate suggestions.</Text>
              <ChipGroup
                multiple
                options={INTERESTS.map((i) => ({ value: i, label: i[0].toUpperCase() + i.slice(1) }))}
                value={draft.interests}
                onChange={(v) => set('interests', v as string[])}
              />
            </View>
          )}
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          {step > 0 ? (
            <Button title="Back" variant="ghost" fullWidth={false} onPress={() => setStep((s) => s - 1)} />
          ) : null}
          <Button
            title={step === STEPS.length - 1 ? 'Finish' : 'Continue'}
            style={{ flex: 1 }}
            loading={saving}
            disabled={!canAdvance || !dateValid}
            onPress={next}
          />
        </View>
      </View>
    </Screen>
  );
}
