import type { ReactNode } from 'react';
import { useState } from 'react';
import { Modal, Pressable, Switch, TextInput, View, useWindowDimensions } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Button, Avatar, LoadingState, ErrorState, OverlayHeader, OverlayIconButton } from '@/components/ui';
import { useTheme } from '@/theme';
import { useAuth } from '@/features/auth/AuthProvider';
import { promptSignIn } from '@/features/auth/guestPrompt';
import { toAppError } from '@/services/errors';
import { notify } from '@/services/alert';
import { analytics } from '@/services/analytics';
import { resolveImage } from '@/lib/images';
import { amenityLabels } from '@/config/labels';
import { useListing, useSimilarListings, useSendEnquiry } from '@/features/accommodation/hooks';
import { landlordDisplayName } from '@/features/accommodation/landlordDisplay';
import type { AccommodationCard, AccommodationDetail } from '@/features/accommodation/types';

const AMENITY_ICON: Record<string, [typeof Ionicons | typeof MaterialCommunityIcons, string]> = {
  wifi: [Ionicons, 'wifi'],
  air_conditioning: [Ionicons, 'snow-outline'],
  heating: [Ionicons, 'flame-outline'],
  washing_machine: [MaterialCommunityIcons, 'washing-machine'],
  dishwasher: [MaterialCommunityIcons, 'dishwasher'],
  furnished: [Ionicons, 'bed-outline'],
  balcony: [MaterialCommunityIcons, 'window-open-variant'],
  parking: [Ionicons, 'car-outline'],
  elevator: [MaterialCommunityIcons, 'elevator-passenger'],
  pet_friendly: [Ionicons, 'paw-outline'],
  study_desk: [MaterialCommunityIcons, 'desk-lamp'],
  near_bus_stop: [Ionicons, 'bus-outline'],
  private_bathroom: [MaterialCommunityIcons, 'shower'],
};

function walkMinutes(km: number | null | undefined): number | null {
  if (km == null) return null;
  return Math.max(1, Math.round(km * 12));
}

function FeatureTile({ icon, label }: { icon: ReactNode; label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: 6,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.md,
        paddingVertical: theme.spacing.md,
      }}
    >
      {icon}
      <Text variant="label">{label}</Text>
    </View>
  );
}

function SimilarCard({ card, onPress }: { card: AccommodationCard; onPress: () => void }) {
  const theme = useTheme();
  const cover = resolveImage([...(card.images ?? [])].sort((a, b) => a.position - b.position)[0]?.storage_path);
  const mins = walkMinutes(card.distance_to_campus_km);
  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 190,
        borderRadius: theme.radius.lg,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
      }}
    >
      <View>
        <Image
          source={{ uri: cover }}
          style={{ width: '100%', height: 116, backgroundColor: theme.colors.primarySubtle }}
          contentFit="cover"
          transition={150}
        />
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.pill,
            paddingHorizontal: 8,
            paddingVertical: 3,
          }}
        >
          <Text variant="caption" color={theme.colors.primary} style={{ fontWeight: '800' }}>
            €{card.rent_month}
          </Text>
        </View>
      </View>
      <View style={{ padding: theme.spacing.md, gap: 4 }}>
        <Text variant="label" numberOfLines={1}>
          {card.title}
        </Text>
        {mins != null ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="walk-outline" size={13} color={theme.colors.textTertiary} />
            <Text variant="caption" muted>
              {mins} mins
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function ToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text variant="body">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
        thumbColor={theme.colors.surface}
      />
    </View>
  );
}

