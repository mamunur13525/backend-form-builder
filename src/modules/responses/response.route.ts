import { Router, Router as ExpressRouter } from "express";
import * as responseController from "./response.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  responseIdParamSchema,
  updateResponseSchema,
  formIdParamSchema,
} from "./response.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.get("/:formId/responses", validate(formIdParamSchema), responseController.getResponses);
router.get("/:formId/responses/:responseId", validate(responseIdParamSchema), responseController.getResponseById);
router.delete("/:formId/responses/:responseId", validate(responseIdParamSchema), responseController.deleteResponse);
router.patch("/:formId/responses/:responseId", validate(updateResponseSchema), responseController.updateResponse);
router.get("/:formId/responses/export", validate(formIdParamSchema), responseController.exportResponses);
router.get("/:formId/responses/stats", validate(formIdParamSchema), responseController.getResponseStats);
router.get("/:formId/responses/summary", validate(formIdParamSchema), responseController.getResponseSummary);
router.patch("/:formId/responses/:responseId/mark-read", validate(responseIdParamSchema), responseController.markAsRead);
router.patch("/:formId/responses/:responseId/mark-unread", validate(responseIdParamSchema), responseController.markAsUnread);
router.patch("/:formId/responses/:responseId/star", validate(responseIdParamSchema), responseController.starResponse);
router.patch("/:formId/responses/:responseId/unstar", validate(responseIdParamSchema), responseController.unstarResponse);

export default router;