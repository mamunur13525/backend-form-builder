import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { generateUniqueSlug } from "../../utils/slug";
import * as feedbackRepo from "./feedback.repository";
import {
  serializeFeedback,
  serializeComment,
} from "./feedback.serializer";
import {
  BOARDS,
  isValidBoardId,
} from "./feedback.boards";
import {
  Board,
  CommentDTO,
  CreateCommentBody,
  CreateFeedbackBody,
  FeedbackPageDTO,
  FeedbackPostDTO,
  ListFeedbackQuery,
} from "./feedback.types";

export const getBoards = (): Board[] => BOARDS;

export const listFeedback = async (
  query: ListFeedbackQuery,
  currentUserId?: string
): Promise<FeedbackPageDTO> => {
  const { cursor, order, limit, statuses, boardId, search } = query;
  const filter = { statuses, boardId, search };
  const skip = (cursor - 1) * limit;

  const [posts, total] = await Promise.all([
    feedbackRepo.findPosts(filter, order, skip, limit),
    feedbackRepo.countPosts(filter),
  ]);

  const items = posts.map((p) => serializeFeedback(p, currentUserId));
  const nextCursor = skip + limit < total ? cursor + 1 : null;

  return { items, nextCursor, total };
};

export const getFeedbackBySlug = async (
  slug: string,
  currentUserId?: string
): Promise<FeedbackPostDTO> => {
  const post = await feedbackRepo.findPostBySlug(slug);
  if (!post) throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
  return serializeFeedback(post, currentUserId);
};

export const createFeedback = async (
  userId: string,
  data: CreateFeedbackBody
): Promise<FeedbackPostDTO> => {
  if (!isValidBoardId(data.boardId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Unknown board");
  }

  const slug = await generateUniqueSlug(data.title, feedbackRepo.slugExists);

  const post = await feedbackRepo.createPost({
    slug,
    title: data.title,
    description: data.description,
    imageUrl: data.imageUrl,
    boardId: data.boardId,
    author: userId,
  });

  // The author implicitly upvotes their own submission.
  return serializeFeedback(post, userId);
};

export const toggleUpvote = async (
  postId: string,
  userId: string
): Promise<FeedbackPostDTO> => {
  const post = await feedbackRepo.toggleUpvote(postId, userId);
  if (!post) throw new ApiError(httpStatus.NOT_FOUND, "Post not found");
  return serializeFeedback(post, userId);
};

export const getComments = async (postId: string): Promise<CommentDTO[]> => {
  const comments = await feedbackRepo.findComments(postId);
  return comments.map(serializeComment);
};

export const addComment = async (
  postId: string,
  userId: string,
  data: CreateCommentBody
): Promise<CommentDTO> => {
  const post = await feedbackRepo.findPostById(postId);
  if (!post) throw new ApiError(httpStatus.NOT_FOUND, "Post not found");

  const created = await feedbackRepo.createComment({
    postId,
    author: userId,
    body: data.body,
    link: data.link,
  });

  const populated = await feedbackRepo.findCommentById(String(created._id));
  return serializeComment(populated);
};

export const reactToComment = async (
  commentId: string,
  reaction: "like" | "dislike"
): Promise<CommentDTO> => {
  const field = reaction === "like" ? "likeCount" : "dislikeCount";
  const updated = await feedbackRepo.bumpCommentReaction(commentId, field);
  if (!updated) throw new ApiError(httpStatus.NOT_FOUND, "Comment not found");
  return serializeComment(updated);
};
