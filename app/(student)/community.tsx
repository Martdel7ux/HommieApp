import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, Avatar, EmptyState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import { COMMUNITY_CATEGORIES } from '@/config/constants';
import { communityCategoryLabels } from '@/config/labels';
import { useCommunityFeed, useLikePost } from '@/features/community/hooks';
import { PostCard } from '@/features/community/components/PostCard';
import type { CommunityCategory } from '@/types/database';

export default function Community() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const unread = useUnreadNotificationCount();

  const [category, setCategory] = useState<CommunityCategory | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');

  const feed = useCommunityFeed(category ?? undefined);
  const like = useLikePost();

  const posts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return feed.posts;
    return feed.posts.filter(
      (p) => p.body.toLowerCase().includes(q) || p.author?.name.toLowerCase().includes(q),
    );
  }, [feed.posts, search]);

  const chips: { key: string; label: string; value: CommunityCategory | null }[] = [
    { key: 'all', label: 'All Posts', value: null },
    ...COMMUNITY_CATEGORIES.map((c) => ({ key: c, label: communityCategoryLabels[c], value: c })),
  ];

  const header = (
    <View style={{ gap: theme.spacing.md, paddingBottom: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text variant="h1">Community</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Pressable
            onPress={() => setSearchOpen((s) => !s)}
            hitSlop={10}
            accessibilityLabel="Search posts"
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={searchOpen ? 'close' : 'search'} size={23} color={theme.colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityLabel="Notifications"
            style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
            {(unread.data ?? 0) > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  top: 7,
                  right: 7,
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
            <Avatar uri={profile?.avatar_url} name={profile?.first_name} size={40} />
          </Pressable>
        </View>
      </View>

      {searchOpen ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.pill,
            paddingHorizontal: theme.spacing.lg,
            height: 42,
          }}
        >
          <Ionicons name="search" size={16} color={theme.colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search posts"
            placeholderTextColor={theme.colors.textTertiary}
            autoFocus
            style={{ flex: 1, fontSize: 14, color: theme.colors.textPrimary }}
          />
        </View>
      ) : null}

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
                backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: active ? theme.colors.primary : theme.colors.border,
                borderRadius: theme.radius.pill,
                paddingHorizontal: theme.spacing.lg,
                paddingVertical: 8,
              }}
            >
              <Text variant="label" color={active ? theme.colors.onPrimary : theme.colors.textSecondary}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  if (feed.isError) {
    return (
      <Screen padded={false} edges={['top']}>
        <View style={{ paddingHorizontal: theme.layout.screenPadding, paddingTop: theme.spacing.md }}>{header}</View>
        <ErrorState message="Couldn't load the community feed." onRetry={() => feed.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={() => router.push(`/community/${item.id}`)}
            onToggleLike={() => like.mutate({ postId: item.id, next: !item.likedByMe })}
            onComment={() => router.push(`/community/${item.id}`)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.lg }} />}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.layout.tabBarClearance + theme.spacing['3xl'],
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
            <EmptyState
              icon="chatbubbles-outline"
              title={search ? 'No matching posts' : 'Nothing here yet'}
              message={
                search
                  ? `Nothing matches "${search}".`
                  : 'Be the first to post in this category.'
              }
              actionLabel={search ? undefined : 'Write a post'}
              onAction={search ? undefined : () => router.push('/community/new')}
            />
          )
        }
      />

      {/* clear the floating tab bar + its blur scrim so the button stays crisp */}
      <View style={{ position: 'absolute', right: theme.spacing.xl, bottom: theme.layout.tabBarClearance + 20 }}>
        <Button
          title="Post"
          leftIcon={<Ionicons name="add" size={18} color={theme.colors.onPrimary} />}
          fullWidth={false}
          onPress={() => router.push('/community/new')}
          style={{ paddingHorizontal: theme.spacing.xl, ...theme.shadows.lg }}
        />
      </View>
    </Screen>
  );
}
