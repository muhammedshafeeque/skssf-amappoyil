import { z } from 'zod';
import { POST_CATEGORIES, POST_STATUSES, REACTIONS } from '../enums.js';
import { trimmed } from './common.js';
import type { Stamped, TimestampLike } from './common.js';

export const postInputSchema = z.object({
  title: trimmed(160),
  /** Sanitised HTML from the rich text editor. */
  body: z.string().max(20000),
  category: z.enum(POST_CATEGORIES),
  pinned: z.boolean().default(false),
  images: z.array(z.string().url()).max(10).default([]),
});
export type PostInput = z.infer<typeof postInputSchema>;

export interface Post extends PostInput, Stamped {
  id: string;
  status: (typeof POST_STATUSES)[number];
  publishAt?: TimestampLike;
  publishedAt?: TimestampLike;
  authorId: string;
  reactionCounts?: Partial<Record<(typeof REACTIONS)[number], number>>;
}

/** posts/{postId}/reactions/{memberId} — one reaction per member. */
export interface PostReaction {
  reaction: (typeof REACTIONS)[number];
  at: TimestampLike;
}

/** requests payload when a member submits news / event photos. */
export const postRequestPayloadSchema = z.object({
  title: trimmed(160),
  body: z.string().trim().max(5000),
  category: z.enum(POST_CATEGORIES),
  images: z.array(z.string()).max(6).default([]),
});
export type PostRequestPayload = z.infer<typeof postRequestPayloadSchema>;
