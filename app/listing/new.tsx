import { Stack, useRouter } from 'expo-router';
import { ListingWizard } from '@/features/landlord/components/ListingWizard';
import { emptyDraft } from '@/features/landlord/types';

export default function NewListing() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ListingWizard
        mode="create"
        initialDraft={emptyDraft}
        onExit={() => (router.canGoBack() ? router.back() : router.replace('/(landlord)/listings'))}
        onDone={(id) => router.replace(`/listing/${id}`)}
      />
    </>
  );
}
