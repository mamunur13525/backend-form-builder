import { Request, Response, RequestHandler } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/ApiResponse";
import * as paymentService from "./payment.service";

export const getStripeAccounts: RequestHandler = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const accounts = await paymentService.listStripeAccounts(
      req.user!.userId,
      req.params.formId as string
    );
    sendSuccess(res, accounts, "Stripe accounts retrieved successfully");
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
