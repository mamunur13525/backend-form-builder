import mongoose, { Schema, Document } from "mongoose";
import { IUser } from "./User";

export interface IForm extends Document {
  title: string;
  description: string;
  slug: string;
  status: "draft" | "published" | "archived";
  theme: {
    primaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  settings: {
    oneQuestionAtATime: boolean;
    showProgressBar: boolean;
    allowMultipleSubmissions: boolean;
    requireLogin: boolean;
    collectIP: boolean;
  };
  createdBy: IUser["_id"];
  updatedBy?: IUser["_id"];
  createdAt: Date;
  updatedAt: Date;
}

const formSchema = new Schema<IForm>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    slug: { type: String, required: true, unique: true, index: true },

    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },

    theme: {
      primaryColor: { type: String, default: "#000000" },
      backgroundColor: { type: String, default: "#ffffff" },
      textColor: { type: String, default: "#111111" },
    },

    settings: {
      oneQuestionAtATime: { type: Boolean, default: true },
      showProgressBar: { type: Boolean, default: true },
      allowMultipleSubmissions: { type: Boolean, default: true },
      requireLogin: { type: Boolean, default: false },
      collectIP: { type: Boolean, default: false },
    },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Form = mongoose.model<IForm>("Form", formSchema);