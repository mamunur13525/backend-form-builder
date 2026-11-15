import mongoose, { Schema, Document } from "mongoose";
import { IForm } from "./Form";
import { IUser } from "./User";

export interface IFormResponse extends Document {
  formId: IForm["_id"];
  formVersionId?: mongoose.Types.ObjectId;
  respondentId?: IUser["_id"];
  sessionId: string;
  status: "completed" | "partial";
  answers: {
    pageKey: string;
    blockKey?: string;
    questionKey?: string;
    label: string;
    title?: string;
    type: string;
    value: any;
  }[];
  /**
   * Calculation variables recomputed server-side at submission time from the
   * published version's logic rules (clients cannot spoof these values).
   */
  computedVariables?: {
    name: string;
    value: any;
  }[];
  metadata: {
    ipAddress: string;
    userAgent: string;
    referrer: string;
    country: string;
    city: string;
  };
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const formResponseSchema = new Schema<IFormResponse>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    formVersionId: { type: Schema.Types.ObjectId, ref: "FormVersion", index: true },

    respondentId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, default: "" },
    status: { type: String, enum: ["completed", "partial"], default: "completed", index: true },

    answers: [
      {
        pageKey: { type: String, default: "" },
        blockKey: { type: String, default: "" },
        questionKey: { type: String, default: "" },
        label: { type: String, default: "" },
        title: { type: String, default: "" },
        type: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
      },
    ],

    computedVariables: {
      type: [
        {
          _id: false,
          name: { type: String, required: true },
          value: { type: Schema.Types.Mixed },
        },
      ],
      default: undefined,
    },

    metadata: {
      ipAddress: { type: String, default: "" },
      userAgent: { type: String, default: "" },
      referrer: { type: String, default: "" },
      country: { type: String, default: "" },
      city: { type: String, default: "" },
    },

    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

formResponseSchema.index({ formId: 1, submittedAt: -1 });
formResponseSchema.index({ formId: 1, status: 1, submittedAt: -1 });
formResponseSchema.index({ formId: 1, sessionId: 1 });

export const FormResponse = mongoose.model<IFormResponse>("FormResponse", formResponseSchema);