import { Feedback, IFeedback } from "../../models/Feedback";
import { FeedbackComment, IFeedbackComment } from "../../models/Comment";
import { SortOrder } from "./feedback.types";

const AUTHOR_FIELDS = "name role avatarUrl";

const sortForOrder = (order: SortOrder): Record<string, 1 | -1> => {
  switch (order) {
    case "newest":
      return { createdAt: -1 };
    case "top":
      return { upvoteCount: -1, createdAt: -1 };
    case "trending":
    default:
      // Approximation of the reference "decayed score": posts with more votes
      // and discussion float up, ties broken by recency.
      return { upvoteCount: -1, commentCount: -1, createdAt: -1 };
  }
};

interface ListFilter {
  statuses?: string[];
  boardId?: string;
  search?: string;
}

const buildFilter = (filter: ListFilter): Record<string, unknown> => {
  const query: Record<string, unknown> = {};
  if (filter.statuses && filter.statuses.length > 0) {
    query.status = { $in: filter.statuses };
  }
  if (filter.boardId) {
    query.boardId = filter.boardId;
  }
  if (filter.search && filter.search.trim()) {
    const rx = new RegExp(
      filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    query.$or = [{ title: rx }, { description: rx }];
  }
  return query;
};

export const findPosts = async (
  filter: ListFilter,
  order: SortOrder,
  skip: number,
  limit: number
): Promise<any[]> => {
  return Feedback.find(buildFilter(filter))
    .sort(sortForOrder(order))
    .skip(skip)
    .limit(limit)
    .populate("author", AUTHOR_FIELDS)
    .populate("commenterIds", AUTHOR_FIELDS)
    .lean();
};

export const countPosts = async (filter: ListFilter): Promise<number> => {
  return Feedback.countDocuments(buildFilter(filter));
};

export const findPostBySlug = async (slug: string): Promise<any | null> => {
  return Feedback.findOne({ slug })
    .populate("author", AUTHOR_FIELDS)
    .populate("commenterIds", AUTHOR_FIELDS)
    .lean();
};

export const findPostById = async (id: string): Promise<IFeedback | null> => {
  return Feedback.findById(id);
};

export const slugExists = async (slug: string): Promise<boolean> => {
  return (await Feedback.countDocuments({ slug })) > 0;
};

export const createPost = async (data: {
  slug: string;
  title: string;
  description?: string;
  imageUrl?: string;
  boardId: string;
  author: string;
}): Promise<any> => {
  const created = await Feedback.create({
    ...data,
    status: "pending",
    upvotedBy: [data.author],
    upvoteCount: 1,
    commentCount: 0,
    commenterIds: [],
  });
  return Feedback.findById(created._id)
    .populate("author", AUTHOR_FIELDS)
    .populate("commenterIds", AUTHOR_FIELDS)
    .lean();
};

export const toggleUpvote = async (
  postId: string,
  userId: string
): Promise<any | null> => {
  const post = await Feedback.findById(postId);
  if (!post) return null;

  const hasUpvoted = post.upvotedBy.some((id) => String(id) === userId);
  const mutation = hasUpvoted
    ? { $pull: { upvotedBy: userId }, $inc: { upvoteCount: -1 } }
    : { $addToSet: { upvotedBy: userId }, $inc: { upvoteCount: 1 } };

  return Feedback.findByIdAndUpdate(postId, mutation, { new: true })
    .populate("author", AUTHOR_FIELDS)
    .populate("commenterIds", AUTHOR_FIELDS)
    .lean();
};

export const findComments = async (postId: string): Promise<any[]> => {
  return FeedbackComment.find({ postId })
    .sort({ pinned: -1, createdAt: -1 })
    .populate("author", AUTHOR_FIELDS)
    .lean();
};

export const createComment = async (data: {
  postId: string;
  author: string;
  body: string;
  link?: { url: string; label: string };
}): Promise<IFeedbackComment> => {
  const comment = await FeedbackComment.create(data);
  // Keep the post's comment count and commenter avatars in sync.
  await Feedback.findByIdAndUpdate(data.postId, {
    $inc: { commentCount: 1 },
    $addToSet: { commenterIds: data.author },
  });
  return comment;
};

export const findCommentById = async (id: string): Promise<any | null> => {
  return FeedbackComment.findById(id).populate("author", AUTHOR_FIELDS).lean();
};

/**
 * Increment a comment's like/dislike counter. Plain counters — no per-user
 * state — so each call bumps the count by one and returns the populated,
 * lean comment (or null when the comment id doesn't exist).
 */
export const bumpCommentReaction = async (
  commentId: string,
  field: "likeCount" | "dislikeCount"
): Promise<any | null> => {
  return FeedbackComment.findByIdAndUpdate(
    commentId,
    { $inc: { [field]: 1 } },
    { new: true }
  )
    .populate("author", AUTHOR_FIELDS)
    .lean();
};
