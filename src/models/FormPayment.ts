import mongoose, { Schema, Document } from "mongoose";
import { IForm } from "./Form";
import { IFormResponse } from "./FormResponse";

/** Platform-level payment lifecycle for one Checkout attempt. */
export type PaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "canceled"
  | "partially_refunded"
  | "refunded"
  | "disputed";

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "processing",
  "paid",
  "failed",
  "canceled",
  "partially_refunded",
  "refunded",
  "disputed",
];

export interface IFormPayment extends Document {
  formId: IForm["_id"];
  submissionId?: IFormResponse["_id"];
  /** Platform user who owns the form (and therefore the payout). */
  ownerId: mongoose.Types.ObjectId;
  workspaceId?: mongoose.Types.ObjectId;
  /** Respondent session id so retries reuse the same attempt. */
  respondentSessionId: string;
  pageKey: string;
  /** Snapshot: the connected account that processed this attempt. */
  stripeAccountId: string;
  checkoutSessionId: string;
  checkoutUrl?: string;
  paymentIntentId?: string;
  amountMinor: number;
  currency: string;
  applicationFeeMinor: number;
  status: PaymentStatus;
  refundAmountMinor: number;
  customerEmail?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const formPaymentSchema = new Schema<IFormPayment>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    submissionId: { type: Schema.Types.ObjectId, ref: "FormResponse", index: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", index: true },
    respondentSessionId: { type: String, default: "", index: true },
    pageKey: { type: String, required: true },
    stripeAccountId: { type: String, required: true, index: true },
    checkoutSessionId: { type: String, required: true, unique: true },
    checkoutUrl: { type: String, default: "" },
    paymentIntentId: { type: String, index: true },
    amountMinor: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true },
    applicationFeeMinor: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
      index: true,
    },
    refundAmountMinor: { type: Number, default: 0, min: 0 },
    customerEmail: { type: String, default: "" },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

formPaymentSchema.index({ formId: 1, createdAt: -1 });
formPaymentSchema.index({ ownerId: 1, createdAt: -1 });

export const FormPayment = mongoose.model<IFormPayment>(
  "FormPayment",
  formPaymentSchema
);
