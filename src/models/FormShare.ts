import mongoose, { Schema, Document } from "mongoose";
import { IForm } from "./Form";

export interface IFormShare extends Document {
  formId: IForm["_id"];
  publicUrl: string;
  isPublic: boolean;
  password: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const formShareSchema = new Schema<IFormShare>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, unique: true },

    publicUrl: { type: String, required: true },
    isPublic: { type: Boolean, default: true },
    password: { type: String, default: "" },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

export const FormShare = mongoose.model<IFormShare>("FormShare", formShareSchema);