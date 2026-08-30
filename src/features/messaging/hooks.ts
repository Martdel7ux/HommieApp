import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryClient';
import { useAuth } from '@/features/auth/AuthProvider';
import { messagingApi } from './api';

export function useConversations() {
  const { user, status } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: qk.conversations,
    enabled: status === 'signed_in' && !!user,
    queryFn: () => messagingApi.listConversations(user!.id),
  });

  // Realtime: refresh the inbox when a message lands or a conversation changes.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('inbox')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        queryClient.invalidateQueries({ queryKey: qk.conversations });
        queryClient.invalidateQueries({ queryKey: qk.unreadConversations });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants' }, () => {
        queryClient.invalidateQueries({ queryKey: qk.conversations });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return query;
}

export function useUnreadConversationCount() {
  const { status } = useAuth();
  return useQuery({
    queryKey: qk.unreadConversations,
    enabled: status === 'signed_in',
    staleTime: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('unread_conversation_count');
      if (error) throw error;
      return data ?? 0;
    },
  });
}
