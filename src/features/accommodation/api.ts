import { supabase } from '@/lib/supabase';
import { resolveImage } from '@/lib/images';
import { guard } from '@/services/errors';
import { PAGE_SIZE } from '@/config/constants';
import type { AccommodationCard, AccommodationFilters } from './types';

const CARD_SELECT = `
  id, title, rent_month, deposit, bills_included, property_type, bedrooms, bathrooms,
  furnished, roommate_suitable, city, area, available_from, amenities, saves_count,
  views_count, published_at, status,
  images:accommodation_listing_images ( storage_path, position ),
  landlord:profiles!accommodation_listings_landlord_id_fkey (
    id, display_name, avatar_url,
    landlord_profile:landlord_profiles ( verification, business_name )
  )
`;

export const accommodationApi = {
  async list(filters: AccommodationFilters = {}, opts: { limit?: number; offset?: number } = {}) {
    return guard(async () => {
      let q = supabase.from('accommodation_listings').select(CARD_SELECT).eq('status', 'active');

      if (filters.query) {
        const term = `%${filters.query}%`;
        q = q.or(`title.ilike.${term},area.ilike.${term},city.ilike.${term}`);
      }
      if (filters.city) q = q.eq('city', filters.city);
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

      const { data, error } = await ordered.range(offset, offset + limit - 1).returns<AccommodationCard[]>();
      if (error) throw error;
      return data ?? [];
    }, { scope: 'accommodation.list' });
  },

  /** Home rail: freshest active listings, nudged toward the student's city. */
  async recommended(city: string | null | undefined, limit = 6) {
    const inCity = city ? await this.list({ city, sort: 'newest' }, { limit }) : [];
    if (inCity.length >= limit) return inCity;
    const rest = await this.list({ sort: 'newest' }, { limit: limit + inCity.length });
    const seen = new Set(inCity.map((l) => l.id));
    return [...inCity, ...rest.filter((l) => !seen.has(l.id))].slice(0, limit);
  },

  async savedIds(userId: string): Promise<Set<string>> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('saved_accommodation_listings')
        .select('listing_id')
        .eq('user_id', userId);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.listing_id));
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
