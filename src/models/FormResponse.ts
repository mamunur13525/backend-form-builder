import mongoose, { Schema, Document } from "mongoose";
import { IForm } from "./Form";
import { IUser } from "./User";

export interface IFormResponse extends Document {
  formId: IForm["_id"];
  respondentId?: IUser["_id"];
  sessionId: string;
  answers: {
    fieldKey: string;
    label: string;
    type: string;
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

    respondentId: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String, default: "" },

    answers: [
      {
        fieldKey: { type: String, required: true },
        label: { type: String, required: true },
        type: { type: String, required: true },
        value: { type: Schema.Types.Mixed, required: true },
      },
    ],

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

export const FormResponse = mongoose.model<IFormResponse>("FormResponse", formResponseSchema);