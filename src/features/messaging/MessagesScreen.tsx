import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, EmptyState, ErrorState, ScreenHeader } from '@/components/ui';
import { useTheme } from '@/theme';
import { analytics } from '@/services/analytics';
import { useUnreadNotificationCount } from '@/features/notifications/hooks';
import { useConversations } from './hooks';
import { ConversationRow } from './components/ConversationRow';

export function MessagesScreen({ role }: { role: 'student' | 'landlord' }) {
  const theme = useTheme();
  const router = useRouter();
  const conversations = useConversations();
  const unreadNotifications = useUnreadNotificationCount();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const list = conversations.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.other?.name.toLowerCase().includes(q) ||
        c.contextLabel?.toLowerCase().includes(q) ||
        c.lastMessagePreview?.toLowerCase().includes(q),
    );
  }, [conversations.data, search]);

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <ScreenHeader
        left={<Text variant="h1">Messages</Text>}
        hasNotifications={(unreadNotifications.data ?? 0) > 0}
        onOpenNotifications={() => router.push('/notifications')}
      />

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
          placeholder="Search conversations..."
          placeholderTextColor={theme.colors.textTertiary}
          style={{ flex: 1, fontSize: 14, color: theme.colors.textPrimary }}
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textTertiary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  if (conversations.isError) {
    return (
      <Screen>
        {header}
        <ErrorState message="Couldn't load your messages." onRetry={() => conversations.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <ConversationRow
            conversation={item}
            onPress={() => {
              analytics.track('conversation_opened', { conversation_id: item.id, context: item.context });
              router.push(`/messages/${item.id}`);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.xs }} />}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: role === 'student' ? theme.layout.tabBarClearance : theme.spacing['4xl'],
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshing={conversations.isRefetching}
        onRefresh={() => conversations.refetch()}
        ListEmptyComponent={
          conversations.isLoading ? (
            <View style={{ paddingVertical: theme.spacing['4xl'], alignItems: 'center' }}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
          ) : search ? (
            <EmptyState icon="search-outline" title="No matches" message={`Nothing matches "${search}".`} />
          ) : (
            <EmptyState
              icon="chatbubbles-outline"
              title="No conversations yet"
              message={
                role === 'landlord'
                  ? 'When a student enquires about one of your listings, the conversation shows up here.'
                  : 'Message a landlord from a listing or a roommate from their profile to start a conversation.'
              }
            />
          )
        }
      />
    </Screen>
  );
}
