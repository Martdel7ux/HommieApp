import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { eventsApi, type EventDetail, type RsvpState } from './api';

export function useEvents(scope: 'upcoming' | 'going') {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...qk.events, scope],
    queryFn: () => eventsApi.list({ scope, userId: user!.id }),
    enabled: !!user,
  });
}

export function useEvent(eventId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: qk.event(eventId),
    queryFn: () => eventsApi.get(eventId, user!.id),
    enabled: !!user && !!eventId,
  });
}

/** Toggle the viewer's RSVP for an event, optimistically updating the detail cache. */
export function useEventRsvp(eventId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = qk.event(eventId);

  return useMutation({
    mutationFn: (next: RsvpState | null) => eventsApi.setRsvp(eventId, user!.id, next),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<EventDetail>(key);
      if (prev) {
        const had = prev.myRsvp !== null;
        const has = next !== null;
        queryClient.setQueryData<EventDetail>(key, {
          ...prev,
          myRsvp: next,
          rsvp_count: Math.max(0, prev.rsvp_count + (has ? 0 : -1) + (!had && has ? 1 : 0)),
        });
      }
      analytics.track('event_rsvp_changed', { event_id: eventId, state: next ?? 'none' });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(key, ctx.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      queryClient.invalidateQueries({ queryKey: qk.events });
    },
  });
}
