import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as paymentService from "./payment.service";
import { processStripeEvent, verifyStripeSignature } from "./payment.webhook";

export const getStripeAccounts: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const accounts = await paymentService.listStripeAccounts(
      req.user!.userId,
      req.params.formId as string
    );
    sendSuccess(res, accounts, "Stripe accounts retrieved successfully");
  }
);

export const refreshStripeAccounts: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const accounts = await paymentService.refreshStripeAccounts(
      req.user!.userId,
      req.params.formId as string
    );
    sendSuccess(res, accounts, "Stripe accounts refreshed successfully");
  }
);

export const getStripeConnectUrl: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const url = await paymentService.getConnectUrl(
      req.user!.userId,
      req.params.formId as string
    );
    sendSuccess(res, { url }, "Stripe connect URL created successfully");
  }
);

export const getAccountOnboardingUrl: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.getAccountOnboardingUrl(
      req.user!.userId,
      req.params.formId as string,
      req.params.accountId as string
    );
    sendSuccess(res, result, "Stripe onboarding URL created successfully");
  }
);

export const getAccountDashboardUrl: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.getAccountDashboardUrl(
      req.user!.userId,
      req.params.formId as string,
      req.params.accountId as string
    );
    sendSuccess(res, result, "Stripe dashboard URL created successfully");
  }
);

export const disconnectStripeAccount: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.disconnectStripeAccount(
      req.user!.userId,
      req.params.formId as string,
      req.params.accountId as string
    );
    sendSuccess(res, result, "Stripe account disconnected successfully");
  }
);

/* -------------------------------------------------------------------------- */
/* Owner payment history                                                      */
/* -------------------------------------------------------------------------- */

export const listPayments: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.listPayments(req.user!.userId, {
      formId: req.query.formId as string | undefined,
      status: req.query.status as string | undefined,
      currency: req.query.currency as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    sendSuccess(res, result, "Payments retrieved successfully");
  }
);

export const getPaymentsOverview: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.getPaymentsOverview(req.user!.userId);
    sendSuccess(res, result, "Payment overview retrieved successfully");
  }
);

export const getPayment: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const payment = await paymentService.getPayment(
      req.user!.userId,
      req.params.paymentId as string
    );
    sendSuccess(res, payment, "Payment retrieved successfully");
  }
);

export const refundPayment: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const payment = await paymentService.refundPayment(
      req.user!.userId,
      req.params.paymentId as string,
      req.body?.amountMinor
    );
    sendSuccess(res, payment, "Refund processed successfully");
  }
);

/**
 * Public Stripe webhook. Authenticity comes from the signature, not a JWT.
 * Returns 2xx for processed and duplicate events so Stripe stops retrying.
 */
export const handleStripeWebhook: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const event = verifyStripeSignature(req);
    const result = await processStripeEvent(event);
    sendSuccess(
      res,
      { received: true, duplicate: result.duplicate },
      "Stripe event received"
    );
  }
);
