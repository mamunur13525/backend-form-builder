/**
 * Billing routes — URL declarations only.
 *
 * `/plans` and `/webhook` are public; the webhook authenticates via HMAC
 * signature instead of a JWT. Everything else requires a valid token.
 */
import { Router, Router as ExpressRouter } from "express";
import * as billingController from "./billing.controller";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import { checkoutPlanSchema } from "./billing.validation";

const router: ExpressRouter = Router();

// Public
router.get("/plans", billingController.getPlans);
router.post("/webhook", billingController.handleWebhook);

// Authenticated
router.use(authenticate);
router.get("/subscription", billingController.getMySubscription);
router.post(
  "/checkout",
  validate(checkoutPlanSchema),
  billingController.createCheckout
);
router.post(
  "/change-plan",
  validate(checkoutPlanSchema),
  billingController.changePlan
);
router.post("/cancel", billingController.cancelSubscription);
router.post("/resume", billingController.resumeSubscription);
router.get("/portal", billingController.getPortalUrl);

export default router;
