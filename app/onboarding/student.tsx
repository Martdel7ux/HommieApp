import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, TextField, DateField, Select, ChipGroup, Banner, LoadingState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/features/profile/api';
import { roommatesApi } from '@/features/roommates/api';
import { qk } from '@/lib/queryClient';
import { STORAGE_BUCKETS } from '@/lib/supabase';
import { uploadImage } from '@/lib/upload';
import { analytics } from '@/services/analytics';
import { toAppError } from '@/services/errors';
import { CYPRUS_CITIES, STUDENT_INTERESTS } from '@/config/constants';
import { studentStatusLabels, studyLevelLabels, enumOptions } from '@/config/labels';
import type { StudentStatus, StudyLevel } from '@/types/database';

type Sleep = 'early_bird' | 'night_owl' | 'flexible';
type Social = 'homebody' | 'balanced' | 'very_social';
type Smoking = 'no' | 'outside_only' | 'yes' | 'no_preference';
type Pets = 'yes' | 'no' | 'no_preference';

type Draft = {
  first_name: string;
  age: string;
  photo: { uri: string; mimeType?: string | null } | null;
  university_id: string | null;
  city: string | null;
  study_level: StudyLevel | null;
  student_status: StudentStatus | null;
  move_in_from: string;
  budget_min: string;
  budget_max: string;
  sleep_schedule: Sleep | null;
  social_level: Social | null;
  cleanliness: number | null;
  smoking: Smoking | null;
  pets: Pets | null;
  interests: string[];
};

const SLEEP_OPTS = [
  { value: 'early_bird', label: 'Early bird' },
  { value: 'night_owl', label: 'Night owl' },
  { value: 'flexible', label: 'Flexible' },
];
const SOCIAL_OPTS = [
  { value: 'homebody', label: 'Homebody' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'very_social', label: 'Very social' },
];
const TIDY_OPTS = [
  { value: '2', label: 'Relaxed' },
  { value: '3', label: 'In between' },
  { value: '4', label: 'Tidy' },
  { value: '5', label: 'Very tidy' },
];
const SMOKING_OPTS = [
  { value: 'no', label: 'Non-smoker' },
  { value: 'outside_only', label: 'Outside only' },
  { value: 'yes', label: 'Smoker' },
  { value: 'no_preference', label: 'No preference' },
];
const PETS_OPTS = [
  { value: 'no', label: 'No pets' },
  { value: 'yes', label: 'Have / want pets' },
  { value: 'no_preference', label: 'No preference' },
];

const STEPS = ['About you', 'Your studies', 'Your plans', 'Lifestyle', 'Interests'] as const;

