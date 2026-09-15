import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Text, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';
import { EnquiryCard } from '@/features/landlord/components/EnquiryCard';
import { useMyEnquiries, useOpenEnquiry } from '@/features/landlord/hooks';

export default function LandlordLeads() {
  const theme = useTheme();
  const router = useRouter();
  const enquiries = useMyEnquiries();
  const openEnquiry = useOpenEnquiry();

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel="Go back">
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text variant="h1">Interested Students</Text>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          {enquiries.isLoading ? (
            <LoadingState />
          ) : enquiries.isError ? (
            <ErrorState message="Couldn't load your enquiries." onRetry={() => enquiries.refetch()} />
          ) : !enquiries.data?.length ? (
            <EmptyState
              icon="mail-outline"
              title="No enquiries yet"
              message="When a student messages about one of your listings, it shows up here."
            />
          ) : (
            <>
              <Text variant="bodySm" muted>
                {enquiries.data.length} {enquiries.data.length === 1 ? 'inquiry' : 'inquiries'} received
              </Text>
              {enquiries.data.map((e) => (
                <EnquiryCard
                  key={e.id}
                  enquiry={e}
                  onPress={() =>
                    openEnquiry.mutate(e, {
                      onSuccess: (conversationId) => router.push(`/messages/${conversationId}`),
                    })
                  }
                />
              ))}
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}
