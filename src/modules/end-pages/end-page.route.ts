import { Router, Router as ExpressRouter } from "express";
import * as endPageController from "./end-page.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createEndPageSchema,
  updateEndPageSchema,
  endPageIdParamSchema,
  reorderEndPagesSchema,
} from "./end-page.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.post("/:formId/end-pages", validate(createEndPageSchema), endPageController.createEndPage);
router.get("/:formId/end-pages", endPageController.getEndPages);
router.patch("/:formId/end-pages/reorder", validate(reorderEndPagesSchema), endPageController.reorderEndPages);
router.get("/:formId/end-pages/:endPageId", validate(endPageIdParamSchema), endPageController.getEndPageById);
router.patch("/:formId/end-pages/:endPageId", validate(updateEndPageSchema), endPageController.updateEndPage);
router.delete("/:formId/end-pages/:endPageId", validate(endPageIdParamSchema), endPageController.deleteEndPage);
router.patch("/:formId/end-pages/:endPageId/duplicate", validate(endPageIdParamSchema), endPageController.duplicateEndPage);

export default router;
