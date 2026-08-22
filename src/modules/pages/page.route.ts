import { Router, Router as ExpressRouter } from "express";
import * as pageController from "./page.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  createPageSchema,
  updatePageSchema,
  reorderPagesSchema,
  pageLogicSchema,
  pageIdParamSchema,
  deletePageLogicSchema,
} from "./page.validation";

const router: ExpressRouter = Router();

router.use(authenticate);

router.post("/:formId/pages", validate(createPageSchema), pageController.createPage);
router.get("/:formId/pages", pageController.getPages);
router.patch("/:formId/pages/reorder", validate(reorderPagesSchema), pageController.reorderPages);
router.get("/:formId/pages/:pageId", validate(pageIdParamSchema), pageController.getPageById);
router.patch("/:formId/pages/:pageId", validate(updatePageSchema), pageController.updatePage);
router.delete("/:formId/pages/:pageId", validate(pageIdParamSchema), pageController.deletePage);
router.patch("/:formId/pages/:pageId/duplicate", validate(pageIdParamSchema), pageController.duplicatePage);
router.patch("/:formId/pages/:pageId/logic", validate(pageLogicSchema), pageController.updatePageLogic);
router.delete("/:formId/pages/:pageId/logic", validate(deletePageLogicSchema), pageController.deletePageLogic);

export default router;