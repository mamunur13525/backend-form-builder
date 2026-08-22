import mongoose, { Schema, Document } from "mongoose";
import { formThemeSchema, IEndPage, IFormPage, IFormTheme } from "./Form";
import { IUser } from "./User";

export interface IFormVersionSchema {
  pages: IFormPage[];
  endPages?: IEndPage[];
  settings: {
    oneQuestionAtATime: boolean;
    showProgressBar: boolean;
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    collectIP: boolean;
  };
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
      settings: {
        oneQuestionAtATime: { type: Boolean, default: true },
        showProgressBar: { type: Boolean, default: true },
        allowMultipleSubmissions: { type: Boolean, default: true },
        requireLogin: { type: Boolean, default: false },
        collectIP: { type: Boolean, default: false },
      },
      theme: { type: formThemeSchema, default: () => ({}) },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

formVersionSchema.index({ formId: 1, version: 1 }, { unique: true });

export const FormVersion = mongoose.model<IFormVersion>("FormVersion", formVersionSchema);
