/**
 * Hand-maintained mirror of the Supabase schema (see supabase/migrations).
 *
 * Regenerate from a running database with:
 *   npm run db:types
 * which overwrites this file with `supabase gen types typescript --local`.
 * Until then this is the source of truth for the client.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type UserRole = 'student' | 'landlord';
export type StudentStatus =
  | 'new_to_cyprus'
  | 'looking_for_accommodation'
  | 'looking_for_roommate'
  | 'already_settled';
export type StudyLevel =
  | 'foundation'
  | 'undergraduate_y1'
  | 'undergraduate_y2'
  | 'undergraduate_y3'
  | 'undergraduate_y4'
  | 'postgraduate'
  | 'phd'
  | 'erasmus_exchange';
export type PropertyType = 'studio' | 'apartment' | 'house' | 'shared_room' | 'private_room';
export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'rented' | 'archived';
export type VerificationStatus = 'unverified' | 'submitted' | 'verified';
export type StudentAudience = 'erasmus' | 'full_time' | 'both';
export type HousingStatus = 'has_flat' | 'needs_flat';
export type CommunityCategory =
  | 'housing_help'
  | 'new_in_cyprus'
  | 'campus_life'
  | 'recommendations'
  | 'general';
export type MarketplaceCategory =
  | 'furniture'
  | 'electronics'
  | 'books'
  | 'kitchen'
  | 'transport'
  | 'other';
export type MarketplaceCondition = 'new' | 'like_new' | 'good' | 'fair' | 'for_parts';
export type JobType = 'part_time' | 'internship' | 'full_time' | 'contract' | 'seasonal';
export type JobWorkMode = 'on_site' | 'remote' | 'hybrid' | 'on_campus';
export type JobPayPeriod = 'hour' | 'day' | 'week' | 'month' | 'year' | 'fixed';
export type JobStatus = 'draft' | 'active' | 'filled' | 'expired';
export type ConversationContext = 'accommodation' | 'roommate' | 'marketplace' | 'general';
export type ReportReason =
  | 'spam'
  | 'scam_or_fraud'
  | 'inappropriate'
  | 'harassment'
  | 'wrong_category'
  | 'not_available'
  | 'other';
export type NotificationType =
  | 'message'
  | 'enquiry'
  | 'listing_saved'
  | 'roommate_saved'
  | 'community_reply'
  | 'community_like'
  | 'event_reminder'
  | 'system';

type Timestamps = { created_at: string; updated_at: string };

interface ProfileRow extends Timestamps {
  id: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  phone: string | null;
  notification_prefs: Json;
  university_id: string | null;
  city: string | null;
  campus_area: string | null;
  study_level: StudyLevel | null;
  student_status: StudentStatus | null;
  move_in_from: string | null;
  move_in_to: string | null;
  budget_min: number | null;
  budget_max: number | null;
  interests: string[];
  onboarding_completed: boolean;
  is_active: boolean;
  is_admin: boolean;
  deletion_requested_at: string | null;
  verification: VerificationStatus;
  verification_submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  verification_doc_path: string | null;
}

interface LandlordProfileRow extends Timestamps {
  id: string;
  business_name: string | null;
  contact_name: string;
  phone: string | null;
  preferred_contact: 'in_app' | 'phone' | 'email';
  operating_areas: string[];
  description: string | null;
  logo_url: string | null;
  verification: VerificationStatus;
  verification_submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
}

interface UniversityRow {
  id: string;
  name: string;
  short_name: string | null;
  city: string;
  campus_area: string | null;
  website: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface AccommodationListingRow extends Timestamps {
  id: string;
  landlord_id: string;
  title: string;
  description: string | null;
  property_type: PropertyType;
  student_audience: StudentAudience;
  status: ListingStatus;
  rent_month: number;
  deposit: number | null;
  bills_included: boolean;
  bills_note: string | null;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  roommate_suitable: boolean;
  max_occupants: number | null;
  city: string;
  area: string;
  address_line: string | null;
  approx_lat: number;
  approx_lng: number;
  nearest_university_id: string | null;
  distance_to_campus_km: number | null;
  amenities: string[];
  available_from: string | null;
  available_to: string | null;
  views_count: number;
  saves_count: number;
  enquiries_count: number;
  published_at: string | null;
}

interface AccommodationImageRow {
  id: string;
  listing_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  position: number;
  created_at: string;
}

interface RoommatePreferenceRow extends Timestamps {
  id: string;
  user_id: string;
  is_published: boolean;
  age: number | null;
  headline: string | null;
  about: string | null;
  preferred_city: string | null;
  preferred_areas: string[];
  university_id: string | null;
  budget_min: number | null;
  budget_max: number | null;
  move_in_from: string | null;
  move_in_to: string | null;
  smoking: 'yes' | 'no' | 'outside_only' | 'no_preference';
  pets: 'yes' | 'no' | 'no_preference';
  cleanliness: number | null;
  sleep_schedule: 'early_bird' | 'night_owl' | 'flexible' | null;
  social_level: 'homebody' | 'balanced' | 'very_social' | null;
  guests_frequency: 'rarely' | 'sometimes' | 'often' | null;
  gender_preference: 'same' | 'any' | 'no_preference';
  lifestyle_tags: string[];
  student_audience: StudentAudience;
  housing_status: HousingStatus | null;
  flat_rent_month: number | null;
}

interface RoommateFlatPhotoRow {
  id: string;
  user_id: string;
  storage_path: string;
  width: number | null;
  height: number | null;
  position: number;
  created_at: string;
}

interface CommunityPostRow extends Timestamps {
  id: string;
  author_id: string;
  category: CommunityCategory;
  body: string;
  image_paths: string[];
  likes_count: number;
  comments_count: number;
  is_hidden: boolean;
}

interface CommunityCommentRow {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  is_hidden: boolean;
  created_at: string;
}

interface EventRow extends Timestamps {
  id: string;
  created_by: string;
  title: string;
  description: string | null;
  host_name: string;
  cover_image_path: string | null;
  starts_at: string;
  ends_at: string | null;
  location_name: string;
  city: string;
  area: string | null;
  approx_lat: number | null;
  approx_lng: number | null;
  external_url: string | null;
  rsvp_count: number;
  is_published: boolean;
}

interface MarketplaceListingRow extends Timestamps {
  id: string;
  seller_id: string;
  title: string;
  description: string | null;
  category: MarketplaceCategory;
  condition: MarketplaceCondition;
  price: number;
  is_free: boolean;
  city: string;
  area: string | null;
  status: 'active' | 'reserved' | 'sold' | 'archived';
  saves_count: number;
}

interface JobRow extends Timestamps {
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
  description: string | null;
  responsibilities: string[];
  requirements: string[];
  apply_url: string | null;
  apply_email: string | null;
  contact_phone: string | null;
  status: JobStatus;
  posted_by: string | null;
  expires_on: string | null;
  published_at: string | null;
}

type SavedJobRow = { user_id: string; job_id: string; created_at: string };

interface ConversationRow {
  id: string;
  context: ConversationContext;
  accommodation_listing_id: string | null;
  marketplace_listing_id: string | null;
  roommate_profile_id: string | null;
  created_by: string;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

interface ConversationParticipantRow {
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  archived: boolean;
  muted: boolean;
  joined_at: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface EnquiryRow {
  id: string;
  listing_id: string;
  student_id: string;
  landlord_id: string;
  conversation_id: string | null;
  message: string;
  share_move_in: boolean;
  share_budget: boolean;
  share_university: boolean;
  is_read: boolean;
  created_at: string;
}

interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Json;
  is_read: boolean;
  created_at: string;
}

interface ReportRow {
  id: string;
  reporter_id: string;
  subject_type: string;
  subject_id: string;
  reason: ReportReason;
  details: string | null;
  status: 'open' | 'reviewing' | 'actioned' | 'dismissed';
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

interface BlockedUserRow {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

interface PushTokenRow {
  id: string;
  user_id: string;
  expo_push_token: string;
  device_id: string | null;
  platform: 'ios' | 'android' | 'web' | null;
  last_seen_at: string;
  created_at: string;
}

type SimpleSave = { user_id: string; listing_id: string; created_at: string };

/**
 * `interface` types lack an implicit index signature, so they are not assignable
 * to `Record<string, unknown>` (what supabase-js's GenericTable requires).
 * Intersecting with `Record<string, unknown>` satisfies the constraint while
 * keeping all named fields for autocompletion.
 */
