import { useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen, Text, SegmentedControl, LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { useTheme } from '@/theme';
import { EnquiryCard } from '@/features/landlord/components/EnquiryCard';
import { useMyEnquiries, useOpenEnquiry } from '@/features/landlord/hooks';

type Filter = 'all' | 'unread';

export default function LandlordEnquiries() {
  const theme = useTheme();
  const router = useRouter();
  const enquiries = useMyEnquiries();
  const openEnquiry = useOpenEnquiry();
  const [filter, setFilter] = useState<Filter>('all');

  const rows = useMemo(() => {
    const all = enquiries.data ?? [];
    return filter === 'unread' ? all.filter((e) => !e.is_read) : all;
  }, [enquiries.data, filter]);

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <Text variant="h1">Enquiries</Text>
      {(enquiries.data?.length ?? 0) > 0 ? (
        <SegmentedControl<Filter>
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      ) : null}
    </View>
  );

  if (enquiries.isError) {
    return (
      <Screen>
        {header}
        <ErrorState message="Couldn't load your enquiries." onRetry={() => enquiries.refetch()} />
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <EnquiryCard
            enquiry={item}
            onPress={() =>
              openEnquiry.mutate(item, {
                onSuccess: (conversationId) => router.push(`/messages/${conversationId}`),
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: theme.spacing.sm }} />}
        contentContainerStyle={{
          paddingHorizontal: theme.layout.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing['4xl'],
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
        refreshing={enquiries.isRefetching}
        onRefresh={() => enquiries.refetch()}
        ListEmptyComponent={
          enquiries.isLoading ? (
            <LoadingState />
          ) : filter === 'unread' ? (
            <EmptyState icon="checkmark-done-outline" title="All caught up" message="No unread enquiries." />
          ) : (
            <EmptyState
              icon="mail-outline"
              title="No enquiries yet"
              message="When a student enquires about one of your listings, it shows up here."
            />
          )
        }
      />
    </Screen>
  );
}
