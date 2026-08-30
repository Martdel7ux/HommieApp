import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Screen, Text, Button, ChipGroup, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { communityCategoryLabels, enumOptions } from '@/config/labels';
import { useCreatePost } from '@/features/community/hooks';
import { toAppError } from '@/services/errors';
import type { CommunityCategory } from '@/types/database';

export default function NewPost() {
  const theme = useTheme();
  const router = useRouter();
  const create = useCreatePost();

  const [category, setCategory] = useState<CommunityCategory>('general');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canPost = body.trim().length >= 3 && !create.isPending;

  const submit = () => {
    setError(null);
    create.mutate(
      { category, body },
      {
        onSuccess: () => router.back(),
        onError: (e) => setError(toAppError(e).message),
      },
    );
  };

  return (
    <Screen keyboardAvoiding>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'New post',
          headerStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerTintColor: theme.colors.textPrimary,
        }}
      />
      <View style={{ flex: 1, gap: theme.spacing.lg, paddingTop: theme.spacing.md }}>
        {error ? <Banner tone="danger" message={error} /> : null}

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Category
          </Text>
          <ChipGroup
            options={enumOptions(communityCategoryLabels)}
            value={category}
            onChange={(v) => setCategory(v as CommunityCategory)}
          />
        </View>

        <View style={{ flex: 1, gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Your post
          </Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Ask a question, share a tip, or start a conversation…"
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={4000}
            style={{
              flex: 1,
              backgroundColor: theme.colors.surface,
              borderWidth: 1,
              borderColor: theme.colors.border,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              fontSize: 15,
              lineHeight: 22,
              color: theme.colors.textPrimary,
              textAlignVertical: 'top',
            }}
          />
          <Text variant="caption" muted align="right">
            {body.length}/4000 · Photos coming soon
          </Text>
        </View>

        <Button title="Post" loading={create.isPending} disabled={!canPost} onPress={submit} />
      </View>
    </Screen>
  );
}
