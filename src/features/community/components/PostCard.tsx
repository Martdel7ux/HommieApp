import React from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Text, Avatar } from '@/components/ui';
import { communityCategoryLabels } from '@/config/labels';
import { timeAgo } from '@/lib/datetime';
import type { CommunityPost } from '../types';

export function PostCard({
  post,
  onPress,
  onToggleLike,
  onComment,
  bodyLines = 4,
}: {
  post: CommunityPost;
  onPress?: () => void;
  onToggleLike: () => void;
  onComment: () => void;
  bodyLines?: number;
}) {
  const theme = useTheme();
  const author = post.author?.name ?? 'Hommie user';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        backgroundColor: theme.colors.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        opacity: pressed ? 0.97 : 1,
        ...theme.shadows.sm,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
        <Avatar uri={post.author?.avatarUrl} name={author} size={44} />
        <View style={{ flex: 1 }}>
          <Text variant="h3" numberOfLines={1} style={{ fontSize: 16 }}>
            {author}
          </Text>
          <Text variant="caption" muted>
            {timeAgo(post.createdAt)}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: theme.colors.primarySubtle,
            borderRadius: theme.radius.md,
            paddingHorizontal: 10,
            paddingVertical: 5,
          }}
        >
          <Text variant="caption" color={theme.colors.primarySubtleInk} style={{ fontWeight: '600' }}>
            {communityCategoryLabels[post.category]}
          </Text>
        </View>
      </View>

      <Text variant="body" numberOfLines={onPress ? bodyLines : undefined} style={{ fontSize: 15, lineHeight: 22 }}>
        {post.body}
      </Text>

      {post.images[0] ? (
        <Image
          source={{ uri: post.images[0] }}
          style={{ width: '100%', height: 200, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSunken }}
          contentFit="cover"
          transition={160}
        />
      ) : null}

      <View style={{ height: 1, backgroundColor: theme.colors.border }} />

      <View style={{ flexDirection: 'row', gap: theme.spacing.xl }}>
        <Pressable
          onPress={onToggleLike}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={post.likedByMe ? 'Unlike' : 'Like'}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons
            name={post.likedByMe ? 'heart' : 'heart-outline'}
            size={19}
            color={post.likedByMe ? theme.colors.danger : theme.colors.textSecondary}
          />
          <Text variant="bodySm" color={theme.colors.textSecondary}>
            {post.likesCount}
          </Text>
        </Pressable>

        <Pressable
          onPress={onComment}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Comments"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textSecondary} />
          <Text variant="bodySm" color={theme.colors.textSecondary}>
            {post.commentsCount}
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
