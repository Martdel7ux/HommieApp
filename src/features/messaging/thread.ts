import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { qk } from '@/lib/queryClient';
import { PAGE_SIZE } from '@/config/constants';
import { useAuth } from '@/features/auth/AuthProvider';
import { analytics } from '@/services/analytics';
import { toAppError } from '@/services/errors';
import { messagingApi } from './api';
import type { ChatMessage } from './types';

type MsgPages = InfiniteData<ChatMessage[], unknown>;

export function useConversation(conversationId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['conversation', conversationId],
    enabled: !!user && !!conversationId,
    queryFn: () => messagingApi.getConversation(conversationId, user!.id),
  });
}

export function useThread(conversationId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = qk.messages(conversationId);

  const query = useInfiniteQuery({
    queryKey: key,
    enabled: !!user && !!conversationId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      messagingApi.listMessages(conversationId, { before: pageParam, limit: PAGE_SIZE.messages }),
    getNextPageParam: (lastPage) =>
      lastPage.length < PAGE_SIZE.messages ? undefined : lastPage[lastPage.length - 1]?.createdAt,
  });

  // newest-first flat list (for an inverted FlatList)
  const messages = useMemo<ChatMessage[]>(
    () => query.data?.pages.flat() ?? [],
    [query.data],
  );

  const upsertMessage = useCallback(
    (msg: ChatMessage) => {
      queryClient.setQueryData<MsgPages>(key, (prev) => {
        if (!prev) return prev;
        const exists = prev.pages.some((p) => p.some((m) => m.id === msg.id));
        if (exists) {
          return {
            ...prev,
            pages: prev.pages.map((p) => p.map((m) => (m.id === msg.id ? msg : m))),
          };
        }
        const [first, ...rest] = prev.pages;
        return { ...prev, pages: [[msg, ...(first ?? [])], ...rest] };
      });
    },
    [queryClient, key],
  );

  const removeMessage = useCallback(
    (id: string) => {
      queryClient.setQueryData<MsgPages>(key, (prev) =>
        prev ? { ...prev, pages: prev.pages.map((p) => p.filter((m) => m.id !== id)) } : prev,
      );
    },
    [queryClient, key],
  );

  // realtime: append incoming messages from the other participant
  useEffect(() => {
    if (!conversationId || !user) return;
    const channel = supabase
      .channel(`thread:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const m = payload.new as { id: string; sender_id: string; body: string; created_at: string };
          if (m.sender_id === user.id) return; // our own send is handled by the mutation
          upsertMessage({ id: m.id, senderId: m.sender_id, body: m.body, createdAt: m.created_at });
          messagingApi.markRead(conversationId).catch(() => undefined);
          queryClient.invalidateQueries({ queryKey: qk.conversations });
          queryClient.invalidateQueries({ queryKey: qk.unreadConversations });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user, upsertMessage, queryClient]);

  // mark read on open
  const marked = useRef(false);
  useEffect(() => {
    if (marked.current || !conversationId || query.isLoading) return;
    marked.current = true;
    messagingApi.markRead(conversationId).then(() => {
      queryClient.invalidateQueries({ queryKey: qk.conversations });
      queryClient.invalidateQueries({ queryKey: qk.unreadConversations });
    });
  }, [conversationId, query.isLoading, queryClient]);

  const send = useMutation({
    mutationFn: (body: string) => messagingApi.sendMessage(conversationId, user!.id, body),
    onMutate: (body): { tempId: string } => {
      const tempId = `temp-${Date.now()}`;
      upsertMessage({
        id: tempId,
        senderId: user!.id,
        body: body.trim(),
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
      analytics.track('message_sent', { conversation_id: conversationId, context: 'thread' });
      return { tempId };
    },
    onSuccess: (real, _body, ctx) => {
      removeMessage(ctx.tempId);
      upsertMessage(real);
      queryClient.invalidateQueries({ queryKey: qk.conversations });
    },
    onError: (err, body, ctx) => {
      if (ctx) {
        upsertMessage({
          id: ctx.tempId,
          senderId: user!.id,
          body: body.trim(),
          createdAt: new Date().toISOString(),
          status: 'failed',
        });
      }
      analytics.track('message_send_failed', { conversation_id: conversationId });
      toAppError(err);
    },
  });

  const retry = useCallback(
    (failed: ChatMessage) => {
      removeMessage(failed.id);
      analytics.track('message_send_retried', { conversation_id: conversationId });
      send.mutate(failed.body);
    },
    [removeMessage, send, conversationId],
  );

  return {
    ...query,
    messages,
    sendMessage: (body: string) => send.mutate(body),
    retry,
    isSending: send.isPending,
  };
}
