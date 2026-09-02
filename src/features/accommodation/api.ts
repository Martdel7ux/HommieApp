import { supabase } from '@/lib/supabase';
import { resolveImage } from '@/lib/images';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import type {
  AccommodationCard,
  AccommodationDetail,
  AccommodationFilters,
  AccommodationPage,
} from './types';

const CARD_SELECT = `
  id, title, rent_month, deposit, bills_included, property_type, bedrooms, bathrooms,
  furnished, roommate_suitable, city, area, available_from, amenities, saves_count,
  views_count, published_at, status, distance_to_campus_km, approx_lat, approx_lng,
  images:accommodation_listing_images ( storage_path, position ),
  landlord:profiles!accommodation_listings_landlord_id_fkey (
    id, display_name, avatar_url,
    landlord_profile:landlord_profiles ( verification, business_name )
  ),
  nearest_university:universities!accommodation_listings_nearest_university_id_fkey ( short_name, name )
`;

export const accommodationApi = {
  async list(
    filters: AccommodationFilters = {},
    opts: { limit?: number; offset?: number; withCount?: boolean } = {},
  ): Promise<AccommodationPage> {
    return guard(async () => {
      let q = supabase
        .from('accommodation_listings')
        .select(CARD_SELECT, opts.withCount ? { count: 'exact' } : undefined)
        .eq('status', 'active');

      if (filters.query) {
        const term = `%${filters.query}%`;
        q = q.or(`title.ilike.${term},area.ilike.${term},city.ilike.${term}`);
      }
      if (filters.city) q = q.eq('city', filters.city);
      if (filters.area) q = q.eq('area', filters.area);
      if (filters.universityId) q = q.eq('nearest_university_id', filters.universityId);
      if (filters.propertyTypes?.length) q = q.in('property_type', filters.propertyTypes);
      if (filters.rentMin != null) q = q.gte('rent_month', filters.rentMin);
      if (filters.rentMax != null) q = q.lte('rent_month', filters.rentMax);
      if (filters.minBedrooms != null) q = q.gte('bedrooms', filters.minBedrooms);
      if (filters.furnished) q = q.eq('furnished', true);
      if (filters.billsIncluded) q = q.eq('bills_included', true);
      if (filters.roommateSuitable) q = q.eq('roommate_suitable', true);
      if (filters.availableFrom) q = q.lte('available_from', filters.availableFrom);

      const limit = opts.limit ?? PAGE_SIZE.listings;
      const offset = opts.offset ?? 0;

      const ordered =
        filters.sort === 'rent_asc'
          ? q.order('rent_month', { ascending: true })
          : filters.sort === 'rent_desc'
            ? q.order('rent_month', { ascending: false })
            : q.order('published_at', { ascending: false, nullsFirst: false });

      const { data, error, count } = await ordered
        .range(offset, offset + limit - 1)
        .returns<AccommodationCard[]>();
      if (error) throw error;
      return { rows: data ?? [], count: count ?? null };
    }, { scope: 'accommodation.list' });
  },

  async get(id: string, userId: string): Promise<AccommodationDetail> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('accommodation_listings')
        .select(
          `
          id, title, description, rent_month, deposit, bills_included, bills_note, property_type,
          bedrooms, bathrooms, furnished, roommate_suitable, max_occupants, city, area, address_line,
          approx_lat, approx_lng, available_from, available_to, amenities, saves_count, views_count,
          status, distance_to_campus_km, nearest_university_id,
          images:accommodation_listing_images ( storage_path, position ),
          landlord:profiles!accommodation_listings_landlord_id_fkey (
            id, first_name, display_name, avatar_url,
            landlord_profile:landlord_profiles ( verification, business_name, contact_name )
          ),
          nearest_university:universities!accommodation_listings_nearest_university_id_fkey ( id, short_name, name )
        `,
        )
        .eq('id', id)
        .single<Omit<AccommodationDetail, 'saved'>>();
      if (error) throw error;

      const { data: sv } = await supabase
        .from('saved_accommodation_listings')
        .select('listing_id')
        .eq('user_id', userId)
        .eq('listing_id', id)
        .maybeSingle();

      return { ...data, saved: !!sv };
    }, { scope: 'accommodation.get' });
  },

  /** Other active listings near the same campus (or area), excluding this one. */
  async similar(listing: Pick<AccommodationDetail, 'id' | 'area' | 'nearest_university_id'>, limit = 6) {
    const filters: AccommodationFilters = listing.nearest_university_id
      ? { universityId: listing.nearest_university_id, sort: 'newest' }
      : { area: listing.area, sort: 'newest' };
    const page = await this.list(filters, { limit: limit + 1 });
    return page.rows.filter((r) => r.id !== listing.id).slice(0, limit);
  },

  async recordView(listingId: string) {
    try {
      await supabase.rpc('record_listing_view', { p_listing_id: listingId });
    } catch {
      // view tracking is best-effort
    }
  },

  /** Home rail: freshest active listings, nudged toward the student's city. */
  async recommended(city: string | null | undefined, limit = 6): Promise<AccommodationCard[]> {
    const inCity = city ? (await this.list({ city, sort: 'newest' }, { limit })).rows : [];
    if (inCity.length >= limit) return inCity;
    const rest = (await this.list({ sort: 'newest' }, { limit: limit + inCity.length })).rows;
    const seen = new Set(inCity.map((l) => l.id));
    return [...inCity, ...rest.filter((l) => !seen.has(l.id))].slice(0, limit);
  },

  // Returns a plain array (not a Set) so it survives the persisted query cache
  // — JSON.stringify turns a Set into `{}`.
  async savedIds(userId: string): Promise<string[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('saved_accommodation_listings')
        .select('listing_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.listing_id);
    }, { scope: 'accommodation.savedIds' });
  },

  async toggleSave(userId: string, listingId: string, nextSaved: boolean) {
    return guard(async () => {
      if (nextSaved) {
        const { error } = await supabase
          .from('saved_accommodation_listings')
          .insert({ user_id: userId, listing_id: listingId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('saved_accommodation_listings')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', listingId);
        if (error) throw error;
      }
    }, { scope: 'accommodation.toggleSave' });
  },
};

/** First image (by position) for a card, resolved to a URL. */
export function coverImage(card: Pick<AccommodationCard, 'images'>): string | undefined {
  const sorted = [...(card.images ?? [])].sort((a, b) => a.position - b.position);
  return resolveImage(sorted[0]?.storage_path);
}

/** "800m from UNIC" / "1.2km from EUC" / "Engomi, Nicosia". */
export function locationLabel(card: AccommodationCard): string {
  const uni = card.nearest_university?.short_name ?? card.nearest_university?.name;
  const d = card.distance_to_campus_km;
  if (uni && d != null) {
    const dist = d < 1 ? `${Math.round(d * 1000)}m` : `${d}km`;
    return `${dist} from ${uni}`;
  }
  return `${card.area}, ${card.city}`;
}
