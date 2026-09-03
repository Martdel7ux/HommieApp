import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, EmptyState, ErrorState, Card, ScreenHeader } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { analytics } from '@/services/analytics';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import { useJobSearch, useSavedJobs } from '@/features/jobs/hooks';
import { JobCard } from '@/features/jobs/components/JobCard';
import type { JobFilters } from '@/features/jobs/types';

type ChipKey = 'all' | 'part_time' | 'internship' | 'full_time' | 'remote' | 'on_campus';

const CHIPS: { key: ChipKey; label: string; patch: Partial<JobFilters> }[] = [
  { key: 'all', label: 'All', patch: {} },
  { key: 'part_time', label: 'Part-time', patch: { jobType: 'part_time' } },
  { key: 'internship', label: 'Internships', patch: { jobType: 'internship' } },
  { key: 'full_time', label: 'Full-time', patch: { jobType: 'full_time' } },
  { key: 'remote', label: 'Remote', patch: { workMode: 'remote' } },
  { key: 'on_campus', label: 'On-campus', patch: { workMode: 'on_campus' } },
];

export default function Jobs() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const unread = useUnreadNotificationCount();

  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 400);
  const [chip, setChip] = useState<ChipKey>('all');

  const filters = useMemo<JobFilters>(() => {
    const active = CHIPS.find((c) => c.key === chip)!.patch;
    return { ...active, query: debouncedSearch.trim() || undefined };
  }, [chip, debouncedSearch]);

  const search = useJobSearch(filters);
  const { savedIds, toggle } = useSavedJobs();
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
      <ScreenHeader
        left={<Text variant="h1">Jobs</Text>}
        avatarUrl={profile?.avatar_url}
        name={profile?.first_name}
        hasNotifications={(unread.data ?? 0) > 0}
        onOpenNotifications={() => router.push('/notifications')}
        onOpenProfile={() => router.push('/profile')}
      />

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.surfaceAlt,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.lg,
          height: 46,
        }}
      >
        <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search jobs, roles, companies..."
          placeholderTextColor={theme.colors.textTertiary}
          returnKeyType="search"
          style={{ flex: 1, fontSize: 14, color: theme.colors.textPrimary }}
        />
        {searchText ? (
          <Ionicons
            name="close-circle"
            size={16}
            color={theme.colors.textTertiary}
            onPress={() => setSearchText('')}
          />
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -theme.layout.screenPadding }}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.sm }}
      >
        {CHIPS.map((c) => {
          const active = chip === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => {
                setChip(c.key);
                if (c.key !== 'all') analytics.track('jobs_filter_applied', { filter: c.key });
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                backgroundColor: active ? theme.colors.primary : theme.colors.primarySubtle,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: 9,
              }}
            >
              <Text variant="label" color={active ? theme.colors.onPrimary : theme.colors.primary}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const listFooter = () => {
    if (search.isFetchingNextPage) {
      return (
        <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    if (search.hasNextPage) {
      return (
        <View style={{ paddingVertical: theme.spacing.lg, alignItems: 'center' }}>
          <Button title="Load More Jobs" variant="ghost" fullWidth={false} onPress={() => search.fetchNextPage()} />
        </View>
      );
    }
    if (search.rows.length > 0) {
      return (
        <Text variant="caption" muted align="center" style={{ paddingVertical: theme.spacing.lg }}>
          New opportunities added daily.
        </Text>
      );
    }
    return null;
  };

  return (
    <Screen padded={false} edges={['top']}>
      {search.isError ? (
        <View style={{ flex: 1, paddingHorizontal: theme.layout.screenPadding }}>
          <View style={{ paddingTop: theme.spacing.md }}>{header}</View>
          <ErrorState message="Couldn't load jobs." onRetry={() => search.refetch()} />
        </View>
      ) : (
        <FlatList
          data={search.rows}
          keyExtractor={(j) => j.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <JobCard
              job={item}
              saved={savedSet.has(item.id)}
              onToggleSave={() => toggle(item.id, !savedSet.has(item.id))}
              onPress={() => {
                analytics.track('job_viewed', { job_id: item.id, source: 'jobs_list' });
                router.push(`/jobs/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.lg }} />}
          ListFooterComponent={listFooter}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.layout.tabBarClearance,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
          }}
          refreshing={search.isRefetching && !search.isFetchingNextPage}
          onRefresh={() => search.refetch()}
          ListEmptyComponent={
            search.isLoading ? (
              <View style={{ paddingVertical: theme.spacing['4xl'], alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <Card style={{ marginTop: theme.spacing.md }}>
                <EmptyState
                  icon="briefcase-outline"
                  title="No jobs match"
                  message={
                    debouncedSearch.trim()
                      ? `Nothing matches "${debouncedSearch.trim()}".`
                      : 'Try a different filter.'
                  }
                  actionLabel={chip !== 'all' || debouncedSearch ? 'Clear' : undefined}
                  onAction={
                    chip !== 'all' || debouncedSearch
                      ? () => {
                          setChip('all');
                          setSearchText('');
                        }
                      : undefined
                  }
                />
              </Card>
            )
          }
        />
      )}
    </Screen>
  );
}
