import { supabase } from './supabase';

export interface PendingVerification {
  id: string;
  first_name: string | null;
  display_name: string | null;
  verification_submitted_at: string | null;
  verification_doc_path: string | null;
  university: { name: string } | null;
}

const PENDING_SELECT = `
  id, first_name, display_name, verification_submitted_at, verification_doc_path,
  university:universities ( name )
`;

export function studentDisplayName(s: Pick<PendingVerification, 'first_name' | 'display_name'>): string {
  return s.first_name ?? s.display_name ?? 'Student';
}

export async function pendingVerifications(): Promise<PendingVerification[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PENDING_SELECT)
    .eq('verification', 'submitted')
    .order('verification_submitted_at', { ascending: true })
    .returns<PendingVerification[]>();
  if (error) throw error;
  return data ?? [];
}

export async function verificationDocUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('verification-docs').createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}

export async function reviewVerification(id: string, approve: boolean): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('profiles')
    .update({
      verification: approve ? 'verified' : 'unverified',
      verified_at: approve ? new Date().toISOString() : null,
      verified_by: approve ? (auth.user?.id ?? null) : null,
    })
    .eq('id', id);
  if (error) throw error;
}
