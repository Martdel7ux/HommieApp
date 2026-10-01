import { supabase } from './supabase';

export type ReportStatus = 'open' | 'reviewing' | 'actioned' | 'dismissed';

export interface OpenReport {
  id: string;
  subject_type: string;
  subject_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  reporter: { id: string; first_name: string | null; display_name: string | null } | null;
  // Only populated when subject_type === 'user' — the most common case right
  // now (blocking a user auto-files one of these, see messaging/api.ts).
  // Other subject types (community_post, accommodation_listing, …) show
  // their raw id for the admin to look up directly.
  subjectUser: { id: string; first_name: string | null; display_name: string | null } | null;
}

interface RawReport {
  id: string;
  subject_type: string;
  subject_id: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  created_at: string;
  reporter: { id: string; first_name: string | null; display_name: string | null } | null;
}

const SELECT = `
  id, subject_type, subject_id, reason, details, status, created_at,
  reporter:profiles!reports_reporter_id_fkey ( id, first_name, display_name )
`;

export function reporterName(p: OpenReport['reporter']): string {
  return p?.first_name ?? p?.display_name ?? 'Hommie user';
}

/** Open or still-being-reviewed reports, newest first. */
export async function openReports(): Promise<OpenReport[]> {
  const { data, error } = await supabase
    .from('reports')
    .select(SELECT)
    .in('status', ['open', 'reviewing'])
    .order('created_at', { ascending: false })
    .returns<RawReport[]>();
  if (error) throw error;

  const rows = data ?? [];
  const userSubjectIds = [...new Set(rows.filter((r) => r.subject_type === 'user').map((r) => r.subject_id))];

  let subjectsById = new Map<string, OpenReport['subjectUser']>();
  if (userSubjectIds.length) {
    const { data: subjects, error: subjErr } = await supabase
      .from('profiles')
      .select('id, first_name, display_name')
      .in('id', userSubjectIds);
    if (subjErr) throw subjErr;
    subjectsById = new Map((subjects ?? []).map((s) => [s.id, s]));
  }

  return rows.map((r) => ({
    ...r,
    subjectUser: r.subject_type === 'user' ? (subjectsById.get(r.subject_id) ?? null) : null,
  }));
}

export async function setReportStatus(id: string, status: ReportStatus): Promise<void> {
  const { error } = await supabase.from('reports').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function openReportsCount(): Promise<number> {
  const { count, error } = await supabase
    .from('reports')
    .select('*', { count: 'exact', head: true })
    .in('status', ['open', 'reviewing']);
  if (error) throw error;
  return count ?? 0;
}
