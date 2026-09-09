import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, SegmentedControl, LoadingState, ErrorState, EmptyState, ScreenHeader } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { LandlordListingCard } from '@/features/landlord/components/LandlordListingCard';
import { useMyListings } from '@/features/landlord/hooks';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import type { ListingStatus } from '@/types/database';

type Filter = 'all' | 'active' | 'draft' | 'paused' | 'rented';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Drafts' },
  { value: 'paused', label: 'Paused' },
  { value: 'rented', label: 'Rented' },
];

export default function LandlordListings() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const listings = useMyListings();
  const unreadNotifications = useUnreadNotificationCount();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    const all = listings.data ?? [];
    if (filter === 'all') return all;
    return all.filter((l) => l.status === (filter as ListingStatus));
  }, [listings.data, filter]);

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <ScreenHeader
        left={null}
        avatarUrl={profile?.avatar_url}
        name={profile?.first_name}
        hasNotifications={(unreadNotifications.data ?? 0) > 0}
        onOpenNotifications={() => router.push('/notifications')}
        onOpenProfile={() => router.push('/(landlord)/profile')}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="h1">My Listings</Text>
        <Button
          title="New"
          fullWidth={false}
          size="sm"
          leftIcon={<Ionicons name="add" size={16} color={theme.colors.onPrimary} />}
          onPress={() => router.push('/listing/new')}
        />
      </View>
      {(listings.data?.length ?? 0) > 0 ? (
        <SegmentedControl<Filter> options={FILTERS} value={filter} onChange={setFilter} />
      ) : null}
    </View>
  );

  if (listings.isError) {
    return (
      <Screen>
        {header}
        <ErrorState message="Couldn't load your listings." onRetry={() => listings.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(l) => l.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <LandlordListingCard listing={item} onPress={() => router.push(`/listing/${item.id}`)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing['4xl'],
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshing={listings.isRefetching}
        onRefresh={() => listings.refetch()}
        ListEmptyComponent={
          listings.isLoading ? (
            <LoadingState />
          ) : listings.data?.length ? (
            <EmptyState icon="funnel-outline" title="Nothing here" message="No listings with this status." />
          ) : (
            <EmptyState
              icon="business-outline"
              title="No listings yet"
              message="Create your first listing to start reaching students."
              actionLabel="Create a listing"
              onAction={() => router.push('/listing/new')}
            />
          )
        }
      />
    </Screen>
  );
}
