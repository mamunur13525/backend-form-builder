import { Router, Router as ExpressRouter } from "express";
import * as publicFormController from "./public-form.controller";
import { validate } from "../../middlewares/validate.middleware";
import { publicFormRateLimiter } from "../../middlewares/rate-limit.middleware";
import {
  submitFormSchema,
  saveDraftSchema,
  slugParamSchema,
  submissionIdParamSchema,
  paymentSessionSchema,
  verifyPaymentSessionSchema,
} from "./public-form.validation";

const router: ExpressRouter = Router();

router.get("/forms/:slug", validate(slugParamSchema), publicFormController.getPublicForm);
router.get("/forms/:slug/schema", validate(slugParamSchema), publicFormController.getFormSchema);
router.get("/forms/:slug/theme", validate(slugParamSchema), publicFormController.getFormTheme);
router.get("/forms/:slug/preview", validate(slugParamSchema), publicFormController.getFormPreview);
router.post("/forms/:slug/submit", publicFormRateLimiter, validate(submitFormSchema), publicFormController.submitForm);
router.post("/forms/:slug/save-draft", validate(saveDraftSchema), publicFormController.saveDraft);
router.post("/forms/:slug/track-view", publicFormController.trackView);
router.get("/forms/:slug/submit-status/:submissionId", validate(submissionIdParamSchema), publicFormController.getSubmitStatus);

// Payments: respondents pay via Stripe Checkout; the callback connects an
// owner's Stripe account.
router.post(
  "/forms/:slug/payment-session",
  publicFormRateLimiter,
  validate(paymentSessionSchema),
  publicFormController.createPaymentSession
);
router.get(
  "/forms/:slug/payment-session/:sessionId",
  validate(verifyPaymentSessionSchema),
  publicFormController.verifyPaymentSession
);
router.get("/stripe/callback", publicFormController.stripeConnectCallback);

export default router;