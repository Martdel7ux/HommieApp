import { supabase } from './supabase';

export interface DashboardStats {
  students: number;
  landlords: number;
  activeListings: number;
  pendingListings: number;
  upcomingEvents: number;
  activeJobs: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const nowIso = new Date().toISOString();

  const [students, landlords, activeListings, pendingListings, upcomingEvents, activeJobs] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'landlord'),
    supabase.from('accommodation_listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('accommodation_listings').select('*', { count: 'exact', head: true }).eq('status', 'pending_review'),
    supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true)
      .gte('starts_at', nowIso),
    supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'active'),
  ]);

  for (const r of [students, landlords, activeListings, pendingListings, upcomingEvents, activeJobs]) {
    if (r.error) throw new Error(r.error.message);
  }

  return {
    students: students.count ?? 0,
    landlords: landlords.count ?? 0,
    activeListings: activeListings.count ?? 0,
    pendingListings: pendingListings.count ?? 0,
    upcomingEvents: upcomingEvents.count ?? 0,
    activeJobs: activeJobs.count ?? 0,
  };
}
