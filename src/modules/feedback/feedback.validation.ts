import { z } from "zod";
import { FEEDBACK_STATUSES } from "../../models/Feedback";

const statusEnum = z.enum(FEEDBACK_STATUSES);

export const listFeedbackSchema = {
  query: z.object({
    cursor: z.coerce.number().int().min(1).default(1),
    order: z.enum(["trending", "top", "newest"]).default("trending"),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    // Comma-separated list of statuses, e.g. ?status=planned,in_progress
    status: z
      .string()
      .optional()
      .transform((value) =>
        value
          ? value
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : []
      )
      .pipe(z.array(statusEnum)),
    board: z.string().optional(),
    q: z.string().optional(),
  }),
};

export const slugParamSchema = {
  params: z.object({
    slug: z.string().min(1, "Slug is required"),
  }),
};

export const postIdParamSchema = {
  params: z.object({
    id: z.string().min(1, "Post ID is required"),
  }),
};

export const commentIdParamSchema = {
  params: z.object({
    commentId: z.string().min(1, "Comment ID is required"),
  }),
};

export const createFeedbackSchema = {
  body: z.object({
    title: z.string().min(1, "Title is required").max(300),
    description: z.string().max(5000).optional(),
    imageUrl: z.string().url().optional(),
    boardId: z.string().min(1, "Board is required"),
  }),
};

export const createCommentSchema = {
  body: z.object({
    body: z.string().min(1, "Comment cannot be empty").max(5000),
    link: z
      .object({
        url: z.string().url(),
        label: z.string().min(1),
      })
      .optional(),
  }),
  params: z.object({
    id: z.string().min(1, "Post ID is required"),
  }),
};
