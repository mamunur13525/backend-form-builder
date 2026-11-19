import mongoose, { Schema, Document } from "mongoose";

/**
 * One row per Stripe webhook event id. The unique index makes delivery
 * idempotent: a retried event is acknowledged instead of applied twice.
 */
export interface IStripeWebhookEvent extends Document {
  eventId: string;
  type: string;
  /** Connected account context, when the event came from a Connect account. */
  accountId?: string;
  status: "processing" | "processed" | "failed";
  errorMessage?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const stripeWebhookEventSchema = new Schema<IStripeWebhookEvent>(
  {
    eventId: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    accountId: { type: String, default: "" },
    status: {
      type: String,
      enum: ["processing", "processed", "failed"],
      default: "processing",
      index: true,
    },
    errorMessage: { type: String, default: "" },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

export const StripeWebhookEvent = mongoose.model<IStripeWebhookEvent>(
  "StripeWebhookEvent",
  stripeWebhookEventSchema
);
