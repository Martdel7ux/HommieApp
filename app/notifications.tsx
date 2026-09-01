import { useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, EmptyState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { notificationRoute } from '@/features/notifications/api';
import { useNotifications, useMarkNotificationsRead } from '@/features/notifications/hooks';
import { NotificationRow } from '@/features/notifications/components/NotificationRow';

export default function Notifications() {
  const theme = useTheme();
  const router = useRouter();

  const notifications = useNotifications();
  const markRead = useMarkNotificationsRead();

  const unreadIds = useMemo(
    () => (notifications.data ?? []).filter((n) => !n.isRead).map((n) => n.id),
    [notifications.data],
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
          {unreadIds.length > 0 ? (
            <Pressable onPress={() => markRead.mutate(unreadIds)} hitSlop={8}>
              <Text variant="label" color={theme.colors.primary}>
                Mark all read
              </Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>

      {notifications.isError ? (
        <View style={{ flex: 1, paddingHorizontal: theme.layout.screenPadding }}>
          <Text variant="h1" style={{ paddingTop: theme.spacing.md }}>
            Notifications
          </Text>
          <ErrorState message="Couldn't load your notifications." onRetry={() => notifications.refetch()} />
        </View>
      ) : (
        <FlatList
          data={notifications.data ?? []}
          keyExtractor={(n) => n.id}
          ListHeaderComponent={
            <View style={{ gap: 2, paddingBottom: theme.spacing.md }}>
              <Text variant="h1">Notifications</Text>
              {unreadIds.length > 0 ? (
                <Text variant="bodySm" muted>
                  {unreadIds.length} unread
                </Text>
              ) : null}
            </View>
          }
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              onPress={() => {
                if (!item.isRead) markRead.mutate([item.id]);
                const path = notificationRoute(item);
                if (path) router.push(path as never);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.xs }} />}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing['5xl'],
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshing={notifications.isRefetching}
          onRefresh={() => notifications.refetch()}
          ListEmptyComponent={
            notifications.isLoading ? (
              <View style={{ paddingVertical: theme.spacing['4xl'], alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <View style={{ paddingTop: theme.spacing['3xl'] }}>
                <EmptyState
                  icon="notifications-outline"
                  title="You're all caught up"
                  message="New messages, enquiries and event reminders will show up here."
                />
              </View>
            )
          }
        />
      )}
    </View>
  );
}
