/**
 * Billing controller — request/response only. Business logic lives in
 * billing.service.ts; webhook signature verification in billing.webhook.ts.
 */
import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as billingService from "./billing.service";
import { verifyWebhookSignature } from "./billing.webhook";
import { CheckoutPlanBody } from "./billing.types";

export const getPlans: RequestHandler = asyncHandler(
  async (_req: Request, res: Response): Promise<void> => {
    sendSuccess(res, billingService.getPlans(), "Plans retrieved successfully");
  }
);

export const getMySubscription: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const subscription = await billingService.getMySubscription(req.user!.userId);
    sendSuccess(res, subscription, "Subscription retrieved successfully");
  }
);

export const createCheckout: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await billingService.createCheckout(
      req.user!.userId,
      req.body as CheckoutPlanBody
    );
    sendSuccess(res, result, "Checkout created successfully", 201);
  }
);

export const changePlan: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const subscription = await billingService.changePlan(
      req.user!.userId,
      req.body as CheckoutPlanBody
    );
    sendSuccess(res, subscription, "Plan changed successfully");
  }
);

export const cancelSubscription: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const subscription = await billingService.cancelSubscription(req.user!.userId);
    sendSuccess(res, subscription, "Subscription cancelled successfully");
  }
);

export const resumeSubscription: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const subscription = await billingService.resumeSubscription(req.user!.userId);
    sendSuccess(res, subscription, "Subscription resumed successfully");
  }
);

export const getPortalUrl: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const portal = await billingService.getPortalUrl(req.user!.userId);
    sendSuccess(res, portal, "Customer portal URL retrieved successfully");
  }
);

/**
 * Lemon Squeezy webhook receiver. Public (no JWT) — authenticity comes from
 * the HMAC signature over the raw body. Must always answer quickly; Lemon
 * Squeezy retries non-2xx responses.
 */
export const handleWebhook: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const payload = verifyWebhookSignature(req);
    await billingService.handleWebhookEvent(payload);
    sendSuccess(res, null, "Webhook processed successfully");
  }
);
