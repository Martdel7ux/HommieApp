import { Linking, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, LoadingState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { analytics } from '@/services/analytics';
import { jobTypeLabels, jobWorkModeLabels } from '@/config/labels';
import { jobLocationLabel, payLabel } from '@/features/jobs/api';
import { useJob, useSavedJobs } from '@/features/jobs/hooks';
import type { JobDetail } from '@/features/jobs/types';

function MetaRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.primarySubtle,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={17} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="caption" muted>
          {label}
        </Text>
        <Text variant="bodySm" weight="600">
          {value}
        </Text>
      </View>
    </View>
  );
}

function Bullets({ title, items }: { title: string; items: string[] }) {
  const theme = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <Text variant="h3" style={{ fontSize: 16 }}>
        {title}
      </Text>
      {items.map((it, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Ionicons name="ellipse" size={6} color={theme.colors.primary} style={{ marginTop: 7 }} />
          <Text variant="body" muted style={{ flex: 1 }}>
            {it}
          </Text>
        </View>
      ))}
    </View>
  );
}

function applyToJob(job: JobDetail) {
  if (job.apply_url) {
    const url = /^https?:\/\//i.test(job.apply_url) ? job.apply_url : `https://${job.apply_url}`;
    analytics.track('job_apply_started', { job_id: job.id, method: 'url' });
    Linking.openURL(url).catch(() => undefined);
    return;
  }
  if (job.apply_email) {
    const subject = encodeURIComponent(`Application: ${job.title}`);
    analytics.track('job_apply_started', { job_id: job.id, method: 'email' });
    Linking.openURL(`mailto:${job.apply_email}?subject=${subject}`).catch(() => undefined);
  }
}

export default function JobDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  const { savedIds, toggle } = useSavedJobs();
  const saved = savedIds.includes(id);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Job',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />

      {job.isLoading ? (
        <LoadingState />
      ) : job.isError || !job.data ? (
        <ErrorState message="Couldn't load this job." onRetry={() => job.refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              padding: theme.layout.screenPadding,
              paddingBottom: theme.spacing['3xl'],
              gap: theme.spacing.xl,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  overflow: 'hidden',
                  backgroundColor: theme.colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {job.data.company_logo_url ? (
                  <Image
                    source={{ uri: job.data.company_logo_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                ) : (
                  <Ionicons name="briefcase-outline" size={22} color={theme.colors.primary} />
                )}
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text variant="h1" style={{ fontSize: 22 }}>
                  {job.data.title}
                </Text>
                <Text variant="body" muted>
                  {job.data.company}
                </Text>
              </View>
            </View>

            {job.data.verified || job.data.student_friendly ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {job.data.verified ? (
                  <Badge label="Verified employer" />
                ) : null}
                {job.data.student_friendly ? <Badge label="Student friendly" /> : null}
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.lg }}>
              <MetaRow
                icon="briefcase-outline"
                label="Type"
                value={`${jobTypeLabels[job.data.job_type]} · ${jobWorkModeLabels[job.data.work_mode]}`}
              />
              <MetaRow icon="location-outline" label="Location" value={jobLocationLabel(job.data)} />
              <MetaRow icon="card-outline" label="Pay" value={payLabel(job.data)} />
            </View>

            {job.data.description ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="h3" style={{ fontSize: 16 }}>
                  About the role
                </Text>
                <Text variant="body" muted>
                  {job.data.description}
                </Text>
              </View>
            ) : null}

            <Bullets title="What you'll do" items={job.data.responsibilities} />
            <Bullets title="What we're looking for" items={job.data.requirements} />

            <Text variant="caption" muted>
              Applying takes you to {job.data.apply_url ? "the employer's site" : 'your email app'}. Hommie
              does not process applications or payments.
            </Text>
          </ScrollView>

          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <View style={{ flexDirection: 'row', gap: theme.spacing.md, padding: theme.spacing.lg }}>
              <Button
                title={saved ? 'Saved' : 'Save'}
                variant="secondary"
                fullWidth={false}
                onPress={() => toggle(id, !saved)}
                leftIcon={
                  <Ionicons
                    name={saved ? 'heart' : 'heart-outline'}
                    size={16}
                    color={theme.colors.primaryPressed}
                  />
                }
              />
              <View style={{ flex: 1 }}>
                <Button title="Apply Now" onPress={() => applyToJob(job.data)} />
              </View>
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}

function Badge({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: theme.colors.successSubtle,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
      }}
    >
      <Ionicons name="checkmark-circle" size={13} color={theme.colors.success} />
      <Text variant="bodySm" color={theme.colors.success} weight="600">
        {label}
      </Text>
    </View>
  );
}
