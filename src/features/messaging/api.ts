import { supabase } from '@/lib/supabase';
import { resolveAvatar } from '@/lib/images';
import { guard } from '@/services/errors';
import type { ConversationSummary } from './types';

/** Raw shape of the participant->conversation embed. */
interface RawParticipant {
  last_read_at: string;
  archived: boolean;
  conversation: {
    id: string;
    context: ConversationSummary['context'];
    last_message_at: string;
    last_message_preview: string | null;
    accommodation_listing: { title: string } | null;
    marketplace_listing: { title: string } | null;
    participants: {
      user_id: string;
      profile: {
        id: string;
        first_name: string | null;
        display_name: string | null;
        avatar_url: string | null;
      } | null;
    }[];
  } | null;
}

const SELECT = `
  last_read_at, archived,
  conversation:conversations (
    id, context, last_message_at, last_message_preview,
    accommodation_listing:accommodation_listings ( title ),
    marketplace_listing:marketplace_listings ( title ),
    participants:conversation_participants (
      user_id,
      profile:profiles ( id, first_name, display_name, avatar_url )
    )
  )
`;

function contextLabel(c: NonNullable<RawParticipant['conversation']>): string | null {
  if (c.accommodation_listing?.title) return c.accommodation_listing.title;
  if (c.marketplace_listing?.title) return c.marketplace_listing.title;
  if (c.context === 'roommate') return 'Roommate chat';
  return null;
}

export const messagingApi = {
  async listConversations(userId: string): Promise<ConversationSummary[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(SELECT)
        .eq('user_id', userId)
        .returns<RawParticipant[]>();
      if (error) throw error;

      return (data ?? [])
        .filter((r) => r.conversation)
        .map((r) => {
          const c = r.conversation!;
          const otherRow = c.participants.find((p) => p.user_id !== userId);
          const p = otherRow?.profile ?? null;
          return {
            id: c.id,
            context: c.context,
            lastMessageAt: c.last_message_at,
            lastMessagePreview: c.last_message_preview,
            unread: new Date(c.last_message_at) > new Date(r.last_read_at),
            archived: r.archived,
            other: p
              ? {
                  id: p.id,
                  name: p.first_name ?? p.display_name ?? 'Hommie user',
                  avatarUrl: resolveAvatar(p.avatar_url) ?? null,
                }
              : null,
            contextLabel: contextLabel(c),
          } satisfies ConversationSummary;
        })
        .filter((c) => !c.archived)
        .sort((a, b) => +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt));
    }, { scope: 'messaging.listConversations' });
  },

  async markRead(conversationId: string) {
    return guard(async () => {
      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
    }, { scope: 'messaging.markRead' });
  },
};
