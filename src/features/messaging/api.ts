import { supabase } from '@/lib/supabase';
import { resolveAvatar, resolveImage } from '@/lib/images';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import type { ChatMessage, ConversationDetail, ConversationSummary } from './types';

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

  async getConversation(conversationId: string, userId: string): Promise<ConversationDetail> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('conversations')
        .select(
          `
          id, context, created_by,
          accommodation_listing:accommodation_listings (
            id, title, rent_month, area, city,
            images:accommodation_listing_images ( storage_path, position )
          ),
          marketplace_listing:marketplace_listings ( id, title, price ),
          participants:conversation_participants (
            user_id, last_read_at,
            profile:profiles ( id, first_name, display_name, avatar_url )
          )
        `,
        )
        .eq('id', conversationId)
        .single<{
          id: string;
          context: ConversationDetail['context'];
          created_by: string;
          accommodation_listing: {
            id: string;
            title: string;
            rent_month: number;
            area: string;
            city: string;
            images: { storage_path: string; position: number }[];
          } | null;
          marketplace_listing: { id: string; title: string; price: number } | null;
          participants: {
            user_id: string;
            last_read_at: string;
            profile: {
              id: string;
              first_name: string | null;
              display_name: string | null;
              avatar_url: string | null;
            } | null;
          }[];
        }>();
      if (error) throw error;

      const otherRow = data.participants.find((p) => p.user_id !== userId);
      const op = otherRow?.profile ?? null;
      const al = data.accommodation_listing;
      const ml = data.marketplace_listing;

      return {
        id: data.id,
        context: data.context,
        createdBy: data.created_by,
        other: op
          ? {
              id: op.id,
              name: op.first_name ?? op.display_name ?? 'Hommie user',
              avatarUrl: resolveAvatar(op.avatar_url) ?? null,
            }
          : null,
        otherLastReadAt: otherRow?.last_read_at ?? null,
        contextCard: al
          ? {
              kind: 'accommodation',
              id: al.id,
              title: al.title,
              subtitle: `€${al.rent_month} / month`,
              image: resolveImage(
                [...(al.images ?? [])].sort((a, b) => a.position - b.position)[0]?.storage_path,
              ),
            }
          : ml
            ? {
                kind: 'marketplace',
                id: ml.id,
                title: ml.title,
                subtitle: ml.price === 0 ? 'Free' : `€${ml.price}`,
              }
            : null,
      };
    }, { scope: 'messaging.getConversation' });
  },

  async listMessages(
    conversationId: string,
    opts: { before?: string; limit?: number } = {},
  ): Promise<ChatMessage[]> {
    return guard(async () => {
      let q = supabase
        .from('messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(opts.limit ?? PAGE_SIZE.messages);
      if (opts.before) q = q.lt('created_at', opts.before);

      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        body: m.body,
        createdAt: m.created_at,
      }));
    }, { scope: 'messaging.listMessages' });
  },

  async sendMessage(conversationId: string, senderId: string, body: string): Promise<ChatMessage> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: senderId, body: body.trim() })
        .select('id, sender_id, body, created_at')
        .single();
      if (error) throw error;
      return { id: data.id, senderId: data.sender_id, body: data.body, createdAt: data.created_at };
    }, { scope: 'messaging.sendMessage' });
  },
};
