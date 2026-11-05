import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, Avatar, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { notify } from '@/services/alert';
import { toAppError } from '@/services/errors';
import { analytics } from '@/services/analytics';
import { qk } from '@/lib/queryClient';
import { messagingApi } from '@/features/messaging/api';
import { verificationLabels } from '@/config/labels';
import { accommodationApi } from '@/features/accommodation/api';
import { useAccommodationSearch, useLandlordProfile, useSavedListings } from '@/features/accommodation/hooks';
import { ListingCard } from '@/features/accommodation/components/ListingCard';
import { FilterSheet } from '@/features/accommodation/components/FilterSheet';
import { landlordDisplayName } from '@/features/accommodation/landlordDisplay';
import type { AccommodationFilters } from '@/features/accommodation/types';

export default function LandlordProfile() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const profile = useLandlordProfile(id);
  const [filters, setFilters] = useState<AccommodationFilters>({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const search = useAccommodationSearch({ ...filters, landlordId: id });
  const { toggle } = useSavedListings();
  const savedIds = useQuery({
    queryKey: qk.savedListings(user?.id ?? 'anon'),
    queryFn: () => accommodationApi.savedIds(user!.id),
    enabled: !!user,
  });
  const savedSet = useMemo(() => new Set(Array.isArray(savedIds.data) ? savedIds.data : []), [savedIds.data]);

  useEffect(() => {
    if (id) analytics.track('landlord_profile_viewed', { landlord_id: id });
  }, [id]);

  const contact = useMutation({
    mutationFn: () => messagingApi.startConversation(id, { context: 'accommodation' }),
    onSuccess: (conversationId) => {
      analytics.track('landlord_profile_contact_started', { landlord_id: id });
      router.push(`/messages/${conversationId}`);
    },
    onError: (e) => notify('Could not start the chat', toAppError(e).message),
  });

  const p = profile.data;
  const verified = p?.landlord_profile?.verification === 'verified';
  const name = landlordDisplayName(
    p
      ? {
          first_name: p.first_name,
          display_name: p.display_name,
          landlord_profile: p.landlord_profile,
        }
      : null,
  );
  const description = p?.landlord_profile?.description;
  const areas = p?.landlord_profile?.operating_areas ?? [];

  const header = p ? (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.lg }}>
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, paddingTop: theme.spacing.lg }}>
        <Avatar uri={p.avatar_url} name={name} size={76} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Text variant="h2">{name}</Text>
          {verified ? <Ionicons name="checkmark-circle" size={18} color={theme.colors.verifiedBadge} /> : null}
        </View>
        <Text variant="bodySm" muted>
          {verified ? verificationLabels.verified : 'Property provider on Hommie'}
        </Text>
      </View>

      {description ? (
        <Text variant="bodySm" style={{ lineHeight: 21, color: theme.colors.textSecondary, textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}

      {areas.length ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
          <Text variant="bodySm" muted>
            {areas.join(', ')}
          </Text>
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopWidth: 1,
          borderBottomWidth: 1,
          borderColor: theme.colors.border,
          paddingVertical: theme.spacing.md,
          marginTop: theme.spacing.sm,
        }}
      >
        <Text variant="h3">
          {p.activeListingCount} {p.activeListingCount === 1 ? 'Property' : 'Properties'}
        </Text>
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Filter properties"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
        >
          <Ionicons name="options-outline" size={16} color={theme.colors.primary} />
          <Text variant="bodySm" color={theme.colors.primary} style={{ fontWeight: '600' }}>
            Filter
          </Text>
        </Pressable>
      </View>

      <Text variant="h3">Available Properties</Text>
    </View>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />

      {profile.isLoading ? (
        <LoadingState />
      ) : profile.isError ? (
        <ErrorState message="Couldn't load this profile." onRetry={() => profile.refetch()} />
      ) : !p ? (
        <ErrorState message="This provider is no longer available." onRetry={() => router.back()} />
      ) : (
        <>
          <FilterSheet
            visible={sheetOpen}
            filters={filters}
            onClose={() => setSheetOpen(false)}
            onApply={(next) => setFilters(next)}
          />

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
                  analytics.track('listing_viewed', { listing_id: item.id, source: 'landlord_profile' });
                  router.push(`/accommodation/${item.id}`);
                }}
              />
            )}
            ItemSeparatorComponent={() => <View style={{ height: theme.spacing.lg }} />}
            contentContainerStyle={{
              paddingHorizontal: theme.layout.screenPadding,
              paddingBottom: theme.spacing['6xl'] + 24,
              flexGrow: 1,
            }}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.5}
            onEndReached={() => {
              if (search.hasNextPage && !search.isFetchingNextPage) search.fetchNextPage();
            }}
            ListFooterComponent={
              search.isFetchingNextPage ? (
                <View style={{ paddingVertical: theme.spacing.xl, alignItems: 'center' }}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : null
            }
            ListEmptyComponent={
              search.isLoading ? (
                <View style={{ paddingVertical: theme.spacing['3xl'], alignItems: 'center' }}>
                  <ActivityIndicator color={theme.colors.primary} />
                </View>
              ) : (
                <EmptyState icon="home-outline" title="No properties available right now." />
              )
            }
          />

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
                title="Contact"
                loading={contact.isPending}
                onPress={() => contact.mutate()}
                leftIcon={<Ionicons name="chatbubble-outline" size={16} color={theme.colors.onPrimary} />}
              />
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}
