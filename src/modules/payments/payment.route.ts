import { Router as ExpressRouter } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import * as paymentController from "./payment.controller";

const router: ExpressRouter = ExpressRouter();

router.use(authenticate);

router.get("/:formId/payments/stripe/accounts", paymentController.getStripeAccounts);
router.get("/:formId/payments/stripe/connect-url", paymentController.getStripeConnectUrl);

export default router;
