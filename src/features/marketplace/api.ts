import { supabase, STORAGE_BUCKETS } from '@/lib/supabase';
import { resolveImage, resolveAvatar } from '@/lib/images';
import { guard } from '@/services/errors';
import { uploadImage } from '@/lib/upload';
import { PAGE_SIZE } from '@/config/constants';
import type { MarketplaceCategory, MarketplaceCondition } from '@/types/database';
import type {
  MarketplaceCard,
  MarketplaceFilters,
  MarketplaceImage,
  MarketplaceItemDetail,
  MarketplacePage,
} from './types';

export interface NewListingInput {
  title: string;
  price: number;
  isFree: boolean;
  category: MarketplaceCategory;
  condition: MarketplaceCondition;
  description?: string;
  city: string;
  area?: string | null;
  photos: { uri: string; mimeType?: string | null }[];
}

const CARD_SELECT = `
  id, title, description, price, is_free, category, condition, city, area, status, saves_count,
  images:marketplace_listing_images ( storage_path, position )
`;

export const marketplaceApi = {
  async list(
    filters: MarketplaceFilters = {},
    opts: { limit?: number; offset?: number; withCount?: boolean } = {},
  ): Promise<MarketplacePage> {
    return guard(async () => {
      let q = supabase
        .from('marketplace_listings')
        .select(CARD_SELECT, opts.withCount ? { count: 'exact' } : undefined)
        .in('status', ['active', 'reserved'])
        .order('created_at', { ascending: false });

      if (filters.category) q = q.eq('category', filters.category);
      if (filters.query) {
        const term = `%${filters.query.replace(/[%_]/g, '')}%`;
        q = q.or(`title.ilike.${term},description.ilike.${term}`);
      }

      const limit = opts.limit ?? PAGE_SIZE.marketplace;
      const offset = opts.offset ?? 0;

      const { data, error, count } = await q
        .range(offset, offset + limit - 1)
        .returns<MarketplaceCard[]>();
      if (error) throw error;
      return { rows: data ?? [], count: count ?? data?.length ?? 0 };
    }, { scope: 'marketplace.list' });
  },

  async get(id: string): Promise<MarketplaceItemDetail> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select(
          `${CARD_SELECT}, created_at,
           seller:profiles!marketplace_listings_seller_id_fkey ( id, first_name, display_name, avatar_url )`,
        )
        .eq('id', id)
        .single<
          MarketplaceCard & {
            created_at: string;
            seller: {
              id: string;
              first_name: string | null;
              display_name: string | null;
              avatar_url: string | null;
            } | null;
          }
        >();
      if (error) throw error;
      return {
        ...data,
        seller: data.seller
          ? {
              id: data.seller.id,
              name: data.seller.first_name ?? data.seller.display_name ?? 'Student',
              avatarUrl: resolveAvatar(data.seller.avatar_url) ?? null,
            }
          : null,
      };
    }, { scope: 'marketplace.get' });
  },

  async create(userId: string, input: NewListingInput): Promise<string> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .insert({
          seller_id: userId,
          title: input.title.trim(),
          description: input.description?.trim() || null,
          category: input.category,
          condition: input.condition,
          price: input.isFree ? 0 : Math.round(input.price),
          is_free: input.isFree,
          city: input.city,
          area: input.area ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;
      const id = data.id as string;

      if (input.photos.length) {
        const rows: { listing_id: string; storage_path: string; position: number }[] = [];
        for (let i = 0; i < input.photos.length; i++) {
          const photo = input.photos[i];
          const path = await uploadImage(
            STORAGE_BUCKETS.marketplaceImages,
            `${userId}/${id}`,
            photo.uri,
            { contentType: photo.mimeType ?? 'image/jpeg' },
          );
          rows.push({ listing_id: id, storage_path: path, position: i });
        }
        const { error: imgErr } = await supabase.from('marketplace_listing_images').insert(rows);
        if (imgErr) throw imgErr;
      }

      return id;
    }, { scope: 'marketplace.create' });
  },

  async savedIds(userId: string): Promise<string[]> {
    return guard(async () => {
      const { data, error } = await supabase
        .from('saved_marketplace_listings')
        .select('listing_id')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r) => r.listing_id);
    }, { scope: 'marketplace.savedIds' });
  },

  async toggleSave(userId: string, listingId: string, next: boolean) {
    return guard(async () => {
      if (next) {
        const { error } = await supabase
          .from('saved_marketplace_listings')
          .insert({ user_id: userId, listing_id: listingId });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('saved_marketplace_listings')
          .delete()
          .eq('user_id', userId)
          .eq('listing_id', listingId);
        if (error) throw error;
      }
    }, { scope: 'marketplace.toggleSave' });
  },
};

/** All images for an item, sorted, de-duped, resolved to URLs. */
export function itemImages(images: MarketplaceImage[] | null | undefined): string[] {
  const urls = [...(images ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((i) => resolveImage(i.storage_path, STORAGE_BUCKETS.marketplaceImages))
    .filter((u): u is string => !!u);
  return [...new Set(urls)];
}

export function itemCover(images: MarketplaceImage[] | null | undefined): string | undefined {
  return itemImages(images)[0];
}

/** "€45" / "Free" */
export function priceLabel(item: Pick<MarketplaceCard, 'price' | 'is_free'>): string {
  return item.is_free || item.price === 0 ? 'Free' : `€${item.price}`;
}
