import { useState } from 'react';
import { Alert, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useMutation } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  Button,
  Avatar,
  LoadingState,
  ErrorState,
  OverlayHeader,
  OverlayIconButton,
} from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { timeAgo } from '@/lib/datetime';
import { toAppError } from '@/services/errors';
import { analytics } from '@/services/analytics';
import { supabase } from '@/lib/supabase';
import { messagingApi } from '@/features/messaging/api';
import { marketplaceConditionLabels, marketplaceCategoryLabels } from '@/config/labels';
import { itemImages, priceLabel } from '@/features/marketplace/api';
import { useMarketplaceItem, useSavedMarketplace } from '@/features/marketplace/hooks';

export default function MarketplaceItem() {
  const theme = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();

  const item = useMarketplaceItem(id);
  const { savedIds, toggle } = useSavedMarketplace();
  const saved = savedIds.includes(id);
  const [imgIndex, setImgIndex] = useState(0);

  const isMine = !!user && item.data?.seller?.id === user.id;
  const images = itemImages(item.data?.images);

  const contact = useMutation({
    mutationFn: () =>
      messagingApi.startConversation(item.data!.seller!.id, {
        context: 'marketplace',
        marketplaceListingId: id,
      }),
    onSuccess: (conversationId) => {
      analytics.track('marketplace_seller_contact_started', { item_id: id });
      router.push(`/messages/${conversationId}`);
    },
    onError: (e) => Alert.alert('Could not start the chat', toAppError(e).message),
  });

  const report = () => {
    Alert.alert('Report this listing', 'Why are you reporting it?', [
      ...(['scam_or_fraud', 'inappropriate', 'spam', 'other'] as const).map((reason) => ({
        text: reason.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        onPress: async () => {
          await supabase.from('reports').insert({
            reporter_id: user!.id,
            subject_type: 'marketplace_listing' as never,
            subject_id: id,
            reason: reason as never,
          });
          Alert.alert('Thanks', 'Our team will take a look.');
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {item.isLoading ? (
        <LoadingState />
      ) : item.isError || !item.data ? (
        <ErrorState message="Couldn't load this listing." onRetry={() => item.refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingBottom: theme.spacing['6xl'] + 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View>
            {images.length ? (
              <View>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) =>
                    setImgIndex(Math.round(e.nativeEvent.contentOffset.x / width))
                  }
                >
                  {images.map((uri) => (
                    <Image
                      key={uri}
                      source={{ uri }}
                      style={{ width, height: width * 0.9, backgroundColor: theme.colors.primarySubtle }}
                      contentFit="cover"
                      transition={200}
                    />
                  ))}
                </ScrollView>
                {images.length > 1 ? (
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 12,
                      alignSelf: 'center',
                      flexDirection: 'row',
                      gap: 6,
                    }}
                  >
                    {images.map((uri, i) => (
                      <View
                        key={uri}
                        style={{
                          width: i === imgIndex ? 18 : 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: i === imgIndex ? theme.colors.onPrimary : 'rgba(255,255,255,0.6)',
                        }}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            ) : (
              <View
                style={{
                  width: '100%',
                  height: width * 0.7,
                  backgroundColor: theme.colors.primarySubtle,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="pricetag-outline" size={40} color={theme.colors.primary} />
              </View>
            )}

              <OverlayHeader
                onBack={() => router.back()}
                right={
                  <>
                    {!isMine ? (
                      <OverlayIconButton
                        icon={saved ? 'heart' : 'heart-outline'}
                        label={saved ? 'Remove from saved' : 'Save item'}
                        tint={saved ? theme.colors.danger : theme.colors.textPrimary}
                        onPress={() => toggle(id, !saved)}
                      />
                    ) : null}
                    <OverlayIconButton
                      icon="ellipsis-horizontal"
                      label="Report listing"
                      tint={theme.colors.textSecondary}
                      onPress={report}
                    />
                  </>
                }
              />
            </View>

            <View style={{ padding: theme.layout.screenPadding, gap: theme.spacing.lg }}>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                  <Text variant="h1" style={{ flex: 1 }}>
                    {item.data.title}
                  </Text>
                  <Text variant="h1" color={theme.colors.primary}>
                    {priceLabel(item.data)}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Ionicons name="location-outline" size={14} color={theme.colors.textTertiary} />
                  <Text variant="bodySm" muted>
                    {[item.data.area, item.data.city].filter(Boolean).join(', ')} · listed{' '}
                    {timeAgo(item.data.created_at)}
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                {[
                  marketplaceCategoryLabels[item.data.category],
                  marketplaceConditionLabels[item.data.condition],
                  item.data.status === 'reserved' ? 'Reserved' : null,
                ]
                  .filter(Boolean)
                  .map((chip) => (
                    <View
                      key={chip}
                      style={{
                        backgroundColor: theme.colors.primarySubtle,
                        borderRadius: theme.radius.pill,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text variant="caption" color={theme.colors.primarySubtleInk}>
                        {chip}
                      </Text>
                    </View>
                  ))}
              </View>

              {item.data.description ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Text variant="h3">Description</Text>
                  <Text variant="body" style={{ lineHeight: 22, color: theme.colors.textSecondary }}>
                    {item.data.description}
                  </Text>
                </View>
              ) : null}

              {item.data.seller ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: theme.spacing.md,
                    backgroundColor: theme.colors.surfaceAlt,
                    borderRadius: theme.radius.lg,
                    padding: theme.spacing.lg,
                  }}
                >
                  <Avatar uri={item.data.seller.avatarUrl} name={item.data.seller.name} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text variant="label" color={theme.colors.textSecondary}>
                      Seller
                    </Text>
                    <Text variant="h3" style={{ fontSize: 15 }}>
                      {item.data.seller.name}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </ScrollView>

          <SafeAreaView
            edges={['bottom']}
            style={{
              backgroundColor: theme.colors.surface,
              borderTopWidth: 1,
              borderTopColor: theme.colors.border,
            }}
          >
            <View style={{ padding: theme.spacing.lg }}>
              {isMine ? (
                <Text variant="bodySm" muted align="center">
                  This is your listing.
                </Text>
              ) : (
                <Button
                  title="Message seller"
                  loading={contact.isPending}
                  onPress={() => contact.mutate()}
                  leftIcon={
                    <Ionicons name="chatbubble-outline" size={16} color={theme.colors.onPrimary} />
                  }
                />
              )}
            </View>
          </SafeAreaView>
        </>
      )}
    </View>
  );
}
