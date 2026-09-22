import { supabase } from '@/lib/supabase';
import { resolveAvatar, resolveImage } from '@/lib/images';
import { guard } from '@/services/errors';
import { PAGE_SIZE, type ReportReason } from '@/config/constants';
import type { UserRole, VerificationStatus } from '@/types/database';
import type { BlockedUser, ChatMessage, ConversationDetail, ConversationSummary } from './types';

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

  /**
   * Get (or create) the one-to-one conversation with another user and return
   * its id. Idempotent — the `start_conversation` RPC dedupes on context.
   */
  async startConversation(
    otherUserId: string,
    opts: {
      context?: ConversationDetail['context'];
      roommateProfileId?: string;
      accommodationListingId?: string;
      marketplaceListingId?: string;
    } = {},
  ): Promise<string> {
    return guard(async () => {
      const { data, error } = await supabase.rpc('start_conversation', {
        p_other_user: otherUserId,
        p_context: opts.context ?? 'general',
        p_roommate_profile_id: opts.roommateProfileId ?? null,
        p_accommodation_listing_id: opts.accommodationListingId ?? null,
        p_marketplace_listing_id: opts.marketplaceListingId ?? null,
      });
      if (error) throw error;
      return data as string;
    }, { scope: 'messaging.startConversation' });
  },

  async markRead(conversationId: string) {
    return guard(async () => {
      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId,
      });
      if (error) throw error;
    }, { scope: 'messaging.markRead' });
  },

  /**
   * Clear the "new enquiry" flag once the landlord has opened the thread.
   * Enquiries are just conversations now, so opening one is acknowledging it.
   * The RLS filter (`landlord_id = auth.uid()`) makes this a no-op for anyone
   * who isn't the listing's landlord.
   */
  async markEnquiryReadByConversation(conversationId: string) {
    try {
      await supabase.from('enquiries').update({ is_read: true }).eq('conversation_id', conversationId);
    } catch {
      // best-effort — not every conversation has an enquiry behind it
    }
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
            profile:profiles (
              id, first_name, display_name, avatar_url, role, verification,
              landlord_profile:landlord_profiles ( verification )
            )
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
              role: UserRole;
              verification: VerificationStatus;
              landlord_profile: { verification: VerificationStatus } | null;
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
              role: op.role,
              verified:
                op.role === 'student'
                  ? op.verification === 'verified'
                  : op.landlord_profile?.verification === 'verified',
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

  /** Blocks the other user and archives this conversation out of the blocker's own inbox. */
  async blockUser(blockerId: string, blockedId: string, conversationId: string): Promise<void> {
    return guard(async () => {
      const { error: blockError } = await supabase
        .from('blocked_users')
        .insert({ blocker_id: blockerId, blocked_id: blockedId });
      if (blockError && blockError.code !== '23505') throw blockError;

      const { error: archiveError } = await supabase
        .from('conversation_participants')
        .update({ archived: true })
        .eq('conversation_id', conversationId)
        .eq('user_id', blockerId);
      if (archiveError) throw archiveError;
    }, { scope: 'messaging.blockUser' });
  },

  async reportUser(reporterId: string, subjectId: string, reason: ReportReason): Promise<void> {
    return guard(async () => {
      const { error } = await supabase
        .from('reports')
        .insert({ reporter_id: reporterId, subject_type: 'user', subject_id: subjectId, reason });
      if (error && error.code !== '23505') throw error;
    }, { scope: 'messaging.reportUser' });
  },

  async listBlockedUsers(blockerId: string): Promise<BlockedUser[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('blocked_users')
        .select(
          `blocked_id, created_at,
           profile:profiles!blocked_users_blocked_id_fkey ( id, first_name, display_name, avatar_url )`,
        )
        .eq('blocker_id', blockerId)
        .order('created_at', { ascending: false })
        .returns<
          {
            blocked_id: string;
            created_at: string;
            profile: { id: string; first_name: string | null; display_name: string | null; avatar_url: string | null } | null;
          }[]
        >();
      if (error) throw error;
      return (data ?? []).map((row) => ({
        id: row.blocked_id,
        name: row.profile?.first_name ?? row.profile?.display_name ?? 'Hommie user',
        avatarUrl: resolveAvatar(row.profile?.avatar_url) ?? null,
        blockedAt: row.created_at,
      }));
    }, { scope: 'messaging.listBlockedUsers' });
  },

  /** Unblocks a user — they can message and start a new conversation with you again. */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    return guard(async () => {
      const { error } = await supabase
        .from('blocked_users')
        .delete()
        .eq('blocker_id', blockerId)
        .eq('blocked_id', blockedId);
      if (error) throw error;
    }, { scope: 'messaging.unblockUser' });
  },
};
