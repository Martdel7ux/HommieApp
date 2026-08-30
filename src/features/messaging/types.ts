import type { ConversationContext } from '@/types/database';

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
