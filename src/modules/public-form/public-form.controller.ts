import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import { httpStatus } from "../../constants/httpStatus";
import { env } from "../../config/env";
import * as publicFormService from "./public-form.service";
import * as paymentService from "../payments/payment.service";

export const getPublicForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const form = await publicFormService.getPublicForm(req.params.slug as string);
  sendSuccess(res, form, "Form retrieved successfully");
});

export const getFormSchema: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const schema = await publicFormService.getFormSchema(req.params.slug as string);
  sendSuccess(res, schema, "Form schema retrieved successfully");
});

export const getFormTheme: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const theme = await publicFormService.getFormTheme(req.params.slug as string);
  sendSuccess(res, theme, "Form theme retrieved successfully");
});

export const getFormPreview: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const preview = await publicFormService.getFormPreview(req.params.slug as string);
  sendSuccess(res, preview, "Form preview retrieved successfully");
});

export const submitForm: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await publicFormService.submitForm(
    req.params.slug as string,
    req.body,
    { ip: req.ip, userAgent: req.headers["user-agent"], referrer: req.headers["referer"] }
  );
  sendSuccess(res, result, "Form submitted successfully");
});

export const saveDraft: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await publicFormService.saveDraft(
    req.params.slug as string,
    req.body,
    { ip: req.ip, userAgent: req.headers["user-agent"], referrer: req.headers["referer"] }
  );
  sendSuccess(res, result, "Draft saved successfully");
});

export const trackView: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const result = await publicFormService.trackView(
    req.params.slug as string,
    req.body,
    { ip: req.ip, userAgent: req.headers["user-agent"], referrer: req.headers["referer"] }
  );
  sendSuccess(res, result, "Form view tracked successfully");
});

export const createPaymentSession: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const session = await paymentService.createPublicPaymentSession(
      req.params.slug as string,
      {
        pageKey: req.body.pageKey,
        email: req.body.email || undefined,
        respondentSessionId: req.body.respondentSessionId,
      }
    );
    sendSuccess(res, session, "Payment session created successfully", httpStatus.CREATED);
  }
);

export const verifyPaymentSession: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const result = await paymentService.verifyPublicPaymentSession(
      req.params.slug as string,
      req.params.sessionId as string,
      req.query.pageKey as string
    );
    sendSuccess(res, result, "Payment verified successfully");
  }
);

/**
 * Stripe Connect OAuth callback. Always ends in a redirect — a JSON error here
 * would strand the owner on a raw API page.
 */
export const stripeConnectCallback = async (req: Request, res: Response): Promise<void> => {
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const state = typeof req.query.state === "string" ? req.query.state : "";
  try {
    if (!code || !state) throw new Error("Missing Stripe OAuth parameters");
    const redirectUrl = await paymentService.completeConnect(code, state);
    res.redirect(redirectUrl);
  } catch (error) {
    console.error("Stripe connect callback failed:", error);
    res.redirect(`${env.frontendUrl}/dashboard?stripe=error`);
  }
};

export const getSubmitStatus: RequestHandler = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const status = await publicFormService.getSubmitStatus(
    req.params.slug as string,
    req.params.submissionId as string
  );
  sendSuccess(res, status, "Submission status retrieved successfully");
});