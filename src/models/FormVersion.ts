import mongoose, { Schema, Document } from "mongoose";
import {
  formSettingsSchema,
  formThemeSchema,
  buildDefaultFormSettings,
  IEndPage,
  IFormPage,
  IFormSettings,
  IFormTheme,
} from "./Form";
import { IUser } from "./User";

export interface IFormVersionSchema {
  pages: IFormPage[];
  endPages?: IEndPage[];
  settings: IFormSettings;
  theme: IFormTheme;
}

export interface IFormVersion extends Omit<Document, "formSchema"> {
  formId: mongoose.Types.ObjectId;
  version: number;
  formSchema: IFormVersionSchema;
  createdBy: IUser["_id"];
  createdAt: Date;
}

const formVersionSchema = new Schema<IFormVersion>(
  {
    formId: { type: Schema.Types.ObjectId, ref: "Form", required: true, index: true },
    version: { type: Number, required: true },
    formSchema: {
      pages: { type: Array, default: [] },
      endPages: { type: Array, default: [] },
      settings: { type: formSettingsSchema, default: () => buildDefaultFormSettings() },
      theme: { type: formThemeSchema, default: () => ({}) },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

formVersionSchema.index({ formId: 1, version: 1 }, { unique: true });

export const FormVersion = mongoose.model<IFormVersion>("FormVersion", formVersionSchema);
