import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, Avatar, Card, EmptyState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { analytics } from '@/services/analytics';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import { MARKETPLACE_CATEGORIES } from '@/config/constants';
import { marketplaceCategoryLabels } from '@/config/labels';
import { useMarketplace, useSavedMarketplace } from '@/features/marketplace/hooks';
import { MarketplaceCard } from '@/features/marketplace/components/MarketplaceCard';
import type { MarketplaceCategory } from '@/types/database';

export default function Marketplace() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const unread = useUnreadNotificationCount();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | null>(null);
  const debounced = useDebounce(search, 400);

  const filters = useMemo(
    () => ({ category: category ?? undefined, query: debounced.trim() || undefined }),
    [category, debounced],
  );

  const feed = useMarketplace(filters);
  const { savedIds, toggle } = useSavedMarketplace();
  const savedSet = useMemo(() => new Set(savedIds), [savedIds]);

  const chips: { key: string; label: string; value: MarketplaceCategory | null }[] = [
    { key: 'all', label: 'All Items', value: null },
    ...MARKETPLACE_CATEGORIES.map((c) => ({ key: c, label: marketplaceCategoryLabels[c], value: c })),
  ];

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.primarySubtle,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.lg,
          height: 46,
        }}
      >
        <Ionicons name="search" size={18} color={theme.colors.primaryPressed} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search marketplace..."
          placeholderTextColor={theme.colors.textTertiary}
          style={{ flex: 1, fontSize: 14, color: theme.colors.textPrimary }}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -theme.layout.screenPadding }}
        contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.sm }}
      >
        {chips.map((c) => {
          const active = c.value === category;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCategory(c.value)}
              style={{
                backgroundColor: active ? theme.colors.primary : theme.colors.primarySubtle,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: 9,
              }}
            >
              <Text variant="label" color={active ? theme.colors.onPrimary : theme.colors.primarySubtleInk}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
            <Pressable
              onPress={() => router.push('/notifications')}
              hitSlop={10}
              accessibilityLabel="Notifications"
            >
              <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
              {(unread.data ?? 0) > 0 ? (
                <View
                  style={{
                    position: 'absolute',
                    top: 1,
                    right: 1,
                    width: 9,
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: theme.colors.danger,
                    borderWidth: 1.5,
                    borderColor: theme.colors.background,
                  }}
                />
              ) : null}
            </Pressable>
            <Pressable onPress={() => router.push('/profile')} accessibilityLabel="Open profile">
              <Avatar uri={profile?.avatar_url} name={profile?.first_name} size={34} />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {feed.isError ? (
        <View style={{ flex: 1, paddingHorizontal: theme.layout.screenPadding }}>
          <View style={{ paddingTop: theme.spacing.md }}>{header}</View>
          <ErrorState message="Couldn't load the marketplace." onRetry={() => feed.refetch()} />
        </View>
      ) : (
        <FlatList
          data={feed.rows}
          keyExtractor={(i) => i.id}
          numColumns={2}
          ListHeaderComponent={header}
          columnWrapperStyle={{ gap: theme.spacing.md }}
          renderItem={({ item }) => (
            <MarketplaceCard
              item={item}
              saved={savedSet.has(item.id)}
              onPress={() => {
                analytics.track('marketplace_item_viewed', { item_id: item.id });
                router.push(`/marketplace/${item.id}`);
              }}
              onToggleSave={() => toggle(item.id, !savedSet.has(item.id))}
            />
          )}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing['6xl'] + theme.spacing['2xl'],
            gap: theme.spacing.md,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
          }}
          refreshing={feed.isRefetching && !feed.isFetchingNextPage}
          onRefresh={() => feed.refetch()}
          ListFooterComponent={
            feed.isFetchingNextPage ? (
              <ActivityIndicator color={theme.colors.primary} style={{ marginTop: theme.spacing.lg }} />
            ) : null
          }
          ListEmptyComponent={
            feed.isLoading ? (
              <View style={{ paddingVertical: theme.spacing['4xl'], alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <Card style={{ marginTop: theme.spacing.md }}>
                <EmptyState
                  icon="pricetag-outline"
                  title={search || category ? 'Nothing matches' : 'Nothing for sale yet'}
                  message={
                    search || category
                      ? 'Try another search or category.'
                      : 'Be the first to list something for other students.'
                  }
                  actionLabel="Sell an item"
                  onAction={() => router.push('/marketplace/new')}
                />
              </Card>
            )
          }
        />
      )}

      <View style={{ position: 'absolute', right: theme.spacing.xl, bottom: theme.spacing['3xl'] }}>
        <Button
          title="Sell Item"
          leftIcon={<Ionicons name="add" size={18} color={theme.colors.onPrimary} />}
          fullWidth={false}
          onPress={() => router.push('/marketplace/new')}
          style={{ paddingHorizontal: theme.spacing.xl, ...theme.shadows.lg }}
        />
      </View>
    </View>
  );
}