function Field({ label, children }: { label: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="label" color={theme.colors.textSecondary}>
        {label}
      </Text>
      {children}
    </View>
  );
}

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
    age: '',
    photo: null,
    university_id: null,
    city: null,
    study_level: null,
    student_status: null,
    move_in_from: '',
    budget_min: '',
    budget_max: '',
    sleep_schedule: null,
    social_level: null,
    cleanliness: null,
    smoking: null,
    pets: null,
    interests: [],
  });

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const uniOptions = useMemo(
    () =>
      (universities ?? []).map((u) => ({
        value: u.id,
        label: u.name,
        sublabel: `${u.city}${u.campus_area ? ` · ${u.campus_area}` : ''}`,
      })),
    [universities],
  );

  const ageNum = draft.age ? Number(draft.age) : null;
  const ageValid = ageNum == null || (ageNum >= 16 && ageNum <= 99);

  const canAdvance = useMemo(() => {
    if (step === 0) return draft.first_name.trim().length > 0 && ageValid;
    if (step === 1) return !!draft.university_id && !!draft.study_level && !!draft.city;
    if (step === 2) return !!draft.student_status;
    return true;
  }, [step, draft, ageValid]);

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission needed', 'Enable photo access in Settings to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    set('photo', { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType });
  };

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      let avatarPath: string | undefined;
      if (draft.photo) {
        avatarPath = await uploadImage(STORAGE_BUCKETS.avatars, user.id, draft.photo.uri, {
          contentType: draft.photo.mimeType ?? 'image/jpeg',
        });
      }

      await profileApi.updateProfile(user.id, {
        first_name: draft.first_name.trim(),
        university_id: draft.university_id,
        city: draft.city,
        study_level: draft.study_level,
        student_status: draft.student_status,
        move_in_from: draft.move_in_from || null,
        budget_min: draft.budget_min ? Number(draft.budget_min) : null,
        budget_max: draft.budget_max ? Number(draft.budget_max) : null,
        interests: draft.interests,
        ...(avatarPath ? { avatar_url: avatarPath } : {}),
        onboarding_completed: true,
      });

      const hasLifestyle =
        !!draft.sleep_schedule ||
        !!draft.social_level ||
        draft.cleanliness != null ||
        !!draft.smoking ||
        !!draft.pets ||
        ageNum != null;
      if (hasLifestyle) {
        await roommatesApi.upsertPreferences(user.id, {
          age: ageNum,
          preferred_city: draft.city,
          university_id: draft.university_id,
          budget_min: draft.budget_min ? Number(draft.budget_min) : null,
          budget_max: draft.budget_max ? Number(draft.budget_max) : null,
          move_in_from: draft.move_in_from || null,
          sleep_schedule: draft.sleep_schedule,
          social_level: draft.social_level,
          cleanliness: draft.cleanliness,
          smoking: draft.smoking ?? 'no_preference',
          pets: draft.pets ?? 'no_preference',
          is_published: false,
        });
      }

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

  if (isLoading) {
    return (
      <Screen>
        <LoadingState label="Getting things ready…" />
      </Screen>
    );
  }

  return (
    <Screen keyboardAvoiding>
      <View style={{ flex: 1, gap: theme.spacing.lg }}>
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

        <ScrollView
          contentContainerStyle={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.xl }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 && (
            <>
              <View style={{ alignItems: 'center', gap: theme.spacing.sm }}>
                <Pressable onPress={pickPhoto} accessibilityLabel="Add a profile photo">
                  {draft.photo ? (
                    <Image
                      source={{ uri: draft.photo.uri }}
                      style={{ width: 96, height: 96, borderRadius: 48 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View
                      style={{
                        width: 96,
                        height: 96,
                        borderRadius: 48,
                        backgroundColor: theme.colors.primarySubtle,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="camera-outline" size={30} color={theme.colors.primary} />
                    </View>
                  )}
                  <View
                    style={{
                      position: 'absolute',
                      right: -2,
                      bottom: -2,
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: theme.colors.primary,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 3,
                      borderColor: theme.colors.background,
                    }}
                  >
                    <Ionicons name={draft.photo ? 'pencil' : 'add'} size={15} color={theme.colors.onPrimary} />
                  </View>
                </Pressable>
                <Text variant="caption" muted>
                  {draft.photo ? 'Looking good' : 'Add a photo (optional)'}
                </Text>
              </View>

              <TextField
                label="First name"
                value={draft.first_name}
                onChangeText={(v) => set('first_name', v)}
                autoCapitalize="words"
              />
              <TextField
                label="Age (optional)"
                keyboardType="number-pad"
                value={draft.age}
                onChangeText={(v) => set('age', v.replace(/[^0-9]/g, '').slice(0, 2))}
                error={ageValid ? undefined : 'Enter an age between 16 and 99'}
              />
            </>
          )}

          {step === 1 && (
            <>
              <Select
                label="University"
                options={uniOptions}
                value={draft.university_id}
                onChange={(v) => set('university_id', v)}
              />
              <Select
                label="Study level / year"
                options={enumOptions(studyLevelLabels)}
                value={draft.study_level}
                onChange={(v) => set('study_level', v as StudyLevel)}
              />
              <Select
                label="Campus / city"
                options={CYPRUS_CITIES.map((c) => ({ value: c, label: c }))}
                value={draft.city}
                onChange={(v) => set('city', v)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <Field label="Current status">
                <ChipGroup
                  options={enumOptions(studentStatusLabels)}
                  value={draft.student_status}
                  onChange={(v) => set('student_status', v as StudentStatus)}
                />
              </Field>
              <DateField
                label="Move-in date (optional)"
                placeholder="Select date"
                value={draft.move_in_from}
                onChange={(v) => set('move_in_from', v)}
                minimumDate={new Date()}
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
            <>
              <Text muted>
                This stays private until you publish a roommate profile. It just makes your matches better.
              </Text>
              <Field label="Daily routine">
                <ChipGroup
                  options={SLEEP_OPTS}
                  value={draft.sleep_schedule}
                  onChange={(v) => set('sleep_schedule', v as Sleep)}
                />
              </Field>
              <Field label="Social energy">
                <ChipGroup
                  options={SOCIAL_OPTS}
                  value={draft.social_level}
                  onChange={(v) => set('social_level', v as Social)}
                />
              </Field>
              <Field label="Tidiness">
                <ChipGroup
                  options={TIDY_OPTS}
                  value={draft.cleanliness != null ? String(draft.cleanliness) : null}
                  onChange={(v) => set('cleanliness', v ? Number(v) : null)}
                />
              </Field>
              <Field label="Smoking">
                <ChipGroup
                  options={SMOKING_OPTS}
                  value={draft.smoking}
                  onChange={(v) => set('smoking', v as Smoking)}
                />
              </Field>
              <Field label="Pets">
                <ChipGroup options={PETS_OPTS} value={draft.pets} onChange={(v) => set('pets', v as Pets)} />
              </Field>
            </>
          )}

          {step === 4 && (
            <View style={{ gap: theme.spacing.sm }}>
              <Text muted>Pick a few things you&apos;re into. This helps with roommate and event suggestions.</Text>
              <ChipGroup
                multiple
                options={STUDENT_INTERESTS.map((i) => ({ value: i, label: i[0].toUpperCase() + i.slice(1) }))}
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
            disabled={!canAdvance}
            onPress={next}
          />
        </View>
      </View>
    </Screen>
  );
}
