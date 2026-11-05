import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text, Avatar, LoadingState, ErrorState } from '@/components/ui';
import { ActionSheet } from '@/components/ui/ActionSheet';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { timeAgo } from '@/lib/datetime';
import { notify } from '@/services/alert';
import { PostCard } from '@/features/community/components/PostCard';
import { usePostDetail, usePostComments, useAddComment, useLikePost } from '@/features/community/hooks';
import { communityApi } from '@/features/community/api';
import { REPORT_REASONS } from '@/config/constants';

const cap = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function PostDetail() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const post = usePostDetail(id);
  const comments = usePostComments(id);
  const addComment = useAddComment(id);
  const like = useLikePost();
  const [text, setText] = useState('');
  const [reportOpen, setReportOpen] = useState(false);

  const reportReasons = REPORT_REASONS.filter((r) =>
    ['spam', 'scam_or_fraud', 'inappropriate', 'harassment'].includes(r),
  );

  const submitReport = (r: (typeof reportReasons)[number]) => {
    communityApi.reportPost(user!.id, id, r).then(() => notify('Thanks', 'Our team will take a look.'));
  };

  const report = () => {
    if (Platform.OS === 'web') {
      // react-native-web's Alert shim only supports a 2-button window.confirm,
      // not this reason-list menu — use the ActionSheet modal instead.
      setReportOpen(true);
      return;
    }
    Alert.alert('Report post', 'Why are you reporting this?', [
      ...reportReasons.map((r) => ({ text: cap(r), onPress: () => submitReport(r) })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const send = () => {
    const v = text.trim();
    if (!v) return;
    addComment.mutate(v);
    setText('');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Post',
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
          headerRight: () => (
            <Pressable onPress={report} hitSlop={8} accessibilityLabel="Report post">
              <Ionicons name="ellipsis-horizontal" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          ),
        }}
      />

      {post.isLoading ? (
        <LoadingState />
      ) : post.isError || !post.data ? (
        <ErrorState message="Couldn't load this post." onRetry={() => post.refetch()} />
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // native header = status-bar inset + the standard 44pt nav bar
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
        >
          <ScrollView
            contentContainerStyle={{ padding: theme.layout.screenPadding, paddingBottom: theme.spacing['4xl'], gap: theme.spacing.lg }}
            keyboardShouldPersistTaps="handled"
          >
            <PostCard
              post={post.data}
              onToggleLike={() => like.mutate({ postId: id, next: !post.data!.likedByMe })}
              onComment={() => undefined}
            />

            <Text variant="h3" style={{ fontSize: 16 }}>
              {post.data.commentsCount} {post.data.commentsCount === 1 ? 'comment' : 'comments'}
            </Text>

            {comments.isLoading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (comments.data?.length ?? 0) === 0 ? (
              <Text muted>No comments yet. Start the conversation.</Text>
            ) : (
              <View style={{ gap: theme.spacing.lg }}>
                {comments.data!.map((c) => (
                  <View key={c.id} style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                    <Avatar uri={c.author?.avatarUrl} name={c.author?.name} size={36} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                        <Text variant="label">{c.author?.name ?? 'Hommie user'}</Text>
                        <Text variant="caption" muted>
                          {timeAgo(c.createdAt)}
                        </Text>
                      </View>
                      <Text variant="body" style={{ fontSize: 14.5 }}>
                        {c.body}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <SafeAreaView
            edges={['bottom']}
            style={{ backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                gap: theme.spacing.sm,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
              }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Add a comment…"
                placeholderTextColor={theme.colors.textTertiary}
                multiline
                style={{
                  flex: 1,
                  minHeight: 42,
                  maxHeight: 110,
                  backgroundColor: theme.colors.primarySubtle,
                  borderRadius: theme.radius.xl,
                  paddingHorizontal: theme.spacing.lg,
                  paddingVertical: 11,
                  fontSize: 15,
                  color: theme.colors.textPrimary,
                }}
              />
              <Pressable
                onPress={send}
                disabled={!text.trim() || addComment.isPending}
                accessibilityLabel="Send comment"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: theme.colors.primaryBold,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: text.trim() && !addComment.isPending ? 1 : 0.4,
                }}
              >
                <Ionicons name="send" size={16} color={theme.colors.onPrimary} style={{ marginLeft: -1 }} />
              </Pressable>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
      )}

      <ActionSheet
        visible={reportOpen}
        title="Report post"
        message="Why are you reporting this?"
        onClose={() => setReportOpen(false)}
        options={reportReasons.map((r) => ({ label: cap(r), onPress: () => submitReport(r) }))}
      />
    </View>
  );
}
