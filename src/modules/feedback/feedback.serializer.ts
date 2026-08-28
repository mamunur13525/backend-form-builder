import { CommentDTO, FeedbackPostDTO } from "./feedback.types";
import { UserLike, serializeAuthor } from "../../utils/author";

export { serializeAuthor } from "../../utils/author";

const toId = (value: unknown): string => {
  if (value && typeof value === "object" && "_id" in value) {
    return String((value as { _id: unknown })._id);
  }
  return String(value);
};

/** A feedback document (lean) with `author` and `commenterIds` populated. */
export interface FeedbackLike {
  _id: unknown;
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string;
  status: FeedbackPostDTO["status"];
  boardId: string;
  author: UserLike;
  upvotedBy?: unknown[];
  upvoteCount?: number;
  commentCount?: number;
  commenterIds?: UserLike[];
  createdAt: Date;
}

export const serializeFeedback = (
  post: FeedbackLike,
  currentUserId?: string
): FeedbackPostDTO => {
  const dto: FeedbackPostDTO = {
    id: String(post._id),
    slug: post.slug,
    title: post.title,
    status: post.status,
    boardId: post.boardId,
    author: serializeAuthor(post.author),
    upvotes: post.upvoteCount ?? 0,
    commentCount: post.commentCount ?? 0,
    createdAt: new Date(post.createdAt).toISOString(),
  };

  if (post.description) dto.description = post.description;
  if (post.imageUrl) dto.imageUrl = post.imageUrl;

  if (currentUserId && Array.isArray(post.upvotedBy)) {
    dto.hasUpvoted = post.upvotedBy.some((id) => toId(id) === currentUserId);
  } else {
    dto.hasUpvoted = false;
  }

  const commenters = (post.commenterIds ?? [])
    .filter(Boolean)
    .map((u) => serializeAuthor(u));
  if (commenters.length > 0) dto.commenters = commenters;

  return dto;
};

/** A comment document (lean) with `author` populated. */
export interface CommentLike {
  _id: unknown;
  postId: unknown;
  author: UserLike;
  body: string;
  link?: { url: string; label: string };
  likeCount?: number;
  dislikeCount?: number;
  pinned?: boolean;
  createdAt: Date;
}

export const serializeComment = (comment: CommentLike): CommentDTO => {
  const dto: CommentDTO = {
    id: String(comment._id),
    postId: toId(comment.postId),
    author: serializeAuthor(comment.author),
    body: comment.body,
    createdAt: new Date(comment.createdAt).toISOString(),
    likeCount: comment.likeCount ?? 0,
    dislikeCount: comment.dislikeCount ?? 0,
  };
  if (comment.link) dto.link = comment.link;
  if (comment.pinned) dto.pinned = true;
  return dto;
};
