/**
 * Lemon Squeezy webhook request handling.
 *
 * Every webhook is signed with an HMAC-SHA256 digest of the exact raw request
 * body, sent in the `X-Signature` header. Verification therefore needs the
 * raw bytes — `app.ts` stashes them on `req.rawBody` via the `verify` option
 * of `express.json`.
 *
 * https://docs.lemonsqueezy.com/help/webhooks
 */
import crypto from "crypto";
import { Request } from "express";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { LemonSqueezyWebhookPayload } from "./billing.types";

export const verifyWebhookSignature = (req: Request): LemonSqueezyWebhookPayload => {
  const secret = env.lemonsqueezyWebhookSecret;
  const signature = req.headers["x-signature"];
  const rawBody = (req as any).rawBody as Buffer | string | undefined;

  if (!secret) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Webhook secret is not configured."
    );
  }

  if (!signature || typeof signature !== "string") {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Missing webhook signature.");
  }

  if (!rawBody) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing webhook payload.");
  }

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(digest, "utf8");
  const received = Buffer.from(signature, "utf8");

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid webhook signature.");
  }

  try {
    return JSON.parse(Buffer.from(rawBody).toString("utf8")) as LemonSqueezyWebhookPayload;
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid webhook payload.");
  }
};
