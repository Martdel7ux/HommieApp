import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, SegmentedControl, EmptyState, ErrorState, Card } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { qk } from '@/lib/queryClient';
import { useDebounce } from '@/hooks/useDebounce';
import { analytics } from '@/services/analytics';
import { accommodationApi } from '@/features/accommodation/api';
import { useAccommodationSearch, useSavedListings } from '@/features/accommodation/hooks';
import { ListingCard } from '@/features/accommodation/components/ListingCard';
import { ListingMap } from '@/features/accommodation/components/ListingMap';
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

function startingFilters(profile: {
  campus_area?: string | null;
  budget_max?: number | null;
  move_in_from?: string | null;
} | null): AccommodationFilters {
  return {
    sort: 'relevance',
    area: profile?.campus_area ?? undefined,
    rentMax: profile?.budget_max ?? undefined,
    availableFrom: profile?.move_in_from ?? undefined,
  };
}

export default function AccommodationSearch() {
  const theme = useTheme();
  const router = useRouter();
  const { user, profile } = useAuth();

  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounce(searchText, 400);
  const [baseFilters, setBaseFilters] = useState<AccommodationFilters>(() => startingFilters(profile));
  const [view, setView] = useState<'list' | 'map'>('list');
  const [sheetOpen, setSheetOpen] = useState(false);

  // The profile loads asynchronously; if it wasn't ready at mount, seed the
  // starting filters from it once — but only while the user hasn't touched them.
  const touched = useRef(false);
  const seeded = useRef(!!profile);
  useEffect(() => {
    if (seeded.current || touched.current || !profile) return;
    seeded.current = true;
    setBaseFilters(startingFilters(profile));
  }, [profile]);

  const patchFilters = (updater: AccommodationFilters | ((f: AccommodationFilters) => AccommodationFilters)) => {
    touched.current = true;
    setBaseFilters(updater as never);
  };

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
  const savedSet = useMemo(() => new Set(Array.isArray(savedIds.data) ? savedIds.data : []), [savedIds.data]);

  const activeCount = countActive(baseFilters);
  const scopeLabel = baseFilters.area ?? filters.query ?? profile?.city ?? 'Cyprus';

  const topBar = (
    <SafeAreaView edges={['top']} style={{ backgroundColor: theme.colors.background }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingHorizontal: theme.layout.screenPadding,
          height: 48,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={theme.colors.textPrimary} />
        </Pressable>
        <Text variant="h3">Find a Home</Text>
      </View>
    </SafeAreaView>
  );

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
      <SearchBar
        value={searchText}
        onChangeText={setSearchText}
        onOpenFilters={() => setSheetOpen(true)}
        activeFilterCount={activeCount}
      />

      <FilterChipsRow
        filters={baseFilters}
        onPatch={(p) => {
          patchFilters((f) => ({ ...f, ...p }));
          analytics.track('accommodation_filter_applied', { filter: Object.keys(p)[0] ?? 'edit' });
        }}
        onOpenFilters={() => setSheetOpen(true)}
      />

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: theme.spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text variant="bodySm" muted>
            {search.total != null
              ? `${search.total} ${search.total === 1 ? 'property' : 'properties'} in ${scopeLabel}`
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
          <Button title="Load More" variant="secondary" fullWidth={false} onPress={() => search.fetchNextPage()} />
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
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      {topBar}

      <FilterSheet visible={sheetOpen} filters={baseFilters} onClose={() => setSheetOpen(false)} onApply={patchFilters} />

      {view === 'map' ? (
        <View style={{ flex: 1 }}>
          <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.spacing.md }}>{header}</View>
          <View style={{ flex: 1, overflow: 'hidden' }}>
            <ListingMap
              listings={search.rows}
              savedSet={savedSet}
              onToggleSave={(id, next) => toggle(id, next)}
              onOpen={(id) => {
                analytics.track('listing_viewed', { listing_id: id, source: 'accommodation_map' });
                router.push(`/accommodation/${id}`);
              }}
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
                analytics.track('listing_viewed', { listing_id: item.id, source: 'accommodation' });
                router.push(`/accommodation/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.lg }} />}
          ListFooterComponent={listFooter}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing['3xl'],
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
                  onAction={activeCount ? () => patchFilters({ sort: 'relevance' }) : undefined}
                />
              </Card>
            )
          }
        />
      )}
    </View>
  );
}
