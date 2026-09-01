import type { ReactNode } from 'react';
import { Alert, Pressable, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Button, LoadingState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { toAppError } from '@/services/errors';
import { analytics } from '@/services/analytics';
import { messagingApi } from '@/features/messaging/api';
import { studyLevelLabels } from '@/config/labels';
import { useRoommateProfile, useSaveRoommate } from '@/features/roommates/hooks';
import type { RoommateProfileWithMatch } from '@/features/roommates/hooks';

const TAG_LABELS: Record<string, string> = {
  non_smoker: 'Non-smoker',
  clean: 'Tidy',
  studious: 'Studious',
  quiet: 'Quiet',
  sociable: 'Social',
  pet_lover: 'Pet friendly',
  cook: 'Loves cooking',
  early_riser: 'Early bird',
};
const prettyTag = (t: string) =>
  TAG_LABELS[t] ?? t.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

type Trait = { icon: ReactNode; label: string; value: string };

function livingTraits(theme: ReturnType<typeof useTheme>, p: RoommateProfileWithMatch): Trait[] {
  const c = theme.colors.primary;
  const out: Trait[] = [];

  if (p.sleep_schedule) {
    const map = { early_bird: 'Early bird', night_owl: 'Night owl', flexible: 'Flexible schedule' };
    out.push({
      icon: <Ionicons name={p.sleep_schedule === 'night_owl' ? 'moon-outline' : 'sunny-outline'} size={18} color={c} />,
      label: 'Routine',
      value: map[p.sleep_schedule],
    });
  }
  if (p.social_level) {
    const map = { homebody: 'Homebody', balanced: 'Balanced', very_social: 'Very social' };
    out.push({
      icon: <Ionicons name="people-outline" size={18} color={c} />,
      label: 'Social energy',
      value: map[p.social_level],
    });
  }
  if (p.cleanliness != null) {
    const value =
      p.cleanliness >= 5 ? 'Very tidy' : p.cleanliness >= 4 ? 'Tidy' : p.cleanliness >= 3 ? 'Fairly tidy' : 'Relaxed about mess';
    out.push({
      icon: <Ionicons name="sparkles-outline" size={18} color={c} />,
      label: 'Tidiness',
      value,
    });
  }
  {
    const map = {
      no: 'Non-smoker',
      outside_only: 'Smokes outside only',
      yes: 'Smoker',
      no_preference: 'No preference on smoking',
    };
    out.push({
      icon: <MaterialCommunityIcons name="smoking-off" size={18} color={c} />,
      label: 'Smoking',
      value: map[p.smoking],
    });
  }
  {
    const map = { yes: 'Has or wants pets', no: 'No pets', no_preference: 'Fine either way with pets' };
    out.push({
      icon: <Ionicons name="paw-outline" size={18} color={c} />,
      label: 'Pets',
      value: map[p.pets],
    });
  }
  if (p.guests_frequency) {
    const map = { rarely: 'Rarely has guests', sometimes: 'Guests now and then', often: 'Often has guests' };
    out.push({
      icon: <Ionicons name="wine-outline" size={18} color={c} />,
      label: 'Guests',
      value: map[p.guests_frequency],
    });
  }
  return out;
}

function budgetLabel(p: RoommateProfileWithMatch): string | null {
  if (p.budget_min != null && p.budget_max != null) return `€${p.budget_min}–${p.budget_max} / month`;
  if (p.budget_max != null) return `Up to €${p.budget_max} / month`;
  if (p.budget_min != null) return `From €${p.budget_min} / month`;
  return null;
}

function moveInLabel(p: RoommateProfileWithMatch): string | null {
  if (!p.move_in_from) return null;
  const from = format(new Date(p.move_in_from), 'MMMM yyyy');
  if (p.move_in_to) return `${from} – ${format(new Date(p.move_in_to), 'MMMM yyyy')}`;
  return `From ${from}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <Text variant="h3">{title}</Text>
      {children}
    </View>
  );
}

function RoundBtn({
  icon,
  onPress,
  tint,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tint?: string;
  label: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityLabel={label}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: theme.colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...theme.shadows.sm,
      }}
    >
      <Ionicons name={icon} size={20} color={tint ?? theme.colors.textPrimary} />
    </Pressable>
  );
}

export default function RoommateProfile() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useRoommateProfile(id);
  const save = useSaveRoommate(id);
  const p = query.data;

  const message = useMutation({
    mutationFn: () =>
      messagingApi.startConversation(id, { context: 'roommate', roommateProfileId: id }),
    onSuccess: (conversationId) => {
      analytics.track('roommate_contact_started', { profile_id: id });
      router.push(`/messages/${conversationId}`);
    },
    onError: (e) => Alert.alert('Could not start the chat', toAppError(e).message),
  });

  const first = p?.profile?.first_name ?? p?.profile?.display_name ?? 'Student';
  const initial = p?.profile?.last_name ? ` ${p.profile.last_name[0]}.` : '';
  const name = p?.age ? `${first}${initial}, ${p.age}` : `${first}${initial}`;
  const uni = p?.university?.short_name ?? p?.university?.name ?? null;
  const level = p?.profile?.study_level ? studyLevelLabels[p.profile.study_level] : null;
  const score = p?.compatibility.score ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Couldn't load this profile." onRetry={() => query.refetch()} />
      ) : !p ? (
        <ErrorState message="This roommate profile is no longer available." onRetry={() => router.back()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingBottom: theme.spacing['6xl'] + 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View>
              {p.profile?.avatar_url ? (
                <Image
                  source={{ uri: p.profile.avatar_url }}
                  style={{ width, height: width * 0.86, backgroundColor: theme.colors.primarySubtle }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View
                  style={{
                    width,
                    height: width * 0.9,
                    backgroundColor: theme.colors.primarySubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person" size={64} color={theme.colors.primary} />
                </View>
              )}

              <SafeAreaView
                edges={['top']}
                pointerEvents="box-none"
                style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: theme.layout.screenPadding,
                    paddingTop: theme.spacing.sm,
                  }}
                >
                  <RoundBtn icon="chevron-back" label="Go back" onPress={() => router.back()} />
                  <RoundBtn
                    icon={p.saved ? 'heart' : 'heart-outline'}
                    tint={p.saved ? theme.colors.danger : theme.colors.textPrimary}
                    label={p.saved ? 'Remove from saved' : 'Save profile'}
                    onPress={() => save.mutate(!p.saved)}
                  />
                </View>
              </SafeAreaView>

              {score > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    left: theme.spacing.lg,
                    bottom: theme.spacing['2xl'],
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    backgroundColor: theme.colors.success,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                  }}
                >
                  <Ionicons name="heart" size={12} color="#FFFFFF" />
                  <Text style={{ fontSize: 12.5, fontWeight: '700' }} color="#FFFFFF">
                    {score}% Match
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={{
                marginTop: -theme.spacing['2xl'],
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.radius['2xl'],
                borderTopRightRadius: theme.radius['2xl'],
                padding: theme.layout.screenPadding,
                gap: theme.spacing.xl,
              }}
            >
              <View style={{ gap: 4 }}>
                <Text variant="h1">{name}</Text>
                {(uni || level) && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Ionicons name="school-outline" size={14} color={theme.colors.textTertiary} />
                    <Text variant="bodySm" muted>
                      {[uni, level].filter(Boolean).join('  •  ')}
                    </Text>
                  </View>
                )}
                {p.headline ? (
                  <Text variant="body" style={{ marginTop: 6, color: theme.colors.textSecondary }}>
                    “{p.headline}”
                  </Text>
                ) : null}
              </View>

              {p.compatibility.reasons.length > 0 ? (
                <View
                  style={{
                    gap: theme.spacing.sm,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.lg,
                  }}
                >
                  <Text variant="label" color={theme.colors.primarySubtleInk}>
                    Why you might click
                  </Text>
                  {p.compatibility.reasons.map((r) => (
                    <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                      <Text variant="bodySm">{r}</Text>
                    </View>
                  ))}
                  <Text variant="caption" muted style={{ marginTop: 2 }}>
                    An estimate from your budget, area and move-in — not a guarantee.
                  </Text>
                </View>
              ) : null}

              {p.about ? (
                <Section title="About">
                  <Text variant="body" style={{ lineHeight: 22, color: theme.colors.textSecondary }}>
                    {p.about}
                  </Text>
                </Section>
              ) : null}

              <Section title="Living style">
                <View style={{ gap: theme.spacing.md }}>
                  {livingTraits(theme, p).map((t) => (
                    <View key={t.label} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
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
                        {t.icon}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text variant="caption" muted>
                          {t.label}
                        </Text>
                        <Text variant="bodySm">{t.value}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </Section>

              <Section title="Looking for">
                <View style={{ gap: theme.spacing.sm }}>
                  {budgetLabel(p) ? (
                    <Row icon="wallet-outline" text={budgetLabel(p)!} />
                  ) : null}
                  {moveInLabel(p) ? <Row icon="calendar-outline" text={moveInLabel(p)!} /> : null}
                  {p.gender_preference === 'same' ? (
                    <Row icon="people-circle-outline" text="Prefers same-gender flatmates" />
                  ) : null}
                  {p.preferred_areas.length ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginTop: 2 }}>
                      {p.preferred_areas.map((a) => (
                        <View
                          key={a}
                          style={{
                            backgroundColor: theme.colors.primarySubtle,
                            borderRadius: theme.radius.pill,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          }}
                        >
                          <Text variant="caption" color={theme.colors.primarySubtleInk}>
                            {a}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              </Section>

              {p.lifestyle_tags.length ? (
                <Section title="Good to know">
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    {p.lifestyle_tags.map((t) => (
                      <View
                        key={t}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          backgroundColor: theme.colors.surface,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radius.pill,
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                        }}
                      >
                        <Ionicons name="checkmark" size={13} color={theme.colors.primary} />
                        <Text variant="caption">{prettyTag(t)}</Text>
                      </View>
                    ))}
                  </View>
                </Section>
              ) : null}
            </View>
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
                title={`Message ${first}`}
                loading={message.isPending}
                onPress={() => message.mutate()}
                leftIcon={<Ionicons name="chatbubble-outline" size={16} color={theme.colors.onPrimary} />}
              />
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}

function Row({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Ionicons name={icon} size={16} color={theme.colors.textTertiary} />
      <Text variant="bodySm">{text}</Text>
    </View>
  );
}
