import type { CommunityCategory } from '@/types/database';

export interface PostAuthor {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface CommunityPost {
  id: string;
  category: CommunityCategory;
  body: string;
  images: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  author: PostAuthor | null;
  likedByMe: boolean;
}

export interface PostComment {
  id: string;
  body: string;
  createdAt: string;
  author: PostAuthor | null;
}
