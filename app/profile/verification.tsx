import { useState } from 'react';
import { View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, Text, Button, Select, ChipGroup, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { profileApi } from '@/features/profile/api';
import { qk } from '@/lib/queryClient';
import { toAppError } from '@/services/errors';
import { studentStatusLabels, studyLevelLabels, enumOptions } from '@/config/labels';
import type { StudentStatus, StudyLevel } from '@/types/database';

export default function UniversityVerification() {
  const theme = useTheme();
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  const [universityId, setUniversityId] = useState<string | null>(profile?.university_id ?? null);
  const [studyLevel, setStudyLevel] = useState<StudyLevel | null>(profile?.study_level ?? null);
  const [status, setStatus] = useState<StudentStatus | null>(profile?.student_status ?? null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: universities } = useQuery({
    queryKey: qk.universities,
    queryFn: profileApi.getUniversities,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const dirty =
    universityId !== (profile?.university_id ?? null) ||
    studyLevel !== (profile?.study_level ?? null) ||
    status !== (profile?.student_status ?? null);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await profileApi.updateProfile(user.id, {
        university_id: universityId,
        study_level: studyLevel,
        student_status: status,
      });
      await refreshProfile();
      router.back();
    } catch (e) {
      setError(toAppError(e).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll keyboardAvoiding>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'University Verification',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <View style={{ gap: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        {error ? <Banner tone="danger" message={error} /> : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.md,
            backgroundColor: theme.colors.successSubtle,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.lg,
          }}
        >
          <MaterialCommunityIcons name="check-decagram" size={24} color={theme.colors.success} />
          <View style={{ flex: 1 }}>
            <Text variant="h3" style={{ fontSize: 15 }}>
              Verified student
            </Text>
            <Text variant="caption" muted>
              Your account was verified with your student email. Keep your details up to date below.
            </Text>
          </View>
        </View>

        <Select
          label="University"
          options={(universities ?? []).map((u) => ({ value: u.id, label: u.name, sublabel: u.city }))}
          value={universityId}
          onChange={setUniversityId}
        />
        <Select
          label="Study level / year"
          options={enumOptions(studyLevelLabels)}
          value={studyLevel}
          onChange={(v) => setStudyLevel(v as StudyLevel)}
        />
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Current status
          </Text>
          <ChipGroup
            options={enumOptions(studentStatusLabels)}
            value={status}
            onChange={(v) => setStatus(v as StudentStatus)}
          />
        </View>

        <Button title="Save" loading={saving} disabled={!dirty} onPress={save} />
      </View>
    </Screen>
  );
}
