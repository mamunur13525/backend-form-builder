import mongoose, { Schema, Document } from "mongoose";

export type PlanId = "free" | "pro" | "team";
export type BillingInterval = "monthly" | "yearly";
export type SubscriptionStatus =
  | "free"
  | "active"
  | "on_trial"
  | "past_due"
  | "cancelled"
  | "expired"
  | "paused";

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  plan: PlanId;
  interval: BillingInterval;
  status: SubscriptionStatus;
  /** Lemon Squeezy ids — kept as strings to avoid JS number precision issues. */
  lsCustomerId?: string;
  lsSubscriptionId?: string;
  lsOrderId?: string;
  lsVariantId?: string;
  renewsAt?: Date;
  /** When a cancelled subscription stops granting paid access. */
  endsAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  lastPaymentAt?: Date;
  testMode: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "team"],
      default: "free",
    },
    interval: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    status: {
      type: String,
      enum: ["free", "active", "on_trial", "past_due", "cancelled", "expired", "paused"],
      default: "free",
    },
    lsCustomerId: { type: String },
    lsSubscriptionId: { type: String, sparse: true, unique: true, index: true },
    lsOrderId: { type: String },
    lsVariantId: { type: String },
    renewsAt: { type: Date },
    endsAt: { type: Date },
    cancelledAt: { type: Date },
    cancelReason: { type: String },
    lastPaymentAt: { type: Date },
    testMode: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model<ISubscription>(
  "Subscription",
  subscriptionSchema
);