function EnquirySheet({
  visible,
  listing,
  onClose,
  onSent,
}: {
  visible: boolean;
  listing: AccommodationDetail;
  onClose: () => void;
  onSent: (conversationId: string) => void;
}) {
  const theme = useTheme();
  const send = useSendEnquiry(listing.id);
  const [message, setMessage] = useState(
    `Hi, I'm interested in "${listing.title}". Is it still available?`,
  );
  const [shareMoveIn, setShareMoveIn] = useState(true);
  const [shareBudget, setShareBudget] = useState(false);
  const [shareUniversity, setShareUniversity] = useState(true);

  const submit = () => {
    if (!listing.landlord) return;
    send.mutate(
      {
        landlordId: listing.landlord.id,
        message,
        shareMoveIn,
        shareBudget,
        shareUniversity,
      },
      {
        onSuccess: (conversationId) => onSent(conversationId),
        onError: (e) => notify('Could not send', toAppError(e).message),
      },
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: theme.colors.overlay }} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={{
          backgroundColor: theme.colors.background,
          borderTopLeftRadius: theme.radius.xl,
          borderTopRightRadius: theme.radius.xl,
        }}
      >
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text variant="h3">Contact the landlord</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
            placeholder="Introduce yourself and ask a question…"
            placeholderTextColor={theme.colors.textTertiary}
            style={{
              minHeight: 96,
              backgroundColor: theme.colors.surfaceAlt,
              borderRadius: theme.radius.lg,
              padding: theme.spacing.lg,
              fontSize: 15,
              lineHeight: 21,
              color: theme.colors.textPrimary,
              textAlignVertical: 'top',
            }}
          />

          <View style={{ gap: theme.spacing.md }}>
            <Text variant="label" color={theme.colors.textSecondary}>
              Share with this landlord
            </Text>
            <ToggleRow label="My move-in date" value={shareMoveIn} onValueChange={setShareMoveIn} />
            <ToggleRow label="My budget" value={shareBudget} onValueChange={setShareBudget} />
            <ToggleRow label="My university" value={shareUniversity} onValueChange={setShareUniversity} />
          </View>

          <Button
            title="Send enquiry"
            loading={send.isPending}
            disabled={message.trim().length < 2}
            onPress={submit}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function ListingDetail() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  // On native this screen is always genuinely full-device-width, so
  // windowWidth is already correct. On web, WebAppFrame constrains this
  // screen to a centered column narrower than the browser window — using
  // windowWidth directly here made the gallery images render wider than
  // their actual container (and broke the swipe-to-index paging math,
  // which divides scroll offset by this same width). Measure the gallery's
  // real rendered width instead, falling back to windowWidth only until
  // the first layout pass has happened.
  const [galleryWidth, setGalleryWidth] = useState(0);
  const width = galleryWidth || windowWidth;
  const { id } = useLocalSearchParams<{ id: string }>();

  const listing = useListing(id);
  const similar = useSimilarListings(listing.data);
  const [imgIndex, setImgIndex] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const d = listing.data;
  const images = d
    ? [...(d.images ?? [])].sort((a, b) => a.position - b.position).map((i) => resolveImage(i.storage_path)).filter((u): u is string => !!u)
    : [];
  const uniName = d?.nearest_university?.name ?? d?.nearest_university?.short_name ?? null;
  const walk = walkMinutes(d?.distance_to_campus_km);
  const landlordName = landlordDisplayName(d?.landlord ?? null);
  const verified = d?.landlord?.landlord_profile?.verification === 'verified';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Stack.Screen options={{ headerShown: false }} />

      {listing.isLoading ? (
        <LoadingState />
      ) : listing.isError || !d ? (
        <ErrorState message="Couldn't load this property." onRetry={() => listing.refetch()} />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingBottom: theme.spacing['6xl'] + 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Gallery */}
            <View onLayout={(e) => setGalleryWidth(e.nativeEvent.layout.width)}>
              {images.length ? (
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
                      style={{ width, height: width * 0.82, backgroundColor: theme.colors.primarySubtle }}
                      contentFit="cover"
                      transition={150}
                    />
                  ))}
                </ScrollView>
              ) : (
                <View style={{ width, height: width * 0.7, backgroundColor: theme.colors.primarySubtle }} />
              )}

              <OverlayHeader
                onBack={() => router.back()}
                right={
                  <OverlayIconButton
                    icon="notifications-outline"
                    label="Notifications"
                    onPress={() =>
                      user
                        ? router.push('/notifications')
                        : promptSignIn(router, 'Sign in to see your notifications.')
                    }
                  />
                }
              />

              {images.length > 1 ? (
                <View
                  style={{
                    position: 'absolute',
                    right: theme.spacing.lg,
                    bottom: theme.spacing.xl,
                    backgroundColor: 'rgba(0,0,0,0.55)',
                    borderRadius: theme.radius.pill,
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                  }}
                >
                  <Text variant="caption" color="#FFFFFF">
                    {imgIndex + 1} / {images.length}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Body card */}
            <View
              style={{
                marginTop: -theme.spacing['2xl'],
                backgroundColor: theme.colors.background,
                borderTopLeftRadius: theme.radius['2xl'],
                borderTopRightRadius: theme.radius['2xl'],
                padding: theme.layout.screenPadding,
                gap: theme.spacing.xl,
              }}
            >
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
                  <Text variant="h1" style={{ flex: 1 }}>
                    {d.title}
                  </Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text variant="h1" color={theme.colors.primary}>
                      €{d.rent_month}
                    </Text>
                    <Text variant="caption" muted>
                      per month
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location-outline" size={15} color={theme.colors.textTertiary} />
                  <Text variant="bodySm" muted>
                    {d.area}, {d.city}
                  </Text>
                </View>
                {d.bills_included ? (
                  <View
                    style={{
                      alignSelf: 'flex-start',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: theme.colors.successSubtle,
                      borderRadius: theme.radius.pill,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Ionicons name="receipt-outline" size={13} color={theme.colors.success} />
                    <Text variant="caption" color={theme.colors.success} style={{ fontWeight: '700' }}>
                      Bills Included
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Feature tiles */}
              <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
                <FeatureTile
                  icon={<Ionicons name="bed-outline" size={20} color={theme.colors.textSecondary} />}
                  label={d.bedrooms === 0 ? 'Studio' : `${d.bedrooms} Bed`}
                />
                <FeatureTile
                  icon={<MaterialCommunityIcons name="shower" size={20} color={theme.colors.textSecondary} />}
                  label={`${d.bathrooms} Bath`}
                />
                <FeatureTile
                  icon={<MaterialCommunityIcons name="sofa-outline" size={20} color={theme.colors.textSecondary} />}
                  label={d.furnished ? 'Furnished' : 'Unfurnished'}
                />
              </View>

              {uniName && walk != null ? (
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
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 19,
                      backgroundColor: theme.colors.surface,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="walk-outline" size={19} color={theme.colors.primary} />
                  </View>
                  <Text variant="body" style={{ flex: 1 }}>
                    {walk} min walk from {uniName}
                  </Text>
                </View>
              ) : null}

              {d.description ? (
                <View style={{ gap: theme.spacing.sm }}>
                  <Text variant="h3">About this property</Text>
                  <Text variant="body" style={{ lineHeight: 22, color: theme.colors.textSecondary }}>
                    {d.description}
                  </Text>
                </View>
              ) : null}

              {d.amenities.length ? (
                <View style={{ gap: theme.spacing.md }}>
                  <Text variant="h3">Amenities</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {d.amenities.map((a) => {
                      const [IconSet, name] = AMENITY_ICON[a] ?? [Ionicons, 'checkmark-circle-outline'];
                      return (
                        <View
                          key={a}
                          style={{
                            width: '50%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            paddingVertical: 6,
                          }}
                        >
                          {/* @ts-expect-error icon name is validated by the map */}
                          <IconSet name={name} size={18} color={theme.colors.primary} />
                          <Text variant="bodySm">{amenityLabels[a] ?? a.replace(/_/g, ' ')}</Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              {/* Landlord */}
              {d.landlord ? (
                <View style={{ gap: theme.spacing.md }}>
                  <Text variant="h3">Listed by</Text>
                  <Pressable
                    onPress={() => router.push(`/landlord/${d.landlord!.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${landlordName}'s profile`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: theme.radius.lg,
                      padding: theme.spacing.lg,
                    }}
                  >
                    <Avatar uri={d.landlord.avatar_url} name={landlordName} size={44} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text variant="h3" style={{ fontSize: 15 }}>
                          {landlordName}
                        </Text>
                        {verified ? (
                          <Ionicons name="checkmark-circle" size={15} color={theme.colors.verifiedBadge} />
                        ) : null}
                      </View>
                      <Text variant="caption" muted>
                        {verified ? 'Hommie Verified landlord' : 'Landlord on Hommie'}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSheetOpen(true)}
                      accessibilityLabel="Message landlord"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: theme.colors.primarySubtle,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
                    </Pressable>
                  </Pressable>
                </View>
              ) : null}

              {/* Similar */}
              {(similar.data?.length ?? 0) > 0 ? (
                <View style={{ gap: theme.spacing.md }}>
                  <Text variant="h3">
                    Similar{uniName ? ` near ${d.nearest_university?.short_name ?? uniName}` : ''}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -theme.layout.screenPadding }}
                    contentContainerStyle={{ paddingHorizontal: theme.layout.screenPadding, gap: theme.spacing.md }}
                  >
                    {similar.data!.map((card) => (
                      <SimilarCard
                        key={card.id}
                        card={card}
                        onPress={() => {
                          analytics.track('listing_viewed', { listing_id: card.id, source: 'listing_similar' });
                          router.push(`/accommodation/${card.id}`);
                        }}
                      />
                    ))}
                  </ScrollView>
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
              <Button
                title="Contact Landlord"
                disabled={!!user && !d.landlord}
                onPress={() => {
                  if (!user) {
                    promptSignIn(router, 'Create a free account to contact landlords.');
                    return;
                  }
                  analytics.track('listing_contact_started', { listing_id: d.id });
                  setSheetOpen(true);
                }}
                leftIcon={<Ionicons name="mail-outline" size={17} color={theme.colors.onPrimary} />}
              />
            </View>
          </SafeAreaView>

          {sheetOpen && d.landlord ? (
            <EnquirySheet
              visible={sheetOpen}
              listing={d}
              onClose={() => setSheetOpen(false)}
              onSent={(conversationId) => {
                setSheetOpen(false);
                router.push(`/messages/${conversationId}`);
              }}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
