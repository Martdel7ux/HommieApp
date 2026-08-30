import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, Card, SegmentedControl, EmptyState, ErrorState } from '@/components/ui';
import { useTheme } from '@/theme';
import { analytics } from '@/services/analytics';
import { useEvents } from '@/features/events/hooks';
import { EventListCard } from '@/features/events/components/EventListCard';

type Scope = 'upcoming' | 'going';

export default function EventsList() {
  const theme = useTheme();
  const router = useRouter();
  const [scope, setScope] = useState<Scope>('upcoming');

  const events = useEvents(scope);

  const header = (
    <View style={{ gap: theme.spacing.lg, paddingBottom: theme.spacing.md }}>
      <Text variant="h1">Events</Text>
      <SegmentedControl<Scope>
        options={[
          { value: 'upcoming', label: 'Upcoming', icon: 'calendar-outline' },
          { value: 'going', label: "I'm going", icon: 'checkmark-circle-outline' },
        ]}
        value={scope}
        onChange={setScope}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
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
          <Pressable
            onPress={() => router.push('/notifications')}
            hitSlop={10}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </SafeAreaView>

      {events.isError ? (
        <View style={{ flex: 1, paddingHorizontal: theme.layout.screenPadding }}>
          <View style={{ paddingTop: theme.spacing.md }}>{header}</View>
          <ErrorState message="Couldn't load events." onRetry={() => events.refetch()} />
        </View>
      ) : (
        <FlatList
          data={events.data ?? []}
          keyExtractor={(e) => e.id}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <EventListCard
              event={item}
              onPress={() => {
                analytics.track('event_viewed', { event_id: item.id });
                router.push(`/events/${item.id}`);
              }}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.lg }} />}
          contentContainerStyle={{
            paddingHorizontal: theme.layout.screenPadding,
            paddingTop: theme.spacing.md,
            paddingBottom: theme.spacing['5xl'],
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          refreshing={events.isRefetching}
          onRefresh={() => events.refetch()}
          ListEmptyComponent={
            events.isLoading ? (
              <View style={{ paddingVertical: theme.spacing['4xl'], alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
              </View>
            ) : (
              <Card style={{ marginTop: theme.spacing.md }}>
                <EmptyState
                  icon="calendar-outline"
                  title={scope === 'going' ? 'No RSVPs yet' : 'No upcoming events'}
                  message={
                    scope === 'going'
                      ? 'Events you RSVP to will show up here.'
                      : 'Student events across Cyprus will appear here. Check back soon.'
                  }
                  actionLabel={scope === 'going' ? 'Browse events' : undefined}
                  onAction={scope === 'going' ? () => setScope('upcoming') : undefined}
                />
              </Card>
            )
          }
        />
      )}
    </View>
  );
}
