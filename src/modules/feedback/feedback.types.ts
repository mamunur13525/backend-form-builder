import { FeedbackStatus } from "../../models/Feedback";
import { AuthorDTO } from "../../utils/author";

export type { AuthorDTO } from "../../utils/author";

/** Sidebar board descriptor returned by `GET /feedback/boards`. */
export interface Board {
  id: string;
  name: string;
  color: string;
}


export interface FeedbackPostDTO {
  id: string;
  slug: string;
  title: string;
  description?: string;
  /** Optional ImageKit URL for an image attached to the submission. */
  imageUrl?: string;
  status: FeedbackStatus;
  boardId: string;
  author: AuthorDTO;
  upvotes: number;
  commentCount: number;
  createdAt: string;
  hasUpvoted?: boolean;
  commenters?: AuthorDTO[];
}

export interface CommentDTO {
  id: string;
  postId: string;
  author: AuthorDTO;
  body: string;
  link?: { url: string; label: string };
  createdAt: string;
  /** Plain reaction counters (increment-only, no per-user state). */
  likeCount: number;
  dislikeCount: number;
  pinned?: boolean;
}

export type SortOrder = "trending" | "top" | "newest";

export interface ListFeedbackQuery {
  cursor: number;
  order: SortOrder;
  limit: number;
  statuses?: FeedbackStatus[];
  boardId?: string;
  search?: string;
}

export interface FeedbackPageDTO {
  items: FeedbackPostDTO[];
  nextCursor: number | null;
  total: number;
}

export interface CreateFeedbackBody {
  title: string;
  description?: string;
  imageUrl?: string;
  boardId: string;
}

export interface CreateCommentBody {
  body: string;
  link?: { url: string; label: string };
}
