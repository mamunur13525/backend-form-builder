import { Router, Router as ExpressRouter } from "express";
import * as publicFormController from "./public-form.controller";
import { validate } from "../../middlewares/validate.middleware";
import { publicFormRateLimiter } from "../../middlewares/rate-limit.middleware";
import {
  submitFormSchema,
  saveDraftSchema,
  slugParamSchema,
  submissionIdParamSchema,
} from "./public-form.validation";

const router: ExpressRouter = Router();

router.get("/forms/:slug", validate(slugParamSchema), publicFormController.getPublicForm);
router.get("/forms/:slug/schema", validate(slugParamSchema), publicFormController.getFormSchema);
router.get("/forms/:slug/theme", validate(slugParamSchema), publicFormController.getFormTheme);
router.get("/forms/:slug/preview", validate(slugParamSchema), publicFormController.getFormPreview);
router.post("/forms/:slug/submit", publicFormRateLimiter, validate(submitFormSchema), publicFormController.submitForm);
router.post("/forms/:slug/save-draft", validate(saveDraftSchema), publicFormController.saveDraft);
router.get("/forms/:slug/submit-status/:submissionId", validate(submissionIdParamSchema), publicFormController.getSubmitStatus);

export default router;