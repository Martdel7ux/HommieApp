import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Stack } from 'expo-router';
import { Screen, Text, Avatar, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';
import { confirmAlert, notify } from '@/services/alert';
import { toAppError } from '@/services/errors';
import { useBlockedUsers, useUnblockUser } from '@/features/messaging/hooks';
import type { BlockedUser } from '@/features/messaging/types';

function Row({ user, onUnblock, busy }: { user: BlockedUser; onUnblock: () => void; busy: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.md,
      }}
    >
      <Avatar uri={user.avatarUrl} name={user.name} size={44} />
      <View style={{ flex: 1 }}>
        <Text variant="h3" style={{ fontSize: 15 }}>
          {user.name}
        </Text>
        <Text variant="caption" muted>
          Blocked
        </Text>
      </View>
      <Pressable
        onPress={onUnblock}
        disabled={busy}
        hitSlop={8}
        accessibilityLabel={`Unblock ${user.name}`}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.primarySubtle,
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text variant="label" color={theme.colors.primarySubtleInk}>
            Unblock
          </Text>
        )}
      </Pressable>
    </View>
  );
}

export default function BlockedUsers() {
  const theme = useTheme();
  const blocked = useBlockedUsers();
  const unblock = useUnblockUser();

  const confirmUnblock = (user: BlockedUser) => {
    confirmAlert(
      `Unblock ${user.name}?`,
      'They will be able to message you and see your profile again.',
      () =>
        unblock.mutate(user.id, {
          onError: (e) => notify('Could not unblock this user', toAppError(e).message),
        }),
      { confirmLabel: 'Unblock' },
    );
  };

  return (
    <Screen padded={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Blocked Users',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      {blocked.isError ? (
        <View style={{ flex: 1, padding: theme.layout.screenPadding }}>
          <ErrorState message="Couldn't load your blocked users." onRetry={() => blocked.refetch()} />
        </View>
      ) : (
        <FlatList
          data={blocked.data ?? []}
          keyExtractor={(u) => u.id}
          renderItem={({ item }) => (
            <Row
              user={item}
              busy={unblock.isPending && unblock.variables === item.id}
              onUnblock={() => confirmUnblock(item)}
            />
          )}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: theme.colors.border }} />
          )}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing['5xl'],
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            blocked.isLoading ? (
              <View style={{ paddingVertical: theme.spacing['4xl'], alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <View style={{ paddingTop: theme.spacing['3xl'] }}>
                <EmptyState
                  icon="shield-checkmark-outline"
                  title="No blocked users"
                  message="People you block will show up here so you can unblock them at any time."
                />
              </View>
            )
          }
        />
      )}
    </Screen>
  );
}
