import { Router as ExpressRouter } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import * as paymentController from "./payment.controller";

const router: ExpressRouter = ExpressRouter();

router.use(authenticate);

router.get("/:formId/payments/stripe/accounts", paymentController.getStripeAccounts);
router.post(
  "/:formId/payments/stripe/accounts/refresh",
  paymentController.refreshStripeAccounts
);
router.delete(
  "/:formId/payments/stripe/accounts/:accountId",
  paymentController.disconnectStripeAccount
);
router.get("/:formId/payments/stripe/connect-url", paymentController.getStripeConnectUrl);
router.post(
  "/:formId/payments/stripe/accounts/:accountId/onboarding-link",
  paymentController.getAccountOnboardingUrl
);
router.post(
  "/:formId/payments/stripe/accounts/:accountId/dashboard-link",
  paymentController.getAccountDashboardUrl
);

/**
 * Payments the signed-in user can see: payments for forms they own plus forms
 * in workspaces they belong to. Mounted at `/api/v1/payments`.
 */
export const paymentHistoryRouter: ExpressRouter = ExpressRouter();

paymentHistoryRouter.use(authenticate);

paymentHistoryRouter.get("/", paymentController.listPayments);
paymentHistoryRouter.get("/overview", paymentController.getPaymentsOverview);
paymentHistoryRouter.get("/:paymentId", paymentController.getPayment);
paymentHistoryRouter.post("/:paymentId/refund", paymentController.refundPayment);

export default router;
