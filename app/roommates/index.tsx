import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, EmptyState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { analytics } from '@/services/analytics';
import { toAppError } from '@/services/errors';
import { messagingApi } from '@/features/messaging/api';
import { useRoommateBrowse, useHasRoommateProfile } from '@/features/roommates/hooks';
import { RoommateBrowseCard } from '@/features/roommates/components/RoommateBrowseCard';
import { RoommateFilterSheet } from '@/features/roommates/components/RoommateFilterSheet';
import type { RoommateFilters } from '@/features/roommates/types';

function countActive(f: RoommateFilters): number {
  let n = 0;
  if (f.universityId) n++;
  if (f.budgetMax != null) n++;
  if (f.area) n++;
  return n;
}

export default function RoommatesBrowse() {
  const theme = useTheme();
  const router = useRouter();

  const [filters, setFilters] = useState<RoommateFilters>({ sort: 'match' });
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const browse = useRoommateBrowse(filters);
  const hasProfile = useHasRoommateProfile();
  const activeCount = countActive(filters);

  const message = useMutation({
    mutationFn: (otherUserId: string) =>
      messagingApi.startConversation(otherUserId, {
        context: 'roommate',
        roommateProfileId: otherUserId,
      }),
    onMutate: (id) => setPendingId(id),
    onSettled: () => setPendingId(null),
    onSuccess: (conversationId, otherUserId) => {
      analytics.track('roommate_contact_started', { profile_id: otherUserId });
      router.push(`/messages/${conversationId}`);
    },
    onError: (e) => {
      // surface lightly — a full-screen error would be heavy for a single tap
      Alert.alert('Could not start the chat', toAppError(e).message);
    },
  });

  const chips = useMemo(
    () => [
      {
        key: 'university',
        label: filters.universityId ? 'University ✓' : 'University',
        active: !!filters.universityId,
      },
      {
        key: 'budget',
        label: filters.budgetMax != null ? `≤ €${filters.budgetMax}` : 'Budget',
        active: filters.budgetMax != null,
      },
      { key: 'area', label: filters.area ?? 'Area', active: !!filters.area },
    ],
    [filters],
  );

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <Text variant="h1">Roommate Matches</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -theme.layout.screenPadding }}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.sm }}
      >
        {chips.map((c) => (
          <Pressable
            key={c.key}
            onPress={() => setSheetOpen(true)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: c.active ? theme.colors.primary : theme.colors.surface,
              borderWidth: 1,
              borderColor: c.active ? theme.colors.primary : theme.colors.border,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.lg,
              paddingVertical: 8,
            }}
          >
            <Text
              variant="label"
              color={c.active ? theme.colors.onPrimary : theme.colors.textSecondary}
            >
              {c.label}
            </Text>
            <Ionicons
              name="chevron-down"
              size={13}
              color={c.active ? theme.colors.onPrimary : theme.colors.textTertiary}
            />
          </Pressable>
        ))}
      </ScrollView>

      {browse.total != null ? (
        <Text variant="bodySm" muted>
          {browse.total} {browse.total === 1 ? 'student is' : 'students are'} looking for a roommate
        </Text>
      ) : null}
    </View>
  );

  const footer = () => {
    if (browse.isFetchingNextPage) {
      return (
        <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    if (!browse.hasNextPage && browse.matches.length > 0 && hasProfile.data === false) {
      return (
        <Card
          onPress={() => router.push('/roommates/new')}
          style={{ marginTop: theme.spacing.lg }}
          accessibilityLabel="Create your roommate profile"
        >
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
              <Ionicons name="add" size={20} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3" style={{ fontSize: 15 }}>
                List yourself as a roommate
              </Text>
              <Text variant="bodySm" muted>
                Get discovered by students with a matching budget and lifestyle.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
          </View>
        </Card>
      );
    }
    return null;
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </SafeAreaView>

      <RoommateFilterSheet
        visible={sheetOpen}
        filters={filters}
        onClose={() => setSheetOpen(false)}
        onApply={(next) => {
          setFilters(next);
          analytics.track('roommate_search_performed', { filters_count: countActive(next) });
        }}
      />

      {browse.isError ? (
        <View style={{ flex: 1, paddingHorizontal: theme.layout.screenPadding }}>
          <View style={{ paddingTop: theme.spacing.md }}>{header}</View>
          <ErrorState message="Couldn't load roommate matches." onRetry={() => browse.refetch()} />
        </View>
      ) : (
        <FlatList
          data={browse.matches}
          keyExtractor={(m) => m.user_id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <RoommateBrowseCard
              match={item}
              sending={pendingId === item.user_id}
              onPress={() => {
                analytics.track('roommate_profile_viewed', {
                  profile_id: item.user_id,
                  compatibility_score: item.compatibility.score,
                });
                router.push(`/roommates/${item.user_id}`);
              }}
              onMessage={() => message.mutate(item.user_id)}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.lg }} />}
          ListFooterComponent={footer}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing['5xl'],
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (browse.hasNextPage && !browse.isFetchingNextPage) browse.fetchNextPage();
          }}
          refreshing={browse.isRefetching && !browse.isFetchingNextPage}
          onRefresh={() => browse.refetch()}
          ListEmptyComponent={
            browse.isLoading ? (
              <View style={{ paddingVertical: theme.spacing['4xl'], alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <Card style={{ marginTop: theme.spacing.md }}>
                <EmptyState
                  icon="people-outline"
                  title="No matches yet"
                  message={
                    activeCount
                      ? 'Try widening your budget or clearing a filter.'
                      : 'No students are looking for a roommate right now. Check back soon.'
                  }
                  actionLabel={activeCount ? 'Clear filters' : undefined}
                  onAction={activeCount ? () => setFilters({ sort: 'match' }) : undefined}
                />
              </Card>
            )
          }
        />
      )}
    </View>
  );
}
