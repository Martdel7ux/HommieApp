import { Linking, Pressable, Share, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, LoadingState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { analytics } from '@/services/analytics';
import { jobTypeLabels } from '@/config/labels';
import { jobLocationLabel, payLabel } from '@/features/jobs/api';
import { useJob, useSavedJobs } from '@/features/jobs/hooks';
import type { JobDetail } from '@/features/jobs/types';

function Chip({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.primarySubtle,
        borderRadius: theme.radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Ionicons name={icon} size={14} color={theme.colors.primary} />
      <Text variant="bodySm" weight="600" color={theme.colors.primaryPressed}>
        {label}
      </Text>
    </View>
  );
}

function TrustChip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.successSubtle,
        borderRadius: theme.radius.pill,
        paddingHorizontal: 12,
        paddingVertical: 7,
      }}
    >
      <Ionicons name="school" size={14} color={theme.colors.success} />
      <Text variant="bodySm" weight="600" color={theme.colors.success}>
        {label}
      </Text>
    </View>
  );
}

function CheckList({ title, items }: { title: string; items: string[] }) {
  const theme = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="h3" style={{ fontSize: 18 }}>
        {title}
      </Text>
      <View style={{ gap: theme.spacing.md }}>
        {items.map((it, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color={theme.colors.primary}
              style={{ marginTop: 1 }}
            />
            <Text variant="body" muted style={{ flex: 1 }}>
              {it}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function applyMethod(job: JobDetail): { method: 'url' | 'email' | null; label: string } {
  if (job.apply_url) return { method: 'url', label: 'Apply Now via Site' };
  if (job.apply_email) return { method: 'email', label: 'Apply Now via Email' };
  return { method: null, label: 'Apply Now' };
}

function runApply(job: JobDetail) {
  if (job.apply_url) {
    const url = /^https?:\/\//i.test(job.apply_url) ? job.apply_url : `https://${job.apply_url}`;
    analytics.track('job_apply_started', { job_id: job.id, method: 'url' });
    Linking.openURL(url).catch(() => undefined);
    return;
  }
  if (job.apply_email) {
    analytics.track('job_apply_started', { job_id: job.id, method: 'email' });
    Linking.openURL(
      `mailto:${job.apply_email}?subject=${encodeURIComponent(`Application: ${job.title}`)}`,
    ).catch(() => undefined);
  }
}

export default function JobDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const job = useJob(id);
  const { savedIds, toggle } = useSavedJobs();
  const saved = savedIds.includes(id);
  const data = job.data;

  const onShare = () => {
    if (!data) return;
    Share.share({
      message: `${data.title} at ${data.company} — ${jobLocationLabel(data)}, ${payLabel(data)}. On Hommie.`,
    }).catch(() => undefined);
  };

  const apply = data ? applyMethod(data) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceAlt }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Job Details',
          headerTitleAlign: 'center',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.surfaceAlt },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
          headerRight: () =>
            data ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.lg }}>
                <Pressable
                  onPress={() => toggle(id, !saved)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={saved ? 'Remove from saved' : 'Save job'}
                >
                  <Ionicons
                    name={saved ? 'heart' : 'heart-outline'}
                    size={22}
                    color={saved ? theme.colors.danger : theme.colors.textPrimary}
                  />
                </Pressable>
                <Pressable onPress={onShare} hitSlop={8} accessibilityRole="button" accessibilityLabel="Share job">
                  <Ionicons name="share-social-outline" size={22} color={theme.colors.textPrimary} />
                </Pressable>
              </View>
            ) : null,
        }}
      />

      {job.isLoading ? (
        <LoadingState />
      ) : job.isError || !data ? (
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
            {/* identity */}
            <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: theme.radius.xl,
                  overflow: 'hidden',
                  backgroundColor: theme.colors.surfaceSunken,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {data.company_logo_url ? (
                  <Image
                    source={{ uri: data.company_logo_url }}
                    style={{ width: '76%', height: '76%' }}
                    contentFit="contain"
                  />
                ) : (
                  <Ionicons name="briefcase-outline" size={30} color={theme.colors.textTertiary} />
                )}
              </View>

              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text variant="h1" align="center" style={{ fontSize: 26 }}>
                  {data.title}
                </Text>
                <Text variant="bodyLg" muted align="center">
                  {data.company}
                </Text>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: theme.spacing.sm,
                }}
              >
                <Chip icon="location-outline" label={jobLocationLabel(data)} />
                <Chip icon="card-outline" label={payLabel(data)} />
                <Chip icon="time-outline" label={jobTypeLabels[data.job_type]} />
              </View>

              {data.verified || data.student_friendly ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: theme.spacing.sm,
                  }}
                >
                  {data.student_friendly ? <TrustChip label="Student Friendly" /> : null}
                  {data.verified ? <TrustChip label="Verified" /> : null}
                </View>
              ) : null}
            </View>

            <View style={{ height: 1, backgroundColor: theme.colors.border }} />

            {/* about */}
            {data.description ? (
              <View style={{ gap: theme.spacing.md }}>
                <Text variant="h3" style={{ fontSize: 18 }}>
                  About the Role
                </Text>
                {data.description.split(/\n\s*\n/).map((para, i) => (
                  <Text key={i} variant="body" muted>
                    {para.trim()}
                  </Text>
                ))}
              </View>
            ) : null}

            <CheckList title="Responsibilities" items={data.responsibilities} />
            <CheckList title="Requirements" items={data.requirements} />

            {/* contact */}
            <View
              style={{
                backgroundColor: theme.colors.surface,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: theme.radius.lg,
                padding: theme.spacing.lg,
                gap: theme.spacing.lg,
              }}
            >
              <Text variant="h3" style={{ fontSize: 17 }}>
                Contact Employer
              </Text>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: theme.colors.primarySubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons
                    name={data.apply_email ? 'mail-outline' : 'link-outline'}
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="caption" muted>
                    {data.apply_email ? 'Email address' : 'Application link'}
                  </Text>
                  <Text variant="bodySm" weight="600" numberOfLines={1}>
                    {data.apply_email ?? data.apply_url ?? '—'}
                  </Text>
                </View>
              </View>

              <View style={{ gap: theme.spacing.sm }}>
                <Button
                  title={data.apply_email ? 'Send Email' : 'Open Application'}
                  onPress={() => runApply(data)}
                  leftIcon={
                    <Ionicons
                      name={data.apply_email ? 'send' : 'open-outline'}
                      size={15}
                      color={theme.colors.onPrimary}
                    />
                  }
                />
                {data.contact_phone ? (
                  <Button
                    title="Call Office"
                    variant="secondary"
                    onPress={() =>
                      Linking.openURL(`tel:${data.contact_phone!.replace(/\s+/g, '')}`).catch(() => undefined)
                    }
                    leftIcon={
                      <Ionicons name="call-outline" size={15} color={theme.colors.primaryPressed} />
                    }
                  />
                ) : null}
              </View>
            </View>

            <Text variant="caption" muted align="center">
              Applying takes you to {data.apply_url ? "the employer's site" : 'your email app'}. Hommie does not
              process applications or payments.
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
            <View style={{ padding: theme.spacing.lg }}>
              <Button
                title={apply?.label ?? 'Apply Now'}
                onPress={() => runApply(data)}
                leftIcon={<Ionicons name="send" size={16} color={theme.colors.onPrimary} />}
              />
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}
