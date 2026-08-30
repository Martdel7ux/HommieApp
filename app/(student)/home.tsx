import { useCallback, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Card, SectionHeader, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { qk } from '@/lib/queryClient';
import { accommodationApi } from '@/features/accommodation/api';
import { ListingCard } from '@/features/accommodation/components/ListingCard';
import { roommatesApi } from '@/features/roommates/api';
import { estimateCompatibility } from '@/features/roommates/compatibility';
import { RoommateMatchCard } from '@/features/roommates/components/RoommateMatchCard';
import type { RoommateMatch } from '@/features/roommates/types';
import { eventsApi } from '@/features/events/api';
import { EventRow } from '@/features/events/components/EventRow';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import { HomeTopBar } from '@/features/home/components/HomeTopBar';
import { QuickActionsGrid, QuickAction } from '@/features/home/components/QuickActionsGrid';
import { analytics } from '@/services/analytics';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function profileCompletion(profile: ReturnType<typeof useAuth>['profile']): number {
  if (!profile) return 100;
  const checks = [
    !!profile.first_name,
    !!profile.avatar_url,
    !!profile.university_id,
    !!profile.city,
    !!profile.study_level,
    !!profile.student_status,
    !!profile.move_in_from,
    !!(profile.budget_min || profile.budget_max),
    profile.interests.length > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function StudentHome() {
  const theme = useTheme();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();
  const city = profile?.city ?? null;

  const unread = useUnreadNotificationCount();

  const recommended = useQuery({
    queryKey: qk.listings({ home: true, city }),
    queryFn: () => accommodationApi.recommended(city, 6),
    enabled: !!user,
  });

  const savedIds = useQuery({
    queryKey: qk.savedListings(user?.id ?? 'anon'),
    queryFn: () => accommodationApi.savedIds(user!.id),
    enabled: !!user,
  });
  const savedSet = useMemo(
    () => new Set(Array.isArray(savedIds.data) ? savedIds.data : []),
    [savedIds.data],
  );

  const roommates = useQuery({
    queryKey: qk.roommates({ home: true }),
    queryFn: () => roommatesApi.list({ limit: 8, excludeUserId: user?.id }),
    enabled: !!user,
  });

  const events = useQuery({
    queryKey: qk.events,
    queryFn: () => eventsApi.upcoming(3),
    enabled: !!user,
  });

  const matches: RoommateMatch[] = useMemo(() => {
    const rows = roommates.data ?? [];
    return rows
      .map((r) => ({ ...r, compatibility: estimateCompatibility(profile, r) }))
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, 3);
  }, [roommates.data, profile]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: qk.listings({ home: true, city }) }),
      queryClient.invalidateQueries({ queryKey: qk.roommates({ home: true }) }),
      queryClient.invalidateQueries({ queryKey: qk.events }),
      unread.refetch(),
    ]);
  }, [queryClient, city, unread]);

  const anyLoading =
    recommended.isLoading || roommates.isLoading || events.isLoading;

  const completion = profileCompletion(profile);

  const quickActions: QuickAction[] = [
    {
      key: 'home',
      label: 'Find a Home',
      icon: 'home',
      variant: 'primary',
      onPress: () => {
        analytics.track('accommodation_search_performed', { filters_count: 0 });
        router.push('/(student)/explore');
      },
    },
    { key: 'roommates', label: 'Roommates', icon: 'people', variant: 'tint', onPress: () => router.push('/roommates') },
    { key: 'events', label: 'Events', icon: 'sparkles', variant: 'violet', onPress: () => router.push('/events') },
    { key: 'market', label: 'Marketplace', icon: 'storefront', variant: 'outline', onPress: () => router.push('/marketplace') },
  ];

  return (
    <Screen
      scroll
      refreshing={recommended.isRefetching || roommates.isRefetching || events.isRefetching}
      onRefresh={onRefresh}
      contentContainerStyle={{ paddingBottom: theme.spacing['4xl'] }}
    >
      <View style={{ gap: theme.spacing['2xl'] }}>
        {/* top bar */}
        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xs }}>
          <HomeTopBar
            avatarUrl={profile?.avatar_url}
            name={profile?.first_name}
            hasNotifications={(unread.data ?? 0) > 0}
            onOpenNotifications={() => router.push('/notifications')}
            onOpenProfile={() => router.push('/(student)/profile')}
          />
          <View style={{ gap: 6 }}>
            <Text variant="h1">
              {greeting()}, {profile?.first_name ?? 'there'}
            </Text>
            <Text variant="bodyLg" muted>
              Let&apos;s find your perfect space in Cyprus.
            </Text>
          </View>
        </View>

        {completion < 100 ? (
          <Card onPress={() => router.push('/(student)/profile')} accessibilityLabel="Complete your profile">
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: theme.colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="h3" style={{ fontSize: 15 }}>
                  Complete your profile
                </Text>
                <Text variant="bodySm" muted>
                  {completion}% done — better roommate matches and recommendations.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
            </View>
          </Card>
        ) : null}

        {/* quick actions */}
        <QuickActionsGrid actions={quickActions} />

        {/* recommended */}
        <View>
          <SectionHeader
            title="Recommended for you"
            actionLabel="View all"
            onAction={() => router.push('/(student)/explore')}
          />
          {recommended.isLoading ? (
            <CarouselSkeleton />
          ) : (recommended.data?.length ?? 0) === 0 ? (
            <Card>
              <EmptyState
                icon="home-outline"
                title="No listings yet"
                message="New places near you will show up here. Try browsing all listings."
                actionLabel="Browse listings"
                onAction={() => router.push('/(student)/explore')}
              />
            </Card>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              // Explicit height: a horizontal ScrollView nested in the vertical
              // page ScrollView can't self-size its cross axis and will otherwise
              // eat vertical space, pushing the sections below it off-screen.
              style={{ height: 264, marginHorizontal: -theme.layout.screenPadding }}
              contentContainerStyle={{
                paddingHorizontal: theme.layout.screenPadding,
                paddingVertical: 4,
                gap: theme.spacing.md,
              }}
            >
              {recommended.data!.map((item) => (
                <ListingCard
                  key={item.id}
                  listing={item}
                  saved={savedSet.has(item.id)}
                  onPress={() => {
                    analytics.track('listing_viewed', { listing_id: item.id, source: 'home_recommended' });
                    router.push(`/accommodation/${item.id}`);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* roommate matches */}
        <View>
          <SectionHeader
            title="Roommate matches"
            actionLabel={matches.length ? 'View all' : undefined}
            onAction={matches.length ? () => router.push('/roommates') : undefined}
          />
          {roommates.isLoading ? (
            <ListSkeleton rows={2} height={76} />
          ) : matches.length === 0 ? (
            <Card>
              <EmptyState
                icon="people-outline"
                title="No matches yet"
                message="Publish a roommate profile to get suggestions based on budget, area and lifestyle."
                actionLabel="Set up roommate profile"
                onAction={() => router.push('/roommates')}
              />
            </Card>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {matches.map((m) => (
                <RoommateMatchCard
                  key={m.user_id}
                  match={m}
                  onPress={() => {
                    analytics.track('roommate_profile_viewed', {
                      profile_id: m.user_id,
                      compatibility_score: m.compatibility.score,
                    });
                    router.push(`/roommates/${m.user_id}`);
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {/* upcoming events */}
        <View>
          <SectionHeader
            title="Upcoming Events"
            actionLabel={(events.data?.length ?? 0) > 0 ? 'View all' : undefined}
            onAction={(events.data?.length ?? 0) > 0 ? () => router.push('/events') : undefined}
          />
          {events.isLoading ? (
            <ListSkeleton rows={2} height={78} />
          ) : (events.data?.length ?? 0) === 0 ? (
            <Card>
              <EmptyState icon="calendar-outline" title="No upcoming events" message="Student events across Cyprus will appear here." />
            </Card>
          ) : (
            <View style={{ gap: theme.spacing.md }}>
              {events.data!.map((e) => (
                <EventRow
                  key={e.id}
                  event={e}
                  onPress={() => {
                    analytics.track('event_viewed', { event_id: e.id });
                    router.push(`/events/${e.id}`);
                  }}
                />
              ))}
            </View>
          )}
        </View>

        {anyLoading ? null : (
          <Pressable
            onPress={onRefresh}
            style={{ alignSelf: 'center', padding: theme.spacing.sm, flexDirection: 'row', gap: 6, alignItems: 'center' }}
          >
            <Ionicons name="refresh" size={14} color={theme.colors.textTertiary} />
            <Text variant="caption" muted>
              Pull to refresh
            </Text>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

function CarouselSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
      {[0, 1].map((i) => (
        <View
          key={i}
          style={{
            width: 272,
            height: 250,
            borderRadius: 16,
            backgroundColor: theme.colors.skeleton,
          }}
        />
      ))}
    </View>
  );
}

function ListSkeleton({ rows, height }: { rows: number; height: number }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={{ height, borderRadius: 16, backgroundColor: theme.colors.skeleton, alignItems: 'center', justifyContent: 'center' }}>
          {i === 0 ? <ActivityIndicator color={theme.colors.textTertiary} /> : null}
        </View>
      ))}
    </View>
  );
}
