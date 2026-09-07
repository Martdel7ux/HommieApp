import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Screen, LoadingState, ErrorState } from '@/components/ui';
import { ListingWizard } from '@/features/landlord/components/ListingWizard';
import { useLandlordListing } from '@/features/landlord/hooks';
import { draftFromListing } from '@/features/landlord/listingForm';

export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const listing = useLandlordListing(id);

  if (listing.isLoading) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (listing.isError || !listing.data) {
    return (
      <Screen>
        <ErrorState message="Couldn't load this listing." onRetry={() => listing.refetch()} />
      </Screen>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ListingWizard
        mode="edit"
        listingId={id}
        initialDraft={draftFromListing(listing.data)}
        onExit={() => (router.canGoBack() ? router.back() : router.replace(`/listing/${id}`))}
        onDone={() => router.replace(`/listing/${id}`)}
      />
    </>
  );
}
