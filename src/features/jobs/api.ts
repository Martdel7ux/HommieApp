import { supabase } from '@/lib/supabase';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import { jobPayPeriodSuffix, jobTypeLabels, jobWorkModeLabels } from '@/config/labels';
import type { JobCard, JobDetail, JobFilters, JobPage } from './types';

const CARD_SELECT = `
  id, title, company, company_logo_url, location, work_mode, job_type,
  pay_min, pay_max, pay_period, pay_note, student_friendly, verified, summary, published_at
`;

const DETAIL_SELECT = `${CARD_SELECT}, description, responsibilities, requirements, apply_url, apply_email, expires_on`;

export const jobsApi = {
  async list(
    filters: JobFilters = {},
    opts: { limit?: number; offset?: number; withCount?: boolean } = {},
  ): Promise<JobPage> {
    return guard(async () => {
      let q = supabase.from('jobs').select(CARD_SELECT, opts.withCount ? { count: 'exact' } : undefined).eq('status', 'active');

      if (filters.query) {
        const term = `%${filters.query}%`;
        q = q.or(`title.ilike.${term},company.ilike.${term},location.ilike.${term},summary.ilike.${term}`);
      }
      if (filters.jobType) q = q.eq('job_type', filters.jobType);
      if (filters.workMode) q = q.eq('work_mode', filters.workMode);
      if (filters.studentFriendly) q = q.eq('student_friendly', true);

      const limit = opts.limit ?? PAGE_SIZE.jobs;
      const offset = opts.offset ?? 0;

      const { data, error, count } = await q
        .order('verified', { ascending: false })
        .order('published_at', { ascending: false, nullsFirst: false })
        .range(offset, offset + limit - 1)
        .returns<JobCard[]>();
      if (error) throw error;
      return { rows: data ?? [], count: count ?? null };
    }, { scope: 'jobs.list' });
  },

  async get(id: string, userId: string): Promise<JobDetail> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select(DETAIL_SELECT)
        .eq('id', id)
        .single<Omit<JobDetail, 'saved'>>();
      if (error) throw error;

      const { data: sv } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('user_id', userId)
        .eq('job_id', id)
        .maybeSingle();

      return { ...data, saved: !!sv };
    }, { scope: 'jobs.get' });
  },

  async savedIds(userId: string): Promise<string[]> {
    return guard(async () => {
      const { data, error } = await supabase.from('saved_jobs').select('job_id').eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.job_id);
    }, { scope: 'jobs.savedIds' });
  },

  async toggleSave(userId: string, jobId: string, nextSaved: boolean) {
    return guard(async () => {
      if (nextSaved) {
        const { error } = await supabase.from('saved_jobs').insert({ user_id: userId, job_id: jobId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase.from('saved_jobs').delete().eq('user_id', userId).eq('job_id', jobId);
        if (error) throw error;
      }
    }, { scope: 'jobs.toggleSave' });
  },
};

/** "€400/mo", "€12-20/hr", "€800-1000/mo · plus commission", or "Pay on application". */
export function payLabel(job: Pick<JobCard, 'pay_min' | 'pay_max' | 'pay_period' | 'pay_note'>): string {
  const suffix = job.pay_period ? jobPayPeriodSuffix[job.pay_period] : '';
  let figure: string | null = null;
  if (job.pay_min != null && job.pay_max != null && job.pay_max !== job.pay_min) {
    figure = `€${job.pay_min}-${job.pay_max}${suffix}`;
  } else if (job.pay_min != null) {
    figure = `€${job.pay_min}${suffix}`;
  } else if (job.pay_max != null) {
    figure = `€${job.pay_max}${suffix}`;
  }
  if (!figure) return job.pay_note ?? 'Pay on application';
  return job.pay_note ? `${figure} · ${job.pay_note}` : figure;
}

/** Short location string for a card: the work mode wins when it's Remote / On-campus. */
export function jobLocationLabel(job: Pick<JobCard, 'location' | 'work_mode'>): string {
  if (job.work_mode === 'remote') return 'Remote';
  if (job.work_mode === 'on_campus') return job.location || 'On-campus';
  return job.location;
}

export function jobTypeLabel(job: Pick<JobCard, 'job_type'>): string {
  return jobTypeLabels[job.job_type];
}

export function jobWorkModeLabel(job: Pick<JobCard, 'work_mode'>): string {
  return jobWorkModeLabels[job.work_mode];
}
