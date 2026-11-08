import { Router, Router as ExpressRouter } from "express";
import * as questionController from "./question.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createQuestionSchema,
  updateQuestionSchema,
  reorderQuestionsSchema,
  questionIdParamSchema,
} from "./question.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

// Page-scoped Question endpoints
router.post(
  "/:formId/pages/:pageId/questions",
  validate(createQuestionSchema),
  questionController.createQuestion
);
router.get("/:formId/pages/:pageId/questions", questionController.getQuestions);
router.get(
  "/:formId/pages/:pageId/questions/:questionId",
  validate(questionIdParamSchema),
  questionController.getQuestionById
);
router.patch(
  "/:formId/pages/:pageId/questions/reorder",
  validate(reorderQuestionsSchema),
  questionController.reorderQuestions
);
router.patch(
  "/:formId/pages/:pageId/questions/:questionId",
  validate(updateQuestionSchema),
  questionController.updateQuestion
);
router.delete(
  "/:formId/pages/:pageId/questions/:questionId",
  validate(questionIdParamSchema),
  questionController.deleteQuestion
);

// Form-scoped Question endpoints
router.post(
  "/:formId/questions",
  validate(createQuestionSchema),
  questionController.createQuestion
);
router.get("/:formId/questions", questionController.getQuestions);
router.patch(
  "/:formId/questions/reorder",
  validate(reorderQuestionsSchema),
  questionController.reorderQuestions
);
router.patch(
  "/:formId/questions/:questionId",
  validate(updateQuestionSchema),
  questionController.updateQuestion
);
router.delete(
  "/:formId/questions/:questionId",
  validate(questionIdParamSchema),
  questionController.deleteQuestion
);

// Page-scoped Block endpoints (legacy backwards compatibility)
router.post(
  "/:formId/pages/:pageId/blocks",
  validate(createQuestionSchema),
  questionController.createQuestion
);
router.get("/:formId/pages/:pageId/blocks", questionController.getQuestions);
router.get(
  "/:formId/pages/:pageId/blocks/:blockId",
  validate(questionIdParamSchema),
  questionController.getQuestionById
);
router.patch(
  "/:formId/pages/:pageId/blocks/reorder",
  validate(reorderQuestionsSchema),
  questionController.reorderQuestions
);
router.patch(
  "/:formId/pages/:pageId/blocks/:blockId",
  validate(updateQuestionSchema),
  questionController.updateQuestion
);
router.delete(
  "/:formId/pages/:pageId/blocks/:blockId",
  validate(questionIdParamSchema),
  questionController.deleteQuestion
);

// Form-scoped Block endpoints (legacy backwards compatibility)
router.post("/:formId/blocks", validate(createQuestionSchema), questionController.createQuestion);
router.get("/:formId/blocks", questionController.getQuestions);
router.patch("/:formId/blocks/reorder", validate(reorderQuestionsSchema), questionController.reorderQuestions);
router.patch("/:formId/blocks/:blockId", validate(updateQuestionSchema), questionController.updateQuestion);
router.delete("/:formId/blocks/:blockId", validate(questionIdParamSchema), questionController.deleteQuestion);

export default router;