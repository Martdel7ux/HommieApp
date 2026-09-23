import { useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Text, Button, Select, Banner } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { toAppError } from '@/services/errors';
import { marketplaceCategoryLabels, marketplaceConditionLabels, enumOptions } from '@/config/labels';
import { useCreateListing } from '@/features/marketplace/hooks';
import type { MarketplaceCategory, MarketplaceCondition } from '@/types/database';

interface Photo {
  uri: string;
  mimeType?: string | null;
}

const MAX_PHOTOS = 4;
const CONDITIONS: MarketplaceCondition[] = ['new', 'like_new', 'good', 'fair'];

export default function NewListing() {
  const theme = useTheme();
  const router = useRouter();
  const { profile } = useAuth();
  const create = useCreateListing();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | null>(null);
  const [condition, setCondition] = useState<MarketplaceCondition>('good');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  const filledInput = {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    fontSize: 15,
    color: theme.colors.textPrimary,
  } as const;

  const priceNum = Number(price.replace(/[^0-9.]/g, ''));
  const canPost =
    title.trim().length >= 3 && !!category && !Number.isNaN(priceNum) && !create.isPending;

  const pickPhotos = async () => {
    if (photos.length >= MAX_PHOTOS) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos permission needed', 'Enable photo access in Settings to add pictures.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.7,
    });
    if (result.canceled) return;
    setPhotos((prev) =>
      [...prev, ...result.assets.map((a) => ({ uri: a.uri, mimeType: a.mimeType }))].slice(0, MAX_PHOTOS),
    );
  };

  const submit = () => {
    setError(null);
    create.mutate(
      {
        title,
        price: priceNum || 0,
        isFree: !priceNum,
        category: category!,
        condition,
        description,
        city: profile?.city ?? 'Nicosia',
        area: profile?.campus_area ?? null,
        photos,
      },
      {
        onSuccess: (id) => router.replace(`/marketplace/${id}`),
        onError: (e) => setError(toAppError(e).message),
      },
    );
  };

  const slots = Array.from({ length: Math.min(MAX_PHOTOS, Math.max(2, photos.length + 1)) });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

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
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: theme.layout.screenPadding, paddingBottom: theme.spacing['5xl'], gap: theme.spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 4 }}>
          <Text variant="h1">Create Listing</Text>
          <Text variant="body" muted>
            Sell your items to students nearby.
          </Text>
        </View>

        {error ? <Banner tone="danger" message={error} /> : null}

        {/* Photos */}
        <View style={{ gap: theme.spacing.md }}>
          <Text variant="h3">Upload Photos</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
            {slots.map((_, i) => {
              const photo = photos[i];
              if (photo) {
                return (
                  <View key={photo.uri} style={{ width: 104, height: 104 }}>
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
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: theme.colors.textPrimary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="close" size={14} color={theme.colors.surface} />
                    </Pressable>
                    {i === 0 ? (
                      <View
                        style={{
                          position: 'absolute',
                          bottom: 4,
                          left: 4,
                          backgroundColor: theme.colors.primary,
                          borderRadius: theme.radius.sm,
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                        }}
                      >
                        <Text variant="overline" color={theme.colors.onPrimary}>
                          Main
                        </Text>
                      </View>
                    ) : null}
                  </View>
                );
              }
              const isFirst = i === 0;
              return (
                <Pressable
                  key={`slot-${i}`}
                  onPress={pickPhotos}
                  accessibilityLabel={isFirst ? 'Add main photo' : 'Add photo'}
                  style={{
                    width: 104,
                    height: 104,
                    borderRadius: theme.radius.md,
                    borderWidth: 1.5,
                    borderStyle: 'dashed',
                    borderColor: theme.colors.borderStrong,
                    backgroundColor: isFirst ? theme.colors.surfaceAlt : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={isFirst ? 'images' : 'image-outline'}
                    size={22}
                    color={isFirst ? theme.colors.primary : theme.colors.textTertiary}
                  />
                  {isFirst ? (
                    <Text variant="caption" color={theme.colors.textSecondary}>
                      Add Main Photo
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Text variant="caption" muted>
            First picture is the title picture. You can add up to {MAX_PHOTOS} photos.
          </Text>
        </View>

        {/* Item name */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Item Name
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Vintage Desk Lamp"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={120}
            style={filledInput}
          />
        </View>

        {/* Price */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Price (€)
          </Text>
          <View style={[filledInput, { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 0 }]}>
            <Text style={{ fontSize: 15 }} color={theme.colors.textTertiary}>
              €
            </Text>
            <TextInput
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="decimal-pad"
              style={{ flex: 1, fontSize: 15, color: theme.colors.textPrimary, paddingVertical: 14 }}
            />
          </View>
          <Text variant="caption" muted>
            Leave at 0 to list it as free.
          </Text>
        </View>

        {/* Category */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Category
          </Text>
          <Select
            filled
            placeholder="Select category"
            options={enumOptions(marketplaceCategoryLabels)}
            value={category}
            onChange={(v) => setCategory(v as MarketplaceCategory)}
          />
        </View>

        {/* Condition */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Condition
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {CONDITIONS.map((c) => {
              const active = c === condition;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCondition(c)}
                  style={{
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt,
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: theme.spacing.lg,
                    paddingVertical: 10,
                  }}
                >
                  <Text
                    variant="label"
                    color={active ? theme.colors.onPrimary : theme.colors.primarySubtleInk}
                  >
                    {marketplaceConditionLabels[c]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Description */}
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="label" color={theme.colors.textSecondary}>
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the item, any flaws, and why you are selling it..."
            placeholderTextColor={theme.colors.textTertiary}
            multiline
            maxLength={3000}
            style={[filledInput, { minHeight: 120, textAlignVertical: 'top', lineHeight: 21 }]}
          />
        </View>

        <Button
          title="Post Item"
          loading={create.isPending}
          disabled={!canPost}
          onPress={submit}
          leftIcon={<Ionicons name="rocket-outline" size={18} color={theme.colors.onPrimary} />}
        />
      </ScrollView>
    </View>
  );
}
