/**
 * Stripe Connect webhook handling. Stripe is the authoritative source of
 * payment status: the success-page verification only speeds the UI up.
 *
 * Signature verification follows Stripe's `Stripe-Signature: t=…,v1=…`
 * scheme over the exact raw body (stashed by `app.ts` on `req.rawBody`).
 * https://docs.stripe.com/webhooks/signature
 */
import crypto from "crypto";
import { Request } from "express";
import { env } from "../../config/env";
import { ApiError } from "../../utils/ApiError";
import { httpStatus } from "../../constants/httpStatus";
import { FormPayment } from "../../models/FormPayment";
import { StripeWebhookEvent } from "../../models/StripeWebhookEvent";
import { syncStripeAccountSnapshot } from "./payment.service";

interface StripeEvent {
  id: string;
  type: string;
  /** Connected account context for Connect events. */
  account?: string;
  data: { object: Record<string, any> };
}

const TOLERANCE_SECONDS = 300;

export const verifyStripeSignature = (req: Request): StripeEvent => {
  const secret = env.stripeWebhookSecret;
  const header = req.headers["stripe-signature"];
  const rawBody = (req as any).rawBody as Buffer | string | undefined;

  if (!secret) {
    throw new ApiError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Stripe webhooks are not configured. Set STRIPE_WEBHOOK_SECRET."
    );
  }
  if (!header || typeof header !== "string") {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Missing Stripe signature.");
  }
  if (!rawBody) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing webhook payload.");
  }

  const parts = header.split(",").map((part) => part.trim());
  const timestamp = Number(
    parts.find((part) => part.startsWith("t="))?.slice(2) || 0
  );
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Malformed Stripe signature.");
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Stripe signature expired.");
  }

  const payload = `${timestamp}.${rawBody.toString()}`;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const valid = signatures.some((signature) => {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
  if (!valid) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid Stripe signature.");
  }

  try {
    return JSON.parse(rawBody.toString()) as StripeEvent;
  } catch {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid webhook payload.");
  }
};

const objectId = (value: unknown): string =>
  typeof value === "string"
    ? value
    : typeof value === "object" && value !== null
      ? String((value as { id?: unknown }).id || "")
      : "";

const markCheckoutSession = async (session: Record<string, any>) => {
  const paid = session.payment_status === "paid";
  await FormPayment.updateOne(
    { checkoutSessionId: session.id },
    {
      $set: {
        status: paid ? "paid" : "processing",
        ...(session.payment_intent
          ? { paymentIntentId: objectId(session.payment_intent) }
          : {}),
        ...(paid ? { paidAt: new Date() } : {}),
        ...(typeof session.amount_total === "number"
          ? { amountMinor: session.amount_total }
          : {}),
        ...(session.currency ? { currency: session.currency } : {}),
        ...(session.customer_details?.email
          ? { customerEmail: session.customer_details.email }
          : {}),
      },
    }
  );
};

const handleEvent = async (event: StripeEvent): Promise<void> => {
  const object = event.data?.object || {};

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await markCheckoutSession(object);
      break;

    case "checkout.session.async_payment_failed":
      await FormPayment.updateOne(
        { checkoutSessionId: object.id, status: { $ne: "paid" } },
        { $set: { status: "failed" } }
      );
      break;

    case "checkout.session.expired":
      await FormPayment.updateOne(
        { checkoutSessionId: object.id, status: "pending" },
        { $set: { status: "canceled" } }
      );
      break;

    case "payment_intent.payment_failed":
      if (object.id) {
        await FormPayment.updateOne(
          {
            paymentIntentId: object.id,
            status: { $nin: ["paid", "partially_refunded", "refunded"] },
          },
          { $set: { status: "failed" } }
        );
      }
      break;

    case "charge.refunded": {
      const paymentIntentId = objectId(object.payment_intent);
      if (!paymentIntentId) break;
      const payment = await FormPayment.findOne({ paymentIntentId });
      if (!payment) break;
      payment.refundAmountMinor = Number(
        object.amount_refunded ?? payment.refundAmountMinor
      );
      if (payment.status !== "disputed") {
        payment.status =
          payment.refundAmountMinor >= payment.amountMinor
            ? "refunded"
            : "partially_refunded";
      }
      await payment.save();
      break;
    }

    case "charge.dispute.created":
    case "charge.dispute.updated": {
      const paymentIntentId = objectId(object.payment_intent);
      if (paymentIntentId) {
        await FormPayment.updateOne(
          { paymentIntentId },
          { $set: { status: "disputed" } }
        );
      }
      break;
    }

    case "charge.dispute.closed": {
      const paymentIntentId = objectId(object.payment_intent);
      if (!paymentIntentId) break;
      const payment = await FormPayment.findOne({ paymentIntentId });
      if (!payment) break;
      payment.status =
        payment.refundAmountMinor >= payment.amountMinor
          ? "refunded"
          : payment.refundAmountMinor > 0
            ? "partially_refunded"
            : "paid";
      await payment.save();
      break;
    }

    case "account.updated": {
      const accountId = object.id || event.account || "";
      if (accountId) {
        await syncStripeAccountSnapshot(accountId, {
          id: accountId,
          country: object.country,
          email: object.email,
          charges_enabled: object.charges_enabled,
          payouts_enabled: object.payouts_enabled,
          details_submitted: object.details_submitted,
          requirements: object.requirements,
        });
      }
      break;
    }

    default:
      // Unrelated event types are acknowledged, not retried forever.
      break;
  }
};

/** Idempotent processing: unique event id, retries allowed after a failure. */
export const processStripeEvent = async (event: StripeEvent) => {
  let record = await StripeWebhookEvent.findOne({ eventId: event.id });

  if (record?.status === "processed" || record?.status === "processing") {
    return { duplicate: true };
  }

  if (!record) {
    try {
      record = await StripeWebhookEvent.create({
        eventId: event.id,
        type: event.type,
        accountId: event.account || "",
        status: "processing",
      });
    } catch {
      // A concurrent delivery created the row first.
      record = await StripeWebhookEvent.findOne({ eventId: event.id });
      if (!record || record.status !== "failed") return { duplicate: true };
    }
  }

  record.status = "processing";
  record.errorMessage = "";
  await record.save();

  try {
    await handleEvent(event);
    record.status = "processed";
    record.processedAt = new Date();
    await record.save();
    return { duplicate: false };
  } catch (error) {
    record.status = "failed";
    record.errorMessage =
      error instanceof Error ? error.message : "Unknown webhook failure";
    await record.save();
    throw error;
  }
};
