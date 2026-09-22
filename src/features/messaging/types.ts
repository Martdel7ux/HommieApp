import type { ConversationContext, UserRole } from '@/types/database';

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  /** client-only: optimistic message not yet confirmed / failed to send */
  status?: 'pending' | 'failed';
}

export interface ConversationDetail {
  id: string;
  context: ConversationContext;
  createdBy: string;
  /** the OTHER participant */
  other: { id: string; name: string; avatarUrl: string | null; role: UserRole; verified: boolean } | null;
  /** the other participant's last_read_at — drives read receipts */
  otherLastReadAt: string | null;
  contextCard:
    | { kind: 'accommodation'; id: string; title: string; subtitle: string; image?: string }
    | { kind: 'marketplace'; id: string; title: string; subtitle: string; image?: string }
    | null;
}

export interface ConversationSummary {
  id: string;
  context: ConversationContext;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unread: boolean;
  archived: boolean;
  other: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  /** Short context line, e.g. "Modern Studio near UNIC" or "Roommate chat". */
  contextLabel: string | null;
}

export interface BlockedUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  blockedAt: string;
}