type Indexed<T> = T & Record<string, unknown>;

type TableDef<Row> = {
  Row: Indexed<Row>;
  Insert: Indexed<Partial<Row>>;
  Update: Indexed<Partial<Row>>;
  Relationships: [];
};

interface LandlordApplicationRow {
  id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected';
  business_name: string | null;
  phone: string;
  operating_areas: string[];
  message: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}
type SavedRoommateRow = { user_id: string; saved_profile_id: string; created_at: string };
type PostLikeRow = { post_id: string; user_id: string; created_at: string };
type EventRsvpRow = { event_id: string; user_id: string; state: 'going' | 'interested'; created_at: string };
type MarketplaceImageRow = { id: string; listing_id: string; storage_path: string; position: number; created_at: string };

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow>;
      landlord_profiles: TableDef<LandlordProfileRow>;
      landlord_applications: TableDef<LandlordApplicationRow>;
      universities: TableDef<UniversityRow>;
      accommodation_listings: TableDef<AccommodationListingRow>;
      accommodation_listing_images: TableDef<AccommodationImageRow>;
      saved_accommodation_listings: TableDef<SimpleSave>;
      roommate_preferences: TableDef<RoommatePreferenceRow>;
      roommate_flat_photos: TableDef<RoommateFlatPhotoRow>;
      saved_roommate_profiles: TableDef<SavedRoommateRow>;
      community_posts: TableDef<CommunityPostRow>;
      community_comments: TableDef<CommunityCommentRow>;
      community_post_likes: TableDef<PostLikeRow>;
      events: TableDef<EventRow>;
      event_rsvps: TableDef<EventRsvpRow>;
      marketplace_listings: TableDef<MarketplaceListingRow>;
      marketplace_listing_images: TableDef<MarketplaceImageRow>;
      saved_marketplace_listings: TableDef<SimpleSave>;
      jobs: TableDef<JobRow>;
      saved_jobs: TableDef<SavedJobRow>;
      conversations: TableDef<ConversationRow>;
      conversation_participants: TableDef<ConversationParticipantRow>;
      messages: TableDef<MessageRow>;
      enquiries: TableDef<EnquiryRow>;
      notifications: TableDef<NotificationRow>;
      reports: TableDef<ReportRow>;
      blocked_users: TableDef<BlockedUserRow>;
      push_tokens: TableDef<PushTokenRow>;
    };
    Views: {
      enquiry_student_summaries: {
        Row: {
          enquiry_id: string;
          landlord_id: string;
          student_id: string;
          first_name: string | null;
          avatar_url: string | null;
          university: string | null;
          city: string | null;
          move_in_from: string | null;
          move_in_to: string | null;
          budget_min: number | null;
          budget_max: number | null;
        } & Record<string, unknown>;
        Relationships: [];
      };
    };
    Functions: {
      record_listing_view: { Args: { p_listing_id: string }; Returns: undefined };
      roommate_compatibility: {
        Args: { a: string; b: string };
        Returns: { score: number; reasons: string[] }[];
      };
      landlord_dashboard_summary: {
        Args: Record<string, never>;
        Returns: {
          active_listings: number;
          draft_listings: number;
          paused_listings: number;
          rented_listings: number;
          unread_enquiries: number;
          total_views: number;
          total_saves: number;
          total_enquiries: number;
        }[];
      };
      start_conversation: {
        Args: {
          p_other_user: string;
          p_context?: ConversationContext;
          p_accommodation_listing_id?: string | null;
          p_marketplace_listing_id?: string | null;
          p_roommate_profile_id?: string | null;
        };
        Returns: string;
      };
      mark_notifications_read: { Args: { p_ids: string[] }; Returns: undefined };
      unread_notification_count: { Args: Record<string, never>; Returns: number };
      unread_conversation_count: { Args: Record<string, never>; Returns: number };
      mark_conversation_read: { Args: { p_conversation_id: string }; Returns: undefined };
      request_account_deletion: { Args: Record<string, never>; Returns: undefined };
      apply_selected_role: { Args: { p_role: UserRole }; Returns: undefined };
    };
    Enums: {
      user_role: UserRole;
    };
    CompositeTypes: Record<string, never>;
  };
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T];
