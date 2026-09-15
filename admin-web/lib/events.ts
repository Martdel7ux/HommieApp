import { supabase } from './supabase';

export interface EventPayload {
  title: string;
  description: string | null;
  host_name: string;
  cover_image_path: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string;
  city: string;
  area: string | null;
  external_url: string | null;
  created_by: string;
}

export async function createEvent(payload: EventPayload): Promise<void> {
  const { error } = await supabase.from('events').insert(payload);
  if (error) throw error;
}
