import type { ReactNode } from 'react';
import { Alert, Linking, Pressable, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, Avatar, LoadingState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { eventDateLabel, eventTimeRange } from '@/lib/datetime';
import { eventCover } from '@/features/events/api';
import { useEvent, useEventRsvp } from '@/features/events/hooks';

function InfoCard({
  icon,
  children,
  right,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  right?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        backgroundColor: theme.colors.surfaceAlt,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
      }}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: theme.colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={19} color={theme.colors.primary} />
      </View>
      <View style={{ flex: 1 }}>{children}</View>
      {right}
    </View>
  );
}

export default function EventDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const event = useEvent(id);
  const rsvp = useEventRsvp(id);

  const openDirections = () => {
    const e = event.data;
    if (!e) return;
    const q =
      e.approx_lat != null && e.approx_lng != null
        ? `${e.approx_lat},${e.approx_lng}`
        : encodeURIComponent(`${e.location_name}, ${e.city}, Cyprus`);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`);
  };

  const goingState = event.data?.myRsvp ?? null;
  const busy = rsvp.isPending;

  const onRsvp = () => {
    if (goingState === 'going') {
      Alert.alert('Cancel your RSVP?', "You can RSVP again any time before the event.", [
        { text: 'Keep it', style: 'cancel' },
        { text: 'Cancel RSVP', style: 'destructive', onPress: () => rsvp.mutate(null) },
      ]);
    } else {
      rsvp.mutate('going');
    }
  };

  const toggleHeart = () => rsvp.mutate(goingState === null ? 'interested' : null);

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
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
            <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={10}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
            </Pressable>
            <Pressable
              onPress={() => router.push('/(student)/profile')}
              accessibilityLabel="Open profile"
            >
              <Avatar uri={profile?.avatar_url} name={profile?.first_name} size={34} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {event.isLoading ? (
        <LoadingState />
      ) : event.isError || !event.data ? (
        <ErrorState message="Couldn't load this event." onRetry={() => event.refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{
              padding: theme.layout.screenPadding,
              paddingBottom: theme.spacing['6xl'] + 24,
              gap: theme.spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View>
              {eventCover(event.data) ? (
                <Image
                  source={{ uri: eventCover(event.data) }}
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: theme.radius.xl,
                    backgroundColor: theme.colors.primarySubtle,
                  }}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View
                  style={{
                    width: '100%',
                    height: 200,
                    borderRadius: theme.radius.xl,
                    backgroundColor: theme.colors.primarySubtle,
                  }}
                />
              )}
              <View
                style={{
                  position: 'absolute',
                  top: theme.spacing.md,
                  right: theme.spacing.md,
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
                  Verified Event
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text variant="h1">{event.data.title}</Text>
                <Text variant="body" muted>
                  Hosted by {event.data.host_name}
                </Text>
              </View>
              <Pressable
                onPress={toggleHeart}
                disabled={busy}
                hitSlop={8}
                accessibilityLabel={goingState ? 'Remove from your events' : 'Save this event'}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: theme.colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name={goingState ? 'heart' : 'heart-outline'}
                  size={20}
                  color={goingState ? theme.colors.danger : theme.colors.primary}
                />
              </Pressable>
            </View>

            <InfoCard icon="calendar-outline">
              <Text variant="h3" style={{ fontSize: 15.5 }}>
                {eventDateLabel(event.data.starts_at)}
              </Text>
              <Text variant="bodySm" muted>
                {eventTimeRange(event.data.starts_at, event.data.ends_at)}
              </Text>
            </InfoCard>

            <InfoCard
              icon="location-outline"
              right={
                <Pressable
                  onPress={openDirections}
                  hitSlop={6}
                  accessibilityLabel="Get directions"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: theme.colors.surface,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  }}
                >
                  <Ionicons name="navigate-outline" size={14} color={theme.colors.primary} />
                  <Text variant="label" color={theme.colors.primary}>
                    Directions
                  </Text>
                </Pressable>
              }
            >
              <Text variant="h3" style={{ fontSize: 15.5 }}>
                {event.data.location_name}
              </Text>
              <Text variant="bodySm" muted>
                {[event.data.area, event.data.city].filter(Boolean).join(', ')}
              </Text>
            </InfoCard>

            {event.data.description ? (
              <View style={{ gap: theme.spacing.sm }}>
                <Text variant="h3">About the event</Text>
                <Text variant="body" style={{ lineHeight: 22, color: theme.colors.textSecondary }}>
                  {event.data.description}
                </Text>
              </View>
            ) : null}

            <View style={{ gap: theme.spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text variant="h3">Attendees</Text>
                {event.data.rsvp_count > 0 ? (
                  <View
                    style={{
                      backgroundColor: theme.colors.primarySubtle,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 5,
                    }}
                  >
                    <Text variant="caption" color={theme.colors.primarySubtleInk} style={{ fontWeight: '700' }}>
                      {event.data.rsvp_count} going
                    </Text>
                  </View>
                ) : null}
              </View>

              {event.data.attendees.length ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {event.data.attendees.slice(0, 7).map((a, i) => (
                    <View key={a.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                      <View
                        style={{
                          borderWidth: 2,
                          borderColor: theme.colors.background,
                          borderRadius: 19,
                        }}
                      >
                        <Avatar uri={a.avatarUrl} name={a.name} size={34} />
                      </View>
                    </View>
                  ))}
                  {event.data.rsvp_count > event.data.attendees.slice(0, 7).length ? (
                    <Text variant="bodySm" muted style={{ marginLeft: theme.spacing.md }}>
                      +{event.data.rsvp_count - Math.min(7, event.data.attendees.length)} more
                    </Text>
                  ) : null}
                </View>
              ) : (
                <Text variant="bodySm" muted>
                  Be the first to RSVP.
                </Text>
              )}
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
                title={goingState === 'going' ? "You're going · tap to cancel" : 'RSVP Now'}
                variant={goingState === 'going' ? 'secondary' : 'primary'}
                loading={busy}
                onPress={onRsvp}
                leftIcon={
                  goingState === 'going' ? (
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primaryPressed} />
                  ) : undefined
                }
              />
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}
