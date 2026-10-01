import { useMemo } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, Card, EmptyState } from '@/components/ui';
import { Logo } from '@/components/Brand/Logo';
import { useTheme } from '@/theme';
import { qk } from '@/lib/queryClient';
import { accommodationApi } from '@/features/accommodation/api';
import { ListingCard } from '@/features/accommodation/components/ListingCard';
import { analytics } from '@/services/analytics';

/**
 * Guest-accessible landing screen — reachable without signing in (it lives
 * under the `(auth)` route group, which `AuthGate` already lets signed-out
 * visitors reach). Added for App Review Guideline 5.1.1(v): browsing homes
 * isn't account-based, so it can't require registration first. Tapping a
 * listing goes to the real (also guest-accessible) detail page; anything
 * account-based there prompts sign-in at that point instead.
 */
export default function Browse() {
  const theme = useTheme();
  const router = useRouter();

  const listings = useQuery({
    queryKey: qk.listings({ guestBrowse: true }),
    queryFn: () => accommodationApi.list({ sort: 'newest' }, { limit: 6 }),
  });
  const rows = useMemo(() => listings.data?.rows ?? [], [listings.data]);

  return (
    <Screen scroll contentContainerStyle={{ paddingBottom: theme.spacing['2xl'] }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: theme.spacing.md,
        }}
      >
        <Logo size={32} />
        <Pressable onPress={() => router.push('/(auth)/sign-in')} accessibilityRole="button">
          <Text variant="label" color={theme.colors.primary}>
            Sign in
          </Text>
        </Pressable>
      </View>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing['2xl'] }}>
        <Text variant="h1">Browse homes near your campus</Text>
        <Text variant="body" muted>
          See what&apos;s available in Cyprus before you create an account.
        </Text>
      </View>

      <Pressable
        onPress={() => {
          analytics.track('accommodation_search_performed', { filters_count: 0 });
          router.push('/accommodation');
        }}
        accessibilityRole="button"
        accessibilityLabel="Search homes"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          marginTop: theme.spacing.xl,
          backgroundColor: theme.colors.surface,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.pill,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          ...theme.shadows.sm,
        }}
      >
        <Ionicons name="search" size={18} color={theme.colors.textTertiary} />
        <Text variant="body" muted style={{ flex: 1 }}>
          Search by area, price, or campus
        </Text>
      </Pressable>

      <View style={{ marginTop: theme.spacing['2xl'], gap: theme.spacing.md }}>
        <Text variant="h3">New on Hommie</Text>
        {listings.isLoading ? (
          <View style={{ height: 250, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        ) : rows.length === 0 ? (
          <Card>
            <EmptyState
              icon="home-outline"
              title="No listings yet"
              message="Check back soon, or search to see everything available."
            />
          </Card>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ height: 264, marginHorizontal: -theme.layout.screenPadding }}
            contentContainerStyle={{
              paddingHorizontal: theme.layout.screenPadding,
              paddingVertical: 4,
              gap: theme.spacing.md,
            }}
          >
            {rows.map((item) => (
              <ListingCard
                key={item.id}
                listing={item}
                onPress={() => {
                  analytics.track('listing_viewed', { listing_id: item.id, source: 'guest_browse' });
                  router.push(`/accommodation/${item.id}`);
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>

      <View style={{ flex: 1, minHeight: theme.spacing.xl }} />

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing['2xl'] }}>
        <Text variant="bodySm" muted align="center">
          Create a free account to save homes, message landlords and more.
        </Text>
        <Button title="Create a free account" onPress={() => router.push('/(auth)/welcome')} />
      </View>
    </Screen>
  );
}
