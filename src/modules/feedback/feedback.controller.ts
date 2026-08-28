import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import * as feedbackService from "./feedback.service";
import { ListFeedbackQuery } from "./feedback.types";

export const getBoards: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, feedbackService.getBoards(), "Boards retrieved successfully");
  }
);

export const listFeedback: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const q = req.query as unknown as {
      cursor: number;
      order: ListFeedbackQuery["order"];
      limit: number;
      status: ListFeedbackQuery["statuses"];
      board?: string;
      q?: string;
    };
    const page = await feedbackService.listFeedback(
      {
        cursor: q.cursor,
        order: q.order,
        limit: q.limit,
        statuses: q.status,
        boardId: q.board,
        search: q.q,
      },
      req.user?.userId
    );
    sendSuccess(res, page, "Feedback retrieved successfully");
  }
);

export const getFeedback: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const post = await feedbackService.getFeedbackBySlug(
      req.params.slug as string,
      req.user?.userId
    );
    sendSuccess(res, post, "Post retrieved successfully");
  }
);

export const createFeedback: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const post = await feedbackService.createFeedback(req.user!.userId, req.body);
    sendSuccess(res, post, "Post created successfully", httpStatus.CREATED);
  }
);

export const toggleUpvote: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const post = await feedbackService.toggleUpvote(
      req.params.id as string,
      req.user!.userId
    );
    sendSuccess(res, post, "Upvote toggled successfully");
  }
);

export const getComments: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const comments = await feedbackService.getComments(req.params.id as string);
    sendSuccess(res, comments, "Comments retrieved successfully");
  }
);

export const addComment: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const comment = await feedbackService.addComment(
      req.params.id as string,
      req.user!.userId,
      req.body
    );
    sendSuccess(res, comment, "Comment added successfully", httpStatus.CREATED);
  }
);

export const likeComment: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const comment = await feedbackService.reactToComment(
      req.params.commentId as string,
      "like"
    );
    sendSuccess(res, comment, "Comment liked");
  }
);

export const dislikeComment: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const comment = await feedbackService.reactToComment(
      req.params.commentId as string,
      "dislike"
    );
    sendSuccess(res, comment, "Comment disliked");
  }
);
