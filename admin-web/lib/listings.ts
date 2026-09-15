import { supabase } from './supabase';

export interface PendingListing {
  id: string;
  title: string;
  rent_month: number;
  city: string;
  area: string;
  created_at: string;
  landlord: { id: string; first_name: string | null; display_name: string | null } | null;
}

const PENDING_SELECT = `
  id, title, rent_month, city, area, created_at,
  landlord:profiles!accommodation_listings_landlord_id_fkey ( id, first_name, display_name )
`;

export function landlordDisplayName(landlord: PendingListing['landlord']): string {
  return landlord?.first_name ?? landlord?.display_name ?? 'Landlord';
}

export async function pendingListings(): Promise<PendingListing[]> {
  const { data, error } = await supabase
    .from('accommodation_listings')
    .select(PENDING_SELECT)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true })
    .returns<PendingListing[]>();
  if (error) throw error;
  return data ?? [];
}

export async function reviewListing(id: string, approve: boolean): Promise<void> {
  const { error } = await supabase
    .from('accommodation_listings')
    .update({ status: approve ? 'active' : 'draft' })
    .eq('id', id);
  if (error) throw error;
}
