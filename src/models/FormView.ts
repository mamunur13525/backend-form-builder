import mongoose, { Schema, Document } from "mongoose";
import { IForm } from "./Form";

export interface IFormView extends Document {
  formId: IForm["_id"];
  sessionId: string;
  device: "desktop" | "mobile" | "tablet";
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  started: boolean;
  completed: boolean;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const formViewSchema = new Schema<IFormView>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    sessionId: { type: String, required: true },
    device: { type: String, enum: ["desktop", "mobile", "tablet"], default: "desktop", index: true },
    ipAddress: { type: String, default: "" },
    userAgent: { type: String, default: "" },
    referrer: { type: String, default: "" },
    started: { type: Boolean, default: false, index: true },
    completed: { type: Boolean, default: false, index: true },
    startedAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

formViewSchema.index({ formId: 1, createdAt: -1 });
formViewSchema.index({ formId: 1, sessionId: 1 }, { unique: true });

export const FormView = mongoose.model<IFormView>("FormView", formViewSchema);
