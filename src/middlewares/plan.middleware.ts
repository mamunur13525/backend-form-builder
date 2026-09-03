/**
 * Plan gating middleware — same pattern as `authorize`, but based on the
 * account's subscription plan instead of its role.
 */
import { Request, Response, NextFunction, RequestHandler } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { httpStatus } from "../constants/httpStatus";
import * as billingService from "../modules/billing/billing.service";
import { PlanId } from "../modules/billing/billing.types";

export const requirePlan = (...allowed: PlanId[]): RequestHandler =>
  asyncHandler(
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const plan = await billingService.getEffectivePlan(req.user!.userId);

      if (!allowed.includes(plan)) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "Your current plan does not include this feature. Please upgrade."
        );
      }

      next();
    }
  );
