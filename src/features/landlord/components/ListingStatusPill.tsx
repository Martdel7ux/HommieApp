import { Badge } from '@/components/ui';
import { listingStatusLabels } from '@/config/labels';
import type { ListingStatus } from '@/types/database';

const TONE: Record<ListingStatus, React.ComponentProps<typeof Badge>['tone']> = {
  draft: 'neutral',
  active: 'success',
  paused: 'warning',
  rented: 'info',
  archived: 'neutral',
};

export function ListingStatusPill({ status }: { status: ListingStatus }) {
  return <Badge label={listingStatusLabels[status]} tone={TONE[status]} />;
}
