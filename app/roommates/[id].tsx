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
import { useAuth } from '@/features/auth/AuthProvider';
import { toAppError } from '@/services/errors';
import { analytics } from '@/services/analytics';
import { supabase } from '@/lib/supabase';
import { messagingApi } from '@/features/messaging/api';
import { studyLevelLabels } from '@/config/labels';
import { useRoommateProfile, useSaveRoommate } from '@/features/roommates/hooks';
import type { RoommateProfileWithMatch } from '@/features/roommates/hooks';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type IonName = keyof typeof Ionicons.glyphMap;
type Trait = { lib: 'ion' | 'mci'; icon: string; label: string };

const TAG: Record<string, { label: string; icon: IonName }> = {
  studious: { label: 'Quiet Study', icon: 'book-outline' },
  quiet: { label: 'Quiet', icon: 'volume-mute-outline' },
  cook: { label: 'Loves Cooking', icon: 'restaurant-outline' },
  sociable: { label: 'Social', icon: 'people-outline' },
  pet_lover: { label: 'Pet Friendly', icon: 'paw-outline' },
  clean: { label: 'Tidy', icon: 'sparkles-outline' },
  non_smoker: { label: 'Non-smoker', icon: 'ban-outline' },
  vegan: { label: 'Vegan', icon: 'leaf-outline' },
  vegetarian: { label: 'Vegetarian', icon: 'leaf-outline' },
};

function traitChips(p: RoommateProfileWithMatch): Trait[] {
  const out: Trait[] = [];
  const ion = (icon: IonName, label: string): Trait => ({ lib: 'ion', icon, label });

  if (p.sleep_schedule === 'early_bird') out.push(ion('sunny-outline', 'Early Bird'));
  else if (p.sleep_schedule === 'night_owl') out.push(ion('moon-outline', 'Night Owl'));
  else if (p.sleep_schedule === 'flexible') out.push(ion('time-outline', 'Flexible Hours'));

  if (p.smoking === 'no') out.push({ lib: 'mci', icon: 'smoking-off', label: 'Non-smoker' });

  if (p.social_level === 'homebody') out.push(ion('home-outline', 'Homebody'));
  else if (p.social_level === 'very_social') out.push(ion('people-outline', 'Very Social'));

  if (p.cleanliness != null && p.cleanliness >= 4) out.push(ion('sparkles-outline', 'Tidy'));
  if (p.pets === 'yes') out.push(ion('paw-outline', 'Pet Friendly'));

  // lifestyle tags already reflected by a structured field above
  const covered = new Set<string>();
  if (p.smoking === 'no') covered.add('non_smoker');
  if (p.social_level) covered.add('sociable');
  if (p.cleanliness != null && p.cleanliness >= 4) covered.add('clean');
  if (p.pets === 'yes') covered.add('pet_lover');

  for (const t of p.lifestyle_tags) {
    if (covered.has(t)) continue;
    const info = TAG[t];
    const label = info?.label ?? cap(t.replace(/_/g, ' '));
    if (!out.some((c) => c.label === label)) out.push(ion(info?.icon ?? 'checkmark-circle-outline', label));
  }
  return out.slice(0, 6);
}

function TraitIcon({ trait, color }: { trait: Trait; color: string }) {
  return trait.lib === 'mci' ? (
    <MaterialCommunityIcons name={trait.icon as never} size={13} color={color} />
  ) : (
    <Ionicons name={trait.icon as IonName} size={13} color={color} />
  );
}

function Card({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View
      style={{
        marginHorizontal: theme.layout.screenPadding,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius['2xl'],
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        ...theme.shadows.sm,
      }}
    >
      {children}
    </View>
  );
}

function CardHeading({ icon, title }: { icon: keyof typeof Ionicons.glyphMap; title: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Ionicons name={icon} size={17} color={theme.colors.primary} />
      <Text variant="h3">{title}</Text>
    </View>
  );
}

function PrefRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <Ionicons name={icon} size={15} color={theme.colors.textTertiary} />
      <Text variant="bodySm" color={theme.colors.textSecondary}>
        {label}
      </Text>
    </View>
  );
}

export default function RoommateProfile() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const query = useRoommateProfile(id);
  const save = useSaveRoommate(id);
  const p = query.data;

  const message = useMutation({
    mutationFn: () => messagingApi.startConversation(id, { context: 'roommate', roommateProfileId: id }),
    onSuccess: (conversationId) => {
      analytics.track('roommate_contact_started', { profile_id: id });
      router.push(`/messages/${conversationId}`);
    },
    onError: (e) => Alert.alert('Could not start the chat', toAppError(e).message),
  });

  const first = p?.profile?.first_name ?? p?.profile?.display_name ?? 'Student';
  const last = p?.profile?.last_name ? ` ${p.profile.last_name}` : '';
  const name = p?.age ? `${first}${last}, ${p.age}` : `${first}${last}`;
  const uni = p?.university?.name ?? p?.university?.short_name ?? null;
  const level = p?.profile?.study_level ? studyLevelLabels[p.profile.study_level] : null;
  const interests = p?.profile?.interests ?? [];

  const openMenu = () => {
    Alert.alert('Profile options', undefined, [
      {
        text: 'Report profile',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Report profile', 'Why are you reporting this?', [
            ...(['inappropriate', 'harassment', 'spam', 'other'] as const).map((reason) => ({
              text: cap(reason),
              onPress: async () => {
                await supabase.from('reports').insert({
                  reporter_id: user!.id,
                  subject_type: 'roommate_profile' as never,
                  subject_id: id,
                  reason: reason as never,
                });
                Alert.alert('Thanks', 'Our team will take a look.');
              },
            })),
            { text: 'Cancel', style: 'cancel' as const },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const budget =
    p?.budget_min != null && p?.budget_max != null
      ? `€${p.budget_min}–${p.budget_max}`
      : p?.budget_max != null
        ? `Up to €${p.budget_max}`
        : p?.budget_min != null
          ? `From €${p.budget_min}`
          : null;
  const location = p?.preferred_areas[0] ?? p?.preferred_city ?? null;
  const moveIn = p?.move_in_from ? format(new Date(p.move_in_from), 'MMMM yyyy') : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.background }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: theme.layout.screenPadding,
            height: 48,
          }}
        >
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back" style={{ width: 40 }}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.primary} />
          </Pressable>
          <Text variant="h3" color={theme.colors.primary} style={{ fontWeight: '700' }}>
            Hommie
          </Text>
          <Pressable
            onPress={openMenu}
            hitSlop={10}
            accessibilityLabel="Profile options"
            style={{ width: 40, alignItems: 'flex-end' }}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      </SafeAreaView>

      {query.isLoading ? (
        <LoadingState />
      ) : query.isError ? (
        <ErrorState message="Couldn't load this profile." onRetry={() => query.refetch()} />
      ) : !p ? (
        <ErrorState message="This roommate profile is no longer available." onRetry={() => router.back()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingBottom: theme.spacing['6xl'] + 24, gap: theme.spacing.lg }}
            showsVerticalScrollIndicator={false}
          >
            <View>
              {p.profile?.avatar_url ? (
                <Image
                  source={{ uri: p.profile.avatar_url }}
                  style={{ width, height: width * 0.8, backgroundColor: theme.colors.primarySubtle }}
                  contentFit="cover"
                  transition={150}
                />
              ) : (
                <View
                  style={{
                    width,
                    height: width * 0.82,
                    backgroundColor: theme.colors.primarySubtle,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="person" size={64} color={theme.colors.primary} />
                </View>
              )}

              <View
                style={{
                  position: 'absolute',
                  top: theme.spacing.md,
                  left: theme.spacing.lg,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  backgroundColor: theme.colors.surface,
                  borderRadius: theme.radius.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  ...theme.shadows.sm,
                }}
              >
                <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                <Text variant="caption" style={{ fontWeight: '700' }}>
                  Verified Student
                </Text>
              </View>
            </View>

            {/* Identity + about */}
            <View style={{ marginTop: -theme.spacing['3xl'] }}>
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text variant="h2">{name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="school-outline" size={14} color={theme.colors.textTertiary} />
                      <Text variant="bodySm" muted numberOfLines={1} style={{ flex: 1 }}>
                        {uni ?? level ?? 'Student'}
                      </Text>
                    </View>
                  </View>
                  {p.compatibility.score > 0 ? (
                    <View
                      style={{
                        alignItems: 'center',
                        backgroundColor: theme.colors.primarySubtle,
                        borderRadius: theme.radius.lg,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        minWidth: 62,
                      }}
                    >
                      <Text style={{ fontSize: 16, fontWeight: '800' }} color={theme.colors.primarySubtleInk}>
                        {p.compatibility.score}%
                      </Text>
                      <Text variant="caption" color={theme.colors.primarySubtleInk} style={{ fontWeight: '600' }}>
                        Match
                      </Text>
                    </View>
                  ) : null}
                </View>

                {traitChips(p).length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    {traitChips(p).map((t) => (
                      <View
                        key={t.label}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 5,
                          borderWidth: 1,
                          borderColor: theme.colors.border,
                          borderRadius: theme.radius.pill,
                          paddingHorizontal: 11,
                          paddingVertical: 7,
                        }}
                      >
                        <TraitIcon trait={t} color={theme.colors.textSecondary} />
                        <Text variant="caption" color={theme.colors.textSecondary}>
                          {t.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {p.about || p.headline ? (
                  <>
                    <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 2 }} />
                    <View style={{ gap: 6 }}>
                      <Text variant="h3">About me</Text>
                      <Text variant="bodySm" style={{ lineHeight: 21, color: theme.colors.textSecondary }}>
                        {p.about ?? p.headline}
                      </Text>
                    </View>
                  </>
                ) : null}
              </Card>
            </View>

            {interests.length ? (
              <Card>
                <CardHeading icon="color-palette-outline" title="Interests" />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  {interests.map((it) => (
                    <View
                      key={it}
                      style={{
                        backgroundColor: theme.colors.primarySubtle,
                        borderRadius: theme.radius.pill,
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                      }}
                    >
                      <Text variant="caption" color={theme.colors.primarySubtleInk}>
                        {cap(it)}
                      </Text>
                    </View>
                  ))}
                </View>
              </Card>
            ) : null}

            {budget || location || moveIn ? (
              <Card>
                <CardHeading icon="options-outline" title="Preferences" />
                <View style={{ gap: theme.spacing.sm }}>
                  {budget ? <PrefRow icon="wallet-outline" label={`Budget: ${budget}`} /> : null}
                  {location ? <PrefRow icon="location-outline" label={`Location: ${location}`} /> : null}
                  {moveIn ? <PrefRow icon="calendar-outline" label={`Move-in: ${moveIn}`} /> : null}
                </View>
              </Card>
            ) : null}
          </ScrollView>

          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.md,
                padding: theme.spacing.lg,
              }}
            >
              <View style={{ flex: 1 }}>
                <Button
                  title="Send Message"
                  loading={message.isPending}
                  onPress={() => message.mutate()}
                  leftIcon={<Ionicons name="chatbubble-outline" size={16} color={theme.colors.onPrimary} />}
                />
              </View>
              <Pressable
                onPress={() => save.mutate(!p.saved)}
                accessibilityLabel={p.saved ? 'Remove from saved' : 'Save profile'}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: theme.colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={p.saved ? 'heart' : 'heart-outline'}
                  size={20}
                  color={p.saved ? theme.colors.danger : theme.colors.primary}
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}
