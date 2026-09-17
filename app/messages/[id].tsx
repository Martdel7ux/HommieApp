import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, LoadingState, ErrorState } from '@/components/ui';
import { useTheme, useThemeMode } from '@/theme';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '@/features/auth/AuthProvider';
import { dayLabel } from '@/lib/datetime';
import { toAppError } from '@/services/errors';
import { haptics } from '@/services/haptics';
import { REPORT_REASONS } from '@/config/constants';
import { useConversation, useThread } from '@/features/messaging/thread';
import { messagingApi } from '@/features/messaging/api';
import { MessageBubble } from '@/features/messaging/components/MessageBubble';
import { ContextCard } from '@/features/messaging/components/ContextCard';
import { MessageComposer } from '@/features/messaging/components/MessageComposer';
import type { ChatMessage } from '@/features/messaging/types';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function sameDay(a: string, b: string) {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function DaySeparator({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={{ alignItems: 'center', marginVertical: theme.spacing.md }}>
      <View
        style={{
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: 4,
        }}
      >
        <Text variant="caption" color={theme.colors.textSecondary}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export default function ConversationThread() {
  const theme = useTheme();
  const { isDark } = useThemeMode();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const convo = useConversation(id);
  const thread = useThread(id);
  const { messages } = thread;

  const otherReadAt = convo.data?.otherLastReadAt ?? null;

  const renderItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => {
      const mine = item.senderId === user?.id;
      const newer = messages[index - 1]; // visually below (inverted list)
      const older = messages[index + 1]; // visually above
      const showTime = !newer || newer.senderId !== item.senderId || item.status === 'failed';
      const newDay = !older || !sameDay(older.createdAt, item.createdAt);
      const read =
        mine && !!otherReadAt && new Date(otherReadAt) >= new Date(item.createdAt);

      return (
        <View>
          {newDay ? <DaySeparator label={dayLabel(item.createdAt)} /> : null}
          <MessageBubble
            message={item}
            mine={mine}
            showTime={showTime}
            read={read}
            onRetry={() => thread.retry(item)}
          />
        </View>
      );
    },
    [messages, user?.id, otherReadAt, thread],
  );

  const other = convo.data?.other;

  const viewProfile = () => {
    if (!other) return;
    router.push(other.role === 'landlord' ? `/landlord/${other.id}` : `/roommates/${other.id}`);
  };

  const openMenu = () => {
    if (!other) return;
    Alert.alert(other.name, undefined, [
      { text: 'View profile', onPress: viewProfile },
      {
        text: 'Report user',
        onPress: () =>
          Alert.alert('Report user', 'Why are you reporting this person?', [
            ...REPORT_REASONS.map((reason) => ({
              text: cap(reason.replace(/_/g, ' ')),
              onPress: async () => {
                try {
                  await messagingApi.reportUser(user!.id, other.id, reason);
                  Alert.alert('Thanks', "We've received your report and will take a look.");
                } catch (e) {
                  Alert.alert('Something went wrong', toAppError(e).message);
                }
              },
            })),
            { text: 'Cancel', style: 'cancel' as const },
          ]),
      },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Block this person?',
            "They won't be able to message you again, and this chat will be removed from your inbox.",
            [
              {
                text: 'Block',
                style: 'destructive',
                onPress: async () => {
                  haptics.warning();
                  try {
                    await messagingApi.blockUser(user!.id, other.id, id);
                    router.back();
                  } catch (e) {
                    Alert.alert('Could not block this user', toAppError(e).message);
                  }
                },
              },
              { text: 'Cancel', style: 'cancel' as const },
            ],
          ),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* header */}
      <View
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: theme.spacing.md,
          paddingHorizontal: theme.spacing.md,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Back" style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Pressable
          onPress={viewProfile}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
          accessibilityLabel={`View ${other?.name ?? 'profile'}`}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text variant="h3" numberOfLines={1} style={{ fontSize: 17 }}>
                {other?.name ?? 'Conversation'}
              </Text>
              {other?.verified ? (
                <Ionicons name="checkmark-circle" size={15} color={theme.colors.verifiedBadge} />
              ) : null}
            </View>
            {convo.data?.contextCard ? (
              <Text variant="caption" muted numberOfLines={1}>
                {convo.data.contextCard.title}
              </Text>
            ) : null}
          </View>
          <Avatar uri={other?.avatarUrl} name={other?.name} size={38} />
        </Pressable>
        <Pressable onPress={openMenu} hitSlop={10} accessibilityLabel="Conversation options" style={{ padding: 4 }}>
          <Ionicons name="ellipsis-vertical" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {thread.isLoading ? (
          <LoadingState />
        ) : thread.isError ? (
          <ErrorState message="Couldn't load this conversation." onRetry={() => thread.refetch()} />
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={renderItem}
            inverted
            contentContainerStyle={{
              paddingHorizontal: theme.layout.screenPadding,
              paddingTop: theme.spacing.lg,
              paddingBottom: theme.spacing.lg,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (thread.hasNextPage && !thread.isFetchingNextPage) thread.fetchNextPage();
            }}
            ListFooterComponent={
              <View>
                {convo.data?.contextCard ? (
                  <ContextCard
                    card={convo.data.contextCard}
                    onPress={() => {
                      const c = convo.data!.contextCard!;
                      router.push(
                        c.kind === 'accommodation' ? `/accommodation/${c.id}` : `/marketplace/${c.id}`,
                      );
                    }}
                  />
                ) : null}
                {thread.isFetchingNextPage ? (
                  <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: theme.spacing.md }} />
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View style={{ transform: [{ scaleY: -1 }], paddingTop: theme.spacing['4xl'], alignItems: 'center' }}>
                <Text muted>Say hello 👋</Text>
              </View>
            }
          />
        )}

        <MessageComposer onSend={thread.sendMessage} disabled={thread.isSending} />
      </KeyboardAvoidingView>
    </View>
  );
}
