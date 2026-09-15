import { supabase } from './supabase';

export interface JobPayload {
  title: string;
  company: string;
  company_logo_url: string | null;
  location: string;
  work_mode: string;
  job_type: string;
  pay_min: number | null;
  pay_max: number | null;
  pay_period: string | null;
  pay_note: string | null;
  student_friendly: boolean;
  verified: boolean;
  summary: string | null;
  description: string | null;
  responsibilities: string[];
  requirements: string[];
  apply_url: string | null;
  apply_email: string | null;
  contact_phone: string | null;
  expires_on: string | null;
  posted_by: string;
}

export async function createJob(payload: JobPayload): Promise<void> {
  const { error } = await supabase.from('jobs').insert(payload);
  if (error) throw error;
}
