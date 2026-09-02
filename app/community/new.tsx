import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, ChipGroup, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { IMAGE_UPLOAD } from '@/config/constants';
import { communityCategoryLabels, enumOptions } from '@/config/labels';
import { useCreatePost } from '@/features/community/hooks';
import { toAppError } from '@/services/errors';
import type { CommunityCategory } from '@/types/database';

interface Photo {
  uri: string;
  mimeType?: string | null;
}

const MAX = IMAGE_UPLOAD.maxCommunityImages;

export default function NewPost() {
  const theme = useTheme();
  const router = useRouter();
  const create = useCreatePost();

  const [category, setCategory] = useState<CommunityCategory>('general');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const canPost = (body.trim().length >= 3 || photos.length > 0) && !create.isPending;

  const addPhotos = async () => {
    if (photos.length >= MAX) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission needed', 'Enable photo access in Settings to add pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX - photos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    setPhotos((prev) =>
      [...prev, ...result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }))].slice(0, MAX),
    );
  };

  const submit = () => {
    setError(null);
    create.mutate(
      { category, body, photos },
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
          headerBackButtonDisplayMode: 'minimal',
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
            {body.length}/4000
          </Text>
        </View>

        {/* Photos */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {photos.map((photo, i) => (
            <View key={photo.uri} style={{ width: 76, height: 76 }}>
              <Image
                source={{ uri: photo.uri }}
                style={{ width: '100%', height: '100%', borderRadius: theme.radius.md }}
                contentFit="cover"
              />
              <Pressable
                onPress={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                hitSlop={6}
                accessibilityLabel="Remove photo"
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: theme.colors.textPrimary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={12} color={theme.colors.surface} />
              </Pressable>
            </View>
          ))}
          {photos.length < MAX ? (
            <Pressable
              onPress={addPhotos}
              accessibilityLabel="Add photos"
              style={{
                width: 76,
                height: 76,
                borderRadius: theme.radius.md,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.colors.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
                gap: 2,
              }}
            >
              <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
              <Text variant="overline" color={theme.colors.textSecondary}>
                Photo
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Button title="Post" loading={create.isPending} disabled={!canPost} onPress={submit} />
      </View>
    </Screen>
  );
}
