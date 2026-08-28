import { Router, Router as ExpressRouter } from "express";
import * as feedbackController from "./feedback.controller";
import { validate } from "../../middlewares/validate.middleware";
import {
  authenticate,
  optionalAuthenticate,
} from "../../middlewares/auth.middleware";
import {
  listFeedbackSchema,
  slugParamSchema,
  postIdParamSchema,
  commentIdParamSchema,
  createFeedbackSchema,
  createCommentSchema,
} from "./feedback.validation";

const router: ExpressRouter = Router();

// Static route first so "boards" is never parsed as a :slug.
router.get("/boards", feedbackController.getBoards);

// Public list/detail — optional auth so signed-in viewers get `hasUpvoted`.
router.get("/", optionalAuthenticate, validate(listFeedbackSchema), feedbackController.listFeedback);
router.post("/", authenticate, validate(createFeedbackSchema), feedbackController.createFeedback);

// Comments (two-segment paths, no clash with :slug).
router.get("/:id/comments", validate(postIdParamSchema), feedbackController.getComments);
router.post("/:id/comments", authenticate, validate(createCommentSchema), feedbackController.addComment);

// Comment reactions — plain increment-only counters. The `/comments/...` prefix
// is three segments, so it never collides with `/:id/comments` or `/:slug`.
router.patch("/comments/:commentId/like", authenticate, validate(commentIdParamSchema), feedbackController.likeComment);
router.patch("/comments/:commentId/dislike", authenticate, validate(commentIdParamSchema), feedbackController.dislikeComment);

// Upvote toggle.
router.patch("/:id/upvote", authenticate, validate(postIdParamSchema), feedbackController.toggleUpvote);

// Slug detail last.
router.get("/:slug", optionalAuthenticate, validate(slugParamSchema), feedbackController.getFeedback);

export default router;
