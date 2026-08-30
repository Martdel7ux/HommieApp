import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen, Text, Button, SegmentedControl, EmptyState, ErrorState, Card, ScreenHeader } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { qk } from '@/lib/queryClient';
import { useDebounce } from '@/hooks/useDebounce';
import { analytics } from '@/services/analytics';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import { accommodationApi } from '@/features/accommodation/api';
import { useAccommodationSearch, useSavedListings } from '@/features/accommodation/hooks';
import { ListingCard } from '@/features/accommodation/components/ListingCard';
import { FilterSheet } from '@/features/accommodation/components/FilterSheet';
import { SearchBar, FilterChipsRow } from '@/features/accommodation/components/ExploreControls';
import type { AccommodationFilters } from '@/features/accommodation/types';

function countActive(f: AccommodationFilters): number {
  let n = 0;
  if (f.area) n++;
  if (f.rentMin != null || f.rentMax != null) n++;
  if (f.propertyTypes?.length) n++;
  if (f.minBedrooms) n++;
  if (f.furnished) n++;
  if (f.billsIncluded) n++;
  if (f.roommateSuitable) n++;
  if (f.availableFrom) n++;
  if (f.sort && f.sort !== 'relevance') n++;
  return n;
}

export default function Explore() {
  const theme = useTheme();
  const router = useRouter();
  const { user, profile } = useAuth();
  const unread = useUnreadNotificationCount();

  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 400);
  const [baseFilters, setBaseFilters] = useState<AccommodationFilters>({ sort: 'relevance' });
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sheetOpen, setSheetOpen] = useState(false);

  const filters = useMemo<AccommodationFilters>(
    () => ({ ...baseFilters, query: debouncedSearch.trim() || undefined }),
    [baseFilters, debouncedSearch],
  );

  const search = useAccommodationSearch(filters);
  const { toggle } = useSavedListings();

  const savedIds = useQuery({
    queryKey: qk.savedListings(user?.id ?? 'anon'),
    queryFn: () => accommodationApi.savedIds(user!.id),
    enabled: !!user,
  });
  const savedSet = useMemo(
    () => new Set(Array.isArray(savedIds.data) ? savedIds.data : []),
    [savedIds.data],
  );

  const activeCount = countActive(baseFilters);
  const scopeLabel = baseFilters.area ?? filters.query ?? profile?.city ?? 'Cyprus';

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
      <ScreenHeader
        avatarUrl={profile?.avatar_url}
        name={profile?.first_name}
        hasNotifications={(unread.data ?? 0) > 0}
        onOpenNotifications={() => router.push('/notifications')}
        onOpenProfile={() => router.push('/(student)/profile')}
      />

      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        onOpenFilters={() => setSheetOpen(true)}
        activeFilterCount={activeCount}
      />

      <FilterChipsRow
        filters={baseFilters}
        onPatch={(p) => {
          setBaseFilters((f) => ({ ...f, ...p }));
          analytics.track('accommodation_filter_applied', { filter: Object.keys(p)[0] ?? 'edit' });
        }}
        onOpenFilters={() => setSheetOpen(true)}
      />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="h1">Explore</Text>
          <Text variant="bodySm" muted>
            {search.total != null
              ? `${search.total} ${search.total === 1 ? 'property' : 'properties'} found in ${scopeLabel}`
              : 'Finding places…'}
          </Text>
        </View>
        <SegmentedControl
          options={[
            { value: 'list', label: 'List', icon: 'list' },
            { value: 'map', label: 'Map', icon: 'map-outline' },
          ]}
          value={view}
          onChange={(v) => {
            setView(v);
            analytics.track('accommodation_view_toggled', { view: v });
          }}
        />
      </View>
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
          <Button
            title="Load More"
            variant="secondary"
            fullWidth={false}
            onPress={() => search.fetchNextPage()}
          />
        </View>
      );
    }
    if (search.rows.length > 0) {
      return (
        <Text variant="caption" muted align="center" style={{ paddingVertical: theme.spacing.lg }}>
          That&apos;s everything for now
        </Text>
      );
    }
    return null;
  };

  return (
    <Screen padded={false} edges={['top']}>
      <FilterSheet
        visible={sheetOpen}
        filters={baseFilters}
        onClose={() => setSheetOpen(false)}
        onApply={setBaseFilters}
      />

      {view === 'map' ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.spacing.md }}>
            {header}
          </View>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl }}>
            <EmptyState
              icon="map-outline"
              title="Map view is coming soon"
              message="We're wiring up an interactive map with approximate pins. Use the list for now."
              actionLabel="Back to list"
              onAction={() => setView('list')}
            />
          </View>
        </View>
      ) : search.isError ? (
        <View style={{ flex: 1, paddingHorizontal: theme.layout.screenPadding }}>
          <View style={{ paddingTop: theme.spacing.md }}>{header}</View>
          <ErrorState message="Couldn't load listings." onRetry={() => search.refetch()} />
        </View>
      ) : (
        <FlatList
          data={search.rows}
          keyExtractor={(l) => l.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              layout="list"
              saved={savedSet.has(item.id)}
              onToggleSave={() => toggle(item.id, !savedSet.has(item.id))}
              onPress={() => {
                analytics.track('listing_viewed', { listing_id: item.id, source: 'explore' });
                router.push(`/accommodation/${item.id}`);
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
                  icon="search-outline"
                  title="No places match"
                  message="Try widening your budget or clearing a filter."
                  actionLabel={activeCount ? 'Clear filters' : undefined}
                  onAction={activeCount ? () => setBaseFilters({ sort: 'relevance' }) : undefined}
                />
              </Card>
            )
          }
        />
      )}
    </Screen>
  );
}
