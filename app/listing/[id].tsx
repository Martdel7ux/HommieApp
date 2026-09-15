import { Alert, View } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, Button, Card, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';
import { coverImage } from '@/features/accommodation/api';
import { propertyTypeLabels } from '@/config/labels';
import type { ListingStatus } from '@/types/database';
import { ListingStatusPill } from '@/features/landlord/components/ListingStatusPill';
import { EnquiryCard } from '@/features/landlord/components/EnquiryCard';
import {
  useLandlordListing,
  useMyEnquiries,
  useListingStatus,
  useDuplicateListing,
  useDeleteListing,
  useOpenEnquiry,
} from '@/features/landlord/hooks';

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        gap: 2,
        alignItems: 'center',
      }}
    >
      <Ionicons name={icon} size={16} color={theme.colors.primary} />
      <Text variant="h3">{value}</Text>
      <Text variant="caption" muted>
        {label}
      </Text>
    </View>
  );
}

/** Status buttons available from the current status. */
function statusActions(status: ListingStatus): { label: string; next: ListingStatus; variant?: 'primary' | 'secondary' | 'danger' }[] {
  switch (status) {
    case 'draft':
      return [{ label: 'Submit for review', next: 'pending_review' }];
    case 'pending_review':
      return [];
    case 'active':
      return [
        { label: 'Pause listing', next: 'paused', variant: 'secondary' },
        { label: 'Mark as rented', next: 'rented', variant: 'secondary' },
      ];
    case 'paused':
      return [
        { label: 'Re-activate', next: 'active' },
        { label: 'Archive', next: 'archived', variant: 'secondary' },
      ];
    case 'rented':
      return [
        { label: 'Re-activate', next: 'active' },
        { label: 'Archive', next: 'archived', variant: 'secondary' },
      ];
    case 'archived':
      return [{ label: 'Re-activate', next: 'active' }];
  }
}

export default function ManageListing() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const listing = useLandlordListing(id);
  const enquiries = useMyEnquiries(id);
  const status = useListingStatus();
  const duplicate = useDuplicateListing();
  const del = useDeleteListing();
  const openEnquiry = useOpenEnquiry();

  const busy = status.isPending || duplicate.isPending || del.isPending;

  if (listing.isLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Manage listing' }} />
        <LoadingState />
      </Screen>
    );
  }
  if (listing.isError || !listing.data) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, headerTitle: 'Manage listing' }} />
        <ErrorState message="Couldn't load this listing." onRetry={() => listing.refetch()} />
      </Screen>
    );
  }

  const l = listing.data;
  const cover = coverImage(l);

  const confirmDelete = () =>
    Alert.alert('Delete listing?', 'This removes the listing and its photos for good.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          del.mutate(id, {
            onSuccess: () => router.replace('/(landlord)/listings'),
            onError: (e) => Alert.alert('Could not delete', e.message),
          }),
      },
    ]);

  return (
    <Screen scroll>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: 'Manage listing',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />

      <View style={{ gap: theme.spacing.lg }}>
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {cover ? (
            <Image source={{ uri: cover }} style={{ width: '100%', height: 160 }} contentFit="cover" />
          ) : null}
          <View style={{ padding: theme.spacing.lg, gap: 6 }}>
            <ListingStatusPill status={l.status} />
            <Text variant="h2">{l.title}</Text>
            <Text variant="bodySm" muted>
              €{l.rent_month}/month · {propertyTypeLabels[l.property_type]} · {l.area}, {l.city}
            </Text>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.md }}>
          <Stat icon="eye-outline" label="Views" value={l.views_count} />
          <Stat icon="heart-outline" label="Saves" value={l.saves_count} />
          <Stat icon="mail-outline" label="Enquiries" value={l.enquiries_count} />
        </View>

        {l.status === 'pending_review' ? (
          <Text variant="bodySm" muted>
            Waiting on Hommie to review this listing before it goes live.
          </Text>
        ) : null}

        <View style={{ gap: theme.spacing.sm }}>
          {statusActions(l.status).map((a) => (
            <Button
              key={a.next}
              title={a.label}
              variant={a.variant ?? 'primary'}
              loading={status.isPending}
              disabled={busy}
              onPress={() => status.mutate({ id, status: a.next })}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <Button
            title="Edit"
            variant="secondary"
            fullWidth={false}
            leftIcon={<Ionicons name="create-outline" size={16} color={theme.colors.primaryPressed} />}
            onPress={() => router.push(`/listing/${id}/edit`)}
          />
          <Button
            title="View as student"
            variant="secondary"
            fullWidth={false}
            leftIcon={<Ionicons name="eye-outline" size={16} color={theme.colors.primaryPressed} />}
            onPress={() => router.push(`/accommodation/${id}`)}
          />
          <Button
            title="Duplicate"
            variant="secondary"
            fullWidth={false}
            loading={duplicate.isPending}
            disabled={busy}
            leftIcon={<Ionicons name="copy-outline" size={16} color={theme.colors.primaryPressed} />}
            onPress={() =>
              duplicate.mutate(id, {
                onSuccess: (newId) => router.replace(`/listing/${newId}`),
                onError: (e) => Alert.alert('Could not duplicate', e.message),
              })
            }
          />
          <Button
            title="Delete"
            variant="danger"
            fullWidth={false}
            disabled={busy}
            leftIcon={<Ionicons name="trash-outline" size={16} color={theme.colors.textInverse} />}
            onPress={confirmDelete}
          />
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="h3">Enquiries</Text>
          {enquiries.isLoading ? (
            <LoadingState />
          ) : !enquiries.data?.length ? (
            <EmptyState
              icon="mail-outline"
              title="No enquiries yet"
              message="When a student messages about this listing, it shows up here."
            />
          ) : (
            enquiries.data.map((e) => (
              <EnquiryCard
                key={e.id}
                enquiry={e}
                showListing={false}
                onPress={() =>
                  openEnquiry.mutate(e, {
                    onSuccess: (conversationId) => router.push(`/messages/${conversationId}`),
                  })
                }
              />
            ))
          )}
        </View>
      </View>
    </Screen>
  );
}
