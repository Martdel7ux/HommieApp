import type { JobType, JobWorkMode, JobPayPeriod } from '@/types/database';

export type { JobType, JobWorkMode, JobPayPeriod };

/** Chip-row filter on the jobs board. `type` is a job_type or a work_mode. */
export interface JobFilters {
  query?: string;
  jobType?: JobType;
  workMode?: JobWorkMode;
  studentFriendly?: boolean;
}

export interface JobCard {
  id: string;
  title: string;
  company: string;
  company_logo_url: string | null;
  location: string;
  work_mode: JobWorkMode;
  job_type: JobType;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: JobPayPeriod | null;
  pay_note: string | null;
  student_friendly: boolean;
  verified: boolean;
  summary: string | null;
  published_at: string | null;
}

export interface JobDetail extends JobCard {
  description: string | null;
  responsibilities: string[];
  requirements: string[];
  apply_url: string | null;
  apply_email: string | null;
  expires_on: string | null;
  saved: boolean;
}

export interface JobPage {
  rows: JobCard[];
  count: number | null;
}
