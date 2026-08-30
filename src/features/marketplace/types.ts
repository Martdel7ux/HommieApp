import type { MarketplaceCategory, MarketplaceCondition } from '@/types/database';

export interface MarketplaceImage {
  storage_path: string;
  position: number;
}

export interface MarketplaceCard {
  id: string;
  title: string;
  description: string | null;
  price: number;
  is_free: boolean;
  category: MarketplaceCategory;
  condition: MarketplaceCondition;
  city: string;
  area: string | null;
  status: 'active' | 'reserved' | 'sold' | 'archived';
  saves_count: number;
  images: MarketplaceImage[];
}

export interface MarketplaceItemDetail extends MarketplaceCard {
  created_at: string;
  seller: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
}

export interface MarketplaceFilters {
  category?: MarketplaceCategory;
  query?: string;
}

export interface MarketplacePage {
  rows: MarketplaceCard[];
  count: number;
}
