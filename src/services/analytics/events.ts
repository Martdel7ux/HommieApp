/**
 * The single catalogue of analytics events for Hommie.
 *
 * Every tracked interaction MUST be declared here with a typed payload.
 * Screens call `analytics.track('event_name', { ... })` and get compile-time
 * checking of the name and properties. Adding an event = adding a line here.
 */
import type { UserRole } from '@/types/database';

export interface AnalyticsEventMap {
  // ---- lifecycle / auth ----
  app_opened: { cold_start: boolean };
  sign_up_started: { role: UserRole };
  sign_up_completed: { role: UserRole };
  sign_in_completed: { role: UserRole };
  social_sign_in_started: { provider: 'apple' | 'google' };
  social_sign_in_completed: { provider: 'apple' | 'google'; is_new_user: boolean };
  social_sign_in_failed: { provider: 'apple' | 'google'; reason: string };
  sign_out: Record<string, never>;
  password_reset_requested: Record<string, never>;
  account_deletion_requested: Record<string, never>;
  role_selected: { role: UserRole };
  landlord_application_submitted: Record<string, never>;

  // ---- onboarding ----
  onboarding_step_viewed: { role: UserRole; step: string; index: number };
  onboarding_completed: { role: UserRole };

  // ---- accommodation (student) ----
  accommodation_search_performed: { query?: string; filters_count: number };
  accommodation_filter_applied: { filter: string };
  accommodation_sort_changed: { sort: string };
  accommodation_view_toggled: { view: 'list' | 'map' };
  listing_viewed: { listing_id: string; source: string };
  listing_saved: { listing_id: string };
  listing_unsaved: { listing_id: string };
  listing_contact_started: { listing_id: string };
  enquiry_sent: { listing_id: string };
  listing_reported: { listing_id: string; reason: string };
  landlord_profile_viewed: { landlord_id: string };
  landlord_profile_contact_started: { landlord_id: string };

  // ---- roommates ----
  roommate_search_performed: { filters_count: number };
  roommate_profile_viewed: { profile_id: string; compatibility_score?: number };
  roommate_saved: { profile_id: string };
  roommate_contact_started: { profile_id: string };
  roommate_profile_published: Record<string, never>;

  // ---- jobs ----
  jobs_search_performed: { query?: string; filters_count: number };
  jobs_filter_applied: { filter: string };
  job_viewed: { job_id: string; source: string };
  job_saved: { job_id: string };
  job_unsaved: { job_id: string };
  job_apply_started: { job_id: string; method: 'url' | 'email' };

  // ---- community / events / marketplace ----
  community_post_created: { category: string; has_image: boolean };
  community_post_liked: { post_id: string };
  community_comment_created: { post_id: string };
  event_viewed: { event_id: string };
  event_rsvp_changed: { event_id: string; state: 'going' | 'interested' | 'none' };
  event_added_to_calendar: { event_id: string };
  marketplace_search_performed: { filters_count: number };
  marketplace_item_viewed: { item_id: string };
  marketplace_item_saved: { item_id: string };
  marketplace_listing_created: { category: string };
  marketplace_seller_contact_started: { item_id: string };

  // ---- landlord ----
  landlord_dashboard_viewed: Record<string, never>;
  landlord_listing_create_started: Record<string, never>;
  landlord_listing_step_completed: { step: number };
  landlord_listing_published: { listing_id: string };
  landlord_listing_status_changed: { listing_id: string; status: string };
  landlord_listing_duplicated: { listing_id: string };
  landlord_enquiry_opened: { enquiry_id: string };
  landlord_enquiry_replied: { enquiry_id: string };
  landlord_verification_submitted: Record<string, never>;

  // ---- messaging ----
  conversation_opened: { conversation_id: string; context: string };
  message_sent: { conversation_id: string; context: string };
  message_send_failed: { conversation_id: string };
  message_send_retried: { conversation_id: string };

  // ---- notifications ----
  notification_received: { type: string };
  notification_opened: { type: string };
  push_permission_result: { granted: boolean };
}

export type AnalyticsEventName = keyof AnalyticsEventMap;
