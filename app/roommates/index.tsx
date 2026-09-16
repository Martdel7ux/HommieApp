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
  if (f.studentAudience) n++;
  if (f.housingStatus) n++;
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

  const patch = (p: Partial<RoommateFilters>) => setFilters((f) => ({ ...f, ...p }));

  const chips = useMemo(() => {
    const list: { key: string; label: string; onRemove: () => void }[] = [];
    if (filters.universityId) list.push({ key: 'university', label: 'University', onRemove: () => patch({ universityId: undefined }) });
    if (filters.budgetMax != null) list.push({ key: 'budget', label: `≤ €${filters.budgetMax}`, onRemove: () => patch({ budgetMax: undefined }) });
    if (filters.area) list.push({ key: 'area', label: filters.area, onRemove: () => patch({ area: undefined }) });
    if (filters.studentAudience) {
      list.push({
        key: 'studentAudience',
        label: filters.studentAudience === 'erasmus' ? 'Erasmus' : 'Full-time',
        onRemove: () => patch({ studentAudience: undefined }),
      });
    }
    if (filters.housingStatus) {
      list.push({
        key: 'housingStatus',
        label: filters.housingStatus === 'has_flat' ? 'Has a flat' : 'Looking for a flat',
        onRemove: () => patch({ housingStatus: undefined }),
      });
    }
    return list;
  }, [filters]);

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <Text variant="h1">Roommate Matches</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -theme.layout.screenPadding }}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.sm }}
      >
        <Pressable
          onPress={() => setSheetOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: 7,
          }}
        >
          <Ionicons name="options-outline" size={13} color={theme.colors.textSecondary} />
          <Text variant="label" color={theme.colors.textSecondary}>
            {chips.length ? 'Edit' : 'Filter'}
          </Text>
        </Pressable>

        {chips.map((c) => (
          <Pressable
            key={c.key}
            onPress={c.onRemove}
            accessibilityRole="button"
            accessibilityLabel={`Remove filter ${c.label}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              backgroundColor: theme.colors.primary,
              borderRadius: theme.radius.pill,
              paddingLeft: theme.spacing.md,
              paddingRight: theme.spacing.sm,
              paddingVertical: 7,
            }}
          >
            <Text variant="label" color={theme.colors.onPrimary}>
              {c.label}
            </Text>
            <Ionicons name="close" size={13} color={theme.colors.onPrimary} />
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
